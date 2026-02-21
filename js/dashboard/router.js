/**
 * Router — Module lifecycle manager.
 * ═══════════════════════════════════
 * Registry of modules. open(name) unmounts current, mounts new.
 * pushState for URL. ESC to return to hub.
 *
 * The router never knows what's inside a module.
 * It only calls mount() and unmount().
 */

import { Bus } from '../bus.js';
import { State } from './state.js';

const registry = new Map();
let viewContainer = null;
let activeModule = null;
let activeName = null;

export const Router = {

  /**
   * Initialize router with the #view container.
   */
  init(container) {
    viewContainer = container;

    // ESC key → return to hub
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && activeName && activeName !== 'hub') {
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
   * Unmounts current → clears container → mounts new.
   * @param {string}  name      — module to open
   * @param {boolean} pushState — whether to update browser history
   */
  open(name, pushHistory = true) {
    const target = registry.get(name);
    if (!target) {
      console.error(`[ROUTER] Module "${name}" not registered.`);
      return;
    }

    // Same module? No-op.
    if (activeName === name) return;

    const previousName = activeName;

    // ── Unmount current ──
    if (activeModule) {
      activeModule.unmount();
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
