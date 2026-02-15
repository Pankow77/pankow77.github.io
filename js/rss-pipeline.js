// ═══════════════════════════════════════════════════════════
// RSS-PIPELINE v1.0 — Real-Time Intelligence Feed
// Hybrid Syndicate / Ethic Software Foundation
// ═══════════════════════════════════════════════════════════
// Fetches real RSS/Atom feeds via CORS proxies.
// Classifies signals into 6 ORACLE domains.
// Scores severity. Deduplicates. Feeds into StateManager.

const RSSPipeline = (() => {
    'use strict';

    // ── CONFIGURATION ──
    const FEEDS = [
        // Geopolitics
        { url: 'https://feeds.reuters.com/reuters/worldNews', source: 'Reuters', domain_hint: 'geopolitics' },
        { url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', source: 'NYT World', domain_hint: 'geopolitics' },
        { url: 'https://www.aljazeera.com/xml/rss/all.xml', source: 'Al Jazeera', domain_hint: 'geopolitics' },
        // Economy
        { url: 'https://feeds.reuters.com/reuters/businessNews', source: 'Reuters Biz', domain_hint: 'economy' },
        { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Economy.xml', source: 'NYT Economy', domain_hint: 'economy' },
        // Technology
        { url: 'https://feeds.arstechnica.com/arstechnica/technology-lab', source: 'Ars Technica', domain_hint: 'technology' },
        { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml', source: 'NYT Tech', domain_hint: 'technology' },
        // Climate
        { url: 'https://www.theguardian.com/environment/rss', source: 'Guardian Env', domain_hint: 'climate' },
        // Social
        { url: 'https://www.theguardian.com/society/rss', source: 'Guardian Soc', domain_hint: 'social' },
        { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Health.xml', source: 'NYT Health', domain_hint: 'social' },
        // Multi-domain
        { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', source: 'BBC World', domain_hint: null },
        { url: 'https://www.theguardian.com/world/rss', source: 'Guardian World', domain_hint: null },
    ];

    // CORS Proxy chain (fallback order)
    const CORS_PROXIES = [
        (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
        (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
        (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
    ];

    // ── DOMAIN CLASSIFIER ──
    const DOMAIN_KEYWORDS = {
        geopolitics: [
            'war', 'conflict', 'nato', 'sanction', 'missile', 'military', 'invasion',
            'troops', 'diplomacy', 'treaty', 'nuclear', 'weapon', 'border', 'territory',
            'occupation', 'ceasefire', 'peace', 'alliance', 'geopolitic', 'sovereignty',
            'ukraine', 'russia', 'china', 'taiwan', 'iran', 'israel', 'palestine', 'gaza',
            'coup', 'regime', 'dictator', 'election', 'protest', 'revolution',
            'guerra', 'conflitto', 'militare', 'invasione', 'sanzioni'
        ],
        economy: [
            'gdp', 'inflation', 'recession', 'stock', 'market', 'fed', 'ecb', 'interest rate',
            'unemployment', 'trade', 'tariff', 'debt', 'deficit', 'currency', 'bitcoin',
            'crypto', 'bank', 'financial', 'economy', 'fiscal', 'monetary', 'supply chain',
            'commodity', 'oil price', 'energy price', 'housing', 'real estate',
            'economia', 'inflazione', 'recessione', 'mercato', 'debito'
        ],
        climate: [
            'climate', 'warming', 'carbon', 'emission', 'temperature', 'drought', 'flood',
            'hurricane', 'wildfire', 'glacier', 'sea level', 'deforestation', 'biodiversity',
            'extinction', 'pollution', 'renewable', 'fossil fuel', 'paris agreement',
            'methane', 'co2', 'ecosystem', 'coral', 'arctic', 'antarctic',
            'clima', 'riscaldamento', 'emissioni', 'siccità', 'inondazione'
        ],
        technology: [
            'ai ', 'artificial intelligence', 'machine learning', 'deep learning', 'chatgpt',
            'quantum', 'cybersecurity', 'hack', 'breach', 'surveillance', 'privacy',
            'algorithm', 'automation', 'robot', 'autonomous', 'neural', 'deepfake',
            'biotech', 'gene edit', 'crispr', 'semiconductor', 'chip', 'silicon',
            'intelligenza artificiale', 'sorveglianza', 'tecnologia'
        ],
        social: [
            'inequality', 'poverty', 'migration', 'refugee', 'health', 'pandemic',
            'vaccine', 'education', 'housing crisis', 'mental health', 'addiction',
            'demographic', 'birth rate', 'aging', 'welfare', 'labor', 'wage',
            'discrimination', 'racism', 'gender', 'human rights', 'freedom',
            'disuguaglianza', 'povertà', 'migrazione', 'salute', 'istruzione'
        ],
        epistemic: [
            'disinformation', 'misinformation', 'fake news', 'propaganda', 'censorship',
            'media', 'narrative', 'conspiracy', 'trust', 'credibility', 'journalism',
            'fact check', 'manipulation', 'troll', 'bot', 'influence operation',
            'free speech', 'platform', 'content moderation', 'deepfake',
            'disinformazione', 'propaganda', 'censura', 'manipolazione'
        ]
    };

    // Severity keywords (amplifiers)
    const SEVERITY_AMPLIFIERS = [
        { pattern: /crisis|emergency|catastroph|collaps|devastat/i, boost: 25 },
        { pattern: /war|invasion|attack|bomb|missile|nuclear/i, boost: 30 },
        { pattern: /pandemic|outbreak|epidemic/i, boost: 20 },
        { pattern: /break(?:ing|s)|urgent|alert|just in/i, boost: 15 },
        { pattern: /death|kill|casualties|victims/i, boost: 20 },
        { pattern: /record|unprecedented|historic|worst|highest/i, boost: 10 },
        { pattern: /sanction|embargo|blockade|siege/i, boost: 15 },
        { pattern: /protest|riot|unrest|revolt/i, boost: 15 },
        { pattern: /hack|breach|leak|exploit|vulnerability/i, boost: 20 },
        { pattern: /bankrupt|default|crash|meltdown/i, boost: 25 },
    ];

    // ── STATE ──
    let isRunning = false;
    let lastFetch = 0;
    let fetchInterval = null;
    const seenUrls = new Set();
    const FETCH_INTERVAL = 5 * 60 * 1000; // 5 minutes
    const DEDUP_WINDOW = 24 * 60 * 60 * 1000; // 24 hours

    // ── FETCH WITH CORS PROXY FALLBACK ──
    async function fetchWithProxy(url) {
        for (const proxyFn of CORS_PROXIES) {
            try {
                const proxyUrl = proxyFn(url);
                const response = await fetch(proxyUrl, {
                    signal: AbortSignal.timeout(10000)
                });
                if (!response.ok) continue;
                const text = await response.text();
                if (text && text.length > 100) return text;
            } catch {
                continue;
            }
        }
        return null;
    }

    // ── XML PARSER ──
    function parseRSSAtom(xmlText, feedMeta) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlText, 'text/xml');

        if (doc.querySelector('parsererror')) return [];

        const items = [];

        // RSS 2.0
        const rssItems = doc.querySelectorAll('item');
        rssItems.forEach(item => {
            items.push({
                title: _textContent(item, 'title'),
                link: _textContent(item, 'link'),
                description: _textContent(item, 'description'),
                pubDate: _textContent(item, 'pubDate'),
                source: feedMeta.source,
                domainHint: feedMeta.domain_hint
            });
        });

        // Atom
        if (items.length === 0) {
            const entries = doc.querySelectorAll('entry');
            entries.forEach(entry => {
                const linkEl = entry.querySelector('link[href]');
                items.push({
                    title: _textContent(entry, 'title'),
                    link: linkEl ? linkEl.getAttribute('href') : '',
                    description: _textContent(entry, 'summary') || _textContent(entry, 'content'),
                    pubDate: _textContent(entry, 'published') || _textContent(entry, 'updated'),
                    source: feedMeta.source,
                    domainHint: feedMeta.domain_hint
                });
            });
        }

        return items;
    }

    function _textContent(parent, tag) {
        const el = parent.querySelector(tag);
        return el ? el.textContent.trim() : '';
    }

    // ── CLASSIFY DOMAIN ──
    function classifyDomain(title, description, hint) {
        const text = (title + ' ' + description).toLowerCase();
        const scores = {};

        Object.entries(DOMAIN_KEYWORDS).forEach(([domain, keywords]) => {
            let score = 0;
            keywords.forEach(kw => {
                if (text.includes(kw.toLowerCase())) score++;
            });
            if (score > 0) scores[domain] = score;
        });

        // If hint matches and has any relevance, boost it
        if (hint && scores[hint] !== undefined) {
            scores[hint] += 2;
        } else if (hint && !Object.keys(scores).length) {
            scores[hint] = 1;
        }

        // Return highest scoring domain
        const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
        if (sorted.length === 0) return { primary: hint || 'geopolitics', secondary: null, crossDomain: false };

        const primary = sorted[0][0];
        const secondary = sorted.length > 1 && sorted[1][1] >= 2 ? sorted[1][0] : null;
        const crossDomain = secondary !== null && sorted[1][1] >= sorted[0][1] * 0.5;

        return { primary, secondary, crossDomain };
    }

    // ── SCORE SEVERITY ──
    function scoreSeverity(title, description) {
        const text = title + ' ' + description;
        let severity = 30; // Base severity

        SEVERITY_AMPLIFIERS.forEach(({ pattern, boost }) => {
            if (pattern.test(text)) severity += boost;
        });

        // Cap at 100
        return Math.min(100, severity);
    }

    // ── DEDUPLICATE ──
    function isDuplicate(url, title) {
        if (!url && !title) return true;
        const key = url || title.toLowerCase().replace(/\s+/g, '-').slice(0, 80);
        if (seenUrls.has(key)) return true;
        seenUrls.add(key);
        return false;
    }

    // ── PROCESS FEED ──
    async function processFeed(feedMeta) {
        const xml = await fetchWithProxy(feedMeta.url);
        if (!xml) return [];

        const rawItems = parseRSSAtom(xml, feedMeta);
        const signals = [];

        for (const item of rawItems) {
            if (isDuplicate(item.link, item.title)) continue;
            if (!item.title) continue;

            const classification = classifyDomain(item.title, item.description, item.domainHint);
            const severity = scoreSeverity(item.title, item.description);

            const signal = {
                title: item.title.slice(0, 200),
                summary: (item.description || '').replace(/<[^>]*>/g, '').slice(0, 300),
                url: item.link,
                source: item.source,
                domain: classification.primary,
                secondaryDomain: classification.secondary,
                crossDomain: classification.crossDomain,
                severity,
                timestamp: item.pubDate ? new Date(item.pubDate).getTime() : Date.now(),
            };

            signals.push(signal);
        }

        return signals;
    }

    // ── FETCH ALL FEEDS ──
    async function fetchAll() {
        if (isRunning) return;
        isRunning = true;
        lastFetch = Date.now();

        console.log('%c[RSS Pipeline] Fetching ' + FEEDS.length + ' feeds...', 'color: #ff6600; font-size: 10px;');

        const allSignals = [];
        const results = await Promise.allSettled(
            FEEDS.map(feed => processFeed(feed))
        );

        results.forEach(result => {
            if (result.status === 'fulfilled' && result.value) {
                allSignals.push(...result.value);
            }
        });

        // Sort by severity (highest first)
        allSignals.sort((a, b) => b.severity - a.severity);

        // Store in StateManager
        if (allSignals.length > 0 && typeof StateManager !== 'undefined') {
            await StateManager.signals.addBatch(allSignals);
        }

        const feedsOk = results.filter(r => r.status === 'fulfilled' && r.value && r.value.length > 0).length;

        console.log(
            `%c[RSS Pipeline] Done. ${allSignals.length} signals from ${feedsOk}/${FEEDS.length} feeds.`,
            'color: #39ff14; font-size: 10px;'
        );

        isRunning = false;

        // Emit event
        if (typeof StateManager !== 'undefined') {
            StateManager.broadcast('rss:complete', {
                signals: allSignals.length,
                feeds: feedsOk,
                timestamp: Date.now()
            });
        }

        return allSignals;
    }

    // ── AUTO-START ──
    function start() {
        if (fetchInterval) return;
        fetchAll(); // Immediate first fetch
        fetchInterval = setInterval(fetchAll, FETCH_INTERVAL);
        console.log('%c[RSS Pipeline] Auto-fetch started (every 5min)', 'color: #00d4ff; font-size: 10px;');
    }

    function stop() {
        if (fetchInterval) {
            clearInterval(fetchInterval);
            fetchInterval = null;
        }
    }

    // ── PUBLIC API ──
    return {
        start,
        stop,
        fetchAll,
        FEEDS,
        DOMAIN_KEYWORDS,
        classifyDomain,
        scoreSeverity,
        get isRunning() { return isRunning; },
        get lastFetch() { return lastFetch; },
        get seenCount() { return seenUrls.size; }
    };
})();
