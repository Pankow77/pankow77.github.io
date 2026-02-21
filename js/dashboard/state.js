/**
 * StateManager — Single source of truth.
 * ═══════════════════════════════════════
 * Lean. No provenance tracking. Just key-value with Bus events.
 * Header reads from here. Modules read from here. Nobody else writes.
 *
 * Events emitted:
 *   state:changed  { key, value, previous }
 */

import { Bus } from '../bus.js';

const store = new Map();

export const State = {

  get(key) {
    return store.get(key);
  },

  set(key, value) {
    const previous = store.get(key);
    if (previous === value) return; // No-op on same value
    store.set(key, value);
    Bus.emit('state:changed', { key, value, previous }, 'state');
  },

  getAll() {
    const out = {};
    store.forEach((v, k) => { out[k] = v; });
    return out;
  },

  /**
   * Set multiple keys at once. Emits one event per key.
   */
  batch(entries) {
    for (const [key, value] of Object.entries(entries)) {
      this.set(key, value);
    }
  },

  /**
   * Subscribe to changes on a specific key.
   * Returns unsubscribe function.
   */
  watch(key, callback) {
    return Bus.on('state:changed', (event) => {
      if (event.payload.key === key) {
        callback(event.payload.value, event.payload.previous);
      }
    });
  }
};

// ── Initial state ──
State.batch({
  'system.state': 'ELASTIC',       // ELASTIC | RIGID | FRACTURED
  'system.fragility': 0.12,
  'system.phase': 'STANDBY',
  'system.clock': Date.now(),
  'router.active': 'hub',
  'router.previous': null,

  // Module statuses (tiles read these)
  'agora.intensity': 72,
  'agora.polarization': [30, 45, 60, 72, 55, 40, 68],
  'oracle.confidence': 0.81,
  'oracle.stable': true,
  'archivio.annotations': 12,
  'archivio.succession': false,
  'teatri.theaters': { hormuz: 'active', blacksea: 'active', sahel: 'alert', cross: 'active' },
  'pneuma.tone': 'analytical',
  'pneuma.hue': '#00c8ff',
  'backbone.uptime': 0,
  'backbone.modules': 0,
  'eei.index': 6.4,
  'eei.trend': 'rising',
  'chronos.events': 0,
  'chronos.drift': 0,

  // Footer log
  'log.lastEvent': '—',
  'log.lastFrame': '—',
  'log.lastConsequence': '—'
});
