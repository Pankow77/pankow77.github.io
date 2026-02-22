/**
 * SIGIL - State Manager
 * Game state orchestration with IndexedDB persistence.
 * Singleton. Serializable. Immutable read access.
 */

import { CONFIG } from './config.js';

let instance = null;

export class StateManager {
  constructor() {
    if (instance) return instance;

    this.run_id = this._generateGhostID();
    this.turn_current = 0;
    this.act_current = 1;
    this.timestamp_start = Date.now();

    // Metrics (hidden from player)
    this.metrics = { ...CONFIG.METRICS_DEFAULT };

    // NPC states
    this.npcs = {
      lorenzo_bassi: {
        name: 'Lorenzo Bassi',
        role: 'Giornalista investigativo',
        status: 'ACTIVE',
        trust: 50,
        active: true
      },
      marta_cerulli: {
        name: 'Marta Cerulli',
        role: 'Avvocato diritti migranti',
        status: 'ACTIVE',
        trust: 50,
        active: true
      }
    };

    // Flags
    this.flags = {
      protocollo_activated: false,
      post_revelation_mode: false,
      marta_intervention_sent: false
    };

    // Decision history
    this.decisions = [];

    // Annotations
    this.annotations = [];

    // Inherited annotations (from previous GHOSTs)
    this.inherited_annotations = [];

    instance = this;
  }

  static getInstance() {
    if (!instance) new StateManager();
    return instance;
  }

  /**
   * Generate GHOST_N identifier
   * @private
   */
  _generateGhostID() {
    const stored = localStorage.getItem(CONFIG.STORAGE_PREFIX + 'ghost_counter');
    const counter = stored ? parseInt(stored) + 1 : 7;
    localStorage.setItem(CONFIG.STORAGE_PREFIX + 'ghost_counter', counter.toString());
    return `GHOST_${counter}`;
  }

  /**
   * Save state to localStorage
   */
  async save() {
    const data = this.serialize();
    localStorage.setItem(CONFIG.STORAGE_PREFIX + 'state', data);
  }

  /**
   * Load state from localStorage
   */
  async load() {
    const data = localStorage.getItem(CONFIG.STORAGE_PREFIX + 'state');
    if (data) {
      const parsed = JSON.parse(data);
      Object.assign(this, parsed);
      return true;
    }
    return false;
  }

  /**
   * Reset for new run
   */
  async reset() {
    instance = null;
    localStorage.removeItem(CONFIG.STORAGE_PREFIX + 'state');
    return new StateManager();
  }

  /**
   * Serialize to JSON
   */
  serialize() {
    return JSON.stringify({
      run_id: this.run_id,
      turn_current: this.turn_current,
      act_current: this.act_current,
      timestamp_start: this.timestamp_start,
      metrics: this.metrics,
      npcs: this.npcs,
      flags: this.flags,
      decisions: this.decisions,
      annotations: this.annotations,
      inherited_annotations: this.inherited_annotations
    });
  }

  /**
   * Export run data for inheritance
   */
  exportRunData() {
    return {
      run_id: this.run_id,
      timestamp_start: this.timestamp_start,
      timestamp_end: Date.now(),
      total_turns: this.turn_current,
      decisions: this.decisions,
      annotations: this.annotations.map(a => ({
        turn: a.turn,
        content: a.content,
        length: a.length,
        sentiment: a.sentiment,
        timestamp: a.timestamp
      })),
      final_metrics: { ...this.metrics },
      npc_states: { ...this.npcs }
    };
  }

  /**
   * Get annotation stats
   */
  getAnnotationStats() {
    const anns = this.annotations;
    if (anns.length === 0) return { count: 0, totalChars: 0, avgLength: 0, avgSentiment: 0 };

    const totalChars = anns.reduce((sum, a) => sum + (a.length || 0), 0);
    const sentiments = anns.filter(a => a.sentiment !== null && a.sentiment !== undefined);
    const avgSentiment = sentiments.length > 0
      ? sentiments.reduce((sum, a) => sum + a.sentiment, 0) / sentiments.length
      : 0;

    return {
      count: anns.length,
      totalChars,
      avgLength: Math.round(totalChars / anns.length),
      avgSentiment: parseFloat(avgSentiment.toFixed(2))
    };
  }
}
