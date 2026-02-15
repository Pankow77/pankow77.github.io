// ═══════════════════════════════════════════════════════════════
// CORRELATION_ENGINE v1.0 — Cross-Domain Pattern Detector
// Hybrid Syndicate / Ethic Software Foundation
// ═══════════════════════════════════════════════════════════════
// "Everything is connected. The question is: how tightly?"
//
// This module detects:
// - Temporal clusters (multiple signals in short windows)
// - Cross-domain correlations (ENERGY + GEOPOLITICS = conflict)
// - Severity spikes (sudden increases)
// - Watchlist keyword matches
// ═══════════════════════════════════════════════════════════════

const CorrelationEngine = (() => {

    // ══════════════════════════════════════════════
    // CORRELATION RULES
    // ══════════════════════════════════════════════

    const CROSS_DOMAIN_RULES = [
        {
            id: 'energy-geo-conflict',
            name: 'ENERGY-GEO CONVERGENCE',
            domains: ['ENERGY', 'GEOPOLITICS'],
            description: 'Segnali energetici e geopolitici convergono — possibile conflitto per risorse.',
            threat: 'HIGH',
            color: '#ff3344',
            icon: '⚡',
        },
        {
            id: 'climate-social-unrest',
            name: 'CLIMATE-SOCIAL PRESSURE',
            domains: ['CLIMATE', 'SOCIAL'],
            description: 'Crisi climatica alimenta tensione sociale — migrazioni e proteste probabili.',
            threat: 'HIGH',
            color: '#ff6633',
            icon: '🔥',
        },
        {
            id: 'economy-social-instability',
            name: 'ECONOMIC-SOCIAL INSTABILITY',
            domains: ['ECONOMY', 'SOCIAL'],
            description: 'Pressione economica su tessuto sociale — rischio di instabilita.',
            threat: 'ELEVATED',
            color: '#ffbf00',
            icon: '📉',
        },
        {
            id: 'tech-geo-cyberwar',
            name: 'TECH-GEO CYBER VECTOR',
            domains: ['TECHNOLOGY', 'GEOPOLITICS'],
            description: 'Vettore cyber-geopolitico attivo — possibile guerra ibrida.',
            threat: 'CRITICAL',
            color: '#ff0084',
            icon: '🛡',
        },
        {
            id: 'energy-economy-shock',
            name: 'ENERGY-ECONOMY SHOCK',
            domains: ['ENERGY', 'ECONOMY'],
            description: 'Shock energetico su mercati — cascata finanziaria possibile.',
            threat: 'HIGH',
            color: '#ff8833',
            icon: '💥',
        },
        {
            id: 'climate-energy-transition',
            name: 'CLIMATE-ENERGY NEXUS',
            domains: ['CLIMATE', 'ENERGY'],
            description: 'Pressione climatica su transizione energetica — accelerazione o collasso.',
            threat: 'ELEVATED',
            color: '#00c8ff',
            icon: '🌊',
        },
        {
            id: 'tech-economy-disruption',
            name: 'TECH-ECONOMY DISRUPTION',
            domains: ['TECHNOLOGY', 'ECONOMY'],
            description: 'Disruzione tecnologica su strutture economiche — jobs e mercati.',
            threat: 'MODERATE',
            color: '#39ff14',
            icon: '⚙',
        },
        {
            id: 'geo-social-polarization',
            name: 'GEO-SOCIAL POLARIZATION',
            domains: ['GEOPOLITICS', 'SOCIAL'],
            description: 'Conflitto geopolitico polarizza societa — propaganda e divisione.',
            threat: 'HIGH',
            color: '#9d00ff',
            icon: '🔱',
        },
    ];

    // Time window for correlation detection (2 hours)
    const CORRELATION_WINDOW = 2 * 60 * 60 * 1000;
    // Minimum signals per domain to trigger correlation
    const MIN_SIGNALS_PER_DOMAIN = 2;

    // ══════════════════════════════════════════════
    // WATCHLIST
    // ══════════════════════════════════════════════

    const WATCHLIST_KEY = 'hs_watchlist';

    function getWatchlist() {
        try {
            return JSON.parse(localStorage.getItem(WATCHLIST_KEY) || '[]');
        } catch (e) {
            return [];
        }
    }

    function saveWatchlist(list) {
        try {
            localStorage.setItem(WATCHLIST_KEY, JSON.stringify(list));
        } catch (e) { /* ignore */ }
    }

    function addToWatchlist(keyword) {
        const list = getWatchlist();
        const clean = keyword.trim().toLowerCase();
        if (!clean || list.includes(clean)) return false;
        list.push(clean);
        saveWatchlist(list);
        return true;
    }

    function removeFromWatchlist(keyword) {
        let list = getWatchlist();
        list = list.filter(k => k !== keyword.toLowerCase());
        saveWatchlist(list);
    }

    function checkWatchlist(signal) {
        const watchlist = getWatchlist();
        if (watchlist.length === 0) return [];

        const text = ((signal.title || '') + ' ' + (signal.description || '')).toLowerCase();
        return watchlist.filter(keyword => text.includes(keyword));
    }

    // ══════════════════════════════════════════════
    // CORRELATION DETECTION
    // ══════════════════════════════════════════════

    function detectCorrelations(archive) {
        if (!archive || archive.length === 0) return [];

        const now = Date.now();
        const correlations = [];

        // Get recent signals within the window
        const recentSignals = archive.filter(s => (now - s.time) < CORRELATION_WINDOW);

        // Group by domain
        const domainBuckets = {};
        recentSignals.forEach(s => {
            if (!domainBuckets[s.domain]) domainBuckets[s.domain] = [];
            domainBuckets[s.domain].push(s);
        });

        // Check each cross-domain rule
        CROSS_DOMAIN_RULES.forEach(rule => {
            const [domA, domB] = rule.domains;
            const signalsA = domainBuckets[domA] || [];
            const signalsB = domainBuckets[domB] || [];

            if (signalsA.length >= MIN_SIGNALS_PER_DOMAIN && signalsB.length >= MIN_SIGNALS_PER_DOMAIN) {
                // Calculate combined severity
                const allSignals = [...signalsA, ...signalsB];
                const avgSeverity = Math.round(
                    allSignals.reduce((sum, s) => sum + (s.severity || 0), 0) / allSignals.length
                );

                correlations.push({
                    ...rule,
                    signalCount: allSignals.length,
                    avgSeverity,
                    signalsA: signalsA.slice(0, 3),
                    signalsB: signalsB.slice(0, 3),
                    detectedAt: now,
                    strength: Math.min(
                        Math.round((signalsA.length + signalsB.length) / 4 * avgSeverity / 50 * 100),
                        100
                    ),
                });
            }
        });

        // Sort by strength descending
        correlations.sort((a, b) => b.strength - a.strength);
        return correlations;
    }

    // ══════════════════════════════════════════════
    // TEMPORAL CLUSTER DETECTION
    // ══════════════════════════════════════════════

    function detectClusters(archive, windowMs = 30 * 60 * 1000) {
        if (!archive || archive.length < 3) return [];

        const clusters = [];
        const sorted = [...archive].sort((a, b) => b.time - a.time);
        const used = new Set();

        for (let i = 0; i < sorted.length; i++) {
            if (used.has(i)) continue;

            const cluster = [sorted[i]];
            used.add(i);

            for (let j = i + 1; j < sorted.length; j++) {
                if (used.has(j)) continue;
                if (Math.abs(sorted[i].time - sorted[j].time) <= windowMs) {
                    cluster.push(sorted[j]);
                    used.add(j);
                }
            }

            if (cluster.length >= 3) {
                const domains = [...new Set(cluster.map(s => s.domain))];
                const avgSev = Math.round(
                    cluster.reduce((sum, s) => sum + (s.severity || 0), 0) / cluster.length
                );

                clusters.push({
                    signals: cluster,
                    count: cluster.length,
                    domains,
                    avgSeverity: avgSev,
                    timeStart: Math.min(...cluster.map(s => s.time)),
                    timeEnd: Math.max(...cluster.map(s => s.time)),
                    multiDomain: domains.length > 1,
                });
            }
        }

        return clusters.sort((a, b) => b.count - a.count).slice(0, 10);
    }

    // ══════════════════════════════════════════════
    // SEVERITY SPIKE DETECTION
    // ══════════════════════════════════════════════

    function detectSeveritySpikes(archive) {
        if (!archive || archive.length < 5) return null;

        const now = Date.now();
        const last6h = archive.filter(s => (now - s.time) < 6 * 60 * 60 * 1000);
        const prev24h = archive.filter(s => {
            const age = now - s.time;
            return age >= 6 * 60 * 60 * 1000 && age < 24 * 60 * 60 * 1000;
        });

        if (last6h.length === 0 || prev24h.length === 0) return null;

        const recentAvg = last6h.reduce((s, x) => s + (x.severity || 0), 0) / last6h.length;
        const baselineAvg = prev24h.reduce((s, x) => s + (x.severity || 0), 0) / prev24h.length;

        const spike = recentAvg - baselineAvg;

        if (spike > 10) {
            return {
                type: 'SEVERITY_SPIKE',
                delta: Math.round(spike),
                recentAvg: Math.round(recentAvg),
                baselineAvg: Math.round(baselineAvg),
                recentCount: last6h.length,
                baselineCount: prev24h.length,
                direction: 'UP',
                color: '#ff3344',
            };
        } else if (spike < -10) {
            return {
                type: 'SEVERITY_DROP',
                delta: Math.round(spike),
                recentAvg: Math.round(recentAvg),
                baselineAvg: Math.round(baselineAvg),
                recentCount: last6h.length,
                baselineCount: prev24h.length,
                direction: 'DOWN',
                color: '#00d4aa',
            };
        }

        return null;
    }

    // ══════════════════════════════════════════════
    // DOMAIN CORRELATION MATRIX
    // ══════════════════════════════════════════════

    function buildCorrelationMatrix(archive) {
        const domains = ['CLIMATE', 'GEOPOLITICS', 'ECONOMY', 'TECHNOLOGY', 'SOCIAL', 'ENERGY'];
        const matrix = {};
        const WINDOW = 60 * 60 * 1000; // 1 hour co-occurrence window

        domains.forEach(a => {
            matrix[a] = {};
            domains.forEach(b => {
                matrix[a][b] = 0;
            });
        });

        // Count co-occurrences within time windows
        const sorted = [...archive].sort((a, b) => a.time - b.time);
        for (let i = 0; i < sorted.length; i++) {
            for (let j = i + 1; j < sorted.length; j++) {
                if (sorted[j].time - sorted[i].time > WINDOW) break;
                const a = sorted[i].domain;
                const b = sorted[j].domain;
                if (a && b && a !== b && matrix[a] && matrix[a][b] !== undefined) {
                    matrix[a][b]++;
                    matrix[b][a]++;
                }
            }
        }

        return { domains, matrix };
    }

    // ══════════════════════════════════════════════
    // SOURCE DIVERSITY / ENTROPY ANALYSIS
    // ══════════════════════════════════════════════

    function analyzeSourceDiversity(archive) {
        if (!archive || archive.length < 5) return { entropy: 0, dominant: null, healthy: true };

        const now = Date.now();
        const recent = archive.filter(s => (now - s.time) < 2 * 60 * 60 * 1000); // last 2h
        if (recent.length < 3) return { entropy: 0, dominant: null, healthy: true };

        // Count signals per source
        const sourceCounts = {};
        recent.forEach(s => {
            sourceCounts[s.source] = (sourceCounts[s.source] || 0) + 1;
        });

        const total = recent.length;
        const sources = Object.entries(sourceCounts);

        // Shannon entropy
        let entropy = 0;
        sources.forEach(([, count]) => {
            const p = count / total;
            if (p > 0) entropy -= p * Math.log2(p);
        });

        // Max entropy for this number of sources
        const maxEntropy = Math.log2(sources.length) || 1;
        const normalizedEntropy = maxEntropy > 0 ? entropy / maxEntropy : 0;

        // Find dominant source
        const sorted = sources.sort((a, b) => b[1] - a[1]);
        const dominant = sorted[0];
        const dominantShare = dominant ? dominant[1] / total : 0;

        return {
            entropy: Math.round(normalizedEntropy * 100),
            sourceCount: sources.length,
            signalCount: total,
            dominant: dominant ? { name: dominant[0], count: dominant[1], share: Math.round(dominantShare * 100) } : null,
            healthy: normalizedEntropy > 0.5 && dominantShare < 0.5,
            warning: dominantShare > 0.6 ? `SOURCE SATURATION: ${dominant[0]} domina con ${Math.round(dominantShare * 100)}%` : null,
        };
    }

    // ══════════════════════════════════════════════
    // BURST DETECTION — Anti-manipulation
    // ══════════════════════════════════════════════

    function detectBursts(archive, windowMs = 10 * 60 * 1000) {
        if (!archive || archive.length < 5) return [];

        const now = Date.now();
        const recent = archive.filter(s => (now - s.time) < 60 * 60 * 1000); // last 1h

        // Group by source
        const bySource = {};
        recent.forEach(s => {
            if (!bySource[s.source]) bySource[s.source] = [];
            bySource[s.source].push(s);
        });

        const bursts = [];
        Object.entries(bySource).forEach(([source, signals]) => {
            if (signals.length < 5) return;

            // Check if signals are concentrated in any windowMs window
            const sorted = signals.sort((a, b) => a.time - b.time);
            for (let i = 0; i < sorted.length; i++) {
                const windowEnd = sorted[i].time + windowMs;
                const inWindow = sorted.filter(s => s.time >= sorted[i].time && s.time <= windowEnd);
                if (inWindow.length >= 5) {
                    const domains = [...new Set(inWindow.map(s => s.domain))];
                    const avgSev = Math.round(inWindow.reduce((sum, s) => sum + (s.severity || 0), 0) / inWindow.length);

                    bursts.push({
                        type: 'SOURCE_BURST',
                        source: source,
                        count: inWindow.length,
                        windowMs: windowMs,
                        domains: domains,
                        avgSeverity: avgSev,
                        suspicious: domains.length <= 2 && avgSev > 50,
                        detectedAt: now,
                    });
                    break; // One burst per source
                }
            }
        });

        return bursts.sort((a, b) => b.count - a.count);
    }

    // ══════════════════════════════════════════════
    // NARRATIVE MANIPULATION DETECTION
    // ══════════════════════════════════════════════

    function detectManipulation(archive) {
        const warnings = [];
        const now = Date.now();
        const recent = archive.filter(s => (now - s.time) < 2 * 60 * 60 * 1000);

        if (recent.length < 10) return warnings;

        // 1. Check source diversity
        const diversity = analyzeSourceDiversity(archive);
        if (!diversity.healthy && diversity.warning) {
            warnings.push({
                type: 'LOW_ENTROPY',
                severity: 'HIGH',
                message: diversity.warning,
                detail: `Entropy: ${diversity.entropy}%, Sources: ${diversity.sourceCount}`,
            });
        }

        // 2. Check for coordinated domain saturation
        const domainCounts = {};
        recent.forEach(s => {
            domainCounts[s.domain] = (domainCounts[s.domain] || 0) + 1;
        });
        const totalRecent = recent.length;
        Object.entries(domainCounts).forEach(([domain, count]) => {
            const share = count / totalRecent;
            if (share > 0.6 && count > 8) {
                warnings.push({
                    type: 'DOMAIN_SATURATION',
                    severity: 'ELEVATED',
                    message: `${domain} domina ${Math.round(share * 100)}% dei segnali recenti (${count}/${totalRecent})`,
                    domain: domain,
                });
            }
        });

        // 3. Check for burst patterns
        const bursts = detectBursts(archive);
        bursts.filter(b => b.suspicious).forEach(burst => {
            warnings.push({
                type: 'SUSPICIOUS_BURST',
                severity: 'CRITICAL',
                message: `Burst sospetto da ${burst.source}: ${burst.count} segnali in ${Math.round(burst.windowMs / 60000)}min, domini: ${burst.domains.join(',')}`,
                source: burst.source,
            });
        });

        // 4. Check for severity inflation (recent avg much higher than baseline)
        const spike = detectSeveritySpikes(archive);
        if (spike && spike.type === 'SEVERITY_SPIKE' && spike.delta > 20) {
            warnings.push({
                type: 'SEVERITY_INFLATION',
                severity: 'ELEVATED',
                message: `Severity anomala: media recente ${spike.recentAvg}% vs baseline ${spike.baselineAvg}% (+${spike.delta}%)`,
            });
        }

        return warnings;
    }

    // ══════════════════════════════════════════════
    // FULL ANALYSIS
    // ══════════════════════════════════════════════

    function runFullAnalysis() {
        let archive;
        if (typeof PersistenceManager !== 'undefined') {
            archive = PersistenceManager.getArchive();
        } else {
            try {
                archive = JSON.parse(localStorage.getItem('hs_signal_archive') || '[]');
            } catch (e) {
                archive = [];
            }
        }

        return {
            correlations: detectCorrelations(archive),
            clusters: detectClusters(archive),
            severitySpike: detectSeveritySpikes(archive),
            matrix: buildCorrelationMatrix(archive),
            sourceDiversity: analyzeSourceDiversity(archive),
            bursts: detectBursts(archive),
            manipulationWarnings: detectManipulation(archive),
            storageReport: typeof PersistenceManager !== 'undefined' ? PersistenceManager.getStorageReport() : null,
            watchlistHits: archive.slice(0, 50).map(s => ({
                signal: s,
                hits: checkWatchlist(s),
            })).filter(x => x.hits.length > 0),
            timestamp: Date.now(),
            archiveSize: archive.length,
        };
    }

    // ══════════════════════════════════════════════
    // PUBLIC API
    // ══════════════════════════════════════════════

    return {
        detectCorrelations,
        detectClusters,
        detectSeveritySpikes,
        buildCorrelationMatrix,
        analyzeSourceDiversity,
        detectBursts,
        detectManipulation,
        checkWatchlist,
        getWatchlist,
        addToWatchlist,
        removeFromWatchlist,
        runFullAnalysis,
        CROSS_DOMAIN_RULES,
    };

})();
