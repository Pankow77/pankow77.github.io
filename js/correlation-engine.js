/**
 * correlation-engine.js — Cross-Actor Correlation Engine
 * ═══════════════════════════════════════════════════════════
 * Theater-agnostic. Listens to ANY theater module's events.
 * Computes cross-actor synchronization, co-occurrence matrices,
 * lag correlation, and regime shift detection.
 *
 * The frequency per actor is necessary but not sufficient.
 * The REAL signal is: when actors synchronize, systems tremble.
 *
 * Metrics:
 *   - Co-occurrence matrix: who appears alongside whom
 *   - Sync detection: N actors above threshold within window
 *   - Lag correlation: who reacts to whom (temporal proximity)
 *   - Regime alert: systemic shift detected
 *
 * Browser-native ES Module. Depends on bus.js ecosystem.
 * ═══════════════════════════════════════════════════════════
 */

// ── Configuration ──
const SYNC_WINDOW_MS = 8 * 60 * 60 * 1000;    // 8 hours — sync detection window
const CO_OCCURRENCE_WINDOW_MS = 12 * 60 * 60 * 1000; // 12 hours — co-occurrence window
const BASELINE_RATIO_THRESHOLD = 1.8;           // Above this = elevated
const MIN_ACTORS_FOR_REGIME = 3;                // Minimum actors for regime alert
const MAX_EVENTS = 5000;                         // Rolling event buffer

// ── State ──
const events = [];            // { theater, actor, action_type, intensity, timestamp }
const regimeAlerts = [];      // History of regime detections
const MAX_ALERTS = 100;

let ecosystem = null;
let bus = null;
let identity = null;
let intervals = [];

// ── Event ingestion (theater-agnostic) ──

/**
 * Record an actor event from any theater.
 * @param {string} theater - Theater name (e.g., 'bab-el-mandeb', 'ice-italy')
 * @param {object} data - { actor, action_type, intensity, timestamp }
 */
function recordEvent(theater, data) {
    const event = Object.freeze({
        theater,
        actor: data.actor,
        action_type: data.action_type || 'unknown',
        intensity: data.intensity || 1,
        timestamp: data.timestamp || Date.now()
    });

    events.push(event);
    while (events.length > MAX_EVENTS) {
        events.shift();
    }
}

// ── Co-occurrence matrix ──

/**
 * Compute co-occurrence matrix: how often actors appear within the same time window.
 * @param {string} [theater] - Optional theater filter
 * @param {number} [windowMs] - Time window for co-occurrence
 * @returns {object} { matrix: { actorA: { actorB: count } }, actors: string[] }
 */
function getCoOccurrenceMatrix(theater = null, windowMs = CO_OCCURRENCE_WINDOW_MS) {
    const now = Date.now();
    const cutoff = now - windowMs;

    const filtered = theater
        ? events.filter(e => e.theater === theater && e.timestamp >= cutoff)
        : events.filter(e => e.timestamp >= cutoff);

    // Get unique actors
    const actorSet = new Set(filtered.map(e => e.actor));
    const actors = [...actorSet].sort();
    const matrix = {};

    for (const a of actors) {
        matrix[a] = {};
        for (const b of actors) {
            matrix[a][b] = 0;
        }
    }

    // For each pair of events from different actors within proximity
    const PROXIMITY_MS = 2 * 60 * 60 * 1000; // 2 hours
    for (let i = 0; i < filtered.length; i++) {
        for (let j = i + 1; j < filtered.length; j++) {
            const a = filtered[i];
            const b = filtered[j];
            if (a.actor === b.actor) continue;
            if (Math.abs(a.timestamp - b.timestamp) <= PROXIMITY_MS) {
                matrix[a.actor][b.actor]++;
                matrix[b.actor][a.actor]++;
            }
        }
    }

    return { matrix, actors };
}

// ── Synchronization detection ──

/**
 * Detect if multiple actors are simultaneously elevated.
 * @param {string} [theater] - Optional theater filter
 * @returns {object} { synchronized: boolean, actors: object[], count: number, severity: string }
 */
function detectSynchronization(theater = null) {
    const now = Date.now();
    const windowCutoff = now - SYNC_WINDOW_MS;
    const baselineCutoff = now - (72 * 60 * 60 * 1000); // 72h baseline

    const filtered = theater
        ? events.filter(e => e.theater === theater)
        : events;

    // Get unique actors
    const actorSet = new Set(filtered.map(e => e.actor));
    const elevated = [];

    for (const actor of actorSet) {
        const recent = filtered.filter(e => e.actor === actor && e.timestamp >= windowCutoff).length;
        const baseline72h = filtered.filter(e => e.actor === actor && e.timestamp >= baselineCutoff).length;
        const dailyBaseline = baseline72h / 3;

        const ratio = dailyBaseline > 0 ? (recent / dailyBaseline) : (recent > 0 ? Infinity : 0);

        if (ratio > BASELINE_RATIO_THRESHOLD || ratio === Infinity) {
            elevated.push({
                actor,
                ratio: ratio === Infinity ? 'NEW' : ratio.toFixed(2),
                recent,
                baseline: dailyBaseline.toFixed(1)
            });
        }
    }

    const synchronized = elevated.length >= MIN_ACTORS_FOR_REGIME;
    let severity = 'none';
    if (elevated.length >= 4) severity = 'critical';
    else if (elevated.length >= 3) severity = 'high';
    else if (elevated.length >= 2) severity = 'elevated';
    else if (elevated.length >= 1) severity = 'watch';

    return {
        synchronized,
        actors: elevated,
        count: elevated.length,
        severity,
        timestamp: now,
        theater: theater || 'all'
    };
}

// ── Lag correlation ──

/**
 * Compute temporal lag between actor pairs.
 * Shows who tends to react to whom (who speaks first → who follows).
 * @param {string} actorA
 * @param {string} actorB
 * @param {string} [theater]
 * @returns {object} { avgLagMs, direction, sampleSize }
 */
function getLagCorrelation(actorA, actorB, theater = null) {
    const now = Date.now();
    const cutoff = now - (72 * 60 * 60 * 1000);

    const filtered = theater
        ? events.filter(e => e.theater === theater && e.timestamp >= cutoff)
        : events.filter(e => e.timestamp >= cutoff);

    const eventsA = filtered.filter(e => e.actor === actorA).sort((a, b) => a.timestamp - b.timestamp);
    const eventsB = filtered.filter(e => e.actor === actorB).sort((a, b) => a.timestamp - b.timestamp);

    if (eventsA.length === 0 || eventsB.length === 0) {
        return { avgLagMs: null, direction: 'no-data', sampleSize: 0 };
    }

    // For each event of A, find the nearest subsequent event of B (and vice versa)
    const lags = [];
    for (const ea of eventsA) {
        const nearest = eventsB.find(eb => eb.timestamp > ea.timestamp);
        if (nearest) {
            lags.push(nearest.timestamp - ea.timestamp);
        }
    }
    for (const eb of eventsB) {
        const nearest = eventsA.find(ea => ea.timestamp > eb.timestamp);
        if (nearest) {
            lags.push(-(nearest.timestamp - eb.timestamp)); // Negative = B leads
        }
    }

    if (lags.length === 0) {
        return { avgLagMs: null, direction: 'no-data', sampleSize: 0 };
    }

    const avgLag = lags.reduce((s, v) => s + v, 0) / lags.length;

    return {
        avgLagMs: Math.round(avgLag),
        direction: avgLag > 0 ? `${actorA} → ${actorB}` : `${actorB} → ${actorA}`,
        sampleSize: lags.length
    };
}

// ═══════════════════════════════════════════════════════════
// OSINT CORRELATION PATTERNS — formal queries
// No opinions. Only ratio, time, correlation.
// ═══════════════════════════════════════════════════════════

/**
 * Pattern 1 — Influence Synchronization
 * Two or more actors simultaneously above baseline within temporal proximity.
 * rolling(actor_A, 24h) / baseline_A > thresholdA
 * AND rolling(actor_B, 24h) / baseline_B > thresholdB
 * AND time_delta(last_A, last_B) < 6h
 *
 * @param {string} actorA
 * @param {string} actorB
 * @param {string} [theater]
 * @param {number} [thresholdA=1.6]
 * @param {number} [thresholdB=1.4]
 * @param {number} [maxDeltaMs=6h]
 * @returns {object} { detected, ratioA, ratioB, timeDeltaMs, lastA, lastB }
 */
function queryInfluenceSync(actorA, actorB, theater = null, thresholdA = 1.6, thresholdB = 1.4, maxDeltaMs = 6 * 3600000) {
    const now = Date.now();
    const windowMs = 24 * 3600000;
    const baselineMs = 72 * 3600000;

    const pool = theater ? events.filter(e => e.theater === theater) : events;

    const countA24 = pool.filter(e => e.actor === actorA && e.timestamp >= now - windowMs).length;
    const countB24 = pool.filter(e => e.actor === actorB && e.timestamp >= now - windowMs).length;
    const baseA = pool.filter(e => e.actor === actorA && e.timestamp >= now - baselineMs).length / 3;
    const baseB = pool.filter(e => e.actor === actorB && e.timestamp >= now - baselineMs).length / 3;

    const ratioA = baseA > 0 ? countA24 / baseA : (countA24 > 0 ? Infinity : 0);
    const ratioB = baseB > 0 ? countB24 / baseB : (countB24 > 0 ? Infinity : 0);

    const lastA = pool.filter(e => e.actor === actorA).sort((a, b) => b.timestamp - a.timestamp)[0];
    const lastB = pool.filter(e => e.actor === actorB).sort((a, b) => b.timestamp - a.timestamp)[0];

    const timeDelta = (lastA && lastB) ? Math.abs(lastA.timestamp - lastB.timestamp) : Infinity;

    const elevatedA = ratioA > thresholdA || ratioA === Infinity;
    const elevatedB = ratioB > thresholdB || ratioB === Infinity;
    const proximate = timeDelta <= maxDeltaMs;

    return {
        detected: elevatedA && elevatedB && proximate,
        ratioA: ratioA === Infinity ? 'NEW' : +ratioA.toFixed(2),
        ratioB: ratioB === Infinity ? 'NEW' : +ratioB.toFixed(2),
        timeDeltaMs: timeDelta === Infinity ? null : timeDelta,
        lastA: lastA ? lastA.timestamp : null,
        lastB: lastB ? lastB.timestamp : null,
        actorA,
        actorB
    };
}

/**
 * Pattern 2 — Narrative Shielding
 * Law enforcement action frequency spikes while public dissent also spikes.
 * Indicates: repression responds to (or preempts) dissent.
 *
 * frequency(enforcement_actions, 24h) > baseline * thresholdEnf
 * AND frequency(dissent_events, 24h) > baseline * thresholdDissent
 *
 * @param {string[]} enforcementActors - Actors representing enforcement (e.g., ['ice', 'police_it'])
 * @param {string[]} dissentActors - Actors representing dissent (e.g., ['civil_society', 'media'])
 * @param {string} [theater]
 * @param {number} [thresholdEnf=1.8]
 * @param {number} [thresholdDissent=1.3]
 * @returns {object} { detected, enforcementRatio, dissentRatio, enforcementCount, dissentCount }
 */
function queryNarrativeShielding(enforcementActors, dissentActors, theater = null, thresholdEnf = 1.8, thresholdDissent = 1.3) {
    const now = Date.now();
    const windowMs = 24 * 3600000;
    const baselineMs = 72 * 3600000;

    const pool = theater ? events.filter(e => e.theater === theater) : events;

    const enfSet = new Set(enforcementActors);
    const disSet = new Set(dissentActors);

    const enf24 = pool.filter(e => enfSet.has(e.actor) && e.timestamp >= now - windowMs).length;
    const dis24 = pool.filter(e => disSet.has(e.actor) && e.timestamp >= now - windowMs).length;
    const enfBase = pool.filter(e => enfSet.has(e.actor) && e.timestamp >= now - baselineMs).length / 3;
    const disBase = pool.filter(e => disSet.has(e.actor) && e.timestamp >= now - baselineMs).length / 3;

    const enfRatio = enfBase > 0 ? enf24 / enfBase : (enf24 > 0 ? Infinity : 0);
    const disRatio = disBase > 0 ? dis24 / disBase : (dis24 > 0 ? Infinity : 0);

    const enfElevated = enfRatio > thresholdEnf || enfRatio === Infinity;
    const disElevated = disRatio > thresholdDissent || disRatio === Infinity;

    return {
        detected: enfElevated && disElevated,
        enforcementRatio: enfRatio === Infinity ? 'NEW' : +enfRatio.toFixed(2),
        dissentRatio: disRatio === Infinity ? 'NEW' : +disRatio.toFixed(2),
        enforcementCount: enf24,
        dissentCount: dis24,
        enforcementActors,
        dissentActors
    };
}

/**
 * Pattern 3 — Institutional Alignment
 * Rolling frequency of government statements correlates with foreign actor presence.
 * Uses Pearson-like correlation on hourly bins over 48h.
 *
 * rolling(government_statement, 48h) correlates_with rolling(foreign_actor_presence, 48h)
 * correlation_coefficient > threshold
 *
 * @param {string} actorA - e.g., 'gov_it'
 * @param {string} actorB - e.g., 'ice'
 * @param {string} [theater]
 * @param {number} [threshold=0.7]
 * @returns {object} { detected, coefficient, binsA, binsB }
 */
function queryInstitutionalAlignment(actorA, actorB, theater = null, threshold = 0.7) {
    const now = Date.now();
    const windowMs = 48 * 3600000;
    const binSize = 3600000; // 1 hour
    const binCount = 48;

    const pool = theater ? events.filter(e => e.theater === theater) : events;

    const binsA = new Array(binCount).fill(0);
    const binsB = new Array(binCount).fill(0);

    for (const e of pool) {
        const age = now - e.timestamp;
        if (age > windowMs || age < 0) continue;
        const bin = Math.min(binCount - 1, Math.floor(age / binSize));
        if (e.actor === actorA) binsA[bin]++;
        if (e.actor === actorB) binsB[bin]++;
    }

    // Pearson correlation coefficient
    const n = binCount;
    let sumA = 0, sumB = 0, sumAB = 0, sumA2 = 0, sumB2 = 0;
    for (let i = 0; i < n; i++) {
        sumA += binsA[i]; sumB += binsB[i];
        sumAB += binsA[i] * binsB[i];
        sumA2 += binsA[i] * binsA[i];
        sumB2 += binsB[i] * binsB[i];
    }

    const numerator = n * sumAB - sumA * sumB;
    const denominator = Math.sqrt((n * sumA2 - sumA * sumA) * (n * sumB2 - sumB * sumB));

    const coefficient = denominator === 0 ? 0 : numerator / denominator;

    return {
        detected: Math.abs(coefficient) >= threshold,
        coefficient: +coefficient.toFixed(4),
        binsA,
        binsB,
        actorA,
        actorB,
        threshold
    };
}

// ── Regime shift check ──

/**
 * Check for regime shift and emit alert if detected.
 * Called periodically and after each ingestion.
 */
function checkRegimeShift() {
    // Check each known theater
    const theaters = new Set(events.map(e => e.theater));

    for (const theater of theaters) {
        const sync = detectSynchronization(theater);

        if (sync.synchronized) {
            const alert = Object.freeze({
                id: crypto.randomUUID(),
                timestamp: Date.now(),
                theater,
                severity: sync.severity,
                elevatedActors: sync.actors,
                count: sync.count
            });

            regimeAlerts.push(alert);
            while (regimeAlerts.length > MAX_ALERTS) {
                regimeAlerts.shift();
            }

            if (bus) {
                bus.emit('correlation:regime-alert', {
                    theater,
                    severity: sync.severity,
                    actors: sync.actors.map(a => a.actor),
                    count: sync.count
                }, 'correlation-engine');
            }

            if (ecosystem) {
                ecosystem.emitEnvelope({
                    source: 'correlation-engine',
                    domain: 'analysis',
                    type: 'regime-alert',
                    payload: {
                        theater,
                        severity: sync.severity,
                        elevatedActors: sync.actors,
                        count: sync.count
                    },
                    meta: {
                        confidence: Math.min(0.95, 0.6 + sync.count * 0.1),
                        tags: ['correlation', 'regime-alert', theater, sync.severity]
                    },
                    priority: sync.severity === 'critical' ? 'critical' : 'high'
                });
            }

            if (identity) {
                identity.addEpoch({
                    type: 'regime-alert',
                    title: `REGIME ALERT [${sync.severity.toUpperCase()}] — ${theater}`,
                    content: alert,
                    source: 'correlation-engine',
                    tags: ['correlation', 'regime-alert', theater]
                });
            }

            console.warn(
                `%c[CORRELATION] %cREGIME ALERT %c[${sync.severity.toUpperCase()}] %c— ${theater}: ` +
                `${sync.count} actors elevated simultaneously.`,
                'color: #ff0084; font-weight: bold;',
                'color: #ff3344; font-weight: bold;',
                'color: #ffcc00;',
                'color: #6b7fa3;'
            );
        }
    }

    // Also check cross-theater (all theaters combined)
    if (theaters.size > 1) {
        const globalSync = detectSynchronization(null);
        if (globalSync.synchronized) {
            if (bus) {
                bus.emit('correlation:global-regime-alert', {
                    severity: globalSync.severity,
                    actors: globalSync.actors.map(a => a.actor),
                    count: globalSync.count
                }, 'correlation-engine');
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════
// MODULE INTERFACE
// ═══════════════════════════════════════════════════════════

const CorrelationEngine = {
    name: 'correlation-engine',
    version: '1.0.0',

    init(eco, b) {
        ecosystem = eco;
        bus = b;

        identity = eco.getModule('identity');
        if (!identity) {
            bus.once('ecosystem:module-registered', (event) => {
                if (event.payload.name === 'identity') {
                    identity = eco.getModule('identity');
                }
            });
        }

        // ── Listen to ANY theater's epoch-ingested events ──
        bus.on('*', (event) => {
            // Pattern: {theater}:epoch-ingested
            if (event.type.endsWith(':epoch-ingested') && event.payload) {
                const theater = event.type.split(':')[0];
                recordEvent(theater, event.payload);

                // Check regime shift after each ingestion
                checkRegimeShift();
            }
        });

        // ── Periodic regime check (every 5 minutes) ──
        intervals.push(setInterval(checkRegimeShift, 5 * 60 * 1000));

        // ── Periodic state update (every 60 seconds) ──
        intervals.push(setInterval(() => {
            if (!ecosystem) return;

            const theaters = [...new Set(events.map(e => e.theater))];
            const syncStatus = {};
            for (const t of theaters) {
                syncStatus[t] = detectSynchronization(t);
            }

            ecosystem.setState('correlation.theaters', theaters, { source: 'correlation-engine' });
            ecosystem.setState('correlation.syncStatus', syncStatus, { source: 'correlation-engine' });
            ecosystem.setState('correlation.eventCount', events.length, { source: 'correlation-engine' });
            ecosystem.setState('correlation.alertCount', regimeAlerts.length, { source: 'correlation-engine' });
        }, 60000));

        ecosystem.setState('correlation-engine.status', 'active', { source: 'correlation-engine' });

        if (identity) {
            identity.addEpoch({
                type: 'boot',
                title: 'Correlation Engine Initialized',
                content: { version: CorrelationEngine.version },
                source: 'correlation-engine',
                tags: ['boot', 'correlation']
            });
        }

        bus.emit('correlation-engine:ready', {
            version: CorrelationEngine.version,
            syncWindow: SYNC_WINDOW_MS,
            regimeThreshold: MIN_ACTORS_FOR_REGIME
        }, 'correlation-engine');

        console.log(
            '%c[CORRELATION] %cv' + CorrelationEngine.version +
            ' %c— Cross-actor correlation online. Regime detection active.',
            'color: #ff0084; font-weight: bold;',
            'color: #39ff14;',
            'color: #6b7fa3;'
        );
    },

    destroy() {
        intervals.forEach(id => clearInterval(id));
        intervals = [];
        events.length = 0;
        regimeAlerts.length = 0;

        if (ecosystem) {
            ecosystem.setState('correlation-engine.status', 'offline', { source: 'correlation-engine' });
        }
        if (bus) {
            bus.emit('correlation-engine:shutdown', {}, 'correlation-engine');
        }
    },

    // ═══════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════

    /** Get co-occurrence matrix */
    getCoOccurrence: getCoOccurrenceMatrix,

    /** Detect synchronization across actors */
    detectSync: detectSynchronization,

    /** Get lag correlation between two actors */
    getLag: getLagCorrelation,

    // ═══════════════════════════════════════
    // OSINT PATTERN QUERIES
    // ═══════════════════════════════════════

    /** Pattern 1: Influence Synchronization — two actors elevated + temporally proximate */
    queryInfluenceSync,

    /** Pattern 2: Narrative Shielding — enforcement spikes alongside dissent */
    queryNarrativeShielding,

    /** Pattern 3: Institutional Alignment — Pearson correlation on hourly bins */
    queryInstitutionalAlignment,

    /** Get regime alerts history */
    getAlerts(count = 20) {
        return regimeAlerts.slice(-count).reverse();
    },

    /** Get full correlation stats */
    getStats() {
        const theaters = [...new Set(events.map(e => e.theater))];
        const actors = [...new Set(events.map(e => e.actor))];

        return {
            totalEvents: events.length,
            theaters,
            actors,
            regimeAlerts: regimeAlerts.length,
            syncStatus: theaters.map(t => ({
                theater: t,
                ...detectSynchronization(t)
            }))
        };
    },

    /** Get events count */
    getEventCount() { return events.length; },

    /** Constants for configuration */
    SYNC_WINDOW_MS,
    BASELINE_RATIO_THRESHOLD,
    MIN_ACTORS_FOR_REGIME
};

export default CorrelationEngine;
