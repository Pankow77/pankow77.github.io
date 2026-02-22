/**
 * SIGIL - Configuration Constants
 * All tunable parameters for the game engine
 */

export const CONFIG = {
  // Game structure
  MVP_MODE: true,
  MAX_TURNS: 4,           // MVP: 4 turns (T1-T3 + T4 post-revelation)
  PROTOCOL_TRIGGER_TURN: 3, // MVP: force after T3

  // Metrics defaults
  METRICS_DEFAULT: {
    scientific_credibility: 50,
    methodological_integrity: 50,
    public_trust: 50,
    civil_society_trust: 50,
    government_comfort: 50,
    personal_guilt: 0,
    decision_fatigue: 0,
    public_awareness: 10,
    annotation_sentiment_avg: 0.0,
    performativity_index: 0.0,
    self_awareness: 0.5
  },

  // Metric clamp ranges
  CLAMP_METRICS: [
    'scientific_credibility',
    'methodological_integrity',
    'public_trust',
    'civil_society_trust',
    'government_comfort',
    'public_awareness'
  ],

  // Fatigue thresholds
  FATIGUE: {
    REMOVE_LOWEST: 60,
    KEEP_THREE: 80,
    KEEP_TWO: 95
  },

  // PROTOCOLLO_PADC
  PROTOCOL: {
    WINDOW_START: 8,
    WINDOW_END: 22,
    BASE_PROBABILITY: 0.08,
    PER_TURN_INCREMENT: 0.02,
    ANNOTATION_COLLAPSE_THRESHOLD: 50,
    ANNOTATION_COLLAPSE_BOOST: 0.25,
    PERFORMATIVITY_CRITICAL: 0.60
  },

  // UI timing (ms)
  UI: {
    ENVELOPE_STAGGER: 800,
    POST_ENVELOPE_PAUSE: 1500,
    TYPEWRITER_SPEED: 30,       // ms per character
    TYPEWRITER_SPEED_SLOW: 80,
    TURN_ADVANCE_DELAY: 2000,
    PROTOCOL_BLACKOUT: 3000,
    PROTOCOL_STEP_PAUSE: 4000
  },

  // NLP
  NLP: {
    POSITIVE_WORDS: [
      'grazie', 'bene', 'giusto', 'salvato', 'libero', 'vittoria',
      'felice', 'speranza', 'migliore', 'risolto', 'funziona',
      'protetto', 'vero', 'onesto', 'coraggio', 'possibile'
    ],
    NEGATIVE_WORDS: [
      'colpa', 'stanco', 'sbagliato', 'perso', 'prigione', 'fallito',
      'deluso', 'paura', 'peso', 'sacrificato', 'male', 'dubbio',
      'codardo', 'mentito', 'solo', 'morto', 'distrutto', 'impossibile'
    ],
    SELF_AWARENESS_KEYWORDS: [
      'rileggo', 'sembro', 'dovrei', 'pensando a ghost',
      'essere letto', 'performo', 'costruito', 'finto'
    ],
    MENTOR_KEYWORDS: [
      'ricorda che', 'devi sapere', 'importante capire',
      'la lezione', 'ho imparato che'
    ]
  },

  // Storage
  STORAGE_PREFIX: 'sigil_',
  DB_NAME: 'sigil-game',
  DB_VERSION: 1
};
