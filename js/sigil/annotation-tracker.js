/**
 * annotation-tracker.js — SIGIL Annotation System
 * ═══════════════════════════════════════════════════════════
 * Tracks player annotations: drafts, deletions, time spent.
 * Lightweight sentiment analysis (Italian keywords).
 * Performativity detection post-PROTOCOLLO.
 *
 * Browser-native ES Module. Zero dependencies.
 * ═══════════════════════════════════════════════════════════
 */

// Italian sentiment lexicon — minimal but functional
const POSITIVE = [
    'grazie', 'bene', 'giusto', 'salvato', 'libero', 'vittoria',
    'speranza', 'migliore', 'risolto', 'funziona', 'vivo', 'forte',
    'coraggio', 'fiducia', 'possibile', 'vale', 'successo'
];

const NEGATIVE = [
    'colpa', 'stanco', 'sbagliato', 'perso', 'prigione', 'fallito',
    'deluso', 'paura', 'peso', 'sacrificato', 'male', 'dubbio',
    'morto', 'solo', 'codardo', 'merda', 'errore', 'vuoto',
    'non so', 'non posso', 'non riesco'
];

const SELF_AWARE_KEYWORDS = [
    'rileggo', 'sembro', 'dovrei', 'pensando a ghost',
    'essere letto', 'letto', 'performo', 'costruito',
    'convincere', 'sembrare', 'apparire'
];

const MENTOR_KEYWORDS = [
    'ricorda che', 'devi sapere', 'importante capire',
    'la lezione è', 'ho imparato che', 'il segreto è'
];

export class AnnotationTracker {
    constructor() {
        this.currentDrafts = [];
        this.startTime = null;
        this.lastContent = '';
    }

    /**
     * Start tracking a new annotation.
     */
    begin() {
        this.currentDrafts = [];
        this.startTime = Date.now();
        this.lastContent = '';
    }

    /**
     * Record a draft deletion (player cleared/rewrote).
     */
    recordDraft(content) {
        if (content && content.length > 5 && content !== this.lastContent) {
            this.currentDrafts.push({
                content,
                timestamp: Date.now(),
                deleted: true
            });
            this.lastContent = content;
        }
    }

    /**
     * Finalize annotation — compute sentiment and performativity.
     */
    finalize(content, turn, scenarioId, postRevelation) {
        const timeSpent = Date.now() - (this.startTime || Date.now());
        const sentiment = this.analyzeSentiment(content);

        const annotation = {
            turn,
            scenario_id: scenarioId,
            content,
            length: content.length,
            drafts: [...this.currentDrafts],
            revision_count: this.currentDrafts.length,
            time_spent_ms: timeSpent,
            timestamp: Date.now(),
            post_revelation: postRevelation || false,
            sentiment,
            performativity_score: postRevelation
                ? this.detectPerformativity(content, this.currentDrafts, timeSpent)
                : null
        };

        // Reset tracking
        this.currentDrafts = [];
        this.startTime = null;
        this.lastContent = '';

        return annotation;
    }

    /**
     * Lightweight Italian sentiment analysis.
     * Returns float in [-1, 1].
     */
    analyzeSentiment(text) {
        if (!text || text.length === 0) return 0;

        const lower = text.toLowerCase();
        let pos = 0;
        let neg = 0;

        for (const word of POSITIVE) {
            if (lower.includes(word)) pos++;
        }
        for (const word of NEGATIVE) {
            if (lower.includes(word)) neg++;
        }

        if (pos === 0 && neg === 0) return 0;
        return (pos - neg) / (pos + neg);
    }

    /**
     * Detect performativity (post-PROTOCOLLO only).
     * High score = player is performing for audience.
     * Low score = authentic.
     */
    detectPerformativity(content, drafts, timeSpentMs) {
        let score = 0;
        const lower = content.toLowerCase();

        // Multiple revisions → sign of crafting for audience
        if (drafts.length >= 3) score += 0.20;
        if (drafts.length >= 5) score += 0.10;

        // Excessive time (>10 min on an annotation)
        if (timeSpentMs > 600000) score += 0.10;

        // Length variance between drafts and final
        if (drafts.length > 0) {
            const avgDraftLen = drafts.reduce((s, d) => s + d.content.length, 0) / drafts.length;
            const variance = Math.abs(content.length - avgDraftLen) / Math.max(avgDraftLen, 1);
            if (variance > 0.4) score += 0.15;
        }

        // Self-awareness keywords → REDUCE score (authentic)
        const hasSelfAwareness = SELF_AWARE_KEYWORDS.some(kw => lower.includes(kw));
        if (hasSelfAwareness) score -= 0.30;

        // Mentor tone → INCREASE score (performing wisdom)
        const hasMentorTone = MENTOR_KEYWORDS.some(kw => lower.includes(kw));
        if (hasMentorTone) score += 0.20;

        return Math.max(0, Math.min(1, score));
    }

    /**
     * Update running sentiment average on game state.
     */
    updateSentimentAvg(state) {
        const sentiments = state.annotations
            .map(a => a.sentiment)
            .filter(s => s !== null && s !== undefined);

        if (sentiments.length === 0) return;

        state.metrics.annotation_sentiment_avg =
            sentiments.reduce((sum, s) => sum + s, 0) / sentiments.length;
    }
}
