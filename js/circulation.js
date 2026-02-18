/**
 * circulation.js — Hybrid Syndicate Circulatory System
 * ═══════════════════════════════════════════════════════════
 * Normalizer + in-memory Index for the ecosystem bloodstream.
 *
 * Listens to `envelope:*` on the Bus. Every validated Envelope
 * that enters the blood gets:
 *   1. Indexed by source, domain, tag, and priority
 *   2. Stored in a rolling window (bounded memory)
 *   3. Made queryable for downstream consumers (Agora, Evaluation)
 *
 * This module does NOT think. It does NOT decide.
 * It normalizes, classifies, and serves. Pure plumbing.
 *
 * Browser-native ES Module. Depends on envelope.js (via core.js).
 * ═══════════════════════════════════════════════════════════
 */

import { isEnvelope, PRIORITY_WEIGHT } from './envelope.js';

// ── Configuration ──
const MAX_WINDOW  = 500;   // Rolling window ceiling
const DECAY_CHECK = 100;   // Run decay check every N inserts

// ── In-memory stores ──
const window_    = [];           // Rolling window — ordered by arrival
const bySource   = new Map();    // source   → Envelope[]
const byDomain   = new Map();    // domain   → Envelope[]
const byTag      = new Map();    // tag      → Envelope[]
const byPriority = new Map();    // priority → Envelope[]
const byId       = new Map();    // id       → Envelope (for fast lookup)

let insertCount = 0;
let totalIngested = 0;
let bus = null;

// ── Indexing ──

function indexEnvelope(envelope) {
    // Rolling window
    window_.push(envelope);

    // ID lookup
    byId.set(envelope.id, envelope);

    // Source index
    if (!bySource.has(envelope.source)) bySource.set(envelope.source, []);
    bySource.get(envelope.source).push(envelope);

    // Domain index
    if (!byDomain.has(envelope.domain)) byDomain.set(envelope.domain, []);
    byDomain.get(envelope.domain).push(envelope);

    // Priority index
    if (!byPriority.has(envelope.priority)) byPriority.set(envelope.priority, []);
    byPriority.get(envelope.priority).push(envelope);

    // Tag index (one entry per tag)
    if (envelope.meta && envelope.meta.tags) {
        for (const tag of envelope.meta.tags) {
            if (!byTag.has(tag)) byTag.set(tag, []);
            byTag.get(tag).push(envelope);
        }
    }

    totalIngested++;
    insertCount++;

    // Periodic eviction
    if (insertCount >= DECAY_CHECK) {
        insertCount = 0;
        evict();
    }
}

function removeFromIndex(map, key, envelope) {
    const arr = map.get(key);
    if (!arr) return;
    const idx = arr.indexOf(envelope);
    if (idx > -1) arr.splice(idx, 1);
    if (arr.length === 0) map.delete(key);
}

function evict() {
    while (window_.length > MAX_WINDOW) {
        const oldest = window_.shift();

        // Remove from all indexes
        byId.delete(oldest.id);
        removeFromIndex(bySource, oldest.source, oldest);
        removeFromIndex(byDomain, oldest.domain, oldest);
        removeFromIndex(byPriority, oldest.priority, oldest);

        if (oldest.meta && oldest.meta.tags) {
            for (const tag of oldest.meta.tags) {
                removeFromIndex(byTag, tag, oldest);
            }
        }
    }
}

// ── Query API ──

/**
 * Apply common filters to an envelope array.
 * @param {object[]} envelopes
 * @param {object}   [opts]
 * @param {number}   [opts.limit]         - Max results
 * @param {number}   [opts.minConfidence] - Minimum confidence (0-1)
 * @param {number}   [opts.after]         - Only after this timestamp
 * @param {number}   [opts.before]        - Only before this timestamp
 * @param {string}   [opts.minPriority]   - Minimum priority level
 * @returns {object[]} Filtered envelopes, newest first
 */
function applyFilters(envelopes, opts = {}) {
    let result = envelopes;

    if (opts.after) {
        result = result.filter(e => e.ts > opts.after);
    }
    if (opts.before) {
        result = result.filter(e => e.ts < opts.before);
    }
    if (typeof opts.minConfidence === 'number') {
        result = result.filter(e =>
            e.meta && e.meta.confidence !== null && e.meta.confidence >= opts.minConfidence
        );
    }
    if (opts.minPriority && PRIORITY_WEIGHT[opts.minPriority] !== undefined) {
        const minWeight = PRIORITY_WEIGHT[opts.minPriority];
        result = result.filter(e => e.priorityWeight >= minWeight);
    }

    // Newest first
    result = [...result].sort((a, b) => b.ts - a.ts);

    if (opts.limit && opts.limit > 0) {
        result = result.slice(0, opts.limit);
    }

    return result;
}

// ── Module definition ──

const Circulation = {
    name: 'circulation',
    version: '1.0.0',

    init(eco, b) {
        bus = b;

        // Listen to all envelopes entering the bloodstream
        bus.on('envelope:*', (event) => {
            const envelope = event.payload;

            if (!isEnvelope(envelope)) {
                console.warn(
                    '%c[CIRCULATION] %cREJECTED malformed envelope from event "%c' +
                    event.type + '%c"',
                    'color: #ff6633; font-weight: bold;',
                    'color: #ff3333;',
                    'color: #ff0084;',
                    'color: #ff3333;'
                );
                return;
            }

            indexEnvelope(envelope);

            // Emit normalized event for downstream consumers
            bus.emit('circulation:indexed', {
                id:       envelope.id,
                source:   envelope.source,
                domain:   envelope.domain,
                type:     envelope.type,
                priority: envelope.priority,
                ts:       envelope.ts
            }, 'circulation');
        });

        eco.setState('circulation.status', 'active', { source: 'circulation' });

        console.log(
            '%c[CIRCULATION] %cBloodstream online %c— indexing all envelope:* events.',
            'color: #ff6633; font-weight: bold;',
            'color: #39ff14;',
            'color: #6b7fa3;'
        );
    },

    destroy() {
        window_.length = 0;
        bySource.clear();
        byDomain.clear();
        byTag.clear();
        byPriority.clear();
        byId.clear();
        insertCount = 0;
        totalIngested = 0;
    },

    // ═══════════════════════════════════════
    // QUERY INTERFACE
    // ═══════════════════════════════════════

    /**
     * Get recent envelopes from the rolling window.
     * @param {number} [count=20] - How many
     * @param {object} [opts] - Filter options
     */
    getRecent(count = 20, opts = {}) {
        return applyFilters(window_, { ...opts, limit: count });
    },

    /**
     * Get envelopes by source module.
     * @param {string} source - Module name (oracle, eei, etc.)
     * @param {object} [opts] - Filter options
     */
    getBySource(source, opts = {}) {
        return applyFilters(bySource.get(source) || [], opts);
    },

    /**
     * Get envelopes by domain.
     * @param {string} domain - signal | analysis | prediction | mutation | metric | system
     * @param {object} [opts] - Filter options
     */
    getByDomain(domain, opts = {}) {
        return applyFilters(byDomain.get(domain) || [], opts);
    },

    /**
     * Get envelopes by tag.
     * @param {string} tag - Tag to search for
     * @param {object} [opts] - Filter options
     */
    getByTag(tag, opts = {}) {
        return applyFilters(byTag.get(tag) || [], opts);
    },

    /**
     * Get envelopes by minimum priority level.
     * @param {string} minPriority - low | normal | high | critical
     * @param {object} [opts] - Filter options
     */
    getByMinPriority(minPriority, opts = {}) {
        const minWeight = PRIORITY_WEIGHT[minPriority];
        if (minWeight === undefined) return [];

        const results = [];
        for (const [priority, envelopes] of byPriority) {
            if (PRIORITY_WEIGHT[priority] >= minWeight) {
                results.push(...envelopes);
            }
        }
        return applyFilters(results, opts);
    },

    /**
     * Get a single envelope by ID.
     * @param {string} id
     */
    getById(id) {
        return byId.get(id) || null;
    },

    /**
     * Multi-criteria query.
     * @param {object} criteria
     * @param {string}   [criteria.source]
     * @param {string}   [criteria.domain]
     * @param {string}   [criteria.tag]
     * @param {string}   [criteria.type]
     * @param {string}   [criteria.minPriority]
     * @param {number}   [criteria.minConfidence]
     * @param {number}   [criteria.after]
     * @param {number}   [criteria.before]
     * @param {number}   [criteria.limit]
     */
    query(criteria = {}) {
        // Start with narrowest index available
        let pool;
        if (criteria.tag) {
            pool = byTag.get(criteria.tag) || [];
        } else if (criteria.source) {
            pool = bySource.get(criteria.source) || [];
        } else if (criteria.domain) {
            pool = byDomain.get(criteria.domain) || [];
        } else {
            pool = window_;
        }

        let result = [...pool];

        // Apply remaining filters
        if (criteria.source && criteria.tag) {
            result = result.filter(e => e.source === criteria.source);
        }
        if (criteria.domain && (criteria.tag || criteria.source)) {
            result = result.filter(e => e.domain === criteria.domain);
        }
        if (criteria.type) {
            result = result.filter(e => e.type === criteria.type);
        }

        return applyFilters(result, {
            limit:         criteria.limit,
            minConfidence: criteria.minConfidence,
            minPriority:   criteria.minPriority,
            after:         criteria.after,
            before:        criteria.before
        });
    },

    // ═══════════════════════════════════════
    // DIAGNOSTICS
    // ═══════════════════════════════════════

    /**
     * Get circulation stats.
     */
    getStats() {
        return {
            windowSize:    window_.length,
            maxWindow:     MAX_WINDOW,
            totalIngested,
            sources:       Array.from(bySource.keys()),
            domains:       Array.from(byDomain.keys()),
            tags:          Array.from(byTag.keys()),
            priorities:    Object.fromEntries(
                Array.from(byPriority.entries()).map(([k, v]) => [k, v.length])
            )
        };
    },

    /**
     * Get all known tags with counts.
     */
    getTagCloud() {
        const cloud = {};
        for (const [tag, envelopes] of byTag) {
            cloud[tag] = envelopes.length;
        }
        return cloud;
    }
};

export default Circulation;
