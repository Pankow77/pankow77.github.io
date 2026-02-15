// ═══════════════════════════════════════════════════════════
// WATCHDOG v1.0 — System Health Monitor (Main Thread Bridge)
// Hybrid Syndicate / Ethic Software Foundation
// ═══════════════════════════════════════════════════════════
// Spawns watchdog-worker.js as a Web Worker.
// Bridges health reports to CoreFeed and StateManager.
// Auto-recovers stalled subsystems.

const Watchdog = (() => {
    'use strict';

    let worker = null;
    let lastReport = null;
    let pingIntervals = {};

    function init() {
        try {
            worker = new Worker('js/watchdog-worker.js');
        } catch {
            console.warn('[Watchdog] Web Workers not available. Running in degraded mode.');
            return;
        }

        worker.onmessage = handleReport;
        worker.onerror = (e) => {
            console.error('[Watchdog] Worker error:', e.message);
        };

        // Start pinging subsystems
        startPinging();

        console.log('%c[Watchdog] Online. Independent health monitoring active.', 'color: #ff4444; font-size: 10px;');
    }

    function startPinging() {
        // Ping StateManager
        pingIntervals.state = setInterval(() => {
            if (typeof StateManager !== 'undefined') {
                ping('state');
            }
        }, 15000);

        // Ping RSS Pipeline
        pingIntervals.rss = setInterval(() => {
            if (typeof RSSPipeline !== 'undefined') {
                if (RSSPipeline.lastFetch > 0) {
                    ping('rss');
                }
            }
        }, 15000);

        // Ping Cascade Detector
        pingIntervals.cascade = setInterval(() => {
            if (typeof CascadeDetector !== 'undefined') {
                ping('cascade');
            }
        }, 15000);

        // Ping CoreFeed
        pingIntervals.corefeed = setInterval(() => {
            if (typeof CoreFeed !== 'undefined') {
                ping('corefeed');
            }
        }, 15000);

        // Initial pings
        setTimeout(() => {
            ['state', 'rss', 'cascade', 'corefeed'].forEach(sys => ping(sys));
        }, 2000);
    }

    function ping(system) {
        if (worker) {
            worker.postMessage({ type: 'ping', system });
        }
    }

    function reportError(system) {
        if (worker) {
            worker.postMessage({ type: 'error', system });
        }
    }

    function handleReport(e) {
        const report = e.data;
        if (report.type !== 'health-report') return;

        lastReport = report;

        // Auto-recovery for stale systems
        report.actions.forEach(action => {
            if (action.action === 'restart') {
                attemptRecovery(action.system, action.reason);
            }
        });

        // Report to CoreFeed on degraded/impaired/critical
        if (report.overallStatus !== 'healthy' && typeof CoreFeed !== 'undefined') {
            const statusColors = {
                degraded: 'AFFECTIVE_CORE',
                impaired: 'SENTINEL',
                critical: 'SENTINEL'
            };
            const coreId = statusColors[report.overallStatus] || 'SENTINEL';
            const priority = report.overallStatus === 'critical'
                ? (CoreFeed.PRIORITY ? CoreFeed.PRIORITY.CRITICAL : 0)
                : (CoreFeed.PRIORITY ? CoreFeed.PRIORITY.HIGH : 1);

            const staleNames = Object.entries(report.systems)
                .filter(([, s]) => s.stale)
                .map(([name]) => name.toUpperCase());

            if (typeof CoreFeed.addPriority === 'function') {
                CoreFeed.addPriority(
                    coreId,
                    `[WATCHDOG] Stato: ${report.overallStatus.toUpperCase()}. Sistemi stale: ${staleNames.join(', ')}`,
                    priority
                );
            }
        }

        // Store health snapshot in StateManager
        if (typeof StateManager !== 'undefined') {
            StateManager.set('watchdog_last_report', {
                status: report.overallStatus,
                heartbeat: report.heartbeat,
                timestamp: report.timestamp,
                systems: Object.fromEntries(
                    Object.entries(report.systems).map(([k, v]) => [k, v.status])
                )
            });
        }
    }

    function attemptRecovery(system, reason) {
        console.warn(`[Watchdog] Attempting recovery: ${system} (${reason})`);

        switch (system) {
            case 'rss':
                if (typeof RSSPipeline !== 'undefined') {
                    RSSPipeline.stop();
                    setTimeout(() => RSSPipeline.start(), 2000);
                }
                break;
            case 'cascade':
                if (typeof CascadeDetector !== 'undefined') {
                    CascadeDetector.stop();
                    setTimeout(() => CascadeDetector.start(), 2000);
                }
                break;
            case 'corefeed':
                // CoreFeed can't easily restart, but we can clear stale state
                console.warn('[Watchdog] CoreFeed stale — no auto-recovery available.');
                break;
            case 'state':
                // StateManager is fundamental — log but don't touch
                console.error('[Watchdog] StateManager stale — manual intervention may be needed.');
                break;
        }
    }

    function getStatus() {
        return lastReport;
    }

    function requestReport() {
        if (worker) {
            worker.postMessage({ type: 'status' });
        }
    }

    init();

    return {
        ping,
        reportError,
        getStatus,
        requestReport,
    };
})();
