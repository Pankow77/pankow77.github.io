// ═══════════════════════════════════════════════════
// RSS PIPELINE v1.0 — Feed Fetching + Signal Classification
// Hybrid Syndicate / Ethic Software Foundation
// ═══════════════════════════════════════════════════
// Fetches real RSS feeds via CORS proxy
// Classifies signals into 6 ORACLE domains
// Scores severity and relevance
// Stores via StateManager

(function(global) {
    'use strict';

    // ═══ FEED SOURCES ═══
    const FEEDS = [
        // Geopolitics
        { url: 'https://feeds.reuters.com/reuters/worldNews', domain: 'geopolitics', source: 'Reuters', weight: 1.0 },
        { url: 'https://www.aljazeera.com/xml/rss/all.xml', domain: 'geopolitics', source: 'Al Jazeera', weight: 0.9 },
        { url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', domain: 'geopolitics', source: 'NYT World', weight: 0.95 },
        // Economics
        { url: 'https://feeds.reuters.com/reuters/businessNews', domain: 'economics', source: 'Reuters Biz', weight: 1.0 },
        { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Economy.xml', domain: 'economics', source: 'NYT Economy', weight: 0.9 },
        // Technology
        { url: 'https://feeds.arstechnica.com/arstechnica/index', domain: 'technology', source: 'Ars Technica', weight: 0.9 },
        { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml', domain: 'technology', source: 'NYT Tech', weight: 0.85 },
        // Climate / Ecology
        { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Climate.xml', domain: 'climate', source: 'NYT Climate', weight: 0.9 },
        { url: 'https://www.theguardian.com/environment/rss', domain: 'climate', source: 'Guardian Env', weight: 0.85 },
        // Social
        { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Health.xml', domain: 'social', source: 'NYT Health', weight: 0.8 },
        { url: 'https://www.theguardian.com/world/rss', domain: 'social', source: 'Guardian World', weight: 0.85 },
        // Epistemology (science + AI)
        { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Science.xml', domain: 'epistemology', source: 'NYT Science', weight: 0.85 },
    ];

    // ═══ CORS PROXIES (fallback chain) ═══
    const PROXIES = [
        url => 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url),
        url => 'https://corsproxy.io/?' + encodeURIComponent(url),
    ];

    // ═══ CLASSIFICATION KEYWORDS ═══
    const DOMAIN_KEYWORDS = {
        geopolitics: {
            high: ['war','conflict','sanctions','military','invasion','nato','nuclear','coup','territory','sovereignty','missile','troops','ceasefire','escalation','geopolitical'],
            medium: ['diplomacy','treaty','alliance','election','regime','protest','border','embassy','negotiations','summit','referendum','annexation'],
            low: ['foreign','government','minister','president','policy','bilateral','international','united nations']
        },
        economics: {
            high: ['recession','inflation','crash','default','bankruptcy','crisis','collapse','bubble','debt ceiling','bank run','hyperinflation'],
            medium: ['gdp','interest rate','federal reserve','ecb','tariff','trade war','stock market','bond','commodity','supply chain','unemployment'],
            low: ['market','economy','financial','investment','growth','trade','fiscal','monetary','revenue','profit']
        },
        technology: {
            high: ['ai regulation','artificial intelligence','llm','gpt','autonomous weapons','deepfake','surveillance','zero-day','cyberattack','data breach','quantum'],
            medium: ['machine learning','neural network','algorithm','blockchain','cryptocurrency','cybersecurity','encryption','privacy','robotics','semiconductor'],
            low: ['software','hardware','startup','tech','digital','innovation','platform','cloud','computing','internet']
        },
        climate: {
            high: ['climate emergency','extinction','tipping point','sea level','methane','wildfire','drought','flood','hurricane','category 5','ecosystem collapse'],
            medium: ['carbon emissions','renewable','fossil fuel','deforestation','biodiversity','pollution','glacier','coral reef','endangered','heatwave'],
            low: ['climate','environment','sustainable','green','energy','conservation','weather','temperature','recycling']
        },
        social: {
            high: ['pandemic','humanitarian crisis','famine','genocide','mass displacement','refugee crisis','human rights violation'],
            medium: ['inequality','poverty','migration','public health','education crisis','food security','housing crisis','mental health','demographic'],
            low: ['society','community','population','welfare','healthcare','education','culture','labor','social']
        },
        epistemology: {
            high: ['misinformation','disinformation','propaganda','censorship','manipulation','fake news','cognitive warfare','information warfare','epistemic'],
            medium: ['media bias','fact-check','peer review','scientific integrity','data manipulation','transparency','accountability','open source','reproducibility'],
            low: ['research','study','science','knowledge','truth','evidence','analysis','methodology','academic']
        }
    };

    // ═══ SEVERITY SCORING ═══
    function classifySignal(title, description, feedDomain) {
        const text = ((title || '') + ' ' + (description || '')).toLowerCase();
        const scores = {};
        let maxScore = 0;
        let maxDomain = feedDomain || 'social';

        for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
            let score = 0;
            let hitCount = 0;

            keywords.high.forEach(kw => {
                if (text.includes(kw)) { score += 3; hitCount++; }
            });
            keywords.medium.forEach(kw => {
                if (text.includes(kw)) { score += 1.5; hitCount++; }
            });
            keywords.low.forEach(kw => {
                if (text.includes(kw)) { score += 0.5; hitCount++; }
            });

            // Bonus if feed's native domain matches
            if (domain === feedDomain) score *= 1.3;

            scores[domain] = { score, hitCount };

            if (score > maxScore) {
                maxScore = score;
                maxDomain = domain;
            }
        }

        // Severity: 0-100
        const severity = Math.min(100, Math.round(maxScore * 8));

        // Relevance: based on total keyword hits across all domains
        const totalHits = Object.values(scores).reduce((s, d) => s + d.hitCount, 0);
        const relevance = Math.min(100, Math.round(totalHits * 5));

        // Cross-domain flag: signal touches multiple domains
        const activeDomains = Object.entries(scores).filter(([, d]) => d.score > 2).map(([k]) => k);
        const crossDomain = activeDomains.length > 1;

        return {
            domain: maxDomain,
            severity,
            relevance,
            crossDomain,
            activeDomains,
            scores
        };
    }

    // ═══ RSS PARSING ═══
    function parseRSSXML(xmlText) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlText, 'text/xml');

        // Check for RSS format
        const items = doc.querySelectorAll('item');
        if (items.length > 0) {
            return Array.from(items).map(item => ({
                title: getTagText(item, 'title'),
                link: getTagText(item, 'link'),
                description: stripHTML(getTagText(item, 'description')),
                pubDate: getTagText(item, 'pubDate'),
                guid: getTagText(item, 'guid') || getTagText(item, 'link')
            }));
        }

        // Check for Atom format
        const entries = doc.querySelectorAll('entry');
        if (entries.length > 0) {
            return Array.from(entries).map(entry => ({
                title: getTagText(entry, 'title'),
                link: entry.querySelector('link')?.getAttribute('href') || '',
                description: stripHTML(getTagText(entry, 'summary') || getTagText(entry, 'content')),
                pubDate: getTagText(entry, 'published') || getTagText(entry, 'updated'),
                guid: getTagText(entry, 'id') || ''
            }));
        }

        return [];
    }

    function getTagText(parent, tag) {
        const el = parent.querySelector(tag);
        return el ? el.textContent.trim() : '';
    }

    function stripHTML(html) {
        if (!html) return '';
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || '';
    }

    // ═══ FETCH WITH PROXY FALLBACK ═══
    async function fetchFeed(feedUrl) {
        for (const proxyFn of PROXIES) {
            try {
                const proxied = proxyFn(feedUrl);
                const resp = await fetch(proxied, {
                    signal: AbortSignal.timeout ? AbortSignal.timeout(10000) : undefined
                });
                if (!resp.ok) continue;
                const text = await resp.text();
                if (text.length < 100 || !text.includes('<')) continue;
                return text;
            } catch(e) {
                continue;
            }
        }
        return null;
    }

    // ═══ DEDUPLICATION ═══
    const _seenGuids = new Set();
    const MAX_SEEN = 5000;

    function isDuplicate(guid) {
        if (!guid) return false;
        if (_seenGuids.has(guid)) return true;
        _seenGuids.add(guid);
        if (_seenGuids.size > MAX_SEEN) {
            // Trim oldest entries (Set maintains insertion order)
            const arr = Array.from(_seenGuids);
            _seenGuids.clear();
            arr.slice(-3000).forEach(g => _seenGuids.add(g));
        }
        return false;
    }

    // ═══ PIPELINE CORE ═══
    let _running = false;
    let _interval = null;
    let _stats = { runs: 0, totalSignals: 0, errors: 0, lastRun: 0, feedsActive: 0 };
    let _onSignalCallbacks = [];

    async function processFeed(feed) {
        const xml = await fetchFeed(feed.url);
        if (!xml) {
            _stats.errors++;
            return [];
        }

        const items = parseRSSXML(xml);
        const signals = [];

        for (const item of items) {
            if (isDuplicate(item.guid)) continue;

            const classification = classifySignal(item.title, item.description, feed.domain);

            const signal = {
                title: item.title,
                link: item.link,
                description: (item.description || '').substring(0, 500),
                pubDate: item.pubDate ? new Date(item.pubDate).getTime() : Date.now(),
                source: feed.source,
                feedUrl: feed.url,
                feedDomain: feed.domain,
                feedWeight: feed.weight,
                domain: classification.domain,
                severity: classification.severity,
                relevance: classification.relevance,
                crossDomain: classification.crossDomain,
                activeDomains: classification.activeDomains,
                timestamp: Date.now(),
                processed: true
            };

            signals.push(signal);

            // Store in StateManager if available
            if (global.StateManager) {
                try { await global.StateManager.addSignal(signal); } catch(e) {}
            }
        }

        if (global.StateManager) {
            global.StateManager.setFeedLastFetch(feed.url, Date.now());
        }

        return signals;
    }

    async function runPipeline() {
        if (_running) return;
        _running = true;
        _stats.runs++;
        _stats.lastRun = Date.now();
        _stats.feedsActive = 0;

        const allSignals = [];

        // Process feeds in parallel batches of 3
        for (let i = 0; i < FEEDS.length; i += 3) {
            const batch = FEEDS.slice(i, i + 3);
            const results = await Promise.allSettled(
                batch.map(feed => processFeed(feed))
            );
            results.forEach((r, idx) => {
                if (r.status === 'fulfilled' && r.value.length > 0) {
                    allSignals.push(...r.value);
                    _stats.feedsActive++;
                }
            });
        }

        _stats.totalSignals += allSignals.length;

        // Update pipeline status in StateManager
        if (global.StateManager) {
            global.StateManager.setPipelineStatus({
                active: true,
                lastRun: _stats.lastRun,
                signalsProcessed: _stats.totalSignals,
                feedsActive: _stats.feedsActive,
                feedsTotal: FEEDS.length,
                errors: _stats.errors,
                runs: _stats.runs
            });

            // Calculate domain risk levels from recent signals
            updateDomainRisks(allSignals);
        }

        // Notify listeners
        _onSignalCallbacks.forEach(fn => {
            try { fn(allSignals); } catch(e) {}
        });

        // Trigger CoreFeed if available
        if (global.CoreFeed && allSignals.length > 0) {
            CoreFeed.trigger('rss-pipeline');
        }

        _running = false;
        return allSignals;
    }

    function updateDomainRisks(signals) {
        if (!global.StateManager || signals.length === 0) return;

        const domainSeverities = {};
        signals.forEach(s => {
            if (!domainSeverities[s.domain]) domainSeverities[s.domain] = [];
            domainSeverities[s.domain].push(s.severity);
        });

        for (const [domain, sevs] of Object.entries(domainSeverities)) {
            const avg = sevs.reduce((a, b) => a + b, 0) / sevs.length;
            const max = Math.max(...sevs);
            // Weighted: 60% average, 40% max
            const risk = Math.round(avg * 0.6 + max * 0.4);
            StateManager.setDomainRisk(domain, risk);
        }
    }

    // ═══ PUBLIC API ═══
    const RSSPipeline = {
        // Start the pipeline with periodic fetching
        start(intervalMs) {
            const interval = intervalMs || 5 * 60 * 1000; // default 5 min
            console.log('%c[RSSPipeline] starting — interval: ' + (interval/1000) + 's, feeds: ' + FEEDS.length,
                'color: #10b981; font-weight: bold');

            // Run immediately
            runPipeline();

            // Then periodically
            if (_interval) clearInterval(_interval);
            _interval = setInterval(runPipeline, interval);
        },

        // Stop periodic fetching
        stop() {
            if (_interval) { clearInterval(_interval); _interval = null; }
            console.log('%c[RSSPipeline] stopped', 'color: #f59e0b');
        },

        // Run once
        async run() {
            return runPipeline();
        },

        // Register callback for new signals
        onSignals(callback) {
            _onSignalCallbacks.push(callback);
            return () => {
                _onSignalCallbacks = _onSignalCallbacks.filter(fn => fn !== callback);
            };
        },

        // Get stats
        getStats() {
            return { ..._stats };
        },

        // Get feed list
        getFeeds() {
            return FEEDS.map(f => ({ ...f }));
        },

        // Classify a text manually (exposed for other pages)
        classify(title, description) {
            return classifySignal(title, description);
        },

        // Check if pipeline is running
        isRunning() { return _running; }
    };

    global.RSSPipeline = RSSPipeline;

})(typeof window !== 'undefined' ? window : this);
