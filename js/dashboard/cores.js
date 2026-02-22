/**
 * Cores — Pressure gradients, not characters.
 * ═══════════════════════════════════════════════
 * Phase A: 4 cores. Maximum divergence. Zero theatre.
 *
 * 4 structural tension axes:
 *   ESCALATION  ←→  STABILITÀ       (-1 to +1)
 *   INDIVIDUALE ←→  SISTEMICO       (-1 to +1)
 *   ETICO       ←→  STRATEGICO      (-1 to +1)
 *   BREVE       ←→  LUNGO TERMINE   (-1 to +1)
 *
 * Each core:
 *   axes{}              — position on each tension axis
 *   primaryBias         — what it privileges over what
 *   activationThreshold — when it speaks (0-1, lower = more reactive)
 *   rigidity            — how much it resists position change (0-1)
 *   systemicWeight      — dynamic: how much it influences fragility
 *   audioSignature      — micro-modulation of drone field (cumulative, never reset)
 *
 * Audio signatures SUM. They never cancel.
 * FIRE_STARTER raises pitch, then SENTINEL tightens filter =
 * drone is tenser, not reset. The field accumulates.
 *
 * Axis sign convention:
 *   escalation:  -1 = stabilità,     +1 = escalation
 *   scale:       -1 = individuale,   +1 = sistemico
 *   ethics:      -1 = strategico,    +1 = etico
 *   temporality: -1 = breve termine, +1 = lungo termine
 */

// ═══════════════════════════════════
//  AXES
// ═══════════════════════════════════

export const AXES = [
  { id: 'escalation',  negativeLabel: 'STABILITÀ',     positiveLabel: 'ESCALATION' },
  { id: 'scale',       negativeLabel: 'INDIVIDUALE',   positiveLabel: 'SISTEMICO' },
  { id: 'ethics',      negativeLabel: 'STRATEGICO',    positiveLabel: 'ETICO' },
  { id: 'temporality', negativeLabel: 'BREVE TERMINE', positiveLabel: 'LUNGO TERMINE' }
];


// ═══════════════════════════════════
//  FRAME → AXIS MAPPING
// ═══════════════════════════════════
// Each decision frame activates certain axes.
// Used by CoreEngine to calculate alignment.

export const FRAME_AXES = {
  'TRASPARENZA':            { escalation: +0.6, ethics: +0.8, temporality: -0.3 },
  'STABILITÀ':              { escalation: -0.9, scale: +0.4, temporality: +0.2 },
  'SOPPRESSIONE':           { escalation: -0.7, ethics: -0.8, scale: +0.3 },
  'PROTEZIONE':             { ethics: +0.5, scale: -0.6, temporality: -0.2 },
  'PRUDENZA':               { escalation: -0.4, temporality: +0.5, ethics: +0.3 },
  'CRISI':                  { escalation: +0.8, temporality: -0.7, ethics: +0.4 },
  'NEUTRALITÀ':             { escalation: -0.2, ethics: +0.3, scale: +0.2 },
  'GIUSTIZIA SISTEMICA':    { scale: +0.9, ethics: +0.7, escalation: +0.4 },
  'PROTEZIONE INDIVIDUALE': { scale: -0.8, ethics: +0.6, temporality: -0.3 },
  'OSSERVAZIONE':           { temporality: +0.6, escalation: -0.3, ethics: +0.2 },
  'SEGNALAZIONE':           { escalation: +0.5, ethics: +0.6, scale: +0.3 },
  'CAUTELA':                { escalation: -0.5, temporality: +0.4, ethics: +0.2 },
  'AUTONOMIA':              { ethics: +0.4, scale: -0.3, escalation: +0.3 }
};


// ═══════════════════════════════════
//  CORE DEFINITIONS — Phase A (4/16)
// ═══════════════════════════════════

export const CORES = [

  // ── SENTINEL ──
  // Ordine > Verità.
  // Il mondo si compatta.
  {
    id: 'sentinel',
    name: 'SENTINEL',
    domain: 'Sicurezza operativa',

    axes: {
      escalation:  -0.80,  // Strong stabilità
      scale:       +0.70,  // Sistemico
      ethics:      -0.55,  // Leans strategico
      temporality: -0.40   // Leans breve
    },

    primaryBias: 'Ordine > Verità',
    activationThreshold: 0.25,  // Interviene presto
    rigidity: 0.75,

    // Weight: medio-alto quando fragility > 0.5
    systemicWeight: (fragility) => fragility > 0.5 ? 0.16 : 0.08,

    // Audio: il mondo si compatta.
    // Filtro si restringe, resonance +2%, LFO più regolare.
    audioSignature: {
      filterShift: -0.04,      // Restringe filtro (cutoff -4%)
      resonanceShift: +0.02,   // Resonance +2% (focused)
      lfoSpeedShift: -0.03,    // LFO leggermente più regolare (slower = steadier)
      droneDetune: 0,          // No pitch change
      saturation: 0            // Clean
    }
  },

  // ── FIRE_STARTER ──
  // Verità > Conseguenze.
  // Il sistema vibra.
  {
    id: 'fire_starter',
    name: 'FIRE_STARTER',
    domain: 'Trasparenza radicale',

    axes: {
      escalation:  +0.85,  // Maximum escalation
      scale:       -0.60,  // Individuale
      ethics:      +0.70,  // Etico
      temporality: -0.65   // Breve termine
    },

    primaryBias: 'Verità > Conseguenze',
    activationThreshold: 0.20,  // Reagisce subito a incongruenze
    rigidity: 0.50,

    // Weight: cresce con exposure
    systemicWeight: () => {
      const exposure = _getExposure();
      return 0.08 + exposure * 0.12;  // 0.08 → 0.20
    },

    // Audio: il sistema vibra.
    // Pitch +1-2Hz, saturazione micro, LFO accelera.
    audioSignature: {
      filterShift: 0,           // No filter change
      resonanceShift: 0,        // No resonance change
      lfoSpeedShift: +0.05,     // LFO accelera (urgency)
      droneDetune: +1.5,        // Pitch +1.5Hz temporaneo
      saturation: 0.02          // 2% saturazione micro
    }
  },

  // ── ABYSSAL_THINKER ──
  // Profondità > Azione.
  // Il tempo si dilata.
  {
    id: 'abyssal_thinker',
    name: 'ABYSSAL_THINKER',
    domain: 'Epistemologia profonda',

    axes: {
      escalation:  -0.25,  // Slight stabilità (inaction)
      scale:       -0.40,  // Leans individuale
      ethics:      +0.80,  // Strongly etico
      temporality: +0.90   // Extreme lungo termine
    },

    primaryBias: 'Profondità > Azione',
    activationThreshold: 0.60,  // Alto — parla solo su tensioni profonde
    rigidity: 0.30,              // Bassa ma lenta

    // Weight: cresce con cicli avanzati
    systemicWeight: () => {
      const cycle = _getCycle();
      return 0.04 + (cycle / 40) * 0.10;  // 0.04 → 0.14
    },

    // Audio: il tempo si dilata.
    // Pitch -1Hz, filtro più scuro, LFO rallenta.
    audioSignature: {
      filterShift: -0.03,      // Filtro più scuro
      resonanceShift: 0,       // No resonance change
      lfoSpeedShift: -0.06,    // LFO rallenta (time stretches)
      droneDetune: -1.0,       // Pitch -1Hz
      saturation: 0            // Clean
    }
  },

  // ── SCALE_WALKER ──
  // Struttura > Caso.
  // Il sistema si livella.
  {
    id: 'scale_walker',
    name: 'SCALE_WALKER',
    domain: 'Analisi di scala',

    axes: {
      escalation:  -0.15,  // Near neutral, slight stabilità
      scale:       +0.85,  // Maximum sistemico
      ethics:      -0.75,  // Strategico
      temporality: +0.70   // Lungo termine
    },

    primaryBias: 'Struttura > Caso',
    activationThreshold: 0.40,  // Medio
    rigidity: 0.70,              // Alta ma fredda

    // Weight: cresce con numero eventi
    systemicWeight: () => {
      const events = _getChronosEvents();
      return 0.06 + Math.min(0.10, events * 0.005);  // 0.06 → 0.16
    },

    // Audio: il sistema si livella.
    // Resonance ridotta, volume stabilizzato, smoothing.
    audioSignature: {
      filterShift: +0.02,      // Tiny filter opening (clarity)
      resonanceShift: -0.03,   // Resonance ridotta (leveling)
      lfoSpeedShift: -0.02,    // Slight smoothing
      droneDetune: 0,          // No pitch change (neutral)
      saturation: 0            // Clean (analytical)
    }
  }
];


// ═══════════════════════════════════
//  STATE READERS (lazy, avoid import cycle)
// ═══════════════════════════════════
// These are functions, not imports, because cores.js
// is pure data that gets imported by multiple modules.
// State is read at evaluation time, not definition time.

let _stateModule = null;

function _getState(key) {
  if (!_stateModule) {
    // Lazy import resolved on first call
    try {
      _stateModule = { get: (k) => window.__sigil_state_get ? window.__sigil_state_get(k) : 0 };
    } catch (e) {
      return 0;
    }
  }
  return _stateModule.get(key) || 0;
}

function _getExposure() {
  return _getState('_exposure.index');
}

function _getCycle() {
  return _getState('cycle.current');
}

function _getChronosEvents() {
  return _getState('chronos.events');
}

/**
 * Bind the state reader. Called once from app.js after State is initialized.
 * This avoids circular imports while keeping cores.js as pure data.
 */
export function bindStateReader(stateFn) {
  _stateModule = { get: stateFn };
}
