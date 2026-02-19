/**
 * archivio-silente.js — Immutable Memory & Evidence Sealing
 * ═══════════════════════════════════════════════════════════════
 * Hybrid Syndicate / Ethic Software Foundation
 *
 * The system's long-term memory. Seals cognitive states, epochs,
 * correlations, mutations, and predictions into hash-chained
 * snapshots. Once sealed, never modified.
 *
 * This is not storage. This is notarization.
 *
 * Architecture:
 *   Event triggers → Sealing Engine → Hash Chain → IndexedDB
 *   Operator/Export → Query API → JSON Dossier
 *
 * Persistence: Identity.saveState() for chain metadata,
 *   in-memory for active session, exportable as JSON bundles.
 *
 * ═══════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════
// CRYPTO — browser-native SHA-256
// ═══════════════════════════════════════════════════════════════

async function sha256(text) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

function uuid() {
    return crypto.randomUUID();
}

// ═══════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════

let ecosystem = null;
let bus = null;
let identity = null;

const chain = [];               // Ordered snapshots (append-only)
let sequence = 0;               // Monotonic counter
let previousHash = null;        // Head of hash chain
const snapshotIndex = new Map(); // id → snapshot (fast lookup)

// Rolling event buffer — recent events that may be included in snapshots
const eventBuffer = {
    epochs: [],           // Recent epoch events (max 50)
    correlations: [],     // Recent correlation events (max 20)
    cognitiveStates: [],  // Recent cognitive states (max 20)
    mutations: [],        // Recent oracle mutations (max 20)
    predictions: [],      // Recent predictions (max 20)
};
const BUFFER_MAX = { epochs: 50, correlations: 20, cognitiveStates: 20, mutations: 20, predictions: 20 };

function bufferPush(category, item) {
    const arr = eventBuffer[category];
    arr.push(item);
    if (arr.length > BUFFER_MAX[category]) arr.shift();
}

// ═══════════════════════════════════════════════════════════════
// SEALING ENGINE — the core of Archivio Silente
// ═══════════════════════════════════════════════════════════════

/**
 * Collect evidence items for a snapshot.
 * Gathers recent relevant data from the ecosystem.
 *
 * @param {string|null} theater - Theater context
 * @param {string} trigger - What triggered this seal
 * @param {object|null} triggerEvent - The triggering event data
 * @returns {object[]} Array of ArchiveItems
 */
function collectEvidence(theater, trigger, triggerEvent) {
    const items = [];
    const now = Date.now();

    // Include the triggering event itself
    if (triggerEvent) {
        items.push({
            type: trigger.includes('correlation') ? 'correlation' :
                  trigger.includes('cognitive') || trigger.includes('agora') ? 'cognitive-state' :
                  trigger.includes('mutation') || trigger.includes('oracle') ? 'oracle-mutation' :
                  trigger.includes('prediction') ? 'prediction' : 'event',
            id: triggerEvent.id || uuid(),
            ts: triggerEvent.ts || triggerEvent.timestamp || now,
            data: triggerEvent,
            sourceModule: triggerEvent.source || 'unknown',
        });
    }

    // Collect recent epochs from theater module (last 2 hours)
    const theaterMod = theater ? ecosystem.getModule(theater) : null;
    if (theaterMod && theaterMod.getRecent) {
        const recent = theaterMod.getRecent(15);
        const twoHoursAgo = now - 2 * 3600000;
        for (const epoch of recent) {
            if (epoch.timestamp >= twoHoursAgo) {
                items.push({
                    type: 'epoch',
                    id: epoch.text_hash || uuid(),
                    ts: epoch.timestamp,
                    data: epoch,
                    sourceModule: theater,
                });
            }
        }
    }

    // Include latest cognitive state for this theater
    const delib = ecosystem.getModule('deliberation-engine');
    if (delib && delib.getLatestState) {
        const state = delib.getLatestState(theater);
        if (state) {
            // Avoid duplicating if already in items
            const exists = items.some(i => i.type === 'cognitive-state' && i.ts === state.timestamp);
            if (!exists) {
                items.push({
                    type: 'cognitive-state',
                    id: uuid(),
                    ts: state.timestamp,
                    data: state,
                    sourceModule: 'deliberation-engine',
                });
            }
        }
    }

    // Include buffered correlations for this theater
    for (const corr of eventBuffer.correlations) {
        if (!theater || corr.theater === theater) {
            items.push({
                type: 'correlation',
                id: corr.id || uuid(),
                ts: corr.timestamp || corr.ts || now,
                data: corr,
                sourceModule: 'correlation-engine',
            });
        }
    }

    // Include buffered mutations
    for (const mut of eventBuffer.mutations) {
        if (!theater || mut.theater === theater) {
            items.push({
                type: 'oracle-mutation',
                id: mut.id || uuid(),
                ts: mut.timestamp || mut.ts || now,
                data: mut,
                sourceModule: 'oracle',
            });
        }
    }

    // Include buffered predictions
    for (const pred of eventBuffer.predictions) {
        if (!theater || pred.theater === theater) {
            items.push({
                type: 'prediction',
                id: pred.id || uuid(),
                ts: pred.timestamp || pred.ts || now,
                data: pred,
                sourceModule: 'eei-predictor',
            });
        }
    }

    return items;
}

/**
 * Seal a snapshot. The core operation.
 * Creates a hash-chained, immutable record.
 *
 * @param {string} trigger - What triggered this seal
 * @param {object} options
 * @param {string|null} options.theater - Theater context
 * @param {object|null} options.triggerEvent - The triggering event
 * @param {object[]|null} options.items - Override: provide items directly
 * @param {string|null} options.note - Operator note
 * @param {boolean} options.operatorSealed - Whether operator triggered this
 * @returns {Promise<object>} The sealed snapshot
 */
async function seal(trigger, options = {}) {
    const {
        theater = null,
        triggerEvent = null,
        items = null,
        note = null,
        operatorSealed = false,
    } = options;

    // Collect evidence
    const evidenceItems = items || collectEvidence(theater, trigger, triggerEvent);

    // Build snapshot payload (before hash)
    const snapshotPayload = {
        items: evidenceItems,
        theater,
        trigger,
        note,
    };

    // Compute hash: previousHash + payload
    const hashInput = (previousHash || 'GENESIS') + JSON.stringify(snapshotPayload);
    const contentHash = await sha256(hashInput);

    // Build full snapshot
    sequence++;
    const snapshot = Object.freeze({
        schemaVersion: '1.0',
        id: uuid(),
        type: 'archive-snapshot',
        theater,
        ts: Date.now(),
        sequence,
        trigger,

        // Content
        items: Object.freeze(evidenceItems.map(i => Object.freeze({ ...i }))),
        itemCounts: Object.freeze({
            epochs: evidenceItems.filter(i => i.type === 'epoch').length,
            correlations: evidenceItems.filter(i => i.type === 'correlation').length,
            cognitiveStates: evidenceItems.filter(i => i.type === 'cognitive-state').length,
            mutations: evidenceItems.filter(i => i.type === 'oracle-mutation').length,
            predictions: evidenceItems.filter(i => i.type === 'prediction').length,
            other: evidenceItems.filter(i => !['epoch','correlation','cognitive-state','oracle-mutation','prediction'].includes(i.type)).length,
        }),

        // Integrity
        hash: contentHash,
        previousHash,
        sealed: true,

        // Provenance
        provenance: Object.freeze({
            sealedBy: 'archivio-silente',
            trigger,
            operatorSealed,
            note,
        }),
    });

    // Append to chain
    chain.push(snapshot);
    snapshotIndex.set(snapshot.id, snapshot);
    previousHash = contentHash;

    // Persist chain state via Identity
    await persistChainState();

    // Emit event
    if (bus) {
        bus.emit('archive:sealed', {
            snapshotId: snapshot.id,
            sequence: snapshot.sequence,
            contentHash: snapshot.hash,
            trigger: snapshot.trigger,
            theater: snapshot.theater,
            itemCount: evidenceItems.length,
            timestamp: snapshot.ts,
        }, 'archivio-silente');
    }

    console.log(
        `%c[ARCHIVIO] %cSnapshot #${snapshot.sequence} sealed %c— ` +
        `${evidenceItems.length} items, trigger: ${trigger}` +
        (theater ? `, theater: ${theater}` : '') +
        `\n%c  hash: ${contentHash.substring(0, 16)}...`,
        'color: #00d4ff; font-weight: bold;',
        'color: #39ff14;',
        'color: #6b7fa3;',
        'color: #3a4f6f;'
    );

    return snapshot;
}

// ═══════════════════════════════════════════════════════════════
// PERSISTENCE — store chain metadata via Identity
// ═══════════════════════════════════════════════════════════════

async function persistChainState() {
    if (!identity) return;
    try {
        await identity.saveState('archive.sequence', sequence, 'archivio-silente');
        await identity.saveState('archive.previousHash', previousHash, 'archivio-silente');
        await identity.saveState('archive.chainLength', chain.length, 'archivio-silente');

        // Save snapshots (without items — too large; save IDs + hashes for chain verification)
        const chainMeta = chain.map(s => ({
            id: s.id, sequence: s.sequence, ts: s.ts,
            hash: s.hash, previousHash: s.previousHash,
            trigger: s.trigger, theater: s.theater,
            itemCount: s.items.length,
        }));
        await identity.saveState('archive.chainMeta', chainMeta, 'archivio-silente');

        // Save full snapshots (for session recovery)
        await identity.saveState('archive.snapshots', chain.map(s => s), 'archivio-silente');
    } catch (err) {
        console.warn('[ARCHIVIO] Persistence error:', err.message);
    }
}

async function restoreChainState() {
    if (!identity) return;
    try {
        const savedSeq = await identity.loadState('archive.sequence');
        const savedHash = await identity.loadState('archive.previousHash');
        const savedSnapshots = await identity.loadState('archive.snapshots');

        if (savedSeq !== undefined) sequence = savedSeq;
        if (savedHash !== undefined) previousHash = savedHash;

        if (Array.isArray(savedSnapshots)) {
            for (const s of savedSnapshots) {
                const frozen = Object.freeze(s);
                chain.push(frozen);
                snapshotIndex.set(frozen.id, frozen);
            }
        }

        if (chain.length > 0) {
            console.log(
                `%c[ARCHIVIO] %cChain restored: ${chain.length} snapshots, seq #${sequence}`,
                'color: #00d4ff; font-weight: bold;',
                'color: #6b7fa3;'
            );
        }
    } catch (err) {
        console.warn('[ARCHIVIO] Restore error:', err.message);
    }
}

// ═══════════════════════════════════════════════════════════════
// INTEGRITY VERIFICATION — hash chain validation
// ═══════════════════════════════════════════════════════════════

/**
 * Verify the integrity of the entire hash chain.
 * Recomputes every hash and checks the chain links.
 *
 * @returns {Promise<object>} { valid, length, errors[], verified }
 */
async function verifyIntegrity() {
    const errors = [];
    let prevHash = null;

    for (let i = 0; i < chain.length; i++) {
        const snapshot = chain[i];

        // Check chain link
        if (snapshot.previousHash !== prevHash) {
            errors.push(`Snapshot #${snapshot.sequence}: previousHash mismatch ` +
                `(expected ${prevHash?.substring(0, 8) || 'null'}, got ${snapshot.previousHash?.substring(0, 8) || 'null'})`);
        }

        // Recompute hash
        const payload = {
            items: snapshot.items,
            theater: snapshot.theater,
            trigger: snapshot.trigger,
            note: snapshot.provenance?.note || null,
        };
        const hashInput = (snapshot.previousHash || 'GENESIS') + JSON.stringify(payload);
        const recomputed = await sha256(hashInput);

        if (recomputed !== snapshot.hash) {
            errors.push(`Snapshot #${snapshot.sequence}: hash mismatch ` +
                `(stored: ${snapshot.hash.substring(0, 8)}..., computed: ${recomputed.substring(0, 8)}...)`);
        }

        // Check sequence
        if (snapshot.sequence !== i + 1) {
            errors.push(`Snapshot #${snapshot.sequence}: sequence gap (expected ${i + 1})`);
        }

        prevHash = snapshot.hash;
    }

    const result = {
        valid: errors.length === 0,
        length: chain.length,
        errors,
        verified: new Date().toISOString(),
    };

    if (bus) {
        bus.emit('archive:chain-verified', {
            fromSequence: 1,
            toSequence: chain.length,
            valid: result.valid,
            errors: errors.length,
        }, 'archivio-silente');
    }

    if (result.valid) {
        console.log(
            `%c[ARCHIVIO] %cChain integrity VERIFIED %c— ${chain.length} snapshots, 0 errors`,
            'color: #00d4ff; font-weight: bold;',
            'color: #39ff14;',
            'color: #6b7fa3;'
        );
    } else {
        console.error(
            `%c[ARCHIVIO] %cChain integrity BROKEN %c— ${errors.length} errors`,
            'color: #00d4ff; font-weight: bold;',
            'color: #ff3344;',
            'color: #6b7fa3;',
            errors
        );
    }

    return result;
}

// ═══════════════════════════════════════════════════════════════
// EXPORT BUNDLE — the dossier for a journalist
// ═══════════════════════════════════════════════════════════════

/**
 * Export a snapshot as a self-contained JSON dossier.
 *
 * @param {string} snapshotId - Snapshot to export
 * @returns {object|null} Export bundle or null if not found
 */
function exportBundle(snapshotId) {
    const snapshot = snapshotIndex.get(snapshotId);
    if (!snapshot) return null;

    // Extract epochs timeline
    const epochs = snapshot.items
        .filter(i => i.type === 'epoch')
        .sort((a, b) => a.ts - b.ts);

    // Extract correlations
    const correlations = snapshot.items
        .filter(i => i.type === 'correlation');

    // Extract cognitive state
    const cognitiveStates = snapshot.items
        .filter(i => i.type === 'cognitive-state');

    // Extract mutations
    const mutations = snapshot.items
        .filter(i => i.type === 'oracle-mutation');

    // Extract predictions
    const predictions = snapshot.items
        .filter(i => i.type === 'prediction');

    // Compute time range
    const allTimestamps = snapshot.items.map(i => i.ts).filter(Boolean);
    const timeRange = allTimestamps.length > 0 ? {
        from: new Date(Math.min(...allTimestamps)).toISOString(),
        to: new Date(Math.max(...allTimestamps)).toISOString(),
    } : { from: null, to: null };

    // Build risk summary from cognitive state
    let riskAssessment = null;
    if (cognitiveStates.length > 0) {
        const latest = cognitiveStates[cognitiveStates.length - 1];
        if (latest.data && latest.data.riskVector) {
            riskAssessment = Array.isArray(latest.data.riskVector)
                ? { military: latest.data.riskVector[0], political: latest.data.riskVector[1], social: latest.data.riskVector[2] }
                : latest.data.riskVector;
        }
    }

    const bundle = {
        format: 'hybrid-syndicate-dossier-v1',
        exportedAt: new Date().toISOString(),
        exportedBy: 'archivio-silente',

        // Snapshot metadata
        snapshot: {
            id: snapshot.id,
            sequence: snapshot.sequence,
            theater: snapshot.theater,
            trigger: snapshot.trigger,
            sealedAt: new Date(snapshot.ts).toISOString(),
            note: snapshot.provenance?.note || null,
        },

        // Full evidence
        evidence: {
            epochs: epochs.map(e => e.data),
            correlations: correlations.map(c => c.data),
            cognitiveStates: cognitiveStates.map(s => s.data),
            mutations: mutations.map(m => m.data),
            predictions: predictions.map(p => p.data),
        },

        // Integrity proof
        integrity: {
            snapshotHash: snapshot.hash,
            previousHash: snapshot.previousHash,
            chainPosition: snapshot.sequence,
            chainLength: chain.length,
            hashAlgorithm: 'SHA-256',
            verificationMethod: 'sha256(previousHash + JSON.stringify({items, theater, trigger, note}))',
        },

        // Summary for humans
        summary: {
            theater: snapshot.theater,
            timeRange,
            itemCounts: snapshot.itemCounts,
            riskAssessment,
            dominantNarrative: cognitiveStates.length > 0
                ? cognitiveStates[cognitiveStates.length - 1].data?.dominantNarrative
                : null,
            consensus: cognitiveStates.length > 0
                ? cognitiveStates[cognitiveStates.length - 1].data?.consensus
                : null,
        },
    };

    if (bus) {
        bus.emit('archive:bundle-exported', {
            snapshotId: snapshot.id,
            format: 'json',
            size: JSON.stringify(bundle).length,
        }, 'archivio-silente');
    }

    return bundle;
}

// ═══════════════════════════════════════════════════════════════
// AUTO-SEALING TRIGGERS — the autonomous sealing pipeline
// ═══════════════════════════════════════════════════════════════

// Sealing cooldown to prevent flooding
let lastSealTime = 0;
const SEAL_COOLDOWN_MS = 30000; // 30 seconds minimum between auto-seals

function shouldAutoSeal() {
    return Date.now() - lastSealTime > SEAL_COOLDOWN_MS;
}

function registerAutoTriggers() {
    // ── correlation:regime-alert → seal if severity >= elevated ──
    bus.on('correlation:regime-alert', async (event) => {
        if (!shouldAutoSeal()) return;
        const { theater, severity, confidence } = event.payload || {};
        if (severity === 'elevated' || severity === 'high' || severity === 'critical') {
            lastSealTime = Date.now();
            await seal('correlation-regime-alert', {
                theater,
                triggerEvent: event.payload,
            });
        }
        // Buffer for potential future sealing
        bufferPush('correlations', { ...event.payload, id: event.id, timestamp: event.timestamp });
    });

    // ── agora:state-updated → seal if consensus > 0.6 ──
    bus.on('deliberation:state-updated', async (event) => {
        const state = event.payload || {};
        // Buffer always
        bufferPush('cognitiveStates', { ...state, id: event.id });

        if (!shouldAutoSeal()) return;
        if (state.consensus > 0.6 && state.coreCount >= 8) {
            lastSealTime = Date.now();
            await seal('agora-consensus', {
                theater: state.theater,
                triggerEvent: state,
            });
        }
    });

    // ── oracle:mutation-applied → always seal ──
    bus.on('oracle:mutation-applied', async (event) => {
        bufferPush('mutations', { ...event.payload, id: event.id, timestamp: event.timestamp });
        if (!shouldAutoSeal()) return;
        lastSealTime = Date.now();
        await seal('oracle-mutation-applied', {
            theater: event.payload?.theater,
            triggerEvent: event.payload,
        });
    });

    // ── prediction lifecycle → seal ──
    bus.on('prediction:created', async (event) => {
        bufferPush('predictions', { ...event.payload, id: event.id, timestamp: event.timestamp });
        if (!shouldAutoSeal()) return;
        lastSealTime = Date.now();
        await seal('prediction-created', {
            theater: event.payload?.theater,
            triggerEvent: event.payload,
        });
    });

    bus.on('prediction:scored', async (event) => {
        bufferPush('predictions', { ...event.payload, id: event.id, timestamp: event.timestamp });
        if (!shouldAutoSeal()) return;
        lastSealTime = Date.now();
        await seal('prediction-scored', {
            theater: event.payload?.theater,
            triggerEvent: event.payload,
        });
    });

    // ── Buffer epoch events (for inclusion in future snapshots) ──
    bus.on('*', (event) => {
        if (event.type && event.type.endsWith(':epoch-ingested')) {
            const theater = event.type.replace(':epoch-ingested', '');
            bufferPush('epochs', {
                ...event.payload,
                theater,
                id: event.id,
                timestamp: event.timestamp || event.payload?.timestamp,
            });
        }
    });
}

// ═══════════════════════════════════════════════════════════════
// MODULE INTERFACE
// ═══════════════════════════════════════════════════════════════

const ArchivioSilente = {
    name: 'archivio-silente',
    version: '1.0.0',

    async init(eco, b) {
        ecosystem = eco;
        bus = b;
        identity = eco.getModule('identity');

        // Restore chain state from Identity persistence
        await restoreChainState();

        // Register automatic sealing triggers
        registerAutoTriggers();

        // Listen for late-registered Identity
        if (!identity) {
            bus.on('ecosystem:module-registered', (event) => {
                if (event.payload.name === 'identity') {
                    identity = eco.getModule('identity');
                    restoreChainState();
                }
            });
        }

        ecosystem.setState('archivio-silente.status', 'active', { source: 'archivio-silente' });
        ecosystem.setState('archivio-silente.chainLength', chain.length, { source: 'archivio-silente' });

        bus.emit('archivio-silente:ready', {
            version: ArchivioSilente.version,
            chainLength: chain.length,
            sequence,
            headHash: previousHash,
        }, 'archivio-silente');

        console.log(
            '%c[ARCHIVIO SILENTE] %cv' + ArchivioSilente.version +
            ' %c— Memory online. Chain: ' + chain.length + ' snapshots.' +
            (previousHash ? ` Head: ${previousHash.substring(0, 12)}...` : ' GENESIS.'),
            'color: #00d4ff; font-weight: bold;',
            'color: #39ff14;',
            'color: #6b7fa3;'
        );
    },

    destroy() {
        if (ecosystem) {
            ecosystem.setState('archivio-silente.status', 'offline', { source: 'archivio-silente' });
        }
        if (bus) {
            bus.emit('archivio-silente:shutdown', {
                chainLength: chain.length,
                sequence,
            }, 'archivio-silente');
        }
    },

    // ═══════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════

    /**
     * Manually seal a snapshot.
     * @param {string} trigger - Reason for sealing
     * @param {object} options - { theater, items, note }
     * @returns {Promise<object>} Sealed snapshot
     */
    seal(trigger = 'operator', options = {}) {
        return seal(trigger, { ...options, operatorSealed: true });
    },

    /**
     * Get a snapshot by ID.
     * @param {string} id - Snapshot UUID
     * @returns {object|null}
     */
    getSnapshot(id) {
        return snapshotIndex.get(id) || null;
    },

    /**
     * List all snapshots, optionally filtered by theater.
     * @param {string|null} theater - Filter by theater
     * @returns {object[]} Snapshots in chronological order
     */
    listSnapshots(theater = null) {
        if (!theater) return [...chain];
        return chain.filter(s => s.theater === theater || s.theater === null);
    },

    /**
     * Get the most recent snapshot.
     * @returns {object|null}
     */
    getChainHead() {
        return chain.length > 0 ? chain[chain.length - 1] : null;
    },

    /**
     * Get chain statistics.
     * @returns {object}
     */
    getChainStats() {
        const theaters = new Set(chain.map(s => s.theater).filter(Boolean));
        const triggers = {};
        for (const s of chain) {
            triggers[s.trigger] = (triggers[s.trigger] || 0) + 1;
        }
        return {
            length: chain.length,
            sequence,
            headHash: previousHash,
            theaters: [...theaters],
            triggers,
            oldestSnapshot: chain.length > 0 ? new Date(chain[0].ts).toISOString() : null,
            newestSnapshot: chain.length > 0 ? new Date(chain[chain.length - 1].ts).toISOString() : null,
            totalItems: chain.reduce((sum, s) => sum + s.items.length, 0),
        };
    },

    /**
     * Verify the entire hash chain integrity.
     * @returns {Promise<object>} { valid, length, errors[], verified }
     */
    verifyIntegrity,

    /**
     * Export a snapshot as a self-contained JSON dossier.
     * @param {string} snapshotId - Snapshot ID
     * @returns {object|null} Export bundle
     */
    exportBundle,

    /**
     * Export ALL snapshots as a complete archive bundle.
     * @returns {object}
     */
    exportFullArchive() {
        return {
            format: 'hybrid-syndicate-archive-v1',
            exportedAt: new Date().toISOString(),
            chainLength: chain.length,
            headHash: previousHash,
            snapshots: chain.map(s => ({
                ...s,
                // Ensure full data is included
                items: s.items,
            })),
        };
    },

    /**
     * Download a dossier as a JSON file in the browser.
     * @param {string} snapshotId - Snapshot ID
     */
    downloadBundle(snapshotId) {
        const bundle = exportBundle(snapshotId);
        if (!bundle) {
            console.error('[ARCHIVIO] Snapshot not found:', snapshotId);
            return;
        }
        const json = JSON.stringify(bundle, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dossier-${bundle.snapshot.theater || 'global'}-${bundle.snapshot.sequence}-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        console.log(`%c[ARCHIVIO] %cDossier downloaded: %c${a.download}`,
            'color: #00d4ff; font-weight: bold;', 'color: #39ff14;', 'color: #6b7fa3;');
    },
};

export default ArchivioSilente;
