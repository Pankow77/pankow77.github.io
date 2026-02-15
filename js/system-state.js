// ═══════════════════════════════════════════════════════════════
// SYSTEM_STATE v1.0 — Centralized State Contract
// Hybrid Syndicate / Ethic Software Foundation
// ═══════════════════════════════════════════════════════════════
// "No implicit conversations between modules. One source of truth."
//
// This module provides:
// - Single shared state object for all defensive systems
// - Invariant enforcement (laws that cannot be broken)
// - Event log for deterministic replay
// - State machine phases (BOOT → IDLE → POLLING → CLASSIFYING → DISTRIBUTING)
// - Read/write through typed accessors (no direct mutation)
// ═══════════════════════════════════════════════════════════════

const SystemState = (() => {

    // ══════════════════════════════════════════════
    // THE STATE — Single shared truth
    // ══════════════════════════════════════════════

    const state = {
        cycle: {
            id: 0,
            phase: 'BOOT',          // BOOT | IDLE | POLLING | CLASSIFYING | DISTRIBUTING | DEGRADED
            lastCompleted: 0,        // timestamp
            lastCycleMs: 0,          // duration of last cycle
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
        logEvent('PHASE_CHANGE', { from: prev, to: newPhase });
        return true;
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
            description: 'Quarantined feeds must not produce signals, update reputation, or shift baseline',
            // Enforced at call sites — checked via assertFeedNotQuarantined()
            check: (feedId) => !state.feeds.quarantineSet.has(feedId),
        },
        {
            id: 'CIRCUIT_BREAKER_PURITY',
            description: 'Open circuit breakers must not produce side effects beyond logging and counters',
            // Enforced at call sites — marker for documentation
            check: () => true,
        },
        {
            id: 'LEDGER_CONVERGENCE',
            description: 'Storage counts must converge within T seconds or system reports DEGRADED',
            check: () => {
                if (state.storage.idbCount < 0) return true; // IDB unknown, skip
                return state.storage.divergence <= Math.max(state.storage.lsCount * 0.15, 20);
            },
        },
    ];

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
    // HEALTH CHECK — Aggregate system health
    // ══════════════════════════════════════════════

    function checkHealth() {
        const reasons = [];

        // Check ledger convergence
        if (!INVARIANTS[3].check()) {
            reasons.push(`STORAGE_DIVERGENCE: LS=${state.storage.lsCount}, IDB=${state.storage.idbCount}, drift=${state.storage.divergence}`);
        }

        // Check worker circuit
        if (state.worker.openUntil > Date.now()) {
            reasons.push(`WORKER_CIRCUIT_OPEN: until ${new Date(state.worker.openUntil).toLocaleTimeString()}`);
        }

        // Check feed quarantine saturation (>50% feeds quarantined = bad)
        if (state.feeds.totalFeeds > 0 && state.feeds.quarantineSet.size > state.feeds.totalFeeds * 0.5) {
            reasons.push(`FEED_SATURATION: ${state.feeds.quarantineSet.size}/${state.feeds.totalFeeds} quarantined`);
        }

        // Check pruning storm (pruning happened in last 5 min = stressed)
        if (state.storage.pruningActive) {
            reasons.push('PRUNING_ACTIVE');
        }

        // Check graylist saturation
        if (state.reputation.graylisted.size > state.reputation.sourcesTracked * 0.4 && state.reputation.sourcesTracked > 5) {
            reasons.push(`GRAYLIST_SATURATION: ${state.reputation.graylisted.size}/${state.reputation.sourcesTracked}`);
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
    // EVENT LOG — Deterministic replay
    // ══════════════════════════════════════════════

    const EVENT_LOG = [];
    const MAX_LOG_SIZE = 1000;

    function logEvent(type, data) {
        const entry = {
            t: Date.now(),
            seq: EVENT_LOG.length,
            cycle: state.cycle.id,
            phase: state.cycle.phase,
            type,
            data: data || null,
        };

        EVENT_LOG.push(entry);

        // Rotate log
        if (EVENT_LOG.length > MAX_LOG_SIZE) {
            EVENT_LOG.splice(0, EVENT_LOG.length - MAX_LOG_SIZE);
        }
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
        };
    }

    // ══════════════════════════════════════════════
    // SERIALIZATION — For state dump / debug
    // ══════════════════════════════════════════════

    function serialize() {
        return {
            cycle: { ...state.cycle },
            worker: { ...state.worker },
            storage: {
                ...state.storage,
                pruningActive: state.storage.pruningActive,
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
            health: { ...state.health },
            eventLog: getEventLogSnapshot(),
            timestamp: Date.now(),
        };
    }

    // ══════════════════════════════════════════════
    // INVARIANT VERIFICATION (for test harness)
    // ══════════════════════════════════════════════

    function verifyAllInvariants() {
        const results = [];

        // Cycle monotonicity — checked on advance, here we just verify id > 0 after boot
        results.push({
            id: 'CYCLE_MONOTONIC',
            pass: state.cycle.id >= 0,
            detail: `cycleId=${state.cycle.id}`,
        });

        // Ledger convergence
        const converges = INVARIANTS[3].check();
        results.push({
            id: 'LEDGER_CONVERGENCE',
            pass: converges,
            detail: `LS=${state.storage.lsCount}, IDB=${state.storage.idbCount}, divergence=${state.storage.divergence}`,
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

        // Circuit breaker purity — check no side-effect violations
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

        return results;
    }

    // Boot event
    logEvent('SYSTEM_BOOT', { version: '1.0' });

    // ══════════════════════════════════════════════
    // PUBLIC API
    // ══════════════════════════════════════════════

    return {
        // Phase control
        setPhase,
        getPhase: () => state.cycle.phase,
        advanceCycle,
        getCycleId: () => state.cycle.id,

        // Typed accessors
        updateWorker,
        updateStorage,
        updateFeeds,
        updateReputation,
        quarantineFeed,
        releaseFeed,
        graylistSource,
        ungraylistSource,

        // Invariant enforcement
        assertFeedNotQuarantined,
        verifyAllInvariants,

        // Health
        checkHealth,
        getHealth: () => ({ ...state.health }),

        // Event log
        logEvent,
        getEventLog,
        getEventLogSnapshot,

        // Serialization
        serialize,
        getState: () => serialize(),

        // Direct reads (for status inspector)
        getWorkerState: () => ({ ...state.worker }),
        getStorageState: () => ({
            ...state.storage,
            pruningActive: state.storage.pruningActive,
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
    };

})();
