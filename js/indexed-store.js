// ═══════════════════════════════════════════════════════════════
// INDEXED_STORE v1.0 — Async IndexedDB Storage Layer
// Hybrid Syndicate / Ethic Software Foundation
// ═══════════════════════════════════════════════════════════════
// "localStorage is a breadbox. IndexedDB is a warehouse."
//
// Provides:
// - Async IndexedDB storage (hundreds of MB capacity)
// - Structured object stores with indexes
// - Source reputation persistence across sessions
// - Feed quarantine tracking
// - Automatic localStorage fallback
// - One-time migration from localStorage
// ═══════════════════════════════════════════════════════════════

const IndexedStore = (() => {

    const DB_NAME = 'hs_database';
    const DB_VERSION = 1;
    const STORES = {
        signals: 'signals',
        reputation: 'source_reputation',
        quarantine: 'feed_quarantine',
        meta: 'meta',
    };

    let db = null;
    let available = false;
    let openPromise = null;

    // ══════════════════════════════════════════════
    // DATABASE OPEN / UPGRADE
    // ══════════════════════════════════════════════

    function open() {
        if (db) return Promise.resolve(db);
        if (openPromise) return openPromise;

        openPromise = new Promise((resolve, reject) => {
            if (typeof indexedDB === 'undefined') {
                reject(new Error('IndexedDB not available'));
                return;
            }

            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (e) => {
                const database = e.target.result;

                if (!database.objectStoreNames.contains(STORES.signals)) {
                    const store = database.createObjectStore(STORES.signals, { keyPath: 'id' });
                    store.createIndex('domain', 'domain', { unique: false });
                    store.createIndex('time', 'time', { unique: false });
                    store.createIndex('source', 'source', { unique: false });
                    store.createIndex('severity', 'severity', { unique: false });
                }

                if (!database.objectStoreNames.contains(STORES.reputation)) {
                    database.createObjectStore(STORES.reputation, { keyPath: 'source' });
                }

                if (!database.objectStoreNames.contains(STORES.quarantine)) {
                    database.createObjectStore(STORES.quarantine, { keyPath: 'feedId' });
                }

                if (!database.objectStoreNames.contains(STORES.meta)) {
                    database.createObjectStore(STORES.meta, { keyPath: 'key' });
                }
            };

            request.onsuccess = (e) => {
                db = e.target.result;
                available = true;
                resolve(db);
            };

            request.onerror = (e) => {
                openPromise = null;
                reject(e.target.error);
            };
        });

        return openPromise;
    }

    // ══════════════════════════════════════════════
    // TRANSACTION HELPERS
    // ══════════════════════════════════════════════

    function tx(storeName, mode) {
        if (!db) throw new Error('Database not open');
        return db.transaction(storeName, mode).objectStore(storeName);
    }

    function req(idbRequest) {
        return new Promise((resolve, reject) => {
            idbRequest.onsuccess = () => resolve(idbRequest.result);
            idbRequest.onerror = () => reject(idbRequest.error);
        });
    }

    // ══════════════════════════════════════════════
    // QUOTA GUARD — Storage exhaustion protection
    // ══════════════════════════════════════════════

    const QUOTA = {
        checkInterval: 5 * 60 * 1000,  // check every 5 min
        warningPercent: 70,             // warn at 70% usage
        criticalPercent: 85,            // start pruning at 85%
        maxSignals: 50000,              // hard cap on signal count
        schemaVersion: 1,
    };

    let lastQuotaCheck = 0;
    let quotaWarned = false;

    async function checkQuotaGuard() {
        const now = Date.now();
        if (now - lastQuotaCheck < QUOTA.checkInterval) return true;
        lastQuotaCheck = now;

        try {
            const est = await getStorageEstimate();
            if (est.percentUsed >= QUOTA.criticalPercent) {
                // Emergency: prune oldest 30% of signals
                const cutoff = now - (15 * 24 * 60 * 60 * 1000); // 15 days
                const deleted = await deleteOldSignals(cutoff);
                console.warn(`[IndexedStore] QUOTA CRITICAL (${est.percentUsed}%): pruned ${deleted} old signals`);
                return true;
            }
            if (est.percentUsed >= QUOTA.warningPercent && !quotaWarned) {
                quotaWarned = true;
                console.warn(`[IndexedStore] QUOTA WARNING: ${est.percentUsed}% used (${est.usageMB}MB / ${est.quotaMB}MB)`);
            }

            // Also check signal count cap
            const count = await getSignalCount();
            if (count > QUOTA.maxSignals) {
                const excess = count - QUOTA.maxSignals;
                const cutoff = now - (7 * 24 * 60 * 60 * 1000);
                await deleteOldSignals(cutoff);
                console.warn(`[IndexedStore] Signal count cap: ${count} signals, pruned entries older than 7 days`);
            }
        } catch (e) {
            // Can't check quota — continue
        }
        return true;
    }

    // Simple content hash (djb2) for integrity checking
    function contentHash(str) {
        let hash = 5381;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0xFFFFFFFF;
        }
        return hash.toString(36);
    }

    // ══════════════════════════════════════════════
    // SIGNAL STORAGE
    // ══════════════════════════════════════════════

    async function addSignal(signal) {
        try {
            await open();
            // Quota check (throttled)
            await checkQuotaGuard();

            // Add schema version + content hash for integrity
            signal._schemaV = QUOTA.schemaVersion;
            signal._hash = contentHash((signal.title || '') + (signal.link || ''));
            signal._storedAt = Date.now();

            const store = tx(STORES.signals, 'readwrite');
            await req(store.put(signal));
            return true;
        } catch (e) {
            return false;
        }
    }

    async function getSignals(options) {
        try {
            await open();
            const store = tx(STORES.signals, 'readonly');
            let signals = await req(store.getAll());

            signals.sort((a, b) => (b.time || 0) - (a.time || 0));

            if (options && options.domain && options.domain !== 'ALL') {
                signals = signals.filter(s => s.domain === options.domain);
            }
            if (options && options.minSeverity) {
                signals = signals.filter(s => s.severity >= options.minSeverity);
            }
            if (options && options.source) {
                signals = signals.filter(s => s.source === options.source);
            }
            if (options && options.limit) {
                signals = signals.slice(0, options.limit);
            }

            return signals;
        } catch (e) {
            return null;
        }
    }

    async function getSignalCount() {
        try {
            await open();
            return await req(tx(STORES.signals, 'readonly').count());
        } catch (e) {
            return -1;
        }
    }

    async function signalExists(id) {
        try {
            await open();
            const result = await req(tx(STORES.signals, 'readonly').get(id));
            return !!result;
        } catch (e) {
            return false;
        }
    }

    async function deleteOldSignals(cutoffTime) {
        try {
            await open();
            const store = tx(STORES.signals, 'readwrite');
            const index = store.index('time');
            const range = IDBKeyRange.upperBound(cutoffTime);
            let deleted = 0;

            return new Promise((resolve, reject) => {
                const cursor = index.openCursor(range);
                cursor.onsuccess = (e) => {
                    const c = e.target.result;
                    if (c) {
                        c.delete();
                        deleted++;
                        c.continue();
                    } else {
                        resolve(deleted);
                    }
                };
                cursor.onerror = () => reject(cursor.error);
            });
        } catch (e) {
            return 0;
        }
    }

    // ══════════════════════════════════════════════
    // SOURCE REPUTATION PERSISTENCE
    // ══════════════════════════════════════════════

    async function getReputation(source) {
        try {
            await open();
            return await req(tx(STORES.reputation, 'readonly').get(source)) || null;
        } catch (e) {
            return null;
        }
    }

    async function saveReputation(data) {
        try {
            await open();
            await req(tx(STORES.reputation, 'readwrite').put(data));
            return true;
        } catch (e) {
            return false;
        }
    }

    async function getAllReputations() {
        try {
            await open();
            return await req(tx(STORES.reputation, 'readonly').getAll());
        } catch (e) {
            return [];
        }
    }

    // ══════════════════════════════════════════════
    // FEED QUARANTINE
    // ══════════════════════════════════════════════

    async function getQuarantineEntry(feedId) {
        try {
            await open();
            return await req(tx(STORES.quarantine, 'readonly').get(feedId)) || null;
        } catch (e) {
            return null;
        }
    }

    async function saveQuarantineEntry(entry) {
        try {
            await open();
            await req(tx(STORES.quarantine, 'readwrite').put(entry));
            return true;
        } catch (e) {
            return false;
        }
    }

    async function getAllQuarantined() {
        try {
            await open();
            return await req(tx(STORES.quarantine, 'readonly').getAll());
        } catch (e) {
            return [];
        }
    }

    async function removeFromQuarantine(feedId) {
        try {
            await open();
            await req(tx(STORES.quarantine, 'readwrite').delete(feedId));
            return true;
        } catch (e) {
            return false;
        }
    }

    // ══════════════════════════════════════════════
    // META KEY-VALUE STORE
    // ══════════════════════════════════════════════

    async function getMeta(key) {
        try {
            await open();
            const result = await req(tx(STORES.meta, 'readonly').get(key));
            return result ? result.value : null;
        } catch (e) {
            return null;
        }
    }

    async function setMeta(key, value) {
        try {
            await open();
            await req(tx(STORES.meta, 'readwrite').put({ key, value, updatedAt: Date.now() }));
            return true;
        } catch (e) {
            return false;
        }
    }

    // ══════════════════════════════════════════════
    // MIGRATION FROM localStorage
    // ══════════════════════════════════════════════

    async function migrateFromLocalStorage() {
        try {
            await open();

            const migrated = await getMeta('ls_migrated');
            if (migrated) return { status: 'already_migrated' };

            let count = 0;
            const archiveRaw = localStorage.getItem('hs_signal_archive');
            if (archiveRaw) {
                const archive = JSON.parse(archiveRaw);
                const store = tx(STORES.signals, 'readwrite');
                for (const signal of archive) {
                    if (signal.id || signal.link) {
                        signal.id = signal.id || signal.link;
                        await req(store.put(signal));
                        count++;
                    }
                }
            }

            await setMeta('ls_migrated', { timestamp: Date.now(), count });
            console.log(`[IndexedStore] Migrated ${count} signals from localStorage`);
            return { status: 'migrated', count };
        } catch (e) {
            console.warn('[IndexedStore] Migration failed:', e);
            return { status: 'failed', error: e.message };
        }
    }

    // ══════════════════════════════════════════════
    // STORAGE ESTIMATE
    // ══════════════════════════════════════════════

    async function getStorageEstimate() {
        if (navigator.storage && navigator.storage.estimate) {
            const est = await navigator.storage.estimate();
            return {
                usage: est.usage || 0,
                quota: est.quota || 0,
                percentUsed: est.quota ? Math.round((est.usage / est.quota) * 100) : 0,
                usageMB: ((est.usage || 0) / (1024 * 1024)).toFixed(2),
                quotaMB: ((est.quota || 0) / (1024 * 1024)).toFixed(0),
            };
        }
        return { usage: 0, quota: 0, percentUsed: 0, usageMB: '0', quotaMB: 'unknown' };
    }

    // Auto-open on load
    open().then(() => {
        console.log('%c[INDEXED_STORE] v1.0 ONLINE — IndexedDB available', 'color: #39ff14; font-weight: bold;');
    }).catch(() => {
        console.warn('[INDEXED_STORE] IndexedDB not available, localStorage-only mode');
    });

    // ══════════════════════════════════════════════
    // PUBLIC API
    // ══════════════════════════════════════════════

    return {
        open,
        isAvailable: () => available,
        // Signals
        addSignal,
        getSignals,
        getSignalCount,
        signalExists,
        deleteOldSignals,
        // Quota
        checkQuotaGuard,
        contentHash,
        // Reputation
        getReputation,
        saveReputation,
        getAllReputations,
        // Quarantine
        getQuarantineEntry,
        saveQuarantineEntry,
        getAllQuarantined,
        removeFromQuarantine,
        // Meta
        getMeta,
        setMeta,
        // Migration
        migrateFromLocalStorage,
        getStorageEstimate,
    };

})();
