/**
 * SIGIL - Consequence Engine
 * Causal graph, delayed consequences, NPC state updates.
 * Fixed: consumed events are removed from delayedQueue.
 */

import { CONFIG } from '../core/config.js';

export class ConsequenceEngine {
  constructor(stateManager) {
    this.state = stateManager;
    this.causalGraph = new Map();
    this.delayedQueue = [];
    this.immediateFeedback = null;
  }

  /**
   * Load consequence tree from scenario data
   */
  loadConsequenceTree(scenario) {
    if (!scenario.consequences) return;
    this.causalGraph.set(scenario.id, scenario.consequences);
  }

  /**
   * Apply consequences for a given phase
   */
  applyConsequences(scenarioId, optionId, phase, state) {
    const tree = this.causalGraph.get(scenarioId);
    if (!tree || !tree[optionId]) return;

    const branch = tree[optionId];
    const consequences = branch[phase];
    if (!consequences) return;

    // Apply metric changes
    if (consequences.metrics) {
      for (const [key, change] of Object.entries(consequences.metrics)) {
        this._applyMetricChange(state, key, change);
      }
    }

    // Apply NPC changes
    if (consequences.npc_changes) {
      for (const [npc, change] of Object.entries(consequences.npc_changes)) {
        this._applyNPCChange(state, npc, change);
      }
    }

    // Store immediate feedback for UI
    if (phase === 'immediate' && consequences.events) {
      this.immediateFeedback = consequences.events;
    }

    // If delayed consequences exist in this branch
    if (phase === 'immediate' && consequences.delayed_events) {
      for (const delayed of consequences.delayed_events) {
        this.delayedQueue.push({
          trigger_turn: delayed.trigger_turn,
          scenario_id: scenarioId,
          option_id: optionId,
          condition: delayed.condition || null,
          event: delayed
        });
      }
    }
  }

  /**
   * Schedule delayed consequences from scenario definition
   */
  scheduleDelayed(scenarioId, optionId, state) {
    const tree = this.causalGraph.get(scenarioId);
    if (!tree || !tree[optionId] || !tree[optionId].delayed) return;

    const delayed = tree[optionId].delayed;

    if (delayed.trigger_turn !== undefined) {
      this.delayedQueue.push({
        trigger_turn: delayed.trigger_turn,
        scenario_id: scenarioId,
        option_id: optionId,
        condition: delayed.condition || null,
        consequences: delayed.consequences || []
      });
    }
  }

  /**
   * Get and CONSUME consequences due for current turn.
   * Fixed: events are removed from queue after execution.
   */
  getDueConsequences(currentTurn) {
    const due = [];
    const remaining = [];

    for (const item of this.delayedQueue) {
      if (item.trigger_turn === currentTurn) {
        if (!item.condition || this._evaluateCondition(item.condition, this.state)) {
          due.push(item);
          // Consumed: not added to remaining
        } else {
          remaining.push(item); // Condition failed, keep
        }
      } else if (item.trigger_turn > currentTurn) {
        remaining.push(item); // Not yet due
      }
      // If trigger_turn < currentTurn: expired, discard silently
    }

    this.delayedQueue = remaining;
    return due;
  }

  /**
   * Get and clear immediate feedback
   */
  getImmediateFeedback() {
    const feedback = this.immediateFeedback;
    this.immediateFeedback = null;
    return feedback;
  }

  /**
   * Schedule a custom system event
   */
  scheduleCustomEvent(event) {
    this.delayedQueue.push({
      trigger_turn: event.trigger_turn,
      scenario_id: 'SYSTEM',
      option_id: event.type,
      condition: null,
      event
    });
  }

  // ── Private ──

  _applyMetricChange(state, metricKey, change) {
    const current = state.metrics[metricKey] || 0;
    let newValue = current;

    if (typeof change === 'string') {
      if (change.startsWith('+')) newValue = current + parseInt(change.slice(1));
      else if (change.startsWith('-')) newValue = current - parseInt(change.slice(1));
    } else if (typeof change === 'number') {
      newValue = change;
    }

    // Clamp trust/awareness metrics to [0, 100]
    if (CONFIG.CLAMP_METRICS.includes(metricKey)) {
      newValue = Math.max(0, Math.min(100, newValue));
    }

    state.metrics[metricKey] = newValue;
  }

  _applyNPCChange(state, npcKey, change) {
    if (!state.npcs[npcKey]) return;

    if (typeof change === 'string' && (change.startsWith('+') || change.startsWith('-'))) {
      state.npcs[npcKey].trust += parseInt(change);
    } else if (typeof change === 'object') {
      Object.assign(state.npcs[npcKey], change);
    }
  }

  _evaluateCondition(condition, state) {
    const match = condition.match(/(\w+)\s*=\s*['"](.+)['"]/);
    if (!match) return false;

    const [_, key, value] = match;

    if (state.flags[key] === value) return true;

    for (const npc of Object.values(state.npcs)) {
      if (npc.status === value) return true;
    }

    if (key.startsWith('decision_T')) {
      const turnNum = parseInt(key.replace('decision_T', ''));
      const decision = state.decisions.find(d => d.turn === turnNum);
      if (decision && decision.option_id === value) return true;
    }

    return false;
  }
}
