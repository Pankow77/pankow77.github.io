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

// ── Warmup Guard ──
// No correlation analysis fires until sufficient baseline exists.
// Spietato si'. Nevrotico no.
const MIN_BASELINE_EPOCHS = 12;                  // Minimum total events before analysis
const MIN_BASELINE_SPAN_MS = 24 * 60 * 60 * 1000; // Minimum time span of collected data (24h minimum, 72h ideal)
const IDEAL_BASELINE_SPAN_MS = 72 * 60 * 60 * 1000; // 72h — full confidence baseline

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

// ═══════════════════════════════════════════════════════════
// WARMUP GUARD — the system must breathe before it speaks
// ═══════════════════════════════════════════════════════════

/**
 * Check if sufficient baseline data exists for correlation analysis.
 * @param {string} [theater] - Optional theater filter
 * @returns {object} { ready, maturity, epochs, spanMs, reason }
 *   maturity: 0.0 = no data, 1.0 = fully warmed up
 */
function getWarmupStatus(theater = null) {
    const pool = theater ? events.filter(e => e.theater === theater) : events;
    const epochCount = pool.length;

    if (epochCount === 0) {
        return { ready: false, maturity: 0, epochs: 0, spanMs: 0, reason: 'no-data' };
    }

    const timestamps = pool.map(e => e.timestamp);
    const oldest = Math.min(...timestamps);
    const newest = Math.max(...timestamps);
    const spanMs = newest - oldest;

    // Both conditions must be met for ready=true
    const epochsOk = epochCount >= MIN_BASELINE_EPOCHS;
    const spanOk = spanMs >= MIN_BASELINE_SPAN_MS;

    // Maturity: 0.0 → 1.0 based on how close we are to ideal baseline
    const epochMaturity = Math.min(1, epochCount / (MIN_BASELINE_EPOCHS * 2));
    const spanMaturity = Math.min(1, spanMs / IDEAL_BASELINE_SPAN_MS);
    const maturity = +(epochMaturity * 0.4 + spanMaturity * 0.6).toFixed(3);

    let reason = null;
    if (!epochsOk && !spanOk) reason = `need ${MIN_BASELINE_EPOCHS - epochCount} more epochs + ${Math.round((MIN_BASELINE_SPAN_MS - spanMs) / 3600000)}h more span`;
    else if (!epochsOk) reason = `need ${MIN_BASELINE_EPOCHS - epochCount} more epochs`;
    else if (!spanOk) reason = `need ${Math.round((MIN_BASELINE_SPAN_MS - spanMs) / 3600000)}h more time span`;

    return {
        ready: epochsOk && spanOk,
        maturity,
        epochs: epochCount,
        spanMs,
        spanHours: +(spanMs / 3600000).toFixed(1),
        reason
    };
}

// ═══════════════════════════════════════════════════════════
// ACTOR COUPLING MATRIX — temporal sync + acceleration + slope
// Not just volume. The real signal is: who accelerates together.
// ═══════════════════════════════════════════════════════════

/**
 * Compute linear regression slope on hourly bins.
 * Returns events/hour trend direction.
 * @param {number[]} bins - Hourly event counts
 * @returns {number} slope (positive = accelerating, negative = decelerating)
 */
function linearSlope(bins) {
    const n = bins.length;
    if (n < 2) return 0;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let i = 0; i < n; i++) {
        sumX += i; sumY += bins[i];
        sumXY += i * bins[i]; sumX2 += i * i;
    }
    const denom = n * sumX2 - sumX * sumX;
    return denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
}

/**
 * Compute actor coupling between two actors.
 * Measures: temporal proximity, trend coherence, acceleration coherence.
 * If ICE rises but GOV_IT doesn't accelerate, it's noise.
 *
 * @param {string} actorA
 * @param {string} actorB
 * @param {string} [theater]
 * @returns {object} Full coupling analysis
 */
function computeActorCoupling(actorA, actorB, theater = null) {
    const now = Date.now();
    const windowMs = 48 * 3600000;
    const binSize = 3600000; // 1h bins
    const binCount = 48;

    const pool = theater ? events.filter(e => e.theater === theater) : events;

    // ── Temporal proximity (Δt between last events) ──
    const lastA = pool.filter(e => e.actor === actorA).sort((a, b) => b.timestamp - a.timestamp)[0];
    const lastB = pool.filter(e => e.actor === actorB).sort((a, b) => b.timestamp - a.timestamp)[0];
    const timeDeltaMs = (lastA && lastB) ? Math.abs(lastA.timestamp - lastB.timestamp) : Infinity;

    // ── Hourly bins for both actors (48h) ──
    const binsA = new Array(binCount).fill(0);
    const binsB = new Array(binCount).fill(0);
    for (const e of pool) {
        const age = now - e.timestamp;
        if (age > windowMs || age < 0) continue;
        const bin = Math.min(binCount - 1, Math.floor(age / binSize));
        if (e.actor === actorA) binsA[bin]++;
        if (e.actor === actorB) binsB[bin]++;
    }

    // ── Trend slope (linear regression over full 48h) ──
    // Bins are reverse-chronological (0 = most recent), reverse for slope calc
    const binsAchron = [...binsA].reverse();
    const binsBchron = [...binsB].reverse();
    const slopeA = +linearSlope(binsAchron).toFixed(4);
    const slopeB = +linearSlope(binsBchron).toFixed(4);

    // ── Slope coherence: are they trending in the same direction? ──
    const slopeCoherence = (slopeA > 0 && slopeB > 0) || (slopeA < 0 && slopeB < 0);
    const slopeProduct = +(slopeA * slopeB).toFixed(6); // Positive = same direction

    // ── Acceleration: slope of last 12h vs previous 12h ──
    const recent12A = binsAchron.slice(-12);
    const prev12A = binsAchron.slice(-24, -12);
    const recent12B = binsBchron.slice(-12);
    const prev12B = binsBchron.slice(-24, -12);
    const accelA = +(linearSlope(recent12A) - linearSlope(prev12A)).toFixed(4);
    const accelB = +(linearSlope(recent12B) - linearSlope(prev12B)).toFixed(4);
    const accelCoherence = (accelA > 0 && accelB > 0) || (accelA < 0 && accelB < 0);

    // ── Composite coupling score (0.0 → 1.0) ──
    // Weights: temporal proximity (0.3) + slope coherence (0.35) + acceleration coherence (0.35)
    const proximityScore = timeDeltaMs === Infinity ? 0 :
        Math.max(0, 1 - timeDeltaMs / (6 * 3600000)); // 1.0 at 0h, 0.0 at 6h+

    const slopeScore = slopeCoherence
        ? Math.min(1, Math.abs(slopeProduct) * 50) // Scale up small products
        : 0;

    const accelScore = accelCoherence
        ? Math.min(1, (Math.abs(accelA) + Math.abs(accelB)) * 20)
        : 0;

    const couplingScore = +(proximityScore * 0.3 + slopeScore * 0.35 + accelScore * 0.35).toFixed(3);

    return {
        actorA,
        actorB,
        timeDeltaMs: timeDeltaMs === Infinity ? null : timeDeltaMs,
        timeDeltaHours: timeDeltaMs === Infinity ? null : +(timeDeltaMs / 3600000).toFixed(2),
        slopeA,
        slopeB,
        slopeCoherence,
        slopeProduct,
        accelerationA: accelA,
        accelerationB: accelB,
        accelerationCoherence: accelCoherence,
        couplingScore,
        components: { proximity: +proximityScore.toFixed(3), slope: +slopeScore.toFixed(3), acceleration: +accelScore.toFixed(3) }
    };
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
 * Enhanced with coupling matrix and confidence scoring.
 *
 * No booleans. Only probability.
 *
 * @param {string} actorA
 * @param {string} actorB
 * @param {string} [theater]
 * @returns {object} { pattern, confidence, actors, window, ... }
 */
function queryInfluenceSync(actorA, actorB, theater = null) {
    const warmup = getWarmupStatus(theater);
    if (!warmup.ready) {
        return { pattern: 'influence-sync', confidence: 0, actors: [actorA, actorB], window: '24h', warmup: false, reason: warmup.reason };
    }

    const now = Date.now();
    const windowMs = 24 * 3600000;
    const baselineMs = 72 * 3600000;
    const pool = theater ? events.filter(e => e.theater === theater) : events;

    const countA24 = pool.filter(e => e.actor === actorA && e.timestamp >= now - windowMs).length;
    const countB24 = pool.filter(e => e.actor === actorB && e.timestamp >= now - windowMs).length;
    const baseA = pool.filter(e => e.actor === actorA && e.timestamp >= now - baselineMs).length / 3;
    const baseB = pool.filter(e => e.actor === actorB && e.timestamp >= now - baselineMs).length / 3;

    const ratioA = baseA > 0 ? countA24 / baseA : (countA24 > 0 ? 3.0 : 0);
    const ratioB = baseB > 0 ? countB24 / baseB : (countB24 > 0 ? 3.0 : 0);

    // Coupling matrix enrichment
    const coupling = computeActorCoupling(actorA, actorB, theater);

    // ── Confidence computation (multi-factor, no threshold) ──
    // Factor 1: Ratio elevation (0.25 weight) — how far above baseline
    const ratioScore = Math.min(1, ((Math.min(ratioA, 5) - 1) / 3 + (Math.min(ratioB, 5) - 1) / 3) / 2);

    // Factor 2: Temporal proximity (0.20 weight) — from coupling matrix
    const proximityScore = coupling.components.proximity;

    // Factor 3: Slope coherence (0.25 weight) — trending together
    const slopeScore = coupling.components.slope;

    // Factor 4: Acceleration coherence (0.20 weight) — accelerating together
    const accelScore = coupling.components.acceleration;

    // Factor 5: Data maturity penalty (0.10 weight) — less confidence with less data
    const maturityScore = warmup.maturity;

    const confidence = +(
        ratioScore * 0.25 +
        proximityScore * 0.20 +
        slopeScore * 0.25 +
        accelScore * 0.20 +
        maturityScore * 0.10
    ).toFixed(3);

    return {
        pattern: 'influence-sync',
        confidence,
        actors: [actorA, actorB],
        window: '24h',
        warmup: true,
        ratioA: +ratioA.toFixed(2),
        ratioB: +ratioB.toFixed(2),
        coupling: coupling.couplingScore,
        components: {
            ratio: +ratioScore.toFixed(3),
            proximity: proximityScore,
            slope: slopeScore,
            acceleration: accelScore,
            maturity: +maturityScore.toFixed(3)
        },
        meta: {
            slopeA: coupling.slopeA,
            slopeB: coupling.slopeB,
            slopeCoherence: coupling.slopeCoherence,
            accelA: coupling.accelerationA,
            accelB: coupling.accelerationB,
            timeDeltaHours: coupling.timeDeltaHours
        }
    };
}

/**
 * Pattern 2 — Narrative Shielding
 * Enforcement spikes alongside dissent. Repression responds to (or preempts) protest.
 * Enhanced with temporal lag analysis and confidence scoring.
 *
 * No booleans. Only probability.
 *
 * @param {string[]} enforcementActors - e.g., ['ice', 'police_it']
 * @param {string[]} dissentActors - e.g., ['civil_society', 'media']
 * @param {string} [theater]
 * @returns {object} { pattern, confidence, ... }
 */
function queryNarrativeShielding(enforcementActors, dissentActors, theater = null) {
    const warmup = getWarmupStatus(theater);
    if (!warmup.ready) {
        return { pattern: 'narrative-shielding', confidence: 0, actors: { enforcement: enforcementActors, dissent: dissentActors }, window: '24h', warmup: false, reason: warmup.reason };
    }

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

    const enfRatio = enfBase > 0 ? enf24 / enfBase : (enf24 > 0 ? 3.0 : 0);
    const disRatio = disBase > 0 ? dis24 / disBase : (dis24 > 0 ? 3.0 : 0);

    // ── Temporal lag: does enforcement follow dissent or precede it? ──
    const enfEvents = pool.filter(e => enfSet.has(e.actor) && e.timestamp >= now - windowMs).sort((a, b) => a.timestamp - b.timestamp);
    const disEvents = pool.filter(e => disSet.has(e.actor) && e.timestamp >= now - windowMs).sort((a, b) => a.timestamp - b.timestamp);

    let lagDirection = 'no-data';
    let avgLagMs = 0;
    const lags = [];
    for (const d of disEvents) {
        const following = enfEvents.find(e => e.timestamp > d.timestamp);
        if (following) lags.push(following.timestamp - d.timestamp);
    }
    for (const e of enfEvents) {
        const following = disEvents.find(d => d.timestamp > e.timestamp);
        if (following) lags.push(-(following.timestamp - e.timestamp));
    }
    if (lags.length > 0) {
        avgLagMs = lags.reduce((s, v) => s + v, 0) / lags.length;
        lagDirection = avgLagMs > 0 ? 'enforcement-follows-dissent' : 'enforcement-preempts-dissent';
    }

    // ── Confidence computation ──
    // Factor 1: Enforcement elevation (0.25)
    const enfScore = Math.min(1, (Math.min(enfRatio, 5) - 1) / 2.5);

    // Factor 2: Dissent elevation (0.25)
    const disScore = Math.min(1, (Math.min(disRatio, 5) - 1) / 2.5);

    // Factor 3: Co-occurrence — both groups active simultaneously (0.25)
    const coActive = (enf24 > 0 && dis24 > 0) ? Math.min(1, Math.min(enf24, dis24) / Math.max(enf24, dis24)) : 0;

    // Factor 4: Temporal responsiveness — enforcement reacts within 6h of dissent (0.15)
    const lagScore = lags.length > 0 ? Math.max(0, 1 - Math.abs(avgLagMs) / (6 * 3600000)) : 0;

    // Factor 5: Data maturity (0.10)
    const maturityScore = warmup.maturity;

    const confidence = +(
        enfScore * 0.25 +
        disScore * 0.25 +
        coActive * 0.25 +
        lagScore * 0.15 +
        maturityScore * 0.10
    ).toFixed(3);

    return {
        pattern: 'narrative-shielding',
        confidence,
        actors: { enforcement: enforcementActors, dissent: dissentActors },
        window: '24h',
        warmup: true,
        enforcementRatio: +enfRatio.toFixed(2),
        dissentRatio: +disRatio.toFixed(2),
        enforcementCount: enf24,
        dissentCount: dis24,
        lagDirection,
        avgLagHours: lags.length > 0 ? +(avgLagMs / 3600000).toFixed(2) : null,
        components: {
            enforcement: +enfScore.toFixed(3),
            dissent: +disScore.toFixed(3),
            coActivity: +coActive.toFixed(3),
            temporalLag: +lagScore.toFixed(3),
            maturity: +maturityScore.toFixed(3)
        }
    };
}

/**
 * Pattern 3 — Institutional Alignment
 * Rolling frequency correlation via Pearson + coupling matrix.
 * Enhanced with slope coherence and confidence scoring.
 *
 * No booleans. Only probability.
 *
 * @param {string} actorA - e.g., 'gov_it'
 * @param {string} actorB - e.g., 'ice'
 * @param {string} [theater]
 * @returns {object} { pattern, confidence, coefficient, ... }
 */
function queryInstitutionalAlignment(actorA, actorB, theater = null) {
    const warmup = getWarmupStatus(theater);
    if (!warmup.ready) {
        return { pattern: 'institutional-alignment', confidence: 0, actors: [actorA, actorB], window: '48h', warmup: false, reason: warmup.reason };
    }

    const now = Date.now();
    const windowMs = 48 * 3600000;
    const binSize = 3600000;
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

    // Coupling matrix enrichment
    const coupling = computeActorCoupling(actorA, actorB, theater);

    // ── Confidence computation ──
    // Factor 1: Pearson |r| strength (0.35) — the core statistical signal
    const pearsonScore = Math.min(1, Math.abs(coefficient) / 0.9);

    // Factor 2: Slope coherence from coupling (0.25) — trending together
    const slopeScore = coupling.components.slope;

    // Factor 3: Data density — enough bins have data (0.15)
    const activeBinsA = binsA.filter(v => v > 0).length;
    const activeBinsB = binsB.filter(v => v > 0).length;
    const densityScore = Math.min(1, (activeBinsA + activeBinsB) / (binCount * 0.5));

    // Factor 4: Coupling score composite (0.15)
    const couplingScore = coupling.couplingScore;

    // Factor 5: Data maturity (0.10)
    const maturityScore = warmup.maturity;

    const confidence = +(
        pearsonScore * 0.35 +
        slopeScore * 0.25 +
        densityScore * 0.15 +
        couplingScore * 0.15 +
        maturityScore * 0.10
    ).toFixed(3);

    return {
        pattern: 'institutional-alignment',
        confidence,
        actors: [actorA, actorB],
        window: '48h',
        warmup: true,
        coefficient: +coefficient.toFixed(4),
        coupling: coupling.couplingScore,
        components: {
            pearson: +pearsonScore.toFixed(3),
            slope: slopeScore,
            density: +densityScore.toFixed(3),
            coupling: couplingScore,
            maturity: +maturityScore.toFixed(3)
        },
        meta: {
            slopeA: coupling.slopeA,
            slopeB: coupling.slopeB,
            slopeCoherence: coupling.slopeCoherence,
            activeBinsA,
            activeBinsB,
            timeDeltaHours: coupling.timeDeltaHours
        }
    };
}

// ── Regime shift check ──

/**
 * Check for regime shift and emit alert if detected.
 * Called periodically and after each ingestion.
 */
function checkRegimeShift() {
    // ── WARMUP GUARD: no correlation until baseline exists ──
    const globalWarmup = getWarmupStatus();
    if (!globalWarmup.ready) {
        if (bus && events.length > 0 && events.length % 3 === 0) {
            bus.emit('correlation:warmup-progress', {
                maturity: globalWarmup.maturity,
                epochs: globalWarmup.epochs,
                spanHours: globalWarmup.spanHours,
                reason: globalWarmup.reason
            }, 'correlation-engine');
        }
        return; // Silence. Not yet.
    }

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
    version: '2.0.0',

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

    /** Actor Coupling Matrix — temporal sync, slope, acceleration */
    getCoupling: computeActorCoupling,

    /** Warmup status — is the system ready to speak? */
    getWarmupStatus,

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
