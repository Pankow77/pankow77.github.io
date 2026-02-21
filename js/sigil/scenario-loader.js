/**
 * scenario-loader.js — SIGIL Scenario Engine
 * ═══════════════════════════════════════════════════════════
 * Loads scenario JSON files. Resolves conditional branches.
 * Filters options based on game state flags and metrics.
 *
 * Browser-native ES Module. Zero dependencies.
 * ═══════════════════════════════════════════════════════════
 */

export class ScenarioLoader {
    constructor() {
        this.cache = new Map();
        this.basePath = 'data/scenarios';
    }

    /**
     * Load a scenario by ID.
     * Caches after first load.
     */
    async load(scenarioId) {
        if (this.cache.has(scenarioId)) {
            return this.cache.get(scenarioId);
        }

        const url = `${this.basePath}/${scenarioId}.json`;
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${url}`);
            }
            const scenario = await response.json();
            this.cache.set(scenarioId, scenario);
            return scenario;
        } catch (e) {
            console.error(`[LOADER] Failed to load scenario: ${scenarioId}`, e);
            return null;
        }
    }

    /**
     * Get the scenario sequence for the MVP vertical slice.
     * T1 → T2 → T3 → mini-protocol → T4
     */
    getMVPSequence() {
        return [
            { id: 't1-battesimo', turn: 1, act: 1 },
            { id: 't2-rumore', turn: 2, act: 1 },
            { id: 't3-correlazione', turn: 3, act: 1 },
            { id: 'mini-protocol', turn: null, act: null, isProtocol: true },
            { id: 't4-primo-sguardo', turn: 4, act: 1, postRevelation: true }
        ];
    }

    /**
     * Resolve a scenario — filter options based on game state.
     * Some options only appear if conditions are met.
     */
    resolve(scenario, state) {
        if (!scenario || !scenario.decision) return scenario;

        const resolved = JSON.parse(JSON.stringify(scenario));

        // Filter decision options by conditions
        resolved.decision.options = resolved.decision.options.filter(opt => {
            if (!opt.condition) return true;
            return this._evaluateCondition(opt.condition, state);
        });

        // Filter envelopes by conditions
        if (resolved.envelopes) {
            resolved.envelopes = resolved.envelopes.filter(env => {
                if (!env.condition) return true;
                return this._evaluateCondition(env.condition, state);
            });
        }

        return resolved;
    }

    /**
     * Preload all MVP scenarios.
     */
    async preloadMVP() {
        const sequence = this.getMVPSequence();
        const promises = sequence
            .filter(s => !s.isProtocol)
            .map(s => this.load(s.id));
        await Promise.all(promises);
    }

    /**
     * Evaluate a condition against game state.
     * Supports: flag checks, metric thresholds, NPC trust.
     */
    _evaluateCondition(condition, state) {
        // String format: "flag:key=value" or "metric:key>50" or "npc:name>30"
        if (typeof condition === 'string') {
            // Flag check
            const flagMatch = condition.match(/^flag:(\w+)=(.+)$/);
            if (flagMatch) {
                const [, key, value] = flagMatch;
                if (value === 'true') return state.flags[key] === true;
                if (value === 'false') return state.flags[key] === false;
                return state.flags[key] === value;
            }

            // Metric check
            const metricMatch = condition.match(/^metric:(\w+)([<>]=?)(\d+)$/);
            if (metricMatch) {
                const [, key, op, val] = metricMatch;
                const current = state.metrics[key] || 0;
                const target = parseInt(val);
                switch (op) {
                    case '>': return current > target;
                    case '<': return current < target;
                    case '>=': return current >= target;
                    case '<=': return current <= target;
                    default: return false;
                }
            }

            // NPC trust check
            const npcMatch = condition.match(/^npc:(\w+)([<>]=?)(\d+)$/);
            if (npcMatch) {
                const [, key, op, val] = npcMatch;
                const trust = state.npcs[key]?.trust || 0;
                const target = parseInt(val);
                switch (op) {
                    case '>': return trust > target;
                    case '<': return trust < target;
                    case '>=': return trust >= target;
                    case '<=': return trust <= target;
                    default: return false;
                }
            }

            // Decision check: "decision:T1=option_id"
            const decMatch = condition.match(/^decision:T(\d+)=(.+)$/);
            if (decMatch) {
                const [, turn, optionId] = decMatch;
                const dec = state.decisions.find(d => d.turn === parseInt(turn));
                return dec && dec.option_id === optionId;
            }
        }

        // Object format: { flag, metric, npc }
        if (typeof condition === 'object') {
            if (condition.flag) {
                const [key, value] = Object.entries(condition.flag)[0];
                return state.flags[key] === value;
            }
            if (condition.metric) {
                const [key, check] = Object.entries(condition.metric)[0];
                if (typeof check === 'object') {
                    const current = state.metrics[key] || 0;
                    if (check.gt !== undefined) return current > check.gt;
                    if (check.lt !== undefined) return current < check.lt;
                    if (check.gte !== undefined) return current >= check.gte;
                    if (check.lte !== undefined) return current <= check.lte;
                }
            }
        }

        return true; // Default: condition passes
    }
}
