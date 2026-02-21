/**
 * CycleEngine — The heartbeat.
 * ═══════════════════════════════
 * Manages cycle 1→40. Phase transitions. Metric drift.
 * Deterministic. Mechanical. Not narrative.
 *
 * Flow per cycle:
 *   1. Envelope presented → player decides
 *   2. Player explores hub, writes annotation
 *   3. Player clicks LAGO RÀ → advance
 *   4. updateMetrics() → checkPhaseTransition() → incrementCycle()
 *   5. Next envelope presented
 *
 * Events emitted:
 *   cycle:show-envelope   { cycle }           — present this cycle's envelope
 *   cycle:ready           { cycle }           — envelope decided, can advance
 *   cycle:advanced        { cycle, previous } — cycle incremented
 *   cycle:phase-change    { phase, state }    — phase boundary crossed
 */

import { Bus } from '../bus.js';
import { State } from './state.js';

export const CycleEngine = {

  init() {
    // When envelope decided → mark cycle as ready to advance
    Bus.on('envelope:decided', () => {
      State.set('cycle.ready', true);
      Bus.emit('cycle:ready', { cycle: State.get('cycle.current') }, 'cycle');
    });

    // Hub requests advance via LAGO RÀ click
    Bus.on('cycle:advance-requested', () => {
      this.advance();
    });
  },

  /**
   * Present this cycle's envelope.
   * Called at boot and after each advance.
   */
  presentEnvelope() {
    State.set('cycle.ready', false);
    Bus.emit('cycle:show-envelope', { cycle: State.get('cycle.current') }, 'cycle');
  },

  /**
   * Advance to next cycle.
   * Only works if envelope has been decided this cycle.
   */
  advance() {
    if (!State.get('cycle.ready')) return false;

    const current = State.get('cycle.current');
    const max = State.get('cycle.total');

    // Game end: cycle 40 completed
    if (current >= max) {
      State.set('cycle.ready', false);
      State.set('cycle.current', current + 1); // triggers termination check
      return true;
    }

    // 1. Update metrics
    this._updateMetrics(current);

    // 2. Increment
    const next = current + 1;

    // 3. Check phase transition
    this._checkPhaseTransition(next);

    // 4. Set cycle
    State.set('cycle.current', next);
    State.set('cycle.ready', false);

    // 5. Dispatch
    Bus.emit('cycle:advanced', { cycle: next, previous: current }, 'cycle');

    // 6. Present next envelope (small delay for hub to update)
    setTimeout(() => this.presentEnvelope(), 800);

    return true;
  },

  /**
   * End-of-cycle metric drift.
   * Fragility creeps up. System ages.
   */
  _updateMetrics(cycle) {
    const fragility = State.get('system.fragility') || 0.12;
    // Accelerating drift: harder to stay elastic as cycles pass
    const drift = 0.008 + (cycle / 40) * 0.015;

    // Agora: intensity drifts with system pressure
    const intensity = State.get('agora.intensity') || 72;
    const intensityDrift = (Math.random() - 0.3) * 6; // slight upward bias

    // EEI: reacts to fragility
    const eei = State.get('eei.index') || 6.4;
    const eeiDrift = (fragility > 0.5 ? 0.2 : -0.1) + (Math.random() - 0.5) * 0.3;

    State.batch({
      'system.fragility': Math.min(1.0, +(fragility + drift).toFixed(3)),
      'backbone.uptime': Date.now() - State.get('system.clock'),
      'backbone.modules': 4,
      'chronos.events': (State.get('chronos.events') || 0) + 1,
      'chronos.drift': Math.floor(Math.random() * 80),
      'agora.intensity': Math.max(10, Math.min(95, Math.round(intensity + intensityDrift))),
      'eei.index': +Math.max(1, Math.min(10, eei + eeiDrift)).toFixed(1)
    });

    // EEI trend based on direction
    const newEei = State.get('eei.index');
    if (newEei > eei + 0.1) State.set('eei.trend', 'rising');
    else if (newEei < eei - 0.1) State.set('eei.trend', 'falling');
  },

  /**
   * Phase boundaries: ELASTICITY → ACCUMULATION → RIGIDITY → FRACTURE_RISK
   */
  _checkPhaseTransition(cycle) {
    let phase, systemState;

    if (cycle <= 10) {
      phase = 'ELASTICITY';
      systemState = 'ELASTIC';
    } else if (cycle <= 20) {
      phase = 'ACCUMULATION';
      systemState = 'ELASTIC';
    } else if (cycle <= 30) {
      phase = 'RIGIDITY';
      systemState = 'RIGID';
    } else {
      phase = 'FRACTURE_RISK';
      systemState = 'FRACTURED';
    }

    const currentPhase = State.get('system.phase');
    if (phase !== currentPhase) {
      State.batch({
        'system.phase': phase,
        'system.state': systemState,
        'cycle.phase': phase
      });

      Bus.emit('cycle:phase-change', { phase, systemState, cycle }, 'cycle');

      // CSS state classes
      document.body.classList.remove('state-elastic', 'state-rigid', 'state-fractured');
      document.body.classList.add(`state-${systemState.toLowerCase()}`);

      // Log phase change
      State.set('log.lastEvent', `FASE: ${phase}`);
    }
  }
};
