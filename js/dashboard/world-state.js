/**
 * WorldState — The climate layer.
 * ═══════════════════════════════════
 * Lives ABOVE State. Does NOT touch Arena directly.
 * Slow pressures. Permanent memory. Balanced entropy.
 *
 * Each standalone page is an organ, not a sensor.
 * When you visit a page, it alters the world permanently.
 * The next time you enter the dashboard, the arena breathes differently.
 *
 * WorldState tracks:
 *   worldBias      — { escalation, systemic, ethical, horizon }
 *                     Slow-moving 4D pressure from visited modules.
 *                     Range: -1.0 to +1.0 per axis.
 *
 *   structuralDrift — How much infrastructure has shifted (0.0–1.0).
 *                     Urban Chronos, Backbone push this up.
 *                     Stable oracle readings pull it down.
 *
 *   culturalEntropy — Information ecosystem disorder (0.0–1.0).
 *                     Agora polarization, EEI extremes push this up.
 *                     Archivio clarity pulls it down.
 *
 *   moduleMemory   — { moduleId: { visits, lastVisit, pressure, cumulativeDelta } }
 *                     Per-module engagement history.
 *
 * ENTROPY MODEL: Balanced.
 *   - Pages can both PRESSURE and HEAL.
 *   - Healing is slower than damage (asymmetric by design).
 *   - Natural decay exists: without visits, pressures drift toward zero.
 *   - Decay rate: 0.002 per hour of real time. Slow. Geological.
 *
 * COEFFICIENT: k = 0.25
 *   Arena reads: effectiveFrame = baseFrame + worldBias * k
 *   Enough to tilt. Not enough to dictate.
 *
 * PERSISTENCE: localStorage('hybrid-syndicate-world-state')
 *   Survives refresh. Survives tab close. Accumulates across sessions.
 *
 * Events:
 *   world:pressure-received  — a module emitted pressure
 *   world:climate-updated    — bias/drift/entropy changed
 *   world:decay-tick         — natural decay applied
 */

import { Bus } from '../bus.js';

const STORAGE_KEY = 'hybrid-syndicate-world-state';
const DECAY_RATE = 0.002;          // Per hour of real time
const DECAY_INTERVAL = 60_000;     // Check every minute
const HEAL_FACTOR = 0.6;           // Healing is 60% as effective as damage
const PRESSURE_CEILING = 1.0;
const PRESSURE_FLOOR = -1.0;

// ── Module → pressure axis mapping ──
// Which axes each module naturally affects, and in which direction.
// sign > 0 means the module pushes TOWARD that pole.
// sign < 0 means the module pushes AWAY from that pole.
const MODULE_SIGNATURES = {
  'ice-italy':        { escalation: +0.7, systemic: +0.4, ethical: -0.3, horizon: -0.2 },
  'bab-el-mandeb':    { escalation: +0.3, systemic: +0.8, ethical: +0.2, horizon: +0.7 },
  'oracle':           { escalation: -0.2, systemic: +0.6, ethical: +0.5, horizon: +0.4 },
  'agora':            { escalation: +0.4, systemic: +0.3, ethical: +0.6, horizon: -0.3 },
  'archivio-silente': { escalation: -0.3, systemic: +0.2, ethical: +0.4, horizon: +0.6 },
  'backbone':         { escalation: -0.4, systemic: +0.7, ethical: -0.2, horizon: +0.3 },
  'eei-predictor':    { escalation: +0.5, systemic: +0.5, ethical: +0.3, horizon: +0.5 },
  'pneuma':           { escalation: -0.2, systemic: -0.3, ethical: +0.8, horizon: +0.3 },
  'urban-chronos':    { escalation: -0.1, systemic: +0.9, ethical: -0.1, horizon: +0.8 }
};

// ── Default state ──
function defaultWorld() {
  return {
    worldBias: { escalation: 0, systemic: 0, ethical: 0, horizon: 0 },
    structuralDrift: 0,
    culturalEntropy: 0,
    moduleMemory: {},
    lastDecay: Date.now(),
    version: 1
  };
}

// ── Internal state ──
let world = defaultWorld();
let decayTimer = null;

export const WorldState = {

  // ═══════════════════════════════════
  //  INIT — Load from storage, start decay
  // ═══════════════════════════════════

  init() {
    this._load();
    this._applyAccumulatedDecay();
    this._startDecayTimer();
    this._bindEvents();

    Bus.emit('world:climate-updated', this.getClimate(), 'world-state');

    console.log(
      '%c[WORLD] %cClimate loaded. bias=[%.2f, %.2f, %.2f, %.2f] drift=%.3f entropy=%.3f',
      'color: #ff8833; font-weight: bold;',
      'color: #6b7fa3;',
      world.worldBias.escalation,
      world.worldBias.systemic,
      world.worldBias.ethical,
      world.worldBias.horizon,
      world.structuralDrift,
      world.culturalEntropy
    );
  },

  // ═══════════════════════════════════
  //  READ — Arena and Audio read these
  // ═══════════════════════════════════

  /**
   * Get the full climate snapshot.
   * This is what Arena and Audio consume.
   */
  getClimate() {
    return {
      worldBias: { ...world.worldBias },
      structuralDrift: world.structuralDrift,
      culturalEntropy: world.culturalEntropy
    };
  },

  /**
   * Get worldBias as a 4D vector (same axes as cores).
   * Mapped to Arena axis names:
   *   escalation → escalation
   *   systemic   → scale
   *   ethical    → ethics
   *   horizon    → temporality
   */
  getBiasVector() {
    return {
      escalation:  world.worldBias.escalation,
      scale:       world.worldBias.systemic,
      ethics:      world.worldBias.ethical,
      temporality: world.worldBias.horizon
    };
  },

  /**
   * Get module memory for a specific module.
   */
  getModuleMemory(moduleId) {
    return world.moduleMemory[moduleId] || null;
  },

  // ═══════════════════════════════════
  //  WRITE — Only via pressure events
  // ═══════════════════════════════════

  /**
   * Receive pressure from a standalone module.
   *
   * @param {string} moduleId  — which module (e.g., 'ice-italy')
   * @param {number} intensity — 0.0 to 1.0, how intense the interaction was
   * @param {string} direction — 'pressure' or 'heal'
   */
  receivePressure(moduleId, intensity = 0.5, direction = 'pressure') {
    const signature = MODULE_SIGNATURES[moduleId];
    if (!signature) return;

    const factor = direction === 'heal'
      ? -intensity * HEAL_FACTOR
      : intensity;

    // ── Update worldBias ──
    for (const [axis, weight] of Object.entries(signature)) {
      const delta = weight * factor * 0.08;  // Small per-event. Accumulates.
      world.worldBias[axis] = clamp(
        world.worldBias[axis] + delta,
        PRESSURE_FLOOR,
        PRESSURE_CEILING
      );
    }

    // ── Update structuralDrift ──
    if (['urban-chronos', 'backbone', 'bab-el-mandeb'].includes(moduleId)) {
      const driftDelta = direction === 'heal' ? -0.01 * HEAL_FACTOR : 0.015;
      world.structuralDrift = clamp(world.structuralDrift + driftDelta * intensity, 0, 1);
    }
    if (moduleId === 'oracle' && direction === 'heal') {
      world.structuralDrift = clamp(world.structuralDrift - 0.008 * intensity, 0, 1);
    }

    // ── Update culturalEntropy ──
    if (['agora', 'eei-predictor', 'ice-italy'].includes(moduleId)) {
      const entropyDelta = direction === 'heal' ? -0.01 * HEAL_FACTOR : 0.012;
      world.culturalEntropy = clamp(world.culturalEntropy + entropyDelta * intensity, 0, 1);
    }
    if (moduleId === 'archivio-silente' && direction === 'heal') {
      world.culturalEntropy = clamp(world.culturalEntropy - 0.01 * intensity, 0, 1);
    }

    // ── Update module memory ──
    if (!world.moduleMemory[moduleId]) {
      world.moduleMemory[moduleId] = {
        visits: 0,
        lastVisit: 0,
        cumulativePressure: 0,
        cumulativeHeal: 0
      };
    }
    const mem = world.moduleMemory[moduleId];
    mem.visits++;
    mem.lastVisit = Date.now();
    if (direction === 'heal') {
      mem.cumulativeHeal += intensity;
    } else {
      mem.cumulativePressure += intensity;
    }

    // ── Persist + emit ──
    this._save();

    Bus.emit('world:pressure-received', {
      moduleId,
      intensity,
      direction,
      climate: this.getClimate()
    }, 'world-state');

    Bus.emit('world:climate-updated', this.getClimate(), 'world-state');
  },

  // ═══════════════════════════════════
  //  DECAY — Natural entropy toward zero
  // ═══════════════════════════════════

  /**
   * Apply time-based decay.
   * Pressures drift toward zero. Slowly.
   * The world heals if you stop hurting it.
   */
  _applyDecay() {
    const now = Date.now();
    const hoursSinceLastDecay = (now - world.lastDecay) / 3_600_000;
    if (hoursSinceLastDecay < 0.016) return;  // At least ~1 minute

    const decayAmount = DECAY_RATE * hoursSinceLastDecay;

    // WorldBias decays toward zero
    for (const axis of Object.keys(world.worldBias)) {
      const current = world.worldBias[axis];
      if (Math.abs(current) < 0.001) {
        world.worldBias[axis] = 0;
      } else {
        world.worldBias[axis] = current > 0
          ? Math.max(0, current - decayAmount)
          : Math.min(0, current + decayAmount);
      }
    }

    // Structural drift decays
    world.structuralDrift = Math.max(0, world.structuralDrift - decayAmount * 0.5);

    // Cultural entropy decays
    world.culturalEntropy = Math.max(0, world.culturalEntropy - decayAmount * 0.5);

    world.lastDecay = now;
    this._save();

    Bus.emit('world:decay-tick', {
      decayAmount,
      hoursSinceLastDecay,
      climate: this.getClimate()
    }, 'world-state');
  },

  /**
   * Apply accumulated decay since last session.
   */
  _applyAccumulatedDecay() {
    const hoursSinceLastDecay = (Date.now() - world.lastDecay) / 3_600_000;
    if (hoursSinceLastDecay > 0.1) {
      this._applyDecay();
    }
  },

  _startDecayTimer() {
    if (decayTimer) clearInterval(decayTimer);
    decayTimer = setInterval(() => this._applyDecay(), DECAY_INTERVAL);
  },

  // ═══════════════════════════════════
  //  PERSISTENCE — localStorage
  // ═══════════════════════════════════

  _save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(world));
    } catch (e) {
      // Storage full or unavailable — continue without persistence
    }
  },

  _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.version === 1) {
          world = {
            ...defaultWorld(),
            ...parsed,
            worldBias: { ...defaultWorld().worldBias, ...parsed.worldBias },
            moduleMemory: { ...parsed.moduleMemory }
          };
        }
      }
    } catch (e) {
      world = defaultWorld();
    }
  },

  // ═══════════════════════════════════
  //  BUS BINDINGS — Listen for pressure
  // ═══════════════════════════════════

  _bindEvents() {
    // ── Listen for pressure events from standalone pages ──
    // Pages emit: Bus.emit('world:module-pressure', { moduleId, intensity, direction })
    // Via BroadcastChannel, this arrives from other tabs too.
    Bus.on('world:module-pressure', (event) => {
      const { moduleId, intensity, direction } = event.payload;
      this.receivePressure(moduleId, intensity, direction);
    });

    // ── Listen for page-open events ──
    // When a standalone page opens, it emits a heartbeat.
    // This registers a "visit" with low baseline pressure.
    Bus.on('world:module-heartbeat', (event) => {
      const { moduleId } = event.payload;
      this.receivePressure(moduleId, 0.15, 'pressure');
    });
  },

  // ═══════════════════════════════════
  //  RESET — For testing only
  // ═══════════════════════════════════

  reset() {
    world = defaultWorld();
    this._save();
    Bus.emit('world:climate-updated', this.getClimate(), 'world-state');
  }
};

// ── Utility ──
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
