#!/usr/bin/env node
/**
 * fetch-feeds.mjs — Autonomous OSINT Feed Fetcher + Classifier
 * ═══════════════════════════════════════════════════════════════
 * Hybrid Syndicate / Ethic Software Foundation
 *
 * Fetches RSS feeds from configured OSINT sources, classifies items
 * into theater epochs, deduplicates, and writes JSON output files.
 *
 * Designed to run via GitHub Actions cron (every 30 min).
 * Zero external dependencies — uses Node.js 18+ built-in fetch.
 *
 * Usage: node scripts/fetch-feeds.mjs
 * ═══════════════════════════════════════════════════════════════
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ── Load configuration ──
const config = JSON.parse(readFileSync(join(__dirname, 'feed-sources.json'), 'utf-8'));

// ── Constants ──
const FETCH_TIMEOUT_MS = 15000;
const MAX_ITEMS_PER_FEED = config.max_items_per_feed || 25;
const MAX_EPOCHS_PER_THEATER = config.max_epochs_per_theater || 500;
const DEDUP_WINDOW_MS = (config.dedup_window_hours || 168) * 3600000;

// ── Stats ──
const stats = { feeds_fetched: 0, feeds_failed: 0, items_parsed: 0, items_classified: 0, items_deduped: 0, epochs_written: 0 };

// ═══════════════════════════════════════════════════════════════
// RSS PARSER — handles RSS 2.0 and Atom feeds
// ═══════════════════════════════════════════════════════════════

function extractTag(xml, tag) {
    // Handle CDATA sections
    const cdataRegex = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'i');
    const cdataMatch = cdataRegex.exec(xml);
    if (cdataMatch) return cdataMatch[1].trim();

    // Handle regular content
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
    const match = regex.exec(xml);
    return match ? match[1].trim() : '';
}

function extractAttr(xml, tag, attr) {
    const regex = new RegExp(`<${tag}[^>]*${attr}\\s*=\\s*["']([^"']*)["']`, 'i');
    const match = regex.exec(xml);
    return match ? match[1].trim() : '';
}

function parseRSS(xml) {
    const items = [];

    // Try RSS 2.0 format
    const rssItemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let match;
    while ((match = rssItemRegex.exec(xml)) !== null) {
        const itemXml = match[1];
        const title = extractTag(itemXml, 'title');
        const link = extractTag(itemXml, 'link');
        const description = extractTag(itemXml, 'description')
            .replace(/<[^>]+>/g, '')  // Strip HTML tags
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .substring(0, 500);
        const pubDate = extractTag(itemXml, 'pubDate');
        const guid = extractTag(itemXml, 'guid') || link;

        if (title) {
            items.push({ title, link, description, pubDate, guid });
        }
    }

    // If no RSS items found, try Atom format
    if (items.length === 0) {
        const atomEntryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
        while ((match = atomEntryRegex.exec(xml)) !== null) {
            const entryXml = match[1];
            const title = extractTag(entryXml, 'title');
            const link = extractAttr(entryXml, 'link', 'href') || extractTag(entryXml, 'link');
            const description = (extractTag(entryXml, 'summary') || extractTag(entryXml, 'content'))
                .replace(/<[^>]+>/g, '')
                .substring(0, 500);
            const pubDate = extractTag(entryXml, 'published') || extractTag(entryXml, 'updated');
            const guid = extractTag(entryXml, 'id') || link;

            if (title) {
                items.push({ title, link, description, pubDate, guid });
            }
        }
    }

    return items;
}

// ═══════════════════════════════════════════════════════════════
// CLASSIFIER — maps RSS items to theater epochs
// ═══════════════════════════════════════════════════════════════

function classifyItem(item, feedConfig) {
    const theater = feedConfig.theater;
    if (!theater) return null;

    const classifierConfig = config.classifiers[theater];
    if (!classifierConfig) return null;

    const text = `${item.title} ${item.description}`.toLowerCase();

    // ── Detect actor ──
    let bestActor = null;
    let bestActorScore = 0;

    for (const [actor, actorConfig] of Object.entries(classifierConfig.actors)) {
        let score = 0;
        for (const keyword of actorConfig.keywords) {
            if (text.includes(keyword.toLowerCase())) {
                score += actorConfig.weight;
            }
        }
        if (score > bestActorScore) {
            bestActorScore = score;
            bestActor = actor;
        }
    }

    // If no actor matched with keywords, use 'other' for bab-el-mandeb, skip for ice-italy
    if (!bestActor || bestActorScore === 0) {
        if (theater === 'bab-el-mandeb') {
            bestActor = 'other';
        } else {
            // For ice-italy, if we can't identify an actor, it might not be relevant
            bestActor = 'media'; // Default to media report
        }
    }

    // ── Detect action type ──
    let bestAction = 'statement'; // default
    let bestActionScore = 0;

    for (const [action, keywords] of Object.entries(classifierConfig.action_types)) {
        let score = 0;
        for (const keyword of keywords) {
            if (text.includes(keyword.toLowerCase())) {
                score++;
            }
        }
        if (score > bestActionScore) {
            bestActionScore = score;
            bestAction = action;
        }
    }

    // ── Detect intensity ──
    let intensity = 2; // default for news items
    for (const [level, keywords] of Object.entries(classifierConfig.intensity_keywords)) {
        for (const keyword of keywords) {
            if (text.includes(keyword.toLowerCase())) {
                const newIntensity = parseInt(level);
                if (newIntensity > intensity) {
                    intensity = newIntensity;
                }
            }
        }
    }

    // ── Detect tags ──
    const tags = new Set();
    for (const [keyword, tagList] of Object.entries(classifierConfig.tag_map)) {
        if (text.includes(keyword.toLowerCase())) {
            for (const tag of tagList) {
                tags.add(tag);
            }
        }
    }

    // ── Build epoch ──
    const timestamp = item.pubDate ? new Date(item.pubDate).getTime() : Date.now();

    // Skip items with invalid timestamps
    if (isNaN(timestamp)) return null;

    // Skip items older than dedup window
    if (Date.now() - timestamp > DEDUP_WINDOW_MS) return null;

    // Generate deterministic ID from article URL/GUID
    const hash = createHash('sha256')
        .update(item.guid || item.link || item.title)
        .digest('hex')
        .substring(0, 16);

    return {
        id: `rss_${hash}`,
        timestamp,
        source: detectSource(item),
        actor: bestActor,
        action_type: bestAction,
        intensity,
        text_summary: item.title.substring(0, 300),
        description: item.description.substring(0, 500),
        tags: [...tags],
        domains: classifierConfig.default_domains,
        article_url: item.link,
        feed_id: feedConfig.id,
        origin: 'rss',
        confidence: 0.6,
        fetched_at: new Date().toISOString()
    };
}

function detectSource(item) {
    const url = (item.link || '').toLowerCase();
    const title = (item.title || '').toLowerCase();

    // Try to detect the original news source from Google News items
    if (url.includes('reuters') || title.includes('reuters')) return 'Reuters';
    if (url.includes('aljazeera') || title.includes('al jazeera')) return 'Al Jazeera';
    if (url.includes('bbc')) return 'BBC';
    if (url.includes('ansa')) return 'ANSA';
    if (url.includes('repubblica')) return 'La Repubblica';
    if (url.includes('corriere')) return 'Corriere della Sera';
    if (url.includes('manifesto')) return 'Il Manifesto';
    if (url.includes('guardian')) return 'The Guardian';
    if (url.includes('nytimes')) return 'NY Times';
    if (url.includes('washingtonpost')) return 'Washington Post';
    if (url.includes('apnews')) return 'AP News';
    if (url.includes('centcom.mil')) return 'CENTCOM';
    if (url.includes('ice.gov')) return 'ICE.gov';
    if (url.includes('governo.it')) return 'Governo IT';
    if (url.includes('maritime-executive')) return 'Maritime Executive';
    if (url.includes('middleeasteye')) return 'Middle East Eye';
    if (url.includes('france24')) return 'France 24';

    // Google News wraps sources — try to extract from description
    return 'OSINT';
}

// ═══════════════════════════════════════════════════════════════
// FETCH + PROCESS
// ═══════════════════════════════════════════════════════════════

async function fetchFeed(feedConfig) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
        const response = await fetch(feedConfig.url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'HybridSyndicate-OSINT/1.0 (+https://github.com/pankow77)',
                'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const xml = await response.text();
        const items = parseRSS(xml);
        stats.feeds_fetched++;
        stats.items_parsed += items.length;

        return items.slice(0, MAX_ITEMS_PER_FEED);
    } catch (err) {
        if (err.name === 'AbortError') {
            console.error(`  [TIMEOUT] ${feedConfig.id}: exceeded ${FETCH_TIMEOUT_MS}ms`);
        } else {
            console.error(`  [ERROR] ${feedConfig.id}: ${err.message}`);
        }
        stats.feeds_failed++;
        return [];
    } finally {
        clearTimeout(timeout);
    }
}

async function processFeed(feedConfig) {
    console.log(`  Fetching: ${feedConfig.id} (${feedConfig.theater})`);
    const items = await fetchFeed(feedConfig);

    if (items.length === 0) return [];

    const epochs = [];
    for (const item of items) {
        const epoch = classifyItem(item, feedConfig);
        if (epoch) {
            epochs.push(epoch);
            stats.items_classified++;
        }
    }

    console.log(`  → ${items.length} items → ${epochs.length} classified epochs`);
    return epochs;
}

// ═══════════════════════════════════════════════════════════════
// DEDUPLICATION + MERGE
// ═══════════════════════════════════════════════════════════════

function loadExistingData(theater) {
    const filePath = join(ROOT, 'data', 'feeds', `${theater}.json`);
    if (!existsSync(filePath)) {
        return { theater, last_fetch: null, epoch_count: 0, epochs: [] };
    }
    try {
        return JSON.parse(readFileSync(filePath, 'utf-8'));
    } catch {
        return { theater, last_fetch: null, epoch_count: 0, epochs: [] };
    }
}

function mergeEpochs(existing, newEpochs) {
    const existingIds = new Set(existing.map(e => e.id));
    const merged = [...existing];
    let deduped = 0;

    for (const epoch of newEpochs) {
        if (existingIds.has(epoch.id)) {
            deduped++;
            continue;
        }
        existingIds.add(epoch.id);
        merged.push(epoch);
    }

    stats.items_deduped += deduped;

    // Sort by timestamp descending (newest first)
    merged.sort((a, b) => b.timestamp - a.timestamp);

    // Trim to max
    return merged.slice(0, MAX_EPOCHS_PER_THEATER);
}

function writeTheaterData(theater, epochs) {
    const filePath = join(ROOT, 'data', 'feeds', `${theater}.json`);
    const data = {
        theater,
        last_fetch: new Date().toISOString(),
        epoch_count: epochs.length,
        epochs
    };
    writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    stats.epochs_written += epochs.length;
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

async function main() {
    console.log('═══════════════════════════════════════════════════');
    console.log(' HYBRID SYNDICATE — OSINT FEED FETCHER v1.0');
    console.log(' ' + new Date().toISOString());
    console.log('═══════════════════════════════════════════════════');
    console.log(`  Configured feeds: ${config.feeds.length}`);
    console.log(`  Max items/feed: ${MAX_ITEMS_PER_FEED}`);
    console.log(`  Max epochs/theater: ${MAX_EPOCHS_PER_THEATER}`);
    console.log(`  Dedup window: ${config.dedup_window_hours}h`);
    console.log('');

    // Group feeds by theater
    const theaters = {};
    for (const feed of config.feeds) {
        if (!feed.theater) continue;
        if (!theaters[feed.theater]) theaters[feed.theater] = [];
        theaters[feed.theater].push(feed);
    }

    // Process each theater
    for (const [theater, feeds] of Object.entries(theaters)) {
        console.log(`[THEATER] ${theater.toUpperCase()} — ${feeds.length} feeds`);

        // Load existing data
        const existingData = loadExistingData(theater);
        console.log(`  Existing epochs: ${existingData.epochs.length}`);

        // Fetch all feeds for this theater
        const allNewEpochs = [];
        for (const feed of feeds) {
            const epochs = await processFeed(feed);
            allNewEpochs.push(...epochs);
        }

        // Merge and deduplicate
        const merged = mergeEpochs(existingData.epochs, allNewEpochs);
        const newCount = merged.length - existingData.epochs.length;
        console.log(`  New epochs: ${Math.max(0, newCount)} | Total: ${merged.length}`);

        // Write output
        writeTheaterData(theater, merged);
        console.log(`  Written to: data/feeds/${theater}.json`);
        console.log('');
    }

    // Summary
    console.log('═══════════════════════════════════════════════════');
    console.log(' SUMMARY');
    console.log('═══════════════════════════════════════════════════');
    console.log(`  Feeds fetched:    ${stats.feeds_fetched}/${config.feeds.length}`);
    console.log(`  Feeds failed:     ${stats.feeds_failed}`);
    console.log(`  Items parsed:     ${stats.items_parsed}`);
    console.log(`  Items classified: ${stats.items_classified}`);
    console.log(`  Items deduped:    ${stats.items_deduped}`);
    console.log(`  Epochs in store:  ${stats.epochs_written}`);
    console.log('═══════════════════════════════════════════════════');

    // Exit with error if all feeds failed
    if (stats.feeds_fetched === 0 && config.feeds.length > 0) {
        console.error('  ALL FEEDS FAILED. Check network connectivity.');
        process.exit(1);
    }
}

main().catch(err => {
    console.error('FATAL:', err);
    process.exit(1);
});
