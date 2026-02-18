/**
 * oracle.js — ORACLE v2.0 Module
 * ═══════════════════════════════════════════════════════════
 * Planetary Intelligence Distributed System
 * First organ connected to the ECOSYSTEM nervous system.
 *
 * Responsibilities:
 *   - Domain risk assessment (6 domains)
 *   - Stability matrix visualization
 *   - Intelligence feed generation
 *   - Trend line rendering
 *   - Writes epochs to Identity on significant events
 *   - Emits events through Bus for other modules to consume
 *
 * Browser-native ES Module.
 * ═══════════════════════════════════════════════════════════
 */

// ── Sanitization ──
function escapeHTML(str) {
    const d = document.createElement('div');
    d.appendChild(document.createTextNode(str));
    return d.innerHTML;
}

// ── Domain data ──
const DOMAINS = [
    { id: 'climate',  label: 'CLI/ECO',  name: 'CLIMATE / ECOLOGY',  risk: 78, resilience: 35, volatility: 60 },
    { id: 'geo',      label: 'GEO',      name: 'GEOPOLITICS',        risk: 85, resilience: 22, volatility: 72 },
    { id: 'econ',     label: 'ECON',     name: 'ECONOMICS',          risk: 71, resilience: 48, volatility: 55 },
    { id: 'tech',     label: 'TECH',     name: 'TECHNOLOGY',         risk: 62, resilience: 55, volatility: 45 },
    { id: 'epist',    label: 'EPIST',    name: 'EPISTEMOLOGY',       risk: 94, resilience: 12, volatility: 88 },
    { id: 'social',   label: 'SOCIAL',   name: 'SOCIAL',             risk: 68, resilience: 40, volatility: 52 }
];

const DOMAIN_COLORS = {
    risk: '#ff3344',
    resilience: '#00d4aa',
    volatility: '#00c8ff'
};

const FEED_MESSAGES = [
    'SCANNING GEOPOLITICAL VECTORS...',
    'EPISTEMIC DRIFT DETECTED IN SECTOR_7',
    'AMOC DATA REFRESH COMPLETE',
    'NARRATIVE_ENGINE: SYNTHESIS_CYCLE_42',
    'RISK MATRIX RECALIBRATED',
    'GHOST_RUNNER: ALIGNMENT CHECK PASSED',
    'DERIVATIVE EXPOSURE INDEX UPDATED',
    'VOID_PULSE: TEMPORAL WINDOW NARROWING',
    'ABYSSAL_THINKER: RECURSION DEPTH OK',
    'CLIMATE MODEL v4.2 LOADED',
    'KINETIC ESCALATION PROBABILITY +0.3%',
    'INSTITUTIONAL TRUST INDEX: -1.2',
    'SYNTHETIC CONTENT SATURATION: 67.4%',
    'MARX_CORE: CLASS DYNAMICS SHIFT DETECTED',
    'ORACLE_CORE: OVERSHOOT THRESHOLD BREACHED',
    'SUPPLY CHAIN NODE FAILURE: SECTOR_12',
    'BIO-VULNERABILITY SCAN COMPLETE',
    'QUANTUM INFRA: MONITORING ACTIVE'
];

// ── Module state ──
let ecosystem = null;
let bus = null;
let identity = null;
let intervals = [];
let feedCounter = 3;
let scanCount = 0;
let stabilityData = null;

// ═══════════════════════════════════════════════════════════
// RENDERING
// ═══════════════════════════════════════════════════════════

function drawTrendLines() {
    document.querySelectorAll('.trend-line').forEach(canvas => {
        const trend = canvas.dataset.trend;
        const color = canvas.dataset.color || '#ff3344';
        const dpr = window.devicePixelRatio || 1;
        const w = 50, h = 16;
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);

        const points = [];
        const steps = 8;
        for (let i = 0; i <= steps; i++) {
            const x = (w / steps) * i;
            const t = i / steps;
            const noise = (Math.random() - 0.5) * 3;
            let y;

            switch (trend) {
                case 'up-steep':    y = h - 2 - (t * t * (h - 4)) + noise; break;
                case 'up':          y = h - 2 - (t * (h - 4) * 0.7) + noise; break;
                case 'up-slight':   y = h - 2 - (t * (h - 4) * 0.4) + noise; break;
                case 'down-steep':  y = 2 + (t * t * (h - 4)) + noise; break;
                case 'down':        y = 2 + (t * (h - 4) * 0.7) + noise; break;
                case 'down-slight': y = 2 + (t * (h - 4) * 0.3) + noise; break;
                default:            y = h / 2 + noise;
            }

            points.push({ x, y: Math.max(1, Math.min(h - 1, y)) });
        }

        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.stroke();
    });
}

function drawStabilityChart() {
    const stabCanvas = document.getElementById('stabilityChart');
    if (!stabCanvas) return;

    const ctx = stabCanvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = stabCanvas.getBoundingClientRect();
    stabCanvas.width = rect.width * dpr;
    stabCanvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const W = rect.width;
    const H = rect.height;
    const padLeft = 50, padRight = 20, padTop = 10, padBottom = 30;
    const chartW = W - padLeft - padRight;
    const chartH = H - padTop - padBottom;

    ctx.clearRect(0, 0, W, H);

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
        const y = padTop + (chartH / 5) * i;
        ctx.beginPath();
        ctx.moveTo(padLeft, y);
        ctx.lineTo(W - padRight, y);
        ctx.stroke();
    }

    // Y labels
    ctx.fillStyle = '#3a4f6f';
    ctx.font = '10px Share Tech Mono';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
        const val = 100 - i * 20;
        const y = padTop + (chartH / 5) * i;
        ctx.fillText(val + '%', padLeft - 8, y + 4);
    }

    // Grouped bars
    const barTypes = ['risk', 'resilience', 'volatility'];
    const groupWidth = chartW / DOMAINS.length;
    const barWidth = groupWidth * 0.2;
    const barGap = 4;

    // Capture current values for state
    const currentValues = {};

    DOMAINS.forEach((domain, gi) => {
        const groupX = padLeft + groupWidth * gi + groupWidth * 0.15;

        barTypes.forEach((type, bi) => {
            const baseVal = stabilityData[type][gi];
            const val = baseVal + (Math.random() - 0.5) * 4;
            const clampVal = Math.max(0, Math.min(100, val));
            const barH = (clampVal / 100) * chartH;
            const x = groupX + (barWidth + barGap) * bi;
            const y = padTop + chartH - barH;

            ctx.fillStyle = DOMAIN_COLORS[type];
            ctx.globalAlpha = 0.8;
            ctx.fillRect(x, y, barWidth, barH);
            ctx.globalAlpha = 1;

            if (!currentValues[domain.id]) currentValues[domain.id] = {};
            currentValues[domain.id][type] = Math.round(clampVal);
        });

        // Domain label
        ctx.fillStyle = '#3a4f6f';
        ctx.font = '9px Share Tech Mono';
        ctx.textAlign = 'center';
        const labelX = groupX + ((barWidth + barGap) * barTypes.length) / 2;
        ctx.fillText(domain.label, labelX, H - 8);
    });

    // Legend
    const legendX = W - padRight - 200;
    const legendY = padTop + 5;
    barTypes.forEach((type, i) => {
        ctx.fillStyle = DOMAIN_COLORS[type];
        ctx.fillRect(legendX + i * 70, legendY, 12, 3);
        ctx.fillStyle = '#3a4f6f';
        ctx.font = '9px Share Tech Mono';
        ctx.textAlign = 'left';
        ctx.fillText(type.toUpperCase(), legendX + i * 70 + 16, legendY + 4);
    });

    return currentValues;
}

function addFeedEntry() {
    const feed = document.getElementById('intelligenceFeed');
    if (!feed) return;

    const msg = FEED_MESSAGES[Math.floor(Math.random() * FEED_MESSAGES.length)];
    const entry = document.createElement('div');
    entry.className = 'feed-entry active';
    entry.innerHTML = `<span class="feed-id">[${feedCounter}]</span> ${escapeHTML(msg)}`;
    feed.appendChild(entry);
    feedCounter++;

    while (feed.children.length > 12) {
        feed.removeChild(feed.firstChild);
    }

    feed.scrollTop = feed.scrollHeight;
}

// ═══════════════════════════════════════════════════════════
// SCAN CYCLE — The heartbeat
// ═══════════════════════════════════════════════════════════

function performScan() {
    scanCount++;
    const values = drawStabilityChart();

    if (!bus || !values) return;

    // Emit scan event
    bus.emit('oracle:scan-complete', {
        cycle: scanCount,
        domains: values,
        aggregateRisk: DOMAINS.reduce((sum, d) => sum + d.risk, 0) / DOMAINS.length
    }, 'oracle');

    // Update ECOSYSTEM state
    if (ecosystem) {
        ecosystem.setState('oracle.lastScan', {
            cycle: scanCount,
            timestamp: Date.now(),
            domains: values
        }, { source: 'oracle' });

        ecosystem.setState('oracle.aggregateRisk',
            Math.round(DOMAINS.reduce((sum, d) => sum + d.risk, 0) / DOMAINS.length),
            { source: 'oracle' }
        );
    }

    // Write to Identity on significant scan milestones
    if (identity && (scanCount === 1 || scanCount % 50 === 0)) {
        identity.addEpoch({
            type: 'scan',
            title: `Oracle Scan Cycle #${scanCount}`,
            content: { cycle: scanCount, domains: values },
            source: 'oracle',
            tags: ['scan', 'periodic']
        });
    }

    // Trigger CoreFeed if available
    if (typeof CoreFeed !== 'undefined') {
        CoreFeed.trigger('oracle-scan');
    }
}

// ═══════════════════════════════════════════════════════════
// MODULE INTERFACE
// ═══════════════════════════════════════════════════════════

const OracleModule = {
    name: 'oracle',
    version: '2.0.0',

    /**
     * Initialize — called by ECOSYSTEM.register()
     */
    init(eco, b) {
        ecosystem = eco;
        bus = b;

        // Try to get Identity from ECOSYSTEM
        identity = eco.getModule('identity');

        // If Identity isn't registered yet, listen for it
        if (!identity) {
            bus.once('ecosystem:module-registered', (event) => {
                if (event.payload.name === 'identity') {
                    identity = eco.getModule('identity');
                }
            });
        }

        // Initialize stability data from DOMAINS
        stabilityData = {
            risk: DOMAINS.map(d => d.risk),
            resilience: DOMAINS.map(d => d.resilience),
            volatility: DOMAINS.map(d => d.volatility)
        };

        // Set initial state
        ecosystem.setState('oracle.status', 'active', { source: 'oracle' });
        ecosystem.setState('oracle.domains', DOMAINS.map(d => ({
            id: d.id, name: d.name, risk: d.risk
        })), { source: 'oracle' });

        // ── Setup rendering ──
        drawTrendLines();
        drawStabilityChart();

        // Tab switching
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', function () {
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                bus.emit('oracle:tab-switched', { tab: this.textContent.trim() }, 'oracle');
            });
        });

        // ── Start intervals ──

        // Stability chart refresh (0.8s)
        intervals.push(setInterval(() => performScan(), 800));

        // Intelligence feed (3-5s)
        intervals.push(setInterval(addFeedEntry, 3000 + Math.random() * 2000));

        // Resize handler
        const resizeHandler = () => {
            drawTrendLines();
            drawStabilityChart();
        };
        window.addEventListener('resize', resizeHandler);

        // Listen for events from other modules
        bus.on('eei:prediction-updated', (event) => {
            // EEI prediction affects Oracle risk assessment
            const msg = `EEI PREDICTION UPDATE: ${JSON.stringify(event.payload).substring(0, 60)}...`;
            const feed = document.getElementById('intelligenceFeed');
            if (feed) {
                const entry = document.createElement('div');
                entry.className = 'feed-entry system';
                entry.innerHTML = `<span class="feed-id">[${feedCounter++}]</span> ${escapeHTML(msg)}`;
                feed.appendChild(entry);
                while (feed.children.length > 12) feed.removeChild(feed.firstChild);
            }
        });

        // Write boot epoch
        if (identity) {
            identity.addEpoch({
                type: 'boot',
                title: 'Oracle Module Initialized',
                content: { version: OracleModule.version, domains: DOMAINS.length },
                source: 'oracle',
                tags: ['boot', 'system']
            });
        }

        // Emit ready
        bus.emit('oracle:ready', {
            version: OracleModule.version,
            domains: DOMAINS.length
        }, 'oracle');

        console.log(
            '%c[ORACLE] %cv' + OracleModule.version + ' %c— Planetary Intelligence online. ' + DOMAINS.length + ' domains.',
            'color: #00c8ff; font-weight: bold;',
            'color: #39ff14;',
            'color: #6b7fa3;'
        );
    },

    /**
     * Destroy — cleanup
     */
    destroy() {
        intervals.forEach(id => clearInterval(id));
        intervals = [];

        if (ecosystem) {
            ecosystem.setState('oracle.status', 'offline', { source: 'oracle' });
        }

        if (bus) {
            bus.emit('oracle:shutdown', { cycle: scanCount }, 'oracle');
        }
    },

    /**
     * Get current domain data.
     */
    getDomains() {
        return [...DOMAINS];
    },

    /**
     * Get scan count.
     */
    getScanCount() {
        return scanCount;
    }
};

export default OracleModule;
