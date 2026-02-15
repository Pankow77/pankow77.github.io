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
        workerBatchCap: 200,             // max articles per worker batch
        workerCPUBudget: 10000,          // max ms before worker timeout per batch
        workerCircuitThreshold: 3,       // consecutive failures before disabling worker
        workerCircuitReset: 10 * 60 * 1000, // 10 min before retrying worker
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
    // Skips quarantined feeds, validates articles, tracks feed health
    async function fetchFeedsBatched(feeds) {
        const allArticles = [];
        // Filter out quarantined feeds
        const activeFeeds = feeds.filter(feed => {
            if (isFeedQuarantined(feed.id)) {
                console.log(`[SIGNAL_INTERCEPTOR] Skipping quarantined feed: ${feed.id}`);
                return false;
            }
            return true;
        });

        for (let i = 0; i < activeFeeds.length; i += CONFIG.feedBatchSize) {
            const batch = activeFeeds.slice(i, i + CONFIG.feedBatchSize);
            const promises = batch.map(feed => fetchFeed(feed).catch((err) => {
                recordFeedFailure(feed.id, err.message || 'fetch_error');
                return [];
            }));

            const settleAll = typeof Promise.allSettled === 'function'
                ? (p) => Promise.allSettled(p)
                : (p) => Promise.all(p.map(pr => pr.then(v => ({ status: 'fulfilled', value: v }), e => ({ status: 'rejected', reason: e }))));

            const results = await settleAll(promises);
            results.forEach((result, idx) => {
                if (result.status === 'fulfilled' && result.value) {
                    const feed = batch[idx];
                    const articles = result.value;

                    // Validate each article against schema
                    let invalidCount = 0;
                    const validArticles = [];
                    articles.forEach(article => {
                        const validation = validateArticle(article);
                        if (validation.valid) {
                            validArticles.push(article);
                        } else {
                            invalidCount++;
                        }
                    });

                    // Track feed health
                    if (articles.length > 0) {
                        recordFeedSuccess(feed.id, articles.length, invalidCount);
                    }

                    allArticles.push(...validArticles);
                } else if (result.status === 'rejected') {
                    recordFeedFailure(batch[idx].id, 'promise_rejected');
                }
            });

            // Delay between batches (not after last batch)
            if (i + CONFIG.feedBatchSize < activeFeeds.length) {
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
                    title: normalizeText(stripHTML(title ? title.textContent : '')),
                    description: normalizeText(stripHTML(desc ? desc.textContent : '')),
                    link: sanitizeUrl(link ? link.textContent : ''),
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
                        title: normalizeText(stripHTML(title ? title.textContent : '')),
                        description: normalizeText(stripHTML(summary ? summary.textContent : '')),
                        link: sanitizeUrl(link ? (link.getAttribute('href') || link.textContent) : ''),
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
    // URL SANITIZATION — Anti-injection, anti-spoof
    // ══════════════════════════════════════════════

    // Blocked URI schemes (anything beyond http/https)
    const SAFE_SCHEMES = new Set(['http:', 'https:']);

    // Unicode confusable characters → ASCII mapping (common attack vectors)
    const CONFUSABLES = {
        '\u0430': 'a', '\u0435': 'e', '\u043E': 'o', '\u0440': 'p',
        '\u0441': 'c', '\u0443': 'y', '\u0445': 'x', '\u04BB': 'h',
        '\u0456': 'i', '\u0458': 'j', '\u043A': 'k', '\u043C': 'm',
        '\u0442': 't', '\u0412': 'B', '\u041D': 'H', '\u041C': 'M',
        '\u0410': 'A', '\u041E': 'O', '\u0420': 'P', '\u0421': 'C',
        '\u0422': 'T', '\u0415': 'E', '\u041A': 'K', '\u0425': 'X',
        '\u0049': 'I', // Latin I (used as l in paypaI.com spoof)
        '\uFF21': 'A', '\uFF22': 'B', '\uFF23': 'C', // Fullwidth Latin
        '\uFF41': 'a', '\uFF42': 'b', '\uFF43': 'c',
    };

    function sanitizeUrl(url) {
        if (!url || typeof url !== 'string') return '';
        const trimmed = url.trim();
        if (trimmed.length === 0) return '';

        try {
            const parsed = new URL(trimmed);

            // 1. Block non-http(s) schemes: javascript:, data:, vbscript:, blob:, etc.
            if (!SAFE_SCHEMES.has(parsed.protocol)) return '';

            // 2. Block userinfo (@) in URLs — used for phishing: http://real.com@evil.com
            if (parsed.username || parsed.password) return '';

            // 3. Block empty hostname
            if (!parsed.hostname) return '';

            // 4. Normalize punycode — detect IDN homograph attacks
            const hostname = parsed.hostname.toLowerCase();

            // 5. Check for confusable characters in hostname
            if (hasConfusables(hostname)) {
                console.warn(`[SANITIZE] Confusable chars detected in URL hostname: ${hostname}`);
                // Don't block — flag it (the trust model will handle it)
                // but strip for display safety
            }

            return parsed.href;
        } catch (e) {
            // Invalid URL — reject
            return '';
        }
    }

    function hasConfusables(str) {
        for (let i = 0; i < str.length; i++) {
            if (CONFUSABLES[str[i]]) return true;
            // Check for mixed scripts (Cyrillic + Latin = suspicious)
            const code = str.charCodeAt(i);
            if (code >= 0x0400 && code <= 0x04FF) return true;  // Cyrillic range
            if (code >= 0xFF00 && code <= 0xFFEF) return true;  // Fullwidth forms
        }
        return false;
    }

    // ══════════════════════════════════════════════
    // UNICODE NORMALIZATION — Anti-manipulation
    // ══════════════════════════════════════════════

    // Bidi override characters that can reverse text display
    const BIDI_CHARS = /[\u200E\u200F\u202A-\u202E\u2066-\u2069\u200B\u200C\u200D\uFEFF]/g;

    // Control characters (except \n \r \t)
    const CONTROL_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g;

    function normalizeText(str) {
        if (!str || typeof str !== 'string') return '';
        return str
            .normalize('NFC')             // Unicode NFC normalization
            .replace(BIDI_CHARS, '')      // Strip bidi overrides (text direction attacks)
            .replace(CONTROL_CHARS, '')   // Strip control characters
            .trim();
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
    // SOURCE TRUST REGISTRY — Persistent across sessions
    // ══════════════════════════════════════════════

    const SOURCE_TRUST = {};  // Runtime cache: source -> trust object
    const DOMAIN_GROUPS = {}; // eTLD+1 grouping: registrable domain -> [source names]
    const GRAYLIST = {};      // source -> { reason, graylistedAt, severity penalty }

    // ── Registrable domain extraction (eTLD+1 approximation) ──
    function getRegistrableDomain(sourceName) {
        // Feed sources use human names like "BBC World", "ANSA Mondo"
        // We normalize to a group key for Sybil detection
        return sourceName.toLowerCase()
            .replace(/\s+(world|tech|technology|breaking|cronaca|economia|tecnologia|mondo)$/i, '')
            .trim();
    }

    function getSourceTrust(sourceName) {
        if (!SOURCE_TRUST[sourceName]) {
            SOURCE_TRUST[sourceName] = {
                signals: 0, totalSeverity: 0, lastBurst: 0, burstCount: 0,
                // Historical fields (persisted via IndexedDB)
                historicalSignals: 0,
                historicalSeveritySum: 0,
                firstSeen: Date.now(),
                trustScore: 50,   // 0-100 trust baseline
                driftBaseline: 0, // historical avg severity (EMA)
                // Median/MAD tracking (rolling window)
                severityWindow: [],  // last N severity values
                maxWindowSize: 50,
                // Domain grouping
                registrableDomain: getRegistrableDomain(sourceName),
            };

            // Register in domain group
            const rd = SOURCE_TRUST[sourceName].registrableDomain;
            if (!DOMAIN_GROUPS[rd]) DOMAIN_GROUPS[rd] = [];
            if (!DOMAIN_GROUPS[rd].includes(sourceName)) DOMAIN_GROUPS[rd].push(sourceName);
        }
        return SOURCE_TRUST[sourceName];
    }

    // ── Median / MAD calculation ──
    function median(arr) {
        if (arr.length === 0) return 0;
        const sorted = [...arr].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    }

    function medianAbsoluteDeviation(arr) {
        const med = median(arr);
        const deviations = arr.map(v => Math.abs(v - med));
        return median(deviations);
    }

    function updateSourceTrust(sourceName, severity) {
        const trust = getSourceTrust(sourceName);
        trust.signals++;
        trust.totalSeverity += severity;
        trust.historicalSignals++;
        trust.historicalSeveritySum += severity;

        // Rolling window for median/MAD
        trust.severityWindow.push(severity);
        if (trust.severityWindow.length > trust.maxWindowSize) {
            trust.severityWindow.shift();
        }

        // Burst detection: >5 signals from same source in 10 min
        const now = Date.now();
        if (now - trust.lastBurst < 10 * 60 * 1000) {
            trust.burstCount++;
        } else {
            trust.burstCount = 1;
            trust.lastBurst = now;
        }

        // ── Robust drift detection with Median/MAD ──
        if (trust.severityWindow.length >= 10) {
            const windowMedian = median(trust.severityWindow);
            const mad = medianAbsoluteDeviation(trust.severityWindow);

            // Modified Z-score: |severity - median| / MAD
            // If recent values consistently deviate from baseline, flag it
            const madThreshold = mad > 0 ? Math.abs(windowMedian - trust.driftBaseline) / mad : 0;

            if (trust.historicalSignals > 20) {
                if (madThreshold > 3) {
                    // Significant drift — don't punish immediately, GRAYLIST first
                    if (!GRAYLIST[sourceName]) {
                        GRAYLIST[sourceName] = {
                            reason: 'severity_drift',
                            graylistedAt: now,
                            penalty: 0.85, // 15% severity reduction
                            drift: madThreshold,
                        };
                        console.warn(`[TRUST] Graylisted ${sourceName}: drift=${madThreshold.toFixed(2)}, median=${windowMedian.toFixed(1)}, baseline=${trust.driftBaseline.toFixed(1)}`);
                    }
                    trust.trustScore = Math.max(trust.trustScore - 1, 15);
                } else if (madThreshold < 1.5) {
                    // Stable — recover trust slowly
                    trust.trustScore = Math.min(trust.trustScore + 0.3, 95);
                    // Un-graylist if stable for long enough
                    if (GRAYLIST[sourceName] && (now - GRAYLIST[sourceName].graylistedAt > 30 * 60 * 1000)) {
                        delete GRAYLIST[sourceName];
                        console.log(`[TRUST] ${sourceName} removed from graylist (stable)`);
                    }
                }
            }
        } else if (trust.historicalSignals > 20) {
            // Fallback: simple EMA drift
            const recentAvg = trust.totalSeverity / trust.signals;
            const drift = Math.abs(recentAvg - trust.driftBaseline);
            if (drift > 15) {
                trust.trustScore = Math.max(trust.trustScore - 2, 10);
            } else {
                trust.trustScore = Math.min(trust.trustScore + 0.5, 95);
            }
        }

        // Update drift baseline with exponential moving average
        const historicalAvg = trust.historicalSeveritySum / trust.historicalSignals;
        trust.driftBaseline = trust.driftBaseline === 0
            ? historicalAvg
            : trust.driftBaseline * 0.95 + (trust.totalSeverity / trust.signals) * 0.05;

        // ── Sybil detection: check domain group for coordinated behavior ──
        const rd = trust.registrableDomain;
        if (DOMAIN_GROUPS[rd] && DOMAIN_GROUPS[rd].length > 1) {
            // Multiple sources from same registrable domain — check coordination
            let groupBurstCount = 0;
            DOMAIN_GROUPS[rd].forEach(src => {
                if (SOURCE_TRUST[src] && SOURCE_TRUST[src].burstCount > 3) groupBurstCount++;
            });
            if (groupBurstCount >= 2) {
                // Coordinated burst from same domain group
                trust.trustScore = Math.max(trust.trustScore - 3, 10);
            }
        }

        // Age-based trust floor: newer sources have lower floor
        const ageMs = now - trust.firstSeen;
        const ageDays = ageMs / (24 * 60 * 60 * 1000);
        if (ageDays < 1) {
            trust.trustScore = Math.min(trust.trustScore, 40); // Brand new: cap at 40
        } else if (ageDays < 7) {
            trust.trustScore = Math.min(trust.trustScore, 60); // Young: cap at 60
        }

        // Persist to IndexedDB every 10 signals
        if (trust.historicalSignals % 10 === 0) {
            persistSourceReputation(sourceName, trust);
        }
    }

    // Check if source is graylisted and get penalty
    function getGraylistPenalty(sourceName) {
        const entry = GRAYLIST[sourceName];
        if (!entry) return 1.0; // No penalty
        return entry.penalty;   // e.g. 0.85 = 15% reduction
    }

    // Persist reputation to IndexedDB
    function persistSourceReputation(sourceName, trust) {
        if (typeof IndexedStore === 'undefined' || !IndexedStore.isAvailable()) return;
        IndexedStore.saveReputation({
            source: sourceName,
            historicalSignals: trust.historicalSignals,
            historicalSeveritySum: trust.historicalSeveritySum,
            firstSeen: trust.firstSeen,
            trustScore: trust.trustScore,
            driftBaseline: trust.driftBaseline,
            registrableDomain: trust.registrableDomain,
            lastUpdated: Date.now(),
        });
    }

    // Load persisted reputations on startup
    async function loadSourceReputations() {
        if (typeof IndexedStore === 'undefined' || !IndexedStore.isAvailable()) return;
        try {
            const reps = await IndexedStore.getAllReputations();
            reps.forEach(rep => {
                if (!SOURCE_TRUST[rep.source]) {
                    SOURCE_TRUST[rep.source] = {
                        signals: 0, totalSeverity: 0, lastBurst: 0, burstCount: 0,
                        historicalSignals: rep.historicalSignals || 0,
                        historicalSeveritySum: rep.historicalSeveritySum || 0,
                        firstSeen: rep.firstSeen || Date.now(),
                        trustScore: rep.trustScore || 50,
                        driftBaseline: rep.driftBaseline || 0,
                    };
                } else {
                    // Merge persisted data with runtime
                    const t = SOURCE_TRUST[rep.source];
                    t.historicalSignals = rep.historicalSignals || t.historicalSignals;
                    t.historicalSeveritySum = rep.historicalSeveritySum || t.historicalSeveritySum;
                    t.firstSeen = rep.firstSeen || t.firstSeen;
                    t.trustScore = rep.trustScore || t.trustScore;
                    t.driftBaseline = rep.driftBaseline || t.driftBaseline;
                }
            });
            if (reps.length > 0) {
                console.log(`[SIGNAL_INTERCEPTOR] Loaded ${reps.length} source reputations from IndexedDB`);
            }
        } catch (e) {
            // Silently continue without historical data
        }
    }

    // ══════════════════════════════════════════════
    // FEED VALIDATION — Schema enforcement
    // ══════════════════════════════════════════════

    const FEED_SCHEMA = {
        required: ['id', 'title', 'source'],
        titleMaxLen: 500,
        descMaxLen: 5000,
        linkPattern: /^https?:\/\//,
    };

    function validateArticle(article) {
        if (!article || typeof article !== 'object') return { valid: false, reason: 'not_object' };
        if (!article.title || typeof article.title !== 'string' || article.title.trim().length === 0) {
            return { valid: false, reason: 'missing_title' };
        }
        if (!article.id) return { valid: false, reason: 'missing_id' };
        if (!article.source || typeof article.source !== 'string') {
            return { valid: false, reason: 'missing_source' };
        }
        // Truncate oversized fields
        if (article.title.length > FEED_SCHEMA.titleMaxLen) {
            article.title = article.title.substring(0, FEED_SCHEMA.titleMaxLen);
        }
        if (article.description && article.description.length > FEED_SCHEMA.descMaxLen) {
            article.description = article.description.substring(0, FEED_SCHEMA.descMaxLen);
        }
        // Validate link format if present
        if (article.link && !FEED_SCHEMA.linkPattern.test(article.link)) {
            article.link = '';
        }
        return { valid: true };
    }

    // ══════════════════════════════════════════════
    // FEED QUARANTINE — Malformed feed isolation
    // ══════════════════════════════════════════════

    const FEED_HEALTH = {};  // feedId -> { successes, failures, lastFailure, quarantined }

    function getFeedHealth(feedId) {
        if (!FEED_HEALTH[feedId]) {
            FEED_HEALTH[feedId] = {
                successes: 0, failures: 0,
                totalArticles: 0, invalidArticles: 0,
                lastFailure: 0, quarantined: false, quarantinedAt: 0,
            };
        }
        return FEED_HEALTH[feedId];
    }

    function recordFeedSuccess(feedId, articleCount, invalidCount) {
        const health = getFeedHealth(feedId);
        health.successes++;
        health.totalArticles += articleCount;
        health.invalidArticles += invalidCount;

        // Auto-unquarantine if 3 consecutive successes with low invalid rate
        if (health.quarantined && health.successes >= 3) {
            const invalidRate = health.totalArticles > 0
                ? health.invalidArticles / health.totalArticles : 0;
            if (invalidRate < 0.3) {
                health.quarantined = false;
                health.failures = 0;
                console.log(`[SIGNAL_INTERCEPTOR] Feed ${feedId} released from quarantine`);
                if (typeof IndexedStore !== 'undefined') {
                    IndexedStore.removeFromQuarantine(feedId);
                }
            }
        }
    }

    function recordFeedFailure(feedId, reason) {
        const health = getFeedHealth(feedId);
        health.failures++;
        health.lastFailure = Date.now();
        health.successes = 0; // Reset consecutive successes

        // Quarantine after 5 consecutive failures
        if (health.failures >= 5 && !health.quarantined) {
            health.quarantined = true;
            health.quarantinedAt = Date.now();
            console.warn(`[SIGNAL_INTERCEPTOR] Feed ${feedId} QUARANTINED after ${health.failures} failures: ${reason}`);

            if (typeof IndexedStore !== 'undefined') {
                IndexedStore.saveQuarantineEntry({
                    feedId, reason,
                    quarantinedAt: health.quarantinedAt,
                    failures: health.failures,
                });
            }

            if (typeof CoreFeed !== 'undefined') {
                CoreFeed.addMessage('SENTINEL',
                    `Feed quarantined: ${feedId} (${reason}). Troppi errori consecutivi.`
                );
            }
        }
    }

    function isFeedQuarantined(feedId) {
        const health = getFeedHealth(feedId);
        if (!health.quarantined) return false;

        // Auto-release after 1 hour (retry)
        if (Date.now() - health.quarantinedAt > 60 * 60 * 1000) {
            health.quarantined = false;
            health.failures = 0;
            return false;
        }
        return true;
    }

    // Load quarantine state from IndexedDB on startup
    async function loadQuarantineState() {
        if (typeof IndexedStore === 'undefined' || !IndexedStore.isAvailable()) return;
        try {
            const entries = await IndexedStore.getAllQuarantined();
            entries.forEach(entry => {
                const health = getFeedHealth(entry.feedId);
                health.quarantined = true;
                health.quarantinedAt = entry.quarantinedAt || Date.now();
                health.failures = entry.failures || 5;
            });
            if (entries.length > 0) {
                console.log(`[SIGNAL_INTERCEPTOR] Loaded ${entries.length} quarantined feeds from IndexedDB`);
            }
        } catch (e) { /* continue */ }
    }

    // ══════════════════════════════════════════════
    // WEB WORKER INTEGRATION
    // ══════════════════════════════════════════════

    let worker = null;
    let workerReady = false;
    let workerCallbacks = {};  // messageId -> callback
    let workerMsgId = 0;

    // Worker circuit breaker — disable after consecutive failures
    const workerCircuit = {
        failures: 0,
        lastFailure: 0,
        disabled: false,
    };

    function isWorkerDisabled() {
        if (!workerCircuit.disabled) return false;
        // Auto-reset after configured time
        if (Date.now() - workerCircuit.lastFailure > CONFIG.workerCircuitReset) {
            workerCircuit.disabled = false;
            workerCircuit.failures = 0;
            console.log('[SIGNAL_INTERCEPTOR] Worker circuit breaker reset — retrying');
            return false;
        }
        return true;
    }

    function recordWorkerFailure() {
        workerCircuit.failures++;
        workerCircuit.lastFailure = Date.now();
        if (workerCircuit.failures >= CONFIG.workerCircuitThreshold) {
            workerCircuit.disabled = true;
            console.warn(`[SIGNAL_INTERCEPTOR] Worker circuit OPEN after ${workerCircuit.failures} failures — disabled for ${CONFIG.workerCircuitReset / 60000}min`);
        }
    }

    function recordWorkerSuccess() {
        workerCircuit.failures = 0;
        workerCircuit.disabled = false;
    }

    function initWorker() {
        if (typeof Worker === 'undefined') return false;
        try {
            worker = new Worker('js/signal-worker.js');
            worker.onmessage = (e) => {
                const msg = e.data;
                // Validate message schema from worker
                if (!msg || typeof msg !== 'object' || !msg.type) return;

                if (msg.type === 'ready') {
                    workerReady = true;
                    console.log('%c[SIGNAL_INTERCEPTOR] Web Worker ONLINE — classification off main thread', 'color: #39ff14;');
                } else if (msg.type === 'classified') {
                    // Validate response payload
                    if (typeof msg.id !== 'number' || !Array.isArray(msg.payload)) {
                        console.warn('[SIGNAL_INTERCEPTOR] Invalid worker response — ignoring');
                        return;
                    }
                    const cb = workerCallbacks[msg.id];
                    if (cb) {
                        recordWorkerSuccess();
                        cb(msg.payload);
                        delete workerCallbacks[msg.id];
                    }
                } else if (msg.type === 'error') {
                    console.warn('[SIGNAL_INTERCEPTOR] Worker error:', msg.message);
                    recordWorkerFailure();
                }
            };
            worker.onerror = (e) => {
                console.warn('[SIGNAL_INTERCEPTOR] Worker failed, falling back to main thread:', e.message);
                recordWorkerFailure();
                workerReady = false;
                worker = null;
            };
            // Initialize worker with domain/urgency config
            worker.postMessage({
                type: 'init',
                payload: { domains: DOMAINS, urgencyWords: URGENCY_WORDS }
            });
            return true;
        } catch (e) {
            console.warn('[SIGNAL_INTERCEPTOR] Worker init failed:', e);
            return false;
        }
    }

    function classifyViaWorker(articles) {
        return new Promise((resolve) => {
            // Check worker circuit breaker
            if (!worker || !workerReady || isWorkerDisabled()) {
                resolve(null);
                return;
            }

            // Batch cap: limit articles sent to worker
            const batch = articles.length > CONFIG.workerBatchCap
                ? articles.slice(0, CONFIG.workerBatchCap)
                : articles;

            const id = ++workerMsgId;
            const startTime = performance.now();
            workerCallbacks[id] = (result) => {
                const elapsed = performance.now() - startTime;
                if (elapsed > CONFIG.workerCPUBudget) {
                    console.warn(`[SIGNAL_INTERCEPTOR] Worker took ${Math.round(elapsed)}ms — over CPU budget (${CONFIG.workerCPUBudget}ms)`);
                }
                resolve(result);
            };

            // Timeout with circuit breaker integration
            setTimeout(() => {
                if (workerCallbacks[id]) {
                    delete workerCallbacks[id];
                    recordWorkerFailure();
                    console.warn('[SIGNAL_INTERCEPTOR] Worker timeout — falling back to main thread');
                    resolve(null);
                }
            }, CONFIG.workerCPUBudget + 5000); // budget + 5s grace

            worker.postMessage({
                type: 'classify',
                id: id,
                payload: { articles: batch }
            });
        });
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

        // Source trust factor: dampen severity from sources in burst mode or graylisted
        if (sourceName) {
            const trust = getSourceTrust(sourceName);
            if (trust.burstCount > 5) {
                // Source is flooding — reduce severity to prevent manipulation
                severity *= 0.7;
            }
            // Apply graylist penalty (sources with suspicious drift)
            severity *= getGraylistPenalty(sourceName);
            // Apply trust score weighting (low-trust sources get dampened)
            if (trust.trustScore < 30) {
                severity *= 0.75;
            } else if (trust.trustScore < 50) {
                severity *= 0.9;
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

        // Try Web Worker classification first, fallback to main-thread chunked processing
        const workerResult = await classifyViaWorker(newArticles);

        if (workerResult !== null) {
            // Worker succeeded — mark all articles as seen (worker can't access localStorage)
            newArticles.forEach(a => markAsSeen(a.id));
            finalizeCycle(workerResult, allArticles.length, newArticles.length, cycleStart);
        } else {
            // Fallback: main-thread chunked classification
            processChunk(newArticles, 0, [], (signalQueue) => {
                finalizeCycle(signalQueue, allArticles.length, newArticles.length, cycleStart);
            });
        }
    }

    function finalizeCycle(signalQueue, fetchedCount, newCount, cycleStart) {
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
        const workerTag = workerReady ? ' [WORKER]' : ' [MAIN]';
        console.log(
            `%c[SIGNAL_INTERCEPTOR] Cycle ${stats.cycleCount} complete${workerTag}: ` +
            `${fetchedCount} fetched, ${newCount} new, ${signalCount} classified (${cycleTime}ms)`,
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
        const startup = async () => {
            createStatusIndicator();

            // Initialize Web Worker for off-main-thread classification
            initWorker();

            // Load persisted state from IndexedDB
            await loadSourceReputations();
            await loadQuarantineState();

            // Trigger IndexedDB migration from localStorage
            if (typeof IndexedStore !== 'undefined') {
                IndexedStore.migrateFromLocalStorage();
            }

            console.log('%c╔══════════════════════════════════════════╗', 'color: #ff0084;');
            console.log('%c║     SIGNAL_INTERCEPTOR v2.0 ONLINE      ║', 'color: #ff0084;');
            console.log('%c║     "The Doomsday Machine is running"    ║', 'color: #ff0084;');
            console.log('%c╚══════════════════════════════════════════╝', 'color: #ff0084;');
            console.log('%c Feeds: ' + FEEDS.length + ' | Poll interval: ' + (CONFIG.pollInterval / 60000) + 'min | Worker: ' + (workerReady ? 'ON' : 'OFF'), 'color: #00d4ff;');

            // First poll after 5 seconds (let CoreFeed initialize first)
            setTimeout(pollCycle, 5000);

            // Then poll every 10 minutes
            pollTimer = setInterval(pollCycle, CONFIG.pollInterval);

            // Cleanup on page unload — persist all reputations
            window.addEventListener('beforeunload', () => {
                if (pollTimer) clearInterval(pollTimer);
                if (worker) worker.terminate();
                // Persist all source reputations on exit
                Object.keys(SOURCE_TRUST).forEach(source => {
                    persistSourceReputation(source, SOURCE_TRUST[source]);
                });
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
            workerActive: workerReady,
            circuitBreaker: {
                primary: { ...circuitBreaker.primary },
                fallback: { ...circuitBreaker.fallback },
            },
        }),
        getArchive: () => typeof PersistenceManager !== 'undefined' ? PersistenceManager.getArchive() : [],
        getSourceTrust: () => {
            const result = {};
            Object.keys(SOURCE_TRUST).forEach(k => {
                const t = SOURCE_TRUST[k];
                result[k] = {
                    signals: t.signals, trustScore: t.trustScore,
                    historicalSignals: t.historicalSignals, burstCount: t.burstCount,
                    driftBaseline: t.driftBaseline, registrableDomain: t.registrableDomain,
                    graylisted: !!GRAYLIST[k],
                    severityMedian: t.severityWindow.length >= 5 ? median(t.severityWindow) : null,
                    severityMAD: t.severityWindow.length >= 5 ? medianAbsoluteDeviation(t.severityWindow) : null,
                };
            });
            return result;
        },
        getGraylist: () => ({ ...GRAYLIST }),
        getDomainGroups: () => ({ ...DOMAIN_GROUPS }),
        getFeedHealth: () => {
            const result = {};
            Object.keys(FEED_HEALTH).forEach(k => { result[k] = { ...FEED_HEALTH[k] }; });
            return result;
        },
        FEEDS,
        DOMAINS,
        URGENCY_WORDS,
    };

})();
