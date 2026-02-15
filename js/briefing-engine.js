// ═══════════════════════════════════════════════════════════════
// BRIEFING_ENGINE v1.0 — Automated Intelligence Report Generator
// Hybrid Syndicate / Ethic Software Foundation
// ═══════════════════════════════════════════════════════════════
// "Data without synthesis is noise. Intelligence without
//  briefing is wasted potential."
//
// Generates structured intelligence reports from signal archive.
// Periods: 24h, 7d, 30d. Exportable. Printable. Zero servers.
// ═══════════════════════════════════════════════════════════════

const BriefingEngine = (() => {

    const DOMAIN_META = {
        CLIMATE:     { color: '#00c8ff', icon: '◈', name: 'Climate / Ecology' },
        GEOPOLITICS: { color: '#ff3344', icon: '◆', name: 'Geopolitics' },
        ECONOMY:     { color: '#00d4aa', icon: '◇', name: 'Economy' },
        TECHNOLOGY:  { color: '#39ff14', icon: '◉', name: 'Technology' },
        SOCIAL:      { color: '#ff6633', icon: '◎', name: 'Social' },
        ENERGY:      { color: '#ffbf00', icon: '◐', name: 'Energy' },
    };

    function getArchive() {
        if (typeof PersistenceManager !== 'undefined') return PersistenceManager.getArchive();
        try { return JSON.parse(localStorage.getItem('hs_signal_archive') || '[]'); } catch (e) { return []; }
    }

    // ══════════════════════════════════════════════
    // PERIOD FILTER
    // ══════════════════════════════════════════════

    function getSignalsForPeriod(period) {
        const archive = getArchive();
        const now = Date.now();
        const windows = { '24h': 86400000, '7d': 604800000, '30d': 2592000000 };
        const windowMs = windows[period] || windows['24h'];
        return archive.filter(s => (now - s.time) < windowMs);
    }

    // ══════════════════════════════════════════════
    // DOMAIN ANALYSIS
    // ══════════════════════════════════════════════

    function analyzeDomain(signals, domain) {
        const domainSignals = signals.filter(s => s.domain === domain);
        if (domainSignals.length === 0) return null;

        const sorted = [...domainSignals].sort((a, b) => b.severity - a.severity);
        const avgSeverity = Math.round(sorted.reduce((s, x) => s + (x.severity || 0), 0) / sorted.length);
        const maxSeverity = sorted[0].severity || 0;

        // Sources breakdown
        const sources = {};
        domainSignals.forEach(s => { sources[s.source] = (sources[s.source] || 0) + 1; });

        // Trend: compare first half vs second half
        const mid = Math.floor(domainSignals.length / 2);
        const firstHalf = domainSignals.slice(mid);
        const secondHalf = domainSignals.slice(0, mid);
        const firstAvg = firstHalf.length ? firstHalf.reduce((s, x) => s + (x.severity || 0), 0) / firstHalf.length : 0;
        const secondAvg = secondHalf.length ? secondHalf.reduce((s, x) => s + (x.severity || 0), 0) / secondHalf.length : 0;
        const trendDelta = Math.round(secondAvg - firstAvg);

        let trend = 'STABLE';
        if (trendDelta > 5) trend = 'RISING';
        else if (trendDelta < -5) trend = 'DECLINING';

        return {
            domain,
            meta: DOMAIN_META[domain],
            count: domainSignals.length,
            avgSeverity,
            maxSeverity,
            trend,
            trendDelta,
            topSignals: sorted.slice(0, 5),
            sources: Object.entries(sources).sort((a, b) => b[1] - a[1]),
        };
    }

    // ══════════════════════════════════════════════
    // THREAT ASSESSMENT
    // ══════════════════════════════════════════════

    function assessThreatLevel(signals) {
        if (signals.length === 0) return { level: 'UNKNOWN', color: '#666', score: 0 };

        const avgSev = signals.reduce((s, x) => s + (x.severity || 0), 0) / signals.length;
        const criticalCount = signals.filter(s => s.severity >= 70).length;
        const criticalRatio = criticalCount / signals.length;

        const score = Math.round(avgSev * 0.6 + criticalRatio * 100 * 0.4);

        if (score >= 65) return { level: 'CRITICAL', color: '#ff3344', score };
        if (score >= 50) return { level: 'HIGH', color: '#ff8833', score };
        if (score >= 35) return { level: 'ELEVATED', color: '#ffbf00', score };
        return { level: 'MODERATE', color: '#00d4aa', score };
    }

    // ══════════════════════════════════════════════
    // EMERGING PATTERNS
    // ══════════════════════════════════════════════

    function detectEmergingPatterns(signals) {
        const patterns = [];

        // Domain acceleration
        const domains = Object.keys(DOMAIN_META);
        const now = Date.now();
        const halfPoint = signals.length > 0
            ? signals[Math.floor(signals.length / 2)].time
            : now;

        domains.forEach(d => {
            const recent = signals.filter(s => s.domain === d && s.time >= halfPoint).length;
            const older = signals.filter(s => s.domain === d && s.time < halfPoint).length;

            if (recent > older * 1.5 && recent >= 3) {
                patterns.push({
                    type: 'DOMAIN_ACCELERATION',
                    domain: d,
                    message: `${DOMAIN_META[d].icon} ${d} in accelerazione: ${recent} segnali recenti vs ${older} precedenti.`,
                    severity: 'HIGH',
                    color: DOMAIN_META[d].color,
                });
            }
            if (older > recent * 1.5 && older >= 3) {
                patterns.push({
                    type: 'DOMAIN_DECELERATION',
                    domain: d,
                    message: `${DOMAIN_META[d].icon} ${d} in rallentamento: ${recent} segnali recenti vs ${older} precedenti.`,
                    severity: 'LOW',
                    color: DOMAIN_META[d].color,
                });
            }
        });

        // Severity clustering
        const highSev = signals.filter(s => s.severity >= 70);
        if (highSev.length >= 3) {
            const highDomains = [...new Set(highSev.map(s => s.domain))];
            if (highDomains.length >= 2) {
                patterns.push({
                    type: 'MULTI_DOMAIN_CRISIS',
                    message: `Segnali ad alta severity (70%+) in ${highDomains.length} domini: ${highDomains.join(', ')}. Possibile crisi sistemica.`,
                    severity: 'CRITICAL',
                    color: '#ff0084',
                });
            }
        }

        // Source concentration
        const sourceCounts = {};
        signals.forEach(s => { sourceCounts[s.source] = (sourceCounts[s.source] || 0) + 1; });
        const topSource = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1])[0];
        if (topSource && topSource[1] > signals.length * 0.4 && signals.length >= 5) {
            patterns.push({
                type: 'SOURCE_CONCENTRATION',
                message: `${topSource[0]} domina il flusso: ${topSource[1]}/${signals.length} segnali (${Math.round(topSource[1]/signals.length*100)}%). Verificare diversificazione fonti.`,
                severity: 'MODERATE',
                color: '#ffbf00',
            });
        }

        return patterns;
    }

    // ══════════════════════════════════════════════
    // ACTIONABLE INTELLIGENCE GENERATION
    // ══════════════════════════════════════════════
    // Produces operator-usable intelligence:
    //   - Key indicators to watch
    //   - Recommended actions
    //   - Escalation scenarios with probabilities

    function generateActionableIntel(signals) {
        const indicators = [];
        const actions = [];
        const scenarios = [];

        // Analyze domain states
        const domainStates = {};
        Object.keys(DOMAIN_META).forEach(d => {
            const domSignals = signals.filter(s => s.domain === d);
            const avgSev = domSignals.length > 0
                ? domSignals.reduce((sum, s) => sum + s.severity, 0) / domSignals.length
                : 0;
            domainStates[d] = {
                signalCount: domSignals.length,
                avgSeverity: Math.round(avgSev),
                topSignals: domSignals.sort((a, b) => b.severity - a.severity).slice(0, 3),
            };
        });

        // Get cascade patterns if available
        let cascades = [];
        if (typeof CorrelationEngine !== 'undefined' && CorrelationEngine.detectCascadePatterns) {
            cascades = CorrelationEngine.detectCascadePatterns(signals);
        }

        // Get entity correlations
        let entityBridges = [];
        if (typeof CorrelationEngine !== 'undefined' && CorrelationEngine.detectEntityCorrelations) {
            entityBridges = CorrelationEngine.detectEntityCorrelations(signals);
        }

        // GEOPOLITICS indicators
        if (domainStates.GEOPOLITICS.avgSeverity > 60) {
            indicators.push({
                indicator: 'Geopolitical escalation signals',
                domain: 'GEOPOLITICS',
                priority: 'HIGH',
                details: `${domainStates.GEOPOLITICS.signalCount} signals, avg severity ${domainStates.GEOPOLITICS.avgSeverity}%`,
                watchFor: 'Military posturing, alliance statements, sanctions announcements',
            });
            actions.push({
                action: 'Monitor major power official statements and military deployments',
                priority: 'HIGH',
                domain: 'GEOPOLITICS',
            });
        }

        // ECONOMY indicators
        if (domainStates.ECONOMY.avgSeverity > 55) {
            indicators.push({
                indicator: 'Economic stress signals',
                domain: 'ECONOMY',
                priority: 'HIGH',
                details: `${domainStates.ECONOMY.signalCount} signals, avg severity ${domainStates.ECONOMY.avgSeverity}%`,
                watchFor: 'Central bank actions, currency volatility, supply chain disruptions',
            });
            actions.push({
                action: 'Track financial market volatility and central bank communications',
                priority: 'MEDIUM',
                domain: 'ECONOMY',
            });
        }

        // ENERGY indicators
        if (domainStates.ENERGY.avgSeverity > 50) {
            indicators.push({
                indicator: 'Energy supply disruption risk',
                domain: 'ENERGY',
                priority: 'ELEVATED',
                details: `${domainStates.ENERGY.signalCount} signals, avg severity ${domainStates.ENERGY.avgSeverity}%`,
                watchFor: 'Pipeline status, OPEC decisions, extreme weather impact on infrastructure',
            });
        }

        // CLIMATE indicators
        if (domainStates.CLIMATE.avgSeverity > 50) {
            indicators.push({
                indicator: 'Climate event escalation',
                domain: 'CLIMATE',
                priority: 'ELEVATED',
                details: `${domainStates.CLIMATE.signalCount} signals, avg severity ${domainStates.CLIMATE.avgSeverity}%`,
                watchFor: 'Extreme weather events, agricultural disruptions, COP negotiations',
            });
        }

        // TECHNOLOGY indicators
        if (domainStates.TECHNOLOGY.avgSeverity > 55) {
            indicators.push({
                indicator: 'Technology disruption signals',
                domain: 'TECHNOLOGY',
                priority: 'HIGH',
                details: `${domainStates.TECHNOLOGY.signalCount} signals, avg severity ${domainStates.TECHNOLOGY.avgSeverity}%`,
                watchFor: 'Cyber incidents, AI regulatory developments, semiconductor supply',
            });
            actions.push({
                action: 'Monitor cybersecurity advisories and tech sector regulatory actions',
                priority: 'MEDIUM',
                domain: 'TECHNOLOGY',
            });
        }

        // SOCIAL indicators
        if (domainStates.SOCIAL.avgSeverity > 55) {
            indicators.push({
                indicator: 'Social unrest potential',
                domain: 'SOCIAL',
                priority: 'HIGH',
                details: `${domainStates.SOCIAL.signalCount} signals, avg severity ${domainStates.SOCIAL.avgSeverity}%`,
                watchFor: 'Protest movements, labor strikes, election instability',
            });
        }

        // CASCADE-DRIVEN INDICATORS
        cascades.forEach(cascade => {
            if (cascade.cascadeStrength > 50) {
                indicators.push({
                    indicator: `CASCADE: ${cascade.name}`,
                    domain: cascade.triggerDomain,
                    priority: cascade.severity,
                    details: `${cascade.activeCascades}/${cascade.totalCascadeSteps} cascade steps active, strength ${cascade.cascadeStrength}%`,
                    watchFor: cascade.cascadeEvidence.map(e => e.mechanism).join('; '),
                });
                actions.push({
                    action: `Monitor cascade progression: ${cascade.description}`,
                    priority: cascade.severity === 'CRITICAL' ? 'HIGH' : 'MEDIUM',
                    domain: cascade.triggerDomain,
                });
            }
        });

        // ENTITY-DRIVEN INDICATORS
        entityBridges.forEach(bridge => {
            if (bridge.bridgeScore > 6) {
                indicators.push({
                    indicator: `ENTITY BRIDGE: ${bridge.entity.name} (${bridge.entity.type})`,
                    domain: bridge.domains[0],
                    priority: bridge.avgSeverity > 60 ? 'HIGH' : 'ELEVATED',
                    details: `Bridges ${bridge.domains.join(' ↔ ')} with ${bridge.signalCount} signals`,
                    watchFor: `Activity related to ${bridge.entity.name} across multiple domains`,
                });
            }
        });

        // SCENARIOS based on current state
        const highDomains = Object.entries(domainStates)
            .filter(([, s]) => s.avgSeverity > 60)
            .map(([d]) => d);

        if (highDomains.includes('GEOPOLITICS') && highDomains.includes('ENERGY')) {
            scenarios.push({
                scenario: 'Resource conflict escalation',
                probability: 0.45,
                timeframe: '7-14 days',
                indicators: ['Military deployments near energy infrastructure', 'Sanctions escalation', 'OPEC emergency sessions'],
                domains: ['GEOPOLITICS', 'ENERGY'],
            });
        }

        if (highDomains.includes('ECONOMY') && highDomains.includes('SOCIAL')) {
            scenarios.push({
                scenario: 'Economic crisis triggers social instability',
                probability: 0.38,
                timeframe: '14-30 days',
                indicators: ['Unemployment spike', 'Inflation acceleration', 'Protest coordination'],
                domains: ['ECONOMY', 'SOCIAL'],
            });
        }

        if (highDomains.includes('CLIMATE') && highDomains.includes('ENERGY')) {
            scenarios.push({
                scenario: 'Climate event disrupts energy supply',
                probability: 0.42,
                timeframe: '7-21 days',
                indicators: ['Extreme weather forecasts', 'Grid stress reports', 'Emergency declarations'],
                domains: ['CLIMATE', 'ENERGY'],
            });
        }

        if (highDomains.length >= 3) {
            scenarios.push({
                scenario: 'Systemic multi-domain crisis',
                probability: 0.22,
                timeframe: '30+ days',
                indicators: ['Simultaneous high-severity signals across 3+ domains', 'Cascade pattern activation'],
                domains: highDomains,
            });
        }

        // Sort by priority
        const priorityOrder = { HIGH: 0, CRITICAL: 0, ELEVATED: 1, MEDIUM: 2, MODERATE: 2, LOW: 3 };
        indicators.sort((a, b) => (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3));
        actions.sort((a, b) => (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3));
        scenarios.sort((a, b) => b.probability - a.probability);

        return {
            indicators: indicators.slice(0, 10),
            actions: actions.slice(0, 8),
            scenarios: scenarios.slice(0, 5),
            dataQuality: {
                signalCount: signals.length,
                domainCoverage: Object.values(domainStates).filter(d => d.signalCount > 0).length,
                maxDomains: Object.keys(DOMAIN_META).length,
                completeness: Math.round(Object.values(domainStates).filter(d => d.signalCount > 0).length / Object.keys(DOMAIN_META).length * 100),
            },
        };
    }

    // ══════════════════════════════════════════════
    // GENERATE FULL BRIEFING
    // ══════════════════════════════════════════════

    function generateBriefing(period) {
        const signals = getSignalsForPeriod(period);
        const allSignals = getArchive();

        const domainAnalyses = {};
        Object.keys(DOMAIN_META).forEach(d => {
            const analysis = analyzeDomain(signals, d);
            if (analysis) domainAnalyses[d] = analysis;
        });

        // Sort domains by count descending
        const rankedDomains = Object.values(domainAnalyses).sort((a, b) => b.count - a.count);

        const threat = assessThreatLevel(signals);
        const patterns = detectEmergingPatterns(signals);
        const topSignals = [...signals].sort((a, b) => b.severity - a.severity).slice(0, 10);

        // Correlations
        let correlations = [];
        if (typeof CorrelationEngine !== 'undefined') {
            correlations = CorrelationEngine.detectCorrelations(signals);
        }

        const periodLabels = { '24h': 'ULTIME 24 ORE', '7d': 'ULTIMI 7 GIORNI', '30d': 'ULTIMI 30 GIORNI' };

        // Actionable intelligence
        const actionableIntel = generateActionableIntel(signals);

        // Cascade patterns
        let cascadePatterns = [];
        if (typeof CorrelationEngine !== 'undefined' && CorrelationEngine.detectCascadePatterns) {
            cascadePatterns = CorrelationEngine.detectCascadePatterns(signals);
        }

        return {
            period,
            periodLabel: periodLabels[period] || period,
            generatedAt: Date.now(),
            signalCount: signals.length,
            totalArchive: allSignals.length,
            threatAssessment: threat,
            domainAnalyses: rankedDomains,
            emergingPatterns: patterns,
            topSignals,
            correlations,
            cascadePatterns,
            actionableIntel,
            sources: getSourceSummary(signals),
        };
    }

    function getSourceSummary(signals) {
        const sources = {};
        signals.forEach(s => {
            if (!sources[s.source]) sources[s.source] = { count: 0, avgSev: 0, sevSum: 0 };
            sources[s.source].count++;
            sources[s.source].sevSum += (s.severity || 0);
        });
        Object.values(sources).forEach(s => { s.avgSev = Math.round(s.sevSum / s.count); });
        return Object.entries(sources)
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => b.count - a.count);
    }

    // ══════════════════════════════════════════════
    // EXPORT TEXT REPORT
    // ══════════════════════════════════════════════

    function exportTextReport(briefing) {
        const sep = '═'.repeat(60);
        const thin = '─'.repeat(60);
        const now = new Date(briefing.generatedAt);
        const dateStr = now.toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const timeStr = now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

        let report = '';
        report += `${sep}\n`;
        report += `  HYBRID SYNDICATE — INTELLIGENCE BRIEFING\n`;
        report += `  ${briefing.periodLabel}\n`;
        report += `${sep}\n`;
        report += `  Generated: ${dateStr} ${timeStr}\n`;
        report += `  Signals analyzed: ${briefing.signalCount}\n`;
        report += `  Threat level: ${briefing.threatAssessment.level} (score: ${briefing.threatAssessment.score})\n`;
        report += `${thin}\n\n`;

        // Domain summaries
        report += `  DOMAIN ANALYSIS\n`;
        report += `${thin}\n`;
        briefing.domainAnalyses.forEach(da => {
            report += `\n  ${da.meta.icon} ${da.domain}\n`;
            report += `  Signals: ${da.count} | Avg severity: ${da.avgSeverity}% | Max: ${da.maxSeverity}% | Trend: ${da.trend} (${da.trendDelta > 0 ? '+' : ''}${da.trendDelta})\n`;
            if (da.topSignals.length > 0) {
                report += `  Top signals:\n`;
                da.topSignals.slice(0, 3).forEach(s => {
                    report += `    [SEV:${s.severity}%] ${s.title}\n`;
                    if (s.link) report += `    ${s.link}\n`;
                });
            }
        });

        // Patterns
        if (briefing.emergingPatterns.length > 0) {
            report += `\n\n  EMERGING PATTERNS\n`;
            report += `${thin}\n`;
            briefing.emergingPatterns.forEach(p => {
                report += `  [${p.severity}] ${p.message}\n`;
            });
        }

        // Correlations
        if (briefing.correlations.length > 0) {
            report += `\n\n  CROSS-DOMAIN CORRELATIONS\n`;
            report += `${thin}\n`;
            briefing.correlations.forEach(c => {
                report += `  [${c.threat}] ${c.name}: ${c.description} (strength: ${c.strength}%)\n`;
            });
        }

        // Cascade patterns
        if (briefing.cascadePatterns && briefing.cascadePatterns.length > 0) {
            report += `\n\n  CASCADE PATTERNS\n`;
            report += `${thin}\n`;
            briefing.cascadePatterns.forEach(c => {
                report += `  [${c.severity}] ${c.name} (strength: ${c.cascadeStrength}%)\n`;
                report += `  ${c.description}\n`;
                c.cascadeEvidence.forEach(e => {
                    const status = e.active ? 'ACTIVE' : 'DORMANT';
                    report += `    → ${e.domain} [${status}]: ${e.mechanism}\n`;
                });
                report += '\n';
            });
        }

        // Actionable Intelligence
        if (briefing.actionableIntel) {
            const ai = briefing.actionableIntel;
            if (ai.indicators.length > 0) {
                report += `\n\n  KEY INDICATORS TO WATCH\n`;
                report += `${thin}\n`;
                ai.indicators.forEach(ind => {
                    report += `  [${ind.priority}] ${ind.indicator}\n`;
                    report += `    ${ind.details}\n`;
                    report += `    Watch for: ${ind.watchFor}\n\n`;
                });
            }
            if (ai.actions.length > 0) {
                report += `\n  RECOMMENDED ACTIONS\n`;
                report += `${thin}\n`;
                ai.actions.forEach((act, i) => {
                    report += `  ${i + 1}. [${act.priority}] ${act.action}\n`;
                });
            }
            if (ai.scenarios.length > 0) {
                report += `\n\n  ESCALATION SCENARIOS\n`;
                report += `${thin}\n`;
                ai.scenarios.forEach(sc => {
                    report += `  ⚠ ${sc.scenario}\n`;
                    report += `    Probability: ${Math.round(sc.probability * 100)}% | Timeframe: ${sc.timeframe}\n`;
                    report += `    Domains: ${sc.domains.join(', ')}\n`;
                    report += `    Indicators:\n`;
                    sc.indicators.forEach(ind => {
                        report += `      • ${ind}\n`;
                    });
                    report += '\n';
                });
            }
            report += `\n  DATA QUALITY\n`;
            report += `${thin}\n`;
            report += `  Signals: ${ai.dataQuality.signalCount} | Domain coverage: ${ai.dataQuality.domainCoverage}/${ai.dataQuality.maxDomains} (${ai.dataQuality.completeness}%)\n`;
        }

        // Top signals
        report += `\n\n  TOP ${briefing.topSignals.length} SIGNALS BY SEVERITY\n`;
        report += `${thin}\n`;
        briefing.topSignals.forEach((s, i) => {
            report += `  ${i + 1}. [${s.domain}] SEV:${s.severity}% — ${s.title}\n`;
            report += `     Source: ${s.source}`;
            if (s.link) report += ` | ${s.link}`;
            report += '\n';
        });

        // Sources
        report += `\n\n  SOURCE BREAKDOWN\n`;
        report += `${thin}\n`;
        briefing.sources.forEach(s => {
            report += `  ${s.name}: ${s.count} signals (avg sev: ${s.avgSev}%)\n`;
        });

        report += `\n${sep}\n`;
        report += `  HYBRID SYNDICATE // ETHIC SOFTWARE FOUNDATION\n`;
        report += `  "Truth without compromise"\n`;
        report += `  Zero servers. Your data stays yours.\n`;
        report += `${sep}\n`;

        return report;
    }

    function downloadReport(briefing) {
        const text = exportTextReport(briefing);
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const date = new Date().toISOString().slice(0, 10);
        a.href = url;
        a.download = `HS_BRIEFING_${briefing.period}_${date}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        if (typeof CoreFeed !== 'undefined') {
            CoreFeed.addMessage('PANKOW_77C', `Briefing ${briefing.periodLabel} esportato. Intelligence report salvato.`);
        }
    }

    // ══════════════════════════════════════════════
    // PUBLIC API
    // ══════════════════════════════════════════════

    return {
        generateBriefing,
        exportTextReport,
        downloadReport,
        assessThreatLevel,
        detectEmergingPatterns,
        generateActionableIntel,
        DOMAIN_META,
    };

})();
