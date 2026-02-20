/**
 * deliberation-engine.js — Multi-Core Cognitive Deliberation System
 * ═══════════════════════════════════════════════════════════════════
 * Hybrid Syndicate / Ethic Software Foundation
 *
 * 16 deterministic cores with parametric personalities.
 * Each core receives events (epochs + correlations),
 * emits structured POSITIONS (not opinions),
 * and the engine aggregates into a COGNITIVE STATE VECTOR.
 *
 * This is not simulation. This is computation.
 *
 * Architecture:
 *   Event → Route to relevant cores → Core Signatures
 *   Core Signatures → Weighted aggregation → Cognitive State Vector
 *   Cognitive State Vector → Bus emission → UI / downstream consumers
 *
 * ═══════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════
// POSITION VOCABULARY — the language cores speak
// ═══════════════════════════════════════════════════════════════

const POSITIONS = {
    ESCALATION:         'escalation-detected',
    DE_ESCALATION:      'de-escalation-detected',
    STRUCTURAL_RISK:    'structural-risk-increase',
    STRUCTURAL_RELIEF:  'structural-risk-decrease',
    PATTERN_REPEAT:     'pattern-repeat',
    ANOMALY:            'anomaly-detected',
    NARRATIVE_SHIFT:    'narrative-shift',
    POWER_CONSOLIDATION:'power-consolidation',
    RESISTANCE:         'resistance-emerging',
    STATUS_QUO:         'status-quo',
    INSUFFICIENT_DATA:  'insufficient-data',
};

// ═══════════════════════════════════════════════════════════════
// DOMAIN RISK DIMENSIONS
// ═══════════════════════════════════════════════════════════════

const RISK_DIMENSIONS = ['military', 'political', 'social'];

// Position → risk contribution per dimension [military, political, social]
const POSITION_RISK_MAP = {
    [POSITIONS.ESCALATION]:         [0.8, 0.6, 0.5],
    [POSITIONS.DE_ESCALATION]:      [-0.3, -0.2, -0.1],
    [POSITIONS.STRUCTURAL_RISK]:    [0.4, 0.8, 0.6],
    [POSITIONS.STRUCTURAL_RELIEF]:  [-0.2, -0.5, -0.3],
    [POSITIONS.PATTERN_REPEAT]:     [0.5, 0.5, 0.4],
    [POSITIONS.ANOMALY]:            [0.3, 0.4, 0.3],
    [POSITIONS.NARRATIVE_SHIFT]:    [0.1, 0.5, 0.7],
    [POSITIONS.POWER_CONSOLIDATION]:[0.6, 0.9, 0.5],
    [POSITIONS.RESISTANCE]:         [0.2, 0.3, 0.8],
    [POSITIONS.STATUS_QUO]:         [0.0, 0.0, 0.0],
    [POSITIONS.INSUFFICIENT_DATA]:  [0.0, 0.0, 0.0],
};

// ═══════════════════════════════════════════════════════════════
// 16 CORE PARAMETER MATRICES — personality as computation
// ═══════════════════════════════════════════════════════════════
//
// Each core has:
//   domainWeights  — relevance per theater domain (what it notices)
//   sensitivity    — what event features it weights (how it perceives)
//   positionBias   — baseline tendency (what it looks for)
//   confidenceScale — calibration (how certain it tends to be)
//   deliberationWeight — static weight in final vote
//
// ═══════════════════════════════════════════════════════════════

const CORE_PARAMS = {
    PANKOW_77C: {
        domain: 'Command',
        domainWeights: { military: 0.7, sovereignty: 0.8, civil_rights: 0.6 },
        sensitivity: { intensity: 0.3, frequency: 0.3, correlation: 0.4 },
        positionBias: {
            [POSITIONS.STRUCTURAL_RISK]: 0.25,
            [POSITIONS.ANOMALY]: 0.25,
            [POSITIONS.PATTERN_REPEAT]: 0.20,
            [POSITIONS.ESCALATION]: 0.15,
            [POSITIONS.STATUS_QUO]: 0.15,
        },
        confidenceScale: 0.90,
        deliberationWeight: 1.5, // Operator-derived core carries extra weight
    },

    ORACLE_CORE: {
        domain: 'Climate',
        domainWeights: { military: 0.8, sovereignty: 0.6, civil_rights: 0.4 },
        sensitivity: { intensity: 0.2, frequency: 0.5, correlation: 0.3 },
        positionBias: {
            [POSITIONS.ESCALATION]: 0.30,
            [POSITIONS.PATTERN_REPEAT]: 0.30,
            [POSITIONS.STRUCTURAL_RISK]: 0.20,
            [POSITIONS.ANOMALY]: 0.20,
        },
        confidenceScale: 0.85,
        deliberationWeight: 1.2,
    },

    GHOST_RUNNER: {
        domain: 'Technology',
        domainWeights: { military: 0.5, sovereignty: 0.5, civil_rights: 0.3 },
        sensitivity: { intensity: 0.2, frequency: 0.3, correlation: 0.5 },
        positionBias: {
            [POSITIONS.STATUS_QUO]: 0.30,
            [POSITIONS.ANOMALY]: 0.30,
            [POSITIONS.STRUCTURAL_RISK]: 0.20,
            [POSITIONS.ESCALATION]: 0.20,
        },
        confidenceScale: 0.80,
        deliberationWeight: 0.8,
    },

    ABYSSAL_THINKER: {
        domain: 'Philosophy',
        domainWeights: { military: 0.4, sovereignty: 0.7, civil_rights: 0.8 },
        sensitivity: { intensity: 0.4, frequency: 0.2, correlation: 0.4 },
        positionBias: {
            [POSITIONS.STRUCTURAL_RISK]: 0.35,
            [POSITIONS.PATTERN_REPEAT]: 0.25,
            [POSITIONS.POWER_CONSOLIDATION]: 0.20,
            [POSITIONS.ANOMALY]: 0.20,
        },
        confidenceScale: 0.75,
        deliberationWeight: 1.0,
    },

    VOID_PULSE: {
        domain: 'Forecasting',
        domainWeights: { military: 0.7, sovereignty: 0.7, civil_rights: 0.5 },
        sensitivity: { intensity: 0.2, frequency: 0.6, correlation: 0.2 },
        positionBias: {
            [POSITIONS.ESCALATION]: 0.35,
            [POSITIONS.ANOMALY]: 0.25,
            [POSITIONS.PATTERN_REPEAT]: 0.25,
            [POSITIONS.DE_ESCALATION]: 0.15,
        },
        confidenceScale: 0.70, // Forecasters are less certain by nature
        deliberationWeight: 1.1,
    },

    NARRATIVE_ENGINE: {
        domain: 'Social',
        domainWeights: { military: 0.3, sovereignty: 0.6, civil_rights: 0.9 },
        sensitivity: { intensity: 0.3, frequency: 0.3, correlation: 0.4 },
        positionBias: {
            [POSITIONS.NARRATIVE_SHIFT]: 0.35,
            [POSITIONS.POWER_CONSOLIDATION]: 0.25,
            [POSITIONS.RESISTANCE]: 0.20,
            [POSITIONS.STRUCTURAL_RISK]: 0.20,
        },
        confidenceScale: 0.75,
        deliberationWeight: 1.0,
    },

    MARXIAN_CORE: {
        domain: 'Geopolitics',
        domainWeights: { military: 0.6, sovereignty: 0.9, civil_rights: 0.7 },
        sensitivity: { intensity: 0.3, frequency: 0.3, correlation: 0.4 },
        positionBias: {
            [POSITIONS.POWER_CONSOLIDATION]: 0.35,
            [POSITIONS.STRUCTURAL_RISK]: 0.30,
            [POSITIONS.RESISTANCE]: 0.20,
            [POSITIONS.ESCALATION]: 0.15,
        },
        confidenceScale: 0.80,
        deliberationWeight: 1.1,
    },

    CODE_ENCODER: {
        domain: 'Economics',
        domainWeights: { military: 0.5, sovereignty: 0.5, civil_rights: 0.3 },
        sensitivity: { intensity: 0.2, frequency: 0.4, correlation: 0.4 },
        positionBias: {
            [POSITIONS.STRUCTURAL_RISK]: 0.30,
            [POSITIONS.STATUS_QUO]: 0.25,
            [POSITIONS.ESCALATION]: 0.25,
            [POSITIONS.ANOMALY]: 0.20,
        },
        confidenceScale: 0.80,
        deliberationWeight: 0.9,
    },

    AFFECTIVE_CORE: {
        domain: 'Epistemology',
        domainWeights: { military: 0.3, sovereignty: 0.5, civil_rights: 0.9 },
        sensitivity: { intensity: 0.6, frequency: 0.1, correlation: 0.3 },
        positionBias: {
            [POSITIONS.ESCALATION]: 0.25,
            [POSITIONS.RESISTANCE]: 0.25,
            [POSITIONS.NARRATIVE_SHIFT]: 0.25,
            [POSITIONS.STRUCTURAL_RISK]: 0.25,
        },
        confidenceScale: 0.65, // Emotional weight is valid but less precise
        deliberationWeight: 0.8,
    },

    SYNTH_02: {
        domain: 'Integration',
        domainWeights: { military: 0.6, sovereignty: 0.6, civil_rights: 0.6 },
        sensitivity: { intensity: 0.2, frequency: 0.3, correlation: 0.5 },
        positionBias: {
            [POSITIONS.PATTERN_REPEAT]: 0.30,
            [POSITIONS.STRUCTURAL_RISK]: 0.25,
            [POSITIONS.STATUS_QUO]: 0.25,
            [POSITIONS.ANOMALY]: 0.20,
        },
        confidenceScale: 0.80,
        deliberationWeight: 1.0,
    },

    SENTINEL: {
        domain: 'Defense',
        domainWeights: { military: 0.9, sovereignty: 0.7, civil_rights: 0.4 },
        sensitivity: { intensity: 0.5, frequency: 0.3, correlation: 0.2 },
        positionBias: {
            [POSITIONS.ESCALATION]: 0.40,
            [POSITIONS.STRUCTURAL_RISK]: 0.25,
            [POSITIONS.ANOMALY]: 0.20,
            [POSITIONS.STATUS_QUO]: 0.15,
        },
        confidenceScale: 0.85,
        deliberationWeight: 1.2,
    },

    CHRONO_WEAVER: {
        domain: 'History',
        domainWeights: { military: 0.6, sovereignty: 0.7, civil_rights: 0.6 },
        sensitivity: { intensity: 0.2, frequency: 0.3, correlation: 0.5 },
        positionBias: {
            [POSITIONS.PATTERN_REPEAT]: 0.45,
            [POSITIONS.STRUCTURAL_RISK]: 0.25,
            [POSITIONS.ANOMALY]: 0.20,
            [POSITIONS.STATUS_QUO]: 0.10,
        },
        confidenceScale: 0.75,
        deliberationWeight: 1.0,
    },

    DIALECTIC_NODE: {
        domain: 'Logic',
        domainWeights: { military: 0.5, sovereignty: 0.5, civil_rights: 0.5 },
        sensitivity: { intensity: 0.1, frequency: 0.4, correlation: 0.5 },
        positionBias: {
            [POSITIONS.ANOMALY]: 0.35,
            [POSITIONS.STRUCTURAL_RISK]: 0.25,
            [POSITIONS.STATUS_QUO]: 0.25,
            [POSITIONS.PATTERN_REPEAT]: 0.15,
        },
        confidenceScale: 0.85,
        deliberationWeight: 1.0,
    },

    SIGNAL_HUNTER: {
        domain: 'Recon',
        domainWeights: { military: 0.7, sovereignty: 0.6, civil_rights: 0.5 },
        sensitivity: { intensity: 0.3, frequency: 0.5, correlation: 0.2 },
        positionBias: {
            [POSITIONS.ANOMALY]: 0.35,
            [POSITIONS.ESCALATION]: 0.25,
            [POSITIONS.PATTERN_REPEAT]: 0.20,
            [POSITIONS.NARRATIVE_SHIFT]: 0.20,
        },
        confidenceScale: 0.75,
        deliberationWeight: 1.0,
    },

    ETHIC_COMPILER: {
        domain: 'Ethics',
        domainWeights: { military: 0.4, sovereignty: 0.6, civil_rights: 1.0 },
        sensitivity: { intensity: 0.4, frequency: 0.2, correlation: 0.4 },
        positionBias: {
            [POSITIONS.STRUCTURAL_RISK]: 0.30,
            [POSITIONS.RESISTANCE]: 0.25,
            [POSITIONS.POWER_CONSOLIDATION]: 0.25,
            [POSITIONS.ANOMALY]: 0.20,
        },
        confidenceScale: 0.80,
        deliberationWeight: 1.1,
    },

    BRIDGE_KEEPER: {
        domain: 'Synthesis',
        domainWeights: { military: 0.6, sovereignty: 0.7, civil_rights: 0.7 },
        sensitivity: { intensity: 0.2, frequency: 0.3, correlation: 0.5 },
        positionBias: {
            [POSITIONS.STRUCTURAL_RISK]: 0.30,
            [POSITIONS.PATTERN_REPEAT]: 0.25,
            [POSITIONS.ANOMALY]: 0.25,
            [POSITIONS.NARRATIVE_SHIFT]: 0.20,
        },
        confidenceScale: 0.80,
        deliberationWeight: 1.2,
    },
};

// ═══════════════════════════════════════════════════════════════
// CORE COMPUTATION — pure function, parametric personality
// ═══════════════════════════════════════════════════════════════

/**
 * Compute a single core's position on an event.
 * @param {string} coreId - Core identifier
 * @param {object} eventData - The epoch or correlation data
 * @param {object} context - Theater context (frequencies, slopes, recent history)
 * @returns {object} Core Signature
 */
function computeCorePosition(coreId, eventData, context) {
    const params = CORE_PARAMS[coreId];
    if (!params) return null;

    const { intensity = 2, action_type = 'statement', actor = 'unknown' } = eventData;
    const { frequencySlope = 0, correlationStrength = 0, epochCount = 0, theaterDomains = [] } = context;

    // Domain relevance — how much this core cares about this theater
    let domainRelevance = 0;
    for (const domain of theaterDomains) {
        domainRelevance = Math.max(domainRelevance, params.domainWeights[domain] || 0.3);
    }

    // Skip if core has very low domain relevance
    if (domainRelevance < 0.3) {
        return {
            core: coreId,
            domain: params.domain,
            position: POSITIONS.INSUFFICIENT_DATA,
            confidence: 0.1,
            weight: params.deliberationWeight * domainRelevance,
            tags: [],
            timestamp: Date.now()
        };
    }

    // ── Compute input features ──
    // Intensity signal: high intensity = higher escalation scores
    const intensitySignal = (intensity - 1) / 4; // Normalize to 0-1

    // Frequency signal: positive slope = acceleration
    const frequencySignal = Math.min(1, Math.max(0, frequencySlope / 3));

    // Correlation signal: high correlation = pattern detection
    const correlationSignal = Math.min(1, Math.max(0, correlationStrength));

    // ── Weighted input perception ──
    const perception =
        params.sensitivity.intensity * intensitySignal +
        params.sensitivity.frequency * frequencySignal +
        params.sensitivity.correlation * correlationSignal;

    // ── Score each position ──
    const scores = {};
    for (const [position, bias] of Object.entries(params.positionBias)) {
        let score = bias;

        // Modulate by perception
        if (position === POSITIONS.ESCALATION || position === POSITIONS.STRUCTURAL_RISK) {
            score += perception * 0.4;
        }
        if (position === POSITIONS.STATUS_QUO) {
            score -= perception * 0.3;
        }
        if (position === POSITIONS.ANOMALY && correlationSignal > 0.5) {
            score += 0.15;
        }
        if (position === POSITIONS.PATTERN_REPEAT && frequencySignal > 0.3) {
            score += 0.10;
        }
        if (position === POSITIONS.DE_ESCALATION && intensitySignal < 0.25 && frequencySignal < 0.2) {
            score += 0.20;
        }
        if (position === POSITIONS.RESISTANCE && action_type === 'protest') {
            score += 0.25;
        }
        if (position === POSITIONS.POWER_CONSOLIDATION && (action_type === 'deployment' || action_type === 'agreement')) {
            score += 0.20;
        }
        if (position === POSITIONS.NARRATIVE_SHIFT && (action_type === 'media_report' || action_type === 'statement')) {
            score += 0.15;
        }

        // Clamp
        scores[position] = Math.max(0, Math.min(1, score));
    }

    // Pick highest-scoring position
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const bestPosition = sorted[0][0];
    const bestScore = sorted[0][1];

    // Compute confidence: raw score × confidence scale × domain relevance
    const confidence = Math.round(bestScore * params.confidenceScale * domainRelevance * 100) / 100;

    // Generate contextual tags
    const tags = [];
    if (intensitySignal > 0.6) tags.push('high-intensity');
    if (frequencySignal > 0.5) tags.push('accelerating');
    if (correlationSignal > 0.5) tags.push('correlated');
    if (action_type) tags.push(action_type);

    return {
        core: coreId,
        domain: params.domain,
        position: bestPosition,
        confidence,
        weight: params.deliberationWeight * domainRelevance,
        scores, // Full score breakdown for transparency
        tags,
        timestamp: Date.now()
    };
}

// ═══════════════════════════════════════════════════════════════
// COGNITIVE STATE VECTOR — the deliberated output
// ═══════════════════════════════════════════════════════════════

/**
 * Aggregate all core positions into a Cognitive State Vector.
 * @param {object[]} signatures - Array of Core Signatures
 * @param {string} theater - Theater identifier
 * @param {string} triggerType - 'epoch' or 'correlation'
 * @returns {object} Cognitive State Vector
 */
function computeCognitiveState(signatures, theater, triggerType) {
    // Filter out insufficient-data positions
    const valid = signatures.filter(s => s.position !== POSITIONS.INSUFFICIENT_DATA);
    if (valid.length === 0) {
        return {
            theater,
            triggerType,
            timestamp: Date.now(),
            consensus: 0,
            divergence: 1,
            polarization: 0,
            riskVector: [0, 0, 0],
            dominantNarrative: POSITIONS.INSUFFICIENT_DATA,
            coreCount: 0,
            positions: signatures
        };
    }

    // ── 1. WEIGHTED POSITION COUNTS ──
    const weightedCounts = {};
    let totalWeight = 0;
    for (const sig of valid) {
        const w = sig.weight * sig.confidence;
        weightedCounts[sig.position] = (weightedCounts[sig.position] || 0) + w;
        totalWeight += w;
    }

    // ── 2. CONSENSUS — how much do cores agree? ──
    // Max weighted fraction for any single position
    const maxWeight = Math.max(...Object.values(weightedCounts));
    const consensus = totalWeight > 0 ? maxWeight / totalWeight : 0;

    // ── 3. DIVERGENCE — how many distinct positions? ──
    const uniquePositions = Object.keys(weightedCounts).length;
    const maxPossible = Object.keys(POSITIONS).length;
    const divergence = Math.round((uniquePositions / Math.min(valid.length, maxPossible)) * 100) / 100;

    // ── 4. POLARIZATION — bimodal distribution ──
    // If top two positions account for >80% of weight, it's polarized
    const sorted = Object.entries(weightedCounts).sort((a, b) => b[1] - a[1]);
    let polarization = 0;
    if (sorted.length >= 2 && totalWeight > 0) {
        const top2Fraction = (sorted[0][1] + sorted[1][1]) / totalWeight;
        const balance = sorted[1][1] / sorted[0][1]; // 0 = one-sided, 1 = equal
        polarization = Math.round(top2Fraction * balance * 100) / 100;
    }

    // ── 5. RISK VECTOR — weighted average of position risk contributions ──
    const riskVector = [0, 0, 0];
    for (const sig of valid) {
        const riskContrib = POSITION_RISK_MAP[sig.position] || [0, 0, 0];
        const w = sig.weight * sig.confidence;
        for (let d = 0; d < 3; d++) {
            riskVector[d] += riskContrib[d] * w;
        }
    }
    // Normalize by total weight
    if (totalWeight > 0) {
        for (let d = 0; d < 3; d++) {
            riskVector[d] = Math.round(Math.max(0, Math.min(1, riskVector[d] / totalWeight)) * 100) / 100;
        }
    }

    // ── 6. DOMINANT NARRATIVE ──
    const dominantNarrative = sorted[0][0];

    return {
        theater,
        triggerType,
        timestamp: Date.now(),
        consensus: Math.round(consensus * 100) / 100,
        divergence,
        polarization,
        riskVector,
        riskLabels: RISK_DIMENSIONS,
        dominantNarrative,
        coreCount: valid.length,
        positions: signatures
    };
}

// ═══════════════════════════════════════════════════════════════
// DELIBERATION ENGINE — ECOSYSTEM MODULE
// ═══════════════════════════════════════════════════════════════

let ecosystem = null;
let bus = null;
const stateHistory = [];    // Rolling history of cognitive states
const MAX_HISTORY = 100;

// Theater → domain mapping
const THEATER_DOMAINS = {
    'bab-el-mandeb': ['military', 'geo'],
    'ice-italy': ['sovereignty', 'civil_rights'],
};

// Map theater domains to risk dimension keywords for domain weighting
const DOMAIN_TO_WEIGHT_KEY = {
    'military': 'military',
    'geo': 'military',
    'sovereignty': 'sovereignty',
    'civil_rights': 'civil_rights',
};

/**
 * Build context object for core deliberation.
 * Pulls live data from theater modules and correlation engine.
 */
function buildContext(theater) {
    const context = {
        frequencySlope: 0,
        correlationStrength: 0,
        epochCount: 0,
        theaterDomains: THEATER_DOMAINS[theater] || []
    };

    if (!ecosystem) return context;

    // Get theater module for frequency data
    const theaterMod = ecosystem.getModule(theater);
    if (theaterMod) {
        context.epochCount = theaterMod.getEpochCount ? theaterMod.getEpochCount() : 0;

        // Estimate frequency slope from baselines
        if (theaterMod.getFrequencies && theaterMod.getBaselines) {
            const freqs = theaterMod.getFrequencies();
            const baselines = theaterMod.getBaselines();
            let totalRatio = 0;
            let count = 0;
            for (const actor of Object.keys(freqs)) {
                const bl = baselines[actor] || 0;
                if (bl > 0) {
                    totalRatio += freqs[actor] / bl;
                    count++;
                }
            }
            context.frequencySlope = count > 0 ? totalRatio / count : 0;
        }
    }

    // Get correlation engine for pattern strength
    const corrEngine = ecosystem.getModule('correlation-engine');
    if (corrEngine && corrEngine.queryPattern) {
        try {
            const sync = corrEngine.queryPattern('influence-sync', { theater });
            if (sync && typeof sync.confidence === 'number') {
                context.correlationStrength = sync.confidence;
            }
        } catch { /* Correlation engine may not be ready */ }
    }

    return context;
}

/**
 * Run full deliberation cycle on an event.
 * @param {object} eventData - The triggering event
 * @param {string} theater - Theater identifier
 * @param {string} triggerType - 'epoch' or 'correlation'
 * @returns {object} Cognitive State Vector
 */
function deliberate(eventData, theater, triggerType) {
    const context = buildContext(theater);

    // Run all 16 cores
    const signatures = [];
    for (const coreId of Object.keys(CORE_PARAMS)) {
        const sig = computeCorePosition(coreId, eventData, context);
        if (sig) signatures.push(sig);
    }

    // Aggregate into Cognitive State Vector
    const state = computeCognitiveState(signatures, theater, triggerType);

    // Store in history
    stateHistory.push(state);
    if (stateHistory.length > MAX_HISTORY) stateHistory.shift();

    return state;
}

// ═══════════════════════════════════════════════════════════════
// MODULE INTERFACE
// ═══════════════════════════════════════════════════════════════

const DeliberationEngine = {
    name: 'deliberation-engine',
    version: '1.0.0',

    init(eco, b) {
        ecosystem = eco;
        bus = b;

        // ── Listen for epoch ingestion events ──
        bus.on('*', (event) => {
            if (!event.type || !event.type.endsWith(':epoch-ingested')) return;

            const theater = event.type.replace(':epoch-ingested', '');
            if (!THEATER_DOMAINS[theater]) return;

            const epochData = event.payload || {};
            const state = deliberate(epochData, theater, 'epoch');

            // Emit deliberation result
            bus.emit('deliberation:state-updated', state, 'deliberation-engine');

            // Log if consensus is notable
            if (state.consensus >= 0.5 && state.coreCount >= 8) {
                console.log(
                    `%c[DELIBERATION] %c${theater} %c→ ${state.dominantNarrative} ` +
                    `(consensus: ${state.consensus}, risk: [${state.riskVector.join(', ')}])`,
                    'color: #9d00ff; font-weight: bold;',
                    'color: #ffd700;',
                    'color: #c8d6e5;'
                );
            }
        });

        // ── Listen for correlation regime alerts ──
        bus.on('correlation:regime-alert', (event) => {
            const { theater, severity, actors = [], count = 0 } = event.payload || {};
            if (!theater || !THEATER_DOMAINS[theater]) return;

            const correlationData = {
                intensity: severity === 'critical' ? 5 : severity === 'high' ? 4 : 3,
                action_type: 'regime-alert',
                actor: actors[0] || 'multi-actor',
                tags: ['regime-alert', severity],
                severity,
                actors,
                count,
            };

            const state = deliberate(correlationData, theater, 'correlation');
            bus.emit('deliberation:state-updated', state, 'deliberation-engine');

            console.log(
                `%c[DELIBERATION] %cCorrelation trigger: %c${theater} ` +
                `→ ${state.dominantNarrative} (consensus: ${state.consensus})`,
                'color: #9d00ff; font-weight: bold;',
                'color: #ff3344;',
                'color: #c8d6e5;'
            );
        });

        // ── Listen for cross-theater correlation ──
        bus.on('correlation:global-regime-alert', (event) => {
            const { severity, actors = [] } = event.payload || {};

            // Deliberate on all theaters
            for (const theater of Object.keys(THEATER_DOMAINS)) {
                const data = {
                    intensity: 5,
                    action_type: 'global-regime-alert',
                    actor: 'cross-theater',
                    tags: ['global-alert', severity],
                    severity,
                    actors,
                };
                const state = deliberate(data, theater, 'correlation');
                bus.emit('deliberation:state-updated', state, 'deliberation-engine');
            }
        });

        // Set initial state
        ecosystem.setState('deliberation-engine.status', 'active', { source: 'deliberation-engine' });
        ecosystem.setState('deliberation-engine.coreCount', Object.keys(CORE_PARAMS).length, { source: 'deliberation-engine' });

        bus.emit('deliberation-engine:ready', {
            version: DeliberationEngine.version,
            cores: Object.keys(CORE_PARAMS).length,
            positions: Object.keys(POSITIONS).length,
            theaters: Object.keys(THEATER_DOMAINS)
        }, 'deliberation-engine');

        console.log(
            '%c[DELIBERATION ENGINE] %cv' + DeliberationEngine.version +
            ' %c— 16 cores online. Parametric deliberation active.',
            'color: #9d00ff; font-weight: bold;',
            'color: #39ff14;',
            'color: #6b7fa3;'
        );
    },

    destroy() {
        stateHistory.length = 0;
        if (ecosystem) {
            ecosystem.setState('deliberation-engine.status', 'offline', { source: 'deliberation-engine' });
        }
        if (bus) {
            bus.emit('deliberation-engine:shutdown', {}, 'deliberation-engine');
        }
    },

    // ═══════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════

    /** Get the latest cognitive state for a theater */
    getLatestState(theater) {
        for (let i = stateHistory.length - 1; i >= 0; i--) {
            if (stateHistory[i].theater === theater) return stateHistory[i];
        }
        return null;
    },

    /** Get full state history (optionally filtered by theater) */
    getHistory(theater) {
        if (theater) return stateHistory.filter(s => s.theater === theater);
        return [...stateHistory];
    },

    /** Force deliberation on arbitrary data (operator testing) */
    deliberate(eventData, theater, triggerType = 'manual') {
        return deliberate(eventData, theater, triggerType);
    },

    /** Get core parameter matrix (read-only) */
    getCoreParams() {
        return { ...CORE_PARAMS };
    },

    /** Get position vocabulary */
    getPositions() {
        return { ...POSITIONS };
    },

    /** Get a single core's latest position for a theater */
    getCorePosition(coreId, theater) {
        for (let i = stateHistory.length - 1; i >= 0; i--) {
            const state = stateHistory[i];
            if (state.theater === theater) {
                const sig = state.positions.find(p => p.core === coreId);
                if (sig) return sig;
            }
        }
        return null;
    },

    /** Get consensus trend (last N deliberations for a theater) */
    getConsensusTrend(theater, n = 10) {
        const theaterStates = stateHistory.filter(s => s.theater === theater);
        return theaterStates.slice(-n).map(s => ({
            timestamp: s.timestamp,
            consensus: s.consensus,
            dominantNarrative: s.dominantNarrative,
            riskVector: s.riskVector
        }));
    },

    /** Get risk trend across deliberations */
    getRiskTrend(theater, n = 10) {
        const theaterStates = stateHistory.filter(s => s.theater === theater);
        return theaterStates.slice(-n).map(s => ({
            timestamp: s.timestamp,
            military: s.riskVector[0],
            political: s.riskVector[1],
            social: s.riskVector[2],
        }));
    }
};

export default DeliberationEngine;
