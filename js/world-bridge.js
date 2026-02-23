/**
 * WorldBridge — Lightweight climate connector for standalone pages.
 * ═══════════════════════════════════════════════════════════════════
 * For pages that DON'T import core.js or bus.js.
 * Uses BroadcastChannel('hybrid-syndicate') directly.
 *
 * The dashboard's WorldState listens for these events.
 * This script has ZERO dependencies. Pure browser APIs.
 *
 * Usage in a standalone page:
 *
 *   <script src="js/world-bridge.js"></script>
 *   <script>
 *     // Page opened — registers visit
 *     WorldBridge.open('pneuma');
 *
 *     // User interaction — emits pressure
 *     WorldBridge.pressure('pneuma', 0.6);
 *
 *     // Healing action — reduces pressure
 *     WorldBridge.heal('pneuma', 0.4);
 *   </script>
 *
 * For pages that ALREADY have Bus (ice-italy, bab-el-mandeb, oracle, backbone):
 *   They don't need this script. They emit directly via:
 *     Bus.emit('world:module-pressure', { moduleId, intensity, direction });
 */

(function () {
  'use strict';

  let channel = null;

  try {
    channel = new BroadcastChannel('hybrid-syndicate');
  } catch (e) {
    // BroadcastChannel not supported — events won't reach dashboard
    console.warn('[WorldBridge] BroadcastChannel not available.');
  }

  function send(type, payload) {
    if (!channel) return;

    const event = {
      type,
      source: 'world-bridge',
      payload,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      _crossTab: true
    };

    try {
      channel.postMessage(event);
    } catch (e) {
      // Serialization error — skip
    }
  }

  window.WorldBridge = {

    /**
     * Signal that a module page was opened.
     * Registers a low-intensity visit in WorldState.
     * Call this once on page load.
     *
     * @param {string} moduleId — e.g., 'pneuma', 'urban-chronos'
     */
    open(moduleId) {
      send('world:module-heartbeat', { moduleId });
    },

    /**
     * Emit pressure from a user interaction.
     * The dashboard's WorldState receives this and updates climate.
     *
     * @param {string} moduleId  — which module
     * @param {number} intensity — 0.0 to 1.0
     */
    pressure(moduleId, intensity = 0.5) {
      send('world:module-pressure', {
        moduleId,
        intensity: Math.max(0, Math.min(1, intensity)),
        direction: 'pressure'
      });
    },

    /**
     * Emit healing signal.
     * Reduces world pressure. Slower than damage (by design).
     *
     * @param {string} moduleId  — which module
     * @param {number} intensity — 0.0 to 1.0
     */
    heal(moduleId, intensity = 0.3) {
      send('world:module-pressure', {
        moduleId,
        intensity: Math.max(0, Math.min(1, intensity)),
        direction: 'heal'
      });
    }
  };
})();
