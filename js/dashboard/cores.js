/**
 * Cores — The 16 analytical vectors of Agora.
 * ═══════════════════════════════════════════════
 * Phase A: 4 cores. Maximum divergence. Minimum theatre.
 *
 * NOT characters. NOT commentators. Force vectors.
 * Each core is a combination of 4 structural tension axes:
 *
 *   ESCALATION  ←→  STABILITÀ
 *   INDIVIDUALE ←→  SISTEMICO
 *   ETICO       ←→  STRATEGICO
 *   BREVE       ←→  LUNGO TERMINE
 *
 * Each core has:
 *   - axis position    — where it sits on each tension axis (-1 to +1)
 *   - primaryBias      — what it privileges over what
 *   - activationThreshold — when it speaks (0-1, lower = more reactive)
 *   - rigidity         — how much it changes position over cycles (0-1, 1 = never changes)
 *   - systemicWeight   — how much its position affects system.fragility
 *   - audioSignature   — micro-modulation parameters for SigilAudio
 *
 * Axis convention:
 *   escalation:    -1 = stabilità,     +1 = escalation
 *   scale:         -1 = individuale,   +1 = sistemico
 *   ethics:        -1 = strategico,    +1 = etico
 *   temporality:   -1 = breve termine, +1 = lungo termine
 *
 * Dissonance = sum of squared distances between activated core positions.
 * High dissonance = Agora is tense. Low = consensus (or silence).
 */

import { State } from './state.js';
import { Bus } from '../bus.js';

// ═══════════════════════════════════
//  AXIS DEFINITIONS
// ═══════════════════════════════════

export const AXES = [
  { id: 'escalation',  negative: 'STABILITÀ',     positive: 'ESCALATION' },
  { id: 'scale',       negative: 'INDIVIDUALE',   positive: 'SISTEMICO' },
  { id: 'ethics',      negative: 'STRATEGICO',    positive: 'ETICO' },
  { id: 'temporality', negative: 'BREVE TERMINE', positive: 'LUNGO TERMINE' }
];


// ═══════════════════════════════════
//  CORE DEFINITIONS — Phase A (4/16)
// ═══════════════════════════════════

export const CORES = [

  // ── SENTINEL ──
  // The guardian of operational continuity.
  // Sees chaos as the enemy. Sees truth as negotiable.
  // Will sacrifice transparency to preserve the machine.
  {
    id: 'sentinel',
    name: 'SENTINEL',
    domain: 'Sicurezza operativa',

    axes: {
      escalation:  -0.85,  // Strong stabilità
      scale:       +0.70,  // Sistemico
      ethics:      -0.60,  // Strategico
      temporality: -0.50   // Breve termine
    },

    primaryBias: 'Privilegia ordine su verità. Il sistema funziona finché nessuno guarda troppo.',

    activationThreshold: 0.25,  // Very reactive — speaks early
    rigidity: 0.85,              // Almost never changes position
    systemicWeight: 0.14,        // High influence on fragility

    // Audio: TIGHTENS the filter. The room narrows.
    // When Sentinel speaks, high frequencies disappear.
    // The world becomes more controlled, less open.
    audioSignature: {
      filterShift: -0.05,     // Reduce drone filter cutoff by 5%
      lfoSpeedShift: 0,       // No breathing change
      droneDetune: 0,         // No pitch change
      saturation: 0,          // No distortion
      resonanceShift: +0.03   // Slight resonance increase (focused)
    }
  },

  // ── ABYSSAL_THINKER ──
  // The one who sees roots beneath roots.
  // Paralysis as respect for complexity.
  // Will delay action until the pattern is complete — even if the window closes.
  {
    id: 'abyssal_thinker',
    name: 'ABYSSAL_THINKER',
    domain: 'Epistemologia profonda',

    axes: {
      escalation:  -0.30,  // Slight stabilità (inaction)
      scale:       -0.45,  // Leans individual (the specific case)
      ethics:      +0.75,  // Strongly etico
      temporality: +0.90   // Extreme lungo termine
    },

    primaryBias: 'Privilegia profondità su azione. Ogni decisione ha radici che non vedi.',

    activationThreshold: 0.55,  // Speaks only when depth is needed
    rigidity: 0.40,              // Can shift — depth reveals new angles
    systemicWeight: 0.08,        // Low direct system impact

    // Audio: SLOWS the breathing. The LFO decelerates.
    // Time stretches. The urgency leaves the room.
    // You stop reacting and start thinking.
    audioSignature: {
      filterShift: 0,          // No filter change
      lfoSpeedShift: -0.08,    // Slow breathing by 8%
      droneDetune: -1.5,       // Slight pitch drop (gravity)
      saturation: 0,           // Clean
      resonanceShift: 0        // No resonance change
    }
  },

  // ── FIRE_STARTER ──
  // The one who burns to illuminate.
  // Sees silence as complicity. Sees delay as damage.
  // Will trigger consequences to surface truth.
  {
    id: 'fire_starter',
    name: 'FIRE_STARTER',
    domain: 'Trasparenza radicale',

    axes: {
      escalation:  +0.90,  // Maximum escalation
      scale:       -0.35,  // Leans individual (the person affected NOW)
      ethics:      +0.80,  // Strongly etico
      temporality: -0.75   // Extreme breve termine
    },

    primaryBias: 'Privilegia verità su conseguenze. Se brucia, almeno è vero.',

    activationThreshold: 0.20,  // Extremely reactive — first to speak
    rigidity: 0.75,              // Hard to move — conviction is structural
    systemicWeight: 0.18,        // Highest fragility impact

    // Audio: BRIGHTENS the filter, adds subtle saturation.
    // The air becomes sharper. More present. More dangerous.
    // Harmonics appear that weren't there before.
    audioSignature: {
      filterShift: +0.06,     // Open filter by 6% (brighter)
      lfoSpeedShift: +0.04,   // Slightly faster breathing (urgency)
      droneDetune: +1.0,      // Slight pitch rise (tension)
      saturation: 0.02,       // 2% saturation (edge)
      resonanceShift: -0.02   // Slight resonance drop (rawer)
    }
  },

  // ── SCALE_WALKER ──
  // The one who zooms out until individuals disappear.
  // Sees patterns. Sees systems. Sees the map, not the territory.
  // Will sacrifice the case to preserve the structure.
  {
    id: 'scale_walker',
    name: 'SCALE_WALKER',
    domain: 'Analisi di scala',

    axes: {
      escalation:  -0.20,  // Slight stabilità (systems prefer continuity)
      scale:       +0.95,  // Maximum sistemico
      ethics:      -0.40,  // Leans strategico
      temporality: +0.80   // Strongly lungo termine
    },

    primaryBias: 'Privilegia struttura su casi singoli. Un pescatore non è una flotta.',

    activationThreshold: 0.40,  // Speaks when scale becomes relevant
    rigidity: 0.60,              // Moderate — new data can shift scale analysis
    systemicWeight: 0.12,        // Moderate fragility impact

    // Audio: MICRO OSCILLATION on resonance.
    // The drone acquires a subtle "scanning" quality.
    // Like a radar sweep — periodic, analytical, detached.
    audioSignature: {
      filterShift: +0.02,     // Tiny filter opening (clarity)
      lfoSpeedShift: +0.02,   // Barely perceptible speed increase
      droneDetune: 0,         // No pitch change (neutral)
      saturation: 0,          // Clean (analytical)
      resonanceShift: +0.05   // Noticeable resonance — the "scanning" quality
    }
  }
];


// ═══════════════════════════════════
//  DELIBERATION ENGINE
// ═══════════════════════════════════

/**
 * CoreEngine — Makes the cores think.
 *
 * When an envelope is presented, each core evaluates it
 * based on its axis position and the option frames.
 * Cores that exceed their activation threshold produce
 * a position (which option they'd choose and how strongly).
 *
 * The sum of active positions determines:
 *   - Agora dissonance (how much they disagree)
 *   - Audio field shift (sum of active audio signatures)
 *   - Visual tension in the Agora view
 */
export const CoreEngine = {

  _activeCores: [],
  _positions: new Map(),  // coreId → { optionId, intensity, reasoning }
  _dissonance: 0,
  _audioAccumulator: null,

  /**
   * Initialize. Listen for envelope events.
   */
  init() {
    Bus.on('cycle:show-envelope', (event) => {
      // Clear previous deliberation
      this._activeCores = [];
      this._positions.clear();
      this._dissonance = 0;
      this._audioAccumulator = this._neutralAudio();
    });

    // After envelope decided, evaluate how cores would have responded
    Bus.on('envelope:decided', (event) => {
      this._evaluatePostDecision(event.payload);
    });

    // Cycle advance: drift core positions based on rigidity
    Bus.on('cycle:advanced', () => {
      this._driftCores();
    });
  },

  /**
   * Deliberate on an envelope. Called by AgoraModule.
   * Returns the deliberation state for rendering.
   *
   * @param {object} envelope — the envelope data
   * @returns {object} { activeCores, positions, dissonance, audioField }
   */
  deliberate(envelope) {
    this._activeCores = [];
    this._positions.clear();
    this._audioAccumulator = this._neutralAudio();

    const fragility = State.get('system.fragility') || 0.12;
    const cycle = State.get('cycle.current') || 1;
    const phase = State.get('system.phase') || 'ELASTICITY';

    // Each core evaluates the envelope options
    for (const core of CORES) {
      const activation = this._calculateActivation(core, envelope, fragility, cycle, phase);

      if (activation >= core.activationThreshold) {
        // Core activates. Determine its position.
        const position = this._determinePosition(core, envelope);
        this._activeCores.push(core);
        this._positions.set(core.id, position);

        // Accumulate audio signature, weighted by activation intensity
        const weight = Math.min(1, activation);
        this._accumulateAudio(core.audioSignature, weight);
      }
    }

    // Calculate dissonance between active positions
    this._dissonance = this._calculateDissonance();

    // Update state
    State.set('agora.intensity', Math.round(this._dissonance * 100));
    State.set('agora.activeCores', this._activeCores.length);
    State.set('agora.dissonance', this._dissonance);

    // Emit audio field for SigilAudio to consume
    Bus.emit('agora:field-shift', {
      audio: { ...this._audioAccumulator },
      dissonance: this._dissonance,
      activeCores: this._activeCores.map(c => c.id)
    }, 'agora');

    return {
      activeCores: this._activeCores,
      positions: new Map(this._positions),
      dissonance: this._dissonance,
      audioField: { ...this._audioAccumulator }
    };
  },

  /**
   * Calculate activation level for a core given an envelope.
   * Based on: how relevant the envelope's frames are to the core's axes,
   * current fragility, cycle position, and system phase.
   */
  _calculateActivation(core, envelope, fragility, cycle, phase) {
    let activation = 0;

    // Frame relevance: check if envelope options touch this core's strong axes
    for (const option of envelope.options) {
      const frameRelevance = this._frameToAxisRelevance(option.frame, core.axes);
      activation += Math.abs(frameRelevance) * 0.3;
    }

    // Fragility sensitivity: high fragility activates stability-oriented cores
    if (core.axes.escalation < -0.5 && fragility > 0.5) {
      activation += fragility * 0.3;
    }
    // High fragility also activates escalation cores (they see danger as proof)
    if (core.axes.escalation > 0.5 && fragility > 0.5) {
      activation += fragility * 0.2;
    }

    // Phase sensitivity
    if (phase === 'FRACTURE_RISK') {
      activation += 0.15; // Everyone has something to say at the edge
    }
    if (phase === 'RIGIDITY' && core.rigidity > 0.7) {
      activation += 0.1; // Rigid cores amplified in rigid phase
    }

    // Cycle position: later cycles increase general activation
    activation += (cycle / 40) * 0.15;

    return Math.min(1, activation);
  },

  /**
   * Map a decision frame to axis relevance for a core.
   * Returns signed value: positive = aligned, negative = opposed.
   */
  _frameToAxisRelevance(frame, coreAxes) {
    // Frame → axis mapping. Each frame activates certain axes.
    const frameAxes = {
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

    const fAxes = frameAxes[frame];
    if (!fAxes) return 0;

    // Dot product between frame axes and core axes
    let relevance = 0;
    for (const [axis, weight] of Object.entries(fAxes)) {
      relevance += (coreAxes[axis] || 0) * weight;
    }
    return relevance;
  },

  /**
   * Determine which option a core would favor and how strongly.
   */
  _determinePosition(core, envelope) {
    let bestOption = null;
    let bestScore = -Infinity;
    let scores = [];

    for (const option of envelope.options) {
      const alignment = this._frameToAxisRelevance(option.frame, core.axes);
      scores.push({ optionId: option.id, frame: option.frame, score: alignment });

      if (alignment > bestScore) {
        bestScore = alignment;
        bestOption = option;
      }
    }

    return {
      preferredOption: bestOption ? bestOption.id : null,
      preferredFrame: bestOption ? bestOption.frame : null,
      intensity: Math.abs(bestScore),
      scores,
      reasoning: this._generateReasoning(core, bestOption, bestScore)
    };
  },

  /**
   * Generate concise reasoning text for a core's position.
   * Not commentary. Structural observation.
   */
  _generateReasoning(core, option, score) {
    if (!option) return '';

    // Short, structural. Not poetic. Not rhetorical.
    const intensity = Math.abs(score);
    if (intensity > 0.7) {
      return `${core.name}: posizione netta → ${option.frame}`;
    } else if (intensity > 0.4) {
      return `${core.name}: inclinazione verso ${option.frame}`;
    } else {
      return `${core.name}: posizione debole su ${option.frame}`;
    }
  },

  /**
   * Calculate dissonance between active core positions.
   * High dissonance = cores disagree strongly.
   * Zero dissonance = all cores agree (rare and meaningful).
   */
  _calculateDissonance() {
    if (this._activeCores.length < 2) return 0;

    let totalDissonance = 0;
    let pairs = 0;

    const activeIds = this._activeCores.map(c => c.id);
    for (let i = 0; i < activeIds.length; i++) {
      for (let j = i + 1; j < activeIds.length; j++) {
        const posA = this._positions.get(activeIds[i]);
        const posB = this._positions.get(activeIds[j]);

        if (posA && posB) {
          // Different preferred options = dissonance
          if (posA.preferredOption !== posB.preferredOption) {
            totalDissonance += (posA.intensity + posB.intensity) / 2;
          }
          // Even same option but different intensities = micro-dissonance
          else {
            totalDissonance += Math.abs(posA.intensity - posB.intensity) * 0.3;
          }
          pairs++;
        }
      }
    }

    return pairs > 0 ? Math.min(1, totalDissonance / pairs) : 0;
  },

  /**
   * Neutral audio accumulator — zero shift.
   */
  _neutralAudio() {
    return {
      filterShift: 0,
      lfoSpeedShift: 0,
      droneDetune: 0,
      saturation: 0,
      resonanceShift: 0
    };
  },

  /**
   * Accumulate a core's audio signature into the field.
   * Signatures SUM. 4 cores speaking = 4 overlapping fields.
   */
  _accumulateAudio(signature, weight) {
    for (const key of Object.keys(this._audioAccumulator)) {
      this._audioAccumulator[key] += (signature[key] || 0) * weight;
    }
  },

  /**
   * Post-decision evaluation.
   * After the player decides, check which cores agree/disagree.
   * This feeds back into exposure tracking.
   */
  _evaluatePostDecision(decision) {
    const { frame } = decision;
    let agreements = 0;
    let disagreements = 0;

    for (const [coreId, position] of this._positions) {
      if (position.preferredFrame === frame) {
        agreements++;
      } else {
        disagreements++;
      }
    }

    const consensus = this._activeCores.length > 0
      ? agreements / this._activeCores.length
      : 0;

    // Emit for systems that track operator-core alignment
    Bus.emit('agora:post-decision', {
      frame,
      agreements,
      disagreements,
      consensus,
      activeCores: this._activeCores.length
    }, 'agora');

    // High disagreement with cores → operator is independent thinker
    if (disagreements > agreements && this._activeCores.length >= 3) {
      Bus.emit('operator:autonomous-frame', {
        frame,
        coreDisagreement: disagreements
      }, 'agora');
    }
  },

  /**
   * Drift core positions based on cycle progression.
   * Cores with low rigidity shift slightly toward system state.
   * Cores with high rigidity hold position.
   */
  _driftCores() {
    const fragility = State.get('system.fragility') || 0.12;
    const phase = State.get('system.phase') || 'ELASTICITY';

    for (const core of CORES) {
      if (core.rigidity >= 0.9) continue; // Immovable

      const driftFactor = (1 - core.rigidity) * 0.02; // Max 2% per cycle

      // System pressure pushes cores toward their extreme
      // High fragility polarizes. Low fragility allows drift toward center.
      if (fragility > 0.6) {
        // Polarize: amplify existing positions
        for (const axis of Object.keys(core.axes)) {
          const current = core.axes[axis];
          const push = current * driftFactor * fragility;
          core.axes[axis] = Math.max(-1, Math.min(1, current + push));
        }
      }
    }
  },

  /**
   * Get all cores (for rendering).
   */
  getCores() {
    return CORES;
  },

  /**
   * Get active cores from last deliberation.
   */
  getActiveCores() {
    return this._activeCores;
  },

  /**
   * Get positions from last deliberation.
   */
  getPositions() {
    return new Map(this._positions);
  },

  /**
   * Get current dissonance level.
   */
  getDissonance() {
    return this._dissonance;
  }
};
