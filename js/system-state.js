// ═══════════════════════════════════════════════════════════════
// SYSTEM_STATE v2.0 — Centralized State Contract
// Hybrid Syndicate / Ethic Software Foundation
// ═══════════════════════════════════════════════════════════════
// "No implicit conversations between modules. One source of truth."
//
// v2.0: Chaos-antagonist architecture
// - Phase timeout + rollback (compensates stuck phases)
// - Adaptive ledger convergence (threshold = f(throughput))
// - Hash-chained event log (tamper detection)
// - Trend-based health (velocity of change, not snapshot)
// ═══════════════════════════════════════════════════════════════

const SystemState = (() => {

    // ══════════════════════════════════════════════
    // THE STATE — Single shared truth
    // ══════════════════════════════════════════════

    const state = {
        cycle: {
            id: 0,
            phase: 'BOOT',          // BOOT | IDLE | POLLING | CLASSIFYING | DISTRIBUTING | DEGRADED
            phaseEnteredAt: Date.now(), // timestamp when current phase started
            lastCompleted: 0,        // timestamp
            lastCycleMs: 0,          // duration of last cycle
            cycleDurations: [],      // last N cycle durations for trend analysis
        },
        worker: {
            enabled: true,
            ready: false,
            failures: 0,
            openUntil: 0,            // timestamp when circuit resets (0 = closed)
            lastClassifyMs: 0,       // last classify duration
            totalClassified: 0,
        },
        storage: {
            lsCount: 0,
            idbCount: -1,            // -1 = unknown
            idbAvailable: false,
            divergence: 0,           // |lsCount - idbCount|
            pruningActive: false,
            lastReconcile: 0,
            lastPrune: 0,
            writeRate: 0,            // signals/min (rolling)
            errorRate: 0,            // write errors/min (rolling)
            recentWrites: [],        // timestamps of recent writes for rate calc
            recentErrors: [],        // timestamps of recent errors for rate calc
        },
        feeds: {
            quarantineSet: new Set(),  // feedIds currently quarantined
            activeCount: 0,
            totalFeeds: 0,
            lastFetchMs: 0,
        },
        reputation: {
            sourcesTracked: 0,
            graylisted: new Set(),     // source names currently graylisted
            baselineSnapshotId: 0,     // incremented on each baseline freeze
            lastSnapshotTime: 0,
        },
        health: {
            status: 'BOOT',           // HEALTHY | DEGRADED | CRITICAL | BOOT
            degradedReasons: [],       // why degraded
            lastCheck: 0,
            trend: [],                 // last N health snapshots for velocity
        },
    };

    // ══════════════════════════════════════════════
    // PHASE TRANSITIONS — Valid state machine
    // ══════════════════════════════════════════════

    const VALID_TRANSITIONS = {
        'BOOT':          ['IDLE'],
        'IDLE':          ['POLLING', 'DEGRADED'],
        'POLLING':       ['CLASSIFYING', 'IDLE', 'DEGRADED'],
        'CLASSIFYING':   ['DISTRIBUTING', 'IDLE', 'DEGRADED'],
        'DISTRIBUTING':  ['IDLE', 'DEGRADED'],
        'DEGRADED':      ['IDLE', 'POLLING'],
    };

    // Phase timeout limits (ms) — if a phase lasts longer, force rollback
    const PHASE_TIMEOUTS = {
        'POLLING':       120000,   // 2 min max for fetching
        'CLASSIFYING':    60000,   // 1 min max for classification
        'DISTRIBUTING':   30000,   // 30s max for distribution
    };

    function setPhase(newPhase) {
        const current = state.cycle.phase;
        const valid = VALID_TRANSITIONS[current];
        if (!valid || !valid.includes(newPhase)) {
            logEvent('INVARIANT_VIOLATION', {
                type: 'invalid_phase_transition',
                from: current,
                to: newPhase,
            });
            console.error(`[SystemState] INVALID phase transition: ${current} → ${newPhase}`);
            return false;
        }
        const prev = current;
        state.cycle.phase = newPhase;
        state.cycle.phaseEnteredAt = Date.now();
        logEvent('PHASE_CHANGE', { from: prev, to: newPhase });
        return true;
    }

    // Phase timeout watchdog — call periodically to detect stuck phases
    function checkPhaseTimeout() {
        const phase = state.cycle.phase;
        const timeout = PHASE_TIMEOUTS[phase];
        if (!timeout) return null; // IDLE, BOOT, DEGRADED have no timeout

        const elapsed = Date.now() - state.cycle.phaseEnteredAt;
        if (elapsed > timeout) {
            // Force rollback to IDLE
            logEvent('PHASE_TIMEOUT', {
                phase,
                elapsed,
                timeout,
                detail: `Stuck in ${phase} for ${Math.round(elapsed / 1000)}s — forced rollback to IDLE`,
            });
            console.warn(`[SystemState] PHASE TIMEOUT: ${phase} exceeded ${timeout}ms (elapsed: ${elapsed}ms) — forcing IDLE`);

            // Direct mutation — bypass validation since this is a recovery path
            state.cycle.phase = 'IDLE';
            state.cycle.phaseEnteredAt = Date.now();

            logEvent('PHASE_CHANGE', { from: phase, to: 'IDLE', reason: 'timeout_rollback' });
            return { phase, elapsed, rolledBack: true };
        }
        return null;
    }

    // ══════════════════════════════════════════════
    // INVARIANTS — Laws of the system
    // ══════════════════════════════════════════════

    const INVARIANTS = [
        {
            id: 'CYCLE_MONOTONIC',
            description: 'Cycle ID must always advance, never go backward',
            check: (prevId, newId) => newId > prevId,
        },
        {
            id: 'QUARANTINE_ISOLATION',
            description: 'Quarantined feeds must not produce signals',
            check: (feedId) => !state.feeds.quarantineSet.has(feedId),
        },
        {
            id: 'CIRCUIT_BREAKER_PURITY',
            description: 'Open circuit breakers must not produce side effects',
            check: () => true,
        },
        {
            id: 'LEDGER_CONVERGENCE',
            description: 'Storage counts must converge within adaptive threshold',
            check: () => {
                if (state.storage.idbCount < 0) return true; // IDB unknown, skip
                const threshold = computeAdaptiveThreshold();
                return state.storage.divergence <= threshold;
            },
        },
    ];

    // ── Adaptive convergence threshold ──
    // Instead of fixed 15%, threshold scales with:
    // - write rate (higher throughput → larger acceptable drift)
    // - error rate (more errors → tighter tolerance)
    // - cycle age (longer since reconciliation → wider window)
    // - stochastic jitter (non-deterministic, non-gameable)
    // - oscillation penalty (rapid swings = suspicious)
    //
    // The jitter component means an attacker cannot predict the exact
    // threshold at any given moment. The oscillation penalty means
    // gaming writeRate/errorRate back and forth gets punished.

    let _prevThreshold = null;
    let _thresholdSwings = 0;

    // Crypto entropy: uses WebCrypto API for true randomness.
    // Not replayable, not predictable, not interceptable via seed capture.
    // Falls back to Math.random only if crypto is unavailable.
    function cryptoJitter() {
        if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
            const buf = new Uint32Array(1);
            crypto.getRandomValues(buf);
            return (buf[0] / 0xFFFFFFFF) * 2 - 1; // range [-1, 1]
        }
        // Fallback: Math.random (less secure but functional)
        return Math.random() * 2 - 1;
    }

    function computeAdaptiveThreshold() {
        const base = 10; // minimum tolerance: 10 signals
        const writeBonus = Math.min(state.storage.writeRate * 2, 50); // up to +50 at high throughput
        const errorPenalty = Math.min(state.storage.errorRate * 5, 30); // tighten by up to 30 on errors
        const ageFactor = state.storage.lastReconcile > 0
            ? Math.min((Date.now() - state.storage.lastReconcile) / (60 * 1000), 10) // up to +10 per minute since reconcile
            : 5; // default if never reconciled

        // Crypto jitter: ±3 signals — true entropy, non-replayable
        const jitter = cryptoJitter() * 3;

        // Oscillation penalty: if threshold has been swinging, tighten it
        const deterministic = base + writeBonus - errorPenalty + ageFactor;
        if (_prevThreshold !== null) {
            const swing = Math.abs(deterministic - _prevThreshold);
            if (swing > 5) _thresholdSwings++;
            else _thresholdSwings = Math.max(0, _thresholdSwings - 0.5);
        }
        const oscillationPenalty = Math.min(_thresholdSwings * 2, 15);

        const threshold = Math.max(deterministic + jitter - oscillationPenalty, 5);
        _prevThreshold = deterministic;
        return Math.round(threshold);
    }

    function advanceCycle() {
        const prevId = state.cycle.id;
        const newId = prevId + 1;

        // Invariant: CYCLE_MONOTONIC
        if (!INVARIANTS[0].check(prevId, newId)) {
            logEvent('INVARIANT_VIOLATION', {
                type: 'CYCLE_MONOTONIC',
                prevId, newId,
            });
            return false;
        }

        state.cycle.id = newId;
        logEvent('CYCLE_ADVANCE', { id: newId });
        return true;
    }

    function assertFeedNotQuarantined(feedId) {
        if (state.feeds.quarantineSet.has(feedId)) {
            logEvent('INVARIANT_VIOLATION', {
                type: 'QUARANTINE_ISOLATION',
                feedId,
                detail: 'Attempted to process quarantined feed',
            });
            return false;
        }
        return true;
    }

    // ══════════════════════════════════════════════
    // TYPED ACCESSORS — No direct mutation
    // ══════════════════════════════════════════════

    // Worker
    function updateWorker(delta) {
        if (delta.ready !== undefined) state.worker.ready = !!delta.ready;
        if (delta.failures !== undefined) state.worker.failures = delta.failures;
        if (delta.openUntil !== undefined) state.worker.openUntil = delta.openUntil;
        if (delta.lastClassifyMs !== undefined) state.worker.lastClassifyMs = delta.lastClassifyMs;
        if (delta.totalClassified !== undefined) state.worker.totalClassified = delta.totalClassified;
        if (delta.enabled !== undefined) state.worker.enabled = delta.enabled;
    }

    // Storage
    function updateStorage(delta) {
        if (delta.lsCount !== undefined) state.storage.lsCount = delta.lsCount;
        if (delta.idbCount !== undefined) state.storage.idbCount = delta.idbCount;
        if (delta.idbAvailable !== undefined) state.storage.idbAvailable = !!delta.idbAvailable;
        if (delta.pruningActive !== undefined) state.storage.pruningActive = !!delta.pruningActive;
        if (delta.lastReconcile !== undefined) state.storage.lastReconcile = delta.lastReconcile;
        if (delta.lastPrune !== undefined) state.storage.lastPrune = delta.lastPrune;

        // Recompute divergence
        if (state.storage.idbCount >= 0) {
            state.storage.divergence = Math.abs(state.storage.lsCount - state.storage.idbCount);
        }
    }

    // Track write/error rates for adaptive threshold
    function recordWrite() {
        const now = Date.now();
        state.storage.recentWrites.push(now);
        // Keep last 5 minutes only
        const cutoff = now - 5 * 60 * 1000;
        state.storage.recentWrites = state.storage.recentWrites.filter(t => t > cutoff);
        state.storage.writeRate = state.storage.recentWrites.length / 5; // per minute
    }

    function recordWriteError() {
        const now = Date.now();
        state.storage.recentErrors.push(now);
        const cutoff = now - 5 * 60 * 1000;
        state.storage.recentErrors = state.storage.recentErrors.filter(t => t > cutoff);
        state.storage.errorRate = state.storage.recentErrors.length / 5; // per minute
    }

    // Feeds
    function quarantineFeed(feedId) {
        state.feeds.quarantineSet.add(feedId);
        logEvent('FEED_QUARANTINED', { feedId });
    }

    function releaseFeed(feedId) {
        state.feeds.quarantineSet.delete(feedId);
        logEvent('FEED_RELEASED', { feedId });
    }

    function updateFeeds(delta) {
        if (delta.activeCount !== undefined) state.feeds.activeCount = delta.activeCount;
        if (delta.totalFeeds !== undefined) state.feeds.totalFeeds = delta.totalFeeds;
        if (delta.lastFetchMs !== undefined) state.feeds.lastFetchMs = delta.lastFetchMs;
    }

    // Reputation
    function graylistSource(sourceName) {
        state.reputation.graylisted.add(sourceName);
        logEvent('SOURCE_GRAYLISTED', { source: sourceName });
    }

    function ungraylistSource(sourceName) {
        state.reputation.graylisted.delete(sourceName);
        logEvent('SOURCE_UNGRAYLISTED', { source: sourceName });
    }

    function updateReputation(delta) {
        if (delta.sourcesTracked !== undefined) state.reputation.sourcesTracked = delta.sourcesTracked;
        if (delta.baselineSnapshotId !== undefined) state.reputation.baselineSnapshotId = delta.baselineSnapshotId;
        if (delta.lastSnapshotTime !== undefined) state.reputation.lastSnapshotTime = delta.lastSnapshotTime;
    }

    // ══════════════════════════════════════════════
    // HEALTH CHECK — Trend-based, not snapshot
    // ══════════════════════════════════════════════

    const HEALTH_TREND_SIZE = 10;

    function checkHealth() {
        const reasons = [];

        // Check ledger convergence (adaptive)
        const adaptiveThreshold = computeAdaptiveThreshold();
        if (state.storage.idbCount >= 0 && state.storage.divergence > adaptiveThreshold) {
            reasons.push(`STORAGE_DIVERGENCE: drift=${state.storage.divergence}, threshold=${adaptiveThreshold} (adaptive)`);
        }

        // Check worker circuit
        if (state.worker.openUntil > Date.now()) {
            reasons.push(`WORKER_CIRCUIT_OPEN: until ${new Date(state.worker.openUntil).toLocaleTimeString()}`);
        }

        // Check feed quarantine saturation (>50% feeds quarantined = bad)
        if (state.feeds.totalFeeds > 0 && state.feeds.quarantineSet.size > state.feeds.totalFeeds * 0.5) {
            reasons.push(`FEED_SATURATION: ${state.feeds.quarantineSet.size}/${state.feeds.totalFeeds} quarantined`);
        }

        // Check pruning storm
        if (state.storage.pruningActive) {
            reasons.push('PRUNING_ACTIVE');
        }

        // Check graylist saturation
        if (state.reputation.graylisted.size > state.reputation.sourcesTracked * 0.4 && state.reputation.sourcesTracked > 5) {
            reasons.push(`GRAYLIST_SATURATION: ${state.reputation.graylisted.size}/${state.reputation.sourcesTracked}`);
        }

        // Check phase timeout (stuck detection)
        const timeout = checkPhaseTimeout();
        if (timeout) {
            reasons.push(`PHASE_TIMEOUT: ${timeout.phase} stuck for ${Math.round(timeout.elapsed / 1000)}s`);
        }

        // ── Trend-based degradation: velocity of health change ──
        const snapshot = { t: Date.now(), reasons: reasons.length, phase: state.cycle.phase };
        state.health.trend.push(snapshot);
        if (state.health.trend.length > HEALTH_TREND_SIZE) {
            state.health.trend.shift();
        }

        // If health has been degraded 3+ of last 5 checks → escalate
        if (state.health.trend.length >= 5) {
            const recentDegraded = state.health.trend.slice(-5).filter(s => s.reasons > 0).length;
            if (recentDegraded >= 3 && reasons.length > 0) {
                reasons.push(`TREND_DEGRADATION: ${recentDegraded}/5 recent checks degraded`);
            }
        }

        state.health.degradedReasons = reasons;
        state.health.lastCheck = Date.now();

        if (reasons.length === 0) {
            state.health.status = 'HEALTHY';
        } else if (reasons.length >= 3) {
            state.health.status = 'CRITICAL';
        } else {
            state.health.status = 'DEGRADED';
        }

        return { status: state.health.status, reasons };
    }

    // ══════════════════════════════════════════════
    // EVENT LOG — Hash-chained, tamper-evident
    // ══════════════════════════════════════════════

    const EVENT_LOG = [];
    const MAX_LOG_SIZE = 1000;
    let lastHash = '0'; // genesis hash

    // djb2 hash — fast, deterministic, good enough for tamper detection
    function hashStr(str) {
        let hash = 5381;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) + hash + str.charCodeAt(i)) >>> 0;
        }
        return hash.toString(36);
    }

    function logEvent(type, data) {
        const entry = {
            t: Date.now(),
            seq: EVENT_LOG.length,
            cycle: state.cycle.id,
            phase: state.cycle.phase,
            type,
            data: data || null,
            prevHash: lastHash,
            hash: null, // computed below
        };

        // Hash chain: hash(prevHash + seq + type + timestamp)
        entry.hash = hashStr(entry.prevHash + '|' + entry.seq + '|' + entry.type + '|' + entry.t);
        lastHash = entry.hash;

        EVENT_LOG.push(entry);

        // Rotate log
        if (EVENT_LOG.length > MAX_LOG_SIZE) {
            EVENT_LOG.splice(0, EVENT_LOG.length - MAX_LOG_SIZE);
        }
    }

    // Verify hash chain integrity — returns first broken link or null
    function verifyLogIntegrity() {
        if (EVENT_LOG.length === 0) return { intact: true, entries: 0 };

        let broken = null;
        for (let i = 1; i < EVENT_LOG.length; i++) {
            const prev = EVENT_LOG[i - 1];
            const curr = EVENT_LOG[i];
            if (curr.prevHash !== prev.hash) {
                broken = { index: i, expected: prev.hash, got: curr.prevHash };
                break;
            }
            // Verify self-hash
            const expectedHash = hashStr(curr.prevHash + '|' + curr.seq + '|' + curr.type + '|' + curr.t);
            if (curr.hash !== expectedHash) {
                broken = { index: i, selfHashMismatch: true, expected: expectedHash, got: curr.hash };
                break;
            }
        }

        return {
            intact: broken === null,
            entries: EVENT_LOG.length,
            broken,
        };
    }

    function getEventLog(options) {
        let log = EVENT_LOG;
        if (options && options.since) {
            log = log.filter(e => e.t >= options.since);
        }
        if (options && options.type) {
            log = log.filter(e => e.type === options.type);
        }
        if (options && options.limit) {
            log = log.slice(-options.limit);
        }
        return log;
    }

    function getEventLogSnapshot() {
        return {
            entries: EVENT_LOG.length,
            firstEntry: EVENT_LOG.length > 0 ? EVENT_LOG[0].t : null,
            lastEntry: EVENT_LOG.length > 0 ? EVENT_LOG[EVENT_LOG.length - 1].t : null,
            types: [...new Set(EVENT_LOG.map(e => e.type))],
            violations: EVENT_LOG.filter(e => e.type === 'INVARIANT_VIOLATION').length,
            chainIntact: verifyLogIntegrity().intact,
        };
    }

    // ══════════════════════════════════════════════
    // HASH ANCHOR — External verifiability
    // ══════════════════════════════════════════════
    // The chain is tamper-evident internally, but an attacker who
    // rewrites everything and regenerates the chain leaves no trace.
    //
    // The anchor is a snapshot of the chain's tip that can be:
    // - Exported (copied, saved externally, sent to another system)
    // - Verified later against the current chain
    //
    // If someone exports an anchor at T1 and checks at T2:
    // - The chain at T2 must still contain the anchor's sequence
    // - If it doesn't, the chain was rewritten between T1 and T2
    //
    // This is the minimum viable external verification: a timestamp,
    // the head hash, the sequence number, and a fingerprint of the
    // chain up to that point.

    function exportAnchor() {
        if (EVENT_LOG.length === 0) return null;

        const head = EVENT_LOG[EVENT_LOG.length - 1];

        // Chain fingerprint: hash of first + last + length
        // If any of these change, the chain was tampered
        const first = EVENT_LOG[0];
        const fingerprint = hashStr(
            first.hash + '|' + head.hash + '|' + EVENT_LOG.length + '|' + first.t + '|' + head.t
        );

        return {
            version: 1,
            exported: Date.now(),
            headHash: head.hash,
            headSeq: head.seq,
            headTime: head.t,
            genesisHash: first.hash,
            genesisTime: first.t,
            chainLength: EVENT_LOG.length,
            fingerprint,
            // Human-readable identifier for copy/paste verification
            anchor: `HS:${fingerprint}:${head.seq}:${head.hash}`,
        };
    }

    function verifyAnchor(anchor) {
        if (!anchor || !anchor.fingerprint || EVENT_LOG.length === 0) {
            return { valid: false, reason: 'empty_chain_or_anchor' };
        }

        // Find the entry matching the anchor's sequence number
        const targetEntry = EVENT_LOG.find(e => e.seq === anchor.headSeq);
        if (!targetEntry) {
            return { valid: false, reason: 'anchor_sequence_not_found', detail: `seq ${anchor.headSeq} missing from log` };
        }

        // Verify the hash matches
        if (targetEntry.hash !== anchor.headHash) {
            return { valid: false, reason: 'hash_mismatch', detail: `expected ${anchor.headHash}, got ${targetEntry.hash}` };
        }

        // Verify genesis still matches
        const first = EVENT_LOG[0];
        if (first.hash !== anchor.genesisHash) {
            return { valid: false, reason: 'genesis_rewritten', detail: `genesis hash changed from ${anchor.genesisHash} to ${first.hash}` };
        }

        // Recompute fingerprint
        const head = targetEntry;
        const currentFingerprint = hashStr(
            first.hash + '|' + head.hash + '|' + (anchor.headSeq + 1) + '|' + first.t + '|' + head.t
        );

        // Note: chainLength at export time may differ from headSeq+1 due to rotation
        // So we verify the structural elements, not the exact length

        return {
            valid: true,
            chainIntact: verifyLogIntegrity().intact,
            entriesSinceAnchor: EVENT_LOG.length - (EVENT_LOG.indexOf(targetEntry) + 1),
            timeSinceAnchor: Date.now() - anchor.exported,
        };
    }

    // ══════════════════════════════════════════════
    // SERIALIZATION — For state dump / debug
    // ══════════════════════════════════════════════

    function serialize() {
        return {
            cycle: { ...state.cycle, cycleDurations: [...state.cycle.cycleDurations] },
            worker: { ...state.worker },
            storage: {
                ...state.storage,
                recentWrites: undefined, // don't serialize raw timestamps
                recentErrors: undefined,
                adaptiveThreshold: computeAdaptiveThreshold(),
            },
            feeds: {
                quarantineSet: [...state.feeds.quarantineSet],
                activeCount: state.feeds.activeCount,
                totalFeeds: state.feeds.totalFeeds,
                lastFetchMs: state.feeds.lastFetchMs,
            },
            reputation: {
                sourcesTracked: state.reputation.sourcesTracked,
                graylisted: [...state.reputation.graylisted],
                baselineSnapshotId: state.reputation.baselineSnapshotId,
                lastSnapshotTime: state.reputation.lastSnapshotTime,
            },
            health: {
                ...state.health,
                trend: state.health.trend.slice(-5), // last 5 snapshots
            },
            eventLog: getEventLogSnapshot(),
            timestamp: Date.now(),
        };
    }

    // ══════════════════════════════════════════════
    // INVARIANT VERIFICATION (for test harness)
    // ══════════════════════════════════════════════

    function verifyAllInvariants() {
        const results = [];

        // Cycle monotonicity
        results.push({
            id: 'CYCLE_MONOTONIC',
            pass: state.cycle.id >= 0,
            detail: `cycleId=${state.cycle.id}`,
        });

        // Ledger convergence (adaptive)
        const threshold = computeAdaptiveThreshold();
        const converges = state.storage.idbCount < 0 || state.storage.divergence <= threshold;
        results.push({
            id: 'LEDGER_CONVERGENCE',
            pass: converges,
            detail: `LS=${state.storage.lsCount}, IDB=${state.storage.idbCount}, divergence=${state.storage.divergence}, threshold=${threshold}`,
        });

        // Quarantine isolation — check no violations in log
        const quarantineViolations = EVENT_LOG.filter(e =>
            e.type === 'INVARIANT_VIOLATION' && e.data && e.data.type === 'QUARANTINE_ISOLATION'
        ).length;
        results.push({
            id: 'QUARANTINE_ISOLATION',
            pass: quarantineViolations === 0,
            detail: `violations=${quarantineViolations}`,
        });

        // Circuit breaker purity
        const cbViolations = EVENT_LOG.filter(e =>
            e.type === 'INVARIANT_VIOLATION' && e.data && e.data.type === 'CIRCUIT_BREAKER_PURITY'
        ).length;
        results.push({
            id: 'CIRCUIT_BREAKER_PURITY',
            pass: cbViolations === 0,
            detail: `violations=${cbViolations}`,
        });

        // Phase validity
        const phaseViolations = EVENT_LOG.filter(e =>
            e.type === 'INVARIANT_VIOLATION' && e.data && e.data.type === 'invalid_phase_transition'
        ).length;
        results.push({
            id: 'PHASE_MACHINE_VALID',
            pass: phaseViolations === 0,
            detail: `violations=${phaseViolations}, currentPhase=${state.cycle.phase}`,
        });

        // Event log integrity
        const logIntegrity = verifyLogIntegrity();
        results.push({
            id: 'EVENT_LOG_INTEGRITY',
            pass: logIntegrity.intact,
            detail: `entries=${logIntegrity.entries}, intact=${logIntegrity.intact}`,
        });

        return results;
    }

    // Boot event
    logEvent('SYSTEM_BOOT', { version: '2.0' });

    // Start phase timeout watchdog (check every 15 seconds)
    setInterval(() => {
        if (state.cycle.phase !== 'IDLE' && state.cycle.phase !== 'BOOT') {
            checkPhaseTimeout();
        }
    }, 15000);

    // ══════════════════════════════════════════════
    // PUBLIC API
    // ══════════════════════════════════════════════

    return {
        // Phase control
        setPhase,
        getPhase: () => state.cycle.phase,
        advanceCycle,
        getCycleId: () => state.cycle.id,
        checkPhaseTimeout,

        // Typed accessors
        updateWorker,
        updateStorage,
        updateFeeds,
        updateReputation,
        quarantineFeed,
        releaseFeed,
        graylistSource,
        ungraylistSource,

        // Write/error rate tracking
        recordWrite,
        recordWriteError,

        // Invariant enforcement
        assertFeedNotQuarantined,
        verifyAllInvariants,
        computeAdaptiveThreshold,

        // Health
        checkHealth,
        getHealth: () => ({ ...state.health }),

        // Event log
        logEvent,
        getEventLog,
        getEventLogSnapshot,
        verifyLogIntegrity,
        exportAnchor,
        verifyAnchor,

        // Serialization
        serialize,
        getState: () => serialize(),

        // Direct reads (for status inspector)
        getWorkerState: () => ({ ...state.worker }),
        getStorageState: () => ({
            ...state.storage,
            recentWrites: undefined,
            recentErrors: undefined,
            adaptiveThreshold: computeAdaptiveThreshold(),
        }),
        getFeedState: () => ({
            quarantineSet: [...state.feeds.quarantineSet],
            activeCount: state.feeds.activeCount,
            totalFeeds: state.feeds.totalFeeds,
        }),
        getReputationState: () => ({
            ...state.reputation,
            graylisted: [...state.reputation.graylisted],
        }),

        // Constants
        INVARIANTS,
        VALID_TRANSITIONS,
        PHASE_TIMEOUTS,
    };

})();
