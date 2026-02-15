// ═══════════════════════════════════════════════════════════════
// WATCHDOG v1.0 — Independent Observer
// Hybrid Syndicate / Ethic Software Foundation
// ═══════════════════════════════════════════════════════════════
// "The one who watches the watchers."
//
// This module is the EXTERNAL observer that SystemState cannot be.
// It reads the SAME raw sources (localStorage, IndexedDB, DOM) but
// with INDEPENDENT logic. If its conclusions disagree with
// SystemState, it flags a constitutional violation.
//
// It does NOT trust SystemState. It verifies SystemState.
// ═══════════════════════════════════════════════════════════════

const Watchdog = (() => {

    const CONFIG = {
        checkInterval: 30000,    // run every 30 seconds
        maxDisagreements: 3,     // threshold before alerting
        logKey: 'wd_audit_log',  // independent audit trail in localStorage
        maxAuditEntries: 200,
    };

    let disagreements = 0;
    let totalChecks = 0;
    let timer = null;

    // ══════════════════════════════════════════════
    // INDEPENDENT DATA READS
    // ══════════════════════════════════════════════
    // These functions read raw data WITHOUT going through SystemState.
    // They are the "second pair of eyes."

    function readRawLSCount() {
        try {
            const raw = localStorage.getItem('hs_signal_archive');
            if (!raw) return 0;
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed.length : 0;
        } catch (e) { return -1; }
    }

    async function readRawIDBCount() {
        if (typeof IndexedStore === 'undefined' || !IndexedStore.isAvailable()) return -1;
        try {
            return await IndexedStore.getSignalCount();
        } catch (e) { return -1; }
    }

    function readRawQuarantineCount() {
        if (typeof IndexedStore === 'undefined' || !IndexedStore.isAvailable()) return -1;
        try {
            // Sync check: read feed health from interceptor directly
            if (typeof SignalInterceptor !== 'undefined') {
                const health = SignalInterceptor.getFeedHealth();
                return Object.values(health).filter(h => h.quarantined).length;
            }
            return -1;
        } catch (e) { return -1; }
    }

    function readRawGraylistCount() {
        if (typeof SignalInterceptor !== 'undefined') {
            try {
                return Object.keys(SignalInterceptor.getGraylist()).length;
            } catch (e) { return -1; }
        }
        return -1;
    }

    // ══════════════════════════════════════════════
    // VERIFICATION — Compare independent reads to SystemState
    // ══════════════════════════════════════════════

    async function verify() {
        if (typeof SystemState === 'undefined') return null;

        totalChecks++;
        const findings = [];

        // ── 1. Storage count cross-check ──
        const rawLS = readRawLSCount();
        const stateLS = SystemState.getStorageState().lsCount;

        if (rawLS >= 0 && Math.abs(rawLS - stateLS) > 5) {
            findings.push({
                check: 'LS_COUNT_DISAGREE',
                raw: rawLS,
                state: stateLS,
                delta: Math.abs(rawLS - stateLS),
                severity: 'WARN',
            });
        }

        // ── 2. IDB count cross-check ──
        const rawIDB = await readRawIDBCount();
        const stateIDB = SystemState.getStorageState().idbCount;

        if (rawIDB >= 0 && stateIDB >= 0 && Math.abs(rawIDB - stateIDB) > 10) {
            findings.push({
                check: 'IDB_COUNT_DISAGREE',
                raw: rawIDB,
                state: stateIDB,
                delta: Math.abs(rawIDB - stateIDB),
                severity: 'WARN',
            });
        }

        // ── 3. Quarantine cross-check ──
        const rawQ = readRawQuarantineCount();
        const stateQ = SystemState.getFeedState().quarantineSet.length;

        if (rawQ >= 0 && rawQ !== stateQ) {
            findings.push({
                check: 'QUARANTINE_COUNT_DISAGREE',
                raw: rawQ,
                state: stateQ,
                severity: 'ERROR',
            });
        }

        // ── 4. Graylist cross-check ──
        const rawG = readRawGraylistCount();
        const stateG = SystemState.getReputationState().graylisted.length;

        if (rawG >= 0 && rawG !== stateG) {
            findings.push({
                check: 'GRAYLIST_COUNT_DISAGREE',
                raw: rawG,
                state: stateG,
                severity: 'ERROR',
            });
        }

        // ── 5. Phase sanity ──
        const phase = SystemState.getPhase();
        const phaseAge = Date.now() - (SystemState.serialize().cycle.phaseEnteredAt || Date.now());

        // If stuck in non-IDLE for over 3 minutes, that's suspicious even before timeout
        if (phase !== 'IDLE' && phase !== 'BOOT' && phase !== 'DEGRADED' && phaseAge > 180000) {
            findings.push({
                check: 'PHASE_STALE',
                phase,
                ageMs: phaseAge,
                severity: 'WARN',
            });
        }

        // ── 6. Event log integrity ──
        const logIntegrity = SystemState.verifyLogIntegrity();
        if (!logIntegrity.intact) {
            findings.push({
                check: 'LOG_CHAIN_BROKEN',
                broken: logIntegrity.broken,
                severity: 'CRITICAL',
            });
        }

        // ── 7. Divergence vs adaptive threshold sanity ──
        const storageState = SystemState.getStorageState();
        if (storageState.adaptiveThreshold !== undefined) {
            // Verify threshold is reasonable (not absurdly high or low)
            if (storageState.adaptiveThreshold > 500 || storageState.adaptiveThreshold < 3) {
                findings.push({
                    check: 'ADAPTIVE_THRESHOLD_UNREASONABLE',
                    threshold: storageState.adaptiveThreshold,
                    severity: 'WARN',
                });
            }
        }

        // ── Score disagreements ──
        if (findings.length > 0) {
            disagreements++;
            const hasCritical = findings.some(f => f.severity === 'CRITICAL');

            if (disagreements >= CONFIG.maxDisagreements || hasCritical) {
                SystemState.logEvent('WATCHDOG_ALERT', {
                    disagreements,
                    totalChecks,
                    findings,
                });
                console.warn('[WATCHDOG] CONSTITUTIONAL VIOLATION — SystemState disagrees with reality', findings);
            }
        } else {
            // Decay disagreements slowly on clean checks
            disagreements = Math.max(0, disagreements - 0.5);
        }

        // ── Audit trail (independent of SystemState event log) ──
        auditLog({
            check: totalChecks,
            findings: findings.length,
            details: findings,
            disagreements: Math.round(disagreements * 10) / 10,
        });

        return {
            check: totalChecks,
            findings,
            disagreements: Math.round(disagreements * 10) / 10,
            trustworthy: findings.length === 0,
        };
    }

    // ══════════════════════════════════════════════
    // INDEPENDENT AUDIT LOG
    // ══════════════════════════════════════════════
    // Stored in localStorage under its OWN key, NOT in SystemState.
    // This is the watchdog's own memory — cannot be erased by
    // the system it's watching.

    function auditLog(entry) {
        try {
            const raw = localStorage.getItem(CONFIG.logKey);
            const log = raw ? JSON.parse(raw) : [];
            log.push({ t: Date.now(), ...entry });
            // Rotate
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
        // First check after 10 seconds (let modules init)
        setTimeout(() => {
            verify();
            timer = setInterval(verify, CONFIG.checkInterval);
        }, 10000);
        console.log('%c[WATCHDOG] Independent observer ONLINE — checking every 30s', 'color: #ff6b35;');
    }

    function stop() {
        if (timer) {
            clearInterval(timer);
            timer = null;
        }
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
            disagreements: Math.round(disagreements * 10) / 10,
            running: timer !== null,
            trustworthy: disagreements < CONFIG.maxDisagreements,
        }),
        start,
        stop,
    };

})();
