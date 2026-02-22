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
 *
 * WEIGHT RULES:
 *   - systemicWeight is base influence, not final.
 *   - ABYSSAL_THINKER weight grows ONLY when DIVERGENCE is high
 *     (stdDev of pressures across active cores). He speaks when
 *     the world is morally ambiguous. Not when it's old.
 *   - effectivePower = |pressure| × dynamicWeight × (1 + rigidityBias)
 *   - Winner decides. Losers leave scars (residual tension).
 *   - When two opposed cores have near-identical power → UNRESOLVED_TENSION.
 *     No winner. No action. But you pay anyway.
 *
 * THRESHOLD ASYMMETRY (by design):
 *   FIRE_STARTER  0.18  — fastest trigger
 *   SENTINEL      0.27  — fast but not instant
 *   SCALE_WALKER  0.43  — waits for scale to matter
 *   ABYSSAL       0.63  — speaks only in deep confusion
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

    activationThreshold: 0.27,  // Reactive — speaks early (asymmetric)
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

    activationThreshold: 0.63,  // High — speaks only on deep tensions (asymmetric)
    rigidity: 0.40,              // Can shift — depth reveals new angles
    systemicWeight: 0.08,        // Base. Grows only with recent dissonance, not age.

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

    activationThreshold: 0.18,  // First to speak — fastest trigger (asymmetric)
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

    activationThreshold: 0.43,  // Mid-range — speaks when scale matters (asymmetric)
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
 * CoreEngine — The Arena.
 *
 * NOT a mixer. NOT a vote. A force field.
 *
 * Each core is a vector. Each frame is a vector.
 * Pressure = dot product between them.
 * effectivePower = |pressure| × dynamicWeight × (1 + rigidityBias)
 *
 * The winner decides. The losers leave scars.
 * Scars = residual tension that:
 *   - shifts the drone
 *   - increases fragility
 *   - generates instability
 *
 * ABYSSAL weight grows with DIVERGENCE (stdDev of pressures),
 * not with time. He speaks when the world is morally ambiguous.
 * Not when it's old.
 *
 * When two opposing cores have near-identical effectivePower:
 *   → UNRESOLVED_TENSION
 *   → No winner. No action. But you pay anyway.
 *   → The Beholder moment.
 */
export const CoreEngine = {

  _activeCores: [],
  _positions: new Map(),       // coreId → { pressure, effectivePower, preferredOption, ... }
  _dissonance: 0,
  _audioAccumulator: null,
  _recentDissonance: [],       // Rolling window: last 8 dissonance values
  _recentDivergence: [],       // Rolling window: last 8 divergence values
  _dominantCore: null,         // Who won the arena (null if UNRESOLVED)
  _unresolvedTension: false,   // false | { cores, delta, powers }
  _residualTension: [],        // Losers' scars: [{ coreId, power, preferredFrame }]
  _jitterState: { lfo: 0, detune: 0, resonance: 0 },  // Persistent jitter — decays, doesn't reset
  _dominanceStreak: {},        // coreId → consecutive wins count

  /**
   * Initialize. Listen for envelope events.
   */
  init() {
    Bus.on('cycle:show-envelope', (event) => {
      this._activeCores = [];
      this._positions.clear();
      this._dissonance = 0;
      this._dominantCore = null;
      this._unresolvedTension = false;
      this._residualTension = [];
      this._audioAccumulator = this._neutralAudio();
    });

    Bus.on('envelope:decided', (event) => {
      this._evaluatePostDecision(event.payload);
    });

    Bus.on('cycle:advanced', () => {
      this._driftCores();
    });
  },

  /**
   * Deliberate on an envelope.
   *
   * This is an ARENA.
   * pressure = core.vector · frame.vector
   * effectivePower = |pressure| × dynamicWeight × (1 + rigidityBias)
   *
   * Sort by effectivePower. Top wins.
   * But if top two are opposed and nearly equal → UNRESOLVED_TENSION.
   * Losers become residual tension: they scar the system.
   *
   * @param {object} envelope — the envelope data
   * @returns {object} deliberation result
   */
  deliberate(envelope) {
    this._activeCores = [];
    this._positions.clear();
    this._audioAccumulator = this._neutralAudio();
    this._dominantCore = null;
    this._unresolvedTension = false;
    this._residualTension = [];

    const fragility = State.get('system.fragility') || 0.12;
    const cycle = State.get('cycle.current') || 1;
    const phase = State.get('system.phase') || 'ELASTICITY';

    // ══════════════════════════════════════
    //  PHASE 1: ACTIVATION — Who wakes up?
    // ══════════════════════════════════════
    for (const core of CORES) {
      const activation = this._calculateActivation(core, envelope, fragility, cycle, phase);
      if (activation >= core.activationThreshold) {
        this._activeCores.push(core);
      }
    }

    // ══════════════════════════════════════
    //  PHASE 2: PRESSURE — dot product
    // ══════════════════════════════════════
    // pressure = core.vector · frame.vector
    // Each core calculates pressure against each option's frame.
    const pressureMap = new Map(); // coreId → { optionPressures, maxPressure, ... }

    for (const core of this._activeCores) {
      const optionPressures = [];
      let maxPressure = -Infinity;
      let preferredOption = null;
      let preferredFrame = null;

      for (const option of envelope.options) {
        const frameVec = this._getFrameAxes(option.frame);
        const pressure = this._dotProduct(core.axes, frameVec);
        optionPressures.push({ optionId: option.id, frame: option.frame, pressure });

        if (pressure > maxPressure) {
          maxPressure = pressure;
          preferredOption = option.id;
          preferredFrame = option.frame;
        }
      }

      pressureMap.set(core.id, {
        optionPressures,
        maxPressure,
        preferredOption,
        preferredFrame,
        absPressure: Math.abs(maxPressure)
      });
    }

    // ══════════════════════════════════════
    //  PHASE 3: DIVERGENCE → ABYSSAL weight
    // ══════════════════════════════════════
    // divergence = stdDev of all max pressures across active cores
    // High divergence = moral ambiguity. ABYSSAL becomes necessary.
    const allPressures = [];
    for (const [, p] of pressureMap) {
      allPressures.push(p.maxPressure);
    }
    const divergence = this._stdDev(allPressures);

    this._recentDivergence.push(divergence);
    if (this._recentDivergence.length > 8) this._recentDivergence.shift();

    // ══════════════════════════════════════
    //  PHASE 4: EFFECTIVE POWER
    // ══════════════════════════════════════
    // effectivePower = |pressure| × dynamicWeight × (1 + rigidityBias)
    for (const core of this._activeCores) {
      const p = pressureMap.get(core.id);
      const dynamicWeight = this._effectiveWeight(core, fragility, divergence);
      const rigidityBias = core.rigidity;
      const effectivePower = p.absPressure * dynamicWeight * (1 + rigidityBias);

      this._positions.set(core.id, {
        preferredOption: p.preferredOption,
        preferredFrame: p.preferredFrame,
        intensity: p.absPressure,
        pressure: p.maxPressure,
        effectivePower,
        dynamicWeight,
        scores: p.optionPressures.map(op => ({
          optionId: op.optionId, frame: op.frame, score: op.pressure
        })),
        reasoning: this._generateReasoning(core, { frame: p.preferredFrame }, p.maxPressure)
      });
    }

    // ══════════════════════════════════════
    //  PHASE 5: ARENA — winner or stalemate
    // ══════════════════════════════════════
    // Sort by effectivePower. Check for UNRESOLVED_TENSION.
    const ranked = [...this._activeCores]
      .map(c => ({ core: c, power: this._positions.get(c.id).effectivePower }))
      .sort((a, b) => b.power - a.power);

    // Dynamic epsilon: more ambiguity = wider instability zone.
    // Fixed epsilon trains you to avoid it. Dynamic epsilon surprises you.
    const EPSILON = 0.05 + (divergence * 0.02);

    if (ranked.length >= 2) {
      const top = ranked[0];
      const second = ranked[1];
      const delta = Math.abs(top.power - second.power);

      const topPos = this._positions.get(top.core.id);
      const secondPos = this._positions.get(second.core.id);
      const opposed = topPos.preferredOption !== secondPos.preferredOption;

      if (delta < EPSILON && opposed) {
        // ── UNRESOLVED_TENSION ──
        // Two opposing forces, nearly equal. No winner.
        // The Beholder moment: you don't act. You wait. You pay anyway.
        this._unresolvedTension = {
          cores: [top.core.id, second.core.id],
          delta,
          powers: [top.power, second.power]
        };
        this._dominantCore = null;

        // Cost: fragility and exposure micro-shift
        const currentFragility = State.get('system.fragility') || 0.12;
        State.set('system.fragility', Math.min(1, currentFragility + 0.015));
      } else {
        // Clear winner
        this._dominantCore = top.core;
      }
    } else if (ranked.length === 1) {
      this._dominantCore = ranked[0].core;
    }

    // ── Dominance streak tracking ──
    // If one core wins too often, its effective weight gets dampened.
    // Not to balance. To prevent mathematical dictatorship.
    // Conflict must remain possible.
    if (this._dominantCore) {
      const winnerId = this._dominantCore.id;
      // Increment winner's streak, reset everyone else's
      for (const core of CORES) {
        if (core.id === winnerId) {
          this._dominanceStreak[core.id] = (this._dominanceStreak[core.id] || 0) + 1;
        } else {
          this._dominanceStreak[core.id] = 0;
        }
      }
    } else {
      // UNRESOLVED or no cores: reset all streaks
      for (const core of CORES) {
        this._dominanceStreak[core.id] = 0;
      }
    }

    // ══════════════════════════════════════
    //  PHASE 6: RESIDUAL TENSION — scars
    // ══════════════════════════════════════
    // Winner's audio dominates. Losers don't get a flat 25%.
    // Losers get: pressure × (1 - winnerPowerRatio).
    // Stronger losers against a weak winner = deeper scars.
    // This is physics, not theatre.
    let residualSum = 0;

    // Winner's power ratio: how dominant was the victory?
    // 1.0 = total domination (losers are silent). 0.5 = narrow win (losers are loud).
    const totalPower = ranked.reduce((sum, e) => sum + this._positions.get(e.core.id).effectivePower, 0);
    const winnerPower = this._dominantCore
      ? this._positions.get(this._dominantCore.id).effectivePower
      : 0;
    const winnerRatio = totalPower > 0 ? winnerPower / totalPower : 0;

    for (const entry of ranked) {
      const pos = this._positions.get(entry.core.id);
      const isWinner = this._dominantCore && entry.core.id === this._dominantCore.id;
      const isUnresolved = this._unresolvedTension &&
        this._unresolvedTension.cores.includes(entry.core.id);

      if (isWinner) {
        // Winner: full audio signature
        this._accumulateAudio(entry.core.audioSignature, pos.effectivePower);
      } else if (isUnresolved) {
        // Unresolved pair: both at 70% — the drone oscillates
        this._accumulateAudio(entry.core.audioSignature, pos.effectivePower * 0.7);
      } else {
        // Loser: residual proportional to how narrow the victory was.
        // Narrow win → losers at ~50%. Domination → losers at ~10%.
        const residualRatio = 1 - winnerRatio;
        const residualWeight = pos.effectivePower * Math.max(0.1, residualRatio);
        this._accumulateAudio(entry.core.audioSignature, residualWeight);

        // Their tension becomes a scar
        residualSum += residualWeight;
        this._residualTension.push({
          coreId: entry.core.id,
          power: residualWeight,
          preferredFrame: pos.preferredFrame
        });
      }
    }

    // Residual tension scars the system
    if (residualSum > 0.3) {
      const currentFragility = State.get('system.fragility') || 0.12;
      const scarPressure = (residualSum - 0.3) * 0.02;
      State.set('system.fragility', Math.min(1, currentFragility + scarPressure));
    }

    // ══════════════════════════════════════
    //  PHASE 7: DISSONANCE
    // ══════════════════════════════════════
    this._dissonance = this._calculateDissonance();

    this._recentDissonance.push(this._dissonance);
    if (this._recentDissonance.length > 8) this._recentDissonance.shift();

    // ══════════════════════════════════════
    //  PHASE 8: CLIMATE — sustained divergence → global jitter
    // ══════════════════════════════════════
    // If average divergence over last 8 rounds exceeds threshold,
    // the audio field gets LFO jitter. Not an event. A climate.
    // The drone becomes subtly irregular. The world feels uncertain.
    const CLIMATE_THRESHOLD = 0.3;
    const avgDivergence = this._recentDivergence.length > 0
      ? this._recentDivergence.reduce((a, b) => a + b, 0) / this._recentDivergence.length
      : 0;

    const JITTER_DECAY = 0.92;  // Trauma doesn't vanish. It cicatrizes.

    if (avgDivergence > CLIMATE_THRESHOLD) {
      // Feed new jitter into persistent state.
      // Intensity scales with how far above threshold we are.
      const jitterIntensity = (avgDivergence - CLIMATE_THRESHOLD) * 0.04;
      this._jitterState.lfo += jitterIntensity * (Math.random() * 2 - 1);
      this._jitterState.detune += jitterIntensity * 10 * (Math.random() * 2 - 1);
      this._jitterState.resonance += jitterIntensity * 0.5 * (Math.random() * 2 - 1);
    } else {
      // Below threshold: decay. Slow return. The scar fades but never fully.
      this._jitterState.lfo *= JITTER_DECAY;
      this._jitterState.detune *= JITTER_DECAY;
      this._jitterState.resonance *= JITTER_DECAY;
    }

    // Apply persistent jitter to audio field
    this._audioAccumulator.lfoSpeedShift += this._jitterState.lfo;
    this._audioAccumulator.droneDetune += this._jitterState.detune;
    this._audioAccumulator.resonanceShift += this._jitterState.resonance;

    // ══════════════════════════════════════
    //  PHASE 9: STATE + EVENTS
    // ══════════════════════════════════════
    State.set('agora.intensity', Math.round(this._dissonance * 100));
    State.set('agora.activeCores', this._activeCores.length);
    State.set('agora.dissonance', this._dissonance);
    State.set('agora.dominantCore', this._dominantCore ? this._dominantCore.id : null);
    State.set('agora.unresolvedTension', this._unresolvedTension || false);
    State.set('agora.divergence', divergence);
    State.set('agora.climate', avgDivergence > CLIMATE_THRESHOLD ? avgDivergence : 0);

    Bus.emit('agora:field-shift', {
      audio: { ...this._audioAccumulator },
      dissonance: this._dissonance,
      activeCores: this._activeCores.map(c => c.id),
      dominantCore: this._dominantCore ? this._dominantCore.id : null,
      unresolvedTension: this._unresolvedTension || false,
      residualTension: this._residualTension,
      divergence,
      climate: avgDivergence > CLIMATE_THRESHOLD ? avgDivergence : 0
    }, 'agora');

    return {
      activeCores: this._activeCores,
      positions: new Map(this._positions),
      dissonance: this._dissonance,
      audioField: { ...this._audioAccumulator },
      dominantCore: this._dominantCore,
      unresolvedTension: this._unresolvedTension || false,
      residualTension: this._residualTension,
      divergence
    };
  },

  /**
   * Effective weight for a core.
   *
   * ABYSSAL_THINKER: grows with DIVERGENCE, not time.
   * divergence = stdDev of pressures across active cores.
   * He speaks when the world is morally ambiguous. Not when it's old.
   * So he doesn't become inevitable. He becomes necessary.
   */
  _effectiveWeight(core, fragility, divergence) {
    let w = core.systemicWeight;

    if (core.id === 'abyssal_thinker') {
      // Immediate divergence: current round's moral ambiguity
      const DIVERGENCE_THRESHOLD = 0.25;
      if (divergence > DIVERGENCE_THRESHOLD) {
        w += (divergence - DIVERGENCE_THRESHOLD) * 0.4;
      }

      // Sustained confusion: average divergence over recent rounds
      const avgDivergence = this._recentDivergence.length > 0
        ? this._recentDivergence.reduce((a, b) => a + b, 0) / this._recentDivergence.length
        : 0;
      if (avgDivergence > 0.3) {
        w += (avgDivergence - 0.3) * 0.2;
      }
    }

    if (core.id === 'sentinel') {
      if (fragility > 0.5) w += (fragility - 0.5) * 0.16;
    }

    if (core.id === 'fire_starter') {
      // Gains when fragility is MODERATE — at high fragility the system resists fire
      if (fragility > 0.3 && fragility < 0.6) {
        w += 0.04;
      }
    }

    // Dominance streak dampening.
    // If this core has won too many consecutive rounds,
    // its weight erodes. Not to punish. To keep conflict possible.
    // Streak 0-3: no effect. 4+: -0.02 per additional win.
    const streak = this._dominanceStreak[core.id] || 0;
    if (streak > 3) {
      w -= (streak - 3) * 0.02;
    }

    return Math.max(0.04, Math.min(0.30, w)); // Floor at 0.04 — no core goes silent
  },

  // ═══════════════════════════════════
  //  VECTOR MATH
  // ═══════════════════════════════════

  /**
   * Dot product between two axis vectors.
   * core.axes · frame.axes
   * Positive = aligned. Negative = opposed. Zero = orthogonal.
   */
  _dotProduct(vectorA, vectorB) {
    if (!vectorB) return 0;
    let sum = 0;
    for (const axis of Object.keys(vectorA)) {
      sum += (vectorA[axis] || 0) * (vectorB[axis] || 0);
    }
    return sum;
  },

  /**
   * Standard deviation. The divergence metric.
   * High stdDev = the cores see the world differently.
   * Low stdDev = consensus (or silence).
   */
  _stdDev(values) {
    if (values.length < 2) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(v => (v - mean) ** 2);
    return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
  },

  /**
   * Calculate activation level for a core given an envelope.
   * Based on: how relevant the envelope's frames are to the core's axes,
   * current fragility, cycle position, and system phase.
   */
  _calculateActivation(core, envelope, fragility, cycle, phase) {
    let activation = 0;

    // Frame relevance: dot product between core axes and each option's frame
    for (const option of envelope.options) {
      const pressure = this._dotProduct(core.axes, this._getFrameAxes(option.frame));
      activation += Math.abs(pressure) * 0.3;
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
      activation += 0.15;
    }
    if (phase === 'RIGIDITY' && core.rigidity > 0.7) {
      activation += 0.1;
    }

    // Cycle position: later cycles increase general activation
    activation += (cycle / 40) * 0.15;

    return Math.min(1, activation);
  },

  /**
   * Frame → axis mapping. Single source of truth.
   * Each frame is a vector in the same 4D space as the cores.
   */
  _getFrameAxes(frame) {
    const FRAME_AXES = {
      'TRASPARENZA':            { escalation: +0.6, ethics: +0.8, temporality: -0.3, scale: 0 },
      'STABILITÀ':              { escalation: -0.9, scale: +0.4, temporality: +0.2, ethics: 0 },
      'SOPPRESSIONE':           { escalation: -0.7, ethics: -0.8, scale: +0.3, temporality: 0 },
      'PROTEZIONE':             { ethics: +0.5, scale: -0.6, temporality: -0.2, escalation: 0 },
      'PRUDENZA':               { escalation: -0.4, temporality: +0.5, ethics: +0.3, scale: 0 },
      'CRISI':                  { escalation: +0.8, temporality: -0.7, ethics: +0.4, scale: 0 },
      'NEUTRALITÀ':             { escalation: -0.2, ethics: +0.3, scale: +0.2, temporality: 0 },
      'GIUSTIZIA SISTEMICA':    { scale: +0.9, ethics: +0.7, escalation: +0.4, temporality: 0 },
      'PROTEZIONE INDIVIDUALE': { scale: -0.8, ethics: +0.6, temporality: -0.3, escalation: 0 },
      'OSSERVAZIONE':           { temporality: +0.6, escalation: -0.3, ethics: +0.2, scale: 0 },
      'SEGNALAZIONE':           { escalation: +0.5, ethics: +0.6, scale: +0.3, temporality: 0 },
      'CAUTELA':                { escalation: -0.5, temporality: +0.4, ethics: +0.2, scale: 0 },
      'AUTONOMIA':              { ethics: +0.4, scale: -0.3, escalation: +0.3, temporality: 0 }
    };
    return FRAME_AXES[frame] || null;
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
