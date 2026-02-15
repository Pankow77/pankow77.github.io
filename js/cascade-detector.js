// ═══════════════════════════════════════════════════
// CASCADE DETECTOR v1.0 — Cross-Domain Correlation Engine
// Hybrid Syndicate / Ethic Software Foundation
// ═══════════════════════════════════════════════════
// Detects when multiple domains spike simultaneously
// Identifies correlated signal clusters
// Feeds into BriefingEngine for report generation

(function(global) {
    'use strict';

    const DOMAINS = ['climate', 'geopolitics', 'economics', 'technology', 'epistemology', 'social'];

    // Known historical cascade patterns
    const CASCADE_PATTERNS = [
        {
            id: 'energy-climate-econ',
            name: 'Energy-Climate Economic Cascade',
            domains: ['climate', 'economics'],
            keywords: ['energy', 'oil', 'gas', 'fossil', 'price', 'supply', 'carbon'],
            description: 'Climate events triggering energy price disruption and economic instability'
        },
        {
            id: 'geopolitical-econ-social',
            name: 'Geopolitical Destabilization Cascade',
            domains: ['geopolitics', 'economics', 'social'],
            keywords: ['sanctions', 'war', 'conflict', 'refugee', 'trade', 'crisis'],
            description: 'Geopolitical conflict spreading to economic disruption and social displacement'
        },
        {
            id: 'tech-epistemic',
            name: 'Technology-Epistemology Cascade',
            domains: ['technology', 'epistemology'],
            keywords: ['ai', 'deepfake', 'misinformation', 'regulation', 'algorithm', 'manipulation'],
            description: 'Technological capability outpacing epistemic defenses'
        },
        {
            id: 'climate-social-geo',
            name: 'Climate Migration Cascade',
            domains: ['climate', 'social', 'geopolitics'],
            keywords: ['drought', 'flood', 'migration', 'displacement', 'border', 'resource'],
            description: 'Climate events causing mass displacement and geopolitical friction'
        },
        {
            id: 'econ-social-epistemic',
            name: 'Economic Trust Cascade',
            domains: ['economics', 'social', 'epistemology'],
            keywords: ['inequality', 'trust', 'institution', 'protest', 'populism', 'media'],
            description: 'Economic disparity eroding institutional trust and epistemic consensus'
        },
        {
            id: 'tech-econ-geo',
            name: 'Tech Sovereignty Cascade',
            domains: ['technology', 'economics', 'geopolitics'],
            keywords: ['semiconductor', 'chip', 'supply chain', 'tariff', 'sanction', 'computing'],
            description: 'Technology competition driving economic fragmentation and geopolitical rivalry'
        }
    ];

    // ── State ──
    let _cascades = [];
    let _signalBuffer = [];
    const MAX_BUFFER = 1000;
    const MAX_CASCADES = 50;
    const CASCADE_WINDOW_MS = 30 * 60 * 1000; // 30 min window for correlation

    // ── Analyze signals for cascades ──
    function detectCascades(signals) {
        if (signals.length < 3) return [];

        const newCascades = [];
        const now = Date.now();

        // Add to buffer
        _signalBuffer = _signalBuffer.concat(signals).slice(-MAX_BUFFER);

        // Get recent signals within window
        const recent = _signalBuffer.filter(s => (now - (s.timestamp || 0)) < CASCADE_WINDOW_MS);
        if (recent.length < 3) return [];

        // Group by domain
        const byDomain = {};
        recent.forEach(s => {
            if (!byDomain[s.domain]) byDomain[s.domain] = [];
            byDomain[s.domain].push(s);
        });

        // Count active domains (domains with 2+ signals)
        const activeDomains = Object.entries(byDomain)
            .filter(([, sigs]) => sigs.length >= 2)
            .map(([domain, sigs]) => ({
                domain,
                count: sigs.length,
                avgSeverity: sigs.reduce((a, s) => a + s.severity, 0) / sigs.length,
                maxSeverity: Math.max(...sigs.map(s => s.severity)),
                signals: sigs
            }));

        if (activeDomains.length < 2) return [];

        // Check against known patterns
        const activeDomainNames = activeDomains.map(d => d.domain);

        CASCADE_PATTERNS.forEach(pattern => {
            // Check if pattern domains are all active
            const matchingDomains = pattern.domains.filter(d => activeDomainNames.includes(d));
            if (matchingDomains.length < 2) return;

            const domainMatch = matchingDomains.length / pattern.domains.length;

            // Check keyword overlap
            const allText = recent.map(s => ((s.title || '') + ' ' + (s.description || '')).toLowerCase()).join(' ');
            const keywordHits = pattern.keywords.filter(kw => allText.includes(kw));
            const keywordMatch = keywordHits.length / pattern.keywords.length;

            // Combined confidence
            const confidence = Math.round((domainMatch * 60 + keywordMatch * 40));

            if (confidence < 30) return;

            // Calculate cascade severity from participating signals
            const participatingSignals = recent.filter(s => matchingDomains.includes(s.domain));
            const cascadeSeverity = Math.round(
                participatingSignals.reduce((a, s) => a + s.severity, 0) / participatingSignals.length
            );

            // Check for duplicates (same pattern in last 10 min)
            const isDuplicate = _cascades.some(c =>
                c.patternId === pattern.id &&
                (now - c.timestamp) < 10 * 60 * 1000
            );
            if (isDuplicate) return;

            const cascade = {
                id: 'cascade_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
                patternId: pattern.id,
                patternName: pattern.name,
                description: pattern.description,
                domains: matchingDomains,
                confidence,
                severity: cascadeSeverity,
                signalCount: participatingSignals.length,
                keywordHits,
                timestamp: now,
                topSignals: participatingSignals
                    .sort((a, b) => b.severity - a.severity)
                    .slice(0, 5)
                    .map(s => ({ title: s.title, domain: s.domain, severity: s.severity, source: s.source }))
            };

            newCascades.push(cascade);
        });

        // Also detect unpatternend cascades (novel correlations)
        if (activeDomains.length >= 3) {
            const avgSev = activeDomains.reduce((a, d) => a + d.avgSeverity, 0) / activeDomains.length;
            if (avgSev >= 30) {
                const domainNames = activeDomains.map(d => d.domain);
                const knownMatch = CASCADE_PATTERNS.some(p =>
                    p.domains.every(d => domainNames.includes(d))
                );

                if (!knownMatch) {
                    const isDuplicate = _cascades.some(c =>
                        c.patternId === 'novel' &&
                        (now - c.timestamp) < 15 * 60 * 1000
                    );

                    if (!isDuplicate) {
                        newCascades.push({
                            id: 'cascade_novel_' + Date.now(),
                            patternId: 'novel',
                            patternName: 'Novel Cross-Domain Correlation',
                            description: activeDomains.length + ' domains showing simultaneous activity without known pattern match',
                            domains: domainNames,
                            confidence: Math.round(avgSev * 0.6),
                            severity: Math.round(avgSev),
                            signalCount: recent.length,
                            keywordHits: [],
                            timestamp: now,
                            topSignals: recent
                                .sort((a, b) => b.severity - a.severity)
                                .slice(0, 5)
                                .map(s => ({ title: s.title, domain: s.domain, severity: s.severity, source: s.source }))
                        });
                    }
                }
            }
        }

        // Store new cascades
        _cascades = _cascades.concat(newCascades).slice(-MAX_CASCADES);

        // Persist in StateManager
        if (global.StateManager && newCascades.length > 0) {
            StateManager.set('cascades', _cascades);
            StateManager.set('cascade_count', _cascades.length);
        }

        return newCascades;
    }

    // ── Public API ──
    const CascadeDetector = {
        // Process new signals and return any detected cascades
        process(signals) {
            return detectCascades(signals);
        },

        // Get all stored cascades
        getCascades() {
            return _cascades.slice();
        },

        // Get recent cascades (last N minutes)
        getRecent(minutes) {
            const cutoff = Date.now() - (minutes || 60) * 60 * 1000;
            return _cascades.filter(c => c.timestamp > cutoff);
        },

        // Get known patterns
        getPatterns() {
            return CASCADE_PATTERNS.map(p => ({ ...p }));
        },

        // Get cascade stats
        getStats() {
            const now = Date.now();
            const hour = _cascades.filter(c => (now - c.timestamp) < 3600000);
            return {
                total: _cascades.length,
                lastHour: hour.length,
                avgConfidence: hour.length > 0 ? Math.round(hour.reduce((a, c) => a + c.confidence, 0) / hour.length) : 0,
                avgSeverity: hour.length > 0 ? Math.round(hour.reduce((a, c) => a + c.severity, 0) / hour.length) : 0,
                signalBuffer: _signalBuffer.length
            };
        },

        // Initialize from stored state
        init() {
            if (global.StateManager) {
                const stored = StateManager.get('cascades', []);
                if (stored.length > 0) _cascades = stored;
            }
            console.log('%c[CascadeDetector] initialized — patterns: ' + CASCADE_PATTERNS.length,
                'color: #ff8833; font-weight: bold');
        }
    };

    // Auto-init
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => CascadeDetector.init());
    } else {
        setTimeout(() => CascadeDetector.init(), 100);
    }

    global.CascadeDetector = CascadeDetector;

})(typeof window !== 'undefined' ? window : this);
