// ═══════════════════════════════════════════════════════════
// CASCADE-DETECTOR v1.0 — Cross-Domain Correlation Engine
// Hybrid Syndicate / Ethic Software Foundation
// ═══════════════════════════════════════════════════════════
// Detects multi-domain cascades from signal data.
// A cascade = simultaneous elevated severity across 2+ domains.
// This is what transforms noise into intelligence.

const CascadeDetector = (() => {
    'use strict';

    // ── CONFIGURATION ──
    const CONFIG = {
        // Time window for cascade detection (6 hours)
        WINDOW_MS: 6 * 60 * 60 * 1000,
        // Minimum signals in a domain to count
        MIN_SIGNALS_PER_DOMAIN: 2,
        // Minimum average severity to flag a domain
        MIN_AVG_SEVERITY: 45,
        // Minimum domains elevated for cascade trigger
        MIN_DOMAINS_FOR_CASCADE: 2,
        // Scan interval
        SCAN_INTERVAL_MS: 3 * 60 * 1000, // 3 minutes
        // Max cascades stored
        MAX_CASCADES: 100,
        // Cascade decay time (how long a cascade stays "active")
        CASCADE_ACTIVE_WINDOW: 12 * 60 * 60 * 1000, // 12 hours
    };

    // ── KNOWN CASCADE PATTERNS ──
    // Historical patterns of domain correlations that indicate systemic risk
    const CASCADE_PATTERNS = [
        {
            id: 'economic-geopolitical-shock',
            name: 'Economic-Geopolitical Shock',
            domains: ['economy', 'geopolitics'],
            description: 'War/sanctions → market disruption → supply chain collapse',
            historicalExample: 'Russia-Ukraine 2022: sanctions → energy crisis → inflation spike',
            baseWeight: 1.4,
        },
        {
            id: 'climate-economic-cascade',
            name: 'Climate-Economic Cascade',
            domains: ['climate', 'economy'],
            description: 'Extreme weather → agricultural failure → commodity spike → inflation',
            historicalExample: '2021 Texas freeze → energy prices → supply chain disruption',
            baseWeight: 1.3,
        },
        {
            id: 'tech-epistemic-erosion',
            name: 'Tech-Epistemic Erosion',
            domains: ['technology', 'epistemic'],
            description: 'AI deepfakes + platform manipulation → trust collapse',
            historicalExample: 'AI-generated disinfo campaigns in 2024 elections',
            baseWeight: 1.2,
        },
        {
            id: 'social-geopolitical-instability',
            name: 'Social-Geopolitical Instability',
            domains: ['social', 'geopolitics'],
            description: 'Migration crisis + border tensions → domestic unrest → policy shifts',
            historicalExample: '2015 European migration crisis → political polarization',
            baseWeight: 1.3,
        },
        {
            id: 'full-spectrum-crisis',
            name: 'Full Spectrum Crisis',
            domains: ['economy', 'geopolitics', 'social'],
            description: 'Multi-vector systemic failure. All major systems under stress.',
            historicalExample: 'COVID-19 2020: health + economy + social + political',
            baseWeight: 2.0,
        },
        {
            id: 'climate-social-displacement',
            name: 'Climate-Social Displacement',
            domains: ['climate', 'social'],
            description: 'Environmental disaster → displacement → social strain',
            historicalExample: 'Sahel desertification → migration → European social tension',
            baseWeight: 1.2,
        },
        {
            id: 'tech-economic-disruption',
            name: 'Tech-Economic Disruption',
            domains: ['technology', 'economy'],
            description: 'AI automation → job displacement → market restructuring',
            historicalExample: 'AI workforce disruption 2024-2025',
            baseWeight: 1.1,
        },
        {
            id: 'epistemic-geopolitical-warfare',
            name: 'Epistemic-Geopolitical Warfare',
            domains: ['epistemic', 'geopolitics'],
            description: 'State-backed disinfo campaigns during active conflict',
            historicalExample: 'Information warfare during Ukraine conflict',
            baseWeight: 1.5,
        },
    ];

    // ── STATE ──
    let scanInterval = null;
    let activeCascades = [];
    let cascadeHistory = [];

    // ── CORE DETECTION ──
    async function scan() {
        if (typeof StateManager === 'undefined') return null;

        const stats = await StateManager.signals.getDomainStats(
            CONFIG.WINDOW_MS / (60 * 60 * 1000)
        );

        // 1. Identify elevated domains
        const elevatedDomains = {};
        Object.entries(stats).forEach(([domain, data]) => {
            if (data.count >= CONFIG.MIN_SIGNALS_PER_DOMAIN &&
                data.avgSeverity >= CONFIG.MIN_AVG_SEVERITY) {
                elevatedDomains[domain] = {
                    count: data.count,
                    avgSeverity: data.avgSeverity,
                    maxSeverity: data.maxSeverity,
                    topSignals: data.signals
                        .sort((a, b) => b.severity - a.severity)
                        .slice(0, 5)
                };
            }
        });

        const elevatedCount = Object.keys(elevatedDomains).length;

        // 2. Check for cascade threshold
        if (elevatedCount < CONFIG.MIN_DOMAINS_FOR_CASCADE) {
            return {
                status: 'nominal',
                elevatedDomains,
                cascades: [],
                timestamp: Date.now()
            };
        }

        // 3. Match against known patterns
        const detectedCascades = [];
        const elevatedDomainNames = Object.keys(elevatedDomains);

        CASCADE_PATTERNS.forEach(pattern => {
            const matching = pattern.domains.filter(d => elevatedDomainNames.includes(d));
            if (matching.length >= Math.min(2, pattern.domains.length)) {
                // Calculate cascade severity
                let combinedSeverity = 0;
                let signalCount = 0;
                matching.forEach(d => {
                    combinedSeverity += elevatedDomains[d].avgSeverity;
                    signalCount += elevatedDomains[d].count;
                });
                const avgSeverity = combinedSeverity / matching.length;

                // Cross-domain amplification
                const domainOverlapRatio = matching.length / pattern.domains.length;
                const amplifiedSeverity = Math.min(100,
                    avgSeverity * pattern.baseWeight * (1 + domainOverlapRatio * 0.3)
                );

                // Temporal clustering bonus
                const temporalBonus = calculateTemporalClustering(matching, elevatedDomains);

                const cascade = {
                    id: pattern.id + '-' + Date.now().toString(36),
                    patternId: pattern.id,
                    name: pattern.name,
                    description: pattern.description,
                    historicalExample: pattern.historicalExample,
                    matchedDomains: matching,
                    totalDomains: pattern.domains.length,
                    severity: Math.min(100, Math.round(amplifiedSeverity + temporalBonus)),
                    signalCount,
                    confidence: Math.round(domainOverlapRatio * 100),
                    topSignals: getTopSignalsAcrossDomains(matching, elevatedDomains),
                    timestamp: Date.now(),
                    expiresAt: Date.now() + CONFIG.CASCADE_ACTIVE_WINDOW,
                };

                detectedCascades.push(cascade);
            }
        });

        // 4. Also detect UNKNOWN cascades (novel cross-domain patterns)
        if (elevatedCount >= 3) {
            const knownDomainSets = CASCADE_PATTERNS.map(p =>
                p.domains.sort().join(',')
            );
            const currentSet = elevatedDomainNames.sort().join(',');

            // Check if this exact combination is not a known pattern
            const isNovel = !knownDomainSets.some(known => {
                const knownDomains = known.split(',');
                return elevatedDomainNames.every(d => knownDomains.includes(d));
            });

            if (isNovel) {
                let avgSev = 0;
                let totalSig = 0;
                elevatedDomainNames.forEach(d => {
                    avgSev += elevatedDomains[d].avgSeverity;
                    totalSig += elevatedDomains[d].count;
                });
                avgSev = avgSev / elevatedCount;

                detectedCascades.push({
                    id: 'novel-' + Date.now().toString(36),
                    patternId: 'novel-cascade',
                    name: 'NOVEL CASCADE DETECTED',
                    description: `Unprecedented correlation across ${elevatedCount} domains: ${elevatedDomainNames.join(', ')}. No historical pattern match. Investigate.`,
                    historicalExample: 'No precedent found',
                    matchedDomains: elevatedDomainNames,
                    totalDomains: elevatedCount,
                    severity: Math.min(100, Math.round(avgSev * 1.5)),
                    signalCount: totalSig,
                    confidence: 60, // Lower confidence for novel patterns
                    topSignals: getTopSignalsAcrossDomains(elevatedDomainNames, elevatedDomains),
                    timestamp: Date.now(),
                    expiresAt: Date.now() + CONFIG.CASCADE_ACTIVE_WINDOW,
                    novel: true,
                });
            }
        }

        // 5. Sort by severity
        detectedCascades.sort((a, b) => b.severity - a.severity);

        // 6. Store and broadcast
        if (detectedCascades.length > 0) {
            activeCascades = detectedCascades;
            cascadeHistory.push(...detectedCascades);
            if (cascadeHistory.length > CONFIG.MAX_CASCADES) {
                cascadeHistory = cascadeHistory.slice(-CONFIG.MAX_CASCADES);
            }

            // Persist
            if (typeof StateManager !== 'undefined') {
                StateManager.set('cascades_active', activeCascades);
                StateManager.set('cascades_history', cascadeHistory);
                StateManager.broadcast('cascade:detected', {
                    count: detectedCascades.length,
                    maxSeverity: detectedCascades[0].severity,
                    patterns: detectedCascades.map(c => c.name)
                });
            }

            console.log(
                `%c[CASCADE] ${detectedCascades.length} cascade(s) detected! Max severity: ${detectedCascades[0].severity}`,
                'color: #ff0040; font-weight: bold; font-size: 12px;'
            );
        }

        return {
            status: detectedCascades.length > 0 ? 'cascade' : 'elevated',
            elevatedDomains,
            cascades: detectedCascades,
            timestamp: Date.now()
        };
    }

    // ── HELPERS ──
    function calculateTemporalClustering(domains, elevatedDomains) {
        // Bonus when signals from different domains cluster in time
        const timestamps = [];
        domains.forEach(d => {
            if (elevatedDomains[d] && elevatedDomains[d].topSignals) {
                elevatedDomains[d].topSignals.forEach(s => {
                    timestamps.push(s.timestamp);
                });
            }
        });

        if (timestamps.length < 4) return 0;

        timestamps.sort((a, b) => a - b);
        const span = timestamps[timestamps.length - 1] - timestamps[0];
        const hourSpan = span / (60 * 60 * 1000);

        // Tighter clustering = higher bonus (max 15 points)
        if (hourSpan < 1) return 15;
        if (hourSpan < 3) return 10;
        if (hourSpan < 6) return 5;
        return 0;
    }

    function getTopSignalsAcrossDomains(domains, elevatedDomains) {
        const all = [];
        domains.forEach(d => {
            if (elevatedDomains[d] && elevatedDomains[d].topSignals) {
                all.push(...elevatedDomains[d].topSignals);
            }
        });
        return all.sort((a, b) => b.severity - a.severity).slice(0, 10);
    }

    // ── LIFECYCLE ──
    function start() {
        if (scanInterval) return;
        // Load persisted cascades
        if (typeof StateManager !== 'undefined') {
            const stored = StateManager.get('cascades_active', []);
            const now = Date.now();
            activeCascades = stored.filter(c => c.expiresAt > now);
            cascadeHistory = StateManager.get('cascades_history', []);
        }

        // First scan after a delay (let RSS pipeline populate first)
        setTimeout(() => {
            scan();
            scanInterval = setInterval(scan, CONFIG.SCAN_INTERVAL_MS);
        }, 30000); // 30s after page load

        console.log('%c[CASCADE] Detector armed. Scanning every 3min.', 'color: #ff0084; font-size: 10px;');
    }

    function stop() {
        if (scanInterval) {
            clearInterval(scanInterval);
            scanInterval = null;
        }
    }

    function getActive() {
        const now = Date.now();
        return activeCascades.filter(c => c.expiresAt > now);
    }

    function getHistory(limit = 20) {
        return cascadeHistory.slice(-limit).reverse();
    }

    // ── PUBLIC API ──
    return {
        start,
        stop,
        scan,
        getActive,
        getHistory,
        CASCADE_PATTERNS,
        CONFIG,
    };
})();
