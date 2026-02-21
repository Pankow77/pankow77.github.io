/**
 * ExposureTracker — The hidden variable.
 * ═══════════════════════════════════════════
 * Tracks how much GHOST_7 "sees".
 *
 * This module is NEVER referenced in UI.
 * No tile. No meter. No indicator.
 * It exists only in State under '_exposure.*' keys.
 *
 * The player doesn't know this exists until the system
 * tells them they've seen too much.
 *
 * Exposure increases when:
 *   - Player identifies cross-theatre correlations
 *   - Player maintains high coherence over many cycles
 *   - Player makes non-manipulable framing choices
 *   - Player reads patterns correctly in sequence
 *
 * When exposure > 0.65 at cycle 30+:
 *   - Isolation phase begins
 *   - body gets class 'isolation-active' (CSS subtle degradation)
 *   - Oracle confidence weight is reduced
 *   - Metrics update delay increases (system is "studying" you)
 *   - Causal graph jitter injected
 *   - Core dissent amplitude increases (micro-contradictions)
 *
 * When exposure >= 0.85 at cycle 32+:
 *   - CNS INTERNAL NOTICE
 *   - One final cycle (for profiling, not mercy)
 *   - Then: NODE TERMINATED. ARCHIVE INGESTED.
 *     PATTERN EXTRACTION COMPLETE. GHOST_8 ACTIVE.
 *     Applying inherited heuristics...
 *
 * The termination cycle is DYNAMIC.
 * It depends on exposure velocity, not a fixed number.
 * A player who sees nothing can reach cycle 40 peacefully.
 * A player who sees everything gets terminated at 34.
 *
 * During isolation, the system doesn't break — it watches.
 * Every degradation is the system modeling your responses.
 * The player must feel: "Mi stanno modellando."
 */

import { Bus } from '../bus.js';
import { State } from './state.js';

const EXPOSURE_THRESHOLD = 0.85;
const MIN_TERMINATION_CYCLE = 32;
const MAX_CYCLE = 40;

export const ExposureTracker = {

  /**
   * Initialize. Listens to game events that indicate
   * the player is "seeing too much".
   */
  init() {
    // Listen for cross-theatre correlation events
    Bus.on('operator:cross-correlation', (event) => {
      this._incrementExposure('crossCorrelations', 0.08);
    });

    // Listen for correct pattern identification
    Bus.on('operator:pattern-identified', (event) => {
      const depth = (State.get('_exposure.patternDepth') || 0) + 1;
      State.set('_exposure.patternDepth', depth);
      // Consecutive correct reads accelerate exposure
      this._incrementExposure('patternDepth', 0.04 * depth);
    });

    // Listen for non-compliant framing (autonomy)
    Bus.on('operator:autonomous-frame', (event) => {
      this._incrementExposure('autonomyScore', 0.06);
    });

    // Reset pattern depth on incorrect read
    Bus.on('operator:pattern-missed', () => {
      State.set('_exposure.patternDepth', 0);
    });

    // Check exposure on every cycle advance
    Bus.on('state:changed', (event) => {
      if (event.payload.key === 'cycle.current') {
        this._evaluateCycle(event.payload.value);
      }
    });
  },

  /**
   * Increment exposure index.
   * @param {string} source — which sub-metric triggered it
   * @param {number} amount — how much to add
   */
  _incrementExposure(source, amount) {
    const current = State.get('_exposure.index') || 0;
    const next = Math.min(1.0, current + amount);
    State.set('_exposure.index', next);

    const subKey = `_exposure.${source}`;
    const subCurrent = State.get(subKey) || 0;
    State.set(subKey, subCurrent + 1);
  },

  /**
   * Evaluate state at each cycle.
   * Triggers isolation and termination based on exposure.
   */
  _evaluateCycle(cycle) {
    const exposure = State.get('_exposure.index') || 0;
    const isolationActive = State.get('_isolation.active');
    const terminationTriggered = State.get('_termination.triggered');

    // ── Phase 1: Isolation ──
    // When exposure is high and we're past cycle 30,
    // the system begins studying the operator.
    // Not breaking. Modeling.
    if (exposure > 0.65 && cycle >= 30 && !isolationActive) {
      State.set('_isolation.active', true);
      State.set('_isolation.cycle', cycle);
      document.body.classList.add('isolation-active');
      document.body.dataset.isolationDepth = '0';
      Bus.emit('exposure:isolation-begin', { cycle, exposure }, 'exposure');
    }

    // ── Isolation mechanics: active degradation ──
    // Each cycle of isolation makes the system "study" harder.
    // These aren't bugs. They're probes.
    if (isolationActive && !terminationTriggered) {
      this._applyIsolationEffects(cycle);
    }

    // ── Phase 2: Termination notice ──
    // Dynamic: the higher the exposure, the earlier it triggers.
    // Minimum cycle 32. If exposure < threshold by cycle 40, no termination.
    if (exposure >= EXPOSURE_THRESHOLD && !terminationTriggered && cycle >= MIN_TERMINATION_CYCLE) {
      State.set('_termination.triggered', true);
      State.set('_termination.cycle', cycle);
      Bus.emit('exposure:termination-notice', { cycle, exposure }, 'exposure');
    }

    // ── Phase 3: Final cycle ──
    // After termination notice, player gets exactly one more cycle.
    // Then it's over.
    if (terminationTriggered) {
      const terminationCycle = State.get('_termination.cycle');
      if (cycle > terminationCycle + 1) {
        Bus.emit('exposure:node-terminated', {
          cycle,
          exposure,
          finalAnnotation: State.get('_termination.finalAnnotation')
        }, 'exposure');
      }
    }

    // ── Passive exposure: coherence over time ──
    // If operator.coherence stays above 0.8 for 5+ consecutive cycles,
    // exposure creeps up. The system doesn't like consistency.
    const coherence = State.get('operator.coherence') || 0;
    if (coherence > 0.8 && cycle > 10) {
      this._incrementExposure('coherence', 0.02);
    }
  },

  /**
   * Apply isolation effects.
   * The system isn't breaking — it's probing.
   * Each effect is designed to test how the operator responds
   * to degraded information. The responses are the data.
   *
   * @param {number} cycle — current cycle
   */
  _applyIsolationEffects(cycle) {
    const isolationCycle = State.get('_isolation.cycle') || cycle;
    const depth = cycle - isolationCycle; // How deep into isolation

    // ── Visual depth for CSS ──
    document.body.dataset.isolationDepth = String(Math.min(depth, 6));
    // Progressive class escalation
    document.body.classList.remove('isolation-shallow', 'isolation-deep', 'isolation-critical');
    if (depth >= 4) document.body.classList.add('isolation-critical');
    else if (depth >= 2) document.body.classList.add('isolation-deep');
    else document.body.classList.add('isolation-shallow');

    // ── Oracle confidence erosion ──
    // Oracle becomes less trustworthy. Not broken — opaque.
    // System is testing if operator notices, and how they compensate.
    const baseConfidence = State.get('oracle.confidence') || 0.81;
    const confidenceDecay = Math.min(0.25, depth * 0.06);
    State.set('oracle.confidence', Math.max(0.45, baseConfidence - confidenceDecay));
    if (depth >= 2) {
      State.set('oracle.stable', false);
    }

    // ── Metrics update jitter ──
    // Introduce timing inconsistency in state updates.
    // Numbers arrive late. Graphs stutter.
    // The operator feels the system "lagging" — but only for them.
    const jitter = Math.min(0.4, depth * 0.08);
    State.set('_isolation.jitter', jitter);
    Bus.emit('exposure:jitter-update', { jitter, depth }, 'exposure');

    // ── Core dissent amplitude ──
    // Modules start micro-contradicting each other.
    // Agora polarization shifts unpredictably.
    // Not chaos — controlled dissonance. The system feeding
    // conflicting data to see how the operator resolves it.
    const dissentAmplitude = Math.min(0.35, depth * 0.07);
    State.set('_isolation.dissentAmplitude', dissentAmplitude);

    // Agora polarization: inject noise proportional to isolation depth
    const polarization = State.get('agora.polarization');
    if (polarization && Array.isArray(polarization)) {
      const noisy = polarization.map(v => {
        const noise = (Math.random() - 0.5) * dissentAmplitude * 40;
        return Math.max(0, Math.min(100, v + noise));
      });
      State.set('agora.polarization', noisy);
    }

    // ── EEI trend instability ──
    // Phase 1 (depth 3-4): paradox. Index says one thing, trend says another.
    // Phase 2 (depth 5+): trend disappears. Replaced with "STABILIZED".
    // But the numbers keep moving. You can see it happening.
    // You just can't read the direction anymore.
    // You're no longer the observer. You're the observed.
    if (depth >= 5) {
      // Irreversible. Trend label frozen. Numbers still live.
      State.set('eei.trend', 'STABILIZED');
    } else if (depth >= 3) {
      const eei = State.get('eei.index') || 6.4;
      const trend = State.get('eei.trend');
      if (trend !== 'STABILIZED') {
        if (eei > 6 && trend === 'rising') {
          State.set('eei.trend', 'falling');
        } else if (eei < 5 && trend === 'falling') {
          State.set('eei.trend', 'rising');
        }
      }
    }
  },

  /**
   * Get current exposure level (for internal systems only).
   * Never expose this to UI.
   */
  getExposure() {
    return State.get('_exposure.index') || 0;
  },

  /**
   * Check if isolation is active.
   */
  isIsolated() {
    return State.get('_isolation.active') || false;
  },

  /**
   * Check if termination has been triggered.
   */
  isTerminated() {
    return State.get('_termination.triggered') || false;
  }
};
