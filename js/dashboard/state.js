/**
 * StateManager — Single source of truth.
 * ═══════════════════════════════════════
 * Lean. No provenance tracking. Just key-value with Bus events.
 * Header reads from here. Modules read from here. Nobody else writes.
 *
 * Events emitted:
 *   state:changed         { key, value, previous }  — single set()
 *   state:batch-changed   { changes: [...] }         — batch(), one emission
 *
 * FIX 3: batch() writes all values first, then emits a SINGLE event
 *        via queueMicrotask. No N re-renders per tick. One snapshot.
 */

import { Bus } from '../bus.js';

const store = new Map();

// ── Microtask batch queue ──
let pendingBatch = null;

export const State = {

  get(key) {
    return store.get(key);
  },

  /**
   * Set a single key. Emits immediately.
   */
  set(key, value) {
    const previous = store.get(key);
    if (previous === value) return;
    store.set(key, value);
    Bus.emit('state:changed', { key, value, previous }, 'state');
  },

  getAll() {
    const out = {};
    store.forEach((v, k) => { out[k] = v; });
    return out;
  },

  /**
   * Set multiple keys at once. Writes all values synchronously,
   * then emits ONE event via microtask with the full changeset.
   * No N re-renders. One snapshot.
   */
  batch(entries) {
    const changes = [];

    for (const [key, value] of Object.entries(entries)) {
      const previous = store.get(key);
      if (previous === value) continue;
      store.set(key, value);
      changes.push({ key, value, previous });
    }

    if (changes.length === 0) return;

    // Accumulate if already batching in this tick
    if (pendingBatch) {
      pendingBatch.push(...changes);
      return;
    }

    pendingBatch = [...changes];

    queueMicrotask(() => {
      const batch = pendingBatch;
      pendingBatch = null;

      // Single emission with all changes
      Bus.emit('state:batch-changed', { changes: batch }, 'state');

      // Also emit individual state:changed for each key
      // (so existing watch() listeners still work)
      // but they fire in the same microtask = one render frame
      batch.forEach(c => {
        Bus.emit('state:changed', c, 'state');
      });
    });
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
// 40-cycle system. Phases: ELASTICITY (1-10), ACCUMULATION (11-20),
// RIGIDITY (21-30), FRACTURE RISK (31-40).
State.batch({
  // System
  'system.state': 'ELASTIC',       // ELASTIC | RIGID | FRACTURED
  'system.fragility': 0.12,
  'system.phase': 'ELASTICITY',    // ELASTICITY | ACCUMULATION | RIGIDITY | FRACTURE_RISK
  'system.clock': Date.now(),

  // Cycle tracking
  'cycle.current': 1,              // 1–40
  'cycle.total': 40,
  'cycle.phase': 'ELASTICITY',     // Mirrors system.phase, derived from cycle.current
  'cycle.ready': false,            // True when envelope decided, reset on advance

  // Router
  'router.active': 'hub',
  'router.previous': null,

  // Operator profile (CNS measures you)
  'operator.node': 'GHOST_7',
  'operator.weight': 1.0,          // Operational weight. Erodes with bad framing.
  'operator.coherence': 1.0,       // Frame consistency over time
  'operator.annotations': 0,       // Written this session

  // ── HIDDEN — not displayed anywhere ──
  // epistemic_exposure tracks how much the operator "sees".
  // Cross-theatre correlation, pattern identification,
  // non-manipulable choices, sustained coherence.
  // When it crosses threshold, CNS initiates termination.
  // The player never sees this number.
  '_exposure.index': 0,             // 0.0–1.0. Threshold: 0.85
  '_exposure.crossCorrelations': 0, // How many cross-theatre links identified
  '_exposure.patternDepth': 0,      // Consecutive correct pattern reads
  '_exposure.autonomyScore': 0,     // Non-compliant framing choices
  '_isolation.active': false,       // True when system begins studying operator
  '_isolation.cycle': 0,            // Cycle when isolation began
  '_isolation.jitter': 0,           // Timing inconsistency injected (0.0–0.4)
  '_isolation.dissentAmplitude': 0, // Core contradiction intensity (0.0–0.35)
  '_termination.triggered': false,  // True when CNS issues notice
  '_termination.cycle': 0,          // Cycle of termination notice
  '_termination.finalAnnotation': false, // Has player written last note

  // PADC — Protocollo di Acquisizione Dati Comportamentali
  '_padc.revealed': false,           // True after annotation privacy reveal
  '_padc.cycle': 0,                  // Cycle when PADC triggered
  '_padc.decision': null,            // 'continue' or 'handoff'
  '_padc.testament': null,           // Message for GHOST_8
  '_padc.performativityTracking': false, // True after PADC — annotations are "performative"

  // Profilo Operativo
  '_profilo.revealed': false,        // True after feature vector reveal
  '_profilo.cycle': 0,               // Cycle when profilo triggered

  // Module statuses (tiles read these)
  'agora.intensity': 72,
  'agora.polarization': [30, 45, 60, 72, 55, 40, 68],
  'oracle.confidence': 0.81,
  'oracle.stable': true,
  'archivio.annotations': 0,
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
