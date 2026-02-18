/**
 * core.js — Hybrid Syndicate ECOSYSTEM Runtime
 * ═══════════════════════════════════════════════════════════
 * The spinal cord. Everything passes through here.
 *
 * Responsibilities:
 *   - Module registry (register/unregister/query)
 *   - State management with provenance tracking
 *   - Boot sequence coordination
 *   - Global access point (window.ECOSYSTEM)
 *
 * Browser-native ES Module. Zero dependencies beyond bus.js.
 * ═══════════════════════════════════════════════════════════
 */

import { Bus } from './bus.js';

const modules = new Map();
const state = new Map();

// ── Heartbeat — proof of life ──
let heartbeat = 0;
let lastEpochSource = null;

export const ECOSYSTEM = {
    version: '0.1.0',
    codename: 'GENESIS',
    bootTime: Date.now(),

    // ═══════════════════════════════════════
    // MODULE REGISTRY
    // ═══════════════════════════════════════

    /**
     * Register a module in the ecosystem.
     * If the module exposes an init(ecosystem, bus) method, it will be called.
     * @param {string} name     - Unique module identifier
     * @param {object} module   - Module instance
     * @returns {ECOSYSTEM} for chaining
     */
    register(name, module) {
        if (modules.has(name)) {
            console.warn(`[ECOSYSTEM] Module "${name}" already registered. Replacing.`);
            this.unregister(name);
        }

        const entry = {
            name,
            instance: module,
            registeredAt: Date.now(),
            status: 'initializing'
        };

        modules.set(name, entry);

        // Call module init if it exists
        try {
            if (module && typeof module.init === 'function') {
                module.init(ECOSYSTEM, Bus);
            }
            entry.status = 'active';
        } catch (err) {
            entry.status = 'error';
            console.error(`[ECOSYSTEM] Error initializing module "${name}":`, err);
        }

        Bus.emit('ecosystem:module-registered', {
            name,
            status: entry.status,
            timestamp: entry.registeredAt
        }, 'core');

        return ECOSYSTEM;
    },

    /**
     * Unregister a module. Calls destroy() if available.
     */
    unregister(name) {
        const entry = modules.get(name);
        if (!entry) return;

        if (entry.instance && typeof entry.instance.destroy === 'function') {
            try { entry.instance.destroy(); } catch (err) {
                console.error(`[ECOSYSTEM] Error destroying module "${name}":`, err);
            }
        }

        modules.delete(name);
        Bus.emit('ecosystem:module-unregistered', { name }, 'core');
    },

    /**
     * Get a module instance by name.
     */
    getModule(name) {
        const entry = modules.get(name);
        return entry ? entry.instance : null;
    },

    /**
     * Get info about all registered modules.
     */
    getModules() {
        return Array.from(modules.entries()).map(([name, entry]) => ({
            name,
            status: entry.status,
            registeredAt: entry.registeredAt,
            hasInit: entry.instance && typeof entry.instance.init === 'function',
            hasDestroy: entry.instance && typeof entry.instance.destroy === 'function'
        }));
    },

    // ═══════════════════════════════════════
    // STATE MANAGEMENT WITH PROVENANCE
    // ═══════════════════════════════════════

    /**
     * Set state with full provenance tracking.
     * Emits "state:update" event on the Bus.
     *
     * @param {string} key       - State key
     * @param {*}      value     - State value
     * @param {object} meta      - Provenance metadata
     * @param {string} meta.source - Who wrote this (module name)
     * @returns {object} The provenance payload
     */
    setState(key, value, meta = {}) {
        const previous = state.has(key) ? state.get(key) : null;

        const payload = {
            value,
            timestamp: Date.now(),
            source: meta.source || 'unknown',
            version: ECOSYSTEM.version,
            previous: previous ? previous.value : undefined
        };

        state.set(key, payload);

        Bus.emit('state:update', {
            key,
            value: payload.value,
            previous: payload.previous,
            source: payload.source,
            timestamp: payload.timestamp
        }, meta.source || 'core');

        return payload;
    },

    /**
     * Get the current value of a state key.
     */
    getState(key) {
        const entry = state.get(key);
        return entry ? entry.value : undefined;
    },

    /**
     * Get the full provenance entry (value + metadata).
     */
    getStateEntry(key) {
        return state.get(key) || null;
    },

    /**
     * Get all state entries with provenance.
     */
    getFullState() {
        const result = {};
        state.forEach((entry, key) => { result[key] = entry; });
        return result;
    },

    /**
     * Get all state keys.
     */
    getStateKeys() {
        return Array.from(state.keys());
    },

    // ═══════════════════════════════════════
    // BUS PROXY (convenience)
    // ═══════════════════════════════════════

    emit: (...args) => Bus.emit(...args),
    on: (...args) => Bus.on(...args),
    off: (...args) => Bus.off(...args),
    once: (...args) => Bus.once(...args),

    // ═══════════════════════════════════════
    // SYSTEM INFO
    // ═══════════════════════════════════════

    /**
     * Get full system information snapshot.
     */
    getInfo() {
        return {
            version: ECOSYSTEM.version,
            codename: ECOSYSTEM.codename,
            bootTime: ECOSYSTEM.bootTime,
            uptime: Date.now() - ECOSYSTEM.bootTime,
            heartbeat,
            lastEpochSource,
            modules: ECOSYSTEM.getModules(),
            stateKeys: Array.from(state.keys()),
            stateEntries: state.size,
            eventHistory: Bus.getHistory().length,
            listenerCount: Bus.getListenerCount(),
            registeredEventTypes: Bus.getRegisteredTypes()
        };
    },

    /**
     * Get uptime in human-readable format.
     */
    getUptime() {
        const ms = Date.now() - ECOSYSTEM.bootTime;
        const s = Math.floor(ms / 1000);
        const m = Math.floor(s / 60);
        const h = Math.floor(m / 60);
        if (h > 0) return `${h}h ${m % 60}m ${s % 60}s`;
        if (m > 0) return `${m}m ${s % 60}s`;
        return `${s}s`;
    }
};

// ── Make globally accessible for console debugging and non-module scripts ──
window.ECOSYSTEM = ECOSYSTEM;
window.Bus = Bus;

// ── Heartbeat observer ──
// When Identity persists an epoch, the ecosystem is alive.
// This is the proof: observation → persistence → pulse.
Bus.on('identity:epoch-created', (event) => {
    heartbeat++;
    lastEpochSource = event.payload.source || 'unknown';
    const now = Date.now();

    ECOSYSTEM.setState('ecosystem.heartbeat', heartbeat, { source: 'core' });
    ECOSYSTEM.setState('ecosystem.lastEpochSource', lastEpochSource, { source: 'core' });

    // Point zero — the first heartbeat carries the full birth record
    if (heartbeat === 1) {
        ECOSYSTEM.setState('ecosystem.firstBeat', {
            version: ECOSYSTEM.version,
            codename: ECOSYSTEM.codename,
            timestamp: now,
            bootDelta: now - ECOSYSTEM.bootTime,
            source: lastEpochSource,
            epochId: event.payload.id
        }, { source: 'core' });

        console.log(
            '%c[ECOSYSTEM] %c♥ FIRST HEARTBEAT %c— beat #1 from %c' + lastEpochSource +
            '%c after ' + (now - ECOSYSTEM.bootTime) + 'ms. The ecosystem is alive.',
            'color: #00d4ff; font-weight: bold;',
            'color: #ff0084; font-weight: bold;',
            'color: #6b7fa3;',
            'color: #39ff14; font-weight: bold;',
            'color: #6b7fa3;'
        );
    }

    Bus.emit('ecosystem:heartbeat', {
        beat: heartbeat,
        source: lastEpochSource,
        epochId: event.payload.id,
        timestamp: now
    }, 'core');
});

// ── Boot event ──
Bus.emit('ecosystem:boot', {
    version: ECOSYSTEM.version,
    codename: ECOSYSTEM.codename,
    timestamp: ECOSYSTEM.bootTime,
    userAgent: navigator.userAgent
}, 'core');

// ── Console signature ──
console.log(
    '%c[ECOSYSTEM] %cv' + ECOSYSTEM.version + ' (' + ECOSYSTEM.codename + ') %c— Nervous system online.',
    'color: #00d4ff; font-weight: bold;',
    'color: #39ff14;',
    'color: #6b7fa3;'
);

export { Bus };
