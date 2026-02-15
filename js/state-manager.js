// ═══════════════════════════════════════════════════
// STATE MANAGER v1.0 — Unified Cross-Page State
// Hybrid Syndicate / Ethic Software Foundation
// ═══════════════════════════════════════════════════
// Persistence: localStorage + IndexedDB
// Cross-tab sync: BroadcastChannel API
// API: StateManager.get/set/subscribe/getSignals/addSignal

(function(global) {
    'use strict';

    const LS_PREFIX = 'hs_';
    const DB_NAME = 'HybridSyndicateDB';
    const DB_VERSION = 1;
    const CHANNEL_NAME = 'hs_state_sync';
    const MAX_SIGNALS = 2000;

    // ── Internal state ──
    let _db = null;
    let _channel = null;
    let _subscribers = {};   // key → [callback, ...]
    let _cache = {};         // in-memory cache for fast reads

    // ═══ LOCALSTORAGE LAYER ═══
    function lsGet(key) {
        try {
            const raw = localStorage.getItem(LS_PREFIX + key);
            return raw ? JSON.parse(raw) : null;
        } catch(e) { return null; }
    }

    function lsSet(key, val) {
        try {
            localStorage.setItem(LS_PREFIX + key, JSON.stringify(val));
        } catch(e) { /* quota exceeded — silent fail */ }
    }

    function lsRemove(key) {
        localStorage.removeItem(LS_PREFIX + key);
    }

    // ═══ INDEXEDDB LAYER (for signals archive) ═══
    function openDB() {
        return new Promise((resolve, reject) => {
            if (_db) { resolve(_db); return; }
            const req = indexedDB.open(DB_NAME, DB_VERSION);
            req.onupgradeneeded = function(e) {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('signals')) {
                    const store = db.createObjectStore('signals', { keyPath: 'id', autoIncrement: true });
                    store.createIndex('domain', 'domain', { unique: false });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                    store.createIndex('severity', 'severity', { unique: false });
                }
                if (!db.objectStoreNames.contains('feeds')) {
                    db.createObjectStore('feeds', { keyPath: 'url' });
                }
            };
            req.onsuccess = function(e) {
                _db = e.target.result;
                resolve(_db);
            };
            req.onerror = function() { reject(req.error); };
        });
    }

    async function dbAddSignal(signal) {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction('signals', 'readwrite');
            const store = tx.objectStore('signals');
            store.add(signal);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    async function dbGetSignals(opts = {}) {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction('signals', 'readonly');
            const store = tx.objectStore('signals');
            const results = [];

            let source;
            if (opts.domain) {
                source = store.index('domain').openCursor(IDBKeyRange.only(opts.domain), 'prev');
            } else {
                source = store.openCursor(null, 'prev');
            }

            const limit = opts.limit || 100;
            let count = 0;

            source.onsuccess = function(e) {
                const cursor = e.target.result;
                if (cursor && count < limit) {
                    results.push(cursor.value);
                    count++;
                    cursor.continue();
                } else {
                    resolve(results);
                }
            };
            source.onerror = () => reject(source.error);
        });
    }

    async function dbGetSignalCount() {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction('signals', 'readonly');
            const store = tx.objectStore('signals');
            const req = store.count();
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    async function dbPruneSignals() {
        const count = await dbGetSignalCount();
        if (count <= MAX_SIGNALS) return;

        const db = await openDB();
        const tx = db.transaction('signals', 'readwrite');
        const store = tx.objectStore('signals');
        const idx = store.index('timestamp');
        const toDelete = count - MAX_SIGNALS;
        let deleted = 0;

        return new Promise((resolve) => {
            idx.openCursor().onsuccess = function(e) {
                const cursor = e.target.result;
                if (cursor && deleted < toDelete) {
                    store.delete(cursor.primaryKey);
                    deleted++;
                    cursor.continue();
                } else {
                    resolve(deleted);
                }
            };
        });
    }

    // ═══ BROADCAST CHANNEL (cross-tab sync) ═══
    function initChannel() {
        if (typeof BroadcastChannel === 'undefined') return;
        try {
            _channel = new BroadcastChannel(CHANNEL_NAME);
            _channel.onmessage = function(e) {
                const { type, key, value } = e.data || {};
                if (type === 'state_update' && key) {
                    _cache[key] = value;
                    _notify(key, value, true);
                } else if (type === 'signal_added') {
                    _notify('__signals__', e.data.signal, true);
                }
            };
        } catch(e) { /* BroadcastChannel not supported */ }
    }

    function broadcast(type, data) {
        if (_channel) {
            try { _channel.postMessage({ type, ...data }); } catch(e) {}
        }
    }

    // ═══ SUBSCRIBER SYSTEM ═══
    function _notify(key, value, isRemote) {
        const subs = _subscribers[key] || [];
        subs.forEach(fn => {
            try { fn(value, key, isRemote); } catch(e) { console.error('[StateManager] subscriber error:', e); }
        });
        // Wildcard subscribers
        const wildSubs = _subscribers['*'] || [];
        wildSubs.forEach(fn => {
            try { fn(value, key, isRemote); } catch(e) {}
        });
    }

    // ═══ PUBLIC API ═══
    const StateManager = {
        // Get a state value
        get(key, defaultVal) {
            if (_cache[key] !== undefined) return _cache[key];
            const stored = lsGet(key);
            if (stored !== null) {
                _cache[key] = stored;
                return stored;
            }
            return defaultVal !== undefined ? defaultVal : null;
        },

        // Set a state value
        set(key, value) {
            _cache[key] = value;
            lsSet(key, value);
            _notify(key, value, false);
            broadcast('state_update', { key, value });
        },

        // Remove a state value
        remove(key) {
            delete _cache[key];
            lsRemove(key);
            _notify(key, null, false);
            broadcast('state_update', { key, value: null });
        },

        // Subscribe to state changes
        // key = specific key or '*' for all
        // Returns unsubscribe function
        subscribe(key, callback) {
            if (!_subscribers[key]) _subscribers[key] = [];
            _subscribers[key].push(callback);
            return function unsubscribe() {
                _subscribers[key] = _subscribers[key].filter(fn => fn !== callback);
            };
        },

        // ── Signal operations (IndexedDB) ──
        async addSignal(signal) {
            const enriched = {
                ...signal,
                timestamp: signal.timestamp || Date.now(),
                processed: signal.processed || false
            };
            await dbAddSignal(enriched);
            broadcast('signal_added', { signal: enriched });
            _notify('__signals__', enriched, false);

            // Update signal count in LS
            const count = await dbGetSignalCount();
            this.set('signal_count', count);

            // Auto-prune
            if (count > MAX_SIGNALS + 100) {
                dbPruneSignals();
            }

            return enriched;
        },

        async getSignals(opts) {
            return dbGetSignals(opts);
        },

        async getSignalCount() {
            return dbGetSignalCount();
        },

        // ── Domain-specific helpers ──

        // Store last RSS fetch timestamp per feed
        setFeedLastFetch(feedUrl, timestamp) {
            const feeds = this.get('feed_timestamps', {});
            feeds[feedUrl] = timestamp;
            this.set('feed_timestamps', feeds);
        },

        getFeedLastFetch(feedUrl) {
            const feeds = this.get('feed_timestamps', {});
            return feeds[feedUrl] || 0;
        },

        // Store domain risk levels
        setDomainRisk(domain, risk) {
            const risks = this.get('domain_risks', {});
            risks[domain] = { value: risk, updated: Date.now() };
            this.set('domain_risks', risks);
        },

        getDomainRisks() {
            return this.get('domain_risks', {});
        },

        // Pipeline status
        setPipelineStatus(status) {
            this.set('pipeline_status', { ...status, updated: Date.now() });
        },

        getPipelineStatus() {
            return this.get('pipeline_status', { active: false, lastRun: 0, signalsProcessed: 0 });
        },

        // Initialize
        init() {
            initChannel();
            openDB().catch(e => console.warn('[StateManager] IndexedDB init failed:', e));
            console.log('%c[StateManager] initialized', 'color: #3b82f6; font-weight: bold');
        }
    };

    // Auto-init
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => StateManager.init());
    } else {
        StateManager.init();
    }

    global.StateManager = StateManager;

})(typeof window !== 'undefined' ? window : this);
