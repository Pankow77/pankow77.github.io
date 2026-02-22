/**
 * SIGIL - Event Bus
 * Lightweight pub/sub for inter-module communication.
 * Singleton pattern. Zero dependencies.
 */

let instance = null;

export class EventBus {
  constructor() {
    if (instance) return instance;
    this._listeners = new Map();
    this._history = [];
    this._maxHistory = 500;
    instance = this;
  }

  static getInstance() {
    if (!instance) new EventBus();
    return instance;
  }

  /**
   * Subscribe to an event
   * @param {string} type
   * @param {Function} callback
   * @returns {Function} unsubscribe function
   */
  on(type, callback) {
    if (!this._listeners.has(type)) {
      this._listeners.set(type, new Set());
    }
    this._listeners.get(type).add(callback);
    return () => this.off(type, callback);
  }

  /**
   * Subscribe once
   */
  once(type, callback) {
    const wrapper = (...args) => {
      this.off(type, wrapper);
      callback(...args);
    };
    this.on(type, wrapper);
  }

  /**
   * Unsubscribe
   */
  off(type, callback) {
    const set = this._listeners.get(type);
    if (set) set.delete(callback);
  }

  /**
   * Emit event
   */
  emit(type, payload = {}) {
    const event = {
      type,
      payload,
      timestamp: Date.now(),
      id: crypto.randomUUID()
    };

    // Record history
    this._history.push(event);
    if (this._history.length > this._maxHistory) {
      this._history.shift();
    }

    // Dispatch to listeners
    const set = this._listeners.get(type);
    if (set) {
      for (const cb of set) {
        try {
          cb(event.payload);
        } catch (err) {
          console.error(`[Bus] Error in listener for "${type}":`, err);
        }
      }
    }
  }

  /**
   * Get event history (read-only)
   */
  getHistory(type = null) {
    if (type) return this._history.filter(e => e.type === type);
    return [...this._history];
  }

  /**
   * Clear all listeners (for testing)
   */
  clear() {
    this._listeners.clear();
    this._history = [];
  }
}
