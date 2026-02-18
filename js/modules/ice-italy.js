/**
 * ice-italy.js — ICE/Italy Theater Monitor v0.1.0
 * ═══════════════════════════════════════════════════════════
 * Monitors US influence operations on Italian territory.
 *
 * Context: ICE deployment in Italy under Olympic security
 * pretext. Tracks the intersection of law enforcement
 * extraterritoriality, sovereignty erosion, and the use
 * of international events as normalization vectors.
 *
 * Actors:
 *   - ICE (U.S. Immigration and Customs Enforcement)
 *   - GOV_IT (Italian Government / Palazzo Chigi)
 *   - POLICE_IT (Polizia di Stato / Carabinieri / DIGOS)
 *   - CIVIL_SOCIETY (NGOs, activists, legal observers)
 *   - MEDIA (journalists, press)
 *   - US_EMBASSY (U.S. Embassy / State Department)
 *   - EU_INST (EU institutions, European Parliament)
 *   - OLYMPICS (IOC, CONI, Olympic Security Committee)
 *
 * Operator-driven classification. Zero NLP. Zero AI.
 * The operator IS the intelligence.
 *
 * Browser-native ES Module. Depends on core.js ecosystem.
 * ═══════════════════════════════════════════════════════════
 */

// ── Constants ──
const ACTORS = Object.freeze({
    ICE:            'ice',
    GOV_IT:         'gov_it',
    POLICE_IT:      'police_it',
    CIVIL_SOCIETY:  'civil_society',
    MEDIA:          'media',
    US_EMBASSY:     'us_embassy',
    EU_INST:        'eu_inst',
    OLYMPICS:       'olympics'
});

const ACTION_TYPES = Object.freeze({
    DEPLOYMENT:     'deployment',
    OPERATION:      'operation',
    AGREEMENT:      'agreement',
    STATEMENT:      'statement',
    PROTEST:        'protest',
    LEGAL_ACTION:   'legal_action',
    ARREST:         'arrest',
    POLICY:         'policy',
    MEDIA_REPORT:   'media_report',
    SURVEILLANCE:   'surveillance'
});

const TAG_OPTIONS = Object.freeze([
    'olympics-2026', 'sovereignty', 'extraterritorial', 'immigration',
    'free-palestine', 'double-standard', 'israel-flag', 'russia-ban',
    'meloni-trump', 'satellite-gov', 'nato', 'bilateral',
    'civil-rights', 'press-freedom', 'digos', 'ngo',
    'amnesty', 'emergency-ong', 'legal-observer',
    'greenland', 'finland', 'venezuela', 'taiwan',
    'sphere-influence', 'monroe-doctrine',
    'milano-cortina', 'security-pretext', 'normalization'
]);

// ── Rolling frequency state ──
const ROLLING_WINDOW_MS = 24 * 60 * 60 * 1000;
const BASELINE_WINDOW_MS = 72 * 60 * 60 * 1000;

const epochs = [];
const MAX_EPOCHS_MEMORY = 2000;

let ecosystem = null;
let bus = null;
let identity = null;
let intervals = [];

// ── Epoch creation ──

function createTheaterEpoch(input) {
    if (!input.source || !input.actor || !input.action_type) {
        throw new Error('[ICE-ITALY] Missing required fields: source, actor, action_type');
    }

    // Build mutable — freeze happens AFTER text_hash is computed in ingestEpoch()
    return {
        source: input.source,
        timestamp: input.timestamp || Date.now(),
        actor: input.actor,
        action_type: input.action_type,
        intensity: Math.max(1, Math.min(5, input.intensity || 1)),
        domains: input.domains || ['sovereignty'],
        text_summary: input.text_summary || '',
        text_hash: null,
        tags: input.tags || [],
        location: input.location || '',
        operator: 'PANKOW_77C'
    };
}

// ── Frequency counter ──

function getActorFrequency(actor, windowMs, now) {
    now = now || Date.now();
    const cutoff = now - windowMs;
    return epochs.filter(e => e.actor === actor && e.timestamp >= cutoff).length;
}

function getRollingFrequencies() {
    const now = Date.now();
    const result = {};
    for (const actor of Object.values(ACTORS)) {
        result[actor] = getActorFrequency(actor, ROLLING_WINDOW_MS, now);
    }
    return result;
}

function getBaseline(actor) {
    const now = Date.now();
    const count72h = getActorFrequency(actor, BASELINE_WINDOW_MS, now);
    return count72h / 3;
}

function getAllBaselines() {
    const result = {};
    for (const actor of Object.values(ACTORS)) {
        result[actor] = getBaseline(actor);
    }
    return result;
}

function getFrequencyRatio(actor) {
    const current = getActorFrequency(actor, ROLLING_WINDOW_MS);
    const baseline = getBaseline(actor);
    if (baseline === 0) return current > 0 ? Infinity : null;
    return current / baseline;
}

// ── Timeline queries ──

function getRecentEpochs(count = 20) {
    return [...epochs].sort((a, b) => b.timestamp - a.timestamp).slice(0, count);
}

function getEpochsByActor(actor, count = 50) {
    return epochs
        .filter(e => e.actor === actor)
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, count);
}

function getFrequencyTimeline() {
    const now = Date.now();
    const hours = [];
    const actorBins = {};

    for (const actor of Object.values(ACTORS)) {
        actorBins[actor] = [];
    }

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

async function ingestEpoch(input) {
    const epoch = createTheaterEpoch(input);

    // Compute text hash BEFORE freeze
    if (epoch.text_summary) {
        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(epoch.text_summary);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            epoch.text_hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (err) {
            // crypto.subtle requires HTTPS — fallback for HTTP/localhost
            console.warn('[ICE-ITALY] crypto.subtle unavailable (HTTP?). Using fallback hash.');
            let hash = 0;
            for (let i = 0; i < epoch.text_summary.length; i++) {
                const char = epoch.text_summary.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash |= 0;
            }
            epoch.text_hash = 'fallback-' + Math.abs(hash).toString(16);
        }
    }

    // Freeze AFTER all mutations are complete
    Object.freeze(epoch);

    // Store in memory
    epochs.push(epoch);
    while (epochs.length > MAX_EPOCHS_MEMORY) {
        epochs.shift();
    }

    // Emit envelope into ecosystem bloodstream
    if (ecosystem) {
        ecosystem.emitEnvelope({
            source: 'ice-italy',
            domain: 'signal',
            type: epoch.action_type,
            payload: {
                actor: epoch.actor,
                intensity: epoch.intensity,
                source_org: epoch.source,
                text_summary: epoch.text_summary,
                domains: epoch.domains,
                location: epoch.location
            },
            meta: {
                confidence: 0.9,
                tags: ['ice-italy', epoch.actor, ...epoch.tags]
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
            source: 'ice-italy',
            tags: ['ice-italy', epoch.actor, epoch.action_type, ...epoch.tags]
        });
    }

    // Emit theater-specific events
    if (bus) {
        bus.emit('ice-italy:epoch-ingested', {
            actor: epoch.actor,
            action_type: epoch.action_type,
            intensity: epoch.intensity,
            timestamp: epoch.timestamp
        }, 'ice-italy');

        // Check frequency ratios and emit alerts
        const ratio = getFrequencyRatio(epoch.actor);
        if (ratio !== null && ratio > 1.8) {
            bus.emit('ice-italy:elevated-frequency', {
                actor: epoch.actor,
                ratio: ratio,
                current_24h: getActorFrequency(epoch.actor, ROLLING_WINDOW_MS),
                baseline: getBaseline(epoch.actor)
            }, 'ice-italy');

            if (ecosystem) {
                ecosystem.emitEnvelope({
                    source: 'ice-italy',
                    domain: 'metric',
                    type: 'frequency-alert',
                    payload: {
                        actor: epoch.actor,
                        ratio: ratio,
                        threshold: 1.8
                    },
                    meta: {
                        confidence: 1.0,
                        tags: ['ice-italy', 'frequency-alert', epoch.actor]
                    },
                    priority: 'high'
                });
            }
        }
    }

    // Trigger CoreFeed if available
    if (typeof CoreFeed !== 'undefined') {
        CoreFeed.trigger('ice-italy-ingest');
    }

    updateState();
    return epoch;
}

// ── State management ──

function updateState() {
    if (!ecosystem) return;

    const frequencies = getRollingFrequencies();
    const baselines = getAllBaselines();

    ecosystem.setState('ice-italy.frequencies', frequencies, { source: 'ice-italy' });
    ecosystem.setState('ice-italy.baselines', baselines, { source: 'ice-italy' });
    ecosystem.setState('ice-italy.epochCount', epochs.length, { source: 'ice-italy' });
    ecosystem.setState('ice-italy.lastUpdate', Date.now(), { source: 'ice-italy' });
}

function emitFrequencyMetric() {
    if (!ecosystem) return;

    ecosystem.emitEnvelope({
        source: 'ice-italy',
        domain: 'metric',
        type: 'rolling-frequency',
        payload: getRollingFrequencies(),
        meta: {
            confidence: 1.0,
            tags: ['ice-italy', 'frequency', 'periodic']
        },
        priority: 'normal'
    });
}

// ═══════════════════════════════════════════════════════════
// MODULE INTERFACE
// ═══════════════════════════════════════════════════════════

const IceItalyModule = {
    name: 'ice-italy',
    version: '0.1.0',

    init(eco, b) {
        ecosystem = eco;
        bus = b;

        identity = eco.getModule('identity');
        if (!identity) {
            bus.once('ecosystem:module-registered', (event) => {
                if (event.payload.name === 'identity') {
                    identity = eco.getModule('identity');
                }
            });
        }

        ecosystem.setState('ice-italy.status', 'active', { source: 'ice-italy' });
        ecosystem.setState('ice-italy.theater', 'Italy / Milano-Cortina 2026 / US Influence Ops', { source: 'ice-italy' });
        ecosystem.setState('ice-italy.actors', Object.values(ACTORS), { source: 'ice-italy' });

        intervals.push(setInterval(emitFrequencyMetric, 60000));
        intervals.push(setInterval(updateState, 30000));

        if (identity) {
            identity.addEpoch({
                type: 'boot',
                title: 'ICE-Italy Theater Monitor Initialized',
                content: {
                    version: IceItalyModule.version,
                    actors: Object.values(ACTORS),
                    action_types: Object.values(ACTION_TYPES),
                    context: 'US influence operations monitoring — Italy 2026'
                },
                source: 'ice-italy',
                tags: ['boot', 'ice-italy']
            });
        }

        bus.emit('ice-italy:ready', {
            version: IceItalyModule.version,
            actors: Object.values(ACTORS)
        }, 'ice-italy');

        console.log(
            '%c[ICE-ITALY] %cv' + IceItalyModule.version +
            ' %c— Theater monitor online. Sovereignty watch active.',
            'color: #ff3344; font-weight: bold;',
            'color: #39ff14;',
            'color: #6b7fa3;'
        );
    },

    destroy() {
        intervals.forEach(id => clearInterval(id));
        intervals = [];

        if (ecosystem) {
            ecosystem.setState('ice-italy.status', 'offline', { source: 'ice-italy' });
        }
        if (bus) {
            bus.emit('ice-italy:shutdown', { epochCount: epochs.length }, 'ice-italy');
        }
    },

    // PUBLIC API
    ingest: ingestEpoch,
    getFrequencies: getRollingFrequencies,
    getBaselines: getAllBaselines,
    getFrequencyRatio,
    getRecent: getRecentEpochs,
    getByActor: getEpochsByActor,
    getTimeline: getFrequencyTimeline,
    getEpochCount() { return epochs.length; },

    ACTORS,
    ACTION_TYPES,
    TAG_OPTIONS
};

export default IceItalyModule;
