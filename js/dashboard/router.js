/**
 * Router — Module lifecycle manager.
 * ═══════════════════════════════════
 * Registry of modules. open(name) unmounts current, mounts new.
 * pushState for URL. ESC to return to hub.
 *
 * The router never knows what's inside a module.
 * It only calls mount() and unmount().
 *
 * Guarantees:
 *   - open() is async. Awaits both unmount() and mount().
 *   - try/finally on transition flag. If anything explodes,
 *     router stays alive. Never stuck in transitioning=true.
 *   - canEscape() is checked inside open(), not just ESC handler.
 *     No programmatic bypass.
 *   - Re-entrancy guard. Double-click = no-op.
 */

import { Bus } from '../bus.js';
import { State } from './state.js';

const registry = new Map();
let viewContainer = null;
let activeModule = null;
let activeName = null;
let transitioning = false;

export const Router = {

  /**
   * Initialize router with the #view container.
   */
  init(container) {
    viewContainer = container;

    // ESC key → return to hub
    // canEscape() negotiation happens inside open(), not here.
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && activeName && activeName !== 'hub') {
        Router.open('hub');
      }
    });

    // Browser back/forward
    window.addEventListener('popstate', (e) => {
      const target = (e.state && e.state.module) ? e.state.module : 'hub';
      Router.open(target, { push: false });
    });
  },

  /**
   * Register a module instance.
   * @param {string}     name   — unique identifier
   * @param {ModuleBase} module — instance with mount/unmount
   */
  register(name, module) {
    registry.set(name, module);
  },

  /**
   * Open a module by name.
   *
   * Signature: open(name, { push = true } = {})
   *
   * Guarantees:
   *   1. Re-entrancy blocked (transitioning flag)
   *   2. canEscape() respected (sync, before anything happens)
   *   3. unmount() awaited (async teardown safe)
   *   4. mount() awaited (async init safe)
   *   5. try/finally — flag resets even if mount/unmount explodes
   *
   * @param {string} name           — module to open
   * @param {Object} opts
   * @param {boolean} opts.push     — update browser history (default true)
   * @returns {Promise<void>}
   */
  async open(name, { push = true } = {}) {
    if (!registry.has(name)) {
      console.error(`[ROUTER] Module "${name}" not registered.`);
      return;
    }

    // Same module = no-op
    if (activeName === name) return;

    // Re-entrancy guard
    if (transitioning) return;

    // canEscape() — negotiated. Checked here, not just ESC handler.
    // Programmatic open() also respects module lock.
    if (activeModule && typeof activeModule.canEscape === 'function') {
      if (!activeModule.canEscape()) {
        Bus.emit('router:escape-blocked', { module: activeName, target: name }, 'router');
        return;
      }
    }

    transitioning = true;
    const previousName = activeName;
    const target = registry.get(name);

    try {
      // ── Unmount current ──
      if (activeModule) {
        await activeModule.unmount();
        activeModule = null;
      }

      // ── Clear container ──
      viewContainer.innerHTML = '';

      // ── Mount new (await if async) ──
      activeModule = target;
      activeName = name;
      await target.mount(viewContainer);

      // ── State + Bus ──
      State.set('router.active', name);
      State.set('router.previous', previousName);

      Bus.emit('router:changed', {
        from: previousName,
        to: name
      }, 'router');

      // ── URL ──
      if (push) {
        const url = name === 'hub' ? '/' : `/${name}`;
        history.pushState({ module: name }, '', url);
      }

    } catch (err) {
      console.error(`[ROUTER] Transition to "${name}" failed:`, err);
    } finally {
      transitioning = false;
    }
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
