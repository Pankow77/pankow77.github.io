// ====================================================================
// ORACLE ENGINE v3.0 — Sistema Nervoso Distribuito
// Intelligenza a Tre Livelli: Sensoriale → Sinaptico → Corticale
// Browser-Nativo · Memoria Locale · Zero Cloud
// ====================================================================
// La rivoluzione è il browser e la memoria locale.
// Questo motore sviluppa memoria, sensibilità e istinto.
// Non predice eventi. Misura tensione strutturale.
// ====================================================================

'use strict';

// ============================================================
// SECTION 1: CONFIGURATION
// ============================================================

const ORACLE_CONFIG = {
    CORS_PROXY: 'https://api.allorigins.win/get?url=',
    SCAN_INTERVAL: 5 * 60 * 1000,       // 5 minuti
    MAX_SIGNALS_STORED: 5000,
    MAX_STABILITY_POINTS: 2000,
    MAX_DIAGNOSES: 500,
    CRITICAL_THRESHOLD: 0.35,
    NEURON_ALPHA: 0.12,                   // EMA learning rate
    DB_NAME: 'oracle-ecosystem-v3',
    DB_VERSION: 1
};

// Lexicon for urgency scoring
const URGENCY_LEXICON = {
    critical: ['war', 'attack', 'dead', 'killed', 'massacre', 'invasion', 'nuclear',
               'collapse', 'crash', 'emergency', 'catastrophe', 'pandemic', 'explosion',
               'genocide', 'famine', 'catastrophic', 'annihilation', 'bioweapon'],
    high:     ['crisis', 'conflict', 'threat', 'sanctions', 'violence', 'missile',
               'military', 'earthquake', 'hurricane', 'flood', 'drought', 'protests',
               'escalation', 'insurgency', 'terrorism', 'cyberattack', 'blackout'],
    medium:   ['tension', 'warning', 'concern', 'dispute', 'instability', 'risk',
               'decline', 'downturn', 'recession', 'strike', 'unrest', 'deficit',
               'volatility', 'inflation', 'stagnation', 'disruption', 'layoffs'],
    low:      ['talks', 'agreement', 'cooperation', 'growth', 'recovery', 'peace',
               'treaty', 'reform', 'progress', 'stable', 'summit', 'diplomacy']
};

const SENTIMENT_NEGATIVE = ['war', 'crisis', 'dead', 'killed', 'attack', 'collapse',
    'threat', 'sanctions', 'violence', 'conflict', 'decline', 'recession', 'famine',
    'catastrophe', 'destruction', 'fear', 'panic', 'death', 'bomb', 'terror',
    'genocide', 'massacre', 'invasion', 'epidemic', 'shutdown', 'breach', 'hack'];

const SENTIMENT_POSITIVE = ['peace', 'agreement', 'growth', 'recovery', 'cooperation',
    'stability', 'progress', 'reform', 'prosperity', 'success', 'breakthrough',
    'hope', 'deal', 'treaty', 'aid', 'relief', 'rescued', 'innovation', 'cure'];

// Default neuron definitions
const DEFAULT_NEURONS = [
    { id: 'bbc-world',      name: 'BBC World',        domain: 'geopolitics', type: 'rss',      url: 'http://feeds.bbci.co.uk/news/world/rss.xml',         basePriority: 1.0  },
    { id: 'guardian-world',  name: 'Guardian World',   domain: 'geopolitics', type: 'rss',      url: 'https://www.theguardian.com/world/rss',               basePriority: 0.9  },
    { id: 'aljazeera',       name: 'Al Jazeera',       domain: 'geopolitics', type: 'rss',      url: 'https://www.aljazeera.com/xml/rss/all.xml',           basePriority: 0.85 },
    { id: 'npr-news',        name: 'NPR News',         domain: 'social',      type: 'rss',      url: 'https://feeds.npr.org/1001/rss.xml',                  basePriority: 0.8  },
    { id: 'reuters-biz',     name: 'Reuters Business',  domain: 'economics',   type: 'rss',      url: 'https://www.reutersagency.com/feed/?best-topics=business-finance&post_type=best', basePriority: 0.95 },
    { id: 'bbc-tech',        name: 'BBC Technology',    domain: 'technology',  type: 'rss',      url: 'http://feeds.bbci.co.uk/news/technology/rss.xml',     basePriority: 0.8  },
    { id: 'guardian-tech',   name: 'Guardian Tech',     domain: 'technology',  type: 'rss',      url: 'https://www.theguardian.com/technology/rss',          basePriority: 0.75 },
    { id: 'guardian-env',    name: 'Guardian Env',      domain: 'climate',     type: 'rss',      url: 'https://www.theguardian.com/environment/rss',         basePriority: 0.85 },
    { id: 'usgs-quakes',     name: 'USGS Earthquakes',  domain: 'climate',     type: 'api-json', url: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_month.geojson', basePriority: 0.9 },
    { id: 'bbc-science',     name: 'BBC Science',       domain: 'epistemology', type: 'rss',     url: 'http://feeds.bbci.co.uk/news/science_and_environment/rss.xml', basePriority: 0.7 }
];


// ============================================================
// SECTION 2: ORACLE MEMORY (IndexedDB)
// ============================================================

const OracleMemory = {
    db: null,

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(ORACLE_CONFIG.DB_NAME, ORACLE_CONFIG.DB_VERSION);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('neurons')) {
                    const ns = db.createObjectStore('neurons', { keyPath: 'id' });
                    ns.createIndex('domain', 'domain', { unique: false });
                }
                if (!db.objectStoreNames.contains('signals')) {
                    const ss = db.createObjectStore('signals', { keyPath: 'id', autoIncrement: true });
                    ss.createIndex('timestamp', 'timestamp', { unique: false });
                    ss.createIndex('domain', 'domain', { unique: false });
                    ss.createIndex('neuronId', 'neuronId', { unique: false });
                }
                if (!db.objectStoreNames.contains('stability')) {
                    const st = db.createObjectStore('stability', { keyPath: 'id', autoIncrement: true });
                    st.createIndex('timestamp', 'timestamp', { unique: false });
                }
                if (!db.objectStoreNames.contains('diagnoses')) {
                    const dg = db.createObjectStore('diagnoses', { keyPath: 'id', autoIncrement: true });
                    dg.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve();
            };

            request.onerror = (event) => {
                console.error('[OracleMemory] DB open failed:', event.target.error);
                reject(event.target.error);
            };
        });
    },

    _tx(store, mode) {
        return this.db.transaction(store, mode).objectStore(store);
    },

    _promisify(request) {
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    // Neurons
    async saveNeuron(neuron) {
        return this._promisify(this._tx('neurons', 'readwrite').put(neuron));
    },

    async getNeuron(id) {
        return this._promisify(this._tx('neurons', 'readonly').get(id));
    },

    async getAllNeurons() {
        return this._promisify(this._tx('neurons', 'readonly').getAll());
    },

    // Signals
    async saveSignal(signal) {
        const store = this._tx('signals', 'readwrite');
        await this._promisify(store.add(signal));
        // Trim old signals
        const count = await this._promisify(store.count());
        if (count > ORACLE_CONFIG.MAX_SIGNALS_STORED) {
            const cursor = store.index('timestamp').openCursor();
            let toDelete = count - ORACLE_CONFIG.MAX_SIGNALS_STORED;
            cursor.onsuccess = (e) => {
                const c = e.target.result;
                if (c && toDelete > 0) {
                    c.delete();
                    toDelete--;
                    c.continue();
                }
            };
        }
    },

    async getRecentSignals(limit = 100) {
        return new Promise((resolve, reject) => {
            const results = [];
            const store = this._tx('signals', 'readonly');
            const request = store.index('timestamp').openCursor(null, 'prev');
            request.onsuccess = (e) => {
                const cursor = e.target.result;
                if (cursor && results.length < limit) {
                    results.push(cursor.value);
                    cursor.continue();
                } else {
                    resolve(results.reverse());
                }
            };
            request.onerror = () => reject(request.error);
        });
    },

    async getSignalsByDomain(domain, limit = 50) {
        return new Promise((resolve, reject) => {
            const results = [];
            const store = this._tx('signals', 'readonly');
            const request = store.index('domain').openCursor(IDBKeyRange.only(domain), 'prev');
            request.onsuccess = (e) => {
                const cursor = e.target.result;
                if (cursor && results.length < limit) {
                    results.push(cursor.value);
                    cursor.continue();
                } else {
                    resolve(results.reverse());
                }
            };
            request.onerror = () => reject(request.error);
        });
    },

    // Stability
    async saveStabilityPoint(point) {
        const store = this._tx('stability', 'readwrite');
        await this._promisify(store.add(point));
        const count = await this._promisify(store.count());
        if (count > ORACLE_CONFIG.MAX_STABILITY_POINTS) {
            const cursor = store.index('timestamp').openCursor();
            let toDelete = count - ORACLE_CONFIG.MAX_STABILITY_POINTS;
            cursor.onsuccess = (e) => {
                const c = e.target.result;
                if (c && toDelete > 0) {
                    c.delete();
                    toDelete--;
                    c.continue();
                }
            };
        }
    },

    async getStabilityHistory(limit = 100) {
        return new Promise((resolve, reject) => {
            const results = [];
            const store = this._tx('stability', 'readonly');
            const request = store.index('timestamp').openCursor(null, 'prev');
            request.onsuccess = (e) => {
                const cursor = e.target.result;
                if (cursor && results.length < limit) {
                    results.push(cursor.value);
                    cursor.continue();
                } else {
                    resolve(results.reverse());
                }
            };
            request.onerror = () => reject(request.error);
        });
    },

    // Diagnoses
    async saveDiagnosis(diag) {
        return this._promisify(this._tx('diagnoses', 'readwrite').add(diag));
    },

    async getRecentDiagnoses(limit = 10) {
        return new Promise((resolve, reject) => {
            const results = [];
            const store = this._tx('diagnoses', 'readonly');
            const request = store.index('timestamp').openCursor(null, 'prev');
            request.onsuccess = (e) => {
                const cursor = e.target.result;
                if (cursor && results.length < limit) {
                    results.push(cursor.value);
                    cursor.continue();
                } else {
                    resolve(results.reverse());
                }
            };
            request.onerror = () => reject(request.error);
        });
    }
};


// ============================================================
// SECTION 3: TEXT ANALYZER
// ============================================================

const TextAnalyzer = {
    _tokenize(text) {
        return text.toLowerCase().replace(/[^a-z\s-]/g, '').split(/\s+/).filter(w => w.length > 2);
    },

    analyzeUrgency(text) {
        const tokens = this._tokenize(text);
        let score = 0;
        let hits = 0;
        for (const token of tokens) {
            if (URGENCY_LEXICON.critical.includes(token)) { score += 0.95; hits++; }
            else if (URGENCY_LEXICON.high.includes(token)) { score += 0.7; hits++; }
            else if (URGENCY_LEXICON.medium.includes(token)) { score += 0.4; hits++; }
            else if (URGENCY_LEXICON.low.includes(token)) { score += 0.1; hits++; }
        }
        return hits > 0 ? Math.min(1.0, score / hits) : 0.2;
    },

    analyzeSentiment(text) {
        const tokens = this._tokenize(text);
        let neg = 0, pos = 0;
        for (const token of tokens) {
            if (SENTIMENT_NEGATIVE.includes(token)) neg++;
            if (SENTIMENT_POSITIVE.includes(token)) pos++;
        }
        const total = neg + pos;
        if (total === 0) return 0;
        return (pos - neg) / total; // Range: -1 to +1
    },

    extractKeywords(text) {
        const tokens = this._tokenize(text);
        const allWords = [
            ...URGENCY_LEXICON.critical, ...URGENCY_LEXICON.high,
            ...URGENCY_LEXICON.medium, ...URGENCY_LEXICON.low,
            ...SENTIMENT_NEGATIVE, ...SENTIMENT_POSITIVE
        ];
        return [...new Set(tokens.filter(t => allWords.includes(t)))];
    }
};


// ============================================================
// SECTION 4: SENSORY MESH (Level 1)
// ============================================================

const SensoryMesh = {
    neurons: [],

    async init() {
        const stored = await OracleMemory.getAllNeurons();
        if (stored.length === 0) {
            // First run: initialize from defaults
            for (const def of DEFAULT_NEURONS) {
                const neuron = {
                    ...def,
                    reliability: 0.7,
                    weight: def.basePriority * 0.7,
                    noise: 0.2,
                    latency: 0,
                    lastFired: 0,
                    fireCount: 0,
                    failCount: 0,
                    status: 'idle'
                };
                await OracleMemory.saveNeuron(neuron);
                this.neurons.push(neuron);
            }
        } else {
            this.neurons = stored;
        }
    },

    async fireNeuron(neuronId) {
        const neuron = this.neurons.find(n => n.id === neuronId);
        if (!neuron) return null;

        neuron.status = 'firing';
        const startTime = Date.now();

        try {
            let items = [];
            if (neuron.type === 'rss') {
                items = await this._fetchRSS(neuron.url);
            } else if (neuron.type === 'api-json') {
                items = await this._fetchJSON(neuron);
            }

            const fetchTime = Date.now() - startTime;
            neuron.latency = neuron.latency * 0.8 + fetchTime * 0.2;
            neuron.fireCount++;
            neuron.lastFired = Date.now();
            neuron.status = 'active';

            // Analyze each item
            const analyzed = items.map(item => ({
                title: item.title,
                urgency: TextAnalyzer.analyzeUrgency(item.title + ' ' + (item.description || '')),
                sentiment: TextAnalyzer.analyzeSentiment(item.title + ' ' + (item.description || '')),
                keywords: TextAnalyzer.extractKeywords(item.title + ' ' + (item.description || '')),
                pubDate: item.pubDate || null
            }));

            // Aggregate signal
            const signal = {
                neuronId: neuron.id,
                domain: neuron.domain,
                timestamp: Date.now(),
                itemCount: analyzed.length,
                aggregate: {
                    urgency: analyzed.length > 0 ? analyzed.reduce((s, i) => s + i.urgency, 0) / analyzed.length : 0.2,
                    sentiment: analyzed.length > 0 ? analyzed.reduce((s, i) => s + i.sentiment, 0) / analyzed.length : 0,
                    volume: analyzed.length,
                    dominantKeywords: this._topKeywords(analyzed)
                },
                items: analyzed.slice(0, 5), // Store top 5 items
                meta: { fetchTime, success: true }
            };

            // Bayesian weight update: successful fetch = move toward higher reliability
            this._updateReliability(neuron, true);
            await OracleMemory.saveNeuron(neuron);

            return signal;

        } catch (err) {
            neuron.failCount++;
            neuron.status = 'error';
            neuron.latency = neuron.latency * 0.8 + (Date.now() - startTime) * 0.2;
            this._updateReliability(neuron, false);
            await OracleMemory.saveNeuron(neuron);

            return {
                neuronId: neuron.id,
                domain: neuron.domain,
                timestamp: Date.now(),
                itemCount: 0,
                aggregate: { urgency: 0, sentiment: 0, volume: 0, dominantKeywords: [] },
                items: [],
                meta: { fetchTime: Date.now() - startTime, success: false, error: err.message }
            };
        }
    },

    async fireAll() {
        const promises = this.neurons.map(n => this.fireNeuron(n.id));
        const signals = await Promise.allSettled(promises);
        return signals
            .filter(r => r.status === 'fulfilled' && r.value)
            .map(r => r.value);
    },

    _updateReliability(neuron, success) {
        const alpha = ORACLE_CONFIG.NEURON_ALPHA;
        const target = success ? 1.0 : 0.0;
        neuron.reliability = neuron.reliability * (1 - alpha) + target * alpha;
        neuron.reliability = Math.max(0.05, Math.min(0.99, neuron.reliability));
        neuron.weight = neuron.reliability * neuron.basePriority;
    },

    async _fetchRSS(url) {
        const proxyUrl = ORACLE_CONFIG.CORS_PROXY + encodeURIComponent(url);
        const response = await fetch(proxyUrl, { signal: AbortSignal.timeout(15000) });
        const data = await response.json();

        if (!data.contents) throw new Error('Empty proxy response');

        const parser = new DOMParser();
        const doc = parser.parseFromString(data.contents, 'text/xml');
        const parseError = doc.querySelector('parsererror');
        if (parseError) throw new Error('XML parse error');

        const items = [];
        const entries = doc.querySelectorAll('item, entry');
        entries.forEach(entry => {
            const title = entry.querySelector('title');
            const desc = entry.querySelector('description, summary, content');
            const pubDate = entry.querySelector('pubDate, published, updated');
            if (title) {
                items.push({
                    title: title.textContent.trim(),
                    description: desc ? desc.textContent.replace(/<[^>]*>/g, '').trim().slice(0, 200) : '',
                    pubDate: pubDate ? pubDate.textContent.trim() : null
                });
            }
        });
        return items;
    },

    async _fetchJSON(neuron) {
        // USGS and similar CORS-enabled APIs
        const response = await fetch(neuron.url, { signal: AbortSignal.timeout(15000) });
        const data = await response.json();

        if (neuron.id === 'usgs-quakes' && data.features) {
            return data.features.map(f => {
                const p = f.properties;
                const mag = p.mag || 0;
                return {
                    title: p.title || `M${mag} Earthquake`,
                    description: `Magnitude ${mag} - ${p.place || 'Unknown'} - Alert: ${p.alert || 'none'}`,
                    pubDate: p.time ? new Date(p.time).toISOString() : null
                };
            });
        }

        return [];
    },

    _topKeywords(analyzed) {
        const freq = {};
        for (const item of analyzed) {
            for (const kw of item.keywords) {
                freq[kw] = (freq[kw] || 0) + 1;
            }
        }
        return Object.entries(freq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(e => e[0]);
    }
};


// ============================================================
// SECTION 5: SYNAPTIC ENGINE (Level 2)
// ============================================================

const SynapticEngine = {

    // Detect simultaneous shocks: multiple domains elevated in same scan
    detectShocks(signals) {
        const domainUrgency = {};
        for (const sig of signals) {
            if (sig.meta.success && sig.aggregate.urgency > 0) {
                if (!domainUrgency[sig.domain] || sig.aggregate.urgency > domainUrgency[sig.domain]) {
                    domainUrgency[sig.domain] = sig.aggregate.urgency;
                }
            }
        }
        const elevated = Object.entries(domainUrgency).filter(([, u]) => u > 0.5);
        const shockCount = elevated.length;
        const totalDomains = Object.keys(domainUrgency).length;
        return {
            count: shockCount,
            total: totalDomains,
            factor: totalDomains > 0 ? shockCount / totalDomains : 0,
            domains: elevated.map(([d]) => d)
        };
    },

    // Detect rhythm acceleration: signal frequency increasing
    detectAcceleration(history) {
        if (history.length < 10) return { rate: 0, accelerating: false };

        const mid = Math.floor(history.length / 2);
        const firstHalf = history.slice(0, mid);
        const secondHalf = history.slice(mid);

        // Average urgency in each half
        const avgFirst = firstHalf.reduce((s, h) => s + (h.aggregate ? h.aggregate.urgency : 0), 0) / firstHalf.length;
        const avgSecond = secondHalf.reduce((s, h) => s + (h.aggregate ? h.aggregate.urgency : 0), 0) / secondHalf.length;

        const rate = avgSecond - avgFirst;
        return {
            rate: Math.round(rate * 1000) / 1000,
            accelerating: rate > 0.05,
            avgRecent: Math.round(avgSecond * 100) / 100,
            avgPrior: Math.round(avgFirst * 100) / 100
        };
    },

    // Detect linguistic polarization: sentiment variance across sources
    detectPolarization(signals) {
        const sentiments = signals
            .filter(s => s.meta.success && s.aggregate.volume > 0)
            .map(s => s.aggregate.sentiment);

        if (sentiments.length < 2) return { variance: 0, polarized: false };

        const mean = sentiments.reduce((s, v) => s + v, 0) / sentiments.length;
        const variance = sentiments.reduce((s, v) => s + (v - mean) ** 2, 0) / sentiments.length;

        return {
            variance: Math.round(variance * 1000) / 1000,
            polarized: variance > 0.15,
            spread: Math.round((Math.max(...sentiments) - Math.min(...sentiments)) * 100) / 100,
            mean: Math.round(mean * 100) / 100
        };
    },

    // Detect cross-domain correlation: normally uncorrelated domains moving together
    detectCrossCorrelation(signals, history) {
        const domains = [...new Set(signals.map(s => s.domain))];
        if (domains.length < 2) return { correlation: 0, correlated: false, pairs: [] };

        // Get current urgency per domain
        const currentByDomain = {};
        for (const sig of signals) {
            if (sig.meta.success) {
                if (!currentByDomain[sig.domain]) currentByDomain[sig.domain] = [];
                currentByDomain[sig.domain].push(sig.aggregate.urgency);
            }
        }

        // Average per domain
        const domainAvgs = {};
        for (const [d, vals] of Object.entries(currentByDomain)) {
            domainAvgs[d] = vals.reduce((s, v) => s + v, 0) / vals.length;
        }

        // Check if multiple domains are simultaneously elevated
        const elevatedDomains = Object.entries(domainAvgs)
            .filter(([, avg]) => avg > 0.5)
            .map(([d]) => d);

        const correlationFactor = domains.length > 0
            ? elevatedDomains.length / domains.length
            : 0;

        // Identify correlated pairs
        const pairs = [];
        for (let i = 0; i < elevatedDomains.length; i++) {
            for (let j = i + 1; j < elevatedDomains.length; j++) {
                pairs.push([elevatedDomains[i], elevatedDomains[j]]);
            }
        }

        return {
            correlation: Math.round(correlationFactor * 100) / 100,
            correlated: correlationFactor > 0.5,
            pairs,
            elevatedDomains
        };
    },

    // Compress all signals into a PatternTensor
    compress(signals, history) {
        return {
            shocks: this.detectShocks(signals),
            acceleration: this.detectAcceleration(history),
            polarization: this.detectPolarization(signals),
            crossCorrelation: this.detectCrossCorrelation(signals, history),
            timestamp: Date.now(),
            signalCount: signals.length,
            activeNeurons: signals.filter(s => s.meta.success).length
        };
    }
};


// ============================================================
// SECTION 6: CORTICAL FIELD (Level 3)
// ============================================================

const CorticalField = {

    // Calculate the Stability Field: composite metric [0, 1]
    calculateStability(patterns, signals) {
        // Base stability from domain-level urgency (inverted: high urgency = low stability)
        const validSignals = signals.filter(s => s.meta.success && s.aggregate.volume > 0);
        if (validSignals.length === 0) return 0.75; // Default: moderately stable

        const weightedUrgency = validSignals.reduce((sum, s) => {
            const neuron = SensoryMesh.neurons.find(n => n.id === s.neuronId);
            const w = neuron ? neuron.weight : 0.5;
            return sum + s.aggregate.urgency * w;
        }, 0);
        const totalWeight = validSignals.reduce((sum, s) => {
            const neuron = SensoryMesh.neurons.find(n => n.id === s.neuronId);
            return sum + (neuron ? neuron.weight : 0.5);
        }, 0);

        const baseInstability = totalWeight > 0 ? weightedUrgency / totalWeight : 0.3;

        // Synaptic modifiers
        const shockFactor = Math.min(1, patterns.shocks.factor * 1.5);
        const accFactor = patterns.acceleration.accelerating ? Math.min(1, Math.abs(patterns.acceleration.rate) * 3) : 0;
        const polFactor = Math.min(1, patterns.polarization.variance * 3);
        const corrFactor = Math.min(1, patterns.crossCorrelation.correlation * 1.2);

        // Composite stability
        const instability = baseInstability * 0.4 +
                           shockFactor * 0.2 +
                           accFactor * 0.15 +
                           polFactor * 0.1 +
                           corrFactor * 0.15;

        return Math.max(0, Math.min(1, 1 - instability));
    },

    // Calculate delta from EMA
    calculateDelta(current, history) {
        if (history.length < 2) return 0;
        const window = Math.min(10, history.length);
        const recent = history.slice(-window);
        const ema = recent.reduce((s, h) => s + h.stability, 0) / recent.length;
        return Math.round((current - ema) * 10000) / 10000;
    },

    // Generate scenario probabilities
    generateScenarios(stability, delta, patterns) {
        const sf = patterns.shocks.factor;
        const af = patterns.acceleration.accelerating ? Math.abs(patterns.acceleration.rate) : 0;
        const pf = patterns.polarization.variance;
        const cf = patterns.crossCorrelation.correlation;

        // Raw scenario weights (unnormalized)
        let softEsc = Math.max(0.01, Math.max(0, -delta) * 3 * (1 - sf) + 0.1);
        let regional = Math.max(0.01, sf * 2 + cf * 1.5 + 0.05);
        let absorption = Math.max(0.01, stability * 1.5 * (1 - af * 2) + 0.1);
        let falseAlarm = Math.max(0.01, (1 - pf) * (1 - cf) * 0.8 + 0.05);

        // Normalize to sum = 1
        const total = softEsc + regional + absorption + falseAlarm;
        softEsc /= total;
        regional /= total;
        absorption /= total;
        falseAlarm /= total;

        const probs = [softEsc, regional, absorption, falseAlarm];
        const entropy = this._entropy(probs);

        return {
            softEscalation: {
                probability: Math.round(softEsc * 100) / 100,
                confidence: Math.round((1 - entropy) * 100) / 100,
                entropy: Math.round(entropy * 100) / 100,
                drivers: delta < 0 ? ['declining_stability', 'gradual_erosion'] : ['low_pressure']
            },
            regionalCascade: {
                probability: Math.round(regional * 100) / 100,
                confidence: Math.round((1 - entropy) * 100) / 100,
                entropy: Math.round(entropy * 100) / 100,
                drivers: patterns.shocks.domains.length > 0
                    ? patterns.shocks.domains
                    : ['cross_domain_pressure']
            },
            absorption: {
                probability: Math.round(absorption * 100) / 100,
                confidence: Math.round((1 - entropy) * 100) / 100,
                entropy: Math.round(entropy * 100) / 100,
                drivers: stability > 0.6 ? ['system_resilience', 'buffer_capacity'] : ['inertia']
            },
            falseAlarm: {
                probability: Math.round(falseAlarm * 100) / 100,
                confidence: Math.round((1 - entropy) * 100) / 100,
                entropy: Math.round(entropy * 100) / 100,
                drivers: ['noise_dominant', 'uncorrelated_signals']
            }
        };
    },

    _entropy(probs) {
        const log2 = Math.log2;
        const n = probs.length;
        let h = 0;
        for (const p of probs) {
            if (p > 0) h -= p * log2(p);
        }
        return h / log2(n); // Normalized [0, 1]
    }
};


// ============================================================
// SECTION 7: AUTO-DIAGNOSIS
// ============================================================

const AutoDiagnosis = {

    diagnose(patterns, stability, previousStability, signals) {
        const delta = stability - previousStability;
        const direction = delta < -0.05 ? 'deteriorating' : delta > 0.05 ? 'improving' : 'stable';

        // Identify dominant drivers (what contributed most to current state)
        const drivers = [];
        if (patterns.shocks.factor > 0.4) drivers.push({ type: 'simultaneous_shocks', impact: patterns.shocks.factor, domains: patterns.shocks.domains });
        if (patterns.acceleration.accelerating) drivers.push({ type: 'rhythm_acceleration', impact: Math.abs(patterns.acceleration.rate) });
        if (patterns.polarization.polarized) drivers.push({ type: 'linguistic_polarization', impact: patterns.polarization.variance });
        if (patterns.crossCorrelation.correlated) drivers.push({ type: 'cross_domain_correlation', impact: patterns.crossCorrelation.correlation, pairs: patterns.crossCorrelation.pairs });

        // Identify potentially ignored signals (low-weight neurons with high urgency)
        const ignored = signals
            .filter(s => {
                const n = SensoryMesh.neurons.find(n2 => n2.id === s.neuronId);
                return s.meta.success && s.aggregate.urgency > 0.6 && n && n.weight < 0.5;
            })
            .map(s => ({ neuronId: s.neuronId, domain: s.domain, urgency: s.aggregate.urgency }));

        // Identify overestimated signals (high-weight neurons with low urgency dominating)
        const overestimated = signals
            .filter(s => {
                const n = SensoryMesh.neurons.find(n2 => n2.id === s.neuronId);
                return s.meta.success && s.aggregate.urgency < 0.3 && n && n.weight > 0.7;
            })
            .map(s => ({ neuronId: s.neuronId, domain: s.domain, urgency: s.aggregate.urgency }));

        // All dominant keywords across signals
        const allKeywords = signals
            .filter(s => s.meta.success)
            .flatMap(s => s.aggregate.dominantKeywords);
        const keywordFreq = {};
        for (const kw of allKeywords) {
            keywordFreq[kw] = (keywordFreq[kw] || 0) + 1;
        }
        const topKeywords = Object.entries(keywordFreq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([kw, count]) => ({ keyword: kw, count }));

        return {
            timestamp: Date.now(),
            stability,
            delta: Math.round(delta * 10000) / 10000,
            direction,
            drivers,
            ignored,
            overestimated,
            topKeywords,
            activeNeurons: signals.filter(s => s.meta.success).length,
            totalNeurons: signals.length
        };
    }
};


// ============================================================
// SECTION 8: ORCHESTRATOR
// ============================================================

const OracleEngine = {
    state: {
        stability: 0.75,
        delta: 0,
        patterns: null,
        scenarios: null,
        diagnosis: null,
        signals: [],
        lastScan: null,
        scanCount: 0,
        initialized: false,
        scanning: false
    },

    listeners: [],

    async init() {
        try {
            await OracleMemory.init();
            await SensoryMesh.init();

            // Restore last stability from history
            const history = await OracleMemory.getStabilityHistory(1);
            if (history.length > 0) {
                this.state.stability = history[0].stability;
            }

            // Restore scan count
            const allStability = await OracleMemory.getStabilityHistory(9999);
            this.state.scanCount = allStability.length;

            this.state.initialized = true;
            this._notify('init');
            return true;
        } catch (err) {
            console.error('[OracleEngine] Init failed:', err);
            this.state.initialized = false;
            return false;
        }
    },

    async scan() {
        if (this.state.scanning) return this.state;
        this.state.scanning = true;
        this._notify('scan-start');

        try {
            const previousStability = this.state.stability;

            // Level 1: Fire all neurons (Sensory Mesh)
            const signals = await SensoryMesh.fireAll();
            this.state.signals = signals;

            // Save signals to memory
            for (const sig of signals) {
                if (sig.meta.success) {
                    await OracleMemory.saveSignal(sig);
                }
            }

            // Get signal history for pattern detection
            const history = await OracleMemory.getRecentSignals(100);

            // Level 2: Compress signals (Synaptic Engine)
            const patterns = SynapticEngine.compress(signals, history);
            this.state.patterns = patterns;

            // Level 3: Calculate Stability Field (Cortical Field)
            const stability = CorticalField.calculateStability(patterns, signals);
            const stabilityHistory = await OracleMemory.getStabilityHistory(50);
            const delta = CorticalField.calculateDelta(stability, stabilityHistory);
            const scenarios = CorticalField.generateScenarios(stability, delta, patterns);

            this.state.stability = stability;
            this.state.delta = delta;
            this.state.scenarios = scenarios;

            // Save stability point
            await OracleMemory.saveStabilityPoint({
                timestamp: Date.now(),
                stability,
                delta,
                patterns: {
                    shockFactor: patterns.shocks.factor,
                    acceleration: patterns.acceleration.rate,
                    polarization: patterns.polarization.variance,
                    correlation: patterns.crossCorrelation.correlation
                }
            });

            // Auto-Diagnosis
            const diagnosis = AutoDiagnosis.diagnose(patterns, stability, previousStability, signals);
            this.state.diagnosis = diagnosis;
            await OracleMemory.saveDiagnosis(diagnosis);

            this.state.lastScan = Date.now();
            this.state.scanCount++;
            this.state.scanning = false;

            this._notify('scan-complete');
            return this.state;

        } catch (err) {
            console.error('[OracleEngine] Scan failed:', err);
            this.state.scanning = false;
            this._notify('scan-error', err.message);
            return this.state;
        }
    },

    async getStabilityHistory(limit = 50) {
        return OracleMemory.getStabilityHistory(limit);
    },

    async getRecentDiagnoses(limit = 5) {
        return OracleMemory.getRecentDiagnoses(limit);
    },

    onUpdate(callback) {
        this.listeners.push(callback);
    },

    _notify(event, data) {
        for (const cb of this.listeners) {
            try { cb(event, this.state, data); } catch (e) { /* listener error */ }
        }
    },

    // Start auto-scan cycle
    startAutoScan(interval) {
        this._autoScanInterval = setInterval(() => this.scan(), interval || ORACLE_CONFIG.SCAN_INTERVAL);
    },

    stopAutoScan() {
        if (this._autoScanInterval) {
            clearInterval(this._autoScanInterval);
            this._autoScanInterval = null;
        }
    }
};
