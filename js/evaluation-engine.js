/**
 * evaluation-engine.js — Hybrid Syndicate Cross-Module Evaluator
 * ═══════════════════════════════════════════════════════════
 * Evolutionary fuel. Compares predictions with reality,
 * signals with outcomes, analysis with observed mutations.
 *
 * The evaluation engine does not observe raw data.
 * It observes the *gap* between what was predicted and what happened.
 * That gap is the only signal that matters for system evolution.
 *
 * Scoring methods:
 *   - Blind scoring:  envelope vs envelope, no context
 *   - RT0 (Real-Time Zero): prediction → first matching reality
 *   - Temporal delta:  how long between prediction and confirmation
 *
 * Browser-native ES Module.
 * Depends on circulation.js for indexed envelope queries.
 * ═══════════════════════════════════════════════════════════
 */

import { isEnvelope } from './envelope.js';

// ── Evaluation result store ──
const evaluations = [];
const MAX_EVALUATIONS = 200;

// ── Pending predictions awaiting reality ──
const pendingPredictions = new Map();  // id → { envelope, registeredAt }
const PREDICTION_TTL = 4 * 60 * 60 * 1000; // 4 hours — geopolitical signals need time to confirm

let bus = null;
let circulation = null;
let eco = null;
let cleanupInterval = null;

// ── Scoring functions ──

/**
 * Blind score: compare two envelopes purely on payload overlap.
 * Returns a score between 0 (no match) and 1 (perfect alignment).
 */
function blindScore(prediction, reality) {
    if (!prediction.payload || !reality.payload) return 0;

    const predKeys = Object.keys(prediction.payload);
    const realKeys = Object.keys(reality.payload);

    if (predKeys.length === 0 || realKeys.length === 0) return 0;

    const sharedKeys = predKeys.filter(k => realKeys.includes(k));
    if (sharedKeys.length === 0) return 0;

    let matchScore = 0;
    for (const key of sharedKeys) {
        const pVal = prediction.payload[key];
        const rVal = reality.payload[key];

        if (pVal === rVal) {
            // Exact match
            matchScore += 1;
        } else if (typeof pVal === 'number' && typeof rVal === 'number') {
            // Numeric proximity: 1 - normalized difference
            const max = Math.max(Math.abs(pVal), Math.abs(rVal), 1);
            matchScore += 1 - Math.min(Math.abs(pVal - rVal) / max, 1);
        } else if (typeof pVal === 'string' && typeof rVal === 'string') {
            // String: exact match only
            matchScore += pVal === rVal ? 1 : 0;
        } else if (typeof pVal === 'boolean' && typeof rVal === 'boolean') {
            matchScore += pVal === rVal ? 1 : 0;
        }
        // Other types: no score contribution
    }

    // Key coverage factor: how many of the real keys were predicted?
    const coverageFactor = sharedKeys.length / Math.max(predKeys.length, realKeys.length);

    return (matchScore / sharedKeys.length) * coverageFactor;
}

/**
 * Create an evaluation record.
 */
function createEvaluation(prediction, reality, score, method) {
    const evaluation = Object.freeze({
        id:              crypto.randomUUID(),
        ts:              Date.now(),
        method,
        score,
        predictionId:    prediction.id,
        realityId:       reality ? reality.id : null,
        predictionSource: prediction.source,
        realitySource:   reality ? reality.source : null,
        domain:          prediction.domain,
        type:            prediction.type,
        temporalDelta:   reality ? reality.ts - prediction.ts : null,
        prediction: {
            confidence: prediction.meta ? prediction.meta.confidence : null,
            tags:       prediction.meta ? prediction.meta.tags : []
        }
    });

    evaluations.push(evaluation);
    if (evaluations.length > MAX_EVALUATIONS) {
        evaluations.shift();
    }

    return evaluation;
}

/**
 * Clean up expired pending predictions.
 */
function cleanupPending() {
    const now = Date.now();
    for (const [id, entry] of pendingPredictions) {
        if (now - entry.registeredAt > PREDICTION_TTL) {
            // Expired prediction — evaluate as unconfirmed
            const evaluation = createEvaluation(entry.envelope, null, 0, 'expired');

            if (bus) {
                bus.emit('evaluation:expired', evaluation, 'evaluation-engine');
            }

            pendingPredictions.delete(id);
        }
    }
}

// ── Module definition ──

const EvaluationEngine = {
    name: 'evaluation-engine',
    version: '1.0.0',

    init(e, b) {
        eco = e;
        bus = b;
        circulation = eco.getModule('circulation');

        // ── Listen for predictions entering the bloodstream ──
        bus.on('envelope:prediction', (event) => {
            const envelope = event.payload;
            if (!isEnvelope(envelope)) return;

            pendingPredictions.set(envelope.id, {
                envelope,
                registeredAt: Date.now()
            });
        });

        // ── Listen for signals/analysis that could confirm predictions ──
        bus.on('envelope:signal', (event) => tryMatchReality(event.payload));
        bus.on('envelope:analysis', (event) => tryMatchReality(event.payload));
        bus.on('envelope:mutation', (event) => tryMatchReality(event.payload));
        bus.on('envelope:metric', (event) => tryMatchReality(event.payload));

        // ── Periodic cleanup of expired predictions ──
        cleanupInterval = setInterval(cleanupPending, 30000);

        eco.setState('evaluation-engine.status', 'active', { source: 'evaluation-engine' });

        console.log(
            '%c[EVALUATION] %cEngine online %c— watching predictions vs reality.',
            'color: #d4a017; font-weight: bold;',
            'color: #39ff14;',
            'color: #6b7fa3;'
        );
    },

    destroy() {
        if (cleanupInterval) {
            clearInterval(cleanupInterval);
            cleanupInterval = null;
        }
        evaluations.length = 0;
        pendingPredictions.clear();
    },

    // ═══════════════════════════════════════
    // MANUAL EVALUATION API
    // ═══════════════════════════════════════

    /**
     * Manually evaluate a prediction against a reality envelope.
     * @param {object} prediction - Prediction envelope
     * @param {object} reality    - Reality/outcome envelope
     * @returns {object} Evaluation result
     */
    evaluate(prediction, reality) {
        if (!isEnvelope(prediction) || !isEnvelope(reality)) {
            throw new Error('[EVALUATION] Both arguments must be valid Envelopes.');
        }

        const score = blindScore(prediction, reality);
        const evaluation = createEvaluation(prediction, reality, score, 'manual');

        if (bus) {
            bus.emit('evaluation:completed', evaluation, 'evaluation-engine');
        }

        return evaluation;
    },

    /**
     * Register a prediction for automatic RT0 matching.
     * Usually handled automatically via envelope:prediction events,
     * but can be called manually.
     */
    registerPrediction(envelope) {
        if (!isEnvelope(envelope)) {
            throw new Error('[EVALUATION] Argument must be a valid Envelope.');
        }
        pendingPredictions.set(envelope.id, {
            envelope,
            registeredAt: Date.now()
        });
    },

    // ═══════════════════════════════════════
    // QUERY INTERFACE
    // ═══════════════════════════════════════

    /**
     * Get recent evaluations.
     */
    getRecent(count = 20) {
        return evaluations.slice(-count).reverse();
    },

    /**
     * Get evaluations by source module.
     */
    getBySource(source) {
        return evaluations.filter(e => e.predictionSource === source).reverse();
    },

    /**
     * Get evaluations by domain.
     */
    getByDomain(domain) {
        return evaluations.filter(e => e.domain === domain).reverse();
    },

    /**
     * Get average accuracy score for a source.
     */
    getAccuracy(source) {
        const evals = evaluations.filter(e =>
            e.predictionSource === source && e.method !== 'expired'
        );
        if (evals.length === 0) return null;

        const sum = evals.reduce((acc, e) => acc + e.score, 0);
        return {
            source,
            accuracy: sum / evals.length,
            sampleSize: evals.length,
            expired: evaluations.filter(e =>
                e.predictionSource === source && e.method === 'expired'
            ).length
        };
    },

    /**
     * Get pending predictions count.
     */
    getPendingCount() {
        return pendingPredictions.size;
    },

    /**
     * Get full evaluation stats.
     */
    getStats() {
        const methods = {};
        const domains = {};
        let totalScore = 0;
        let scored = 0;

        for (const e of evaluations) {
            methods[e.method] = (methods[e.method] || 0) + 1;
            domains[e.domain] = (domains[e.domain] || 0) + 1;
            if (e.method !== 'expired') {
                totalScore += e.score;
                scored++;
            }
        }

        return {
            totalEvaluations: evaluations.length,
            pendingPredictions: pendingPredictions.size,
            averageScore: scored > 0 ? totalScore / scored : null,
            byMethod: methods,
            byDomain: domains
        };
    }
};

// ── Internal: try to match a reality envelope against pending predictions ──

function tryMatchReality(reality) {
    if (!isEnvelope(reality)) return;

    // Look for predictions with matching type in the same domain or related domains
    for (const [id, entry] of pendingPredictions) {
        const prediction = entry.envelope;

        // Match criteria: same type, or overlapping tags
        const typeMatch = prediction.type === reality.type;
        const tagOverlap = prediction.meta && reality.meta
            && prediction.meta.tags.some(t => reality.meta.tags.includes(t));

        if (typeMatch || tagOverlap) {
            const score = blindScore(prediction, reality);

            // Only create evaluation if there's meaningful overlap
            if (score > 0) {
                const evaluation = createEvaluation(prediction, reality, score, 'rt0');

                if (bus) {
                    bus.emit('evaluation:completed', evaluation, 'evaluation-engine');
                }

                // Remove from pending — this prediction has been evaluated
                pendingPredictions.delete(id);

                console.log(
                    '%c[EVALUATION] %cRT0 match %c— prediction %c' + id.slice(0, 8) +
                    '%c scored %c' + score.toFixed(3) +
                    '%c (Δ' + evaluation.temporalDelta + 'ms)',
                    'color: #d4a017; font-weight: bold;',
                    'color: #39ff14;',
                    'color: #6b7fa3;',
                    'color: #ff0084;',
                    'color: #6b7fa3;',
                    'color: #00d4ff; font-weight: bold;',
                    'color: #6b7fa3;'
                );

                break;  // One reality → one prediction (first match wins)
            }
        }
    }
}

export default EvaluationEngine;
