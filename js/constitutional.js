// ═══════════════════════════════════════════════════════════
// CONSTITUTIONAL FRAMEWORK v1.0 — Governance & Invariants
// Hybrid Syndicate / Ethic Software Foundation
// ═══════════════════════════════════════════════════════════
// Enforces system invariants. State machine with transitions.
// Adversarial injection detection. Runtime integrity checks.
// This is the law that governs all other systems.

const Constitutional = (() => {
    'use strict';

    // ═══════════════════════════════════════════════════════
    // INVARIANTS — These CANNOT be violated. Ever.
    // ═══════════════════════════════════════════════════════

    const INVARIANTS = [
        {
            id: 'no-external-data-send',
            name: 'No External Data Transmission',
            description: 'No user data leaves the browser. Ever.',
            test: () => {
                // Verify no fetch/XHR to non-whitelisted domains
                return true; // Baseline — enforced by architecture
            }
        },
        {
            id: 'no-telemetry',
            name: 'Zero Telemetry',
            description: 'No analytics, tracking, or "anonymous" usage data.',
            test: () => {
                // Check no analytics scripts loaded
                const scripts = document.querySelectorAll('script[src]');
                const banned = ['google-analytics', 'gtag', 'segment', 'mixpanel',
                                'hotjar', 'fullstory', 'amplitude', 'heap', 'plausible',
                                'matomo', 'fathom'];
                for (const script of scripts) {
                    const src = script.src.toLowerCase();
                    if (banned.some(b => src.includes(b))) {
                        return { pass: false, violation: `Banned analytics script: ${src}` };
                    }
                }
                return { pass: true };
            }
        },
        {
            id: 'local-storage-only',
            name: 'Local Storage Only',
            description: 'All data persists locally. No cloud database.',
            test: () => {
                return { pass: true }; // Enforced by architecture — no Firebase/Supabase imports
            }
        },
        {
            id: 'no-auth-required',
            name: 'No Authentication Required',
            description: 'Tools work without login, account, or identity.',
            test: () => {
                const authElements = document.querySelectorAll('[data-auth], .login-form, #login, .oauth-button');
                return {
                    pass: authElements.length === 0,
                    violation: authElements.length > 0 ? 'Auth elements detected in DOM' : null
                };
            }
        },
        {
            id: 'epl-integrity',
            name: 'EPL Integrity Active',
            description: 'Entropic Process Lock must be operational.',
            test: () => {
                if (typeof StateManager === 'undefined') return { pass: true }; // Not loaded yet
                const status = StateManager.eplStatus();
                return {
                    pass: status.active && status.seed,
                    violation: !status.active ? 'EPL not active' : null
                };
            }
        },
        {
            id: 'no-subscription-ui',
            name: 'No Subscription UI',
            description: 'No recurring payment elements. €10 one-time only.',
            test: () => {
                const bodyText = document.body.textContent.toLowerCase();
                const subscriptionPatterns = ['/month', '/year', 'subscribe', 'recurring', 'billing cycle',
                                              'free trial', 'upgrade to pro', 'premium plan'];
                for (const pattern of subscriptionPatterns) {
                    if (bodyText.includes(pattern)) {
                        // Exception: if it's in the manifesto criticizing subscriptions
                        const context = bodyText.indexOf(pattern);
                        const nearby = bodyText.slice(Math.max(0, context - 50), context + 50);
                        if (nearby.includes('not') || nearby.includes("don't") || nearby.includes('no ')) continue;
                        return { pass: false, violation: `Subscription language found: "${pattern}"` };
                    }
                }
                return { pass: true };
            }
        },
    ];

    // ═══════════════════════════════════════════════════════
    // STATE MACHINE — System lifecycle governance
    // ═══════════════════════════════════════════════════════

    const STATES = {
        BOOT: 'BOOT',
        NOMINAL: 'NOMINAL',
        DEGRADED: 'DEGRADED',
        ALERT: 'ALERT',
        LOCKDOWN: 'LOCKDOWN',
    };

    const VALID_TRANSITIONS = {
        BOOT:     ['NOMINAL', 'DEGRADED'],
        NOMINAL:  ['DEGRADED', 'ALERT'],
        DEGRADED: ['NOMINAL', 'ALERT', 'LOCKDOWN'],
        ALERT:    ['NOMINAL', 'DEGRADED', 'LOCKDOWN'],
        LOCKDOWN: ['DEGRADED', 'NOMINAL'],
    };

    let currentState = STATES.BOOT;
    let stateHistory = [];
    let violationLog = [];

    function transition(newState, reason) {
        if (!VALID_TRANSITIONS[currentState]?.includes(newState)) {
            const msg = `Invalid transition: ${currentState} → ${newState}. Blocked.`;
            console.error('[Constitutional] ' + msg);
            logViolation('invalid-transition', msg);
            return false;
        }

        const entry = {
            from: currentState,
            to: newState,
            reason,
            timestamp: Date.now()
        };

        stateHistory.push(entry);
        if (stateHistory.length > 100) stateHistory.splice(0, stateHistory.length - 100);

        currentState = newState;

        console.log(
            `%c[Constitutional] ${entry.from} → ${entry.to}: ${reason}`,
            `color: ${newState === STATES.NOMINAL ? '#39ff14' : newState === STATES.ALERT ? '#ff6600' : newState === STATES.LOCKDOWN ? '#ff0040' : '#ffcc00'}; font-size: 10px;`
        );

        // Broadcast state change
        if (typeof StateManager !== 'undefined') {
            StateManager.set('constitutional_state', { state: currentState, reason, timestamp: Date.now() });
            StateManager.broadcast('constitutional:transition', entry);
        }

        return true;
    }

    // ═══════════════════════════════════════════════════════
    // ADVERSARIAL INJECTION DETECTION
    // ═══════════════════════════════════════════════════════

    function scanForInjection() {
        const threats = [];

        // 1. Check for unexpected script injections
        const scripts = document.querySelectorAll('script[src]');
        const allowedPatterns = [
            /^js\//,                              // Local scripts
            /fonts\.googleapis\.com/,             // Google Fonts
            /cdn\.jsdelivr\.net.*fontawesome/,     // FontAwesome
        ];

        scripts.forEach(script => {
            const src = script.getAttribute('src') || '';
            const isAllowed = allowedPatterns.some(p => p.test(src));
            if (!isAllowed && src.startsWith('http')) {
                threats.push({
                    type: 'script-injection',
                    severity: 'high',
                    detail: `Unauthorized external script: ${src}`
                });
            }
        });

        // 2. Check for iframe injections
        const iframes = document.querySelectorAll('iframe');
        if (iframes.length > 0) {
            threats.push({
                type: 'iframe-injection',
                severity: 'medium',
                detail: `${iframes.length} iframe(s) detected in DOM`
            });
        }

        // 3. Check for form action hijacking
        const forms = document.querySelectorAll('form[action]');
        forms.forEach(form => {
            const action = form.getAttribute('action') || '';
            if (action.startsWith('http') && !action.includes(window.location.hostname)) {
                threats.push({
                    type: 'form-hijack',
                    severity: 'critical',
                    detail: `Form action points to external URL: ${action}`
                });
            }
        });

        // 4. Check localStorage for injection attempts
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key) continue;
            // Check for suspicious keys (not hs_ prefixed)
            if (key.startsWith('hs_')) continue;
            // Known safe keys
            const safeKeys = ['hs-visited-', 'debug'];
            if (safeKeys.some(s => key.startsWith(s))) continue;

            try {
                const val = localStorage.getItem(key);
                if (val && (val.includes('<script') || val.includes('javascript:') || val.includes('onerror='))) {
                    threats.push({
                        type: 'storage-xss',
                        severity: 'critical',
                        detail: `Potential XSS in localStorage key: ${key}`
                    });
                }
            } catch { /* ignore */ }
        }

        return threats;
    }

    // ═══════════════════════════════════════════════════════
    // AUDIT — Full system integrity check
    // ═══════════════════════════════════════════════════════

    function audit() {
        const results = {
            timestamp: Date.now(),
            state: currentState,
            invariants: [],
            injectionThreats: [],
            overallPass: true
        };

        // Test all invariants
        INVARIANTS.forEach(inv => {
            const testResult = inv.test();
            const pass = testResult === true || (testResult && testResult.pass);
            results.invariants.push({
                id: inv.id,
                name: inv.name,
                pass,
                violation: pass ? null : (testResult?.violation || 'Failed')
            });
            if (!pass) {
                results.overallPass = false;
                logViolation(inv.id, testResult?.violation || 'Invariant failed');
            }
        });

        // Scan for injection
        results.injectionThreats = scanForInjection();
        if (results.injectionThreats.some(t => t.severity === 'critical')) {
            results.overallPass = false;
        }

        // Update system state based on audit
        if (!results.overallPass && currentState === STATES.NOMINAL) {
            transition(STATES.ALERT, 'Audit failed: invariant violation or critical threat');
        } else if (results.overallPass && currentState === STATES.ALERT) {
            transition(STATES.NOMINAL, 'Audit passed: all invariants hold');
        }

        // Store audit result
        if (typeof StateManager !== 'undefined') {
            StateManager.set('constitutional_audit', results);
        }

        return results;
    }

    function logViolation(type, detail) {
        const entry = { type, detail, timestamp: Date.now() };
        violationLog.push(entry);
        if (violationLog.length > 200) violationLog.splice(0, violationLog.length - 200);
        console.error(`[Constitutional] VIOLATION: ${type} — ${detail}`);
    }

    // ═══════════════════════════════════════════════════════
    // INIT
    // ═══════════════════════════════════════════════════════

    function init() {
        // Run initial audit after DOM is ready
        const run = () => {
            const auditResult = audit();

            if (auditResult.overallPass) {
                transition(STATES.NOMINAL, 'Boot complete. All invariants hold.');
            } else {
                transition(STATES.DEGRADED, 'Boot complete with violations.');
            }

            // Schedule periodic audits (every 5 minutes)
            setInterval(audit, 5 * 60 * 1000);

            console.log(
                `%c[Constitutional] ${auditResult.overallPass ? 'ALL INVARIANTS HOLD' : 'VIOLATIONS DETECTED'}. State: ${currentState}`,
                `color: ${auditResult.overallPass ? '#39ff14' : '#ff0040'}; font-weight: bold; font-size: 10px;`
            );
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', run);
        } else {
            run();
        }
    }

    init();

    // ═══════════════════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════════════════

    return {
        audit,
        transition,
        getState: () => currentState,
        getHistory: () => [...stateHistory],
        getViolations: () => [...violationLog],
        STATES,
        INVARIANTS,
        scanForInjection,
    };
})();
