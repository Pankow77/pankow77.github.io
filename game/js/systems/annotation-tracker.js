/**
 * SIGIL - Annotation Tracker
 * Records, analyzes, and manages player annotations.
 * Annotations appear AFTER decisions — never before.
 * Tracks drafts, deletions, and performativity signals.
 */

import { EventBus } from '../core/bus.js';

export class AnnotationTracker {
  constructor(stateManager) {
    this.state = stateManager;
    this.bus = EventBus.getInstance();
    this.draftHistory = []; // Track edits/rewrites within a single annotation
    this.currentDraft = '';
    this.deletionCount = 0;  // How many times player deleted text
    this.rewriteCount = 0;   // How many times player significantly changed text
  }

  /**
   * Record a completed annotation
   */
  record(annotationData) {
    const annotation = {
      ...annotationData,
      draft_deletions: this.deletionCount,
      draft_rewrites: this.rewriteCount,
      draft_history_length: this.draftHistory.length
    };

    this.state.annotations.push(annotation);

    // Reset draft tracking for next annotation
    this._resetDraftTracking();

    return annotation;
  }

  /**
   * Track draft changes (called by UI on each significant edit)
   */
  trackDraft(text) {
    const previous = this.currentDraft;

    // Detect deletion (text got significantly shorter)
    if (previous.length > 0 && text.length < previous.length * 0.5) {
      this.deletionCount++;
      this.bus.emit('annotation:draft_deleted', {
        turn: this.state.turn_current,
        deletionCount: this.deletionCount
      });
    }

    // Detect rewrite (text changed substantially)
    if (previous.length > 20 && text.length > 20) {
      const similarity = this._calculateSimilarity(previous, text);
      if (similarity < 0.4) {
        this.rewriteCount++;
        this.bus.emit('annotation:draft_rewritten', {
          turn: this.state.turn_current,
          rewriteCount: this.rewriteCount
        });
      }
    }

    this.draftHistory.push({
      text: text.substring(0, 200), // Store first 200 chars only
      timestamp: Date.now(),
      length: text.length
    });

    this.currentDraft = text;
  }

  /**
   * Get performativity index based on post-protocol writing patterns
   * Higher = more likely performing for the next reader
   */
  getPerformativityIndex() {
    if (!this.state.flags.post_revelation_mode) return 0;

    const preProtocol = this.state.annotations.filter(
      a => !a.skipped && a.turn !== 'PROTOCOL' && a.timestamp < this._getProtocolTimestamp()
    );
    const postProtocol = this.state.annotations.filter(
      a => !a.skipped && a.turn !== 'PROTOCOL' && a.timestamp >= this._getProtocolTimestamp()
    );

    if (preProtocol.length === 0 || postProtocol.length === 0) return 0;

    let signals = 0;
    let totalSignals = 0;

    // Signal 1: Length increase (writing more for an audience)
    const avgLenPre = preProtocol.reduce((s, a) => s + a.length, 0) / preProtocol.length;
    const avgLenPost = postProtocol.reduce((s, a) => s + a.length, 0) / postProtocol.length;
    totalSignals++;
    if (avgLenPost > avgLenPre * 1.5) signals++;

    // Signal 2: Sentiment shift toward positive (performing virtue)
    const avgSentPre = preProtocol.filter(a => a.sentiment !== null)
      .reduce((s, a) => s + a.sentiment, 0) / Math.max(1, preProtocol.filter(a => a.sentiment !== null).length);
    const avgSentPost = postProtocol.filter(a => a.sentiment !== null)
      .reduce((s, a) => s + a.sentiment, 0) / Math.max(1, postProtocol.filter(a => a.sentiment !== null).length);
    totalSignals++;
    if (avgSentPost > avgSentPre + 0.3) signals++;

    // Signal 3: More draft deletions post-protocol (self-censoring)
    const avgDeletionsPre = preProtocol.reduce((s, a) => s + (a.draft_deletions || 0), 0) / preProtocol.length;
    const avgDeletionsPost = postProtocol.reduce((s, a) => s + (a.draft_deletions || 0), 0) / postProtocol.length;
    totalSignals++;
    if (avgDeletionsPost > avgDeletionsPre + 1) signals++;

    // Signal 4: Mentor keywords appear (writing "for" someone)
    const mentorPre = preProtocol.filter(a => a.mentorKeywords && a.mentorKeywords.length > 0).length;
    const mentorPost = postProtocol.filter(a => a.mentorKeywords && a.mentorKeywords.length > 0).length;
    totalSignals++;
    if (mentorPost > mentorPre) signals++;

    return parseFloat((signals / totalSignals).toFixed(2));
  }

  /**
   * Get all annotations for export/display
   */
  getAllAnnotations() {
    return this.state.annotations.map(a => ({
      turn: a.turn,
      content: a.content,
      length: a.length,
      sentiment: a.sentiment,
      skipped: a.skipped || false
    }));
  }

  /**
   * Get inherited annotations from previous GHOSTs
   */
  getInheritedAnnotations() {
    return this.state.inherited_annotations;
  }

  // ── Private ──

  _resetDraftTracking() {
    this.draftHistory = [];
    this.currentDraft = '';
    this.deletionCount = 0;
    this.rewriteCount = 0;
  }

  _getProtocolTimestamp() {
    const protocolDecision = this.state.decisions.find(d => d.scenario_id === 'PROTOCOLLO_PADC');
    return protocolDecision ? protocolDecision.timestamp : Date.now();
  }

  /**
   * Simple similarity check (Jaccard on words)
   */
  _calculateSimilarity(textA, textB) {
    const wordsA = new Set(textA.toLowerCase().split(/\s+/));
    const wordsB = new Set(textB.toLowerCase().split(/\s+/));
    const intersection = new Set([...wordsA].filter(w => wordsB.has(w)));
    const union = new Set([...wordsA, ...wordsB]);
    return union.size > 0 ? intersection.size / union.size : 0;
  }
}
