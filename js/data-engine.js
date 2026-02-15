// ═══════════════════════════════════════════════════════════════════
// DATA_ENGINE v1.0 — Central Intelligence Backbone
// Hybrid Syndicate / Ethic Software Foundation
// ═══════════════════════════════════════════════════════════════════
// The nervous system. Connects live APIs, persists signals in
// IndexedDB, correlates across domains, and dispatches events
// to all modules (ORACLE, ARCHIVIO, AGORA, CORE_FEED).
// ═══════════════════════════════════════════════════════════════════

const DataEngine = (() => {
    'use strict';

    // ── CONFIGURATION ──
    const CONFIG = {
        DB_NAME: 'HybridSyndicateDB',
        DB_VERSION: 1,
        STORES: {
            signals: 'signals',
            cache: 'apiCache',
            meta: 'meta'
        },
        CACHE_TTL: {
            climate: 10 * 60 * 1000,       // 10 min
            seismic: 5 * 60 * 1000,         // 5 min
            tech: 15 * 60 * 1000,           // 15 min
            economic: 3 * 60 * 1000,        // 3 min
            news: 20 * 60 * 1000,           // 20 min
            epistemology: 60 * 60 * 1000    // 1 hour
        },
        SCAN_INTERVAL: 60 * 1000,  // Full scan every 60s
        MAX_SIGNALS: 500,
        RSS_PROXY: 'https://api.rss2json.com/v1/api.json'
    };

    // ── DOMAINS mapped to ORACLE card IDs ──
    const DOMAINS = {
        climate: { id: 'domain-climate', core: 'ORACLE_CORE', color: '#00c8ff' },
        geopolitics: { id: 'domain-geo', core: 'MARXIAN_CORE', color: '#ff3344' },
        economics: { id: 'domain-econ', core: 'CODE_ENCODER', color: '#ff6633' },
        technology: { id: 'domain-tech', core: 'GHOST_RUNNER', color: '#39ff14' },
        epistemology: { id: 'domain-epist', core: 'AFFECTIVE_CORE', color: '#ffbf00' },
        social: { id: 'domain-social', core: 'NARRATIVE_ENGINE', color: '#ff0084' }
    };

    // ── STATE ──
    let db = null;
    let scanTimer = null;
    let isScanning = false;
    const listeners = {};
    const lastFetch = {};

    // ═══════════════════════════════════════
    // SECTION 1: IndexedDB Persistence Layer
    // ═══════════════════════════════════════

    function openDB() {
        return new Promise((resolve, reject) => {
            if (db) return resolve(db);
            const req = indexedDB.open(CONFIG.DB_NAME, CONFIG.DB_VERSION);

            req.onupgradeneeded = (e) => {
                const database = e.target.result;

                // Signals store - all intelligence signals
                if (!database.objectStoreNames.contains(CONFIG.STORES.signals)) {
                    const signalStore = database.createObjectStore(CONFIG.STORES.signals, { keyPath: 'id' });
                    signalStore.createIndex('domain', 'domain', { unique: false });
                    signalStore.createIndex('timestamp', 'timestamp', { unique: false });
                    signalStore.createIndex('severity', 'severity', { unique: false });
                    signalStore.createIndex('source', 'source', { unique: false });
                }

                // API response cache
                if (!database.objectStoreNames.contains(CONFIG.STORES.cache)) {
                    database.createObjectStore(CONFIG.STORES.cache, { keyPath: 'key' });
                }

                // Meta store for engine state
                if (!database.objectStoreNames.contains(CONFIG.STORES.meta)) {
                    database.createObjectStore(CONFIG.STORES.meta, { keyPath: 'key' });
                }
            };

            req.onsuccess = (e) => {
                db = e.target.result;
                resolve(db);
            };

            req.onerror = (e) => {
                console.error('[DATA_ENGINE] IndexedDB error:', e.target.error);
                reject(e.target.error);
            };
        });
    }

    async function dbPut(storeName, data) {
        const database = await openDB();
        return new Promise((resolve, reject) => {
            const tx = database.transaction(storeName, 'readwrite');
            tx.objectStore(storeName).put(data);
            tx.oncomplete = () => resolve();
            tx.onerror = (e) => reject(e.target.error);
        });
    }

    async function dbGet(storeName, key) {
        const database = await openDB();
        return new Promise((resolve, reject) => {
            const tx = database.transaction(storeName, 'readonly');
            const req = tx.objectStore(storeName).get(key);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = (e) => reject(e.target.error);
        });
    }

    async function dbGetAll(storeName, indexName, query) {
        const database = await openDB();
        return new Promise((resolve, reject) => {
            const tx = database.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const source = indexName ? store.index(indexName) : store;
            const req = query ? source.getAll(query) : source.getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = (e) => reject(e.target.error);
        });
    }

    async function dbDelete(storeName, key) {
        const database = await openDB();
        return new Promise((resolve, reject) => {
            const tx = database.transaction(storeName, 'readwrite');
            tx.objectStore(storeName).delete(key);
            tx.oncomplete = () => resolve();
            tx.onerror = (e) => reject(e.target.error);
        });
    }

    async function dbCount(storeName) {
        const database = await openDB();
        return new Promise((resolve, reject) => {
            const tx = database.transaction(storeName, 'readonly');
            const req = tx.objectStore(storeName).count();
            req.onsuccess = () => resolve(req.result);
            req.onerror = (e) => reject(e.target.error);
        });
    }

    // ═══════════════════════════════════════
    // SECTION 2: Cached Fetch Pipeline
    // ═══════════════════════════════════════

    async function cachedFetch(url, cacheKey, ttl) {
        // Check in-memory timing first
        const now = Date.now();
        if (lastFetch[cacheKey] && (now - lastFetch[cacheKey]) < ttl) {
            const cached = await dbGet(CONFIG.STORES.cache, cacheKey);
            if (cached && cached.data) return cached.data;
        }

        // Check IndexedDB cache
        const cached = await dbGet(CONFIG.STORES.cache, cacheKey);
        if (cached && cached.timestamp && (now - cached.timestamp) < ttl) {
            lastFetch[cacheKey] = cached.timestamp;
            return cached.data;
        }

        // Fetch fresh data
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10000);

            const response = await fetch(url, {
                signal: controller.signal,
                headers: { 'Accept': 'application/json' }
            });
            clearTimeout(timeout);

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            lastFetch[cacheKey] = now;

            // Store in cache
            await dbPut(CONFIG.STORES.cache, {
                key: cacheKey,
                data: data,
                timestamp: now,
                url: url
            });

            return data;
        } catch (err) {
            console.warn(`[DATA_ENGINE] Fetch failed for ${cacheKey}:`, err.message);
            // Return stale cache if available
            if (cached && cached.data) return cached.data;
            return null;
        }
    }

    // ═══════════════════════════════════════
    // SECTION 3: Signal Model & Storage
    // ═══════════════════════════════════════

    function createSignal(opts) {
        const now = Date.now();
        return {
            id: opts.id || `SIG_${now}_${Math.random().toString(36).substr(2, 6)}`,
            domain: opts.domain,           // climate, geopolitics, economics, tech, epistemology, social
            source: opts.source,           // api name or rss feed
            title: opts.title,
            body: opts.body || '',
            severity: opts.severity || 50, // 0-100
            type: opts.type || 'intel',    // intel, alert, trend, anomaly
            tags: opts.tags || [],
            timestamp: opts.timestamp || now,
            url: opts.url || null,
            rawData: opts.rawData || null,
            correlations: opts.correlations || []
        };
    }

    async function storeSignal(signal) {
        await dbPut(CONFIG.STORES.signals, signal);
        emit('signal:new', signal);
        emit(`signal:${signal.domain}`, signal);

        // Prune old signals if over limit
        const count = await dbCount(CONFIG.STORES.signals);
        if (count > CONFIG.MAX_SIGNALS) {
            await pruneOldSignals(count - CONFIG.MAX_SIGNALS);
        }
    }

    async function pruneOldSignals(excess) {
        const database = await openDB();
        return new Promise((resolve, reject) => {
            const tx = database.transaction(CONFIG.STORES.signals, 'readwrite');
            const store = tx.objectStore(CONFIG.STORES.signals);
            const index = store.index('timestamp');
            const req = index.openCursor();
            let deleted = 0;

            req.onsuccess = (e) => {
                const cursor = e.target.result;
                if (cursor && deleted < excess) {
                    store.delete(cursor.primaryKey);
                    deleted++;
                    cursor.continue();
                }
            };
            tx.oncomplete = () => resolve(deleted);
            tx.onerror = (e) => reject(e.target.error);
        });
    }

    // ═══════════════════════════════════════
    // SECTION 4: Live Data Connectors
    // ═══════════════════════════════════════

    // ── 4A: CLIMATE (Open-Meteo) ──
    async function fetchClimate() {
        // Global monitoring points
        const locations = [
            { name: 'Arctic (Svalbard)', lat: 78.22, lon: 15.63 },
            { name: 'Equator (Nairobi)', lat: -1.29, lon: 36.82 },
            { name: 'Antarctic (McMurdo)', lat: -77.85, lon: 166.67 },
            { name: 'North Atlantic (Reykjavik)', lat: 64.15, lon: -21.94 },
            { name: 'Pacific (Tokyo)', lat: 35.68, lon: 139.69 }
        ];

        const signals = [];

        for (const loc of locations) {
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=3`;
            const data = await cachedFetch(url, `climate_${loc.name}`, CONFIG.CACHE_TTL.climate);

            if (data && data.current) {
                const temp = data.current.temperature_2m;
                const wind = data.current.wind_speed_10m;
                const humidity = data.current.relative_humidity_2m;
                const code = data.current.weather_code;

                // Calculate severity based on extremes
                let severity = 30;
                if (temp > 40 || temp < -30) severity = 90;
                else if (temp > 35 || temp < -20) severity = 70;
                else if (temp > 30 || temp < -10) severity = 50;
                if (wind > 80) severity = Math.max(severity, 85);
                else if (wind > 50) severity = Math.max(severity, 65);

                const weatherDesc = decodeWeatherCode(code);
                const type = severity > 70 ? 'alert' : severity > 50 ? 'anomaly' : 'intel';

                signals.push(createSignal({
                    id: `climate_${loc.name.replace(/[^a-zA-Z]/g, '')}_${Date.now()}`,
                    domain: 'climate',
                    source: 'open-meteo',
                    title: `${loc.name}: ${temp}°C — ${weatherDesc}`,
                    body: `Temp: ${temp}°C | Wind: ${wind} km/h | Humidity: ${humidity}% | Conditions: ${weatherDesc}`,
                    severity: severity,
                    type: type,
                    tags: ['temperature', 'weather', loc.name.toLowerCase()],
                    rawData: { temp, wind, humidity, code, location: loc }
                }));
            }
        }

        return signals;
    }

    function decodeWeatherCode(code) {
        const codes = {
            0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
            45: 'Fog', 48: 'Depositing rime fog',
            51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle',
            61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
            71: 'Slight snow', 73: 'Moderate snow', 75: 'Heavy snow',
            80: 'Slight rain showers', 81: 'Moderate rain showers', 82: 'Violent rain showers',
            95: 'Thunderstorm', 96: 'Thunderstorm with hail', 99: 'Thunderstorm with heavy hail'
        };
        return codes[code] || `Code ${code}`;
    }

    // ── 4B: SEISMIC RISK (USGS) ──
    async function fetchSeismic() {
        const url = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_month.geojson';
        const data = await cachedFetch(url, 'seismic_significant', CONFIG.CACHE_TTL.seismic);

        const signals = [];
        if (data && data.features) {
            for (const quake of data.features.slice(0, 10)) {
                const props = quake.properties;
                const coords = quake.geometry.coordinates;
                const mag = props.mag;
                const place = props.place || 'Unknown location';

                let severity = Math.min(100, Math.round(mag * 12));
                const type = mag >= 7 ? 'alert' : mag >= 5 ? 'anomaly' : 'intel';

                signals.push(createSignal({
                    id: `seismic_${props.code || quake.id}`,
                    domain: 'geopolitics', // Seismic events have geopolitical implications
                    source: 'usgs',
                    title: `M${mag} Earthquake — ${place}`,
                    body: `Magnitude ${mag} | Depth: ${coords[2]}km | Location: ${place} | Time: ${new Date(props.time).toISOString()}`,
                    severity: severity,
                    type: type,
                    tags: ['earthquake', 'seismic', 'risk'],
                    url: props.url,
                    rawData: { mag, place, depth: coords[2], lat: coords[1], lon: coords[0], time: props.time }
                }));
            }
        }
        return signals;
    }

    // ── 4C: TECHNOLOGY (HackerNews) ──
    async function fetchTech() {
        const topUrl = 'https://hacker-news.firebaseio.com/v0/topstories.json';
        const topIds = await cachedFetch(topUrl, 'hn_top', CONFIG.CACHE_TTL.tech);

        const signals = [];
        if (topIds && Array.isArray(topIds)) {
            // Fetch top 8 stories
            const storyIds = topIds.slice(0, 8);
            const storyPromises = storyIds.map(id =>
                cachedFetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, `hn_item_${id}`, CONFIG.CACHE_TTL.tech)
            );

            const stories = await Promise.all(storyPromises);

            for (const story of stories) {
                if (!story || !story.title) continue;

                const score = story.score || 0;
                let severity = Math.min(95, Math.round(20 + (score / 10)));
                const isAI = /\b(ai|gpt|llm|claude|openai|anthropic|deepmind|neural|transformer|machine learning)\b/i.test(story.title);
                const isSecurity = /\b(hack|breach|vulnerability|exploit|zero-day|ransomware|leak)\b/i.test(story.title);
                const isCrypto = /\b(bitcoin|ethereum|crypto|blockchain|defi)\b/i.test(story.title);

                if (isAI) severity = Math.min(95, severity + 15);
                if (isSecurity) severity = Math.min(95, severity + 20);

                const tags = ['tech'];
                if (isAI) tags.push('ai', 'alignment');
                if (isSecurity) tags.push('security', 'threat');
                if (isCrypto) tags.push('crypto', 'economics');

                signals.push(createSignal({
                    id: `hn_${story.id}`,
                    domain: 'technology',
                    source: 'hackernews',
                    title: story.title,
                    body: `Score: ${score} | Comments: ${story.descendants || 0} | By: ${story.by || 'unknown'}`,
                    severity: severity,
                    type: score > 300 ? 'trend' : 'intel',
                    tags: tags,
                    url: story.url || `https://news.ycombinator.com/item?id=${story.id}`,
                    rawData: { score, comments: story.descendants, by: story.by }
                }));
            }
        }
        return signals;
    }

    // ── 4D: ECONOMICS (CoinGecko — crypto volatility as proxy) ──
    async function fetchEconomic() {
        const url = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd,eur&include_24hr_change=true&include_market_cap=true';
        const data = await cachedFetch(url, 'crypto_prices', CONFIG.CACHE_TTL.economic);

        const signals = [];
        if (data) {
            for (const [coin, info] of Object.entries(data)) {
                const change = info.usd_24h_change || 0;
                const price = info.usd || 0;
                const marketCap = info.usd_market_cap || 0;

                let severity = Math.min(95, Math.round(30 + Math.abs(change) * 3));
                const type = Math.abs(change) > 8 ? 'alert' : Math.abs(change) > 4 ? 'anomaly' : 'intel';

                const direction = change > 0 ? '+' : '';
                signals.push(createSignal({
                    id: `crypto_${coin}_${Date.now()}`,
                    domain: 'economics',
                    source: 'coingecko',
                    title: `${coin.toUpperCase()}: $${price.toLocaleString()} (${direction}${change.toFixed(2)}%)`,
                    body: `Price: $${price.toLocaleString()} | 24h Change: ${direction}${change.toFixed(2)}% | Market Cap: $${(marketCap / 1e9).toFixed(1)}B`,
                    severity: severity,
                    type: type,
                    tags: ['crypto', 'volatility', coin],
                    rawData: { price, change, marketCap, coin }
                }));
            }
        }
        return signals;
    }

    // ── 4E: EPISTEMOLOGY (Wikipedia featured content) ──
    async function fetchEpistemology() {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        const url = `https://en.wikipedia.org/api/rest_v1/feed/featured/${y}/${m}/${d}`;

        const data = await cachedFetch(url, `wiki_featured_${y}${m}${d}`, CONFIG.CACHE_TTL.epistemology);

        const signals = [];
        if (data) {
            // Today's featured article
            if (data.tfa) {
                signals.push(createSignal({
                    id: `wiki_tfa_${y}${m}${d}`,
                    domain: 'epistemology',
                    source: 'wikipedia',
                    title: `Featured: ${data.tfa.normalizedtitle || data.tfa.title || 'Unknown'}`,
                    body: data.tfa.extract ? data.tfa.extract.substring(0, 300) : '',
                    severity: 30,
                    type: 'intel',
                    tags: ['knowledge', 'featured', 'epistemology'],
                    url: data.tfa.content_urls ? data.tfa.content_urls.desktop.page : null
                }));
            }

            // Most read articles (social signal)
            if (data.mostread && data.mostread.articles) {
                for (const article of data.mostread.articles.slice(0, 5)) {
                    const views = article.views || 0;
                    let severity = Math.min(85, Math.round(25 + (views / 100000) * 10));

                    signals.push(createSignal({
                        id: `wiki_trending_${article.title.replace(/\s/g, '_')}_${y}${m}${d}`,
                        domain: 'epistemology',
                        source: 'wikipedia',
                        title: `Trending: ${article.normalizedtitle || article.title} (${(views / 1000).toFixed(0)}K views)`,
                        body: article.extract ? article.extract.substring(0, 200) : '',
                        severity: severity,
                        type: views > 500000 ? 'trend' : 'intel',
                        tags: ['trending', 'social-signal', 'epistemology'],
                        url: article.content_urls ? article.content_urls.desktop.page : null,
                        rawData: { views, title: article.title }
                    }));
                }
            }
        }
        return signals;
    }

    // ── 4F: NEWS via RSS (rss2json proxy) ──
    async function fetchNews() {
        const feeds = [
            { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', name: 'BBC World', domain: 'geopolitics' },
            { url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', name: 'NYT World', domain: 'geopolitics' },
            { url: 'https://www.aljazeera.com/xml/rss/all.xml', name: 'Al Jazeera', domain: 'social' },
            { url: 'https://feeds.feedburner.com/TechCrunch/', name: 'TechCrunch', domain: 'technology' }
        ];

        const signals = [];

        for (const feed of feeds) {
            const proxyUrl = `${CONFIG.RSS_PROXY}?rss_url=${encodeURIComponent(feed.url)}&count=5`;
            const data = await cachedFetch(proxyUrl, `rss_${feed.name.replace(/\s/g, '_')}`, CONFIG.CACHE_TTL.news);

            if (data && data.items) {
                for (const item of data.items.slice(0, 3)) {
                    const title = item.title || '';
                    const pubDate = item.pubDate ? new Date(item.pubDate).getTime() : Date.now();

                    // Keyword-based severity scoring
                    let severity = 40;
                    const highImpact = /\b(war|attack|crisis|collapse|emergency|sanctions|coup|invasion|nuclear|pandemic)\b/i;
                    const medImpact = /\b(protest|election|recession|regulation|ban|arrest|investigation|leak)\b/i;
                    if (highImpact.test(title)) severity = 80;
                    else if (medImpact.test(title)) severity = 60;

                    const tags = [feed.domain, feed.name.toLowerCase()];
                    if (/\b(ai|tech|cyber)\b/i.test(title)) tags.push('technology');
                    if (/\b(climate|environment|emission)\b/i.test(title)) tags.push('climate');

                    signals.push(createSignal({
                        id: `rss_${feed.name.replace(/\s/g, '')}_${pubDate}`,
                        domain: feed.domain,
                        source: `rss:${feed.name}`,
                        title: title,
                        body: (item.description || '').replace(/<[^>]*>/g, '').substring(0, 250),
                        severity: severity,
                        type: severity > 70 ? 'alert' : 'intel',
                        tags: tags,
                        url: item.link,
                        timestamp: pubDate
                    }));
                }
            }
        }
        return signals;
    }

    // ═══════════════════════════════════════
    // SECTION 5: Signal Correlation Engine
    // ═══════════════════════════════════════

    async function correlateSignals(newSignals) {
        const allSignals = await dbGetAll(CONFIG.STORES.signals);
        const recentSignals = allSignals.filter(s => (Date.now() - s.timestamp) < 24 * 60 * 60 * 1000);

        for (const signal of newSignals) {
            const correlations = [];

            for (const existing of recentSignals) {
                if (existing.id === signal.id) continue;

                // Tag overlap scoring
                const commonTags = signal.tags.filter(t => existing.tags.includes(t));
                if (commonTags.length >= 2) {
                    correlations.push({
                        signalId: existing.id,
                        strength: Math.min(1, commonTags.length * 0.3),
                        reason: `Shared tags: ${commonTags.join(', ')}`
                    });
                }

                // Cross-domain correlation (more valuable)
                if (signal.domain !== existing.domain && commonTags.length >= 1) {
                    const existingCorr = correlations.find(c => c.signalId === existing.id);
                    if (existingCorr) {
                        existingCorr.strength = Math.min(1, existingCorr.strength + 0.2);
                        existingCorr.reason += ' [CROSS-DOMAIN]';
                    }
                }

                // Severity convergence (multiple high-severity signals = systemic risk)
                if (signal.severity > 70 && existing.severity > 70 && signal.domain !== existing.domain) {
                    correlations.push({
                        signalId: existing.id,
                        strength: 0.7,
                        reason: `Multi-domain high-severity convergence`
                    });
                }
            }

            signal.correlations = correlations.slice(0, 5); // Top 5 correlations
        }
    }

    // ═══════════════════════════════════════
    // SECTION 6: Event Bus
    // ═══════════════════════════════════════

    function on(event, callback) {
        if (!listeners[event]) listeners[event] = [];
        listeners[event].push(callback);
        return () => {
            listeners[event] = listeners[event].filter(cb => cb !== callback);
        };
    }

    function emit(event, data) {
        // Internal listeners
        if (listeners[event]) {
            listeners[event].forEach(cb => {
                try { cb(data); } catch (e) { console.error('[DATA_ENGINE] Listener error:', e); }
            });
        }

        // Custom DOM event for cross-module communication
        window.dispatchEvent(new CustomEvent('hs:' + event, { detail: data }));

        // BroadcastChannel for cross-tab sync
        try {
            const channel = new BroadcastChannel('hybrid-syndicate');
            channel.postMessage({ event, data, timestamp: Date.now() });
            channel.close();
        } catch (e) {
            // BroadcastChannel not supported, silent fail
        }
    }

    // Listen for cross-tab messages
    try {
        const channel = new BroadcastChannel('hybrid-syndicate');
        channel.onmessage = (e) => {
            const { event, data } = e.data;
            if (listeners[event]) {
                listeners[event].forEach(cb => {
                    try { cb(data); } catch (err) { /* silent */ }
                });
            }
        };
    } catch (e) { /* BroadcastChannel not supported */ }

    // ═══════════════════════════════════════
    // SECTION 7: Full Scan Orchestrator
    // ═══════════════════════════════════════

    async function scan() {
        if (isScanning) return;
        isScanning = true;

        const scanStart = Date.now();
        emit('scan:start', { timestamp: scanStart });

        const allSignals = [];
        const errors = [];

        // Run all connectors in parallel
        const connectors = [
            { name: 'climate', fn: fetchClimate },
            { name: 'seismic', fn: fetchSeismic },
            { name: 'tech', fn: fetchTech },
            { name: 'economic', fn: fetchEconomic },
            { name: 'epistemology', fn: fetchEpistemology },
            { name: 'news', fn: fetchNews }
        ];

        const results = await Promise.allSettled(
            connectors.map(async (c) => {
                try {
                    const signals = await c.fn();
                    return { name: c.name, signals: signals || [] };
                } catch (e) {
                    errors.push({ connector: c.name, error: e.message });
                    return { name: c.name, signals: [] };
                }
            })
        );

        for (const result of results) {
            if (result.status === 'fulfilled' && result.value.signals.length > 0) {
                allSignals.push(...result.value.signals);
            }
        }

        // Correlate signals
        if (allSignals.length > 0) {
            await correlateSignals(allSignals);

            // Store all signals
            for (const signal of allSignals) {
                await storeSignal(signal);
            }
        }

        // Compute domain risk scores
        const domainScores = await computeDomainScores();

        const scanDuration = Date.now() - scanStart;
        const scanResult = {
            timestamp: scanStart,
            duration: scanDuration,
            signalsCollected: allSignals.length,
            errors: errors,
            domainScores: domainScores
        };

        // Save scan metadata
        await dbPut(CONFIG.STORES.meta, { key: 'lastScan', ...scanResult });

        isScanning = false;
        emit('scan:complete', scanResult);

        return scanResult;
    }

    // ═══════════════════════════════════════
    // SECTION 8: Domain Score Computation
    // ═══════════════════════════════════════

    async function computeDomainScores() {
        const allSignals = await dbGetAll(CONFIG.STORES.signals);
        const recent = allSignals.filter(s => (Date.now() - s.timestamp) < 6 * 60 * 60 * 1000); // Last 6 hours

        const scores = {};

        for (const [domain, meta] of Object.entries(DOMAINS)) {
            const domainSignals = recent.filter(s => s.domain === domain);

            if (domainSignals.length === 0) {
                scores[domain] = { risk: 50, volatility: 30, signals: 0, trend: 'stable' };
                continue;
            }

            const avgSeverity = domainSignals.reduce((sum, s) => sum + s.severity, 0) / domainSignals.length;
            const maxSeverity = Math.max(...domainSignals.map(s => s.severity));
            const alertCount = domainSignals.filter(s => s.type === 'alert').length;

            // Weighted risk: average severity + alert bonus + volume bonus
            const risk = Math.min(100, Math.round(
                avgSeverity * 0.5 +
                maxSeverity * 0.3 +
                Math.min(20, alertCount * 5) +
                Math.min(10, domainSignals.length)
            ));

            // Volatility: standard deviation of severities
            const mean = avgSeverity;
            const variance = domainSignals.reduce((sum, s) => sum + Math.pow(s.severity - mean, 2), 0) / domainSignals.length;
            const volatility = Math.min(100, Math.round(Math.sqrt(variance) * 2));

            // Trend: compare last hour vs previous
            const lastHour = domainSignals.filter(s => (Date.now() - s.timestamp) < 60 * 60 * 1000);
            const prevHour = domainSignals.filter(s => {
                const age = Date.now() - s.timestamp;
                return age >= 60 * 60 * 1000 && age < 2 * 60 * 60 * 1000;
            });

            let trend = 'stable';
            if (lastHour.length > 0 && prevHour.length > 0) {
                const lastAvg = lastHour.reduce((s, sig) => s + sig.severity, 0) / lastHour.length;
                const prevAvg = prevHour.reduce((s, sig) => s + sig.severity, 0) / prevHour.length;
                if (lastAvg > prevAvg + 5) trend = 'rising';
                else if (lastAvg < prevAvg - 5) trend = 'falling';
            }

            scores[domain] = {
                risk: risk,
                volatility: volatility,
                signals: domainSignals.length,
                alerts: alertCount,
                trend: trend,
                topSignal: domainSignals.sort((a, b) => b.severity - a.severity)[0]
            };
        }

        emit('scores:updated', scores);
        return scores;
    }

    // ═══════════════════════════════════════
    // SECTION 9: Public Query API
    // ═══════════════════════════════════════

    async function getSignals(opts = {}) {
        let signals = await dbGetAll(CONFIG.STORES.signals);

        if (opts.domain) {
            signals = signals.filter(s => s.domain === opts.domain);
        }
        if (opts.type) {
            signals = signals.filter(s => s.type === opts.type);
        }
        if (opts.minSeverity) {
            signals = signals.filter(s => s.severity >= opts.minSeverity);
        }
        if (opts.since) {
            signals = signals.filter(s => s.timestamp >= opts.since);
        }
        if (opts.source) {
            signals = signals.filter(s => s.source === opts.source);
        }
        if (opts.tag) {
            signals = signals.filter(s => s.tags.includes(opts.tag));
        }

        // Sort by timestamp descending (newest first)
        signals.sort((a, b) => b.timestamp - a.timestamp);

        if (opts.limit) {
            signals = signals.slice(0, opts.limit);
        }

        return signals;
    }

    async function getAlerts() {
        return getSignals({ type: 'alert', limit: 20 });
    }

    async function getRecentByDomain(domain, limit = 10) {
        return getSignals({ domain, limit });
    }

    async function getStats() {
        const total = await dbCount(CONFIG.STORES.signals);
        const lastScan = await dbGet(CONFIG.STORES.meta, 'lastScan');
        const scores = await computeDomainScores();

        return {
            totalSignals: total,
            lastScan: lastScan,
            domainScores: scores,
            isScanning: isScanning,
            domains: Object.keys(DOMAINS)
        };
    }

    // ═══════════════════════════════════════
    // SECTION 10: Initialization
    // ═══════════════════════════════════════

    async function init() {
        try {
            await openDB();
            emit('engine:ready', { timestamp: Date.now() });

            // Initial scan
            await scan();

            // Start periodic scanning
            scanTimer = setInterval(scan, CONFIG.SCAN_INTERVAL);

            const stats = await getStats();

            console.log(
                '%c DATA_ENGINE v1.0 ',
                'background: #00d4ff; color: #060810; font-family: Orbitron; font-weight: 900; padding: 6px 12px; font-size: 12px;'
            );
            console.log(
                '%c Central Intelligence Backbone — ONLINE ',
                'color: #00d4aa; font-family: monospace;'
            );
            console.log(
                `%c Signals: ${stats.totalSignals} | Domains: ${stats.domains.length} | Scan interval: ${CONFIG.SCAN_INTERVAL / 1000}s `,
                'color: #6b7fa3; font-family: monospace;'
            );

            return stats;
        } catch (e) {
            console.error('[DATA_ENGINE] Init failed:', e);
            emit('engine:error', { error: e.message });
        }
    }

    function destroy() {
        if (scanTimer) clearInterval(scanTimer);
        scanTimer = null;
        isScanning = false;
    }

    // Auto-init when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // ── PUBLIC API ──
    return {
        // Core operations
        scan,
        init,
        destroy,

        // Query
        getSignals,
        getAlerts,
        getRecentByDomain,
        getStats,
        computeDomainScores,

        // Event bus
        on,
        emit,

        // Signal creation (for modules that generate their own signals)
        createSignal,
        storeSignal,

        // Direct DB access for advanced use
        dbGet,
        dbPut,
        dbGetAll,

        // Constants
        DOMAINS,
        CONFIG
    };

})();
