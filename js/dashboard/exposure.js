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
 * When _exposure.index crosses 0.85:
 *   - Isolation phase begins (subtle degradation)
 *   - Envelope data becomes incomplete
 *   - Oracle confidence becomes opaque
 *   - Core modules show micro-contradictions
 *
 * When cycle reaches termination point:
 *   - CNS INTERNAL NOTICE appears
 *   - Player gets one final cycle
 *   - System wants the last annotation (for profiling)
 *   - Then: NODE TERMINATED. GHOST_8 ACTIVE.
 *
 * The termination cycle is DYNAMIC.
 * It depends on exposure velocity, not a fixed number.
 * A player who sees nothing can reach cycle 40 peacefully.
 * A player who sees everything gets terminated at 34.
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
    // subtle degradation begins.
    if (exposure > 0.65 && cycle >= 30 && !isolationActive) {
      State.set('_isolation.active', true);
      State.set('_isolation.cycle', cycle);
      Bus.emit('exposure:isolation-begin', { cycle, exposure }, 'exposure');
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
