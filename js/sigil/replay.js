/**
 * replay.js — SIGIL Deterministic Replay
 * ═══════════════════════════════════════════════════════════
 * Replays a sequence of decisions with a fixed seed.
 * Produces identical state every time. No randomness escapes.
 *
 * Usage (dev console):
 *   const result = await __SIGIL.replay.run(state.decisions, 42);
 *   console.table(result.telemetry.getMetricTable());
 *
 * Browser-native ES Module.
 * ═══════════════════════════════════════════════════════════
 */

import { GameState } from './state.js';
import { ConsequenceEngine } from './consequence-engine.js';
import { CausalGraph } from './causal-graph.js';
import { Telemetry } from './telemetry.js';
import { ScenarioLoader } from './scenario-loader.js';

export class Replay {
    /**
     * Replay a decision sequence deterministically.
     *
     * @param {Array} decisions — [{ turn, scenario_id, option_id }]
     * @param {number} seed — PRNG seed for deterministic noise
     * @returns {{ finalState, telemetry, eventLog }}
     */
    static async run(decisions, seed) {
        const state = new GameState();
        state.run_id = `REPLAY_${seed}`;

        const graph = new CausalGraph(seed);
        const telemetry = new Telemetry();
        const consequences = new ConsequenceEngine(state);
        const loader = new ScenarioLoader();

        const eventLog = [];

        for (const dec of decisions) {
            const scenario = await loader.load(dec.scenario_id);
            if (!scenario) {
                console.warn(`[REPLAY] Scenario not found: ${dec.scenario_id}`);
                continue;
            }

            state.turn_current = dec.turn;

            // Snapshot state before
            const stateBefore = {
                metrics: { ...state.metrics },
                latent_vars: { ...state.latent_vars }
            };

            // Apply scenario consequences (immediate)
            consequences.apply(scenario, dec.option_id);
            consequences.schedule(scenario, dec.option_id);

            // Get frame_action from scenario option
            const option = scenario.decision?.options?.find(o => o.id === dec.option_id);
            const frameAction = option?.frame_action || null;

            // Propagate causal graph
            const result = graph.propagate(dec.option_id, frameAction, state);
            graph.apply(state, result);

            // Process any delayed consequences due this turn
            consequences.processDue(dec.turn);

            // Compute deltas
            const deltas = {
                metrics: {},
                latent_vars: {}
            };
            for (const key of Object.keys(state.metrics)) {
                const d = state.metrics[key] - (stateBefore.metrics[key] || 0);
                if (d !== 0) deltas.metrics[key] = d;
            }
            for (const key of Object.keys(state.latent_vars)) {
                const d = state.latent_vars[key] - (stateBefore.latent_vars[key] || 0);
                if (d !== 0) deltas.latent_vars[key] = d;
            }

            // Log event
            eventLog.push({
                turn: dec.turn,
                theater: scenario.theater || null,
                action_id: dec.option_id,
                frame_action: frameAction,
                deltas,
                causal_arcs: result.arcs,
                timestamp: Date.now()
            });

            // Telemetry snapshot
            telemetry.snapshot(dec.turn, state, result.arcs, dec.option_id, frameAction);
        }

        return {
            finalState: state,
            telemetry,
            eventLog,
            seed
        };
    }

    /**
     * Verify two replays produce identical final state.
     */
    static async verify(decisions, seed) {
        const run1 = await Replay.run(decisions, seed);
        const run2 = await Replay.run(decisions, seed);

        const s1 = JSON.stringify(run1.finalState.metrics) +
                    JSON.stringify(run1.finalState.latent_vars);
        const s2 = JSON.stringify(run2.finalState.metrics) +
                    JSON.stringify(run2.finalState.latent_vars);

        const match = s1 === s2;
        if (!match) {
            console.error('[REPLAY] Determinism violation detected');
            console.error('Run 1:', run1.finalState.metrics, run1.finalState.latent_vars);
            console.error('Run 2:', run2.finalState.metrics, run2.finalState.latent_vars);
        } else {
            console.log('[REPLAY] ✓ Deterministic — both runs match');
        }
        return match;
    }
}
