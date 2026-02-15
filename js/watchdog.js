// ═══════════════════════════════════════════════════════════════
// WATCHDOG v2.0 — Constitutional Observer (Main Thread Proxy)
// Hybrid Syndicate / Ethic Software Foundation
// ═══════════════════════════════════════════════════════════════
// "L'osservatore che denuncia non è governo. È costituzione."
//
// Architecture:
//   Main thread (this file) → collects raw data snapshots
//   Web Worker (watchdog-worker.js) → runs independent verification
//
// Separation of powers:
//   - This proxy can READ but never VERIFY
//   - The worker can VERIFY but never READ (no DOM/LS/IDB access)
//   - Neither can MUTATE SystemState
//
// The only bridge: postMessage with data snapshots.
// The worker's verdict is logged to an INDEPENDENT audit trail
// in localStorage under 'wd_audit_log' — not in SystemState.
// ═══════════════════════════════════════════════════════════════

const Watchdog = (() => {

    const CONFIG = {
        checkInterval: 30000,    // collect + send snapshot every 30s
        logKey: 'wd_audit_log',  // independent audit trail
        maxAuditEntries: 200,
    };

    let worker = null;
    let workerReady = false;
    let hmacVerifyKey = null;  // CryptoKey for verdict verification
    let hmacEnabled = false;
    let verdictsForgeryDetected = 0;
    let timer = null;
    let totalChecks = 0;
    let lastVerdict = null;

    // ══════════════════════════════════════════════
    // RAW DATA COLLECTION — Read-only, no logic
    // ══════════════════════════════════════════════
    // These functions ONLY collect data. They do not interpret it.
    // Interpretation happens in the worker.

    function collectSnapshot() {
        const snapshot = {
            timestamp: Date.now(),

            // Raw localStorage read (bypass PersistenceManager)
            rawLSCount: -1,
            // Raw IDB count (async, filled separately)
            rawIDBCount: -1,
            // Raw quarantine count from interceptor
            rawQuarantineCount: -1,
            // Raw graylist count from interceptor
            rawGraylistCount: -1,

            // SystemState reported values (for comparison)
            stateLSCount: -1,
            stateIDBCount: -1,
            stateQuarantineCount: -1,
            stateGraylistCount: -1,

            // Phase data
            phase: null,
            phaseEnteredAt: null,

            // Log integrity
            logChainIntact: true,

            // Adaptive threshold
            adaptiveThreshold: undefined,

            // Operator coherence signals
            operatorCoherence: null,
        };

        // ── Raw reads ──
        try {
            const raw = localStorage.getItem('hs_signal_archive');
            if (raw) {
                const parsed = JSON.parse(raw);
                snapshot.rawLSCount = Array.isArray(parsed) ? parsed.length : 0;
            } else {
                snapshot.rawLSCount = 0;
            }
        } catch (e) { /* leave -1 */ }

        try {
            if (typeof SignalInterceptor !== 'undefined') {
                const health = SignalInterceptor.getFeedHealth();
                snapshot.rawQuarantineCount = Object.values(health).filter(h => h.quarantined).length;
            }
        } catch (e) { /* leave -1 */ }

        try {
            if (typeof SignalInterceptor !== 'undefined') {
                snapshot.rawGraylistCount = Object.keys(SignalInterceptor.getGraylist()).length;
            }
        } catch (e) { /* leave -1 */ }

        // ── SystemState reads ──
        if (typeof SystemState !== 'undefined') {
            try {
                const ss = SystemState.getStorageState();
                snapshot.stateLSCount = ss.lsCount;
                snapshot.stateIDBCount = ss.idbCount;
                snapshot.adaptiveThreshold = ss.adaptiveThreshold;
            } catch (e) { /* leave -1 */ }

            try {
                snapshot.stateQuarantineCount = SystemState.getFeedState().quarantineSet.length;
            } catch (e) { /* leave -1 */ }

            try {
                snapshot.stateGraylistCount = SystemState.getReputationState().graylisted.length;
            } catch (e) { /* leave -1 */ }

            try {
                snapshot.phase = SystemState.getPhase();
                const ser = SystemState.serialize();
                snapshot.phaseEnteredAt = ser.cycle.phaseEnteredAt;
            } catch (e) { /* leave null */ }

            try {
                snapshot.logChainIntact = SystemState.verifyLogIntegrity().intact;
            } catch (e) { /* leave true */ }

            // ── Operator coherence data ──
            try {
                const ws = SystemState.getWorkerState();
                const fs = SystemState.getFeedState();
                const rs = SystemState.getReputationState();
                const health = SystemState.getHealth();
                const stats = typeof SignalInterceptor !== 'undefined' ? SignalInterceptor.getStats() : null;

                snapshot.operatorCoherence = {
                    workerEnabled: ws.enabled && ws.ready,
                    workerClassified: ws.totalClassified,
                    allFeedsQuarantined: fs.totalFeeds > 0 && fs.quarantineSet.length >= fs.totalFeeds,
                    healthStatus: health.status,
                    graylistSaturation: rs.sourcesTracked > 0
                        ? rs.graylisted.length / rs.sourcesTracked : 0,
                    sourcesTracked: rs.sourcesTracked,
                    totalSignals: stats ? stats.totalSignals : 0,
                    // Severity trend: compare recent cycle signal count to average
                    severityTrending: 'stable', // placeholder — enriched below
                };

                // Simple severity trend from archive
                if (typeof PersistenceManager !== 'undefined') {
                    const archive = PersistenceManager.getArchive();
                    if (archive.length >= 10) {
                        const recent5 = archive.slice(0, 5);
                        const older5 = archive.slice(5, 10);
                        const recentAvgSev = recent5.reduce((s, a) => s + (a.severity || 0), 0) / 5;
                        const olderAvgSev = older5.reduce((s, a) => s + (a.severity || 0), 0) / 5;
                        if (recentAvgSev > olderAvgSev * 1.3) {
                            snapshot.operatorCoherence.severityTrending = 'up';
                        } else if (recentAvgSev < olderAvgSev * 0.7) {
                            snapshot.operatorCoherence.severityTrending = 'down';
                        }
                    }
                }
            } catch (e) { /* leave null */ }
        }

        return snapshot;
    }

    // ══════════════════════════════════════════════
    // WORKER COMMUNICATION
    // ══════════════════════════════════════════════

    function initWorker() {
        if (typeof Worker === 'undefined') return false;
        try {
            worker = new Worker('js/watchdog-worker.js');
            worker.onmessage = async (e) => {
                const msg = e.data;
                if (!msg || typeof msg !== 'object') return;

                if (msg.type === 'ready') {
                    workerReady = true;
                    // Import HMAC key for verdict verification
                    if (msg.hmacEnabled && msg.hmacJwk) {
                        try {
                            hmacVerifyKey = await crypto.subtle.importKey(
                                'jwk', msg.hmacJwk,
                                { name: 'HMAC', hash: 'SHA-256' },
                                false, ['verify']
                            );
                            hmacEnabled = true;
                            console.log('%c[WATCHDOG] Worker ONLINE — HMAC verdict signing active', 'color: #ff6b35;');
                        } catch (err) {
                            console.warn('[WATCHDOG] HMAC key import failed:', err);
                            hmacEnabled = false;
                        }
                    } else {
                        console.log('%c[WATCHDOG] Worker ONLINE — HMAC unavailable, verdicts unsigned', 'color: #ff6b35;');
                    }
                } else if (msg.type === 'verdict') {
                    // Verify signature before trusting verdict
                    const sigValid = await verifyVerdictSignature(msg.result);
                    if (!sigValid && hmacEnabled) {
                        verdictsForgeryDetected++;
                        console.error('[WATCHDOG] VERDICT FORGERY DETECTED — signature mismatch');
                        if (typeof SystemState !== 'undefined') {
                            SystemState.logEvent('VERDICT_FORGERY', {
                                check: msg.result.check,
                                forgeryCount: verdictsForgeryDetected,
                            });
                        }
                    }
                    msg.result._signatureValid = sigValid;
                    handleVerdict(msg.result);
                } else if (msg.type === 'pong') {
                    // Health check response
                }
            };
            worker.onerror = (e) => {
                console.warn('[WATCHDOG] Worker failed, falling back to main-thread verification:', e.message);
                workerReady = false;
                worker = null;
            };
            return true;
        } catch (e) {
            console.warn('[WATCHDOG] Worker init failed:', e);
            return false;
        }
    }

    async function verifyVerdictSignature(result) {
        if (!hmacVerifyKey || !result.signature) return null; // null = can't verify
        try {
            const canonical = JSON.stringify({
                check: result.check,
                findingCount: result.findings.length,
                findingChecks: result.findings.map(f => f.check),
                trustworthy: result.trustworthy,
                disagreements: result.disagreements,
            });
            const encoded = new TextEncoder().encode(canonical);
            const sigBytes = new Uint8Array(result.signature.match(/.{2}/g).map(b => parseInt(b, 16)));
            return await crypto.subtle.verify('HMAC', hmacVerifyKey, sigBytes, encoded);
        } catch (e) {
            return false;
        }
    }

    function handleVerdict(result) {
        lastVerdict = result;
        totalChecks = result.check;

        // Log to INDEPENDENT audit trail (NOT SystemState)
        auditLog({
            check: result.check,
            findings: result.findings.length,
            details: result.findings,
            disagreements: result.disagreements,
            trustworthy: result.trustworthy,
            hasEpistemic: result.hasEpistemic,
            hasRegimeShift: result.hasRegimeShift || false,
            hasGenerative: result.hasGenerative || false,
            meta: result.meta || null,
        });

        // If alert threshold reached, ONLY log — never correct
        if (result.alert) {
            console.warn('[WATCHDOG] CONSTITUTIONAL VIOLATION — system state disagrees with observed reality', result.findings);
            // Also notify SystemState (accusation only, not correction)
            if (typeof SystemState !== 'undefined') {
                SystemState.logEvent('WATCHDOG_ALERT', {
                    disagreements: result.disagreements,
                    totalChecks: result.check,
                    findingCount: result.findings.length,
                    hasCritical: result.hasCritical,
                    hasEpistemic: result.hasEpistemic,
                });
            }
        }

        // Epistemic violations get their own event type
        if (result.hasEpistemic && typeof SystemState !== 'undefined') {
            const epistemics = result.findings.filter(f => f.severity === 'EPISTEMIC');
            SystemState.logEvent('OPERATOR_INCOHERENCE', {
                violations: epistemics.map(f => f.detail),
            });
            console.warn('%c[WATCHDOG] EPISTEMIC VIOLATION — operator parameters are contradictory', 'color: #ff0084;', epistemics);
        }

        // Regime shift detected
        if (result.hasRegimeShift && typeof SystemState !== 'undefined') {
            const shifts = result.findings.filter(f => f.check === 'REGIME_SHIFT');
            SystemState.logEvent('REGIME_SHIFT', {
                fields: shifts.map(s => s.field),
                details: shifts.map(s => s.detail),
            });
            console.warn('%c[WATCHDOG] REGIME SHIFT — gradual drift detected', 'color: #ff6b35;', shifts);
        }

        // Generative probe fired — the worker discovered something unprogrammed
        if (result.hasGenerative && typeof SystemState !== 'undefined') {
            const gen = result.findings.filter(f => f.check === 'GENERATIVE_PROBE' || f.check === 'GENERATIVE_CORRELATION_BREAK');
            SystemState.logEvent('GENERATIVE_FINDING', {
                probes: gen.map(g => g.detail),
            });
            console.warn('%c[WATCHDOG] GENERATIVE PROBE — unprogrammed contradiction discovered', 'color: #c084fc;', gen);
        }

        // Feed verdict into Coherence Ledger (if available)
        if (typeof CoherenceLedger !== 'undefined' && result.findings.length > 0) {
            CoherenceLedger.integrateWatchdogVerdict(result);
        }
    }

    // ══════════════════════════════════════════════
    // MAIN LOOP — Collect and send
    // ══════════════════════════════════════════════

    async function runCheck() {
        const snapshot = collectSnapshot();

        // Async: get IDB count
        if (typeof IndexedStore !== 'undefined' && IndexedStore.isAvailable()) {
            try {
                snapshot.rawIDBCount = await IndexedStore.getSignalCount();
            } catch (e) { /* leave -1 */ }
        }

        if (worker && workerReady) {
            // Send to worker for isolated verification
            worker.postMessage({ type: 'verify', snapshot });
        } else {
            // Fallback: run verification in main thread (less isolated)
            const result = fallbackVerify(snapshot);
            handleVerdict(result);
        }
    }

    // Minimal fallback if worker unavailable — same checks but on main thread
    function fallbackVerify(snapshot) {
        const findings = [];
        totalChecks++;

        if (snapshot.rawLSCount >= 0 && Math.abs(snapshot.rawLSCount - snapshot.stateLSCount) > 5) {
            findings.push({ check: 'LS_COUNT_DISAGREE', raw: snapshot.rawLSCount, state: snapshot.stateLSCount, severity: 'WARN' });
        }
        if (snapshot.rawIDBCount >= 0 && snapshot.stateIDBCount >= 0 && Math.abs(snapshot.rawIDBCount - snapshot.stateIDBCount) > 10) {
            findings.push({ check: 'IDB_COUNT_DISAGREE', raw: snapshot.rawIDBCount, state: snapshot.stateIDBCount, severity: 'WARN' });
        }
        if (snapshot.rawQuarantineCount >= 0 && snapshot.rawQuarantineCount !== snapshot.stateQuarantineCount) {
            findings.push({ check: 'QUARANTINE_COUNT_DISAGREE', severity: 'ERROR' });
        }
        if (snapshot.rawGraylistCount >= 0 && snapshot.rawGraylistCount !== snapshot.stateGraylistCount) {
            findings.push({ check: 'GRAYLIST_COUNT_DISAGREE', severity: 'ERROR' });
        }
        if (snapshot.logChainIntact === false) {
            findings.push({ check: 'LOG_CHAIN_BROKEN', severity: 'CRITICAL' });
        }

        return {
            check: totalChecks,
            findings,
            disagreements: findings.length > 0 ? totalChecks : 0,
            trustworthy: findings.length === 0,
            hasCritical: findings.some(f => f.severity === 'CRITICAL'),
            hasEpistemic: false, // epistemic checks only in worker
            alert: findings.some(f => f.severity === 'CRITICAL'),
        };
    }

    // ══════════════════════════════════════════════
    // INDEPENDENT AUDIT LOG
    // ══════════════════════════════════════════════

    function auditLog(entry) {
        try {
            const raw = localStorage.getItem(CONFIG.logKey);
            const log = raw ? JSON.parse(raw) : [];
            log.push({ t: Date.now(), ...entry });
            while (log.length > CONFIG.maxAuditEntries) log.shift();
            localStorage.setItem(CONFIG.logKey, JSON.stringify(log));
        } catch (e) { /* audit is best-effort */ }
    }

    function getAuditLog() {
        try {
            const raw = localStorage.getItem(CONFIG.logKey);
            return raw ? JSON.parse(raw) : [];
        } catch (e) { return []; }
    }

    // ══════════════════════════════════════════════
    // LIFECYCLE
    // ══════════════════════════════════════════════

    function start() {
        if (timer) return;
        initWorker();
        // First check after 10 seconds (let modules init)
        setTimeout(() => {
            runCheck();
            timer = setInterval(runCheck, CONFIG.checkInterval);
        }, 10000);
        console.log('%c[WATCHDOG] Constitutional observer ONLINE — separation of powers active', 'color: #ff6b35;');
    }

    function stop() {
        if (timer) { clearInterval(timer); timer = null; }
        if (worker) { worker.terminate(); worker = null; workerReady = false; }
    }

    // Expose verify for manual/test invocation
    async function verify() {
        await runCheck();
        // Wait briefly for worker response
        await new Promise(r => setTimeout(r, 200));
        return lastVerdict;
    }

    // Auto-start on load
    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', start);
        } else {
            start();
        }
    }

    return {
        verify,
        getAuditLog,
        getStatus: () => ({
            totalChecks,
            disagreements: lastVerdict ? lastVerdict.disagreements : 0,
            running: timer !== null,
            workerIsolated: workerReady,
            hmacEnabled,
            signatureValid: lastVerdict ? lastVerdict._signatureValid : null,
            verdictsForgeryDetected,
            trustworthy: lastVerdict ? lastVerdict.trustworthy : true,
            hasRegimeShift: lastVerdict ? lastVerdict.hasRegimeShift : false,
            hasGenerative: lastVerdict ? lastVerdict.hasGenerative : false,
            meta: lastVerdict ? lastVerdict.meta : null,
            lastVerdict,
        }),
        start,
        stop,
    };

})();
