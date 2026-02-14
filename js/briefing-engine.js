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
        DOMAIN_META,
    };

})();
