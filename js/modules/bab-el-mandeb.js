/**
 * bab-el-mandeb.js — BAB EL-MANDEB Theater Monitor v0.1.0
 * ═══════════════════════════════════════════════════════════
 * Narrative seismograph for the Red Sea chokepoint.
 *
 * Measures synchronization between actors, not intentions.
 * Ingests official declarations (CENTCOM, Houthi, EUNAVFOR).
 * Tracks statement frequency per actor over rolling windows.
 * Detects cross-actor synchronization anomalies.
 *
 * Operator-driven classification. Zero NLP. Zero AI.
 * The operator IS the semantic classifier.
 *
 * Browser-native ES Module. Depends on core.js ecosystem.
 * ═══════════════════════════════════════════════════════════
 */

// ── Constants ──
// Actors: organized by geopolitical relevance (2026 theater)
const ACTORS = Object.freeze({
    // ── US / Western bloc ──
    CENTCOM:        'centcom',
    US_STATE:       'us-state',
    UK_NAVY:        'uk-navy',
    EUNAVFOR:       'eunavfor',
    // ── Iran axis ──
    IRAN:           'iran',
    IRGC:           'irgc',
    HOUTHI:         'houthi',
    HEZBOLLAH:      'hezbollah',
    // ── China / Pacific ──
    CHINA:          'china',
    CHINA_NAVY:     'china-navy',
    TAIWAN:         'taiwan',
    // ── Latin America ──
    VENEZUELA:      'venezuela',
    // ── US Domestic / Enforcement ──
    ICE:            'ice',
    TRUMP_WH:       'trump-wh',
    // ── Europe / NATO ──
    NATO:           'nato',
    ITALY:          'italy',
    MELONI_GOV:     'meloni-gov',
    // ── Regional ──
    SAUDI:          'saudi',
    EGYPT:          'egypt',
    RUSSIA:         'russia',
    INDIA_NAVY:     'india-navy',
    DJIBOUTI:       'djibouti',
    YEMEN_GOV:      'yemen-gov',
    // ── Non-state / Civil society ──
    CIVIL_SOCIETY:  'civil-society',
    SHIPPING:       'shipping',
    OTHER:          'other'
});

const ACTION_TYPES = Object.freeze({
    // ── Military ──
    STRIKE:         'strike',
    DEFENSIVE:      'defensive',
    DEPLOYMENT:     'deployment',
    SEIZURE:        'seizure',
    INTERDICTION:   'interdiction',
    ESCORT:         'escort',
    // ── Diplomatic / Political ──
    STATEMENT:      'statement',
    CLAIM:          'claim',
    WARNING:        'warning',
    NEGOTIATION:    'negotiation',
    SANCTION:       'sanction',
    // ── Economic / Strategic ──
    INVESTMENT:     'investment',
    DIVESTMENT:     'divestment',
    REROUTE:        'reroute',
    // ── Influence ──
    INFLUENCE_OP:   'influence-op',
    PROXY_ACTION:   'proxy-action',
    HUMANITARIAN:   'humanitarian',
    // ── Enforcement / Civil rights ──
    ARREST:             'arrest',
    RENDITION:          'rendition',
    DEPORTATION:        'deportation',
    EXTRATERRITORIAL_OP:'extraterritorial-op',
    PROTEST:            'protest',
    CENSORSHIP:         'censorship'
});

const TAG_OPTIONS = Object.freeze([
    // ── Iran theater ──
    'iran-nuclear', 'irgc', 'iran-proxy', 'strait-hormuz', 'jcpoa',
    'hezbollah', 'ansar-allah',
    // ── China theater ──
    'belt-and-road', 'china-investment', 'china-navy', 'south-china-sea',
    'china-latam', 'semiconductor',
    // ── Taiwan theater ──
    'taiwan-strait', 'cross-strait',
    // ── Venezuela / Latin America ──
    'venezuela', 'south-america', 'oil-sanctions', 'baptist-influence',
    'trump-seizure',
    // ── Bab el-Mandeb / Red Sea ──
    'red-sea', 'bab-el-mandeb', 'gulf-of-aden', 'suez', 'cape-route',
    'strait',
    // ── Military hardware ──
    'drone', 'missile', 'ballistic', 'anti-ship', 'USV', 'UAV',
    // ── Maritime / Economic ──
    'shipping', 'tanker', 'cargo', 'LNG', 'insurance', 'oil-price',
    'blockade', 'piracy',
    // ── Europe / Sovereignty ──
    'olimpiadi-2026', 'milano-cortina', 'sovranita-nazionale',
    'ice-international', 'extraterritorial', 'satellite-state',
    'nato-framework', 'meloni', 'italia',
    // ── Civil rights / Enforcement ──
    'palestina', 'israele', 'free-palestine', 'civil-rights',
    'protest-suppression', 'deportation', 'rendition',
    'police-brutality', 'immunity', 'gestapo-tactics',
    // ── Dynamics ──
    'escalation', 'de-escalation', 'asymmetric', 'ceasefire',
    'civilian', 'military', 'coalition', 'unilateral', 'proxy',
    'humanitarian'
]);

// ── Rolling frequency state ──
const ROLLING_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
const BASELINE_WINDOW_MS = 72 * 60 * 60 * 1000; // 72 hours for baseline

// All ingested epochs (in-memory for frequency counting)
const epochs = [];
const MAX_EPOCHS_MEMORY = 2000;

// Module references
let ecosystem = null;
let bus = null;
let identity = null;
let intervals = [];

// ── Epoch creation ──

/**
 * Create a structured epoch from operator input.
 * @param {object} input - Operator classification
 * @returns {object} Structured epoch ready for ingestion
 */
function createTheaterEpoch(input) {
    if (!input.source || !input.actor || !input.action_type) {
        throw new Error('[BAB-EL-MANDEB] Missing required fields: source, actor, action_type');
    }

    return Object.freeze({
        source: input.source,
        timestamp: input.timestamp || Date.now(),
        actor: input.actor,
        action_type: input.action_type,
        intensity: Math.max(1, Math.min(5, input.intensity || 1)),
        domains: input.domains || ['military'],
        text_summary: input.text_summary || '',
        text_hash: null, // computed on ingest
        tags: input.tags || [],
        operator: 'PANKOW_77C'
    });
}

// ── Frequency counter ──

/**
 * Get epoch count for an actor within a time window.
 * @param {string} actor - Actor ID
 * @param {number} windowMs - Time window in milliseconds
 * @param {number} [now] - Reference timestamp
 * @returns {number} Count of epochs in window
 */
function getActorFrequency(actor, windowMs, now) {
    now = now || Date.now();
    const cutoff = now - windowMs;
    return epochs.filter(e => e.actor === actor && e.timestamp >= cutoff).length;
}

/**
 * Get rolling frequency for all actors in 24h window.
 * @returns {object} { actor: count }
 */
function getRollingFrequencies() {
    const now = Date.now();
    const result = {};
    for (const actor of Object.values(ACTORS)) {
        result[actor] = getActorFrequency(actor, ROLLING_WINDOW_MS, now);
    }
    return result;
}

/**
 * Get baseline frequency (average per 24h over 72h window).
 * @param {string} actor
 * @returns {number} Average daily frequency
 */
function getBaseline(actor) {
    const now = Date.now();
    const count72h = getActorFrequency(actor, BASELINE_WINDOW_MS, now);
    return count72h / 3; // average per 24h over 3 days
}

/**
 * Get all baselines.
 * @returns {object} { actor: baseline }
 */
function getAllBaselines() {
    const result = {};
    for (const actor of Object.values(ACTORS)) {
        result[actor] = getBaseline(actor);
    }
    return result;
}

/**
 * Get frequency ratio (current 24h / baseline).
 * Values > 1.8 indicate elevated activity.
 * @param {string} actor
 * @returns {number|null} Ratio or null if no baseline
 */
function getFrequencyRatio(actor) {
    const current = getActorFrequency(actor, ROLLING_WINDOW_MS);
    const baseline = getBaseline(actor);
    if (baseline === 0) return current > 0 ? Infinity : null;
    return current / baseline;
}

// ── Timeline queries ──

/**
 * Get recent epochs, newest first.
 * @param {number} count
 * @returns {object[]}
 */
function getRecentEpochs(count = 20) {
    return [...epochs].sort((a, b) => b.timestamp - a.timestamp).slice(0, count);
}

/**
 * Get epochs by actor.
 * @param {string} actor
 * @param {number} count
 * @returns {object[]}
 */
function getEpochsByActor(actor, count = 50) {
    return epochs
        .filter(e => e.actor === actor)
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, count);
}

/**
 * Get frequency timeline for chart rendering.
 * Returns hourly bins for the last 72h.
 * @returns {object} { hours: string[], actors: { actor: number[] } }
 */
function getFrequencyTimeline() {
    const now = Date.now();
    const hours = [];
    const actorBins = {};

    for (const actor of Object.values(ACTORS)) {
        actorBins[actor] = [];
    }

    // 72 hourly bins
    for (let i = 71; i >= 0; i--) {
        const binStart = now - (i + 1) * 3600000;
        const binEnd = now - i * 3600000;
        const label = new Date(binEnd).toISOString().slice(11, 16);
        hours.push(label);

        for (const actor of Object.values(ACTORS)) {
            const count = epochs.filter(e =>
                e.actor === actor && e.timestamp >= binStart && e.timestamp < binEnd
            ).length;
            actorBins[actor].push(count);
        }
    }

    return { hours, actors: actorBins };
}

// ── Core ingestion ──

/**
 * Ingest a new epoch into the theater monitor.
 * This is the main entry point for operator data.
 * @param {object} input - Operator classification
 * @returns {object} The ingested epoch
 */
async function ingestEpoch(input) {
    const epoch = createTheaterEpoch(input);

    // Store in memory
    epochs.push(epoch);
    while (epochs.length > MAX_EPOCHS_MEMORY) {
        epochs.shift();
    }

    // Compute text hash
    if (epoch.text_summary) {
        const encoder = new TextEncoder();
        const data = encoder.encode(epoch.text_summary);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        epoch.text_hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // Emit envelope into ecosystem bloodstream
    if (ecosystem) {
        ecosystem.emitEnvelope({
            source: 'bab-el-mandeb',
            domain: 'signal',
            type: epoch.action_type,
            payload: {
                actor: epoch.actor,
                intensity: epoch.intensity,
                source_org: epoch.source,
                text_summary: epoch.text_summary,
                domains: epoch.domains
            },
            meta: {
                confidence: 0.9, // operator-classified = high confidence
                tags: ['bab-el-mandeb', epoch.actor, ...epoch.tags]
            },
            priority: epoch.intensity >= 4 ? 'high' : epoch.intensity >= 3 ? 'normal' : 'low'
        });
    }

    // Write to Identity timeline
    if (identity) {
        await identity.addEpoch({
            type: 'theater-event',
            title: `[${epoch.source}] ${epoch.actor.toUpperCase()} — ${epoch.action_type}`,
            content: epoch,
            source: 'bab-el-mandeb',
            tags: ['bab-el-mandeb', epoch.actor, epoch.action_type, ...epoch.tags]
        });
    }

    // Emit theater-specific events
    if (bus) {
        bus.emit('bab-el-mandeb:epoch-ingested', {
            actor: epoch.actor,
            action_type: epoch.action_type,
            intensity: epoch.intensity,
            timestamp: epoch.timestamp
        }, 'bab-el-mandeb');

        // Check frequency ratios and emit alerts
        const ratio = getFrequencyRatio(epoch.actor);
        if (ratio !== null && ratio > 1.8) {
            bus.emit('bab-el-mandeb:elevated-frequency', {
                actor: epoch.actor,
                ratio: ratio,
                current_24h: getActorFrequency(epoch.actor, ROLLING_WINDOW_MS),
                baseline: getBaseline(epoch.actor)
            }, 'bab-el-mandeb');

            // Emit as high-priority envelope
            if (ecosystem) {
                ecosystem.emitEnvelope({
                    source: 'bab-el-mandeb',
                    domain: 'metric',
                    type: 'frequency-alert',
                    payload: {
                        actor: epoch.actor,
                        ratio: ratio,
                        threshold: 1.8
                    },
                    meta: {
                        confidence: 1.0,
                        tags: ['bab-el-mandeb', 'frequency-alert', epoch.actor]
                    },
                    priority: 'high'
                });
            }
        }
    }

    // Trigger CoreFeed if available
    if (typeof CoreFeed !== 'undefined') {
        CoreFeed.trigger('bab-el-mandeb-ingest');
    }

    // Update ecosystem state
    updateState();

    return epoch;
}

// ── State management ──

function updateState() {
    if (!ecosystem) return;

    const frequencies = getRollingFrequencies();
    const baselines = getAllBaselines();

    ecosystem.setState('bab-el-mandeb.frequencies', frequencies, { source: 'bab-el-mandeb' });
    ecosystem.setState('bab-el-mandeb.baselines', baselines, { source: 'bab-el-mandeb' });
    ecosystem.setState('bab-el-mandeb.epochCount', epochs.length, { source: 'bab-el-mandeb' });
    ecosystem.setState('bab-el-mandeb.lastUpdate', Date.now(), { source: 'bab-el-mandeb' });
}

// ── Periodic frequency emission ──

function emitFrequencyMetric() {
    if (!ecosystem) return;

    const frequencies = getRollingFrequencies();

    ecosystem.emitEnvelope({
        source: 'bab-el-mandeb',
        domain: 'metric',
        type: 'rolling-frequency',
        payload: frequencies,
        meta: {
            confidence: 1.0,
            tags: ['bab-el-mandeb', 'frequency', 'periodic']
        },
        priority: 'normal'
    });
}

// ═══════════════════════════════════════════════════════════
// MODULE INTERFACE
// ═══════════════════════════════════════════════════════════

const BabElMandebModule = {
    name: 'bab-el-mandeb',
    version: '0.1.0',

    /**
     * Initialize — called by ECOSYSTEM.register()
     */
    init(eco, b) {
        ecosystem = eco;
        bus = b;

        // Get Identity
        identity = eco.getModule('identity');
        if (!identity) {
            bus.once('ecosystem:module-registered', (event) => {
                if (event.payload.name === 'identity') {
                    identity = eco.getModule('identity');
                }
            });
        }

        // Set initial state
        ecosystem.setState('bab-el-mandeb.status', 'active', { source: 'bab-el-mandeb' });
        ecosystem.setState('bab-el-mandeb.theater', 'Bab el-Mandeb Strait / Red Sea', { source: 'bab-el-mandeb' });
        ecosystem.setState('bab-el-mandeb.actors', Object.values(ACTORS), { source: 'bab-el-mandeb' });

        // Emit frequency metrics every 60 seconds
        intervals.push(setInterval(emitFrequencyMetric, 60000));

        // Update state every 30 seconds
        intervals.push(setInterval(updateState, 30000));

        // Write boot epoch
        if (identity) {
            identity.addEpoch({
                type: 'boot',
                title: 'Bab el-Mandeb Theater Monitor Initialized',
                content: {
                    version: BabElMandebModule.version,
                    actors: Object.values(ACTORS),
                    action_types: Object.values(ACTION_TYPES)
                },
                source: 'bab-el-mandeb',
                tags: ['boot', 'bab-el-mandeb']
            });
        }

        // Emit ready
        bus.emit('bab-el-mandeb:ready', {
            version: BabElMandebModule.version,
            actors: Object.values(ACTORS)
        }, 'bab-el-mandeb');

        console.log(
            '%c[BAB-EL-MANDEB] %cv' + BabElMandebModule.version +
            ' %c— Theater monitor online. Narrative seismograph active.',
            'color: #ff6633; font-weight: bold;',
            'color: #39ff14;',
            'color: #6b7fa3;'
        );
    },

    /**
     * Destroy — cleanup
     */
    destroy() {
        intervals.forEach(id => clearInterval(id));
        intervals = [];

        if (ecosystem) {
            ecosystem.setState('bab-el-mandeb.status', 'offline', { source: 'bab-el-mandeb' });
        }
        if (bus) {
            bus.emit('bab-el-mandeb:shutdown', { epochCount: epochs.length }, 'bab-el-mandeb');
        }
    },

    // ═══════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════

    /** Ingest a new operator-classified epoch */
    ingest: ingestEpoch,

    /** Get rolling 24h frequencies per actor */
    getFrequencies: getRollingFrequencies,

    /** Get baselines (avg 24h over 72h) */
    getBaselines: getAllBaselines,

    /** Get frequency ratio for an actor */
    getFrequencyRatio,

    /** Get recent epochs */
    getRecent: getRecentEpochs,

    /** Get epochs by actor */
    getByActor: getEpochsByActor,

    /** Get frequency timeline for charts */
    getTimeline: getFrequencyTimeline,

    /** Get all epochs count */
    getEpochCount() { return epochs.length; },

    /** Available constants for UI */
    ACTORS,
    ACTION_TYPES,
    TAG_OPTIONS
};

export default BabElMandebModule;
