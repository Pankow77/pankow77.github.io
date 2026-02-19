/**
 * feed-ingestor.js — Autonomous Feed Ingestion Module
 * ═══════════════════════════════════════════════════════════
 * Hybrid Syndicate / Ethic Software Foundation
 *
 * Client-side ECOSYSTEM module that fetches pre-classified
 * OSINT data from /data/feeds/*.json (written by GitHub Actions)
 * and injects epochs into theater modules.
 *
 * The bridge between the autonomous pipeline and the live system.
 *
 * Architecture:
 *   GitHub Actions (cron 30min) → fetch RSS → classify → JSON
 *   This module (browser) → read JSON → inject into theaters
 *
 * Browser-native ES Module. Depends on core.js ecosystem.
 * ═══════════════════════════════════════════════════════════
 */

// ── Configuration ──
const POLL_INTERVAL_MS = 5 * 60 * 1000;   // Poll every 5 minutes
const FEED_BASE_PATH = './data/feeds/';
const THEATERS = ['bab-el-mandeb', 'ice-italy'];

// ── State ──
let ecosystem = null;
let bus = null;
let pollInterval = null;
const ingestedIds = new Set();      // Track what we've already injected
const theaterModules = {};          // References to theater modules
let totalIngested = 0;
let lastFetchTime = null;
let isFirstLoad = true;

// ═══════════════════════════════════════════════════════════
// FETCH + INJECT
// ═══════════════════════════════════════════════════════════

/**
 * Fetch feed data for a specific theater.
 * @param {string} theater - Theater name
 * @returns {object|null} Feed data or null on error
 */
async function fetchTheaterFeed(theater) {
    try {
        const url = `${FEED_BASE_PATH}${theater}.json?t=${Date.now()}`;
        const response = await fetch(url);
        if (!response.ok) {
            if (response.status === 404) {
                // Feed file doesn't exist yet — that's OK
                return null;
            }
            throw new Error(`HTTP ${response.status}`);
        }
        return await response.json();
    } catch (err) {
        console.warn(`[FEED-INGESTOR] Failed to fetch ${theater}: ${err.message}`);
        return null;
    }
}

/**
 * Inject new epochs from feed data into the theater module.
 * @param {string} theater - Theater name
 * @param {object} feedData - Parsed feed JSON
 * @returns {number} Number of new epochs injected
 */
async function injectEpochs(theater, feedData) {
    const module = theaterModules[theater];
    if (!module || !module.ingest) {
        console.warn(`[FEED-INGESTOR] Theater module not available: ${theater}`);
        return 0;
    }

    if (!feedData || !feedData.epochs || feedData.epochs.length === 0) {
        return 0;
    }

    let injected = 0;

    for (const epoch of feedData.epochs) {
        // Skip already-ingested items
        if (ingestedIds.has(epoch.id)) continue;

        try {
            // Map RSS epoch to theater module ingest format
            await module.ingest({
                source: epoch.source || 'OSINT',
                actor: epoch.actor,
                action_type: epoch.action_type,
                intensity: epoch.intensity || 2,
                text_summary: epoch.text_summary || '',
                tags: epoch.tags || [],
                domains: epoch.domains || [],
                location: epoch.location || '',
                timestamp: epoch.timestamp,
                // Extra metadata for RSS-sourced items
                _origin: 'rss',
                _confidence: epoch.confidence || 0.6,
                _article_url: epoch.article_url,
                _feed_id: epoch.feed_id
            });

            ingestedIds.add(epoch.id);
            injected++;
            totalIngested++;
        } catch (err) {
            console.warn(`[FEED-INGESTOR] Failed to ingest epoch ${epoch.id}: ${err.message}`);
        }
    }

    return injected;
}

/**
 * Main poll cycle — fetch all theater feeds and inject new items.
 */
async function pollFeeds() {
    const results = {};

    for (const theater of THEATERS) {
        const feedData = await fetchTheaterFeed(theater);
        const injected = await injectEpochs(theater, feedData);
        results[theater] = {
            available: feedData ? feedData.epoch_count : 0,
            injected,
            lastFetch: feedData ? feedData.last_fetch : null
        };
    }

    lastFetchTime = Date.now();

    // Update ecosystem state
    if (ecosystem) {
        ecosystem.setState('feed-ingestor.lastPoll', new Date().toISOString(), { source: 'feed-ingestor' });
        ecosystem.setState('feed-ingestor.totalIngested', totalIngested, { source: 'feed-ingestor' });
        ecosystem.setState('feed-ingestor.results', results, { source: 'feed-ingestor' });
    }

    // Emit event
    if (bus) {
        bus.emit('feed-ingestor:poll-complete', {
            results,
            totalIngested,
            timestamp: Date.now()
        }, 'feed-ingestor');
    }

    // Log results
    const totalInjected = Object.values(results).reduce((sum, r) => sum + r.injected, 0);

    if (totalInjected > 0 || isFirstLoad) {
        console.log(
            '%c[FEED-INGESTOR] %cPoll complete %c— ' +
            Object.entries(results).map(([t, r]) => `${t}: +${r.injected}/${r.available}`).join(', '),
            'color: #00d4aa; font-weight: bold;',
            'color: #39ff14;',
            'color: #6b7fa3;'
        );
    }

    isFirstLoad = false;
    return results;
}

// ═══════════════════════════════════════════════════════════
// MODULE INTERFACE
// ═══════════════════════════════════════════════════════════

const FeedIngestorModule = {
    name: 'feed-ingestor',
    version: '1.0.0',

    init(eco, b) {
        ecosystem = eco;
        bus = b;

        // Get references to theater modules
        for (const theater of THEATERS) {
            theaterModules[theater] = eco.getModule(theater);
        }

        // Listen for late-registered theater modules
        bus.on('ecosystem:module-registered', (event) => {
            const name = event.payload.name;
            if (THEATERS.includes(name)) {
                theaterModules[name] = eco.getModule(name);
                console.log(
                    `%c[FEED-INGESTOR] %cTheater module connected: %c${name}`,
                    'color: #00d4aa; font-weight: bold;',
                    'color: #6b7fa3;',
                    'color: #39ff14;'
                );
            }
        });

        // Set initial state
        ecosystem.setState('feed-ingestor.status', 'active', { source: 'feed-ingestor' });
        ecosystem.setState('feed-ingestor.pollInterval', POLL_INTERVAL_MS, { source: 'feed-ingestor' });
        ecosystem.setState('feed-ingestor.theaters', THEATERS, { source: 'feed-ingestor' });

        // Initial fetch after a short delay (let other modules boot first)
        setTimeout(() => {
            pollFeeds().then(() => {
                // Start periodic polling
                pollInterval = setInterval(pollFeeds, POLL_INTERVAL_MS);
            });
        }, 3000);

        bus.emit('feed-ingestor:ready', {
            version: FeedIngestorModule.version,
            theaters: THEATERS,
            pollInterval: POLL_INTERVAL_MS
        }, 'feed-ingestor');

        console.log(
            '%c[FEED-INGESTOR] %cv' + FeedIngestorModule.version +
            ' %c— Autonomous ingestion online. Polling every ' +
            Math.round(POLL_INTERVAL_MS / 60000) + 'min.',
            'color: #00d4aa; font-weight: bold;',
            'color: #39ff14;',
            'color: #6b7fa3;'
        );
    },

    destroy() {
        if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
        }
        ingestedIds.clear();

        if (ecosystem) {
            ecosystem.setState('feed-ingestor.status', 'offline', { source: 'feed-ingestor' });
        }
        if (bus) {
            bus.emit('feed-ingestor:shutdown', { totalIngested }, 'feed-ingestor');
        }
    },

    // ═══════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════

    /** Force an immediate poll */
    poll: pollFeeds,

    /** Get ingestion stats */
    getStats() {
        return {
            totalIngested,
            ingestedIds: ingestedIds.size,
            lastFetchTime,
            theaters: Object.fromEntries(
                THEATERS.map(t => [t, {
                    moduleConnected: !!theaterModules[t],
                    available: theaterModules[t] ? theaterModules[t].getEpochCount() : 0
                }])
            )
        };
    },

    /** Get count of ingested items */
    getIngestedCount() { return totalIngested; },

    /** Check if a specific ID was already ingested */
    isIngested(id) { return ingestedIds.has(id); }
};

export default FeedIngestorModule;
