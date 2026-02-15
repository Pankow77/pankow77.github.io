// ═══════════════════════════════════════════════════════════
// BRIEFING-ENGINE v1.0 — Actionable Intelligence Generator
// Hybrid Syndicate / Ethic Software Foundation
// ═══════════════════════════════════════════════════════════
// Generates structured intelligence briefings from:
// - RSS Pipeline signals
// - Cascade Detector patterns
// - StateManager historical data
// Output: HTML briefing reports with executive summary,
// domain breakdown, cascade warnings, recommendations.

const BriefingEngine = (() => {
    'use strict';

    // ── THREAT LEVEL DEFINITIONS ──
    const THREAT_LEVELS = [
        { name: 'NOMINAL',   color: '#39ff14', min: 0,  max: 25, icon: '●', description: 'Systems stable. No significant threats detected.' },
        { name: 'ELEVATED',  color: '#ffcc00', min: 26, max: 50, icon: '▲', description: 'Minor anomalies. Monitoring recommended.' },
        { name: 'HIGH',      color: '#ff6600', min: 51, max: 70, icon: '◆', description: 'Significant threats. Active monitoring required.' },
        { name: 'CRITICAL',  color: '#ff0040', min: 71, max: 85, icon: '◈', description: 'Multi-vector threats. Immediate assessment needed.' },
        { name: 'OMEGA',     color: '#ff0040', min: 86, max: 100, icon: '⬟', description: 'Systemic cascade. Full spectrum crisis.' },
    ];

    // ── DOMAIN METADATA ──
    const DOMAIN_META = {
        geopolitics: { label: 'Geopolitics', color: '#ff3344', icon: '⚔', unit: 'MARXIAN_CORE' },
        economy:     { label: 'Economy',     color: '#ffcc00', icon: '◊', unit: 'CODE_ENCODER' },
        climate:     { label: 'Climate',     color: '#00dd66', icon: '◉', unit: 'ORACLE_CORE' },
        technology:  { label: 'Technology',  color: '#00c8ff', icon: '⬡', unit: 'GHOST_RUNNER' },
        social:      { label: 'Social',      color: '#ff6633', icon: '◎', unit: 'NARRATIVE_ENGINE' },
        epistemic:   { label: 'Epistemic',   color: '#8855ff', icon: '◇', unit: 'AFFECTIVE_CORE' },
    };

    // ── GENERATE BRIEFING ──
    async function generate(options = {}) {
        const {
            hours = 6,
            includeRecommendations = true,
            format = 'html'
        } = options;

        const timestamp = Date.now();
        const briefingId = 'BRF-' + timestamp.toString(36).toUpperCase();

        // Gather intelligence
        const signals = typeof StateManager !== 'undefined'
            ? await StateManager.signals.getRecent(hours, 200)
            : [];
        const domainStats = typeof StateManager !== 'undefined'
            ? await StateManager.signals.getDomainStats(hours)
            : {};
        const cascades = typeof CascadeDetector !== 'undefined'
            ? CascadeDetector.getActive()
            : [];
        const cascadeHistory = typeof CascadeDetector !== 'undefined'
            ? CascadeDetector.getHistory(10)
            : [];

        // Calculate global threat level
        const globalSeverity = calculateGlobalSeverity(domainStats, cascades);
        const threatLevel = getThreatLevel(globalSeverity);

        // Build sections
        const executive = buildExecutiveSummary(signals, domainStats, cascades, globalSeverity, threatLevel, hours);
        const domainBreakdown = buildDomainBreakdown(domainStats);
        const cascadeSection = buildCascadeSection(cascades, cascadeHistory);
        const topSignals = buildTopSignals(signals);
        const recommendations = includeRecommendations
            ? buildRecommendations(domainStats, cascades, globalSeverity)
            : null;

        const briefing = {
            id: briefingId,
            timestamp,
            hours,
            threatLevel,
            globalSeverity,
            signalCount: signals.length,
            cascadeCount: cascades.length,
            sections: {
                executive,
                domainBreakdown,
                cascadeSection,
                topSignals,
                recommendations,
            }
        };

        // Store briefing
        if (typeof StateManager !== 'undefined') {
            const history = StateManager.get('briefing_history', []);
            history.push({
                id: briefingId,
                timestamp,
                threatLevel: threatLevel.name,
                severity: globalSeverity,
                signals: signals.length,
                cascades: cascades.length
            });
            if (history.length > 50) history.splice(0, history.length - 50);
            StateManager.set('briefing_history', history);
        }

        if (format === 'html') {
            briefing.html = renderHTML(briefing);
        }

        return briefing;
    }

    // ── SEVERITY CALCULATION ──
    function calculateGlobalSeverity(domainStats, cascades) {
        const domains = Object.keys(domainStats);
        if (domains.length === 0 && cascades.length === 0) return 10;

        // Average domain severity
        let totalSev = 0;
        let domainCount = 0;
        domains.forEach(d => {
            totalSev += domainStats[d].avgSeverity;
            domainCount++;
        });
        const avgDomainSev = domainCount > 0 ? totalSev / domainCount : 10;

        // Cascade amplification
        let cascadeBoost = 0;
        cascades.forEach(c => {
            cascadeBoost += c.severity * 0.2;
        });

        // Multi-domain factor
        const multiDomainFactor = Math.min(1.5, 1 + (domainCount - 1) * 0.1);

        return Math.min(100, Math.round(avgDomainSev * multiDomainFactor + cascadeBoost));
    }

    function getThreatLevel(severity) {
        return THREAT_LEVELS.find(t => severity >= t.min && severity <= t.max) || THREAT_LEVELS[0];
    }

    // ── SECTION BUILDERS ──
    function buildExecutiveSummary(signals, domainStats, cascades, severity, threatLevel, hours) {
        const domains = Object.keys(domainStats);
        const hotDomains = domains
            .filter(d => domainStats[d].avgSeverity >= 50)
            .sort((a, b) => domainStats[b].avgSeverity - domainStats[a].avgSeverity);

        let text = `In the last ${hours} hours, ${signals.length} signals were ingested across ${domains.length} domains. `;

        if (cascades.length > 0) {
            text += `${cascades.length} active cascade(s) detected — this indicates cross-domain systemic pressure. `;
        }

        if (hotDomains.length > 0) {
            const hotNames = hotDomains.map(d => DOMAIN_META[d]?.label || d);
            text += `Domains under elevated pressure: ${hotNames.join(', ')}. `;
        }

        if (severity >= 70) {
            text += 'The situation requires active monitoring and strategic assessment.';
        } else if (severity >= 45) {
            text += 'Notable developments warrant attention but no immediate action required.';
        } else {
            text += 'Global conditions within normal parameters.';
        }

        return { text, severity, threatLevel };
    }

    function buildDomainBreakdown(domainStats) {
        const domains = Object.entries(domainStats)
            .map(([name, data]) => ({
                name,
                meta: DOMAIN_META[name] || { label: name, color: '#888', icon: '?', unit: 'UNKNOWN' },
                count: data.count,
                avgSeverity: data.avgSeverity,
                maxSeverity: data.maxSeverity,
                trend: calculateTrend(data.signals),
                topSignal: data.signals.sort((a, b) => b.severity - a.severity)[0] || null,
            }))
            .sort((a, b) => b.avgSeverity - a.avgSeverity);

        return domains;
    }

    function calculateTrend(signals) {
        if (signals.length < 4) return 'stable';
        const sorted = [...signals].sort((a, b) => a.timestamp - b.timestamp);
        const mid = Math.floor(sorted.length / 2);
        const firstHalf = sorted.slice(0, mid);
        const secondHalf = sorted.slice(mid);

        const avgFirst = firstHalf.reduce((s, sig) => s + sig.severity, 0) / firstHalf.length;
        const avgSecond = secondHalf.reduce((s, sig) => s + sig.severity, 0) / secondHalf.length;

        const delta = avgSecond - avgFirst;
        if (delta > 5) return 'rising';
        if (delta < -5) return 'falling';
        return 'stable';
    }

    function buildCascadeSection(active, history) {
        return { active, history };
    }

    function buildTopSignals(signals) {
        return signals
            .sort((a, b) => b.severity - a.severity)
            .slice(0, 15)
            .map(s => ({
                title: s.title,
                source: s.source,
                domain: s.domain,
                severity: s.severity,
                url: s.url,
                timestamp: s.timestamp,
                crossDomain: s.crossDomain,
                secondaryDomain: s.secondaryDomain,
            }));
    }

    function buildRecommendations(domainStats, cascades, severity) {
        const recs = [];

        if (severity >= 70) {
            recs.push({
                priority: 'CRITICAL',
                text: 'Activate full-spectrum monitoring. Cross-reference all domain signals.',
                rationale: `Global severity at ${severity}/100. Multiple vectors under stress.`
            });
        }

        cascades.forEach(c => {
            recs.push({
                priority: c.severity >= 70 ? 'HIGH' : 'MEDIUM',
                text: `Monitor ${c.name}: ${c.matchedDomains.join(' + ')} correlation active.`,
                rationale: c.description
            });
        });

        Object.entries(domainStats).forEach(([domain, data]) => {
            if (data.avgSeverity >= 60) {
                const meta = DOMAIN_META[domain] || { label: domain, unit: 'UNKNOWN' };
                recs.push({
                    priority: 'MEDIUM',
                    text: `${meta.label} domain at ${data.avgSeverity}/100 average severity. Review top signals.`,
                    rationale: `${data.count} signals detected, max severity ${data.maxSeverity}/100.`
                });
            }
        });

        if (recs.length === 0) {
            recs.push({
                priority: 'LOW',
                text: 'Continue standard monitoring cycle.',
                rationale: 'All domains within nominal parameters.'
            });
        }

        return recs.sort((a, b) => {
            const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
            return (order[a.priority] || 4) - (order[b.priority] || 4);
        });
    }

    // ── HTML RENDERER ──
    function renderHTML(briefing) {
        const { id, timestamp, threatLevel, globalSeverity, signalCount, cascadeCount, sections } = briefing;
        const time = new Date(timestamp);
        const dateStr = time.toISOString().replace('T', ' ').split('.')[0] + ' UTC';

        const trendIcons = { rising: '↑', falling: '↓', stable: '→' };
        const trendColors = { rising: '#ff3344', falling: '#39ff14', stable: '#888' };
        const priorityColors = { CRITICAL: '#ff0040', HIGH: '#ff6600', MEDIUM: '#ffcc00', LOW: '#39ff14' };

        let html = `
<div class="briefing-report" style="font-family: 'Share Tech Mono', 'IBM Plex Mono', monospace; background: #080c12; border: 1px solid #1a2436; padding: 0; max-width: 900px; margin: 0 auto;">

  <!-- Header -->
  <div style="background: linear-gradient(135deg, rgba(${hexToRGB(threatLevel.color)}, 0.1), transparent); border-bottom: 1px solid ${threatLevel.color}33; padding: 16px 20px;">
    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
      <div>
        <div style="font-family: Orbitron, monospace; font-size: 0.6rem; color: #3a4f6f; letter-spacing: 0.15em;">HYBRID SYNDICATE / INTELLIGENCE BRIEFING</div>
        <div style="font-family: Orbitron, monospace; font-size: 1rem; color: ${threatLevel.color}; letter-spacing: 0.1em; margin-top: 4px;">
          ${threatLevel.icon} THREAT LEVEL: ${threatLevel.name}
        </div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 0.55rem; color: #3a4f6f;">${id}</div>
        <div style="font-size: 0.6rem; color: #6b7fa3;">${dateStr}</div>
        <div style="font-size: 0.55rem; color: #3a4f6f;">${signalCount} SIGNALS | ${cascadeCount} CASCADES</div>
      </div>
    </div>
    <div style="margin-top: 10px; height: 4px; background: #0a0e14; border-radius: 2px; overflow: hidden;">
      <div style="height: 100%; width: ${globalSeverity}%; background: ${threatLevel.color}; border-radius: 2px; box-shadow: 0 0 8px ${threatLevel.color};"></div>
    </div>
    <div style="font-size: 0.5rem; color: #3a4f6f; margin-top: 4px; text-align: right;">GLOBAL SEVERITY: ${globalSeverity}/100</div>
  </div>

  <!-- Executive Summary -->
  <div style="padding: 16px 20px; border-bottom: 1px solid #111a28;">
    <div style="font-family: Orbitron, monospace; font-size: 0.55rem; color: #00d4ff; letter-spacing: 0.15em; margin-bottom: 8px;">EXECUTIVE SUMMARY</div>
    <div style="font-size: 0.7rem; color: #a0b0c0; line-height: 1.7;">${sections.executive.text}</div>
  </div>

  <!-- Domain Breakdown -->
  <div style="padding: 16px 20px; border-bottom: 1px solid #111a28;">
    <div style="font-family: Orbitron, monospace; font-size: 0.55rem; color: #00d4ff; letter-spacing: 0.15em; margin-bottom: 12px;">DOMAIN STATUS</div>
    ${sections.domainBreakdown.map(d => `
    <div style="display: flex; align-items: center; gap: 10px; padding: 6px 0; border-bottom: 1px solid #0a0e14;">
      <span style="color: ${d.meta.color}; font-size: 0.8rem; width: 20px; text-align: center;">${d.meta.icon}</span>
      <span style="font-family: Orbitron, monospace; font-size: 0.5rem; color: ${d.meta.color}; width: 90px; letter-spacing: 0.1em;">${d.meta.label.toUpperCase()}</span>
      <div style="flex: 1; height: 6px; background: #0a0e14; border-radius: 3px; overflow: hidden;">
        <div style="height: 100%; width: ${d.avgSeverity}%; background: ${d.avgSeverity >= 70 ? '#ff0040' : d.avgSeverity >= 45 ? '#ffcc00' : '#39ff14'}; border-radius: 3px;"></div>
      </div>
      <span style="font-size: 0.55rem; color: #6b7fa3; width: 35px; text-align: right;">${d.avgSeverity}/100</span>
      <span style="font-size: 0.6rem; color: ${trendColors[d.trend]}; width: 15px;">${trendIcons[d.trend]}</span>
      <span style="font-size: 0.45rem; color: #3a4f6f; width: 30px;">${d.count} sig</span>
    </div>`).join('')}
  </div>`;

        // Cascades
        if (sections.cascadeSection.active.length > 0) {
            html += `
  <div style="padding: 16px 20px; border-bottom: 1px solid #111a28; background: rgba(255, 0, 64, 0.03);">
    <div style="font-family: Orbitron, monospace; font-size: 0.55rem; color: #ff0040; letter-spacing: 0.15em; margin-bottom: 12px;">⚠ ACTIVE CASCADES</div>
    ${sections.cascadeSection.active.map(c => `
    <div style="border: 1px solid #ff004033; background: rgba(255, 0, 64, 0.05); padding: 10px; margin-bottom: 8px; border-radius: 2px;">
      <div style="font-family: Orbitron, monospace; font-size: 0.55rem; color: #ff0040; letter-spacing: 0.1em;">${c.name}</div>
      <div style="font-size: 0.6rem; color: #a0b0c0; margin-top: 4px;">${c.description}</div>
      <div style="display: flex; gap: 12px; margin-top: 6px; font-size: 0.5rem; color: #6b7fa3;">
        <span>Severity: <strong style="color: #ff0040;">${c.severity}/100</strong></span>
        <span>Domains: <strong>${c.matchedDomains.join(' + ')}</strong></span>
        <span>Confidence: <strong>${c.confidence}%</strong></span>
        <span>Signals: <strong>${c.signalCount}</strong></span>
      </div>
      <div style="font-size: 0.5rem; color: #3a4f6f; margin-top: 4px; font-style: italic;">Historical: ${c.historicalExample}</div>
    </div>`).join('')}
  </div>`;
        }

        // Top Signals
        html += `
  <div style="padding: 16px 20px; border-bottom: 1px solid #111a28;">
    <div style="font-family: Orbitron, monospace; font-size: 0.55rem; color: #00d4ff; letter-spacing: 0.15em; margin-bottom: 12px;">TOP SIGNALS</div>
    ${sections.topSignals.map(s => {
            const dm = DOMAIN_META[s.domain] || { color: '#888', icon: '?' };
            return `
    <div style="display: flex; gap: 8px; align-items: flex-start; padding: 5px 0; border-bottom: 1px solid #0a0e14;">
      <span style="font-size: 0.55rem; color: ${s.severity >= 70 ? '#ff0040' : s.severity >= 45 ? '#ffcc00' : '#39ff14'}; flex-shrink: 0; width: 28px; text-align: right;">${s.severity}</span>
      <span style="color: ${dm.color}; flex-shrink: 0; font-size: 0.6rem;">${dm.icon}</span>
      <div style="flex: 1; min-width: 0;">
        <div style="font-size: 0.6rem; color: #c0c8d4; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${s.url ? '<a href="' + s.url + '" target="_blank" rel="noopener" style="color: inherit; text-decoration: none; border-bottom: 1px dotted #333;">' + s.title + '</a>' : s.title}</div>
        <div style="font-size: 0.45rem; color: #3a4f6f;">${s.source}${s.crossDomain ? ' | CROSS-DOMAIN: ' + s.domain + ' + ' + s.secondaryDomain : ''}</div>
      </div>
    </div>`;
        }).join('')}
  </div>`;

        // Recommendations
        if (sections.recommendations) {
            html += `
  <div style="padding: 16px 20px;">
    <div style="font-family: Orbitron, monospace; font-size: 0.55rem; color: #00d4ff; letter-spacing: 0.15em; margin-bottom: 12px;">RECOMMENDATIONS</div>
    ${sections.recommendations.map(r => `
    <div style="display: flex; gap: 8px; padding: 6px 0; border-bottom: 1px solid #0a0e14;">
      <span style="font-family: Orbitron, monospace; font-size: 0.45rem; color: ${priorityColors[r.priority] || '#888'}; flex-shrink: 0; width: 55px; letter-spacing: 0.05em;">[${r.priority}]</span>
      <div>
        <div style="font-size: 0.6rem; color: #c0c8d4;">${r.text}</div>
        <div style="font-size: 0.5rem; color: #3a4f6f; margin-top: 2px;">${r.rationale}</div>
      </div>
    </div>`).join('')}
  </div>`;
        }

        html += `
  <!-- Footer -->
  <div style="padding: 10px 20px; border-top: 1px solid #1a2436; background: rgba(0, 212, 255, 0.02);">
    <div style="font-size: 0.45rem; color: #2a3648; text-align: center; letter-spacing: 0.1em;">
      ${id} | HYBRID SYNDICATE INTELLIGENCE DIVISION | BRIEFING ENGINE v1.0 | CLASSIFICATION: OMEGA
    </div>
  </div>
</div>`;

        return html;
    }

    function hexToRGB(hex) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `${r},${g},${b}`;
    }

    // ── PUBLIC API ──
    return {
        generate,
        THREAT_LEVELS,
        DOMAIN_META,
        getThreatLevel,
        calculateGlobalSeverity,
    };
})();
