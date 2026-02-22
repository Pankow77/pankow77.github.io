/**
 * ModuleBase — Lifecycle contract for every organ.
 * ═══════════════════════════════════════════════════
 * Every module extends this. No exceptions.
 *
 * Lifecycle:
 *   mount(container)   → build DOM, subscribe to Bus
 *   update(key, v, p)  → react to state changes
 *   unmount()          → teardown DOM, unsubscribe everything
 *   canEscape()        → return false to block ESC (default: true)
 *
 * Rule: this.subscriptions collects EVERY unsubscribe function.
 *       Both Bus.on() and State.watch() return unsubscribe.
 *       unmount() drains them all. Zero leaks.
 *
 * FIX 2: canEscape() — modules can block ESC when in critical state.
 * FIX 4: watchState() — tracked wrapper for State.watch().
 *        Both subscribe() and watchState() push into this.subscriptions.
 */

import { Bus } from '../bus.js';
import { State } from './state.js';

export class ModuleBase {

  constructor(name) {
    this.name = name;
    this.container = null;
    this.mounted = false;
    this.subscriptions = [];
  }

  /**
   * Mount the module into a DOM container.
   * Subclasses MUST call super.mount(container) first.
   */
  mount(container) {
    this.container = container;
    this.mounted = true;
  }

  /**
   * React to a state change. Override in subclass.
   * @param {string} key      — state key that changed
   * @param {*}      value    — new value
   * @param {*}      previous — old value
   */
  update(key, value, previous) {
    // Override in subclass
  }

  /**
   * Can this module be escaped via ESC?
   * Override to return false during critical states
   * (confirm dialogs, protocol sequences, freezes).
   * Default: always escapable.
   */
  canEscape() {
    return true;
  }

  /**
   * Teardown. Unsubscribes everything. Clears container.
   * Subclasses SHOULD call super.unmount() last (after their own cleanup).
   *
   * Can return a Promise for async teardown (audio fade, animation).
   * Router will await it.
   */
  unmount() {
    // Drain all subscriptions
    this.subscriptions.forEach(unsub => {
      try { unsub(); } catch (e) { /* already cleaned */ }
    });
    this.subscriptions = [];

    if (this.container) {
      this.container.innerHTML = '';
    }

    this.container = null;
    this.mounted = false;
  }

  // ── Helpers ──

  /**
   * Subscribe to a Bus event. Tracked for cleanup.
   * @returns {Function} unsubscribe
   */
  subscribe(type, callback) {
    const unsub = Bus.on(type, callback);
    this.subscriptions.push(unsub);
    return unsub;
  }

  /**
   * Watch a State key. Tracked for cleanup.
   * This is the SAFE way to use State.watch() inside a module.
   * @returns {Function} unsubscribe
   */
  watchState(key, callback) {
    const unsub = State.watch(key, callback);
    this.subscriptions.push(unsub);
    return unsub;
  }

  /**
   * Watch a selector. Calls callback only when the selector's
   * output changes (reference equality). Tracked for cleanup.
   *
   * Usage:
   *   this.watchSelector(selectAgora, (vm) => this._patch(vm));
   *
   * @param {Function} selectorFn — created by createSelector()
   * @param {Function} callback   — (viewModel) => void
   * @returns {Function} unsubscribe
   */
  watchSelector(selectorFn, callback) {
    let lastRef = selectorFn();
    const unsub = Bus.on('state:changed', () => {
      const next = selectorFn();
      if (next !== lastRef) {
        lastRef = next;
        callback(next);
      }
    });
    this.subscriptions.push(unsub);
    return unsub;
  }

  /**
   * Read state.
   */
  getState(key) {
    return State.get(key);
  }

  /**
   * Write state.
   */
  setState(key, value) {
    State.set(key, value);
  }

  /**
   * Emit a namespaced event.
   */
  emit(type, payload = {}) {
    Bus.emit(`${this.name}:${type}`, payload, this.name);
  }

  /**
   * Create a DOM element with optional class and text.
   */
  el(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text) element.textContent = text;
    return element;
  }
}
