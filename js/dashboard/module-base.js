/**
 * ModuleBase — Lifecycle contract for every organ.
 * ═══════════════════════════════════════════════════
 * Every module extends this. No exceptions.
 *
 * Lifecycle:
 *   mount(container, state)  → build DOM, subscribe to Bus
 *   update(state)            → react to state changes
 *   unmount()                → teardown DOM, unsubscribe everything
 *
 * Rule: this.subscriptions collects every Bus.on() return value.
 *       unmount() drains them all. Zero leaks.
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

    // Global state watcher — routes state changes to update()
    this.subscribe('state:changed', (event) => {
      if (this.mounted) {
        this.update(event.payload.key, event.payload.value, event.payload.previous);
      }
    });
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
   * Teardown. Unsubscribes everything. Clears container.
   * Subclasses SHOULD call super.unmount() last (after their own cleanup).
   */
  unmount() {
    this.subscriptions.forEach(unsub => unsub());
    this.subscriptions = [];

    if (this.container) {
      this.container.innerHTML = '';
    }

    this.container = null;
    this.mounted = false;
  }

  // ── Helpers ──

  /**
   * Subscribe to a Bus event. Automatically tracked for cleanup.
   * @returns {Function} unsubscribe
   */
  subscribe(type, callback) {
    const unsub = Bus.on(type, callback);
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
