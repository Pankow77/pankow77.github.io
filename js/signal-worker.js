// ═══════════════════════════════════════════════════════════════
// SIGNAL_WORKER v1.0 — Off-Main-Thread Classification Engine
// Hybrid Syndicate / Ethic Software Foundation
// ═══════════════════════════════════════════════════════════════
// "The main thread is sacred. Classification runs here."
//
// This Web Worker receives raw articles and returns classified
// signals without blocking the UI. All CPU-heavy keyword matching,
// severity calculation, and source trust tracking runs in this
// dedicated thread.
//
// Protocol:
//   Main -> Worker:  { type: 'init', payload: { domains, urgencyWords } }
//   Worker -> Main:  { type: 'ready' }
//   Main -> Worker:  { type: 'classify', payload: { articles } }
//   Worker -> Main:  { type: 'classified', payload: [...signals] }
// ═══════════════════════════════════════════════════════════════

let DOMAINS = null;
let URGENCY_WORDS = null;
const SOURCE_TRUST = {};

// ══════════════════════════════════════════════
// MESSAGE HANDLER
// ══════════════════════════════════════════════

self.onmessage = function(e) {
    const msg = e.data;
    if (!msg || !msg.type) return;

    switch (msg.type) {
        case 'init':
            DOMAINS = msg.payload.domains;
            URGENCY_WORDS = msg.payload.urgencyWords;
            self.postMessage({ type: 'ready' });
            break;

        case 'classify':
            if (!DOMAINS || !URGENCY_WORDS) {
                self.postMessage({ type: 'error', message: 'Worker not initialized' });
                return;
            }
            const signals = classifyBatch(msg.payload.articles);
            self.postMessage({ type: 'classified', id: msg.id, payload: signals });
            break;

        case 'updateTrust':
            if (msg.payload && msg.payload.source) {
                updateSourceTrust(msg.payload.source, msg.payload.severity || 0);
            }
            break;
    }
};

// ══════════════════════════════════════════════
// BATCH CLASSIFICATION
// ══════════════════════════════════════════════

function classifyBatch(articles) {
    const signals = [];
    for (let i = 0; i < articles.length; i++) {
        const signal = classifyArticle(articles[i]);
        if (signal) {
            updateSourceTrust(signal.source, signal.severity);
            signals.push(signal);
        }
    }
    return signals;
}

// ══════════════════════════════════════════════
// ARTICLE CLASSIFICATION (mirrors main-thread logic)
// ══════════════════════════════════════════════

function classifyArticle(article) {
    const titleLower = (article.title || '').toLowerCase();
    const descLower = (article.description || '').toLowerCase();
    const text = titleLower + ' ' + descLower;

    const domainScores = {};
    let bestDomain = null;
    let bestScore = 0;

    const domainKeys = Object.keys(DOMAINS);
    for (let d = 0; d < domainKeys.length; d++) {
        const domain = domainKeys[d];
        let score = 0;
        const keywords = DOMAINS[domain].keywords;

        for (let k = 0; k < keywords.length; k++) {
            const kwLower = keywords[k].toLowerCase();
            if (text.includes(kwLower)) {
                const weight = kwLower.length > 12 ? 2.0 : kwLower.length > 6 ? 1.5 : 1.0;
                score += weight;
                if (titleLower.includes(kwLower)) {
                    score += weight;
                }
            }
        }

        if (score > 0) domainScores[domain] = score;
        if (score > bestScore) {
            bestScore = score;
            bestDomain = domain;
        }
    }

    if (bestScore < 1) return null;

    // Secondary domains (>40% of primary score)
    const secondaryDomains = [];
    const domainEntries = Object.keys(domainScores);
    for (let i = 0; i < domainEntries.length; i++) {
        const d = domainEntries[i];
        if (d !== bestDomain && domainScores[d] >= bestScore * 0.4) {
            secondaryDomains.push(d);
        }
    }
    secondaryDomains.sort((a, b) => domainScores[b] - domainScores[a]);

    const multiDomainBonus = secondaryDomains.length > 0 ? secondaryDomains.length * 5 : 0;

    return {
        id: article.id,
        title: article.title,
        description: article.description,
        link: article.link,
        pubDate: article.pubDate,
        source: article.source,
        feedId: article.feedId,
        lang: article.lang,
        domain: bestDomain,
        domainColor: DOMAINS[bestDomain].color,
        domainIcon: DOMAINS[bestDomain].icon,
        severity: calculateSeverity(text, bestScore, article.source, multiDomainBonus),
        matchScore: bestScore,
        secondaryDomains: secondaryDomains,
        domainScores: domainScores,
        classifiedAt: Date.now(),
    };
}

// ══════════════════════════════════════════════
// SOURCE TRUST (in-worker tracking)
// ══════════════════════════════════════════════

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

    const now = Date.now();
    if (now - trust.lastBurst < 10 * 60 * 1000) {
        trust.burstCount++;
    } else {
        trust.burstCount = 1;
        trust.lastBurst = now;
    }
}

// ══════════════════════════════════════════════
// SEVERITY CALCULATION (mirrors main-thread logic)
// ══════════════════════════════════════════════

function calculateSeverity(text, keywordScore, sourceName, multiDomainBonus) {
    let severity = Math.min(keywordScore * 10, 55);

    let urgencyHits = 0;
    for (let i = 0; i < URGENCY_WORDS.high.length; i++) {
        if (text.includes(URGENCY_WORDS.high[i])) { severity += 12; urgencyHits++; }
    }
    for (let i = 0; i < URGENCY_WORDS.medium.length; i++) {
        if (text.includes(URGENCY_WORDS.medium[i])) { severity += 5; urgencyHits++; }
    }

    if (urgencyHits > 3) severity -= (urgencyHits - 3) * 3;
    severity += multiDomainBonus || 0;

    if (sourceName) {
        const trust = getSourceTrust(sourceName);
        if (trust.burstCount > 5) severity *= 0.7;
    }

    if (severity > 75) severity = 75 + (severity - 75) * 0.3;
    return Math.min(Math.max(Math.round(severity), 5), 98);
}
