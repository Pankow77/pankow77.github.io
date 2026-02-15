// ═══════════════════════════════════════════════════════════
// STATE-MANAGER v1.0 — Unified Cross-Page Nervous System
// Hybrid Syndicate / Ethic Software Foundation
// ═══════════════════════════════════════════════════════════
// localStorage + IndexedDB + BroadcastChannel
// Persistent state, signal storage, real-time cross-tab sync.
// Includes Entropic Process Lock (EPL) for anti-tampering.

const StateManager = (() => {
    'use strict';

    const PREFIX = 'hs_';
    const DB_NAME = 'HybridSyndicateDB';
    const DB_VERSION = 1;
    const SIGNAL_STORE = 'signals';
    const MAX_SIGNALS = 2000;
    const PRUNE_BATCH = 200;

    let db = null;
    let channel = null;
    const listeners = {};

    // ── EPL: Entropic Process Lock ──
    // Signs state entries with HMAC-like hash to detect tampering
    const EPL = {
        _seed: null,

        init() {
            // Generate session-unique seed (not cryptographic, but raises bar)
            let stored = localStorage.getItem(PREFIX + 'epl_seed');
            if (!stored) {
                stored = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
                localStorage.setItem(PREFIX + 'epl_seed', stored);
            }
            this._seed = stored;
        },

        sign(key, value) {
            const payload = key + ':' + JSON.stringify(value) + ':' + this._seed;
            let hash = 0;
            for (let i = 0; i < payload.length; i++) {
                const chr = payload.charCodeAt(i);
                hash = ((hash << 5) - hash) + chr;
                hash |= 0;
            }
            return hash.toString(36);
        },

        verify(key, value, signature) {
            return this.sign(key, value) === signature;
        }
    };

    // ── LOCALSTORAGE LAYER ──
    const Local = {
        set(key, value) {
            const fullKey = PREFIX + key;
            const sig = EPL.sign(fullKey, value);
            const envelope = { v: value, s: sig, t: Date.now() };
            try {
                localStorage.setItem(fullKey, JSON.stringify(envelope));
            } catch (e) {
                // Storage full — prune oldest entries
                _pruneLocalStorage();
                localStorage.setItem(fullKey, JSON.stringify(envelope));
            }
        },

        get(key, defaultVal = null) {
            const fullKey = PREFIX + key;
            try {
                const raw = localStorage.getItem(fullKey);
                if (!raw) return defaultVal;
                const envelope = JSON.parse(raw);
                // EPL verification
                if (!EPL.verify(fullKey, envelope.v, envelope.s)) {
                    console.warn(`[EPL] Tampering detected on key: ${key}. Resetting.`);
                    localStorage.removeItem(fullKey);
                    return defaultVal;
                }
                return envelope.v;
            } catch {
                return defaultVal;
            }
        },

        remove(key) {
            localStorage.removeItem(PREFIX + key);
        },

        keys() {
            const result = [];
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && k.startsWith(PREFIX)) {
                    result.push(k.slice(PREFIX.length));
                }
            }
            return result;
        }
    };

    function _pruneLocalStorage() {
        const entries = [];
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith(PREFIX) && !k.includes('epl_seed')) {
                try {
                    const env = JSON.parse(localStorage.getItem(k));
                    entries.push({ key: k, time: env.t || 0 });
                } catch { entries.push({ key: k, time: 0 }); }
            }
        }
        entries.sort((a, b) => a.time - b.time);
        const toRemove = entries.slice(0, Math.ceil(entries.length * 0.3));
        toRemove.forEach(e => localStorage.removeItem(e.key));
    }

    // ── INDEXEDDB LAYER (for signals) ──
    function openDB() {
        return new Promise((resolve, reject) => {
            if (db) return resolve(db);
            const req = indexedDB.open(DB_NAME, DB_VERSION);
            req.onupgradeneeded = (e) => {
                const database = e.target.result;
                if (!database.objectStoreNames.contains(SIGNAL_STORE)) {
                    const store = database.createObjectStore(SIGNAL_STORE, {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                    store.createIndex('domain', 'domain', { unique: false });
                    store.createIndex('severity', 'severity', { unique: false });
                    store.createIndex('source', 'source', { unique: false });
                }
            };
            req.onsuccess = (e) => {
                db = e.target.result;
                resolve(db);
            };
            req.onerror = (e) => {
                console.warn('[StateManager] IndexedDB unavailable, falling back to localStorage');
                reject(e);
            };
        });
    }

    // ── SIGNAL STORAGE ──
    const Signals = {
        async add(signal) {
            // signal: { title, domain, severity, source, url, summary, timestamp, raw }
            const entry = {
                ...signal,
                timestamp: signal.timestamp || Date.now(),
                ingested: Date.now()
            };

            try {
                const database = await openDB();
                const tx = database.transaction(SIGNAL_STORE, 'readwrite');
                const store = tx.objectStore(SIGNAL_STORE);
                store.add(entry);
                await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = rej; });

                // Auto-prune if over limit
                await this._prune();

                // Broadcast
                _broadcast('signal:new', entry);
                _emit('signal:new', entry);

                return entry;
            } catch {
                // Fallback to localStorage
                const signals = Local.get('signals_fallback', []);
                signals.push(entry);
                if (signals.length > MAX_SIGNALS) signals.splice(0, PRUNE_BATCH);
                Local.set('signals_fallback', signals);
                return entry;
            }
        },

        async addBatch(signals) {
            try {
                const database = await openDB();
                const tx = database.transaction(SIGNAL_STORE, 'readwrite');
                const store = tx.objectStore(SIGNAL_STORE);
                const now = Date.now();
                signals.forEach(s => {
                    store.add({
                        ...s,
                        timestamp: s.timestamp || now,
                        ingested: now
                    });
                });
                await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = rej; });
                await this._prune();
                _broadcast('signal:batch', { count: signals.length });
                _emit('signal:batch', { count: signals.length });
            } catch {
                const existing = Local.get('signals_fallback', []);
                const now = Date.now();
                signals.forEach(s => existing.push({ ...s, timestamp: s.timestamp || now, ingested: now }));
                if (existing.length > MAX_SIGNALS) existing.splice(0, existing.length - MAX_SIGNALS);
                Local.set('signals_fallback', existing);
            }
        },

        async query({ domain, minSeverity, since, limit } = {}) {
            try {
                const database = await openDB();
                return new Promise((resolve) => {
                    const tx = database.transaction(SIGNAL_STORE, 'readonly');
                    const store = tx.objectStore(SIGNAL_STORE);
                    const results = [];
                    const req = store.openCursor(null, 'prev');

                    req.onsuccess = (e) => {
                        const cursor = e.target.result;
                        if (!cursor || (limit && results.length >= limit)) {
                            return resolve(results);
                        }
                        const val = cursor.value;
                        let match = true;
                        if (domain && val.domain !== domain) match = false;
                        if (minSeverity && val.severity < minSeverity) match = false;
                        if (since && val.timestamp < since) match = false;
                        if (match) results.push(val);
                        cursor.continue();
                    };
                    req.onerror = () => resolve([]);
                });
            } catch {
                let signals = Local.get('signals_fallback', []);
                if (domain) signals = signals.filter(s => s.domain === domain);
                if (minSeverity) signals = signals.filter(s => s.severity >= minSeverity);
                if (since) signals = signals.filter(s => s.timestamp >= since);
                signals.sort((a, b) => b.timestamp - a.timestamp);
                if (limit) signals = signals.slice(0, limit);
                return signals;
            }
        },

        async getRecent(hours = 6, limit = 50) {
            const since = Date.now() - (hours * 60 * 60 * 1000);
            return this.query({ since, limit });
        },

        async getDomainStats(hours = 24) {
            const since = Date.now() - (hours * 60 * 60 * 1000);
            const signals = await this.query({ since });
            const stats = {};
            signals.forEach(s => {
                if (!stats[s.domain]) {
                    stats[s.domain] = { count: 0, totalSeverity: 0, maxSeverity: 0, signals: [] };
                }
                stats[s.domain].count++;
                stats[s.domain].totalSeverity += (s.severity || 0);
                stats[s.domain].maxSeverity = Math.max(stats[s.domain].maxSeverity, s.severity || 0);
                stats[s.domain].signals.push(s);
            });
            // Calculate averages
            Object.keys(stats).forEach(d => {
                stats[d].avgSeverity = Math.round(stats[d].totalSeverity / stats[d].count);
            });
            return stats;
        },

        async count() {
            try {
                const database = await openDB();
                return new Promise((resolve) => {
                    const tx = database.transaction(SIGNAL_STORE, 'readonly');
                    const store = tx.objectStore(SIGNAL_STORE);
                    const req = store.count();
                    req.onsuccess = () => resolve(req.result);
                    req.onerror = () => resolve(0);
                });
            } catch {
                return Local.get('signals_fallback', []).length;
            }
        },

        async _prune() {
            try {
                const total = await this.count();
                if (total <= MAX_SIGNALS) return;

                const database = await openDB();
                const tx = database.transaction(SIGNAL_STORE, 'readwrite');
                const store = tx.objectStore(SIGNAL_STORE);
                const idx = store.index('timestamp');
                let deleted = 0;
                const toDelete = total - MAX_SIGNALS + PRUNE_BATCH;

                return new Promise((resolve) => {
                    const req = idx.openCursor();
                    req.onsuccess = (e) => {
                        const cursor = e.target.result;
                        if (!cursor || deleted >= toDelete) return resolve(deleted);
                        store.delete(cursor.primaryKey);
                        deleted++;
                        cursor.continue();
                    };
                    req.onerror = () => resolve(deleted);
                });
            } catch { /* ignore */ }
        }
    };

    // ── BROADCAST CHANNEL (cross-tab sync) ──
    function initBroadcast() {
        try {
            channel = new BroadcastChannel('hybrid-syndicate');
            channel.onmessage = (e) => {
                const { type, data } = e.data;
                _emit(type, data);
            };
        } catch {
            // BroadcastChannel not supported — no cross-tab sync
        }
    }

    function _broadcast(type, data) {
        if (channel) {
            try { channel.postMessage({ type, data }); } catch { /* ignore */ }
        }
    }

    // ── EVENT SYSTEM ──
    function on(event, callback) {
        if (!listeners[event]) listeners[event] = [];
        listeners[event].push(callback);
    }

    function off(event, callback) {
        if (!listeners[event]) return;
        listeners[event] = listeners[event].filter(cb => cb !== callback);
    }

    function _emit(event, data) {
        (listeners[event] || []).forEach(cb => {
            try { cb(data); } catch (e) { console.error('[StateManager] Listener error:', e); }
        });
    }

    // ── SESSION TRACKING ──
    function getSession() {
        let session = Local.get('session');
        if (!session) {
            session = {
                id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
                created: Date.now(),
                totalVisits: 0,
                pagesVisited: []
            };
        }
        session.totalVisits++;
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        session.lastPage = currentPage;
        session.lastVisit = Date.now();
        if (!session.pagesVisited.includes(currentPage)) {
            session.pagesVisited.push(currentPage);
        }
        Local.set('session', session);
        return session;
    }

    // ── INIT ──
    function init() {
        EPL.init();
        initBroadcast();
        openDB().catch(() => {}); // Pre-warm IndexedDB
        const session = getSession();
        console.log(
            '%c[StateManager] Online. Session: ' + session.id + ' | Pages: ' + session.pagesVisited.length + '/9',
            'color: #00d4ff; font-size: 10px;'
        );
        _broadcast('state:init', { page: session.lastPage });
    }

    init();

    // ── PUBLIC API ──
    return {
        // localStorage (EPL-protected)
        set: Local.set,
        get: Local.get,
        remove: Local.remove,
        keys: Local.keys,

        // IndexedDB signals
        signals: Signals,

        // Events
        on,
        off,
        broadcast: _broadcast,

        // Session
        getSession,

        // EPL status
        eplStatus: () => ({ seed: !!EPL._seed, active: true })
    };
})();
