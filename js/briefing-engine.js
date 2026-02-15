// ═══════════════════════════════════════════════════
// BRIEFING ENGINE v1.0 (Lite) — Actionable Intelligence Reports
// Hybrid Syndicate / Ethic Software Foundation
// ═══════════════════════════════════════════════════
// Converts cascades + signals into structured intelligence briefs
// Pattern matching, NLG templates, recommendation engine
// Stores briefings in StateManager

(function(global) {
    'use strict';

    const MAX_BRIEFINGS = 20;

    // ═══ NLG TEMPLATES ═══
    const FINDING_TEMPLATES = {
        'energy-climate-econ': [
            'Correlated signals detected across CLIMATE and ECONOMICS domains — energy disruption pattern active',
            'Climate-driven energy price volatility detected with {signalCount} signals in {window}',
            'Historical pattern match: energy-climate cascade similar to 2022-Q1 European energy crisis'
        ],
        'geopolitical-econ-social': [
            'Geopolitical tension spreading to economic and social domains — destabilization cascade detected',
            'Sanctions/conflict signals correlating with economic disruption indicators ({signalCount} signals)',
            'Social displacement signals emerging alongside geopolitical friction — monitor refugee corridors'
        ],
        'tech-epistemic': [
            'Technology-epistemology cascade active — AI/synthetic content signals correlating with trust erosion',
            'Deepfake/misinformation spike detected alongside technology regulation signals',
            'Epistemic defense capabilities lagging behind technological disruption rate'
        ],
        'climate-social-geo': [
            'Climate migration cascade detected — environmental events driving displacement and border tension',
            'Resource scarcity signals correlating with social unrest across {domainCount} domains',
            'Historical pattern: climate-driven migration cascades precede geopolitical friction by 3-6 months'
        ],
        'econ-social-epistemic': [
            'Economic inequality signals correlating with institutional trust erosion',
            'Populism indicators rising alongside economic disparity markers — epistemic consensus degrading',
            'Trust cascade: economic stress propagating through social and epistemic channels'
        ],
        'tech-econ-geo': [
            'Technology sovereignty cascade — semiconductor/compute signals correlating with trade friction',
            'Supply chain disruption signals across technology, economics, and geopolitics domains',
            'Tech decoupling accelerating: {signalCount} correlated signals in {window}'
        ],
        'novel': [
            'Unusual cross-domain correlation detected across {domainCount} domains without known pattern match',
            'Novel signal cluster: {domains} showing simultaneous elevated activity',
            'Uncharted cascade territory — multiple domains activated simultaneously, pattern analysis inconclusive'
        ]
    };

    const RECOMMENDATION_MAP = {
        'energy-climate-econ': [
            'Monitor energy sector price movements and supply chain announcements',
            'Track climate event escalation for 48-72 hour forecast window',
            'Assess exposure to energy-dependent economic sectors'
        ],
        'geopolitical-econ-social': [
            'Activate geopolitical monitoring — track diplomatic communications',
            'Assess economic sanction impact on connected markets',
            'Monitor humanitarian corridors and displacement data'
        ],
        'tech-epistemic': [
            'Increase epistemic verification protocols across information sources',
            'Track AI regulation announcements and enforcement actions',
            'Evaluate synthetic content detection capabilities'
        ],
        'climate-social-geo': [
            'Monitor climate event trajectory and affected population centers',
            'Track displacement data and border policy changes',
            'Prepare resource allocation scenarios for humanitarian response'
        ],
        'econ-social-epistemic': [
            'Monitor institutional trust indicators across affected regions',
            'Track economic policy announcements for inequality impact',
            'Evaluate information ecosystem integrity in affected markets'
        ],
        'tech-econ-geo': [
            'Track semiconductor supply chain status and trade policy shifts',
            'Monitor technology export controls and sanctions',
            'Assess compute infrastructure dependencies and alternatives'
        ],
        'novel': [
            'Increase monitoring frequency across all activated domains',
            'Cross-reference with historical data for emerging pattern identification',
            'Prepare adaptive response scenarios for uncharted correlation'
        ]
    };

    const SEVERITY_LABELS = {
        critical: { min: 70, label: 'CRITICAL', color: '#ff3344' },
        high:     { min: 50, label: 'HIGH',     color: '#ff8833' },
        elevated: { min: 30, label: 'ELEVATED', color: '#ffcc00' },
        moderate: { min: 0,  label: 'MODERATE', color: '#00d4aa' }
    };

    // ═══ BRIEFING GENERATION ═══

    function getSeverityLabel(severity) {
        if (severity >= 70) return SEVERITY_LABELS.critical;
        if (severity >= 50) return SEVERITY_LABELS.high;
        if (severity >= 30) return SEVERITY_LABELS.elevated;
        return SEVERITY_LABELS.moderate;
    }

    function fillTemplate(template, data) {
        return template
            .replace('{signalCount}', data.signalCount || '?')
            .replace('{window}', data.window || '30min')
            .replace('{domainCount}', data.domainCount || '?')
            .replace('{domains}', data.domains || '?');
    }

    function generateFindings(cascade) {
        const templates = FINDING_TEMPLATES[cascade.patternId] || FINDING_TEMPLATES['novel'];
        const data = {
            signalCount: cascade.signalCount,
            window: '30min',
            domainCount: cascade.domains.length,
            domains: cascade.domains.map(d => d.toUpperCase()).join(' + ')
        };

        // Pick 2-3 findings
        const count = Math.min(templates.length, cascade.severity >= 50 ? 3 : 2);
        const selected = templates.slice(0, count);
        return selected.map(t => fillTemplate(t, data));
    }

    function generateRecommendations(cascade) {
        const recs = RECOMMENDATION_MAP[cascade.patternId] || RECOMMENDATION_MAP['novel'];
        const count = cascade.severity >= 60 ? 3 : 2;
        return recs.slice(0, count);
    }

    function calculateProbability(cascade) {
        const base = cascade.confidence;
        const sevFactor = cascade.severity / 100;
        const signalFactor = Math.min(1, cascade.signalCount / 20);

        return {
            shortTerm:  Math.min(95, Math.round(base * 0.9 + sevFactor * 15 + signalFactor * 10)),
            mediumTerm: Math.min(90, Math.round(base * 0.7 + sevFactor * 10 + signalFactor * 5)),
            longTerm:   Math.min(80, Math.round(base * 0.4 + sevFactor * 8))
        };
    }

    function generateBriefing(cascade) {
        const sevInfo = getSeverityLabel(cascade.severity);

        const briefing = {
            id: 'brief_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            timestamp: Date.now(),
            title: cascade.patternName,
            severity: sevInfo.label,
            severityColor: sevInfo.color,
            severityValue: cascade.severity,

            // Probabilistic assessment
            probability: calculateProbability(cascade),

            // Key findings (NLG)
            findings: generateFindings(cascade),

            // Recommendations
            recommendations: generateRecommendations(cascade),

            // Metadata
            domains: cascade.domains,
            confidence: cascade.confidence,
            signalCount: cascade.signalCount,
            cascadeId: cascade.id,
            patternId: cascade.patternId,

            // Top supporting signals
            topSignals: cascade.topSignals || []
        };

        return briefing;
    }

    // ═══ STATE ═══
    let _briefings = [];
    let _listeners = [];

    // ═══ PUBLIC API ═══
    const BriefingEngine = {
        // Process cascades into briefings
        process(cascades) {
            if (!cascades || cascades.length === 0) return [];

            const newBriefings = cascades.map(c => generateBriefing(c));

            _briefings = _briefings.concat(newBriefings).slice(-MAX_BRIEFINGS);

            // Persist
            if (global.StateManager) {
                StateManager.set('briefings', _briefings);
                StateManager.set('briefing_count', _briefings.length);
            }

            // Notify listeners
            _listeners.forEach(fn => {
                try { fn(newBriefings); } catch(e) {}
            });

            // Trigger CoreFeed for critical briefings
            if (global.CoreFeed) {
                newBriefings.forEach(b => {
                    if (b.severityValue >= 50) {
                        CoreFeed.trigger('rss-pipeline');
                    }
                });
            }

            return newBriefings;
        },

        // Get all briefings
        getBriefings() {
            return _briefings.slice();
        },

        // Get latest briefing
        getLatest() {
            return _briefings.length > 0 ? _briefings[_briefings.length - 1] : null;
        },

        // Get critical briefings
        getCritical() {
            return _briefings.filter(b => b.severityValue >= 70);
        },

        // Listen for new briefings
        onBriefing(callback) {
            _listeners.push(callback);
            return () => { _listeners = _listeners.filter(fn => fn !== callback); };
        },

        // Generate a summary of current intelligence state
        getSitRep() {
            const recent = _briefings.filter(b => (Date.now() - b.timestamp) < 3600000);
            if (recent.length === 0) {
                return {
                    status: 'NOMINAL',
                    activeCascades: 0,
                    criticalCount: 0,
                    summary: 'No active cascades detected. All domains within normal parameters.',
                    domains: []
                };
            }

            const critCount = recent.filter(b => b.severityValue >= 70).length;
            const activeDomains = [...new Set(recent.flatMap(b => b.domains))];
            const avgSeverity = Math.round(recent.reduce((a, b) => a + b.severityValue, 0) / recent.length);

            let status = 'NOMINAL';
            if (avgSeverity >= 70) status = 'CRITICAL';
            else if (avgSeverity >= 50) status = 'ELEVATED';
            else if (avgSeverity >= 30) status = 'GUARDED';

            const summary = critCount > 0
                ? critCount + ' critical cascade(s) active across ' + activeDomains.length + ' domains. Immediate attention required.'
                : recent.length + ' active cascade(s) detected. Average severity: ' + avgSeverity + '%. Monitoring recommended.';

            return {
                status,
                activeCascades: recent.length,
                criticalCount: critCount,
                avgSeverity,
                summary,
                domains: activeDomains
            };
        },

        // Initialize from stored state
        init() {
            if (global.StateManager) {
                const stored = StateManager.get('briefings', []);
                if (stored.length > 0) _briefings = stored;
            }
            console.log('%c[BriefingEngine] initialized — briefings: ' + _briefings.length,
                'color: #ff0084; font-weight: bold');
        }
    };

    // Auto-init
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => BriefingEngine.init());
    } else {
        setTimeout(() => BriefingEngine.init(), 150);
    }

    global.BriefingEngine = BriefingEngine;

})(typeof window !== 'undefined' ? window : this);
