/**
 * Router — Module lifecycle manager.
 * ═══════════════════════════════════
 * Registry of modules. open(name) unmounts current, mounts new.
 * pushState for URL. ESC to return to hub.
 *
 * The router never knows what's inside a module.
 * It only calls mount() and unmount().
 *
 * FIX 1: open() is async. Awaits unmount() so async teardown
 *        (audio fade, animation) completes before new mount.
 * FIX 2: ESC is negotiated. If activeModule.canEscape() returns false,
 *        ESC is blocked. Modules control their own lock.
 */

import { Bus } from '../bus.js';
import { State } from './state.js';

const registry = new Map();
let viewContainer = null;
let activeModule = null;
let activeName = null;
let transitioning = false; // Guard against concurrent open() calls

export const Router = {

  /**
   * Initialize router with the #view container.
   */
  init(container) {
    viewContainer = container;

    // ESC key → return to hub (negotiated)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && activeName && activeName !== 'hub') {
        // Ask the active module if ESC is allowed
        if (activeModule && typeof activeModule.canEscape === 'function') {
          if (!activeModule.canEscape()) {
            // Module blocks ESC. Emit event so module can react.
            Bus.emit('router:escape-blocked', { module: activeName }, 'router');
            return;
          }
        }
        Router.open('hub');
      }
    });

    // Browser back/forward
    window.addEventListener('popstate', (e) => {
      const target = (e.state && e.state.module) ? e.state.module : 'hub';
      Router.open(target, false); // false = don't pushState again
    });
  },

  /**
   * Register a module class instance.
   * @param {string}     name   — unique identifier
   * @param {ModuleBase} module — instance with mount/unmount
   */
  register(name, module) {
    registry.set(name, module);
  },

  /**
   * Open a module by name.
   * Async: awaits unmount() so teardown (audio, animation) completes.
   * Unmounts current → clears container → mounts new.
   *
   * @param {string}  name        — module to open
   * @param {boolean} pushHistory — whether to update browser history
   * @returns {Promise<void>}
   */
  async open(name, pushHistory = true) {
    const target = registry.get(name);
    if (!target) {
      console.error(`[ROUTER] Module "${name}" not registered.`);
      return;
    }

    // Same module? No-op.
    if (activeName === name) return;

    // Guard: if already transitioning, queue is dropped.
    // Prevents double-click race.
    if (transitioning) return;
    transitioning = true;

    const previousName = activeName;

    // ── Unmount current (await if async) ──
    if (activeModule) {
      try {
        await activeModule.unmount();
      } catch (err) {
        console.error(`[ROUTER] Error during unmount of "${activeName}":`, err);
      }
      activeModule = null;
    }

    // ── Clear container ──
    viewContainer.innerHTML = '';

    // ── Mount new ──
    activeModule = target;
    activeName = name;
    target.mount(viewContainer);

    // ── State update ──
    State.set('router.active', name);
    State.set('router.previous', previousName);

    // ── Bus event ──
    Bus.emit('router:changed', {
      from: previousName,
      to: name
    }, 'router');

    // ── URL ──
    if (pushHistory) {
      const url = name === 'hub' ? '/' : `/${name}`;
      history.pushState({ module: name }, '', url);
    }

    transitioning = false;
  },

  /**
   * Get the currently active module name.
   */
  getActive() {
    return activeName;
  },

  /**
   * Get all registered module names.
   */
  getModules() {
    return Array.from(registry.keys());
  },

  /**
   * Check if a module is registered.
   */
  has(name) {
    return registry.has(name);
  }
};
