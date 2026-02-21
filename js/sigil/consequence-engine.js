/**
 * consequence-engine.js — SIGIL Causal Graph
 * ═══════════════════════════════════════════════════════════
 * Handles immediate and delayed consequences.
 * Delayed events are consumed when triggered — no ghosts.
 *
 * Browser-native ES Module. Zero dependencies.
 * ═══════════════════════════════════════════════════════════
 */

export class ConsequenceEngine {
    constructor(state) {
        this.state = state;
        this.delayedQueue = [];
        this.lastFeedback = null;
    }

    /**
     * Apply immediate consequences for a decision.
     */
    apply(scenario, optionId) {
        const branch = scenario.consequences?.[optionId];
        if (!branch?.immediate) return;

        const imm = branch.immediate;

        // Metric changes
        if (imm.metrics) {
            for (const [key, change] of Object.entries(imm.metrics)) {
                this.state.applyMetric(key, change);
            }
        }

        // NPC changes
        if (imm.npc_changes) {
            for (const [npc, change] of Object.entries(imm.npc_changes)) {
                this.state.applyNPC(npc, change);
            }
        }

        // Flag changes
        if (imm.flags) {
            Object.assign(this.state.flags, imm.flags);
        }

        // Store feedback text for UI
        this.lastFeedback = imm.feedback || null;
    }

    /**
     * Schedule delayed consequences.
     */
    schedule(scenario, optionId) {
        const branch = scenario.consequences?.[optionId];
        if (!branch?.delayed) return;

        const delayed = Array.isArray(branch.delayed)
            ? branch.delayed
            : [branch.delayed];

        for (const d of delayed) {
            this.delayedQueue.push({
                trigger_turn: d.trigger_turn,
                scenario_id: scenario.id,
                option_id: optionId,
                condition: d.condition || null,
                feedback: d.feedback || null,
                metrics: d.metrics || null,
                npc_changes: d.npc_changes || null,
                flags: d.flags || null
            });
        }
    }

    /**
     * Get and consume consequences due for current turn.
     * Consumed events are removed from the queue.
     */
    getDue(currentTurn) {
        const due = [];
        const remaining = [];

        for (const item of this.delayedQueue) {
            if (item.trigger_turn === currentTurn) {
                if (!item.condition || this._checkCondition(item.condition)) {
                    due.push(item);
                } else {
                    remaining.push(item);
                }
            } else if (item.trigger_turn > currentTurn) {
                remaining.push(item);
            }
            // Expired (trigger_turn < currentTurn): silently discarded
        }

        this.delayedQueue = remaining;
        return due;
    }

    /**
     * Process due consequences — apply metrics/npcs and collect feedback.
     */
    processDue(currentTurn) {
        const due = this.getDue(currentTurn);
        const feedbacks = [];

        for (const item of due) {
            if (item.metrics) {
                for (const [key, change] of Object.entries(item.metrics)) {
                    this.state.applyMetric(key, change);
                }
            }
            if (item.npc_changes) {
                for (const [npc, change] of Object.entries(item.npc_changes)) {
                    this.state.applyNPC(npc, change);
                }
            }
            if (item.flags) {
                Object.assign(this.state.flags, item.flags);
            }
            if (item.feedback) {
                feedbacks.push(item.feedback);
            }
        }

        return feedbacks;
    }

    /**
     * Get last immediate feedback and clear it.
     */
    getLastFeedback() {
        const fb = this.lastFeedback;
        this.lastFeedback = null;
        return fb;
    }

    /**
     * Check a simple condition against game state.
     */
    _checkCondition(condition) {
        // Format: "key = 'value'" or "key > number"
        const eqMatch = condition.match(/^(\w+)\s*=\s*['"](.+)['"]$/);
        if (eqMatch) {
            const [, key, value] = eqMatch;
            // Check flags
            if (this.state.flags[key] === value) return true;
            // Check decisions
            const turnMatch = key.match(/^decision_T(\d+)$/);
            if (turnMatch) {
                const turn = parseInt(turnMatch[1]);
                const dec = this.state.decisions.find(d => d.turn === turn);
                return dec && dec.option_id === value;
            }
            return false;
        }
        return true;
    }
}
