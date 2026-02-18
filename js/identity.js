/**
 * identity.js — Hybrid Syndicate Identity Layer
 * ═══════════════════════════════════════════════════════════
 * Persistent cognitive versioning via IndexedDB.
 * The blood that flows between all organs.
 *
 * Schema:
 *   timeline   — ordered epochs (events, milestones)
 *   state      — persistent key-value with metadata
 *   mutations  — delta log with parent chain (git-like)
 *   branches   — cognitive branches for parallel evolution
 *
 * Oracle writes. EEI reads. Predictor mutates. Chronos projects.
 * Same database. Same blood.
 *
 * Browser-native ES Module. Zero hard dependencies.
 * Bus is injected at runtime via init() — Identity works
 * silently without it (pure blood, no nerve required).
 * ═══════════════════════════════════════════════════════════
 */

const DB_NAME = 'hybrid-syndicate';
const DB_VERSION = 1;

// ── Auto-prune thresholds ──
// Derivation: avg epoch ~500B, avg mutation ~300B.
// 5K epochs ≈ 2.5MB, 10K mutations ≈ 3MB → ~5.5MB total.
// Browser IndexedDB quota is typically 50MB+ (origin-based).
// At 1 scan/min (future autonomous Oracle), 5K epochs ≈ 3.5 days
// before pruning kicks in. Conservative ceiling with 9x headroom.
const MAX_EPOCHS = 5000;
const MAX_MUTATIONS = 10000;

const STORES = {
    TIMELINE: 'timeline',
    STATE: 'state',
    MUTATIONS: 'mutations',
    BRANCHES: 'branches'
};

let db = null;
let bus = null;  // Injected via init() — never imported statically
let busWarned = false;

function emit(type, payload, source) {
    if (bus) return bus.emit(type, payload, source);
    // Guard: data was persisted but nobody heard it.
    // This means boot order is wrong — Identity is writing before
    // ECOSYSTEM.register() injected the Bus.
    if (!busWarned && (type === 'identity:epoch-created' || type === 'identity:mutation')) {
        console.warn(
            '%c[IDENTITY] %cWRITE WITHOUT BUS — epoch/mutation persisted but event lost. ' +
            'Check boot order: ECOSYSTEM.register("identity") must run before any module writes.',
            'color: #ff0084; font-weight: bold;',
            'color: #ff6633;'
        );
        busWarned = true;
    }
}

// ── IndexedDB connection ──
function openDB() {
    return new Promise((resolve, reject) => {
        if (db) return resolve(db);

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const database = event.target.result;

            // Timeline: ordered epochs
            if (!database.objectStoreNames.contains(STORES.TIMELINE)) {
                const timeline = database.createObjectStore(STORES.TIMELINE, { keyPath: 'id' });
                timeline.createIndex('timestamp', 'timestamp', { unique: false });
                timeline.createIndex('branch', 'branch', { unique: false });
                timeline.createIndex('type', 'type', { unique: false });
                timeline.createIndex('source', 'source', { unique: false });
            }

            // State: persistent key-value
            if (!database.objectStoreNames.contains(STORES.STATE)) {
                database.createObjectStore(STORES.STATE, { keyPath: 'key' });
            }

            // Mutations: delta log with parent chain
            if (!database.objectStoreNames.contains(STORES.MUTATIONS)) {
                const mutations = database.createObjectStore(STORES.MUTATIONS, { keyPath: 'id' });
                mutations.createIndex('parent', 'parent', { unique: false });
                mutations.createIndex('branch', 'branch', { unique: false });
                mutations.createIndex('timestamp', 'timestamp', { unique: false });
                mutations.createIndex('source', 'source', { unique: false });
            }

            // Branches: cognitive branches
            if (!database.objectStoreNames.contains(STORES.BRANCHES)) {
                database.createObjectStore(STORES.BRANCHES, { keyPath: 'name' });
            }
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            resolve(db);
        };

        request.onerror = (event) => {
            reject(new Error(`IndexedDB error: ${event.target.error}`));
        };
    });
}

// ── Transaction helper ──
async function tx(storeName, mode, operation) {
    const database = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = database.transaction(storeName, mode);
        const store = transaction.objectStore(storeName);
        const request = operation(store);

        if (request && typeof request.onsuccess !== 'undefined') {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        } else {
            transaction.oncomplete = () => resolve(request);
            transaction.onerror = () => reject(transaction.error);
        }
    });
}

// ── GetAll helper ──
async function getAll(storeName, indexName = null, query = null) {
    const database = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = database.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const target = indexName ? store.index(indexName) : store;
        const request = query !== null ? target.getAll(query) : target.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// ── Count helper ──
async function countStore(storeName) {
    const database = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = database.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// ── Auto-prune oldest records when store exceeds max ──
async function pruneStore(storeName, maxRecords) {
    const count = await countStore(storeName);
    if (count <= maxRecords) return;

    const excess = count - maxRecords;
    const database = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = database.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const index = store.index('timestamp');
        const request = index.openCursor();
        let deleted = 0;

        request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor && deleted < excess) {
                cursor.delete();
                deleted++;
                cursor.continue();
            }
        };

        transaction.oncomplete = () => resolve(deleted);
        transaction.onerror = () => reject(transaction.error);
    });
}

// ═══════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════

export const Identity = {

    /**
     * Initialize the Identity layer.
     * Creates the 'main' branch if no branches exist.
     */
    /**
     * @param {object} [eco]  - ECOSYSTEM instance (when called via register)
     * @param {object} [b]    - Bus instance to inject
     */
    async init(eco, b) {
        if (b) bus = b;

        await openDB();

        const branches = await this.getBranches();
        if (branches.length === 0) {
            await this.createBranch('main', 'Primary cognitive timeline');
        }

        emit('identity:ready', {
            stores: Object.values(STORES),
            dbName: DB_NAME,
            dbVersion: DB_VERSION
        }, 'identity');

        console.log(
            '%c[IDENTITY] %cPersistent layer ready. %c' + Object.values(STORES).length + ' stores.' +
            (bus ? ' Bus: connected.' : ' Bus: none (silent mode).'),
            'color: #ff0084; font-weight: bold;',
            'color: #6b7fa3;',
            'color: #39ff14;'
        );

        return this;
    },

    // ═══════════════════════════════════════
    // TIMELINE — Ordered epochs
    // ═══════════════════════════════════════

    /**
     * Add an epoch to the timeline.
     * @param {object} data          - Epoch content
     * @param {string} data.type     - Epoch type (e.g., "scan", "prediction", "alert")
     * @param {string} data.title    - Human-readable title
     * @param {object} data.content  - Payload data
     * @param {string} data.source   - Module that created this
     * @param {Array}  data.tags     - Searchable tags
     * @param {string} branch        - Branch name (default: "main")
     */
    async addEpoch(data, branch = 'main') {
        const epoch = {
            id: crypto.randomUUID(),
            branch,
            timestamp: Date.now(),
            type: data.type || 'generic',
            title: data.title || '',
            content: data.content || {},
            source: data.source || 'unknown',
            tags: data.tags || []
        };

        await tx(STORES.TIMELINE, 'readwrite', store => store.add(epoch));
        emit('identity:epoch-created', epoch, data.source || 'identity');
        await pruneStore(STORES.TIMELINE, MAX_EPOCHS);
        return epoch;
    },

    /**
     * Get timeline, optionally filtered by branch.
     */
    async getTimeline(branch = null) {
        const all = branch
            ? await getAll(STORES.TIMELINE, 'branch', branch)
            : await getAll(STORES.TIMELINE);
        return all.sort((a, b) => a.timestamp - b.timestamp);
    },

    /**
     * Get a single epoch by ID.
     */
    async getEpoch(id) {
        return tx(STORES.TIMELINE, 'readonly', store => store.get(id));
    },

    /**
     * Get recent epochs (last N).
     */
    async getRecentEpochs(count = 20, branch = null) {
        const timeline = await this.getTimeline(branch);
        return timeline.slice(-count);
    },

    /**
     * Search epochs by type.
     */
    async getEpochsByType(type) {
        return getAll(STORES.TIMELINE, 'type', type);
    },

    // ═══════════════════════════════════════
    // STATE — Persistent key-value
    // ═══════════════════════════════════════

    /**
     * Save a persistent state value.
     */
    async saveState(key, value, source = 'unknown') {
        const entry = {
            key,
            value,
            timestamp: Date.now(),
            source
        };

        await tx(STORES.STATE, 'readwrite', store => store.put(entry));
        emit('identity:state-saved', { key, source }, 'identity');
        return entry;
    },

    /**
     * Load a persistent state value.
     */
    async loadState(key) {
        const entry = await tx(STORES.STATE, 'readonly', store => store.get(key));
        return entry ? entry.value : undefined;
    },

    /**
     * Get all persisted state entries.
     */
    async getAllState() {
        return getAll(STORES.STATE);
    },

    /**
     * Delete a persisted state entry.
     */
    async deleteState(key) {
        await tx(STORES.STATE, 'readwrite', store => store.delete(key));
        emit('identity:state-deleted', { key }, 'identity');
    },

    // ═══════════════════════════════════════
    // MUTATIONS — Delta log (cognitive versioning)
    // ═══════════════════════════════════════

    /**
     * Record a mutation (delta).
     * Each mutation has an optional parent, forming a chain (like git commits).
     *
     * @param {object} delta     - What changed
     * @param {string} branch    - Branch name
     * @param {string} parentId  - Parent mutation ID (null for root)
     * @param {string} source    - Module that caused this
     */
    async mutate(delta, branch = 'main', parentId = null, source = 'unknown') {
        const mutation = {
            id: crypto.randomUUID(),
            parent: parentId,
            branch,
            delta,
            source,
            timestamp: Date.now()
        };

        await tx(STORES.MUTATIONS, 'readwrite', store => store.add(mutation));
        emit('identity:mutation', mutation, 'identity');
        await pruneStore(STORES.MUTATIONS, MAX_MUTATIONS);
        return mutation;
    },

    /**
     * Get all mutations, optionally by branch.
     */
    async getMutations(branch = null) {
        const all = branch
            ? await getAll(STORES.MUTATIONS, 'branch', branch)
            : await getAll(STORES.MUTATIONS);
        return all.sort((a, b) => a.timestamp - b.timestamp);
    },

    /**
     * Walk the mutation chain from a given ID back to root.
     */
    async getMutationChain(id) {
        const chain = [];
        let currentId = id;

        while (currentId) {
            const mutation = await tx(STORES.MUTATIONS, 'readonly', store => store.get(currentId));
            if (!mutation) break;
            chain.unshift(mutation);
            currentId = mutation.parent;
        }

        return chain;
    },

    /**
     * Get the latest mutation on a branch.
     */
    async getLatestMutation(branch = 'main') {
        const mutations = await this.getMutations(branch);
        return mutations.length > 0 ? mutations[mutations.length - 1] : null;
    },

    // ═══════════════════════════════════════
    // BRANCHES — Cognitive branching
    // ═══════════════════════════════════════

    /**
     * Create a new cognitive branch.
     */
    async createBranch(name, description = '') {
        const branch = {
            name,
            description,
            createdAt: Date.now(),
            status: 'active'
        };

        await tx(STORES.BRANCHES, 'readwrite', store => store.put(branch));
        emit('identity:branch-created', branch, 'identity');
        return branch;
    },

    /**
     * Get all branches.
     */
    async getBranches() {
        return getAll(STORES.BRANCHES);
    },

    /**
     * Get a specific branch.
     */
    async getBranch(name) {
        return tx(STORES.BRANCHES, 'readonly', store => store.get(name));
    },

    /**
     * Update branch status.
     */
    async updateBranch(name, updates) {
        const branch = await this.getBranch(name);
        if (!branch) return null;

        const updated = { ...branch, ...updates };
        await tx(STORES.BRANCHES, 'readwrite', store => store.put(updated));
        emit('identity:branch-updated', updated, 'identity');
        return updated;
    },

    // ═══════════════════════════════════════
    // STATISTICS
    // ═══════════════════════════════════════

    /**
     * Get comprehensive statistics about the identity store.
     */
    async getStats() {
        const [epochCount, mutationCount, branchCount, stateCount] = await Promise.all([
            countStore(STORES.TIMELINE),
            countStore(STORES.MUTATIONS),
            countStore(STORES.BRANCHES),
            countStore(STORES.STATE)
        ]);

        const timeline = epochCount > 0 ? await this.getTimeline() : [];

        return {
            epochs: epochCount,
            mutations: mutationCount,
            branches: branchCount,
            stateKeys: stateCount,
            oldestEpoch: timeline.length > 0 ? timeline[0].timestamp : null,
            newestEpoch: timeline.length > 0 ? timeline[timeline.length - 1].timestamp : null,
            age: timeline.length > 0
                ? Date.now() - timeline[0].timestamp
                : 0
        };
    },

    // ═══════════════════════════════════════
    // EXPORT / IMPORT (for portability)
    // ═══════════════════════════════════════

    /**
     * Export entire identity as JSON (for backup/transfer).
     */
    async export() {
        const [timeline, states, mutations, branches] = await Promise.all([
            getAll(STORES.TIMELINE),
            getAll(STORES.STATE),
            getAll(STORES.MUTATIONS),
            getAll(STORES.BRANCHES)
        ]);

        return {
            version: DB_VERSION,
            exportedAt: Date.now(),
            timeline,
            state: states,
            mutations,
            branches
        };
    },

    /**
     * Import identity from JSON export.
     * WARNING: This clears existing data.
     */
    async import(data) {
        if (!data || !data.version) {
            throw new Error('Invalid import data: missing version');
        }

        await this.clear();

        const database = await openDB();

        // Import each store
        const storeNames = [STORES.TIMELINE, STORES.STATE, STORES.MUTATIONS, STORES.BRANCHES];
        const dataKeys = ['timeline', 'state', 'mutations', 'branches'];

        for (let i = 0; i < storeNames.length; i++) {
            const items = data[dataKeys[i]] || [];
            if (items.length > 0) {
                await new Promise((resolve, reject) => {
                    const transaction = database.transaction(storeNames[i], 'readwrite');
                    const store = transaction.objectStore(storeNames[i]);
                    items.forEach(item => store.put(item));
                    transaction.oncomplete = () => resolve();
                    transaction.onerror = () => reject(transaction.error);
                });
            }
        }

        emit('identity:imported', {
            epochs: (data.timeline || []).length,
            mutations: (data.mutations || []).length,
            branches: (data.branches || []).length,
            states: (data.state || []).length
        }, 'identity');
    },

    /**
     * Clear all identity data.
     */
    async clear() {
        const database = await openDB();
        const storeNames = Object.values(STORES);

        return new Promise((resolve, reject) => {
            const transaction = database.transaction(storeNames, 'readwrite');
            storeNames.forEach(name => transaction.objectStore(name).clear());
            transaction.oncomplete = () => {
                emit('identity:cleared', {}, 'identity');
                resolve();
            };
            transaction.onerror = () => reject(transaction.error);
        });
    }
};
