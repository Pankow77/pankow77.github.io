/**
 * ═══════════════════════════════════════════════════════════════════
 * HYBRID SYNDICATE — ECOSYSTEM CONSTITUTION v1.0
 * ═══════════════════════════════════════════════════════════════════
 *
 * This file is LAW. Every module conforms to it. Every event respects it.
 * It defines the formal data contracts for every entity in the ecosystem.
 *
 * NON-NEGOTIABLE PRINCIPLES:
 *   1. All objects are IMMUTABLE after emission (Object.freeze)
 *   2. All objects carry schemaVersion
 *   3. All objects carry provenance
 *   4. No module can mutate objects from another module
 *   5. No boolean "detected" — only probabilities or enumerated states
 *
 * EVERY OBJECT CARRIES:
 *   schemaVersion  — for forward compatibility
 *   id             — for traceability
 *   theater        — for context
 *   ts             — for ordering
 *   provenance     — for trust chain
 *
 * ═══════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════
// CANONICAL ENUMS — the closed vocabularies of the ecosystem
// ═══════════════════════════════════════════════════════════════════

/**
 * THEATERS — operational contexts
 */
export const THEATERS = Object.freeze({
    BAB_EL_MANDEB: 'bab-el-mandeb',
    ICE_ITALY:     'ice-italy',
});

/**
 * ACTORS — per-theater actor enums
 * Every actor string MUST be one of these values.
 */
export const ACTORS = Object.freeze({
    [THEATERS.BAB_EL_MANDEB]: Object.freeze({
        CENTCOM:  'centcom',
        HOUTHI:   'houthi',
        EUNAVFOR: 'eunavfor',
        IRAN:     'iran',
        OTHER:    'other',
    }),
    [THEATERS.ICE_ITALY]: Object.freeze({
        ICE:            'ice',
        GOV_IT:         'gov_it',
        POLICE_IT:      'police_it',
        CIVIL_SOCIETY:  'civil_society',
        MEDIA:          'media',
        US_EMBASSY:     'us_embassy',
        EU_INST:        'eu_inst',
        OLYMPICS:       'olympics',
    }),
});

/**
 * ACTION_TYPES — per-theater action enums
 */
export const ACTION_TYPES = Object.freeze({
    [THEATERS.BAB_EL_MANDEB]: Object.freeze({
        STRIKE:     'strike',
        CLAIM:      'claim',
        WARNING:    'warning',
        DEFENSIVE:  'defensive',
        STATEMENT:  'statement',
        DEPLOYMENT: 'deployment',
    }),
    [THEATERS.ICE_ITALY]: Object.freeze({
        DEPLOYMENT:     'deployment',
        OPERATION:      'operation',
        AGREEMENT:      'agreement',
        STATEMENT:      'statement',
        PROTEST:        'protest',
        LEGAL_ACTION:   'legal_action',
        ARREST:         'arrest',
        POLICY:         'policy',
        MEDIA_REPORT:   'media_report',
        SURVEILLANCE:   'surveillance',
    }),
});

/**
 * DOMAINS — analytical dimensions that tag epochs
 */
export const DOMAINS = Object.freeze({
    MILITARY:       'military',
    GEO:            'geo',
    SOVEREIGNTY:    'sovereignty',
    CIVIL_RIGHTS:   'civil_rights',
    ECONOMICS:      'economics',
    INFORMATION:    'information',
});

/**
 * STANCES — the closed vocabulary of deliberative positions
 * A core MUST take one of these stances. No free text.
 */
export const STANCES = Object.freeze({
    ESCALATION:          'escalation-detected',
    DE_ESCALATION:       'de-escalation-detected',
    STRUCTURAL_RISK:     'structural-risk-increase',
    STRUCTURAL_RELIEF:   'structural-risk-decrease',
    PATTERN_REPEAT:      'pattern-repeat',
    ANOMALY:             'anomaly-detected',
    NARRATIVE_SHIFT:     'narrative-shift',
    POWER_CONSOLIDATION: 'power-consolidation',
    RESISTANCE:          'resistance-emerging',
    STATUS_QUO:          'status-quo',
    INSUFFICIENT_DATA:   'insufficient-data',
});

/**
 * CORRELATION_PATTERNS — types of patterns the Correlation Engine detects
 */
export const CORRELATION_PATTERNS = Object.freeze({
    INFLUENCE_SYNC:          'influence-sync',
    NARRATIVE_SHIELDING:     'narrative-shielding',
    INSTITUTIONAL_ALIGNMENT: 'institutional-alignment',
    REGIME_ALERT:            'regime-alert',
});

/**
 * CHRONOS_PHASES — temporal regimes
 */
export const CHRONOS_PHASES = Object.freeze({
    BASELINE:        'baseline',
    BUILDUP:         'buildup',
    PRE_ESCALATION:  'pre-escalation',
    ESCALATION:      'escalation',
    PEAK:            'peak',
    DE_ESCALATION:   'de-escalation',
    AFTERMATH:        'aftermath',
    SILENCE:         'silence',
    REGIME_SHIFT:    'regime-shift',
    COERCIVE_OPS:    'coercive-ops',
    DIPLOMATIC:      'diplomatic',
    INFORMATION_WAR: 'information-war',
});

/**
 * PNEUMA_STATES — system health classifications
 */
export const PNEUMA_STATES = Object.freeze({
    NOMINAL:   'nominal',
    ELEVATED:  'elevated-load',
    DEGRADED:  'degraded-signal',
    OVERLOADED:'overloaded',
    INCOHERENT:'incoherent',
    BLIND:     'blind',
    DELIRIUM:  'delirium',
});

/**
 * MUTATION_TYPES — what kind of parameter mutation Oracle performs
 */
export const MUTATION_TYPES = Object.freeze({
    THRESHOLD_ADJUSTMENT: 'threshold-adjustment',
    WEIGHT_ADJUSTMENT:    'weight-adjustment',
    BASELINE_RECALC:      'baseline-recalibration',
    ACTOR_PRIORITY:       'actor-priority-change',
    SENSITIVITY_SHIFT:    'sensitivity-shift',
    TAG_PROMOTION:        'tag-promotion',
    DOMAIN_REWEIGHT:      'domain-reweight',
});

/**
 * PREDICTION_STATUS — lifecycle of a prediction
 */
export const PREDICTION_STATUS = Object.freeze({
    PENDING:   'pending',
    CONFIRMED: 'confirmed',
    REFUTED:   'refuted',
    EXPIRED:   'expired',
});

/**
 * SEVERITY — threat levels for alerts and regime states
 */
export const SEVERITY = Object.freeze({
    NONE:     'none',
    WATCH:    'watch',
    ELEVATED: 'elevated',
    HIGH:     'high',
    CRITICAL: 'critical',
});

/**
 * SOURCE_TYPES — origin of an epoch
 */
export const SOURCE_TYPES = Object.freeze({
    OPERATOR:  'operator',
    RSS:       'rss',
    SEED:      'seed',
    SYNTHETIC: 'synthetic',
    COMPUTED:  'computed',
    SYSTEM:    'system',
});

/**
 * ENVELOPE_DOMAINS — categories for Circulation envelopes
 */
export const ENVELOPE_DOMAINS = Object.freeze({
    SIGNAL:     'signal',
    ANALYSIS:   'analysis',
    PREDICTION: 'prediction',
    MUTATION:   'mutation',
    METRIC:     'metric',
    SYSTEM:     'system',
});

/**
 * PRIORITIES
 */
export const PRIORITIES = Object.freeze({
    LOW:      { label: 'low',      weight: 0 },
    NORMAL:   { label: 'normal',   weight: 1 },
    HIGH:     { label: 'high',     weight: 2 },
    CRITICAL: { label: 'critical', weight: 3 },
});


// ═══════════════════════════════════════════════════════════════════
// EVENT NAMESPACE CONTRACT — the Bus speaks this language
// ═══════════════════════════════════════════════════════════════════
//
// Every event type MUST follow: '{namespace}:{event-name}'
// No module emits outside its own namespace.

export const EVENT_CATALOG = Object.freeze({
    // identity:* — persistence layer
    'identity:epoch-created':       'Epoch written to IndexedDB',
    'identity:mutation-applied':    'Delta written to mutation log',
    'identity:state-saved':         'Key-value state persisted',
    'identity:state-deleted':       'Key-value state removed',
    'identity:branch-created':      'New timeline branch created',
    'identity:ready':               'Identity store initialized',

    // circulation:* — indexing & routing
    'circulation:indexed':          'Envelope indexed in rolling window',

    // {theater}:* — theater-specific events
    'bab-el-mandeb:epoch-ingested': 'Epoch accepted into Bab el-Mandeb theater',
    'bab-el-mandeb:elevated-frequency': 'Actor frequency exceeds baseline',
    'bab-el-mandeb:ready':          'Theater module initialized',
    'ice-italy:epoch-ingested':     'Epoch accepted into ICE-Italy theater',
    'ice-italy:elevated-frequency': 'Actor frequency exceeds baseline',
    'ice-italy:ready':              'Theater module initialized',

    // correlation:* — pattern detection
    'correlation:detected':         'New pattern identified with confidence',
    'correlation:regime-alert':     'Multi-actor synchronization detected',
    'correlation:global-regime-alert': 'Cross-theater synchronization detected',
    'correlation:warmup-progress':  'Baseline accumulation progress',

    // agora:* — deliberation (was deliberation:*)
    'agora:state-updated':          'CognitiveStateVector computed',
    'agora:commentary':             'CommentaryUnits from all cores',
    'agora:decision':               'Actionable decision proposed',

    // oracle:* — world model mutations
    'oracle:mutation-proposed':     'Parameter change proposed',
    'oracle:mutation-applied':      'Parameter change applied',
    'oracle:mutation-rejected':     'Parameter change rejected',
    'oracle:mutation-rollback':     'Parameter change reversed',
    'oracle:scan-complete':         'Domain risk scan completed',
    'oracle:hypothesis-created':    'New hypothesis registered',

    // prediction:* — forecast lifecycle
    'prediction:created':           'New prediction registered',
    'prediction:scored':            'Prediction evaluated against reality',
    'prediction:expired':           'Prediction TTL exceeded',

    // chronos:* — temporal structure
    'chronos:phase-updated':        'Current temporal phase computed',
    'chronos:regime-shift':         'Phase transition detected',
    'chronos:leadlag-update':       'Actor lead/lag relationships updated',
    'chronos:transition-start':     'Phase transition beginning',
    'chronos:transition-end':       'Phase transition completed',

    // pneuma:* — system homeostasis
    'pneuma:state':                 'Homeostasis state updated',
    'pneuma:gating':                'Confidence/sensitivity gates changed',
    'pneuma:alert':                 'System health alert',
    'pneuma:trust-update':          'Overall trust score changed',

    // archive:* — sealing & export
    'archive:sealed':               'Snapshot sealed and hashed',
    'archive:bundle-exported':      'Snapshot exported as bundle',
    'archive:chain-verified':       'Hash chain integrity verified',

    // feed-ingestor:* — autonomous RSS pipeline
    'feed-ingestor:poll-complete':  'RSS polling cycle completed',
    'feed-ingestor:ready':          'Feed ingestor initialized',

    // core-feed:* — UI commentary panel
    'core-feed:triggered':          'Core commentary triggered',
    'core-feed:ready':              'Core feed panel initialized',

    // ecosystem:* — system lifecycle
    'ecosystem:boot':               'System startup',
    'ecosystem:module-registered':  'New module registered',
    'ecosystem:module-unregistered':'Module removed',
    'ecosystem:heartbeat':          'Periodic heartbeat',
});


// ═══════════════════════════════════════════════════════════════════
// SCHEMA DEFINITIONS — the 9 canonical types
// ═══════════════════════════════════════════════════════════════════

/**
 * 1️⃣ EPOCH — atomic unit of observed reality
 *
 * {
 *   schemaVersion: "1.0",
 *   id:       "uuid",
 *   type:     "epoch",
 *   theater:  "ice-italy",
 *   ts:       1739839200000,
 *   actor:    "ice",                    // ACTORS[theater] enum
 *   actionType: "deployment",           // ACTION_TYPES[theater] enum
 *   intensity: 3,                       // 1–5. RSS max: 4
 *   domains:  ["sovereignty", "civil_rights"],  // DOMAINS enum
 *   tags:     ["extraterritorial"],
 *   summary:  "ICE agents reported operating in Milan",  // nullable
 *   location: "Milano",                 // nullable
 *   confidence: 0.72,                   // 0.0–1.0
 *   provenance: {
 *     sourceType:  "rss",               // SOURCE_TYPES enum
 *     sourceName:  "Reuters",
 *     sourceWeight: 0.85,               // 0.0–1.0
 *     ingestedBy:  "feed-ingestor"
 *   }
 * }
 */

/**
 * 2️⃣ CORRELATION EVENT — detected pattern between actors
 *
 * {
 *   schemaVersion: "1.0",
 *   id:       "uuid",
 *   type:     "correlation",
 *   theater:  "ice-italy",
 *   ts:       1739842800000,
 *   pattern:  "influence-sync",         // CORRELATION_PATTERNS enum
 *   actors:   ["ice", "gov_it"],        // or {enforcement:[], dissent:[]}
 *   window:   "24h",
 *   confidence: 0.73,                   // 0.0–1.0. NEVER boolean.
 *   severity: "elevated",               // SEVERITY enum (regime-alert only)
 *   metrics: {
 *     ratio: 0.8, proximity: 0.9,
 *     slope: 0.6, acceleration: 0.5,
 *     maturity: 0.7
 *   },
 *   provenance: {
 *     engine: "correlation-engine-v2"
 *   }
 * }
 */

/**
 * 3️⃣ COMMENTARY UNIT — single core's structured position
 *
 * {
 *   schemaVersion: "1.0",
 *   id:       "uuid",
 *   type:     "commentary-unit",
 *   theater:  "ice-italy",
 *   ts:       1739842900000,
 *   core:     "SENTINEL",
 *   stance:   "structural-risk-increase",  // STANCES enum
 *   confidence: 0.74,                      // 0.0–1.0
 *   weight:   1.2,                         // deliberationWeight × domainRelevance
 *   references: {
 *     epochIds:       ["uuid1"],
 *     correlationIds: ["uuid2"]
 *   },
 *   provenance: {
 *     engine: "deliberation-engine-v1",
 *     triggerType: "epoch"                 // "epoch"|"correlation"|"manual"
 *   }
 * }
 *
 * RULE: No mandatory text. Text is rendering layer.
 */

/**
 * 4️⃣ COGNITIVE STATE VECTOR — aggregated AGORA output
 *
 * {
 *   schemaVersion: "1.0",
 *   id:       "uuid",
 *   type:     "cognitive-state",
 *   theater:  "ice-italy",
 *   ts:       1739843000000,
 *   consensus: 0.62,                    // 0.0–1.0
 *   divergence: 0.28,                   // 0.0–1.0
 *   polarization: 0.15,                 // 0.0–1.0
 *   riskVector: {
 *     military:  0.45,
 *     political: 0.72,
 *     social:    0.61
 *   },
 *   dominantNarrative: "structural-risk-increase",  // STANCES enum
 *   coreCount: 14,
 *   provenance: {
 *     engine: "deliberation-engine-v1"
 *   }
 * }
 */

/**
 * 5️⃣ ORACLE MUTATION — parameter change to world model
 *
 * {
 *   schemaVersion: "1.0",
 *   id:       "uuid",
 *   type:     "oracle-mutation",
 *   theater:  "ice-italy",
 *   ts:       1739843200000,
 *   mutationType: "threshold-adjustment",  // MUTATION_TYPES enum
 *   status:   "applied",                   // "proposed"|"applied"|"rejected"|"rolled-back"
 *   parametersChanged: {
 *     "escalationThreshold": { old: 0.65, new: 0.7 }
 *   },
 *   reason:   "sustained high polarization",
 *   confidence: 0.8,                       // 0.0–1.0
 *   provenance: {
 *     triggeredBy: "agora:state-updated",
 *     sourceModule: "oracle"
 *   }
 * }
 */

/**
 * 6️⃣ PREDICTION — EEI forecast with lifecycle
 *
 * {
 *   schemaVersion: "1.0",
 *   id:       "uuid",
 *   type:     "prediction",
 *   theater:  "bab-el-mandeb",
 *   ts:       1739843500000,
 *   horizon:  "12h",
 *   predictedEvent: "escalation-spike",
 *   confidence: 0.68,                    // 0.0–1.0
 *   expiresAt: 1739886700000,
 *   status:   "pending",                 // PREDICTION_STATUS enum
 *   score:    null,                      // 0.0–1.0 when evaluated, null until then
 *   provenance: {
 *     engine: "eei-predictor-v1"
 *   }
 * }
 */

/**
 * 7️⃣ ARCHIVE SNAPSHOT — sealed, immutable, verifiable record
 *
 * {
 *   schemaVersion: "1.0",
 *   id:       "uuid",
 *   type:     "archive-snapshot",
 *   theater:  "ice-italy",              // nullable for cross-theater
 *   ts:       1739844000000,
 *   sequence: 42,                       // monotonic global counter
 *   epochIds:         ["uuid1", "uuid3"],
 *   correlationIds:   ["uuid2"],
 *   cognitiveStateId: "uuid4",
 *   oracleMutationIds: ["uuid5"],
 *   predictionIds:    ["uuid6"],
 *   hash:     "sha256-...",             // SHA-256 of content
 *   previousHash: "sha256-...",         // chain link
 *   sealed:   true,                     // always true after emission
 *   provenance: {
 *     sealedBy: "archivio-silente",
 *     trigger:  "critical-alert"        // what caused this snapshot
 *   }
 * }
 *
 * RULE: Immutable. Once sealed, never modified.
 */

/**
 * 8️⃣ PNEUMA STATE — system homeostasis
 *
 * {
 *   schemaVersion: "1.0",
 *   id:       "uuid",
 *   type:     "pneuma-state",
 *   theater:  "ice-italy",             // nullable for global
 *   ts:       1739844100000,
 *   entropy:     0.32,                 // 0.0–1.0. Signal noise ratio.
 *   load:        0.48,                 // 0.0–1.0. Processing pressure.
 *   coherence:   0.71,                 // 0.0–1.0. Core agreement stability.
 *   trustScore:  0.68,                 // 0.0–1.0. Overall reliability.
 *   homeostasis: "nominal",            // PNEUMA_STATES enum
 *   gating: {
 *     confidenceFloor:       0.55,     // Min confidence for deliberation
 *     maxRssIntensity:       4,        // Max intensity from RSS
 *     correlationSensitivity: 0.9,     // Correlation threshold multiplier
 *     suppressAlerts:        false,    // Suppress non-critical alerts
 *     requireOperator:       false     // Flag for operator review
 *   },
 *   provenance: {
 *     engine: "pneuma-v1"
 *   }
 * }
 */

/**
 * 9️⃣ CHRONOS PHASE — temporal regime descriptor
 *
 * {
 *   schemaVersion: "1.0",
 *   id:       "uuid",
 *   type:     "chronos-phase",
 *   theater:  "ice-italy",
 *   ts:       1739844200000,
 *   phase:    "pre-escalation",        // CHRONOS_PHASES enum
 *   previousPhase: "baseline",         // nullable
 *   phaseSince: 1739822400000,         // when current phase started
 *   leadLag: {
 *     "ice→gov_it":    3.2,            // hours. Positive = first leads.
 *     "media→police_it": 1.1
 *   },
 *   regime: {
 *     slope:        0.4,               // frequency slope
 *     acceleration: 0.1,               // slope change rate
 *     entropy:      0.35,              // signal diversity
 *     dominantActor: "ice",
 *     actorBalance: 0.6                // 0.0–1.0
 *   },
 *   phaseConfidence: 0.67,             // 0.0–1.0
 *   provenance: {
 *     engine: "chronomorf-v1"
 *   }
 * }
 */


// ═══════════════════════════════════════════════════════════════════
// BUS EVENT GRAPH — complete pipeline visualization
// ═══════════════════════════════════════════════════════════════════
//
//  ┌──────────────┐
//  │ RSS / OSINT   │
//  │ (GitHub Actions)│
//  └──────┬───────┘
//         │ data/feeds/*.json
//         ▼
//  ┌──────────────┐    epoch:candidate
//  │ Feed Ingestor │─────────────────────────┐
//  └──────────────┘                          │
//         │ feed-ingestor:poll-complete       │
//         ▼                                  ▼
//  ┌──────────────┐    {theater}:epoch-ingested     ┌───────────┐
//  │ Theater Module│─────────────────────────────────│ Identity  │
//  │ (ICE/Bab)     │                                │ (IndexedDB)│
//  └──────┬───────┘                                 └─────┬─────┘
//         │                                               │ identity:epoch-created
//         │ {theater}:epoch-ingested                      │
//         ▼                                               ▼
//  ┌──────────────┐                              ┌──────────────┐
//  │ Circulation   │◄────────────────────────────│   (indexes)   │
//  │ (rolling idx) │  circulation:indexed         └──────────────┘
//  └──────┬───────┘
//         │
//    ┌────┴────────────────┬──────────────────┐
//    ▼                     ▼                  ▼
//  ┌──────────────┐ ┌──────────────┐  ┌──────────────┐
//  │ Correlation   │ │   AGORA      │  │  Cronomorf   │
//  │ Engine        │ │ (Deliberation)│  │ (Temporal)    │
//  └──────┬───────┘ └──────┬───────┘  └──────┬───────┘
//         │                │                  │
//         │ correlation:*  │ agora:*          │ chronos:*
//         │                │                  │
//    ┌────┴────┐     ┌─────┴─────┐      ┌────┴────┐
//    ▼         ▼     ▼           ▼      ▼         ▼
//  ┌──────┐ ┌──────┐ ┌────────┐ ┌──────┐ ┌──────────┐
//  │AGORA │ │Pneuma│ │ Oracle │ │Pneuma│ │ VR Field │
//  │(2nd) │ │      │ │        │ │(2nd) │ │          │
//  └──────┘ └──┬───┘ └──┬─────┘ └──────┘ └──────────┘
//              │        │
//              │        │ oracle:mutation-*
//              │        ▼
//              │  ┌──────────────┐
//              │  │    EEI       │
//              │  │ (Predictor)  │
//              │  └──────┬───────┘
//              │         │ prediction:*
//              ▼         ▼
//        ┌──────────────────────┐
//        │   Archivio Silente   │
//        │ (seals everything)   │
//        └──────────────────────┘
//              │ archive:sealed
//              ▼
//          [immutable record]
//
//  PNEUMA watches ALL of this and gates when the system is unreliable.
//
// ═══════════════════════════════════════════════════════════════════


// ═══════════════════════════════════════════════════════════════════
// CHANGELOG
// ═══════════════════════════════════════════════════════════════════
// v1.0.0 (2026-02-19)
//   - Canonical enums: ACTORS, ACTION_TYPES, DOMAINS, STANCES,
//     CORRELATION_PATTERNS, CHRONOS_PHASES, PNEUMA_STATES,
//     MUTATION_TYPES, PREDICTION_STATUS, SEVERITY, SOURCE_TYPES,
//     ENVELOPE_DOMAINS, PRIORITIES
//   - 9 canonical schemas with JSDoc examples
//   - Complete EVENT_CATALOG (40+ events, all namespaced)
//   - Full pipeline graph
//   - Non-negotiable principles formalized
// ═══════════════════════════════════════════════════════════════════
