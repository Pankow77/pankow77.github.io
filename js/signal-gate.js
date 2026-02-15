// ═══════════════════════════════════════════════════════════════
// SIGNAL GATE v1.0 — Single Choke Point
// Hybrid Syndicate / Ethic Software Foundation
// ═══════════════════════════════════════════════════════════════
// "No signal enters storage or UI without passing this gate."
//
// Every signal must be validated against:
//   - Quarantine status (is the feed blocked?)
//   - Graylist status (is the source graylisted?)
//   - Circuit breaker (is the worker circuit open?)
//   - Schema validity (does it have required fields?)
//   - Rate limiting (is this source flooding?)
//
// If ANY check fails, the signal is REJECTED with a reason.
// The rejection is logged. The signal never reaches storage or DOM.
//
// This is the constitutional border checkpoint:
// nothing enters without papers.
// ═══════════════════════════════════════════════════════════════

const SignalGate = (() => {

    const CONFIG = {
        maxRatePerSource: 50,    // max signals per source per 5-minute window
        rateWindowMs: 5 * 60 * 1000,
        requiredFields: ['title', 'domain', 'severity', 'source'],
    };

    let totalPassed = 0;
    let totalRejected = 0;
    const rejectionLog = [];
    const MAX_REJECTION_LOG = 200;

    // Rate tracking per source
    const sourceRates = {};

    // ══════════════════════════════════════════════
    // GATE CHECK — The single point of passage
    // ══════════════════════════════════════════════

    function check(signal) {
        const result = { allowed: true, reasons: [] };

        // ── 1. Schema validation ──
        if (!signal || typeof signal !== 'object') {
            result.allowed = false;
            result.reasons.push('INVALID_OBJECT: signal is null or not an object');
            return finalize(signal, result);
        }

        for (const field of CONFIG.requiredFields) {
            if (signal[field] === undefined || signal[field] === null || signal[field] === '') {
                result.allowed = false;
                result.reasons.push(`MISSING_FIELD: ${field}`);
            }
        }

        // ── 2. Quarantine check ──
        if (typeof SystemState !== 'undefined' && signal.source) {
            const feedState = SystemState.getFeedState();
            if (feedState.quarantineSet && feedState.quarantineSet.includes(signal.source)) {
                result.allowed = false;
                result.reasons.push(`QUARANTINED_FEED: ${signal.source}`);
            }
        }

        // Also check via SignalInterceptor's feed health if available
        if (typeof SignalInterceptor !== 'undefined' && signal.source) {
            try {
                const feedHealth = SignalInterceptor.getFeedHealth();
                const sourceHealth = feedHealth[signal.source];
                if (sourceHealth && sourceHealth.quarantined) {
                    if (!result.reasons.some(r => r.startsWith('QUARANTINED'))) {
                        result.allowed = false;
                        result.reasons.push(`QUARANTINED_FEED_HEALTH: ${signal.source}`);
                    }
                }
            } catch (e) { /* best effort */ }
        }

        // ── 3. Graylist check ──
        if (typeof SystemState !== 'undefined' && signal.source) {
            const repState = SystemState.getReputationState();
            if (repState.graylisted && repState.graylisted.includes(signal.source)) {
                result.allowed = false;
                result.reasons.push(`GRAYLISTED_SOURCE: ${signal.source}`);
            }
        }

        // ── 4. Circuit breaker check ──
        if (typeof SystemState !== 'undefined') {
            const workerState = SystemState.getWorkerState();
            if (workerState.openUntil > Date.now()) {
                result.allowed = false;
                result.reasons.push(`CIRCUIT_OPEN: worker breaker open until ${new Date(workerState.openUntil).toLocaleTimeString()}`);
            }
        }

        // ── 5. Rate limiting per source ──
        if (signal.source) {
            const now = Date.now();
            if (!sourceRates[signal.source]) {
                sourceRates[signal.source] = [];
            }
            const times = sourceRates[signal.source];
            // Purge old entries
            const cutoff = now - CONFIG.rateWindowMs;
            while (times.length > 0 && times[0] < cutoff) times.shift();

            if (times.length >= CONFIG.maxRatePerSource) {
                result.allowed = false;
                result.reasons.push(`RATE_LIMIT: ${signal.source} sent ${times.length} signals in ${CONFIG.rateWindowMs / 1000}s`);
            } else {
                times.push(now);
            }
        }

        // ── 6. Severity bounds ──
        if (typeof signal.severity === 'number') {
            if (signal.severity < 0 || signal.severity > 100) {
                result.allowed = false;
                result.reasons.push(`SEVERITY_OOB: ${signal.severity} not in [0, 100]`);
            }
        }

        return finalize(signal, result);
    }

    function finalize(signal, result) {
        if (result.allowed) {
            totalPassed++;
        } else {
            totalRejected++;
            const rejection = {
                t: Date.now(),
                signal: signal ? {
                    title: (signal.title || '').substring(0, 80),
                    source: signal.source || 'unknown',
                    domain: signal.domain || 'unknown',
                } : null,
                reasons: result.reasons,
            };
            rejectionLog.push(rejection);
            if (rejectionLog.length > MAX_REJECTION_LOG) rejectionLog.shift();

            // Log to SystemState if available
            if (typeof SystemState !== 'undefined') {
                SystemState.logEvent('SIGNAL_GATE_REJECT', {
                    source: signal ? signal.source : null,
                    reasons: result.reasons,
                });
            }
        }

        return result;
    }

    // ══════════════════════════════════════════════
    // CONVENIENCE: check-and-pass pattern
    // ══════════════════════════════════════════════
    // Returns the signal if allowed, null if rejected.
    // Callers should use: if (SignalGate.pass(signal)) { store(signal); }

    function pass(signal) {
        const result = check(signal);
        return result.allowed ? signal : null;
    }

    // ══════════════════════════════════════════════
    // PUBLIC API
    // ══════════════════════════════════════════════

    return {
        check,
        pass,
        getStats: () => ({
            totalPassed,
            totalRejected,
            rejectionRate: totalPassed + totalRejected > 0
                ? Math.round(totalRejected / (totalPassed + totalRejected) * 100) : 0,
            recentRejections: rejectionLog.slice(-5),
        }),
        getRejectionLog: () => [...rejectionLog],
        getSourceRates: () => {
            const rates = {};
            for (const [src, times] of Object.entries(sourceRates)) {
                rates[src] = times.length;
            }
            return rates;
        },
    };

})();
