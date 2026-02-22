/**
 * SIGIL - Sentiment Analyzer
 * Lightweight Italian NLP for annotation analysis.
 * No external dependencies. Dictionary-based with keyword extraction.
 */

import { CONFIG } from '../core/config.js';

export class SentimentAnalyzer {
  constructor() {
    this.positiveWords = new Set(CONFIG.NLP.POSITIVE_WORDS);
    this.negativeWords = new Set(CONFIG.NLP.NEGATIVE_WORDS);
    this.selfAwarenessKeywords = CONFIG.NLP.SELF_AWARENESS_KEYWORDS;
    this.mentorKeywords = CONFIG.NLP.MENTOR_KEYWORDS;
  }

  /**
   * Analyze annotation text
   * @param {string} text
   * @returns {{ score: number, keywords: string[], selfAwareness: boolean, mentorKeywords: string[] }}
   */
  analyze(text) {
    if (!text || text.trim().length === 0) {
      return { score: 0, keywords: [], selfAwareness: false, mentorKeywords: [] };
    }

    const normalized = text.toLowerCase();
    const words = normalized.split(/\s+/).map(w => w.replace(/[.,;:!?'"()]/g, ''));

    // Sentiment score: [-1, 1]
    let positive = 0;
    let negative = 0;
    const detectedKeywords = [];

    for (const word of words) {
      if (this.positiveWords.has(word)) {
        positive++;
        detectedKeywords.push(word);
      }
      if (this.negativeWords.has(word)) {
        negative++;
        detectedKeywords.push(word);
      }
    }

    const total = positive + negative;
    const score = total > 0
      ? parseFloat(((positive - negative) / total).toFixed(2))
      : 0;

    // Self-awareness detection (phrase matching)
    const selfAwareness = this.selfAwarenessKeywords.some(kw =>
      normalized.includes(kw)
    );

    // Mentor keyword detection
    const foundMentorKeywords = this.mentorKeywords.filter(kw =>
      normalized.includes(kw)
    );

    return {
      score,
      keywords: detectedKeywords,
      selfAwareness,
      mentorKeywords: foundMentorKeywords
    };
  }

  /**
   * Get sentiment label for display
   */
  getLabel(score) {
    if (score > 0.3) return 'POSITIVO';
    if (score < -0.3) return 'NEGATIVO';
    return 'NEUTRO';
  }

  /**
   * Analyze annotation length behavior
   * Returns signal about engagement level
   */
  analyzeEngagement(annotations) {
    if (annotations.length < 2) return 'INSUFFICIENT_DATA';

    const lengths = annotations.map(a => a.length);
    const avgLength = lengths.reduce((s, l) => s + l, 0) / lengths.length;
    const trend = this._calculateTrend(lengths);

    if (avgLength < 20) return 'MINIMAL';
    if (avgLength > 200 && trend > 0) return 'INCREASING';
    if (trend < -0.5) return 'DECLINING';
    return 'STABLE';
  }

  /**
   * Simple linear trend (-1 to 1)
   */
  _calculateTrend(values) {
    if (values.length < 2) return 0;
    const n = values.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += values[i];
      sumXY += i * values[i];
      sumX2 += i * i;
    }
    const denominator = n * sumX2 - sumX * sumX;
    if (denominator === 0) return 0;
    const slope = (n * sumXY - sumX * sumY) / denominator;
    const maxVal = Math.max(...values, 1);
    return Math.max(-1, Math.min(1, slope / maxVal));
  }
}
