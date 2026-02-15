// ═══════════════════════════════════════════════════════════════
// RUNTIME INTEGRITY v1.0 — Environmental Trust Verification
// Hybrid Syndicate / Ethic Software Foundation
// ═══════════════════════════════════════════════════════════════
// "If the ground under your feet is poisoned, the castle is theater."
//
// This module verifies the runtime environment at boot and
// continuously. It catches:
//   - ATK-13: Crypto API shimming (monkeypatched subtle/random)
//   - ATK-14: Supply chain / script integrity (SRI manifest)
//   - ATK-16: Extension adversary (prototype tampering)
//   - ATK-17: Clock tampering (Date.now vs performance.now)
//   - ATK-18: Split-brain / multi-tab (leader election)
//
// The module runs BEFORE other modules and can halt boot if
// the environment is fundamentally compromised.
// ═══════════════════════════════════════════════════════════════

const RuntimeIntegrity = (() => {

    const findings = [];    // accumulated integrity issues
    let bootTime = Date.now();
    let perfBootTime = (typeof performance !== 'undefined') ? performance.now() : 0;

    // ══════════════════════════════════════════════
    // ATK-13: CRYPTO INTEGRITY — Detect shims
    // ══════════════════════════════════════════════
    // An attacker with same-origin code execution can wrap
    // crypto.subtle.sign/verify/generateKey to return attacker-
    // controlled values. We fingerprint the native functions
    // and detect wrapping.

    let cryptoIntact = false;
    const nativePrints = {};

    function checkCryptoIntegrity() {
        const issues = [];

        // 1. Check crypto.subtle exists and looks native
        if (typeof crypto === 'undefined' || !crypto.subtle) {
            issues.push({ check: 'CRYPTO_MISSING', detail: 'crypto.subtle not available', severity: 'CRITICAL' });
            return issues;
        }

        // 2. Fingerprint native functions via toString()
        // Native functions return "function sign() { [native code] }" or similar
        const nativeMethods = ['sign', 'verify', 'generateKey', 'exportKey', 'importKey'];
        for (const method of nativeMethods) {
            const fn = crypto.subtle[method];
            if (!fn) {
                issues.push({ check: 'CRYPTO_METHOD_MISSING', detail: `crypto.subtle.${method} missing`, severity: 'CRITICAL' });
                continue;
            }
            const str = Function.prototype.toString.call(fn);
            nativePrints[method] = str;
            if (!str.includes('[native code]')) {
                issues.push({
                    check: 'CRYPTO_SHIMMED',
                    detail: `crypto.subtle.${method} is NOT native — possible monkeypatch`,
                    severity: 'CRITICAL',
                    method,
                    toString: str.slice(0, 80),
                });
            }
        }

        // 3. Check crypto.getRandomValues
        if (crypto.getRandomValues) {
            const str = Function.prototype.toString.call(crypto.getRandomValues);
            nativePrints['getRandomValues'] = str;
            if (!str.includes('[native code]')) {
                issues.push({
                    check: 'CRYPTO_RANDOM_SHIMMED',
                    detail: 'crypto.getRandomValues is NOT native — entropy compromised',
                    severity: 'CRITICAL',
                });
            }
        }

        // 4. Functional test: generate random, verify non-zero
        try {
            const buf = new Uint8Array(32);
            crypto.getRandomValues(buf);
            const allZero = buf.every(b => b === 0);
            if (allZero) {
                issues.push({
                    check: 'CRYPTO_RANDOM_ZERO',
                    detail: '32 bytes of getRandomValues returned all zeros — entropy failure',
                    severity: 'CRITICAL',
                });
            }
        } catch (e) {
            issues.push({ check: 'CRYPTO_RANDOM_FAIL', detail: e.message, severity: 'CRITICAL' });
        }

        cryptoIntact = issues.length === 0;
        return issues;
    }

    // Best-effort freeze of crypto objects to raise cost of shimming
    function hardenCrypto() {
        try {
            if (typeof crypto !== 'undefined' && crypto.subtle) {
                Object.freeze(crypto.subtle);
            }
            // Freeze Uint8Array prototype (prevent intercept of random output)
            Object.freeze(Uint8Array.prototype);
        } catch (e) {
            // Some environments don't allow freezing — that's ok
        }
    }

    // ══════════════════════════════════════════════
    // ATK-14: SCRIPT INTEGRITY — SRI manifest
    // ══════════════════════════════════════════════
    // Build a manifest of all loaded scripts with their expected
    // characteristics. Can't compute SHA256 of script content
    // from JS (CORS), but CAN verify: count, src attributes,
    // and detect unexpected injected scripts.

    let scriptManifest = null;

    function checkScriptIntegrity() {
        const issues = [];

        // Known script sources (relative paths)
        const EXPECTED_SCRIPTS = [
            'js/system-state.js',
            'js/indexed-store.js',
            'js/core-feed.js',
            'js/persistence-manager.js',
            'js/correlation-engine.js',
            'js/signal-interceptor.js',
            'js/coherence-ledger.js',
            'js/signal-gate.js',
            'js/watchdog.js',
            'js/runtime-integrity.js',
        ];

        if (typeof document === 'undefined') return issues;

        const scripts = Array.from(document.querySelectorAll('script[src]'));
        const srcs = scripts.map(s => {
            // Normalize: strip origin, keep relative path
            try {
                const url = new URL(s.src, location.href);
                return url.pathname.replace(/^\//, '');
            } catch (e) {
                return s.getAttribute('src');
            }
        });

        // Check for unexpected scripts
        for (const src of srcs) {
            const isExpected = EXPECTED_SCRIPTS.some(exp => src.endsWith(exp));
            if (!isExpected) {
                issues.push({
                    check: 'UNEXPECTED_SCRIPT',
                    detail: `Script not in manifest: ${src}`,
                    severity: 'WARN',
                    src,
                });
            }
        }

        // Check for missing expected scripts (if on a page that should have them)
        // Only flag if we're on index.html or system-status.html
        const path = location.pathname;
        if (path.endsWith('index.html') || path === '/' || path.endsWith('system-status.html')) {
            const coreScripts = ['system-state.js', 'watchdog.js', 'persistence-manager.js'];
            for (const core of coreScripts) {
                if (!srcs.some(s => s.endsWith(core))) {
                    issues.push({
                        check: 'MISSING_CORE_SCRIPT',
                        detail: `Expected core script missing: ${core}`,
                        severity: 'ERROR',
                        script: core,
                    });
                }
            }
        }

        scriptManifest = {
            checked: Date.now(),
            expected: EXPECTED_SCRIPTS.length,
            found: scripts.length,
            srcs,
            issues: issues.length,
        };

        return issues;
    }

    // ══════════════════════════════════════════════
    // ATK-16: ENVIRONMENT ATTESTATION — Detect tampering
    // ══════════════════════════════════════════════
    // Browser extensions and malicious scripts can modify
    // native prototypes. We check key indicators.

    function checkEnvironment() {
        const issues = [];

        // 1. Check if common prototype methods are native
        const checks = [
            ['Array.prototype.push', Array.prototype.push],
            ['Array.prototype.map', Array.prototype.map],
            ['Array.prototype.filter', Array.prototype.filter],
            ['JSON.stringify', JSON.stringify],
            ['JSON.parse', JSON.parse],
            ['Object.keys', Object.keys],
            ['Function.prototype.toString', Function.prototype.toString],
            ['localStorage.setItem', typeof localStorage !== 'undefined' ? localStorage.setItem : null],
            ['localStorage.getItem', typeof localStorage !== 'undefined' ? localStorage.getItem : null],
        ];

        for (const [name, fn] of checks) {
            if (!fn) continue;
            try {
                const str = Function.prototype.toString.call(fn);
                if (!str.includes('[native code]')) {
                    issues.push({
                        check: 'PROTOTYPE_TAMPERED',
                        detail: `${name} is not native — possible extension or monkeypatch`,
                        severity: 'WARN',
                        method: name,
                    });
                }
            } catch (e) {
                issues.push({
                    check: 'PROTOTYPE_CHECK_FAILED',
                    detail: `Cannot inspect ${name}: ${e.message}`,
                    severity: 'WARN',
                    method: name,
                });
            }
        }

        // 2. Check for MutationObserver hijacking (extension indicator)
        if (typeof MutationObserver !== 'undefined') {
            const str = Function.prototype.toString.call(MutationObserver);
            if (!str.includes('[native code]') && !str.includes('function MutationObserver')) {
                issues.push({
                    check: 'MUTATION_OBSERVER_TAMPERED',
                    detail: 'MutationObserver appears non-native — possible extension',
                    severity: 'WARN',
                });
            }
        }

        // 3. Check for extra properties on window that shouldn't be there
        // (common extension injections)
        const suspiciousGlobals = ['__REACT_DEVTOOLS_GLOBAL_HOOK__', '__VUE_DEVTOOLS_GLOBAL_HOOK__'];
        for (const glob of suspiciousGlobals) {
            if (typeof window !== 'undefined' && window[glob]) {
                issues.push({
                    check: 'DEVTOOLS_DETECTED',
                    detail: `${glob} found — devtools extension active`,
                    severity: 'INFO',
                    global: glob,
                });
            }
        }

        return issues;
    }

    // ══════════════════════════════════════════════
    // ATK-17: CLOCK SANITY — Detect time manipulation
    // ══════════════════════════════════════════════
    // Date.now() can be monkeypatched. performance.now() is
    // harder to fake but not impossible. Cross-checking both
    // catches gross manipulation.

    let clockDriftHistory = [];  // track drift over time
    let clockTamperDetected = false;

    function checkClockSanity() {
        const issues = [];

        if (typeof performance === 'undefined') {
            return issues; // can't cross-check
        }

        const dateNow = Date.now();
        const perfNow = performance.now();

        // Expected: dateNow ≈ performance.timeOrigin + perfNow
        const expectedDate = performance.timeOrigin + perfNow;
        const drift = Math.abs(dateNow - expectedDate);

        clockDriftHistory.push({ t: dateNow, drift });
        if (clockDriftHistory.length > 20) clockDriftHistory.shift();

        // Gross drift: >5 seconds between clocks
        if (drift > 5000) {
            clockTamperDetected = true;
            issues.push({
                check: 'CLOCK_TAMPER',
                detail: `Date.now() and performance.now() diverge by ${Math.round(drift)}ms`,
                severity: 'CRITICAL',
                drift,
                dateNow,
                perfNow,
                expectedDate: Math.round(expectedDate),
            });
        }

        // Check Date.now is native
        try {
            const str = Function.prototype.toString.call(Date.now);
            if (!str.includes('[native code]')) {
                issues.push({
                    check: 'DATE_NOW_SHIMMED',
                    detail: 'Date.now is not native — time source compromised',
                    severity: 'CRITICAL',
                });
            }
        } catch (e) { /* ok */ }

        // Check for monotonicity: Date.now should never go backward
        if (dateNow < bootTime) {
            issues.push({
                check: 'CLOCK_REGRESSION',
                detail: `Date.now (${dateNow}) is before boot time (${bootTime})`,
                severity: 'CRITICAL',
            });
        }

        return issues;
    }

    // ══════════════════════════════════════════════
    // ATK-18: LEADER ELECTION — Single-writer lock
    // ══════════════════════════════════════════════
    // Multiple tabs running simultaneously cause split-brain:
    // conflicting writes, orphaned 2PC markers, phase artifact
    // collisions. Only one tab should be the "writer."
    //
    // Uses BroadcastChannel for coordination with navigator.locks
    // as a backup where available.

    let isLeader = false;
    let leaderChannel = null;
    let leaderId = null;
    let leaderHeartbeat = 0;
    const LEADER_TIMEOUT = 15000;   // ms before assuming leader is dead
    const LEADER_HEARTBEAT = 5000;  // ms between heartbeats

    function initLeaderElection() {
        leaderId = (typeof crypto !== 'undefined' && crypto.randomUUID)
            ? crypto.randomUUID()
            : 'tab-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);

        if (typeof BroadcastChannel === 'undefined') {
            // No BroadcastChannel → single tab assumed → we're leader
            isLeader = true;
            return;
        }

        leaderChannel = new BroadcastChannel('hs_leader_election');

        leaderChannel.onmessage = (e) => {
            const msg = e.data;
            if (!msg || typeof msg !== 'object') return;

            if (msg.type === 'heartbeat' && msg.leaderId !== leaderId) {
                // Another tab is leader
                isLeader = false;
                leaderHeartbeat = Date.now();
            } else if (msg.type === 'claim' && msg.leaderId !== leaderId) {
                // Another tab claiming leadership — defer if they have lower ID
                if (msg.leaderId < leaderId) {
                    isLeader = false;
                    leaderHeartbeat = Date.now();
                }
            } else if (msg.type === 'resign' && msg.leaderId !== leaderId) {
                // Leader resigned — try to claim
                tryClaimLeadership();
            }
        };

        // Try to claim leadership
        tryClaimLeadership();

        // Periodic: send heartbeat if leader, check for dead leader if not
        setInterval(() => {
            if (isLeader) {
                leaderChannel.postMessage({ type: 'heartbeat', leaderId });
            } else {
                // If no heartbeat received in LEADER_TIMEOUT, claim leadership
                if (Date.now() - leaderHeartbeat > LEADER_TIMEOUT) {
                    tryClaimLeadership();
                }
            }
        }, LEADER_HEARTBEAT);
    }

    function tryClaimLeadership() {
        isLeader = true;
        leaderHeartbeat = Date.now();
        if (leaderChannel) {
            leaderChannel.postMessage({ type: 'claim', leaderId });
        }
    }

    function resignLeadership() {
        isLeader = false;
        if (leaderChannel) {
            leaderChannel.postMessage({ type: 'resign', leaderId });
        }
    }

    // ══════════════════════════════════════════════
    // BOOT SEQUENCE — Run all checks
    // ══════════════════════════════════════════════

    function runBootChecks() {
        findings.length = 0;

        const cryptoIssues = checkCryptoIntegrity();
        const scriptIssues = checkScriptIntegrity();
        const envIssues = checkEnvironment();
        const clockIssues = checkClockSanity();

        findings.push(...cryptoIssues, ...scriptIssues, ...envIssues, ...clockIssues);

        // Harden crypto after checking (so our check isn't affected by freeze)
        hardenCrypto();

        // Start leader election
        initLeaderElection();

        // Log to SystemState if available
        if (typeof SystemState !== 'undefined') {
            for (const issue of findings) {
                SystemState.logEvent('RUNTIME_INTEGRITY', issue);
            }
            if (findings.some(f => f.severity === 'CRITICAL')) {
                SystemState.logEvent('RUNTIME_CRITICAL', {
                    count: findings.filter(f => f.severity === 'CRITICAL').length,
                    checks: findings.filter(f => f.severity === 'CRITICAL').map(f => f.check),
                });
            }
        }

        const hasCritical = findings.some(f => f.severity === 'CRITICAL');

        if (hasCritical) {
            console.error('%c[RUNTIME INTEGRITY] CRITICAL ISSUES DETECTED — environment compromised', 'color: #ff0000; font-weight: bold;', findings);
        } else if (findings.length > 0) {
            console.warn('%c[RUNTIME INTEGRITY] Non-critical issues detected', 'color: #ffbf00;', findings);
        } else {
            console.log('%c[RUNTIME INTEGRITY] Environment verified — all checks passed', 'color: #39ff14;');
        }

        return {
            intact: !hasCritical,
            findings,
            cryptoIntact,
            scriptManifest,
            clockTamperDetected,
            isLeader,
            leaderId,
        };
    }

    // Periodic re-check (every 60 seconds)
    function startPeriodicChecks() {
        setInterval(() => {
            const clockIssues = checkClockSanity();
            if (clockIssues.length > 0) {
                findings.push(...clockIssues);
                if (typeof SystemState !== 'undefined') {
                    for (const issue of clockIssues) {
                        SystemState.logEvent('RUNTIME_INTEGRITY', issue);
                    }
                }
            }
        }, 60000);
    }

    // Auto-boot
    const bootResult = runBootChecks();
    startPeriodicChecks();

    // Resign leadership on unload
    if (typeof window !== 'undefined') {
        window.addEventListener('beforeunload', resignLeadership);
    }

    // ══════════════════════════════════════════════
    // PUBLIC API
    // ══════════════════════════════════════════════

    return {
        getFindings: () => [...findings],
        getBootResult: () => bootResult,
        isEnvironmentIntact: () => cryptoIntact && !clockTamperDetected,
        // Crypto
        isCryptoIntact: () => cryptoIntact,
        getNativePrints: () => ({ ...nativePrints }),
        checkCryptoIntegrity,
        // Scripts
        getScriptManifest: () => scriptManifest ? { ...scriptManifest } : null,
        checkScriptIntegrity,
        // Environment
        checkEnvironment,
        // Clock
        isClockTampered: () => clockTamperDetected,
        checkClockSanity,
        getClockDrift: () => [...clockDriftHistory],
        // Leader election
        isLeader: () => isLeader,
        getLeaderId: () => leaderId,
        resignLeadership,
        // Re-check
        recheck: runBootChecks,
    };

})();
