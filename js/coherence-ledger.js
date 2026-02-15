// ═══════════════════════════════════════════════════════════════
// COHERENCE LEDGER v1.0 — Self-Contradiction Accumulator
// Hybrid Syndicate / Ethic Software Foundation
// ═══════════════════════════════════════════════════════════════
// "Un sistema che dice: sto degradando. Sto mentendo.
//  Sto diventando incoerente."
//
// This module accumulates contradictions over time and computes
// a DEGRADATION INDEX — not a binary pass/fail, but a continuous
// measure of how much the system's own narrative diverges from
// its observed reality.
//
// It does NOT fix contradictions. It does NOT hide them.
// It exposes them as a public log of self-betrayal.
//
// Three indices:
//   - Narrative Incoherence: how often the system's declared state
//     contradicts its measured state
//   - Epistemic Dissonance: how often the watchdog finds logical
//     impossibilities in operator parameters
//   - Cognitive Regression: whether the system is getting WORSE
//     at maintaining its own story over time
//
// The degradation index is: DI = f(NI, ED, CR) ∈ [0.0, 1.0]
// 0.0 = perfect coherence
// 1.0 = total narrative collapse
// ═══════════════════════════════════════════════════════════════

const CoherenceLedger = (() => {

    const CONFIG = {
        storageKey: 'hs_coherence_ledger',  // independent of SystemState
        maxEntries: 500,
        windowSize: 20,      // rolling window for regression analysis
        decayRate: 0.02,     // how fast old contradictions lose weight
    };

    // ══════════════════════════════════════════════
    // THE LEDGER — Append-only contradiction log
    // ══════════════════════════════════════════════

    let ledger = [];
    let sessionStart = Date.now();

    function loadLedger() {
        try {
            const raw = localStorage.getItem(CONFIG.storageKey);
            if (raw) {
                ledger = JSON.parse(raw);
                if (!Array.isArray(ledger)) ledger = [];
            }
        } catch (e) {
            ledger = [];
        }
    }

    function saveLedger() {
        try {
            while (ledger.length > CONFIG.maxEntries) ledger.shift();
            localStorage.setItem(CONFIG.storageKey, JSON.stringify(ledger));
        } catch (e) { /* best effort */ }
    }

    // ══════════════════════════════════════════════
    // RECORD — Log a contradiction
    // ══════════════════════════════════════════════

    // severity: 'narrative' | 'epistemic' | 'regression'
    function record(severity, detail, context) {
        const entry = {
            t: Date.now(),
            session: sessionStart,
            severity,
            detail: typeof detail === 'string' ? detail : String(detail),
            context: context || null,
            // Snapshot of system vitals at time of contradiction
            vitals: captureVitals(),
        };

        ledger.push(entry);
        saveLedger();
        return entry;
    }

    function captureVitals() {
        if (typeof SystemState === 'undefined') return null;
        try {
            const health = SystemState.getHealth();
            const phase = SystemState.getPhase();
            return {
                health: health.status,
                phase,
                reasons: health.degradedReasons ? health.degradedReasons.length : 0,
            };
        } catch (e) {
            return null;
        }
    }

    // ══════════════════════════════════════════════
    // DEGRADATION INDEX — The self-assessment
    // ══════════════════════════════════════════════

    function computeDegradation() {
        if (ledger.length === 0) {
            return {
                index: 0.0,
                narrative: 0.0,
                epistemic: 0.0,
                regression: 0.0,
                verdict: 'COHERENT',
                contradictions: 0,
                trend: 'stable',
            };
        }

        const now = Date.now();

        // ── Weight entries by recency (exponential decay) ──
        function weight(entry) {
            const ageMinutes = (now - entry.t) / (60 * 1000);
            return Math.exp(-CONFIG.decayRate * ageMinutes);
        }

        // ── Narrative Incoherence: weighted count of narrative contradictions ──
        const narrativeEntries = ledger.filter(e => e.severity === 'narrative');
        const narrativeScore = narrativeEntries.reduce((sum, e) => sum + weight(e), 0);
        const NI = Math.min(narrativeScore / 10, 1.0); // saturates at 10 weighted

        // ── Epistemic Dissonance: weighted count of logical impossibilities ──
        const epistemicEntries = ledger.filter(e => e.severity === 'epistemic');
        const epistemicScore = epistemicEntries.reduce((sum, e) => sum + weight(e), 0);
        const ED = Math.min(epistemicScore / 5, 1.0); // saturates at 5 (these are severe)

        // ── Cognitive Regression: is the system getting WORSE? ──
        // Compare contradiction rate in recent window vs older window
        let CR = 0;
        if (ledger.length >= CONFIG.windowSize * 2) {
            const recent = ledger.slice(-CONFIG.windowSize);
            const older = ledger.slice(-CONFIG.windowSize * 2, -CONFIG.windowSize);

            const recentRate = recent.length / Math.max(1, (recent[recent.length - 1].t - recent[0].t) / 60000);
            const olderRate = older.length / Math.max(1, (older[older.length - 1].t - older[0].t) / 60000);

            if (olderRate > 0) {
                const ratio = recentRate / olderRate;
                CR = Math.min(Math.max(ratio - 1, 0) / 2, 1.0); // >1 = getting worse
            }
        }

        // ── Combined degradation index ──
        // Weighted: epistemic is 2x more severe than narrative, regression is 1.5x
        const DI = Math.min((NI * 0.3 + ED * 0.5 + CR * 0.2), 1.0);

        // ── Trend: compare last N to previous N ──
        let trend = 'stable';
        if (ledger.length >= 10) {
            const last5 = ledger.slice(-5);
            const prev5 = ledger.slice(-10, -5);
            const last5Span = Math.max(1, last5[last5.length - 1].t - last5[0].t);
            const prev5Span = Math.max(1, prev5[prev5.length - 1].t - prev5[0].t);
            const last5Rate = 5 / (last5Span / 60000);
            const prev5Rate = 5 / (prev5Span / 60000);
            if (last5Rate > prev5Rate * 1.5) trend = 'degrading';
            else if (last5Rate < prev5Rate * 0.5) trend = 'recovering';
        }

        // ── Verdict ──
        let verdict;
        if (DI < 0.1) verdict = 'COHERENT';
        else if (DI < 0.3) verdict = 'FRICTION';
        else if (DI < 0.6) verdict = 'DISSONANT';
        else if (DI < 0.85) verdict = 'INCOHERENT';
        else verdict = 'NARRATIVE_COLLAPSE';

        return {
            index: Math.round(DI * 1000) / 1000,
            narrative: Math.round(NI * 1000) / 1000,
            epistemic: Math.round(ED * 1000) / 1000,
            regression: Math.round(CR * 1000) / 1000,
            verdict,
            contradictions: ledger.length,
            trend,
        };
    }

    // ══════════════════════════════════════════════
    // SELF-DECLARATION — What the system says about itself
    // ══════════════════════════════════════════════
    // This is the public voice. The system admitting its own state.

    function selfDeclare() {
        const d = computeDegradation();
        const declarations = [];

        if (d.verdict === 'COHERENT') {
            declarations.push('System narrative is internally consistent.');
        }
        if (d.verdict === 'FRICTION') {
            declarations.push('System operating under controlled friction. Minor contradictions accumulating.');
        }
        if (d.verdict === 'DISSONANT') {
            declarations.push('System exhibits epistemic dissonance. Declared state diverges from observed reality.');
        }
        if (d.verdict === 'INCOHERENT') {
            declarations.push('WARNING: System is becoming incoherent. Self-reported state is unreliable.');
        }
        if (d.verdict === 'NARRATIVE_COLLAPSE') {
            declarations.push('CRITICAL: Narrative collapse. System cannot maintain consistent self-model.');
        }

        if (d.trend === 'degrading') {
            declarations.push('Contradiction rate is accelerating.');
        } else if (d.trend === 'recovering') {
            declarations.push('Contradiction rate is decelerating.');
        }

        if (d.regression > 0.3) {
            declarations.push('Cognitive regression detected: system is worse at self-consistency than earlier.');
        }

        return {
            degradation: d,
            declarations,
            timestamp: Date.now(),
        };
    }

    // ══════════════════════════════════════════════
    // INTEGRATION — Listen for events from SystemState/Watchdog
    // ══════════════════════════════════════════════

    function integrateWatchdogVerdict(verdict) {
        if (!verdict) return;

        // Each finding becomes a ledger entry
        for (const finding of (verdict.findings || [])) {
            if (finding.severity === 'EPISTEMIC') {
                record('epistemic', finding.detail || finding.check, {
                    check: verdict.check,
                    source: 'watchdog_worker',
                });
            } else if (finding.severity === 'CRITICAL') {
                record('narrative', `Critical divergence: ${finding.check}`, {
                    check: verdict.check,
                    source: 'watchdog_worker',
                    raw: finding.raw,
                    state: finding.state,
                });
            } else if (finding.severity === 'ERROR') {
                record('narrative', `State mismatch: ${finding.check}`, {
                    check: verdict.check,
                    source: 'watchdog_worker',
                });
            }
        }
    }

    function integrateHealthCheck(healthResult) {
        if (!healthResult) return;

        // If system declares HEALTHY but has degraded reasons, that's narrative incoherence
        if (healthResult.status === 'HEALTHY' && healthResult.reasons && healthResult.reasons.length > 0) {
            record('narrative', 'System declares HEALTHY with active degradation reasons', {
                status: healthResult.status,
                reasons: healthResult.reasons,
            });
        }

        // If system has been CRITICAL for multiple checks in a row, log cognitive regression
        // (the system knows it's failing but can't fix itself)
        if (healthResult.status === 'CRITICAL') {
            const recentCritical = ledger.filter(
                e => e.severity === 'narrative' && e.detail.includes('CRITICAL') && (Date.now() - e.t) < 300000
            ).length;
            if (recentCritical >= 3) {
                record('regression', 'Persistent critical state: system unable to recover', {
                    consecutiveCritical: recentCritical,
                });
            }
        }
    }

    // ══════════════════════════════════════════════
    // PUBLIC LOG — The full contradiction history
    // ══════════════════════════════════════════════

    function getLog(options) {
        let log = [...ledger];
        if (options && options.severity) {
            log = log.filter(e => e.severity === options.severity);
        }
        if (options && options.since) {
            log = log.filter(e => e.t >= options.since);
        }
        if (options && options.limit) {
            log = log.slice(-options.limit);
        }
        return log;
    }

    function clear() {
        ledger = [];
        saveLedger();
    }

    // ══════════════════════════════════════════════
    // INIT
    // ══════════════════════════════════════════════

    loadLedger();

    return {
        record,
        computeDegradation,
        selfDeclare,
        integrateWatchdogVerdict,
        integrateHealthCheck,
        getLog,
        clear,
        getEntryCount: () => ledger.length,
    };

})();
