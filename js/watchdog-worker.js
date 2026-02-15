// ═══════════════════════════════════════════════════════════
// WATCHDOG-WORKER v1.0 — Independent System Monitor
// Hybrid Syndicate / Ethic Software Foundation
// ═══════════════════════════════════════════════════════════
// Web Worker that runs independently of the main thread.
// Monitors system health. Auto-recovers stalled subsystems.
// Cannot be blocked by main-thread freezes.

// This file runs as a Web Worker. No DOM access.

const HEALTH_INTERVAL = 30000; // 30 seconds
const STALE_THRESHOLD = 10 * 60 * 1000; // 10 minutes

let systemState = {
    rss: { lastPing: 0, status: 'unknown', errors: 0 },
    state: { lastPing: 0, status: 'unknown', errors: 0 },
    cascade: { lastPing: 0, status: 'unknown', errors: 0 },
    corefeed: { lastPing: 0, status: 'unknown', errors: 0 },
};

let heartbeatCount = 0;

// ── MAIN LOOP ──
function healthCheck() {
    heartbeatCount++;
    const now = Date.now();
    const report = { type: 'health-report', timestamp: now, heartbeat: heartbeatCount, systems: {} };

    Object.entries(systemState).forEach(([name, sys]) => {
        const stale = sys.lastPing > 0 && (now - sys.lastPing) > STALE_THRESHOLD;

        if (stale) {
            sys.status = 'stale';
            sys.errors++;
        }

        report.systems[name] = {
            status: sys.status,
            lastPing: sys.lastPing,
            age: sys.lastPing > 0 ? now - sys.lastPing : -1,
            errors: sys.errors,
            stale
        };
    });

    // Check for systemic issues
    const staleCount = Object.values(report.systems).filter(s => s.stale).length;
    report.overallStatus = staleCount === 0 ? 'healthy'
        : staleCount <= 1 ? 'degraded'
        : staleCount <= 2 ? 'impaired'
        : 'critical';

    // Recovery recommendations
    report.actions = [];
    Object.entries(report.systems).forEach(([name, sys]) => {
        if (sys.stale) {
            report.actions.push({ system: name, action: 'restart', reason: `No ping for ${Math.round(sys.age / 1000)}s` });
        }
    });

    // Send to main thread
    self.postMessage(report);
}

// ── MESSAGE HANDLER ──
self.onmessage = function(e) {
    const { type, system, data } = e.data;

    switch (type) {
        case 'ping':
            // Subsystem reports it's alive
            if (systemState[system]) {
                systemState[system].lastPing = Date.now();
                systemState[system].status = 'active';
                if (data && data.reset) systemState[system].errors = 0;
            }
            break;

        case 'error':
            // Subsystem reports an error
            if (systemState[system]) {
                systemState[system].errors++;
                systemState[system].status = 'error';
            }
            break;

        case 'status':
            // Request immediate health report
            healthCheck();
            break;

        case 'configure':
            // Allow runtime configuration
            if (data && data.interval) {
                clearInterval(healthTimer);
                healthTimer = setInterval(healthCheck, data.interval);
            }
            break;
    }
};

// ── START ──
let healthTimer = setInterval(healthCheck, HEALTH_INTERVAL);
// Initial report after 5 seconds
setTimeout(healthCheck, 5000);
