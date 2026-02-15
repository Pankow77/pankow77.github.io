// ═══════════════════════════════════════════════════════════════
// OSINT_ENGINE v1.0 — Professional Intelligence Processing Core
// Hybrid Syndicate / Ethic Software Foundation
// ═══════════════════════════════════════════════════════════════
// "Intelligence is not about knowing everything.
//  It's about knowing what matters."
//
// This module provides:
// - Entity extraction from signals (NER-like pattern matching)
// - Investigation case management with evidence chains
// - Link analysis between entities (co-occurrence, temporal)
// - Source reliability assessment (NATO Admiralty System)
// - Advanced watchlist with regex patterns
// - Professional OSINT report generation
// - Full localStorage persistence, zero servers
// ═══════════════════════════════════════════════════════════════

const OsintEngine = (() => {

    // ══════════════════════════════════════════════
    // CONFIGURATION
    // ══════════════════════════════════════════════

    const CONFIG = {
        casesKey: 'hs_osint_cases',
        entitiesKey: 'hs_osint_entities',
        sourcesKey: 'hs_osint_sources',
        watchlistKey: 'hs_osint_watchlist',
        maxCases: 100,
        maxEntities: 500,
        version: '1.0',
    };

    // ══════════════════════════════════════════════
    // ENTITY EXTRACTION ENGINE
    // ══════════════════════════════════════════════
    // Pattern-based Named Entity Recognition
    // Extracts: PERSON, ORG, LOCATION, EVENT

    const ENTITY_PATTERNS = {
        PERSON: {
            color: '#ff8833',
            icon: '👤',
            // Common geopolitical figures, patterns for capitalized names
            keywords: [
                'putin', 'zelensky', 'biden', 'trump', 'xi jinping', 'macron',
                'scholz', 'erdogan', 'modi', 'netanyahu', 'meloni', 'draghi',
                'von der leyen', 'stoltenberg', 'guterres', 'lavrov',
                'blinken', 'sullivan', 'austin', 'mattarella', 'conte',
                'salvini', 'letta', 'renzi', 'berlusconi', 'grillo',
                'starmer', 'sunak', 'johnson', 'orban', 'duda',
                'lula', 'milei', 'petro', 'obrador', 'kishida',
                'al-sisi', 'bin salman', 'khamenei', 'raisi',
            ],
        },
        ORG: {
            color: '#9d00ff',
            icon: '🏛',
            keywords: [
                'nato', 'onu', 'un', 'eu', 'ue', 'who', 'oms', 'fmi', 'imf',
                'world bank', 'banca mondiale', 'bce', 'ecb', 'fed',
                'opec', 'g7', 'g20', 'brics', 'asean', 'mercosur',
                'pentagono', 'pentagon', 'cia', 'fbi', 'nsa', 'mi6', 'mossad',
                'wagner', 'hamas', 'hezbollah', 'isis', 'al qaeda', 'taliban',
                'amnesty', 'croce rossa', 'red cross', 'msf', 'unicef',
                'parlamento europeo', 'european parliament', 'commissione europea',
                'consiglio di sicurezza', 'security council',
                'corte penale internazionale', 'icc',
                'greenpeace', 'wwf', 'oxfam',
                'apple', 'google', 'microsoft', 'amazon', 'meta', 'openai',
                'tesla', 'spacex', 'nvidia', 'tsmc', 'samsung',
                'gazprom', 'rosneft', 'aramco', 'shell', 'bp', 'total',
                'confindustria', 'bankitalia', 'consob',
            ],
        },
        LOCATION: {
            color: '#00d4aa',
            icon: '📍',
            keywords: [
                // Conflict zones & hot spots
                'ukraine', 'ucraina', 'crimea', 'donbass', 'donbas',
                'gaza', 'west bank', 'cisgiordania', 'israele', 'israel',
                'palestine', 'palestina', 'lebanon', 'libano',
                'taiwan', 'south china sea', 'mar cinese',
                'syria', 'siria', 'libya', 'libia', 'yemen',
                'iran', 'iraq', 'afghanistan', 'myanmar', 'sudan',
                // Major powers
                'russia', 'china', 'cina', 'usa', 'stati uniti', 'united states',
                'washington', 'moscow', 'mosca', 'beijing', 'pechino',
                'london', 'londra', 'paris', 'parigi', 'berlin', 'berlino',
                'brussels', 'bruxelles', 'roma', 'rome',
                // Regions
                'medio oriente', 'middle east', 'balcani', 'balkans',
                'sahel', 'horn of africa', 'corno d\'africa',
                'arctic', 'artico', 'mediterraneo', 'mediterranean',
                'indo-pacific', 'indo-pacifico',
                // Italian cities
                'milano', 'napoli', 'torino', 'firenze', 'bologna',
                'venezia', 'genova', 'palermo', 'catania', 'bari',
            ],
        },
        EVENT: {
            color: '#ff0084',
            icon: '⚡',
            keywords: [
                // Types of events
                'summit', 'vertice', 'elezioni', 'election', 'referendum',
                'attacco', 'attack', 'esplosione', 'explosion', 'bombardamento',
                'bombing', 'colpo di stato', 'coup', 'protesta', 'protest',
                'manifestazione', 'sciopero', 'strike', 'embargo',
                'sanzioni', 'sanctions', 'cessate il fuoco', 'ceasefire',
                'trattato', 'treaty', 'accordo', 'agreement', 'deal',
                'crisi', 'crisis', 'emergenza', 'emergency',
                'terremoto', 'earthquake', 'tsunami', 'eruzione', 'eruption',
                'pandemia', 'pandemic', 'epidemia', 'epidemic',
                'cyberattack', 'attacco informatico', 'data breach',
                'blackout', 'shutdown', 'default', 'bancarotta', 'bankruptcy',
            ],
        },
    };

    // Extract entities from text
    function extractEntities(text) {
        if (!text) return [];
        const lowerText = text.toLowerCase();
        const found = [];

        for (const [type, config] of Object.entries(ENTITY_PATTERNS)) {
            for (const keyword of config.keywords) {
                if (lowerText.includes(keyword)) {
                    // Avoid duplicates
                    if (!found.some(e => e.name === keyword && e.type === type)) {
                        found.push({
                            name: keyword,
                            type: type,
                            color: config.color,
                            icon: config.icon,
                        });
                    }
                }
            }
        }

        return found;
    }

    // Batch extract from all archived signals
    function extractFromArchive() {
        if (typeof PersistenceManager === 'undefined') return [];
        const archive = PersistenceManager.getArchive();
        const entityIndex = {};

        archive.forEach(signal => {
            const text = `${signal.title} ${signal.description}`.toLowerCase();
            const entities = extractEntities(text);

            entities.forEach(entity => {
                const key = `${entity.type}:${entity.name}`;
                if (!entityIndex[key]) {
                    entityIndex[key] = {
                        ...entity,
                        mentions: 0,
                        signals: [],
                        firstSeen: signal.time,
                        lastSeen: signal.time,
                        domains: {},
                        severity: { total: 0, max: 0, avg: 0 },
                    };
                }
                const entry = entityIndex[key];
                entry.mentions++;
                entry.signals.push({
                    id: signal.id,
                    title: signal.title,
                    domain: signal.domain,
                    severity: signal.severity,
                    time: signal.time,
                    source: signal.source,
                });
                entry.domains[signal.domain] = (entry.domains[signal.domain] || 0) + 1;
                entry.severity.total += signal.severity;
                entry.severity.max = Math.max(entry.severity.max, signal.severity);
                entry.severity.avg = entry.severity.total / entry.mentions;
                if (signal.time < entry.firstSeen) entry.firstSeen = signal.time;
                if (signal.time > entry.lastSeen) entry.lastSeen = signal.time;
            });
        });

        // Convert to sorted array
        return Object.values(entityIndex)
            .sort((a, b) => b.mentions - a.mentions);
    }

    // ══════════════════════════════════════════════
    // INVESTIGATION CASE MANAGEMENT
    // ══════════════════════════════════════════════

    function getCases() {
        try {
            const raw = localStorage.getItem(CONFIG.casesKey);
            if (!raw) return [];
            return JSON.parse(raw);
        } catch (e) {
            return [];
        }
    }

    function saveCases(cases) {
        if (cases.length > CONFIG.maxCases) {
            cases = cases.slice(0, CONFIG.maxCases);
        }
        localStorage.setItem(CONFIG.casesKey, JSON.stringify(cases));
    }

    function createCase(data) {
        const cases = getCases();
        const newCase = {
            id: 'CASE-' + Date.now().toString(36).toUpperCase(),
            title: data.title || 'Untitled Investigation',
            description: data.description || '',
            status: 'OPEN', // OPEN, ACTIVE, CLOSED, ARCHIVED
            priority: data.priority || 'MEDIUM', // LOW, MEDIUM, HIGH, CRITICAL
            created: Date.now(),
            updated: Date.now(),
            entities: data.entities || [],
            signals: data.signals || [],
            notes: data.notes || [],
            tags: data.tags || [],
            analyst: data.analyst || 'PANKOW_77C',
            classification: data.classification || 'UNCLASSIFIED',
        };
        cases.unshift(newCase);
        saveCases(cases);
        return newCase;
    }

    function updateCase(caseId, updates) {
        const cases = getCases();
        const idx = cases.findIndex(c => c.id === caseId);
        if (idx === -1) return null;
        cases[idx] = { ...cases[idx], ...updates, updated: Date.now() };
        saveCases(cases);
        return cases[idx];
    }

    function addSignalToCase(caseId, signal) {
        const cases = getCases();
        const idx = cases.findIndex(c => c.id === caseId);
        if (idx === -1) return false;
        if (cases[idx].signals.some(s => s.id === signal.id)) return false;
        cases[idx].signals.push({
            id: signal.id,
            title: signal.title,
            domain: signal.domain,
            severity: signal.severity,
            time: signal.time,
            source: signal.source,
            link: signal.link,
            addedAt: Date.now(),
            analystNote: '',
        });
        cases[idx].updated = Date.now();
        saveCases(cases);
        return true;
    }

    function addNoteToCase(caseId, note) {
        const cases = getCases();
        const idx = cases.findIndex(c => c.id === caseId);
        if (idx === -1) return false;
        cases[idx].notes.push({
            id: 'N-' + Date.now().toString(36),
            text: note,
            timestamp: Date.now(),
            analyst: 'PANKOW_77C',
        });
        cases[idx].updated = Date.now();
        saveCases(cases);
        return true;
    }

    function deleteCase(caseId) {
        const cases = getCases().filter(c => c.id !== caseId);
        saveCases(cases);
    }

    // ══════════════════════════════════════════════
    // SOURCE RELIABILITY ASSESSMENT
    // NATO Admiralty System (6x6 matrix)
    // ══════════════════════════════════════════════

    const RELIABILITY_SCALE = {
        'A': { label: 'Completely Reliable', color: '#00dd66', score: 1.0 },
        'B': { label: 'Usually Reliable', color: '#00d4aa', score: 0.8 },
        'C': { label: 'Fairly Reliable', color: '#ffcc00', score: 0.6 },
        'D': { label: 'Not Usually Reliable', color: '#ff8833', score: 0.4 },
        'E': { label: 'Unreliable', color: '#ff3344', score: 0.2 },
        'F': { label: 'Cannot Be Judged', color: '#6b7fa3', score: 0.0 },
    };

    const CREDIBILITY_SCALE = {
        '1': { label: 'Confirmed', color: '#00dd66', score: 1.0 },
        '2': { label: 'Probably True', color: '#00d4aa', score: 0.8 },
        '3': { label: 'Possibly True', color: '#ffcc00', score: 0.6 },
        '4': { label: 'Doubtfully True', color: '#ff8833', score: 0.4 },
        '5': { label: 'Improbable', color: '#ff3344', score: 0.2 },
        '6': { label: 'Cannot Be Judged', color: '#6b7fa3', score: 0.0 },
    };

    function getSourceRatings() {
        try {
            const raw = localStorage.getItem(CONFIG.sourcesKey);
            if (!raw) return {};
            return JSON.parse(raw);
        } catch (e) {
            return {};
        }
    }

    function rateSource(sourceName, reliability, credibility, notes) {
        const ratings = getSourceRatings();
        if (!ratings[sourceName]) {
            ratings[sourceName] = {
                name: sourceName,
                ratings: [],
                created: Date.now(),
            };
        }
        ratings[sourceName].ratings.push({
            reliability: reliability, // A-F
            credibility: credibility, // 1-6
            notes: notes || '',
            timestamp: Date.now(),
        });
        ratings[sourceName].latest = {
            reliability,
            credibility,
            code: `${reliability}${credibility}`,
        };
        // Calculate composite score
        const relScore = RELIABILITY_SCALE[reliability]?.score || 0;
        const credScore = CREDIBILITY_SCALE[credibility]?.score || 0;
        ratings[sourceName].compositeScore = ((relScore + credScore) / 2 * 100).toFixed(0);

        localStorage.setItem(CONFIG.sourcesKey, JSON.stringify(ratings));
        return ratings[sourceName];
    }

    function getSourceComposite(sourceName) {
        const ratings = getSourceRatings();
        return ratings[sourceName] || null;
    }

    // ══════════════════════════════════════════════
    // LINK ANALYSIS
    // Entity co-occurrence & relationship mapping
    // ══════════════════════════════════════════════

    function buildLinkAnalysis(entities) {
        if (!entities || entities.length === 0) {
            entities = extractFromArchive();
        }

        const links = [];
        const entityMap = {};

        // Build signal-to-entity mapping
        entities.forEach(entity => {
            entity.signals.forEach(signal => {
                if (!entityMap[signal.id]) {
                    entityMap[signal.id] = [];
                }
                entityMap[signal.id].push(entity);
            });
        });

        // Find co-occurrences
        const linkIndex = {};
        for (const signalId of Object.keys(entityMap)) {
            const coEntities = entityMap[signalId];
            for (let i = 0; i < coEntities.length; i++) {
                for (let j = i + 1; j < coEntities.length; j++) {
                    const keyA = `${coEntities[i].type}:${coEntities[i].name}`;
                    const keyB = `${coEntities[j].type}:${coEntities[j].name}`;
                    const linkKey = [keyA, keyB].sort().join('↔');

                    if (!linkIndex[linkKey]) {
                        linkIndex[linkKey] = {
                            entityA: { name: coEntities[i].name, type: coEntities[i].type, color: coEntities[i].color },
                            entityB: { name: coEntities[j].name, type: coEntities[j].type, color: coEntities[j].color },
                            coOccurrences: 0,
                            signals: [],
                            strength: 0,
                        };
                    }
                    linkIndex[linkKey].coOccurrences++;
                    linkIndex[linkKey].signals.push(signalId);
                }
            }
        }

        // Calculate strength (0-100)
        const maxCo = Math.max(1, ...Object.values(linkIndex).map(l => l.coOccurrences));
        for (const link of Object.values(linkIndex)) {
            link.strength = Math.round((link.coOccurrences / maxCo) * 100);
            links.push(link);
        }

        return links.sort((a, b) => b.strength - a.strength);
    }

    // ══════════════════════════════════════════════
    // TIMELINE RECONSTRUCTION
    // ══════════════════════════════════════════════

    function buildTimeline(options = {}) {
        if (typeof PersistenceManager === 'undefined') return [];
        const archive = PersistenceManager.getArchive();
        let signals = [...archive];

        // Filter by entity if specified
        if (options.entity) {
            signals = signals.filter(s => {
                const text = `${s.title} ${s.description}`.toLowerCase();
                return text.includes(options.entity.toLowerCase());
            });
        }

        // Filter by case if specified
        if (options.caseId) {
            const cases = getCases();
            const theCase = cases.find(c => c.id === options.caseId);
            if (theCase) {
                const caseSignalIds = new Set(theCase.signals.map(s => s.id));
                signals = signals.filter(s => caseSignalIds.has(s.id));
            }
        }

        // Filter by domain
        if (options.domain) {
            signals = signals.filter(s => s.domain === options.domain);
        }

        // Filter by date range
        if (options.startDate) {
            signals = signals.filter(s => s.time >= options.startDate);
        }
        if (options.endDate) {
            signals = signals.filter(s => s.time <= options.endDate);
        }

        // Sort chronologically
        signals.sort((a, b) => a.time - b.time);

        // Extract entities for each signal
        return signals.map(signal => {
            const entities = extractEntities(`${signal.title} ${signal.description}`);
            return {
                ...signal,
                entities,
                timeFormatted: new Date(signal.time).toLocaleString('it-IT'),
            };
        });
    }

    // ══════════════════════════════════════════════
    // ADVANCED WATCHLIST
    // ══════════════════════════════════════════════

    function getWatchlist() {
        try {
            const raw = localStorage.getItem(CONFIG.watchlistKey);
            if (!raw) return [];
            return JSON.parse(raw);
        } catch (e) {
            return [];
        }
    }

    function saveWatchlist(list) {
        localStorage.setItem(CONFIG.watchlistKey, JSON.stringify(list));
    }

    function addWatchItem(item) {
        const list = getWatchlist();
        const entry = {
            id: 'W-' + Date.now().toString(36).toUpperCase(),
            pattern: item.pattern || '',
            isRegex: item.isRegex || false,
            domains: item.domains || [], // empty = all
            minSeverity: item.minSeverity || 0,
            label: item.label || item.pattern,
            priority: item.priority || 'MEDIUM',
            created: Date.now(),
            matches: 0,
            lastMatch: null,
            active: true,
        };
        list.push(entry);
        saveWatchlist(list);
        return entry;
    }

    function removeWatchItem(id) {
        const list = getWatchlist().filter(w => w.id !== id);
        saveWatchlist(list);
    }

    function checkWatchlist(signal) {
        const list = getWatchlist();
        const text = `${signal.title} ${signal.description}`.toLowerCase();
        const matches = [];

        list.forEach(item => {
            if (!item.active) return;

            // Domain filter
            if (item.domains.length > 0 && !item.domains.includes(signal.domain)) return;

            // Severity filter
            if (signal.severity < item.minSeverity) return;

            // Pattern match (with ReDoS protection)
            let matched = false;
            if (item.isRegex) {
                try {
                    // ReDoS guard: reject overly complex or long patterns
                    if (item.pattern.length > 200 || /(\.\*){3,}|(\+\+)|(\*\*)/.test(item.pattern)) {
                        matched = false;
                    } else {
                        const regex = new RegExp(item.pattern, 'i');
                        matched = regex.test(text.substring(0, 5000));
                    }
                } catch (e) {
                    matched = false;
                }
            } else {
                matched = text.includes(item.pattern.toLowerCase());
            }

            if (matched) {
                item.matches++;
                item.lastMatch = Date.now();
                matches.push(item);
            }
        });

        if (matches.length > 0) {
            saveWatchlist(list);
        }

        return matches;
    }

    // ══════════════════════════════════════════════
    // OSINT REPORT GENERATOR
    // Professional intelligence report format
    // ══════════════════════════════════════════════

    function generateOsintReport(caseId) {
        const cases = getCases();
        const theCase = cases.find(c => c.id === caseId);
        if (!theCase) return null;

        const timeline = buildTimeline({ caseId });
        const entities = [];

        // Collect all entities from case signals
        theCase.signals.forEach(signal => {
            const found = extractEntities(`${signal.title}`);
            found.forEach(e => {
                if (!entities.some(x => x.name === e.name && x.type === e.type)) {
                    entities.push(e);
                }
            });
        });

        // Build report
        const now = new Date();
        const lines = [];
        const sep = '═'.repeat(70);
        const sepLight = '─'.repeat(70);

        lines.push(sep);
        lines.push('  OSINT INTELLIGENCE REPORT');
        lines.push(`  ${theCase.id} — ${theCase.title.toUpperCase()}`);
        lines.push(sep);
        lines.push('');
        lines.push(`  Generated: ${now.toLocaleString('it-IT')}`);
        lines.push(`  Analyst: ${theCase.analyst}`);
        lines.push(`  Classification: ${theCase.classification}`);
        lines.push(`  Status: ${theCase.status} | Priority: ${theCase.priority}`);
        lines.push('');
        lines.push(sepLight);
        lines.push('  1. EXECUTIVE SUMMARY');
        lines.push(sepLight);
        lines.push('');
        lines.push(`  ${theCase.description || 'No description provided.'}`);
        lines.push('');
        lines.push(`  Signals Collected: ${theCase.signals.length}`);
        lines.push(`  Entities Identified: ${entities.length}`);
        lines.push(`  Notes Recorded: ${theCase.notes.length}`);
        lines.push(`  Case Opened: ${new Date(theCase.created).toLocaleString('it-IT')}`);
        lines.push(`  Last Updated: ${new Date(theCase.updated).toLocaleString('it-IT')}`);
        lines.push('');

        // Entities section
        if (entities.length > 0) {
            lines.push(sepLight);
            lines.push('  2. ENTITIES OF INTEREST');
            lines.push(sepLight);
            lines.push('');
            const byType = {};
            entities.forEach(e => {
                if (!byType[e.type]) byType[e.type] = [];
                byType[e.type].push(e.name);
            });
            for (const [type, names] of Object.entries(byType)) {
                lines.push(`  [${type}]`);
                names.forEach(n => lines.push(`    • ${n.charAt(0).toUpperCase() + n.slice(1)}`));
                lines.push('');
            }
        }

        // Timeline section
        if (timeline.length > 0) {
            lines.push(sepLight);
            lines.push('  3. CHRONOLOGICAL RECONSTRUCTION');
            lines.push(sepLight);
            lines.push('');
            timeline.forEach((event, i) => {
                lines.push(`  [${event.timeFormatted}] [${event.domain}] [SEV:${event.severity}%]`);
                lines.push(`  ${event.title}`);
                lines.push(`  Source: ${event.source}`);
                if (event.entities.length > 0) {
                    lines.push(`  Entities: ${event.entities.map(e => e.name).join(', ')}`);
                }
                lines.push('');
            });
        }

        // Notes section
        if (theCase.notes.length > 0) {
            lines.push(sepLight);
            lines.push('  4. ANALYST NOTES');
            lines.push(sepLight);
            lines.push('');
            theCase.notes.forEach(note => {
                lines.push(`  [${new Date(note.timestamp).toLocaleString('it-IT')}] ${note.analyst}`);
                lines.push(`  ${note.text}`);
                lines.push('');
            });
        }

        // Source assessment
        const sourceRatings = getSourceRatings();
        const caseSources = [...new Set(theCase.signals.map(s => s.source))];
        const ratedSources = caseSources.filter(s => sourceRatings[s]);

        if (ratedSources.length > 0) {
            lines.push(sepLight);
            lines.push('  5. SOURCE ASSESSMENT');
            lines.push(sepLight);
            lines.push('');
            ratedSources.forEach(src => {
                const rating = sourceRatings[src];
                lines.push(`  ${src}: ${rating.latest.code} (Composite: ${rating.compositeScore}%)`);
                lines.push(`    Reliability: ${RELIABILITY_SCALE[rating.latest.reliability].label}`);
                lines.push(`    Credibility: ${CREDIBILITY_SCALE[rating.latest.credibility].label}`);
                lines.push('');
            });
        }

        // Tags
        if (theCase.tags.length > 0) {
            lines.push(sepLight);
            lines.push('  TAGS: ' + theCase.tags.join(', '));
        }

        lines.push('');
        lines.push(sep);
        lines.push('  END OF REPORT — HYBRID SYNDICATE / OSINT ENGINE v1.0');
        lines.push(`  Generated: ${now.toISOString()}`);
        lines.push(sep);

        return lines.join('\n');
    }

    // ══════════════════════════════════════════════
    // PATTERN OF LIFE ANALYSIS
    // Temporal behavior patterns for entities
    // ══════════════════════════════════════════════

    function patternOfLife(entityName) {
        if (typeof PersistenceManager === 'undefined') return null;
        const archive = PersistenceManager.getArchive();
        const lowerName = entityName.toLowerCase();

        const mentions = archive.filter(s => {
            const text = `${s.title} ${s.description}`.toLowerCase();
            return text.includes(lowerName);
        });

        if (mentions.length === 0) return null;

        // Hourly distribution
        const hourly = new Array(24).fill(0);
        // Daily distribution (0=Sun, 6=Sat)
        const daily = new Array(7).fill(0);
        // Domain affinity
        const domainAffinity = {};
        // Severity trend
        const severityTimeline = [];

        mentions.forEach(s => {
            const d = new Date(s.time);
            hourly[d.getHours()]++;
            daily[d.getDay()]++;
            domainAffinity[s.domain] = (domainAffinity[s.domain] || 0) + 1;
            severityTimeline.push({ time: s.time, severity: s.severity });
        });

        // Activity windows
        const peakHour = hourly.indexOf(Math.max(...hourly));
        const peakDay = daily.indexOf(Math.max(...daily));
        const dayNames = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];

        // Intensity trend (recent vs older)
        const now = Date.now();
        const week = 7 * 24 * 60 * 60 * 1000;
        const recentMentions = mentions.filter(s => now - s.time < week).length;
        const olderMentions = mentions.filter(s => now - s.time >= week && now - s.time < 2 * week).length;
        let trend = 'STABLE';
        if (recentMentions > olderMentions * 1.5) trend = 'RISING';
        else if (recentMentions < olderMentions * 0.5) trend = 'DECLINING';

        return {
            entity: entityName,
            totalMentions: mentions.length,
            hourlyDistribution: hourly,
            dailyDistribution: daily,
            peakHour: `${peakHour}:00`,
            peakDay: dayNames[peakDay],
            domainAffinity,
            primaryDomain: Object.entries(domainAffinity).sort((a, b) => b[1] - a[1])[0]?.[0],
            severityTimeline,
            avgSeverity: Math.round(mentions.reduce((s, m) => s + m.severity, 0) / mentions.length),
            trend,
            firstSeen: new Date(Math.min(...mentions.map(m => m.time))).toLocaleString('it-IT'),
            lastSeen: new Date(Math.max(...mentions.map(m => m.time))).toLocaleString('it-IT'),
        };
    }

    // ══════════════════════════════════════════════
    // FULL ANALYSIS SNAPSHOT
    // ══════════════════════════════════════════════

    function fullAnalysis() {
        const entities = extractFromArchive();
        const links = buildLinkAnalysis(entities);
        const cases = getCases();
        const watchlist = getWatchlist();
        const sourceRatings = getSourceRatings();

        // Top entities
        const topEntities = entities.slice(0, 20);

        // Hot entities (high severity + recent)
        const now = Date.now();
        const dayAgo = now - 24 * 60 * 60 * 1000;
        const hotEntities = entities
            .filter(e => e.lastSeen > dayAgo)
            .sort((a, b) => b.severity.avg - a.severity.avg)
            .slice(0, 10);

        // Strongest links
        const topLinks = links.slice(0, 15);

        // Active cases
        const activeCases = cases.filter(c => c.status === 'OPEN' || c.status === 'ACTIVE');

        // Active watchlist items
        const activeWatchItems = watchlist.filter(w => w.active);

        return {
            timestamp: now,
            entities: {
                total: entities.length,
                top: topEntities,
                hot: hotEntities,
                byType: {
                    PERSON: entities.filter(e => e.type === 'PERSON').length,
                    ORG: entities.filter(e => e.type === 'ORG').length,
                    LOCATION: entities.filter(e => e.type === 'LOCATION').length,
                    EVENT: entities.filter(e => e.type === 'EVENT').length,
                },
            },
            links: {
                total: links.length,
                top: topLinks,
            },
            cases: {
                total: cases.length,
                active: activeCases.length,
                list: activeCases,
            },
            watchlist: {
                total: watchlist.length,
                active: activeWatchItems.length,
                items: activeWatchItems,
            },
            sources: {
                total: Object.keys(sourceRatings).length,
                ratings: sourceRatings,
            },
        };
    }

    // ══════════════════════════════════════════════
    // PUBLIC API
    // ══════════════════════════════════════════════

    console.log('[OSINT_ENGINE] v1.0 initialized — Professional Intelligence Processing Core');

    return {
        // Entity extraction
        extractEntities,
        extractFromArchive,

        // Case management
        getCases,
        createCase,
        updateCase,
        deleteCase,
        addSignalToCase,
        addNoteToCase,

        // Source assessment
        rateSource,
        getSourceRatings,
        getSourceComposite,
        RELIABILITY_SCALE,
        CREDIBILITY_SCALE,

        // Link analysis
        buildLinkAnalysis,

        // Timeline
        buildTimeline,

        // Watchlist
        getWatchlist,
        addWatchItem,
        removeWatchItem,
        checkWatchlist,

        // Pattern of Life
        patternOfLife,

        // Reporting
        generateOsintReport,

        // Full analysis
        fullAnalysis,
    };

})();
