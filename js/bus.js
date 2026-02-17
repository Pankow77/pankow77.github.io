/**
 * bus.js — Hybrid Syndicate Event Bus
 * ═══════════════════════════════════════════════════════════
 * Synaptic layer for inter-module communication.
 * Browser-native ES Module. Zero dependencies. Zero framework.
 *
 * Events are structured objects, not strings:
 *   { type, source, payload, id, timestamp }
 *
 * Supports: exact match, namespace wildcards, global listeners,
 *           cross-tab communication via BroadcastChannel,
 *           event history for replay and debugging.
 * ═══════════════════════════════════════════════════════════
 */

const listeners = new Map();
const history = [];
const MAX_HISTORY = 1000;

// ── Cross-tab communication ──
let channel = null;
try {
    channel = new BroadcastChannel('hybrid-syndicate');
    channel.onmessage = (e) => {
        if (e.data && e.data._crossTab) {
            const event = { ...e.data };
            delete event._crossTab;
            dispatch(event, false);
        }
    };
} catch (err) {
    // BroadcastChannel not supported — single-tab mode
}

// ── Event factory ──
function createEvent(type, payload = {}, source = 'unknown') {
    return {
        type,
        source,
        payload,
        id: crypto.randomUUID(),
        timestamp: Date.now()
    };
}

// ── Core dispatch ──
function dispatch(event, broadcast = true) {
    // Store in history
    history.push(Object.freeze(event));
    if (history.length > MAX_HISTORY) history.shift();

    // Exact match listeners
    const exact = listeners.get(event.type);
    if (exact) {
        exact.forEach(fn => {
            try { fn(event); }
            catch (err) { console.error(`[BUS] Error in listener for "${event.type}":`, err); }
        });
    }

    // Namespace wildcard (e.g., "oracle:*" matches "oracle:epoch-created")
    const colonIdx = event.type.indexOf(':');
    if (colonIdx > -1) {
        const namespace = event.type.substring(0, colonIdx);
        const wild = listeners.get(`${namespace}:*`);
        if (wild) {
            wild.forEach(fn => {
                try { fn(event); }
                catch (err) { console.error(`[BUS] Error in wildcard listener for "${namespace}:*":`, err); }
            });
        }
    }

    // Global listeners ("*")
    const global = listeners.get('*');
    if (global) {
        global.forEach(fn => {
            try { fn(event); }
            catch (err) { console.error('[BUS] Error in global listener:', err); }
        });
    }

    // Cross-tab broadcast
    if (broadcast && channel) {
        try {
            channel.postMessage({ ...event, _crossTab: true });
        } catch (err) {
            // Serialization error — skip cross-tab
        }
    }
}

// ── Public API ──
export const Bus = {

    /**
     * Emit a structured event.
     * @param {string} type    - Namespaced event type (e.g., "oracle:scan-complete")
     * @param {object} payload - Event data
     * @param {string} source  - Module that emitted the event
     * @returns {object} The created event object
     */
    emit(type, payload = {}, source = 'unknown') {
        const event = createEvent(type, payload, source);
        dispatch(event);
        return event;
    },

    /**
     * Subscribe to an event type.
     * Supports exact match ("oracle:scan"), wildcards ("oracle:*"), global ("*").
     * @returns {Function} Unsubscribe function
     */
    on(type, callback) {
        if (!listeners.has(type)) listeners.set(type, new Set());
        listeners.get(type).add(callback);
        return () => this.off(type, callback);
    },

    /**
     * Unsubscribe from an event type.
     */
    off(type, callback) {
        const set = listeners.get(type);
        if (set) {
            set.delete(callback);
            if (set.size === 0) listeners.delete(type);
        }
    },

    /**
     * Subscribe once — auto-removes after first invocation.
     */
    once(type, callback) {
        const wrapper = (event) => {
            this.off(type, wrapper);
            callback(event);
        };
        this.on(type, wrapper);
    },

    /**
     * Replay events from history.
     * @param {Function|null} filter  - Optional filter function
     * @param {Function|null} handler - Optional handler to replay into
     * @returns {Array} Matching events
     */
    replay(filter = null, handler = null) {
        const events = filter ? history.filter(filter) : [...history];
        if (handler) events.forEach(e => handler(e));
        return events;
    },

    /**
     * Get event history, optionally filtered by type prefix.
     */
    getHistory(type = null) {
        if (!type) return [...history];
        if (type.endsWith('*')) {
            const prefix = type.slice(0, -1);
            return history.filter(e => e.type.startsWith(prefix));
        }
        return history.filter(e => e.type === type);
    },

    /**
     * Get listener count for debugging.
     */
    getListenerCount() {
        let count = 0;
        listeners.forEach(set => { count += set.size; });
        return count;
    },

    /**
     * Get all registered event types.
     */
    getRegisteredTypes() {
        return Array.from(listeners.keys());
    },

    /**
     * Clear all listeners and history. For testing/reset.
     */
    clear() {
        listeners.clear();
        history.length = 0;
    },

    /**
     * Destroy — cleanup including cross-tab channel.
     */
    destroy() {
        this.clear();
        if (channel) {
            channel.close();
            channel = null;
        }
    }
};
