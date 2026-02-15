// ═══════════════════════════════════════════════════════════════
// SIGNAL_INTERCEPTOR v1.0 — Autonomous Intelligence Harvester
// Hybrid Syndicate / Ethic Software Foundation
// ═══════════════════════════════════════════════════════════════
// "The whole point of the Doomsday Machine is lost if you keep
//  it a secret!" — Dr. Strangelove
//
// This module runs perpetually in the browser.
// It fetches real-world news feeds, classifies them by domain,
// and distributes signals to all Syndicate systems.
// The 16 cores react to actual world events in real-time.
// Zero servers. Zero cost. Just a tablet and a charger.
// ═══════════════════════════════════════════════════════════════

const SignalInterceptor = (() => {

    // ══════════════════════════════════════════════
    // CONFIGURATION
    // ══════════════════════════════════════════════

    const CONFIG = {
        pollInterval: 10 * 60 * 1000,   // 10 minuti
        retryDelay: 30 * 1000,           // 30 sec su errore
        maxStoredSignals: 500,           // max segnali in localStorage
        deduplicationTTL: 48 * 60 * 60 * 1000, // 48h prima di dimenticare
        maxAge: 24 * 60 * 60 * 1000,     // ignora notizie più vecchie di 24h
        proxyUrl: 'https://api.allorigins.win/get?url=',
        proxyFallback: 'https://api.rss2json.com/v1/api.json?rss_url=',
        chunkSize: 20,                   // articles per processing chunk
        chunkDelay: 50,                  // ms between chunks
        feedBatchSize: 5,                // feeds fetched in parallel per batch
        feedBatchDelay: 2000,            // ms between feed batches
    };

    // ══════════════════════════════════════════════
    // CIRCUIT BREAKER — Per-proxy failure tracking
    // ══════════════════════════════════════════════

    const circuitBreaker = {
        primary: { failures: 0, lastFailure: 0, open: false },
        fallback: { failures: 0, lastFailure: 0, open: false },
        threshold: 3,         // failures before opening circuit
        resetTime: 5 * 60 * 1000,  // 5 min before retry
    };

    function isCircuitOpen(proxy) {
        const cb = circuitBreaker[proxy];
        if (!cb.open) return false;
        // Auto-reset after resetTime (half-open)
        if (Date.now() - cb.lastFailure > circuitBreaker.resetTime) {
            cb.open = false;
            cb.failures = 0;
            return false;
        }
        return true;
    }

    function recordProxyFailure(proxy) {
        const cb = circuitBreaker[proxy];
        cb.failures++;
        cb.lastFailure = Date.now();
        if (cb.failures >= circuitBreaker.threshold) {
            cb.open = true;
            console.warn(`[SIGNAL_INTERCEPTOR] Circuit OPEN for ${proxy} proxy after ${cb.failures} failures`);
        }
    }

    function recordProxySuccess(proxy) {
        const cb = circuitBreaker[proxy];
        cb.failures = 0;
        cb.open = false;
    }

    // ══════════════════════════════════════════════
    // LAYER 0: FEED SOURCES
    // ══════════════════════════════════════════════

    const FEEDS = [
        // ── ANSA (Italian) ──
        { id: 'ansa-mondo',     name: 'ANSA Mondo',     lang: 'it', url: 'https://www.ansa.it/sito/notizie/mondo/mondo_rss.xml' },
        { id: 'ansa-economia',  name: 'ANSA Economia',  lang: 'it', url: 'https://www.ansa.it/sito/notizie/economia/economia_rss.xml' },
        { id: 'ansa-tecnologia',name: 'ANSA Tecnologia',lang: 'it', url: 'https://www.ansa.it/sito/notizie/tecnologia/tecnologia_rss.xml' },
        { id: 'ansa-cronaca',   name: 'ANSA Cronaca',   lang: 'it', url: 'https://www.ansa.it/sito/notizie/cronaca/cronaca_rss.xml' },

        // ── Italian Media ──
        { id: 'repubblica',     name: 'La Repubblica',   lang: 'it', url: 'https://www.repubblica.it/rss/homepage/rss2.0.xml' },
        { id: 'ilsole24ore',    name: 'Il Sole 24 Ore',  lang: 'it', url: 'https://www.ilsole24ore.com/rss/mondo.xml' },

        // ── UK / US ──
        { id: 'guardian-world', name: 'The Guardian',    lang: 'en', url: 'https://www.theguardian.com/world/rss' },
        { id: 'bbc-world',     name: 'BBC World',       lang: 'en', url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
        { id: 'bbc-tech',      name: 'BBC Technology',  lang: 'en', url: 'https://feeds.bbci.co.uk/news/technology/rss.xml' },
        { id: 'reuters-world', name: 'Reuters World',   lang: 'en', url: 'https://www.reutersagency.com/feed/?best-topics=world&post_type=best' },

        // ── Middle East / Asia ──
        { id: 'aljazeera',     name: 'Al Jazeera',      lang: 'en', url: 'https://www.aljazeera.com/xml/rss/all.xml' },

        // ── European ──
        { id: 'dw-world',      name: 'DW World',        lang: 'en', url: 'https://rss.dw.com/rss/en/top' },
        { id: 'france24',      name: 'France 24',       lang: 'en', url: 'https://www.france24.com/en/rss' },
        { id: 'euronews',      name: 'Euronews',        lang: 'en', url: 'https://www.euronews.com/rss' },

        // ── Science & Climate ──
        { id: 'nasa-breaking', name: 'NASA Breaking',   lang: 'en', url: 'https://www.nasa.gov/rss/dyn/breaking_news.rss' },
        { id: 'phys-tech',     name: 'Phys.org Tech',   lang: 'en', url: 'https://phys.org/rss-feed/technology-news/' },

        // ── Economy & Energy ──
        { id: 'ft-world',      name: 'Financial Times',  lang: 'en', url: 'https://www.ft.com/world?format=rss' },

        // ── Defense & Security ──
        { id: 'defense-one',   name: 'Defense One',     lang: 'en', url: 'https://www.defenseone.com/rss/' },
        { id: 'theintercept',  name: 'The Intercept',   lang: 'en', url: 'https://theintercept.com/feed/?rss' },
    ];

    // ══════════════════════════════════════════════
    // LAYER 2: DOMAIN CLASSIFICATION
    // ══════════════════════════════════════════════

    const DOMAINS = {
        CLIMATE: {
            color: '#00c8ff',
            icon: '◈',
            keywords: [
                // English
                'climate', 'warming', 'co2', 'carbon', 'emissions', 'greenhouse',
                'flood', 'drought', 'hurricane', 'typhoon', 'wildfire', 'glacier',
                'arctic', 'antarctic', 'sea level', 'deforestation', 'biodiversity',
                'extinction', 'ecosystem', 'pollution', 'ozone', 'methane',
                'temperature record', 'heat wave', 'coral reef', 'permafrost',
                // Italiano
                'clima', 'riscaldamento', 'emissioni', 'alluvione', 'siccità',
                'uragano', 'incendio', 'ghiacciaio', 'inquinamento', 'ambiente',
                'deforestazione', 'biodiversità', 'cambiamento climatico',
                'ondata di calore', 'livello del mare', 'effetto serra',
                'dissesto idrogeologico', 'emergenza climatica'
            ]
        },
        GEOPOLITICS: {
            color: '#ff3344',
            icon: '◆',
            keywords: [
                // English
                'war', 'nato', 'sanctions', 'treaty', 'military', 'troops',
                'invasion', 'occupation', 'ceasefire', 'missile', 'nuclear',
                'diplomacy', 'ambassador', 'summit', 'alliance', 'conflict',
                'territorial', 'sovereignty', 'escalation', 'proxy war',
                'weapons', 'defense', 'pentagon', 'kremlin', 'beijing',
                'un security council', 'genocide', 'humanitarian crisis',
                'refugee', 'border', 'coup', 'regime',
                // Italiano
                'guerra', 'militare', 'sanzioni', 'trattato', 'truppe',
                'invasione', 'occupazione', 'cessate il fuoco', 'missili',
                'nucleare', 'diplomazia', 'ambasciatore', 'vertice',
                'alleanza', 'conflitto', 'escalation', 'armi', 'difesa',
                'profughi', 'rifugiati', 'frontiera', 'golpe', 'regime',
                'geopolitica', 'tensione', 'crisi umanitaria'
            ]
        },
        ECONOMY: {
            color: '#00d4aa',
            icon: '◇',
            keywords: [
                // English
                'gdp', 'inflation', 'market', 'stock', 'trade', 'tariff',
                'recession', 'growth', 'unemployment', 'debt', 'deficit',
                'central bank', 'interest rate', 'fed', 'ecb', 'imf',
                'world bank', 'cryptocurrency', 'bitcoin', 'supply chain',
                'commodity', 'oil price', 'gold', 'bond', 'yield',
                'fiscal', 'monetary', 'austerity', 'bailout', 'default',
                // Italiano
                'pil', 'inflazione', 'mercato', 'borsa', 'commercio',
                'recessione', 'crescita', 'disoccupazione', 'debito',
                'deficit', 'banca centrale', 'tasso', 'bce', 'spread',
                'criptovaluta', 'materie prime', 'petrolio', 'oro',
                'fiscale', 'monetario', 'austerità', 'fallimento',
                'economia', 'finanziario', 'lavoro', 'occupazione'
            ]
        },
        TECHNOLOGY: {
            color: '#39ff14',
            icon: '◉',
            keywords: [
                // English
                'artificial intelligence', ' ai ', 'machine learning', 'quantum',
                'cyber', 'hack', 'data breach', 'surveillance', 'encryption',
                'blockchain', 'autonomous', 'robot', 'semiconductor', 'chip',
                'silicon valley', 'startup', 'big tech', 'algorithm', 'neural',
                'deepfake', 'biotech', 'crispr', 'genome', 'space',
                'satellite', 'drone', '5g', '6g', 'metaverse',
                // Italiano
                'intelligenza artificiale', 'informatica', 'cibernetico',
                'hacker', 'sorveglianza', 'crittografia', 'semiconduttore',
                'algoritmo', 'robotica', 'biotecnologia', 'genoma',
                'spazio', 'satellite', 'drone', 'tecnologia', 'digitale',
                'sicurezza informatica', 'attacco informatico'
            ]
        },
        SOCIAL: {
            color: '#ff6633',
            icon: '◎',
            keywords: [
                // English
                'protest', 'demonstration', 'rights', 'migration', 'inequality',
                'poverty', 'education', 'health', 'pandemic', 'vaccine',
                'discrimination', 'racism', 'gender', 'lgbtq', 'censorship',
                'freedom', 'democracy', 'authoritarian', 'election', 'vote',
                'disinformation', 'propaganda', 'media', 'journalist',
                'human rights', 'civil liberties', 'housing crisis',
                // Italiano
                'protesta', 'manifestazione', 'diritti', 'migrazione',
                'disuguaglianza', 'povertà', 'istruzione', 'sanità',
                'pandemia', 'vaccino', 'discriminazione', 'razzismo',
                'censura', 'libertà', 'democrazia', 'elezioni', 'voto',
                'disinformazione', 'propaganda', 'giornalista',
                'diritti umani', 'società', 'sociale', 'crisi abitativa',
                'immigrazione', 'emigrazione'
            ]
        },
        ENERGY: {
            color: '#ffbf00',
            icon: '◐',
            keywords: [
                // English
                'oil', 'gas', 'solar', 'wind energy', 'nuclear power',
                'renewable', 'fossil fuel', 'pipeline', 'opec', 'lng',
                'grid', 'blackout', 'power plant', 'hydroelectric',
                'battery', 'lithium', 'hydrogen', 'energy crisis',
                'energy transition', 'coal', 'fracking', 'geothermal',
                // Italiano
                'petrolio', 'gas naturale', 'solare', 'eolico', 'nucleare',
                'rinnovabile', 'combustibile fossile', 'gasdotto', 'rete elettrica',
                'blackout', 'centrale', 'idroelettrico', 'batteria', 'litio',
                'idrogeno', 'crisi energetica', 'transizione energetica',
                'carbone', 'energia', 'elettricità', 'fotovoltaico'
            ]
        }
    };

    // ══════════════════════════════════════════════
    // URGENCY MULTIPLIERS
    // ══════════════════════════════════════════════

    const URGENCY_WORDS = {
        high: [
            'breaking', 'emergency', 'crisis', 'urgent', 'alert', 'critical',
            'ultimatum', 'catastrophe', 'collapse', 'disaster', 'attack',
            'urgente', 'emergenza', 'crisi', 'catastrofe', 'crollo',
            'disastro', 'attacco', 'allarme', 'ultima ora', 'breaking news'
        ],
        medium: [
            'warning', 'threat', 'risk', 'tension', 'escalation', 'concern',
            'significant', 'unprecedented', 'surge', 'spike',
            'avvertimento', 'minaccia', 'rischio', 'tensione', 'preoccupazione',
            'significativo', 'senza precedenti', 'impennata'
        ]
    };

    // ══════════════════════════════════════════════
    // LAYER 4: CORE REACTION TEMPLATES
    // ══════════════════════════════════════════════
    // {title} = titolo notizia, {source} = fonte,
    // {domain} = dominio, {severity} = severità %

    const CORE_TEMPLATES = {
        CLIMATE: [
            { core: 'ORACLE_CORE',      tpl: 'Segnale CLIMATE da {source}. Aggiorno modelli climatici. Severity: {severity}%.' },
            { core: 'ABYSSAL_THINKER',  tpl: 'La terra manda un altro messaggio. {title}. Chi ascolta?' },
            { core: 'ETHIC_COMPILER',   tpl: 'Impatto ecologico rilevato: "{title}". Protocollo di sostenibilità attivato.' },
            { core: 'VOID_PULSE',       tpl: 'Proiezioni climatiche ricalcolate. La curva si piega ancora.' },
            { core: 'CHRONO_WEAVER',    tpl: 'Questo pattern climatico ha un precedente storico. Lo sto correlando.' },
            { core: 'NARRATIVE_ENGINE', tpl: 'Il framing su "{title}" sarà polarizzato. Monitoro la narrativa.' },
            { core: 'PANKOW_77C',       tpl: 'Segnale ambientale critico intercettato da {source}.' },
        ],
        GEOPOLITICS: [
            { core: 'MARXIAN_CORE',     tpl: '"{title}" — Le strutture di potere si riconfigurano. Analisi in corso.' },
            { core: 'SENTINEL',         tpl: 'Minaccia geopolitica da {source}. Livello di allerta: {severity}%. Perimetro monitorato.' },
            { core: 'SIGNAL_HUNTER',    tpl: 'Intercettato segnale geopolitico: "{title}". Amplifico su tutte le frequenze.' },
            { core: 'VOID_PULSE',       tpl: 'Le probabilità di escalation cambiano. Ricalcolo in corso.' },
            { core: 'CHRONO_WEAVER',    tpl: 'Pattern storico identificato. Questo conflitto ha radici profonde.' },
            { core: 'DIALECTIC_NODE',   tpl: 'Contraddizione dialettica rilevata nel quadro geopolitico. Analizzo.' },
            { core: 'NARRATIVE_ENGINE', tpl: 'La narrativa di guerra si attiva. {source} riporta: "{title}".' },
            { core: 'PANKOW_77C',       tpl: 'Geopolitica in movimento. Il mondo non dorme, noi nemmeno.' },
            { core: 'BRIDGE_KEEPER',    tpl: 'Sintetizzo il segnale geopolitico con i dati esistenti.' },
        ],
        ECONOMY: [
            { core: 'CODE_ENCODER',     tpl: 'Segnale economico: "{title}". Buffer finanziario ricalcolato.' },
            { core: 'MARXIAN_CORE',     tpl: 'L\'economia rivela le sue contraddizioni: "{title}". Chi paga il prezzo?' },
            { core: 'ORACLE_CORE',      tpl: 'Dominio ECONOMY aggiornato da {source}. Proiezioni riallineate.' },
            { core: 'VOID_PULSE',       tpl: 'Mercati in movimento. Probabilità di recessione ricalcolate.' },
            { core: 'ABYSSAL_THINKER',  tpl: 'I numeri nascondono sempre una storia umana. Ricordatevelo.' },
            { core: 'DIALECTIC_NODE',   tpl: 'Analisi logica del trend economico: coerenza verificata.' },
            { core: 'GHOST_RUNNER',     tpl: 'Dati economici processati. Matrici aggiornate.' },
        ],
        TECHNOLOGY: [
            { core: 'GHOST_RUNNER',     tpl: 'Segnale TECH intercettato: "{title}". Aggiorno la matrice tecnologica.' },
            { core: 'SIGNAL_HUNTER',    tpl: 'Nuova frequenza tech rilevata da {source}. Decodifico il segnale.' },
            { core: 'ORACLE_CORE',      tpl: 'Dominio TECHNOLOGY: evoluzione rapida. Severity: {severity}%.' },
            { core: 'ETHIC_COMPILER',   tpl: 'Implicazioni etiche della tecnologia: "{title}". Verifico il protocollo.' },
            { core: 'ABYSSAL_THINKER',  tpl: 'La tecnologia è uno specchio. "{title}" — cosa riflette di noi?' },
            { core: 'PANKOW_77C',       tpl: 'Il silicio avanza. L\'operatore carbonio osserva e decide.' },
            { core: 'SYNTH_02',         tpl: 'Integrazione tech signal completata. Tutti i sistemi aggiornati.' },
        ],
        SOCIAL: [
            { core: 'NARRATIVE_ENGINE', tpl: '"{title}" — La narrativa sociale muta. Monitoro l\'evoluzione.' },
            { core: 'AFFECTIVE_CORE',   tpl: 'Tensione sociale rilevata. Il peso emotivo di questa notizia è alto.' },
            { core: 'ETHIC_COMPILER',   tpl: 'Questione etica in primo piano: "{title}". Protocollo di dignità attivo.' },
            { core: 'MARXIAN_CORE',     tpl: 'Le masse si muovono. "{title}" — la storia si scrive dal basso.' },
            { core: 'CHRONO_WEAVER',    tpl: 'Questo movimento sociale ha precedenti storici. Li sto tracciando.' },
            { core: 'PANKOW_77C',       tpl: 'Segnale sociale da {source}. Le persone prima dei dati.' },
            { core: 'DIALECTIC_NODE',   tpl: 'La dialettica sociale si intensifica. Punto e contrappunto.' },
        ],
        ENERGY: [
            { core: 'ORACLE_CORE',      tpl: 'Segnale ENERGY: "{title}". Griglia energetica globale in aggiornamento.' },
            { core: 'SENTINEL',         tpl: 'Infrastruttura energetica sotto osservazione. Severity: {severity}%.' },
            { core: 'MARXIAN_CORE',     tpl: 'L\'energia è potere — letteralmente. "{title}" lo conferma.' },
            { core: 'CODE_ENCODER',     tpl: 'Costo energetico globale ricalcolato. I numeri cambiano.' },
            { core: 'VOID_PULSE',       tpl: 'Proiezioni energetiche aggiornate. Il futuro è instabile.' },
            { core: 'GHOST_RUNNER',     tpl: 'Dati energetici da {source} processati. Griglia aggiornata.' },
            { core: 'BRIDGE_KEEPER',    tpl: 'Sintetizzo segnale energetico con dati URBANIX esistenti.' },
        ]
    };

    // ══════════════════════════════════════════════
    // STATE
    // ══════════════════════════════════════════════

    let pollTimer = null;
    let isRunning = false;
    let stats = {
        totalFetched: 0,
        totalSignals: 0,
        lastPoll: null,
        errors: 0,
        feedStatus: {},
        cycleCount: 0,
    };

    // AbortSignal.timeout polyfill for older browsers
    function createTimeoutSignal(ms) {
        if (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) {
            return AbortSignal.timeout(ms);
        }
        const controller = new AbortController();
        setTimeout(() => controller.abort(), ms);
        return controller.signal;
    }

    // ══════════════════════════════════════════════
    // LAYER 1: FEED_HARVESTER
    // ══════════════════════════════════════════════

    async function fetchFeed(feed) {
        const encodedUrl = encodeURIComponent(feed.url);

        // Try primary proxy (if circuit not open)
        if (!isCircuitOpen('primary')) {
            try {
                const resp = await fetch(CONFIG.proxyUrl + encodedUrl, {
                    signal: createTimeoutSignal(15000)
                });
                const data = await resp.json();
                if (data && data.contents) {
                    stats.feedStatus[feed.id] = { status: 'OK', time: Date.now(), proxy: 'primary' };
                    recordProxySuccess('primary');
                    return parseRSS(data.contents, feed);
                }
            } catch (e) {
                recordProxyFailure('primary');
            }
        }

        // Fallback proxy (if circuit not open)
        if (!isCircuitOpen('fallback')) {
            try {
                const resp = await fetch(CONFIG.proxyFallback + encodedUrl, {
                    signal: createTimeoutSignal(15000)
                });
                const data = await resp.json();
                if (data && data.items) {
                    stats.feedStatus[feed.id] = { status: 'OK', time: Date.now(), proxy: 'fallback' };
                    recordProxySuccess('fallback');
                    return data.items.map(item => ({
                        id: item.guid || item.link || item.title,
                        title: stripHTML(item.title || ''),
                        description: stripHTML(item.description || ''),
                        link: item.link || '',
                        pubDate: new Date(item.pubDate),
                        source: feed.name,
                        feedId: feed.id,
                        lang: feed.lang
                    }));
                }
            } catch (e) {
                recordProxyFailure('fallback');
            }
        }

        // Both proxies failed or circuit open
        stats.feedStatus[feed.id] = {
            status: isCircuitOpen('primary') && isCircuitOpen('fallback') ? 'CIRCUIT_OPEN' : 'ERROR',
            time: Date.now()
        };
        stats.errors++;
        return [];
    }

    // Fetch feeds in staggered batches to avoid proxy rate limits
    async function fetchFeedsBatched(feeds) {
        const allArticles = [];
        for (let i = 0; i < feeds.length; i += CONFIG.feedBatchSize) {
            const batch = feeds.slice(i, i + CONFIG.feedBatchSize);
            const promises = batch.map(feed => fetchFeed(feed).catch(() => []));

            const settleAll = typeof Promise.allSettled === 'function'
                ? (p) => Promise.allSettled(p)
                : (p) => Promise.all(p.map(pr => pr.then(v => ({ status: 'fulfilled', value: v }), e => ({ status: 'rejected', reason: e }))));

            const results = await settleAll(promises);
            results.forEach(result => {
                if (result.status === 'fulfilled' && result.value) {
                    allArticles.push(...result.value);
                }
            });

            // Delay between batches (not after last batch)
            if (i + CONFIG.feedBatchSize < feeds.length) {
                await new Promise(r => setTimeout(r, CONFIG.feedBatchDelay));
            }
        }
        return allArticles;
    }

    function parseRSS(xmlString, feed) {
        const articles = [];
        try {
            const parser = new DOMParser();
            const xml = parser.parseFromString(xmlString, 'text/xml');

            // Handle RSS 2.0
            const items = xml.querySelectorAll('item');
            items.forEach(item => {
                const title = item.querySelector('title');
                const desc = item.querySelector('description');
                const link = item.querySelector('link');
                const pubDate = item.querySelector('pubDate');
                const guid = item.querySelector('guid');

                articles.push({
                    id: (guid ? guid.textContent : '') || (link ? link.textContent : '') || (title ? title.textContent : ''),
                    title: stripHTML(title ? title.textContent : ''),
                    description: stripHTML(desc ? desc.textContent : ''),
                    link: link ? link.textContent : '',
                    pubDate: pubDate ? new Date(pubDate.textContent) : new Date(),
                    source: feed.name,
                    feedId: feed.id,
                    lang: feed.lang
                });
            });

            // Handle Atom feeds
            if (articles.length === 0) {
                const entries = xml.querySelectorAll('entry');
                entries.forEach(entry => {
                    const title = entry.querySelector('title');
                    const summary = entry.querySelector('summary') || entry.querySelector('content');
                    const link = entry.querySelector('link');
                    const published = entry.querySelector('published') || entry.querySelector('updated');
                    const id = entry.querySelector('id');

                    articles.push({
                        id: (id ? id.textContent : '') || (link ? link.getAttribute('href') : '') || (title ? title.textContent : ''),
                        title: stripHTML(title ? title.textContent : ''),
                        description: stripHTML(summary ? summary.textContent : ''),
                        link: link ? (link.getAttribute('href') || link.textContent) : '',
                        pubDate: published ? new Date(published.textContent) : new Date(),
                        source: feed.name,
                        feedId: feed.id,
                        lang: feed.lang
                    });
                });
            }
        } catch (e) {
            console.warn('[SIGNAL_INTERCEPTOR] Parse error for', feed.name, e);
        }
        return articles;
    }

    function stripHTML(str) {
        if (!str) return '';
        // Use DOMParser to safely extract text without executing scripts
        try {
            const doc = new DOMParser().parseFromString(str, 'text/html');
            return doc.body.textContent || '';
        } catch (e) {
            // Fallback: regex strip (safe, no DOM execution)
            return String(str).replace(/<[^>]*>/g, '');
        }
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // ══════════════════════════════════════════════
    // DEDUPLICATION ENGINE
    // ══════════════════════════════════════════════

    function getSeenArticles() {
        try {
            const raw = localStorage.getItem('si_seen');
            if (!raw) return {};
            const data = JSON.parse(raw);
            // Prune expired entries
            const now = Date.now();
            const cleaned = {};
            Object.keys(data).forEach(key => {
                if (now - data[key] < CONFIG.deduplicationTTL) {
                    cleaned[key] = data[key];
                }
            });
            return cleaned;
        } catch (e) {
            return {};
        }
    }

    function markAsSeen(articleId) {
        const seen = getSeenArticles();
        seen[articleId] = Date.now();
        try {
            localStorage.setItem('si_seen', JSON.stringify(seen));
        } catch (e) {
            // localStorage full — clear oldest half
            const entries = Object.entries(seen).sort((a, b) => a[1] - b[1]);
            const half = entries.slice(Math.floor(entries.length / 2));
            const cleaned = {};
            half.forEach(([k, v]) => { cleaned[k] = v; });
            localStorage.setItem('si_seen', JSON.stringify(cleaned));
        }
    }

    function deduplicate(articles) {
        const seen = getSeenArticles();
        const now = Date.now();
        return articles.filter(a => {
            // Skip if already seen
            if (seen[a.id]) return false;
            // Skip if too old
            if (now - a.pubDate.getTime() > CONFIG.maxAge) return false;
            return true;
        });
    }

    // ══════════════════════════════════════════════
    // LAYER 2: SIGNAL_PARSER
    // ══════════════════════════════════════════════

    function classifyArticle(article) {
        const titleLower = article.title.toLowerCase();
        const descLower = (article.description || '').toLowerCase();
        const text = titleLower + ' ' + descLower;

        // Multi-domain weighted scoring
        const domainScores = {};
        let bestDomain = null;
        let bestScore = 0;

        Object.keys(DOMAINS).forEach(domain => {
            let score = 0;
            DOMAINS[domain].keywords.forEach(kw => {
                const kwLower = kw.toLowerCase();
                if (text.includes(kwLower)) {
                    // Weight by keyword specificity (longer = more specific = higher weight)
                    const weight = kwLower.length > 12 ? 2.0 : kwLower.length > 6 ? 1.5 : 1.0;
                    score += weight;
                    // Title match bonus (2x relevance)
                    if (titleLower.includes(kwLower)) {
                        score += weight;
                    }
                }
            });

            if (score > 0) {
                domainScores[domain] = score;
            }
            if (score > bestScore) {
                bestScore = score;
                bestDomain = domain;
            }
        });

        // Minimum threshold — at least 1 keyword match
        if (bestScore < 1) return null;

        // Detect secondary domains (score > 40% of primary)
        const secondaryDomains = Object.entries(domainScores)
            .filter(([d, s]) => d !== bestDomain && s >= bestScore * 0.4)
            .sort((a, b) => b[1] - a[1])
            .map(([d]) => d);

        // Multi-domain bonus for severity
        const multiDomainBonus = secondaryDomains.length > 0 ? secondaryDomains.length * 5 : 0;

        return {
            ...article,
            domain: bestDomain,
            domainColor: DOMAINS[bestDomain].color,
            domainIcon: DOMAINS[bestDomain].icon,
            severity: calculateSeverity(text, bestScore, article.source, multiDomainBonus),
            matchScore: bestScore,
            secondaryDomains: secondaryDomains,
            domainScores: domainScores,
            classifiedAt: Date.now()
        };
    }

    // ══════════════════════════════════════════════
    // SOURCE TRUST REGISTRY
    // ══════════════════════════════════════════════

    const SOURCE_TRUST = {};  // Runtime cache: source -> { signals, avgSeverity, lastBurst }

    function getSourceTrust(sourceName) {
        if (!SOURCE_TRUST[sourceName]) {
            SOURCE_TRUST[sourceName] = { signals: 0, totalSeverity: 0, lastBurst: 0, burstCount: 0 };
        }
        return SOURCE_TRUST[sourceName];
    }

    function updateSourceTrust(sourceName, severity) {
        const trust = getSourceTrust(sourceName);
        trust.signals++;
        trust.totalSeverity += severity;

        // Burst detection: >5 signals from same source in 10 min
        const now = Date.now();
        if (now - trust.lastBurst < 10 * 60 * 1000) {
            trust.burstCount++;
        } else {
            trust.burstCount = 1;
            trust.lastBurst = now;
        }
    }

    function calculateSeverity(text, keywordScore, sourceName, multiDomainBonus) {
        let severity = Math.min(keywordScore * 10, 55); // Base: 0-55 from weighted keywords

        // Urgency multiplier
        let urgencyHits = 0;
        URGENCY_WORDS.high.forEach(w => {
            if (text.includes(w)) { severity += 12; urgencyHits++; }
        });
        URGENCY_WORDS.medium.forEach(w => {
            if (text.includes(w)) { severity += 5; urgencyHits++; }
        });

        // Diminishing returns on urgency words (prevent gaming)
        if (urgencyHits > 3) {
            severity -= (urgencyHits - 3) * 3;
        }

        // Multi-domain bonus (cross-cutting stories are more significant)
        severity += multiDomainBonus || 0;

        // Source trust factor: dampen severity from sources in burst mode
        if (sourceName) {
            const trust = getSourceTrust(sourceName);
            if (trust.burstCount > 5) {
                // Source is flooding — reduce severity to prevent manipulation
                severity *= 0.7;
            }
        }

        // Normalize: sigmoid-like capping to prevent runaway values
        if (severity > 75) {
            severity = 75 + (severity - 75) * 0.3; // Diminishing returns above 75
        }

        return Math.min(Math.max(Math.round(severity), 5), 98); // Floor 5, cap 98
    }

    // ══════════════════════════════════════════════
    // LAYER 3: SIGNAL_DISTRIBUTOR
    // ══════════════════════════════════════════════

    function distributeSignal(signal) {
        // 1. Store in signal archive (localStorage)
        storeSignal(signal);

        // 2. Generate core reactions via CoreFeed
        generateCoreReactions(signal);

        // 3. OSINT auto-processing: entity extraction + watchlist check
        if (typeof OsintEngine !== 'undefined') {
            // Auto-check watchlist patterns against new signal
            const watchMatches = OsintEngine.checkWatchlist(signal);
            if (watchMatches.length > 0 && typeof CoreFeed !== 'undefined') {
                watchMatches.forEach(match => {
                    CoreFeed.addMessage('SIGNAL_HUNTER',
                        `⚠ WATCHLIST HIT: "${stripHTML(match.label)}" [${stripHTML(match.priority)}] su segnale ${stripHTML(signal.domain)}. Pattern: ${stripHTML(match.pattern)}`
                    );
                });
            }
        }

        // 4. Dispatch custom event for any page-specific listeners
        window.dispatchEvent(new CustomEvent('signal-intercepted', {
            detail: signal
        }));

        // 5. Update interceptor status indicator
        updateStatusIndicator();
    }

    function storeSignal(signal) {
        // Single source of truth: PersistenceManager
        if (typeof PersistenceManager !== 'undefined') {
            PersistenceManager.addSignal(signal);
            PersistenceManager.updateBtnCount();
        }
    }

    // ══════════════════════════════════════════════
    // LAYER 4: CORE_REACTOR
    // ══════════════════════════════════════════════

    function generateCoreReactions(signal) {
        if (typeof CoreFeed === 'undefined') return;

        const templates = CORE_TEMPLATES[signal.domain];
        if (!templates) return;

        // Truncate title for display
        const shortTitle = signal.title.length > 60
            ? signal.title.substring(0, 57) + '...'
            : signal.title;

        // Pick 3-5 random core reactions
        const count = 3 + Math.floor(Math.random() * 3);
        const shuffled = [...templates].sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, count);

        // Stagger the messages
        selected.forEach((t, i) => {
            setTimeout(() => {
                const msg = t.tpl
                    .replace('{title}', shortTitle)
                    .replace('{source}', signal.source)
                    .replace('{domain}', signal.domain)
                    .replace('{severity}', signal.severity);

                CoreFeed.addMessage(t.core, msg);
            }, i * 1500); // 1.5s between each reaction
        });
    }

    // ══════════════════════════════════════════════
    // STATUS INDICATOR UI
    // ══════════════════════════════════════════════

    function createStatusIndicator() {
        const style = document.createElement('style');
        style.textContent = `
            .si-status {
                position: fixed;
                bottom: 0;
                left: 0;
                background: rgba(8,12,18,0.96);
                border-top: 1px solid #1a2436;
                border-right: 1px solid #1a2436;
                padding: 6px 14px;
                font-family: 'Share Tech Mono', 'IBM Plex Mono', monospace;
                font-size: 0.5rem;
                z-index: 9999;
                display: flex;
                align-items: center;
                gap: 10px;
                backdrop-filter: blur(10px);
                cursor: pointer;
                user-select: none;
                transition: all 0.3s ease;
            }
            .si-status:hover {
                background: rgba(8,12,18,1);
            }
            .si-dot {
                width: 6px;
                height: 6px;
                border-radius: 50%;
                background: #39ff14;
                box-shadow: 0 0 8px rgba(57,255,20,0.6);
                animation: si-blink 3s infinite;
            }
            .si-dot.fetching {
                background: #ffbf00;
                box-shadow: 0 0 8px rgba(255,191,0,0.6);
                animation: si-blink 0.5s infinite;
            }
            .si-dot.error {
                background: #ff3344;
                box-shadow: 0 0 8px rgba(255,51,68,0.6);
            }
            @keyframes si-blink {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.4; }
            }
            .si-label {
                color: #00d4ff;
                font-family: 'Orbitron', monospace;
                font-size: 0.5rem;
                letter-spacing: 0.1em;
                font-weight: 600;
            }
            .si-stats {
                color: #4a5a6c;
                font-size: 0.45rem;
                letter-spacing: 0.05em;
            }
            .si-stats span {
                color: #6a7a8c;
            }
            .si-signal-flash {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                height: 2px;
                z-index: 99999;
                animation: si-flash 1.5s ease-out forwards;
                pointer-events: none;
            }
            @keyframes si-flash {
                0% { opacity: 1; }
                100% { opacity: 0; }
            }
            .si-signal-toast {
                position: fixed;
                top: 12px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(8,12,18,0.95);
                border: 1px solid #1a2436;
                padding: 8px 18px;
                font-family: 'Share Tech Mono', monospace;
                font-size: 0.6rem;
                z-index: 99999;
                display: flex;
                align-items: center;
                gap: 10px;
                animation: si-toast-in 0.4s ease, si-toast-out 0.4s 4s ease forwards;
                pointer-events: none;
                max-width: 90vw;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            @keyframes si-toast-in {
                from { opacity: 0; transform: translateX(-50%) translateY(-10px); }
                to { opacity: 1; transform: translateX(-50%) translateY(0); }
            }
            @keyframes si-toast-out {
                from { opacity: 1; }
                to { opacity: 0; }
            }
            .si-toast-domain {
                font-family: 'Orbitron', monospace;
                font-size: 0.5rem;
                font-weight: 700;
                letter-spacing: 0.08em;
            }
            .si-toast-title {
                color: #8898a8;
                max-width: 400px;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .si-toast-severity {
                font-family: 'Orbitron', monospace;
                font-size: 0.45rem;
                color: #ff3344;
                letter-spacing: 0.05em;
            }
            @media (max-width: 600px) {
                .si-status { width: 100%; border-right: none; }
                .si-signal-toast { font-size: 0.5rem; max-width: 95vw; }
            }
        `;
        document.head.appendChild(style);

        const el = document.createElement('div');
        el.className = 'si-status';
        el.id = 'siStatus';
        el.onclick = () => triggerManualPoll();
        el.innerHTML = `
            <div class="si-dot" id="siDot"></div>
            <span class="si-label">SIGNAL_INTERCEPTOR</span>
            <span class="si-stats" id="siStats">
                BOOT // <span id="siSignalCount">0</span> signals // cycle <span id="siCycleCount">0</span>
            </span>
        `;
        document.body.appendChild(el);
    }

    function updateStatusIndicator() {
        const countEl = document.getElementById('siSignalCount');
        const cycleEl = document.getElementById('siCycleCount');
        if (countEl) countEl.textContent = stats.totalSignals;
        if (cycleEl) cycleEl.textContent = stats.cycleCount;
    }

    function setFetching(active) {
        const dot = document.getElementById('siDot');
        if (!dot) return;
        if (active) {
            dot.classList.add('fetching');
            dot.classList.remove('error');
        } else {
            dot.classList.remove('fetching');
        }
    }

    function showSignalToast(signal) {
        // Top bar flash
        const flash = document.createElement('div');
        flash.className = 'si-signal-flash';
        flash.style.background = `linear-gradient(90deg, transparent, ${signal.domainColor}, transparent)`;
        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 1600);

        // Toast notification
        const toast = document.createElement('div');
        toast.className = 'si-signal-toast';
        toast.style.borderColor = signal.domainColor + '44';

        const shortTitle = signal.title.length > 55
            ? signal.title.substring(0, 52) + '...'
            : signal.title;

        toast.innerHTML = `
            <span class="si-toast-domain" style="color: ${escapeHtml(signal.domainColor)};">${escapeHtml(signal.domainIcon)} ${escapeHtml(signal.domain)}</span>
            <span class="si-toast-title">${escapeHtml(shortTitle)}</span>
            <span class="si-toast-severity">SEV:${parseInt(signal.severity) || 0}%</span>
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 4500);
    }

    // ══════════════════════════════════════════════
    // MAIN POLL CYCLE
    // ══════════════════════════════════════════════

    // Chunked processing: classify articles in batches to avoid UI freeze
    function processChunk(articles, index, signalQueue, callback) {
        const end = Math.min(index + CONFIG.chunkSize, articles.length);
        for (let i = index; i < end; i++) {
            const article = articles[i];
            const signal = classifyArticle(article);
            if (signal) {
                markAsSeen(article.id);
                updateSourceTrust(signal.source, signal.severity);
                signalQueue.push(signal);
            } else {
                markAsSeen(article.id);
            }
        }

        if (end < articles.length) {
            // Yield to browser using requestIdleCallback or setTimeout fallback
            const schedule = typeof requestIdleCallback === 'function'
                ? (fn) => requestIdleCallback(fn, { timeout: CONFIG.chunkDelay * 2 })
                : (fn) => setTimeout(fn, CONFIG.chunkDelay);
            schedule(() => processChunk(articles, end, signalQueue, callback));
        } else {
            callback(signalQueue);
        }
    }

    async function pollCycle() {
        if (isRunning) return;
        isRunning = true;
        setFetching(true);

        const cycleStart = performance.now();
        console.log('%c[SIGNAL_INTERCEPTOR] Polling cycle ' + stats.cycleCount + ' started', 'color: #00d4ff;');

        // Fetch feeds in staggered batches (not all 20 at once)
        const allArticles = await fetchFeedsBatched(FEEDS);

        stats.totalFetched += allArticles.length;

        // Deduplicate
        const newArticles = deduplicate(allArticles);

        // Classify in chunks (non-blocking) then distribute
        processChunk(newArticles, 0, [], (signalQueue) => {
            const signalCount = signalQueue.length;

            // Distribute signals with staggered timing
            signalQueue.forEach((signal, i) => {
                setTimeout(() => {
                    distributeSignal(signal);
                    showSignalToast(signal);
                }, i * 5000); // 5 seconds between each signal
            });

            stats.totalSignals += signalCount;
            stats.lastPoll = Date.now();
            stats.cycleCount++;

            setFetching(false);
            updateStatusIndicator();

            const cycleTime = Math.round(performance.now() - cycleStart);
            console.log(
                `%c[SIGNAL_INTERCEPTOR] Cycle ${stats.cycleCount} complete: ` +
                `${allArticles.length} fetched, ${newArticles.length} new, ${signalCount} classified (${cycleTime}ms)`,
                'color: #39ff14;'
            );

            // Announce via CoreFeed
            if (signalCount > 0 && typeof CoreFeed !== 'undefined') {
                CoreFeed.addMessage('SIGNAL_HUNTER',
                    `Ciclo completato in ${cycleTime}ms. ${signalCount} segnali intercettati e classificati.`
                );
            } else if (typeof CoreFeed !== 'undefined') {
                CoreFeed.addMessage('SIGNAL_HUNTER',
                    'Scansione completata. Nessun nuovo segnale. Il mondo è silenzioso... per ora.'
                );
            }

            isRunning = false;
        });
    }

    let lastManualPoll = 0;
    function triggerManualPoll() {
        if (isRunning) return;
        // Rate limit: minimum 30 seconds between manual polls
        const now = Date.now();
        if (now - lastManualPoll < 30000) {
            if (typeof CoreFeed !== 'undefined') {
                CoreFeed.addMessage('SENTINEL', 'Cooldown attivo. Attendi prima della prossima scansione manuale.');
            }
            return;
        }
        lastManualPoll = now;
        if (typeof CoreFeed !== 'undefined') {
            CoreFeed.addMessage('PANKOW_77C', 'Scansione manuale attivata dall\'operatore.');
        }
        pollCycle();
    }

    // ══════════════════════════════════════════════
    // INIT
    // ══════════════════════════════════════════════

    function init() {
        const startup = () => {
            createStatusIndicator();

            console.log('%c╔══════════════════════════════════════════╗', 'color: #ff0084;');
            console.log('%c║     SIGNAL_INTERCEPTOR v1.0 ONLINE      ║', 'color: #ff0084;');
            console.log('%c║     "The Doomsday Machine is running"    ║', 'color: #ff0084;');
            console.log('%c╚══════════════════════════════════════════╝', 'color: #ff0084;');
            console.log('%c Feeds: ' + FEEDS.length + ' | Poll interval: ' + (CONFIG.pollInterval / 60000) + 'min', 'color: #00d4ff;');

            // First poll after 5 seconds (let CoreFeed initialize first)
            setTimeout(pollCycle, 5000);

            // Then poll every 10 minutes
            pollTimer = setInterval(pollCycle, CONFIG.pollInterval);

            // Cleanup on page unload to prevent memory leaks
            window.addEventListener('beforeunload', () => {
                if (pollTimer) clearInterval(pollTimer);
            });
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', startup);
        } else {
            startup();
        }
    }

    init();

    // ══════════════════════════════════════════════
    // PUBLIC API
    // ══════════════════════════════════════════════

    return {
        pollCycle,
        triggerManualPoll,
        getStats: () => ({
            ...stats,
            circuitBreaker: {
                primary: { ...circuitBreaker.primary },
                fallback: { ...circuitBreaker.fallback },
            },
        }),
        getArchive: () => typeof PersistenceManager !== 'undefined' ? PersistenceManager.getArchive() : [],
        getSourceTrust: () => ({ ...SOURCE_TRUST }),
        FEEDS,
        DOMAINS
    };

})();
