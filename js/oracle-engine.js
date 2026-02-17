// ====================================================================
// ORACLE ENGINE v4.2 — Synthetic Earth + Reality Tether
// Intelligenza a Tre Livelli: Sensoriale → Sinaptico → Corticale
// + Strato 2: Monte Carlo · Lyapunov · Adaptive Coupling
// + Metabolismo della Credibilità: Calibration Engine
// Browser-Nativo · Memoria Locale · Zero Cloud
// ====================================================================
// La rivoluzione è il browser e la memoria locale.
// Questo motore sviluppa memoria, sensibilità e istinto.
// Non predice eventi. Misura tensione strutturale.
// E ora: misura SE STESSO. Auto-sospetto empirico.
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
    DB_VERSION: 3,
    CALIBRATION_EVAL_WINDOW: 6,   // Scans before evaluating a prediction
    CALIBRATION_ALPHA: 0.15,      // EMA learning rate for credibility
    MAX_CALIBRATIONS: 500,
    MAX_STATEGRAPH_NODES: 2000,
    MAX_SCENARIOS: 500,
    TRUST_SKILL_ALPHA: 0.15,      // EMA for skill score
    TRUST_ATTENUATION_MID: 0.4,   // Sigmoid midpoint for auto-attenuation

    // Darwin Engine — evolutionary parameters
    DARWIN_TRIGGER_EPOCHS: 5,     // Consecutive low-trust epochs before mutation
    DARWIN_TRUST_THRESHOLD: 0.4,  // TrustWeight below this = underperforming
    DARWIN_COMPETITION_EPOCHS: 8, // Epochs to run before judging mutant
    DARWIN_MAX_ACTIVE_MUTANTS: 2, // Max simultaneous competing branches
    DARWIN_MUTATION_RANGE: 0.30   // Max % deviation for parametric mutations
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
                // v2: Calibration store for reality tether
                if (!db.objectStoreNames.contains('calibration')) {
                    const cs = db.createObjectStore('calibration', { keyPath: 'id', autoIncrement: true });
                    cs.createIndex('timestamp', 'timestamp', { unique: false });
                    cs.createIndex('scanIndex', 'scanIndex', { unique: false });
                }
                // v3: Memory Graph + Scenario Registry
                if (!db.objectStoreNames.contains('stategraph')) {
                    const sg = db.createObjectStore('stategraph', { keyPath: 'id', autoIncrement: true });
                    sg.createIndex('timestamp', 'timestamp', { unique: false });
                    sg.createIndex('scanIndex', 'scanIndex', { unique: false });
                    sg.createIndex('regime', 'regime', { unique: false });
                }
                if (!db.objectStoreNames.contains('scenarios')) {
                    const sc = db.createObjectStore('scenarios', { keyPath: 'scenarioId' });
                    sc.createIndex('timestamp', 'timestamp', { unique: false });
                    sc.createIndex('active', 'active', { unique: false });
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
    },

    // Calibration (Reality Tether)
    async saveCalibration(record) {
        const store = this._tx('calibration', 'readwrite');
        const result = await this._promisify(store.add(record));
        // Trim old calibrations
        const count = await this._promisify(this._tx('calibration', 'readonly').count());
        if (count > ORACLE_CONFIG.MAX_CALIBRATIONS) {
            const trimStore = this._tx('calibration', 'readwrite');
            const cursor = trimStore.index('timestamp').openCursor();
            let toDelete = count - ORACLE_CONFIG.MAX_CALIBRATIONS;
            cursor.onsuccess = (e) => {
                const c = e.target.result;
                if (c && toDelete > 0) {
                    c.delete();
                    toDelete--;
                    c.continue();
                }
            };
        }
        return result;
    },

    async updateCalibration(record) {
        return this._promisify(this._tx('calibration', 'readwrite').put(record));
    },

    async getAllCalibrations() {
        return this._promisify(this._tx('calibration', 'readonly').getAll());
    },

    async getRecentCalibrations(limit = 20) {
        return new Promise((resolve, reject) => {
            const results = [];
            const store = this._tx('calibration', 'readonly');
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

    // State Graph
    async saveStateNode(node) {
        const store = this._tx('stategraph', 'readwrite');
        const result = await this._promisify(store.add(node));
        // Trim
        const count = await this._promisify(this._tx('stategraph', 'readonly').count());
        if (count > ORACLE_CONFIG.MAX_STATEGRAPH_NODES) {
            const trimStore = this._tx('stategraph', 'readwrite');
            const cursor = trimStore.index('timestamp').openCursor();
            let toDelete = count - ORACLE_CONFIG.MAX_STATEGRAPH_NODES;
            cursor.onsuccess = (e) => {
                const c = e.target.result;
                if (c && toDelete > 0) { c.delete(); toDelete--; c.continue(); }
            };
        }
        return result;
    },

    async getRecentStateNodes(limit = 50) {
        return new Promise((resolve, reject) => {
            const results = [];
            const store = this._tx('stategraph', 'readonly');
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

    async getStateNodesByRegime(regime, limit = 50) {
        return new Promise((resolve, reject) => {
            const results = [];
            const store = this._tx('stategraph', 'readonly');
            const request = store.index('regime').openCursor(IDBKeyRange.only(regime), 'prev');
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

    // Scenario Registry
    async saveScenario(scenario) {
        return this._promisify(this._tx('scenarios', 'readwrite').put(scenario));
    },

    async getScenario(scenarioId) {
        return this._promisify(this._tx('scenarios', 'readonly').get(scenarioId));
    },

    async getAllScenarios() {
        return this._promisify(this._tx('scenarios', 'readonly').getAll());
    },

    async getActiveScenario() {
        return new Promise((resolve, reject) => {
            const store = this._tx('scenarios', 'readonly');
            const request = store.index('active').openCursor(IDBKeyRange.only(1));
            request.onsuccess = (e) => {
                const cursor = e.target.result;
                resolve(cursor ? cursor.value : null);
            };
            request.onerror = () => reject(request.error);
        });
    },

    // ============================================================
    // STORAGE COMPACTION — Quest 2 IndexedDB survival
    // ============================================================
    // Quest 2 has unpredictable eviction. This compactor enforces
    // hard limits per store by deleting oldest records first.
    // Called automatically after each scan if storage pressure high.
    // ============================================================

    async compact(limits) {
        const stores = [
            { name: 'signals',     max: limits.signals     || ORACLE_CONFIG.MAX_SIGNALS_STORED },
            { name: 'stability',   max: limits.stability   || ORACLE_CONFIG.MAX_STABILITY_POINTS },
            { name: 'calibration', max: limits.calibration || ORACLE_CONFIG.MAX_CALIBRATIONS },
            { name: 'diagnoses',   max: limits.diagnoses   || ORACLE_CONFIG.MAX_DIAGNOSES },
            { name: 'stategraph', max: limits.stategraph  || ORACLE_CONFIG.MAX_STATEGRAPH_NODES },
            { name: 'scenarios',  max: limits.scenarios   || ORACLE_CONFIG.MAX_SCENARIOS }
        ];

        const results = {};

        for (const { name, max } of stores) {
            try {
                const count = await this._promisify(this._tx(name, 'readonly').count());
                if (count <= max) {
                    results[name] = { before: count, deleted: 0 };
                    continue;
                }

                const toDelete = count - max;
                let deleted = 0;

                await new Promise((resolve, reject) => {
                    const store = this._tx(name, 'readwrite');
                    const cursor = store.index('timestamp').openCursor();
                    cursor.onsuccess = (e) => {
                        const c = e.target.result;
                        if (c && deleted < toDelete) {
                            c.delete();
                            deleted++;
                            c.continue();
                        } else {
                            resolve();
                        }
                    };
                    cursor.onerror = () => reject(cursor.error);
                });

                results[name] = { before: count, deleted };
                console.log('[OracleMemory] Compacted ' + name + ': deleted ' + deleted + ' of ' + count);
            } catch (err) {
                results[name] = { error: err.message };
            }
        }

        return results;
    },

    async estimateStorage() {
        if (navigator.storage && navigator.storage.estimate) {
            const est = await navigator.storage.estimate();
            return {
                usageMB: Math.round(est.usage / 1024 / 1024 * 10) / 10,
                quotaMB: Math.round(est.quota / 1024 / 1024),
                percent: Math.round(est.usage / est.quota * 100)
            };
        }
        return null;
    },

    async requestPersistence() {
        if (navigator.storage && navigator.storage.persist) {
            const granted = await navigator.storage.persist();
            console.log('[OracleMemory] Persistent storage: ' + (granted ? 'granted' : 'denied'));
            return granted;
        }
        return false;
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
// SECTION 8: CALIBRATION ENGINE (Reality Tether)
// ============================================================
// Il metabolismo della credibilità.
//
// ORACLE non può fidarsi di sé stesso.
// Tre indicatori (Sarle, catastrophic, Lyapunov) guardano la
// stessa macchina simulata. Servono TRE COSE DIVERSE:
//
// 1. Prediction Storage: ogni simulazione viene registrata
// 2. Retrospective Evaluation: dopo N scan, confrontiamo
//    la previsione con ciò che è accaduto nel Campo Reale
// 3. Credibility Score: rolling EMA della precisione storica
//
// Quando il modello grida "instabilità", il mondo reale
// mostra davvero aumento di volatilità cross-domain?
//
// Questo non è validazione. È auto-sospetto.
// La differenza tra un oracolo e un ciarlatano è il track record.
// ============================================================

const CalibrationEngine = {
    credibility: 0.5,    // [0, 1] — starts at 0.5 (unknown, agnostic)
    evaluatedCount: 0,
    hitCount: 0,
    lastEvaluation: null,

    // Store a prediction after each simulation completes
    async storePrediction(dsi, realStability, preset, couplingMeta) {
        const record = {
            timestamp: Date.now(),
            scanIndex: OracleEngine.state.scanCount,
            prediction: {
                dsi: dsi.dsi,
                catastrophicFraction: dsi.catastrophicFraction,
                bimodality: dsi.bimodality,
                lyapunovLambda: dsi.lyapunov ? dsi.lyapunov.lambda : 0,
                lyapunovRegime: dsi.lyapunov ? dsi.lyapunov.regime : 'unknown',
                mean: dsi.mean,
                std: dsi.std
            },
            realState: {
                stability: realStability
            },
            preset: preset || 'montecarlo',
            couplingAdapted: couplingMeta ? couplingMeta.adapted : false,
            evaluated: false,
            outcome: null
        };

        try {
            await OracleMemory.saveCalibration(record);
        } catch (err) {
            console.warn('[CalibrationEngine] Failed to store prediction:', err);
        }
    },

    // Evaluate predictions that have aged past the evaluation window
    async evaluatePendingPredictions() {
        const EVAL_WINDOW = ORACLE_CONFIG.CALIBRATION_EVAL_WINDOW;
        const currentScanCount = OracleEngine.state.scanCount;

        let allRecords;
        try {
            allRecords = await OracleMemory.getAllCalibrations();
        } catch (err) {
            console.warn('[CalibrationEngine] Failed to load calibrations:', err);
            return;
        }

        const pending = allRecords.filter(r => !r.evaluated);
        if (pending.length === 0) return;

        const stabilityHistory = await OracleMemory.getStabilityHistory(200);
        if (stabilityHistory.length < EVAL_WINDOW) return;

        let anyEvaluated = false;

        for (const record of pending) {
            const scansElapsed = currentScanCount - record.scanIndex;
            if (scansElapsed < EVAL_WINDOW) continue;

            // Find stability points recorded AFTER this prediction
            const afterPoints = stabilityHistory.filter(p => p.timestamp > record.timestamp);
            if (afterPoints.length < 3) continue;

            // Take up to EVAL_WINDOW points for evaluation
            const evalPoints = afterPoints.slice(0, EVAL_WINDOW);
            const observedStabilities = evalPoints.map(p => p.stability);

            // Compute observed metrics
            const n = observedStabilities.length;
            const observedMean = observedStabilities.reduce((s, v) => s + v, 0) / n;
            const observedMin = Math.min(...observedStabilities);
            const observedMax = Math.max(...observedStabilities);
            const observedStd = Math.sqrt(
                observedStabilities.reduce((s, v) => s + (v - observedMean) ** 2, 0) / n
            );
            const observedDelta = observedStabilities[n - 1] - record.realState.stability;
            const observedBelowCritical = observedStabilities.filter(
                s => s < ORACLE_CONFIG.CRITICAL_THRESHOLD
            ).length / n;

            // ---- SCORE COMPONENTS ----

            // 1. Directional accuracy (40%)
            // Low DSI predicts decline or high vulnerability.
            // Did stability actually decline?
            const predictedDecline = record.prediction.dsi < 0.5;
            const actualDecline = observedDelta < -0.02;
            const predictedStable = record.prediction.dsi >= 0.5;
            const actualStable = observedDelta >= -0.02;
            const directionCorrect = (predictedDecline && actualDecline) ||
                                     (predictedStable && actualStable) ? 1 : 0;

            // 2. Catastrophic calibration (35%)
            // Predicted catastrophic fraction vs observed fraction below critical
            const catError = Math.abs(record.prediction.catastrophicFraction - observedBelowCritical);
            const catScore = Math.max(0, 1 - catError * 2); // 0 error → 1.0

            // 3. Volatility calibration (25%)
            // Predicted std vs observed std — measures volatility prediction
            let volScore;
            if (record.prediction.std > 0.001) {
                const volRatio = observedStd / record.prediction.std;
                volScore = Math.max(0, 1 - Math.abs(1 - volRatio));
            } else {
                volScore = observedStd < 0.05 ? 1.0 : 0.0;
            }

            // Composite accuracy
            const accuracy = directionCorrect * 0.40 + catScore * 0.35 + volScore * 0.25;

            // Update record
            record.evaluated = true;
            record.outcome = {
                observedMean: Math.round(observedMean * 1000) / 1000,
                observedMin: Math.round(observedMin * 1000) / 1000,
                observedMax: Math.round(observedMax * 1000) / 1000,
                observedStd: Math.round(observedStd * 1000) / 1000,
                observedDelta: Math.round(observedDelta * 10000) / 10000,
                observedBelowCritical: Math.round(observedBelowCritical * 1000) / 1000,
                directionCorrect,
                catScore: Math.round(catScore * 1000) / 1000,
                volScore: Math.round(volScore * 1000) / 1000,
                accuracy: Math.round(accuracy * 1000) / 1000,
                evaluatedAt: Date.now()
            };

            try {
                await OracleMemory.updateCalibration(record);
            } catch (err) {
                console.warn('[CalibrationEngine] Failed to update calibration:', err);
                continue;
            }

            // Update rolling credibility
            const alpha = ORACLE_CONFIG.CALIBRATION_ALPHA;
            this.credibility = this.credibility * (1 - alpha) + accuracy * alpha;
            this.evaluatedCount++;
            if (accuracy > 0.5) this.hitCount++;
            this.lastEvaluation = record;
            anyEvaluated = true;

            // Feed Trust Engine per-evaluation
            TrustEngine.updateSkills(record.outcome);

            console.log('[CalibrationEngine] Evaluated prediction #' + record.id +
                ': accuracy=' + accuracy.toFixed(3) +
                ' (dir=' + directionCorrect + ' cat=' + catScore.toFixed(2) +
                ' vol=' + volScore.toFixed(2) + ')' +
                ' → credibility=' + this.credibility.toFixed(3));
        }

        if (anyEvaluated) {
            OracleEngine._notify('calibration-update', this.getState());
        }
    },

    // Rebuild state from stored history on init
    async loadState() {
        try {
            const allRecords = await OracleMemory.getAllCalibrations();
            const evaluated = allRecords.filter(r => r.evaluated && r.outcome);
            this.evaluatedCount = evaluated.length;
            this.hitCount = evaluated.filter(r => r.outcome.accuracy > 0.5).length;

            if (evaluated.length > 0) {
                // Rebuild credibility from full history (chronological order)
                this.credibility = 0.5;
                const alpha = ORACLE_CONFIG.CALIBRATION_ALPHA;
                for (const record of evaluated) {
                    this.credibility = this.credibility * (1 - alpha) + record.outcome.accuracy * alpha;
                }
                this.lastEvaluation = evaluated[evaluated.length - 1];
                console.log('[CalibrationEngine] Restored: ' + evaluated.length +
                    ' evaluations, credibility=' + this.credibility.toFixed(3));
            } else {
                console.log('[CalibrationEngine] No prior evaluations. Starting agnostic (0.500).');
            }
        } catch (err) {
            console.warn('[CalibrationEngine] Failed to load state:', err);
        }
    },

    getState() {
        return {
            credibility: Math.round(this.credibility * 1000) / 1000,
            evaluated: this.evaluatedCount,
            hits: this.hitCount,
            hitRate: this.evaluatedCount > 0
                ? Math.round((this.hitCount / this.evaluatedCount) * 100)
                : null,
            lastEvaluation: this.lastEvaluation ? {
                accuracy: this.lastEvaluation.outcome.accuracy,
                dsi: this.lastEvaluation.prediction.dsi,
                observedDelta: this.lastEvaluation.outcome.observedDelta,
                directionCorrect: this.lastEvaluation.outcome.directionCorrect,
                timestamp: this.lastEvaluation.outcome.evaluatedAt
            } : null
        };
    }
};


// ============================================================
// SECTION 9: SYNTHETIC FIELD (Strato 2 — Synthetic Earth)
// ============================================================
// Monte Carlo perturbation engine: takes current state,
// simulates 1000+ futures, calculates Distance to Structural
// Instability (DSI). Runs in a Web Worker for zero UI blocking.
// ============================================================

const PERTURBATION_PRESETS = {
    montecarlo:        { name: 'MONTE CARLO',          icon: 'dice',      perturbation: null,                                                      sustained: null, description: 'Random multi-domain perturbation' },
    polarization:      { name: '+12% POLARIZZAZIONE',   icon: 'bolt',      perturbation: { social: 0.12, epistemology: 0.08 },                      sustained: null, description: 'Linguistic polarization spike' },
    economic_shock:    { name: '-8% ECONOMIA',          icon: 'chart-down', perturbation: { economics: 0.08, social: 0.04 },                        sustained: null, description: 'Economic activity contraction' },
    cross_correlation: { name: '+0.2 CROSS-DOMINIO',    icon: 'link',      perturbation: { geopolitics: 0.05, economics: 0.05, social: 0.05, technology: 0.05 }, sustained: null, description: 'Systemic cross-domain elevation' },
    media_silence:     { name: 'SILENZIO MEDIATICO',    icon: 'eye-slash', perturbation: { epistemology: 0.15, social: 0.06 },                      sustained: { epistemology: 0.005 }, description: 'Sudden information void' },
    dual_shock:        { name: 'TERREMOTO + ENERGIA',   icon: 'explosion', perturbation: { climate: 0.15, economics: 0.10, social: 0.05 },          sustained: null, description: 'Simultaneous climate-economic shock' }
};

const SyntheticField = {
    worker: null,
    simulating: false,
    lastResult: null,
    activePreset: 'montecarlo',
    adaptiveCoupling: null,       // Last computed adaptive coupling
    couplingMeta: null,           // Metadata about coupling adaptation

    init() {
        try {
            this.worker = new Worker('js/oracle-simulator.js');
            this.worker.onmessage = (event) => this._handleWorkerMessage(event);
            this.worker.onerror = (err) => {
                console.error('[SyntheticField] Worker error:', err);
                this.simulating = false;
            };
            return true;
        } catch (err) {
            console.error('[SyntheticField] Worker init failed:', err);
            return false;
        }
    },

    // Convert real-field state to domain instability vector for simulation
    _buildDomainState(signals, stability) {
        const domainMap = {};
        const DOMAINS = ['geopolitics', 'economics', 'technology', 'climate', 'social', 'epistemology'];

        // Map signal urgency to domain instability
        for (const sig of signals) {
            if (sig.meta.success && sig.aggregate.volume > 0) {
                if (!domainMap[sig.domain]) domainMap[sig.domain] = [];
                domainMap[sig.domain].push(sig.aggregate.urgency);
            }
        }

        const state = {};
        for (const d of DOMAINS) {
            if (domainMap[d] && domainMap[d].length > 0) {
                state[d] = domainMap[d].reduce((s, v) => s + v, 0) / domainMap[d].length;
            } else {
                // Default: derive from overall stability
                state[d] = 1 - stability;
            }
        }

        return state;
    },

    // ============================================================
    // ADAPTIVE COUPLING — Derived from real signal covariance
    // ============================================================
    // The coupling matrix is NOT declared from intuition alone.
    // It ADAPTS over time based on observed cross-domain co-variation
    // in the Real Field. The declared matrix provides the prior;
    // observed correlation provides the likelihood.
    // Blend: coupling = (1-α)*declared + α*observed
    // α grows with data availability (conservative learning).
    // ============================================================

    async _computeAdaptiveCoupling() {
        const DOMAINS = ['geopolitics', 'economics', 'technology', 'climate', 'social', 'epistemology'];

        // Fetch recent signal history from IndexedDB
        const signals = await OracleMemory.getRecentSignals(500);
        if (signals.length < 20) return null; // Not enough data

        // Group signals into scan windows (temporal clustering)
        // Each scan fires all neurons near-simultaneously,
        // so signals within a short gap belong to the same window.
        const windows = [];
        let currentWindow = {};
        let windowStart = 0;
        const WINDOW_GAP = 60000; // 1 minute gap = new window

        for (const sig of signals) {
            if (sig.timestamp - windowStart > WINDOW_GAP && Object.keys(currentWindow).length > 0) {
                windows.push(currentWindow);
                currentWindow = {};
            }
            if (Object.keys(currentWindow).length === 0) windowStart = sig.timestamp;

            if (!currentWindow[sig.domain]) currentWindow[sig.domain] = [];
            currentWindow[sig.domain].push(sig.aggregate.urgency);
        }
        if (Object.keys(currentWindow).length > 0) windows.push(currentWindow);

        if (windows.length < 5) return null; // Need temporal depth

        // Build time series: mean urgency per domain per window
        const series = {};
        for (const d of DOMAINS) series[d] = [];

        for (const win of windows) {
            for (const d of DOMAINS) {
                if (win[d] && win[d].length > 0) {
                    series[d].push(win[d].reduce((s, v) => s + v, 0) / win[d].length);
                } else {
                    series[d].push(null); // Missing observation
                }
            }
        }

        // Compute pairwise Pearson correlation → coupling strength
        const observed = {};
        let totalPairs = 0;
        let coveredPairs = 0;

        for (const d1 of DOMAINS) {
            observed[d1] = {};
            for (const d2 of DOMAINS) {
                if (d1 === d2) continue;
                totalPairs++;

                // Get paired observations (both domains have data)
                const paired = [];
                for (let i = 0; i < windows.length; i++) {
                    if (series[d1][i] !== null && series[d2][i] !== null) {
                        paired.push([series[d1][i], series[d2][i]]);
                    }
                }

                if (paired.length < 3) {
                    observed[d1][d2] = null; // Insufficient data
                    continue;
                }

                coveredPairs++;
                const n = paired.length;
                const meanX = paired.reduce((s, p) => s + p[0], 0) / n;
                const meanY = paired.reduce((s, p) => s + p[1], 0) / n;

                let cov = 0, varX = 0, varY = 0;
                for (const [x, y] of paired) {
                    cov += (x - meanX) * (y - meanY);
                    varX += (x - meanX) ** 2;
                    varY += (y - meanY) ** 2;
                }

                const denom = Math.sqrt(varX * varY);
                const r = denom > 1e-10 ? cov / denom : 0;

                // Map correlation [-1, 1] to coupling [0, 1]
                // r = +1 → coupling = 1.0 (perfect co-movement)
                // r =  0 → coupling = 0.5 (neutral)
                // r = -1 → coupling = 0.0 (anti-correlated, no coupling)
                observed[d1][d2] = Math.max(0, Math.min(1, (r + 1) / 2));
            }
        }

        return {
            coupling: observed,
            windowCount: windows.length,
            coverage: totalPairs > 0 ? coveredPairs / totalPairs : 0,
            signalCount: signals.length
        };
    },

    _blendCoupling(observed) {
        const DOMAINS = ['geopolitics', 'economics', 'technology', 'climate', 'social', 'epistemology'];

        // Default coupling from oracle-simulator.js (duplicated here as prior)
        const DEFAULT = {
            geopolitics: { economics: 0.55, technology: 0.20, climate: 0.10, social: 0.50, epistemology: 0.35 },
            economics:   { geopolitics: 0.40, technology: 0.30, climate: 0.15, social: 0.65, epistemology: 0.20 },
            technology:  { geopolitics: 0.30, economics: 0.45, climate: 0.10, social: 0.40, epistemology: 0.55 },
            climate:     { geopolitics: 0.45, economics: 0.55, technology: 0.10, social: 0.50, epistemology: 0.25 },
            social:      { geopolitics: 0.35, economics: 0.30, technology: 0.10, climate: 0.05, epistemology: 0.45 },
            epistemology:{ geopolitics: 0.40, economics: 0.25, technology: 0.30, climate: 0.30, social: 0.50 }
        };

        // Blend weight: conservative. Grows with coverage.
        // At full coverage (30 pairs), α ≈ baseBeta
        // At sparse coverage, α stays low → declared matrix dominates
        // NOTE: baseBeta is mutable via DarwinEngine genome
        const baseBeta = (typeof DarwinEngine !== 'undefined' && DarwinEngine.getParam('couplingBaseBeta'))
            || 0.35;
        const alpha = baseBeta * observed.coverage;

        const blended = {};
        let maxDeviation = 0;

        for (const d1 of DOMAINS) {
            blended[d1] = {};
            for (const d2 of DOMAINS) {
                if (d1 === d2) continue;
                const declared = (DEFAULT[d1] && DEFAULT[d1][d2]) || 0;
                const obs = observed.coupling[d1] && observed.coupling[d1][d2];

                if (obs !== null && obs !== undefined) {
                    blended[d1][d2] = declared * (1 - alpha) + obs * alpha;
                    maxDeviation = Math.max(maxDeviation, Math.abs(blended[d1][d2] - declared));
                } else {
                    blended[d1][d2] = declared;
                }
            }
        }

        this.couplingMeta = {
            adapted: true,
            alpha: Math.round(alpha * 1000) / 1000,
            coverage: Math.round(observed.coverage * 100),
            windows: observed.windowCount,
            maxDeviation: Math.round(maxDeviation * 1000) / 1000,
            timestamp: Date.now()
        };

        return blended;
    },

    async simulate(signals, stability, presetKey) {
        if (this.simulating || !this.worker) return;
        this.simulating = true;
        this.activePreset = presetKey || 'montecarlo';

        const currentState = this._buildDomainState(signals, stability);
        const preset = PERTURBATION_PRESETS[this.activePreset] || PERTURBATION_PRESETS.montecarlo;

        // Compute adaptive coupling from real signal history
        let coupling = null;
        try {
            const observed = await this._computeAdaptiveCoupling();
            if (observed) {
                coupling = this._blendCoupling(observed);
                console.log('[SyntheticField] Adaptive coupling: α=' + this.couplingMeta.alpha +
                    ' coverage=' + this.couplingMeta.coverage + '% windows=' + this.couplingMeta.windows +
                    ' maxDev=' + this.couplingMeta.maxDeviation);
            } else {
                console.log('[SyntheticField] Insufficient data for adaptive coupling, using declared matrix');
                this.couplingMeta = { adapted: false, reason: 'insufficient_data' };
            }
        } catch (err) {
            console.warn('[SyntheticField] Coupling adaptation failed:', err);
            this.couplingMeta = { adapted: false, reason: 'error' };
        }

        this.worker.postMessage({
            type: 'simulate',
            payload: {
                currentState,
                config: {
                    nSims: 1000,
                    steps: 72,
                    noiseScale: 0.015,
                    perturbation: preset.perturbation,
                    sustainedPerturbation: preset.sustained,
                    sampleCount: 30,
                    coupling: coupling // null → worker uses DEFAULT_COUPLING
                }
            }
        });
    },

    _handleWorkerMessage(event) {
        const { type, payload } = event.data;

        if (type === 'simulation-complete') {
            this.simulating = false;
            // Attach coupling metadata to result
            payload.couplingMeta = this.couplingMeta;
            this.lastResult = payload;

            // Reality Tether: store prediction for future evaluation
            CalibrationEngine.storePrediction(
                payload.dsi,
                OracleEngine.state.stability,
                this.activePreset,
                this.couplingMeta
            );
            // Attach current calibration state
            payload.calibration = CalibrationEngine.getState();

            // Notify engine listeners
            if (OracleEngine && OracleEngine._notify) {
                OracleEngine._notify('simulation-complete', payload);
            }
        }

        if (type === 'pong') {
            console.log('[SyntheticField] Worker alive');
        }
    },

    getResult() {
        return this.lastResult;
    },

    getPresets() {
        return PERTURBATION_PRESETS;
    }
};


// ============================================================
// SECTION 10: KRONOS — Cuore Temporale dell'Ecosistema
// ============================================================
// Il tempo non è lineare. È un albero.
// Il tronco è la timeline reale: scan dopo scan.
// I rami sono esplorazioni: versioni del modello, what-if,
// coupling diversi, red team. Ogni ramo accumula la propria
// storia e la propria credibilità.
//
// Ogni nodo è un'EPOCA: snapshot completo dello stato.
// Ogni arco è una TRANSIZIONE: delta strutturale misurato.
// Regime = classificazione automatica (stable/transitional/chaotic).
//
// KRONOS non archivia. Stratifica.
// Non registra. Evolve.
//
// In VR: cammini nel Campo del 12 ottobre,
// poi in quello del 3 novembre,
// poi in quello "versione 4.1-REDTEAM".
// ============================================================

const Kronos = {
    DOMAIN_KEYS: ['geopolitics', 'economics', 'social', 'technology', 'climate', 'epistemology'],
    currentBranch: 'trunk',
    lastEpoch: null,
    branchCache: {},

    async init() {
        // Ensure trunk exists
        let trunk = await OracleMemory.getScenario('trunk');
        if (!trunk) {
            trunk = {
                scenarioId: 'trunk',
                timestamp: Date.now(),
                parentBranchId: null,
                forkEpochScanIndex: null,
                reason: 'genesis',
                label: 'Main Timeline',
                active: 1,
                epochCount: 0,
                metrics: {}
            };
            await OracleMemory.saveScenario(trunk);
        }
        this.branchCache['trunk'] = trunk;

        // Load last epoch for edge computation
        const recent = await OracleMemory.getRecentStateNodes(1);
        if (recent.length > 0) {
            this.lastEpoch = recent[0];
            console.log('[Kronos] Restored: last epoch scanIndex=' +
                this.lastEpoch.scanIndex + ' regime=' + this.lastEpoch.regime);
        } else {
            console.log('[Kronos] No prior epochs. Genesis.');
        }
    },

    // ---- RECORD EPOCH ----
    // Called after every scan. Creates a full snapshot of the ecosystem.
    async recordEpoch(scanData) {
        const {
            scanIndex, signals, stability, delta, patterns,
            couplingMeta, dsi, lyapunov, tether, trust
        } = scanData;

        // Domain urgency vector
        const domains = this._extractDomainVector(signals);

        // Regime classification
        const regime = this._classifyRegime(stability, delta, lyapunov);

        // Edge from previous epoch
        let edge = null;
        if (this.lastEpoch) {
            edge = this._computeEdge(this.lastEpoch, { domains, stability, regime });
        }

        const epoch = {
            timestamp: Date.now(),
            scanIndex,
            branchId: this.currentBranch,

            // Real field state
            state: {
                stability,
                delta,
                domains
            },

            // Pattern tensor
            patterns: patterns ? {
                shockFactor: patterns.shocks ? patterns.shocks.factor : 0,
                acceleration: patterns.acceleration ? patterns.acceleration.rate : 0,
                polarization: patterns.polarization ? patterns.polarization.variance : 0,
                correlation: patterns.crossCorrelation ? patterns.crossCorrelation.correlation : 0
            } : null,

            // Synthetic field
            synthetic: {
                dsi: dsi || null,
                catastrophicFraction: scanData.catastrophicFraction || null,
                lyapunov: lyapunov || null
            },

            // Coupling snapshot
            coupling: couplingMeta || null,

            // Reality tether
            tether: {
                credibility: tether || 0.5,
                trust: trust || null
            },

            // Computed
            regime,
            edge
        };

        try {
            await OracleMemory.saveStateNode(epoch);
        } catch (err) {
            console.warn('[Kronos] Failed to save epoch:', err);
            return null;
        }

        // Log regime transitions
        if (edge && edge.regimeTransition) {
            console.log('[Kronos] REGIME TRANSITION: ' +
                edge.regimeTransition.from + ' → ' + edge.regimeTransition.to +
                ' at scanIndex=' + scanIndex);
        }

        this.lastEpoch = epoch;

        // Update branch epoch count
        const branch = this.branchCache[this.currentBranch];
        if (branch) {
            branch.epochCount = (branch.epochCount || 0) + 1;
            await OracleMemory.saveScenario(branch);
        }

        return epoch;
    },

    // ---- REGIME CLASSIFICATION ----
    _classifyRegime(stability, delta, lyapunov) {
        const lambda = lyapunov ? lyapunov.lambda : 0;
        const lyapRegime = lyapunov ? lyapunov.regime : 'unknown';

        // Chaotic: Lyapunov says chaotic, OR stability critically low,
        // OR catastrophic fraction dominant
        if (lyapRegime === 'chaotic' || stability < 0.25) {
            return 'chaotic';
        }

        // Transitional: moving between states, OR borderline stability,
        // OR Lyapunov transitional, OR large delta
        if (lyapRegime === 'transitional' ||
            (stability >= 0.25 && stability < 0.5) ||
            Math.abs(delta) > 0.06 ||
            lambda > 0.02) {
            return 'transitional';
        }

        // Stable: everything calm
        return 'stable';
    },

    // ---- EDGE COMPUTATION ----
    // Structural delta = L2 norm of domain vector change.
    // Not scalar stability difference — multidimensional movement.
    _computeEdge(prevEpoch, current) {
        const prevDomains = prevEpoch.state ? prevEpoch.state.domains : {};
        const currDomains = current.domains || {};

        // L2 norm of domain vector delta
        let sumSq = 0;
        for (const d of this.DOMAIN_KEYS) {
            const diff = (currDomains[d] || 0) - (prevDomains[d] || 0);
            sumSq += diff * diff;
        }
        const structuralDelta = Math.sqrt(sumSq);

        // Regime transition detection
        let regimeTransition = null;
        if (prevEpoch.regime && current.regime && prevEpoch.regime !== current.regime) {
            regimeTransition = {
                from: prevEpoch.regime,
                to: current.regime
            };
        }

        return {
            fromScanIndex: prevEpoch.scanIndex,
            structuralDelta: Math.round(structuralDelta * 10000) / 10000,
            stabilityDelta: Math.round((current.stability - (prevEpoch.state ? prevEpoch.state.stability : 0.75)) * 10000) / 10000,
            regimeTransition
        };
    },

    // ---- DOMAIN VECTOR EXTRACTION ----
    _extractDomainVector(signals) {
        const domainMap = {};
        if (signals) {
            for (const sig of signals) {
                if (sig.meta && sig.meta.success && sig.aggregate) {
                    if (!domainMap[sig.domain]) domainMap[sig.domain] = [];
                    domainMap[sig.domain].push(sig.aggregate.urgency);
                }
            }
        }
        const vector = {};
        for (const d of this.DOMAIN_KEYS) {
            if (domainMap[d] && domainMap[d].length > 0) {
                vector[d] = Math.round(
                    (domainMap[d].reduce((s, v) => s + v, 0) / domainMap[d].length) * 1000
                ) / 1000;
            } else {
                vector[d] = 0;
            }
        }
        return vector;
    },

    // ---- BRANCHING ----

    async createBranch(label, reason) {
        const branchId = 'branch-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);

        const branch = {
            scenarioId: branchId,
            timestamp: Date.now(),
            parentBranchId: this.currentBranch,
            forkEpochScanIndex: this.lastEpoch ? this.lastEpoch.scanIndex : null,
            reason: reason || 'exploration',
            label: label || 'Unnamed branch',
            active: 0,  // Not active until switched to
            epochCount: 0,
            metrics: {}
        };

        await OracleMemory.saveScenario(branch);
        this.branchCache[branchId] = branch;
        console.log('[Kronos] Branch created: ' + branchId + ' ("' + label + '") from ' +
            this.currentBranch + ' at scanIndex=' + (this.lastEpoch ? this.lastEpoch.scanIndex : '?'));

        return branchId;
    },

    async switchBranch(branchId) {
        const branch = await OracleMemory.getScenario(branchId);
        if (!branch) {
            console.error('[Kronos] Branch not found: ' + branchId);
            return false;
        }

        // Deactivate current
        const current = this.branchCache[this.currentBranch];
        if (current) {
            current.active = 0;
            await OracleMemory.saveScenario(current);
        }

        // Activate target
        branch.active = 1;
        await OracleMemory.saveScenario(branch);
        this.branchCache[branchId] = branch;
        this.currentBranch = branchId;

        // Load last epoch of this branch
        const nodes = await OracleMemory.getRecentStateNodes(200);
        const branchNodes = nodes.filter(n => n.branchId === branchId);
        this.lastEpoch = branchNodes.length > 0 ? branchNodes[branchNodes.length - 1] : null;

        console.log('[Kronos] Switched to branch: ' + branchId);
        return true;
    },

    async getBranches() {
        return OracleMemory.getAllScenarios();
    },

    // ---- COMPARISON & QUERY ----

    // Diff two epochs — structural distance
    diffEpochs(epochA, epochB) {
        if (!epochA || !epochB) return null;

        const domainsA = epochA.state ? epochA.state.domains : {};
        const domainsB = epochB.state ? epochB.state.domains : {};

        // Per-domain deltas
        const domainDeltas = {};
        let sumSq = 0;
        for (const d of this.DOMAIN_KEYS) {
            const diff = (domainsB[d] || 0) - (domainsA[d] || 0);
            domainDeltas[d] = Math.round(diff * 1000) / 1000;
            sumSq += diff * diff;
        }

        const stabA = epochA.state ? epochA.state.stability : 0;
        const stabB = epochB.state ? epochB.state.stability : 0;
        const dsiA = epochA.synthetic ? epochA.synthetic.dsi : null;
        const dsiB = epochB.synthetic ? epochB.synthetic.dsi : null;
        const tetherA = epochA.tether ? epochA.tether.credibility : 0.5;
        const tetherB = epochB.tether ? epochB.tether.credibility : 0.5;

        return {
            structuralDistance: Math.round(Math.sqrt(sumSq) * 10000) / 10000,
            domainDeltas,
            stabilityDelta: Math.round((stabB - stabA) * 10000) / 10000,
            dsiDelta: (dsiA !== null && dsiB !== null)
                ? Math.round((dsiB - dsiA) * 10000) / 10000
                : null,
            tetherDelta: Math.round((tetherB - tetherA) * 10000) / 10000,
            regimeA: epochA.regime,
            regimeB: epochB.regime,
            regimeChanged: epochA.regime !== epochB.regime,
            timeDelta: epochB.timestamp - epochA.timestamp,
            scanDelta: epochB.scanIndex - epochA.scanIndex
        };
    },

    // Find all regime transitions in history
    async getRegimeTransitions(limit = 50) {
        const nodes = await OracleMemory.getRecentStateNodes(500);
        const transitions = [];

        for (const node of nodes) {
            if (node.edge && node.edge.regimeTransition) {
                transitions.push({
                    scanIndex: node.scanIndex,
                    timestamp: node.timestamp,
                    from: node.edge.regimeTransition.from,
                    to: node.edge.regimeTransition.to,
                    structuralDelta: node.edge.structuralDelta,
                    branchId: node.branchId
                });
            }
        }

        return transitions.slice(-limit);
    },

    // Get trajectory for a branch (or current branch)
    async getTrajectory(branchId, limit = 100) {
        const targetBranch = branchId || this.currentBranch;
        const nodes = await OracleMemory.getRecentStateNodes(500);
        return nodes
            .filter(n => n.branchId === targetBranch)
            .slice(-limit);
    },

    // ---- STATE ----
    getState() {
        return {
            currentBranch: this.currentBranch,
            lastEpoch: this.lastEpoch ? {
                scanIndex: this.lastEpoch.scanIndex,
                regime: this.lastEpoch.regime,
                stability: this.lastEpoch.state ? this.lastEpoch.state.stability : null,
                edge: this.lastEpoch.edge
            } : null
        };
    }
};


// ============================================================
// SECTION 11: SIGNAL BUS — Sistema Nervoso Afferente
// ============================================================
// Non "BBC feed". Non "USGS API".
// Signal(domain, intensity, confidence, latency, source).
//
// Qualsiasi sorgente — RSS, dataset offline, iniezione manuale,
// simulazioni esterne, input umano — entra come Signal.
// Il bus normalizza, instrada, registra.
//
// ORACLE riceve segnali come un sistema nervoso,
// non come un lettore di feed.
// ============================================================

const SignalBus = {
    sources: new Map(),
    listeners: [],
    injectionQueue: [],

    // Register a signal source (informational)
    register(sourceId, sourceType, config) {
        this.sources.set(sourceId, {
            id: sourceId,
            type: sourceType,
            config: config || {},
            signalCount: 0,
            lastSignal: null
        });
    },

    // Normalize ANY input to canonical Signal format
    normalize(raw) {
        // From SensoryMesh (existing neuron signals)
        if (raw.neuronId && raw.aggregate) {
            const neuron = SensoryMesh.neurons.find(n => n.id === raw.neuronId);
            return {
                domain: raw.domain,
                intensity: raw.aggregate.urgency,
                sentiment: raw.aggregate.sentiment,
                confidence: neuron ? neuron.reliability : 0.5,
                latency: raw.meta ? raw.meta.fetchTime : 0,
                volume: raw.aggregate.volume,
                keywords: raw.aggregate.dominantKeywords || [],
                source: raw.neuronId,
                sourceType: 'neuron',
                timestamp: raw.timestamp,
                success: raw.meta ? raw.meta.success : false,
                raw: raw
            };
        }

        // From manual injection or external source
        return {
            domain: raw.domain || 'unknown',
            intensity: raw.intensity || 0,
            sentiment: raw.sentiment || 0,
            confidence: raw.confidence || 0.5,
            latency: raw.latency || 0,
            volume: raw.volume || 1,
            keywords: raw.keywords || [],
            source: raw.source || 'external',
            sourceType: raw.sourceType || 'manual',
            timestamp: raw.timestamp || Date.now(),
            success: true,
            raw: raw
        };
    },

    // Emit a signal through the bus
    emit(signal) {
        const normalized = this.normalize(signal);

        // Update source tracking
        const source = this.sources.get(normalized.source);
        if (source) {
            source.signalCount++;
            source.lastSignal = normalized.timestamp;
        }

        // Notify listeners
        for (const listener of this.listeners) {
            try { listener(normalized); } catch (e) { /* listener error */ }
        }

        return normalized;
    },

    // Manual injection — human input as formal signal
    // This is PNEUMA's entry point into the system.
    inject(domain, intensity, confidence, keywords) {
        const signal = {
            domain,
            intensity: Math.max(0, Math.min(1, intensity)),
            sentiment: 0,
            confidence: Math.max(0, Math.min(1, confidence || 0.5)),
            latency: 0,
            volume: 1,
            keywords: keywords || [],
            source: 'manual:inject',
            sourceType: 'manual',
            timestamp: Date.now()
        };

        // Queue for next scan cycle
        this.injectionQueue.push(signal);

        // Emit immediately for listeners
        return this.emit(signal);
    },

    // Drain injection queue (called during scan)
    drainInjections() {
        const queue = this.injectionQueue.slice();
        this.injectionQueue = [];
        return queue;
    },

    // Subscribe to all signals
    onSignal(callback) {
        this.listeners.push(callback);
    },

    getState() {
        return {
            sourceCount: this.sources.size,
            sources: Array.from(this.sources.values()).map(s => ({
                id: s.id, type: s.type,
                signalCount: s.signalCount,
                lastSignal: s.lastSignal
            })),
            pendingInjections: this.injectionQueue.length
        };
    }
};


// ============================================================
// SECTION 12: TRUST ENGINE — Auto-Umiltà Algoritmica
// ============================================================
// Non solo credibility score.
// Rolling skill score per componente:
//   direction skill, catastrophic skill, volatility skill.
//
// Auto-attenuation: quando la skill cala,
// il peso del simulatore si riduce automaticamente.
// Il modello che ha sbagliato non grida più "catastrofe"
// — la sua voce viene smorzata.
//
// Sigmoid: skill=0.3 → trustWeight≈0.27
//          skill=0.5 → trustWeight≈0.73
//          skill=0.7 → trustWeight≈0.95
//
// Questo è auto-sospetto algoritmico.
// È raro. È potente.
// ============================================================

const TrustEngine = {
    skills: {
        direction: 0.5,     // Can it predict the direction?
        catastrophic: 0.5,  // Can it predict catastrophic fractions?
        volatility: 0.5,    // Can it predict volatility?
        overall: 0.5        // Weighted composite
    },
    trustWeight: 1.0,       // [0, 1] — auto-attenuates simulation impact
    evaluationCount: 0,

    // Rebuild from calibration history
    async loadState() {
        try {
            const calibrations = await OracleMemory.getAllCalibrations();
            const evaluated = calibrations.filter(r => r.evaluated && r.outcome);

            if (evaluated.length === 0) {
                console.log('[TrustEngine] No evaluations. Full trust (agnostic).');
                return;
            }

            // Rebuild skills from chronological evaluations
            const alpha = ORACLE_CONFIG.TRUST_SKILL_ALPHA;
            this.skills = { direction: 0.5, catastrophic: 0.5, volatility: 0.5, overall: 0.5 };

            for (const record of evaluated) {
                const o = record.outcome;
                this.skills.direction = this.skills.direction * (1 - alpha) + o.directionCorrect * alpha;
                this.skills.catastrophic = this.skills.catastrophic * (1 - alpha) + o.catScore * alpha;
                this.skills.volatility = this.skills.volatility * (1 - alpha) + o.volScore * alpha;
            }

            this.skills.overall = this.skills.direction * 0.40 +
                                  this.skills.catastrophic * 0.35 +
                                  this.skills.volatility * 0.25;

            this._computeTrustWeight();
            this.evaluationCount = evaluated.length;

            console.log('[TrustEngine] Restored: ' + evaluated.length + ' evaluations, ' +
                'skill=' + this.skills.overall.toFixed(3) +
                ' trustWeight=' + this.trustWeight.toFixed(3));
        } catch (err) {
            console.warn('[TrustEngine] Load failed:', err);
        }
    },

    // Called after each calibration evaluation
    updateSkills(outcome) {
        if (!outcome) return;
        const alpha = ORACLE_CONFIG.TRUST_SKILL_ALPHA;

        this.skills.direction = this.skills.direction * (1 - alpha) + outcome.directionCorrect * alpha;
        this.skills.catastrophic = this.skills.catastrophic * (1 - alpha) + outcome.catScore * alpha;
        this.skills.volatility = this.skills.volatility * (1 - alpha) + outcome.volScore * alpha;
        this.skills.overall = this.skills.direction * 0.40 +
                              this.skills.catastrophic * 0.35 +
                              this.skills.volatility * 0.25;

        this._computeTrustWeight();
        this.evaluationCount++;
    },

    // Sigmoid auto-attenuation
    _computeTrustWeight() {
        const mid = ORACLE_CONFIG.TRUST_ATTENUATION_MID;
        // Sigmoid: smooth transition from distrust to trust
        // At skill=mid → weight=0.5
        // At skill=mid+0.2 → weight≈0.88
        // At skill=mid-0.2 → weight≈0.12
        this.trustWeight = 1 / (1 + Math.exp(-10 * (this.skills.overall - mid)));
        this.trustWeight = Math.round(this.trustWeight * 1000) / 1000;
    },

    // Attenuate a value toward neutral based on trust
    // When trust is low, the value is pulled toward the neutral point.
    // When trust is high, the value passes through unchanged.
    attenuate(value, neutral) {
        return value * this.trustWeight + neutral * (1 - this.trustWeight);
    },

    getState() {
        return {
            skills: {
                direction: Math.round(this.skills.direction * 1000) / 1000,
                catastrophic: Math.round(this.skills.catastrophic * 1000) / 1000,
                volatility: Math.round(this.skills.volatility * 1000) / 1000,
                overall: Math.round(this.skills.overall * 1000) / 1000
            },
            trustWeight: this.trustWeight,
            attenuated: this.trustWeight < 0.8,
            evaluations: this.evaluationCount
        };
    }
};


// ============================================================
// SECTION 13: DARWIN ENGINE — Auto-Evoluzione Guidata dall'Errore
// ============================================================
// Quando il modello sbaglia abbastanza a lungo,
// non aspetta la mano umana.
// Si forka. Muta UN parametro. Compete.
// Se il mutante batte il tronco → innesto.
// Se perde → potatura.
//
// Non ottimizzazione. Selezione naturale.
// Non hyperparameter tuning. Evoluzione darwiniana.
//
// Il selezionatore supremo sei tu (Marsèlia / Red Team).
// Il Darwin Engine propone candidati.
// Tu scegli chi vive.
//
// Fase A: mutazioni parametriche (α, decay, coupling weights).
// Fase B (futuro): mutazioni strutturali (nuovi detector, nuove dinamiche).
// ============================================================

const DarwinEngine = {
    // Current mutable genome — the parameters that can evolve
    genome: {
        couplingBaseBeta: 0.35,          // Blend weight for adaptive coupling
        neuronAlpha: 0.12,               // EMA learning rate for signal history
        calibrationAlpha: 0.15,          // EMA for credibility
        trustSkillAlpha: 0.15,           // EMA for skill score
        trustAttenuationMid: 0.4,        // Sigmoid midpoint
        simNoiseScale: 0.015             // Monte Carlo noise
    },

    // Tracking
    lowTrustStreak: 0,                   // Consecutive epochs below threshold
    activeMutants: [],                   // Currently competing branches
    history: [],                         // Completed competitions (win/loss)
    generation: 0,                       // Evolution counter

    init() {
        // Load genome from active ORACLE_CONFIG values
        this.genome = {
            couplingBaseBeta: 0.35,
            neuronAlpha: ORACLE_CONFIG.NEURON_ALPHA,
            calibrationAlpha: ORACLE_CONFIG.CALIBRATION_ALPHA,
            trustSkillAlpha: ORACLE_CONFIG.TRUST_SKILL_ALPHA,
            trustAttenuationMid: ORACLE_CONFIG.TRUST_ATTENUATION_MID,
            simNoiseScale: 0.015
        };
        console.log('[Darwin] Initialized. Genome:', JSON.stringify(this.genome));
    },

    // ---- MUTATION TRIGGER ----
    // Called after every Kronos epoch. Checks if the organism is failing.
    async checkTrigger(trustState, epoch) {
        if (!trustState || !epoch) return null;

        const threshold = ORACLE_CONFIG.DARWIN_TRUST_THRESHOLD;
        const required = ORACLE_CONFIG.DARWIN_TRIGGER_EPOCHS;
        const maxMutants = ORACLE_CONFIG.DARWIN_MAX_ACTIVE_MUTANTS;

        // Track consecutive low-trust epochs
        if (trustState.trustWeight < threshold) {
            this.lowTrustStreak++;
        } else {
            this.lowTrustStreak = 0;
        }

        // Not enough failure yet
        if (this.lowTrustStreak < required) return null;

        // Already at max mutants
        if (this.activeMutants.length >= maxMutants) {
            console.log('[Darwin] Low trust streak=' + this.lowTrustStreak +
                ' but max mutants reached (' + maxMutants + ')');
            return null;
        }

        // TRIGGER: spawn a mutant
        console.log('[Darwin] === MUTATION TRIGGERED ===');
        console.log('[Darwin] Low trust streak: ' + this.lowTrustStreak +
            ' (threshold: ' + required + ')');
        console.log('[Darwin] Trust weight: ' + trustState.trustWeight +
            ' (threshold: ' + threshold + ')');

        const mutant = await this._spawnMutant(epoch);
        this.lowTrustStreak = 0;  // Reset streak after spawn
        return mutant;
    },

    // ---- MUTATION: SPAWN MUTANT ----
    async _spawnMutant(epoch) {
        // Select ONE parameter to mutate
        const geneKeys = Object.keys(this.genome);
        const targetGene = geneKeys[Math.floor(Math.random() * geneKeys.length)];
        const currentValue = this.genome[targetGene];

        // Mutate: random direction, bounded by DARWIN_MUTATION_RANGE
        const range = ORACLE_CONFIG.DARWIN_MUTATION_RANGE;
        const direction = Math.random() > 0.5 ? 1 : -1;
        const magnitude = 0.05 + Math.random() * (range - 0.05); // At least 5% change
        const mutatedValue = currentValue * (1 + direction * magnitude);

        // Clamp to sensible bounds
        const bounds = {
            couplingBaseBeta:    { min: 0.05, max: 0.80 },
            neuronAlpha:         { min: 0.02, max: 0.40 },
            calibrationAlpha:    { min: 0.05, max: 0.40 },
            trustSkillAlpha:     { min: 0.05, max: 0.40 },
            trustAttenuationMid: { min: 0.20, max: 0.60 },
            simNoiseScale:       { min: 0.005, max: 0.05 }
        };
        const b = bounds[targetGene] || { min: 0.01, max: 1.0 };
        const clampedValue = Math.max(b.min, Math.min(b.max, mutatedValue));
        const roundedValue = Math.round(clampedValue * 10000) / 10000;

        // Build mutant genome
        const mutantGenome = Object.assign({}, this.genome);
        mutantGenome[targetGene] = roundedValue;

        // Create Kronos branch
        const label = 'Darwin G' + this.generation + ': ' +
            targetGene + ' ' + currentValue + ' → ' + roundedValue;
        const branchId = await Kronos.createBranch(label, 'darwin-mutation');

        const mutant = {
            branchId,
            generation: this.generation,
            targetGene,
            originalValue: currentValue,
            mutatedValue: roundedValue,
            genome: mutantGenome,
            forkScanIndex: epoch.scanIndex,
            forkTimestamp: Date.now(),
            competitionEpochs: 0,
            // Scoring: accumulated during competition
            trunkScore: 0,
            mutantScore: 0,
            trunkEpochs: [],
            mutantEpochs: [],
            status: 'competing'  // competing → grafted | pruned
        };

        this.activeMutants.push(mutant);
        this.generation++;

        console.log('[Darwin] Mutant spawned: ' + label);
        console.log('[Darwin] Branch: ' + branchId);
        console.log('[Darwin] Genome: ' + JSON.stringify(mutantGenome));

        return mutant;
    },

    // ---- COMPETITION: SCORE EPOCH ----
    // Called after each Kronos epoch. Scores trunk vs mutant performance.
    // Scoring: how well does the simulation predict reality?
    // Uses calibration accuracy as the fitness metric.
    scoreEpoch(epoch, calibrationState) {
        if (this.activeMutants.length === 0) return;
        if (!calibrationState) return;

        const accuracy = calibrationState.credibility || 0.5;
        const trustWeight = TrustEngine.trustWeight || 1.0;
        // Fitness = credibility * trustWeight
        // High credibility + high trust = good model
        const fitness = accuracy * trustWeight;

        for (const mutant of this.activeMutants) {
            if (mutant.status !== 'competing') continue;

            // Score this epoch for the active branch
            if (Kronos.currentBranch === mutant.branchId) {
                mutant.mutantScore += fitness;
                mutant.mutantEpochs.push({
                    scanIndex: epoch.scanIndex,
                    fitness,
                    accuracy,
                    trustWeight
                });
            } else if (Kronos.currentBranch === 'trunk') {
                mutant.trunkScore += fitness;
                mutant.trunkEpochs.push({
                    scanIndex: epoch.scanIndex,
                    fitness,
                    accuracy,
                    trustWeight
                });
            }

            mutant.competitionEpochs++;
        }
    },

    // ---- SELECTION: CHECK COMPETITION RESULTS ----
    // Called after each epoch. Checks if any competition has enough data.
    async checkCompetitions() {
        const requiredEpochs = ORACLE_CONFIG.DARWIN_COMPETITION_EPOCHS;
        const results = [];

        for (let i = this.activeMutants.length - 1; i >= 0; i--) {
            const mutant = this.activeMutants[i];
            if (mutant.status !== 'competing') continue;

            // Need epochs from BOTH trunk and mutant branch
            const trunkN = mutant.trunkEpochs.length;
            const mutantN = mutant.mutantEpochs.length;

            // Not enough data yet
            if (trunkN < Math.floor(requiredEpochs / 2) ||
                mutantN < Math.floor(requiredEpochs / 2)) {
                continue;
            }

            // Total epochs must reach threshold
            if (mutant.competitionEpochs < requiredEpochs) continue;

            // JUDGE: compare average fitness
            const trunkAvg = trunkN > 0 ? mutant.trunkScore / trunkN : 0;
            const mutantAvg = mutantN > 0 ? mutant.mutantScore / mutantN : 0;

            const winner = mutantAvg > trunkAvg ? 'mutant' : 'trunk';
            const margin = Math.abs(mutantAvg - trunkAvg);

            const result = {
                branchId: mutant.branchId,
                generation: mutant.generation,
                targetGene: mutant.targetGene,
                originalValue: mutant.originalValue,
                mutatedValue: mutant.mutatedValue,
                trunkAvgFitness: Math.round(trunkAvg * 10000) / 10000,
                mutantAvgFitness: Math.round(mutantAvg * 10000) / 10000,
                margin: Math.round(margin * 10000) / 10000,
                winner,
                trunkEpochs: trunkN,
                mutantEpochs: mutantN,
                timestamp: Date.now()
            };

            if (winner === 'mutant') {
                // GRAFT: mutant wins → absorb its parameter into trunk
                await this._graft(mutant, result);
                result.action = 'grafted';
            } else {
                // PRUNE: trunk wins → discard mutant
                await this._prune(mutant, result);
                result.action = 'pruned';
            }

            // Remove from active, add to history
            this.activeMutants.splice(i, 1);
            this.history.push(result);
            results.push(result);
        }

        return results;
    },

    // ---- GRAFT: Mutant wins, absorb its gene ----
    async _graft(mutant, result) {
        console.log('[Darwin] === GRAFT ===');
        console.log('[Darwin] Mutant WINS: ' + mutant.targetGene +
            ' ' + mutant.originalValue + ' → ' + mutant.mutatedValue);
        console.log('[Darwin] Fitness: trunk=' + result.trunkAvgFitness +
            ' mutant=' + result.mutantAvgFitness +
            ' margin=' + result.margin);

        // Absorb the mutated parameter
        this.genome[mutant.targetGene] = mutant.mutatedValue;

        // Apply to live config
        this._applyGenome();

        mutant.status = 'grafted';

        // Switch back to trunk with new genome
        if (Kronos.currentBranch !== 'trunk') {
            await Kronos.switchBranch('trunk');
        }

        console.log('[Darwin] New genome applied: ' + JSON.stringify(this.genome));
    },

    // ---- PRUNE: Trunk wins, discard mutant ----
    async _prune(mutant, result) {
        console.log('[Darwin] === PRUNE ===');
        console.log('[Darwin] Trunk WINS. Discarding: ' + mutant.targetGene +
            ' mutation ' + mutant.originalValue + ' → ' + mutant.mutatedValue);
        console.log('[Darwin] Fitness: trunk=' + result.trunkAvgFitness +
            ' mutant=' + result.mutantAvgFitness);

        mutant.status = 'pruned';

        // Ensure we're back on trunk
        if (Kronos.currentBranch !== 'trunk') {
            await Kronos.switchBranch('trunk');
        }
    },

    // ---- APPLY GENOME TO LIVE CONFIG ----
    _applyGenome() {
        ORACLE_CONFIG.NEURON_ALPHA = this.genome.neuronAlpha;
        ORACLE_CONFIG.CALIBRATION_ALPHA = this.genome.calibrationAlpha;
        ORACLE_CONFIG.TRUST_SKILL_ALPHA = this.genome.trustSkillAlpha;
        ORACLE_CONFIG.TRUST_ATTENUATION_MID = this.genome.trustAttenuationMid;
        // couplingBaseBeta and simNoiseScale are read directly
        // from genome during simulation calls
    },

    // ---- GET CURRENT MUTABLE PARAMS ----
    // For SyntheticField to read during simulation
    getParam(key) {
        return this.genome[key] !== undefined ? this.genome[key] : null;
    },

    // ---- STATE ----
    getState() {
        return {
            generation: this.generation,
            genome: Object.assign({}, this.genome),
            lowTrustStreak: this.lowTrustStreak,
            activeMutants: this.activeMutants.map(m => ({
                branchId: m.branchId,
                generation: m.generation,
                targetGene: m.targetGene,
                originalValue: m.originalValue,
                mutatedValue: m.mutatedValue,
                status: m.status,
                competitionEpochs: m.competitionEpochs,
                trunkAvg: m.trunkEpochs.length > 0
                    ? Math.round(m.trunkScore / m.trunkEpochs.length * 10000) / 10000
                    : null,
                mutantAvg: m.mutantEpochs.length > 0
                    ? Math.round(m.mutantScore / m.mutantEpochs.length * 10000) / 10000
                    : null
            })),
            recentHistory: this.history.slice(-10),
            grafted: this.history.filter(h => h.action === 'grafted').length,
            pruned: this.history.filter(h => h.action === 'pruned').length
        };
    }
};


// ============================================================
// SECTION 14: ORCHESTRATOR
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
        scanning: false,
        // Synthetic Earth state
        syntheticField: null,
        dsi: null,
        simulationActive: false,
        // Calibration state
        calibration: null,
        // Kronos temporal state
        kronos: null,
        // Trust Engine state
        trust: null,
        // Signal Bus state
        signalBus: null,
        // Darwin Engine state
        darwin: null
    },

    listeners: [],

    async init() {
        try {
            await OracleMemory.init();
            await SensoryMesh.init();

            // Initialize Synthetic Earth worker
            SyntheticField.init();

            // Initialize Calibration Engine (reality tether)
            await CalibrationEngine.loadState();
            this.state.calibration = CalibrationEngine.getState();

            // Initialize Kronos (temporal heart)
            await Kronos.init();
            this.state.kronos = Kronos.getState();

            // Initialize Trust Engine (algorithmic self-humility)
            await TrustEngine.loadState();
            this.state.trust = TrustEngine.getState();

            // Initialize Darwin Engine (evolutionary pressure)
            DarwinEngine.init();
            this.state.darwin = DarwinEngine.getState();

            // Register neuron sources on Signal Bus
            for (const neuron of SensoryMesh.neurons) {
                SignalBus.register(neuron.id, neuron.type, { domain: neuron.domain });
            }
            this.state.signalBus = SignalBus.getState();

            // Request persistent storage (prevents Quest 2 eviction)
            OracleMemory.requestPersistence();

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

            // Emit through Signal Bus (normalizes + notifies listeners)
            for (const sig of signals) {
                SignalBus.emit(sig);
            }

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

            // Reality Tether: evaluate past predictions against observed reality
            await CalibrationEngine.evaluatePendingPredictions();
            this.state.calibration = CalibrationEngine.getState();

            // Trust Engine: update skills from latest evaluation
            if (CalibrationEngine.lastEvaluation && CalibrationEngine.lastEvaluation.outcome) {
                TrustEngine.updateSkills(CalibrationEngine.lastEvaluation.outcome);
                this.state.trust = TrustEngine.getState();
            }

            // KRONOS: record epoch — full ecosystem snapshot
            const lastSim = SyntheticField.getResult();
            try {
                await Kronos.recordEpoch({
                    scanIndex: this.state.scanCount,
                    signals,
                    stability,
                    delta,
                    patterns,
                    couplingMeta: SyntheticField.couplingMeta,
                    dsi: lastSim && lastSim.dsi ? lastSim.dsi.dsi : null,
                    catastrophicFraction: lastSim && lastSim.dsi ? lastSim.dsi.catastrophicFraction : null,
                    lyapunov: lastSim && lastSim.dsi ? lastSim.dsi.lyapunov : null,
                    tether: CalibrationEngine.credibility,
                    trust: TrustEngine.getState()
                });
                this.state.kronos = Kronos.getState();

                // Darwin Engine: score this epoch for active competitions
                DarwinEngine.scoreEpoch(
                    Kronos.lastEpoch,
                    CalibrationEngine.getState()
                );

                // Darwin Engine: check if trust has been low long enough to trigger mutation
                await DarwinEngine.checkTrigger(
                    TrustEngine.getState(),
                    Kronos.lastEpoch
                );

                // Darwin Engine: check if any competition has concluded
                const darwinResults = await DarwinEngine.checkCompetitions();
                if (darwinResults.length > 0) {
                    for (const r of darwinResults) {
                        console.log('[OracleEngine] Darwin ' + r.action + ': ' +
                            r.targetGene + ' (margin=' + r.margin + ')');
                    }
                }

                this.state.darwin = DarwinEngine.getState();
            } catch (err) {
                console.warn('[OracleEngine] Kronos epoch failed:', err);
            }

            // Signal Bus state update
            this.state.signalBus = SignalBus.getState();

            // Auto-compact if storage pressure is high
            try {
                const storage = await OracleMemory.estimateStorage();
                if (storage && storage.percent > 70) {
                    console.log('[OracleEngine] Storage at ' + storage.percent + '%, compacting...');
                    await OracleMemory.compact({
                        signals: Math.floor(ORACLE_CONFIG.MAX_SIGNALS_STORED * 0.5),
                        stability: Math.floor(ORACLE_CONFIG.MAX_STABILITY_POINTS * 0.5),
                        calibration: Math.floor(ORACLE_CONFIG.MAX_CALIBRATIONS * 0.5),
                        diagnoses: Math.floor(ORACLE_CONFIG.MAX_DIAGNOSES * 0.5)
                    });
                }
            } catch (err) {
                console.warn('[OracleEngine] Storage check failed:', err);
            }

            // Trigger Synthetic Earth simulation after scan completes
            this.runSimulation();

            return this.state;

        } catch (err) {
            console.error('[OracleEngine] Scan failed:', err);
            this.state.scanning = false;
            this._notify('scan-error', err.message);
            return this.state;
        }
    },

    // Run Synthetic Earth simulation with current state
    runSimulation(presetKey) {
        if (!this.state.signals || this.state.signals.length === 0) return;
        this.state.simulationActive = true;
        this._notify('simulation-start');
        SyntheticField.simulate(this.state.signals, this.state.stability, presetKey);
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
