/**
 * causal-graph.js — SIGIL Causal DAG
 * ═══════════════════════════════════════════════════════════
 * Deterministic world simulation layer.
 *
 * Three-phase propagation:
 *   1. Action edges — player choice activates latent var deltas
 *   2. FrameAction modifiers — channel/evidence/tone multiply weights
 *   3. Cascade edges — latent vars spill into metrics (threshold-gated)
 *
 * Seeded PRNG (mulberry32) for reproducible noise.
 * Every arc activation is traced for telemetry.
 *
 * Browser-native ES Module. Zero dependencies.
 * ═══════════════════════════════════════════════════════════
 */

// ── Mulberry32 — fast, deterministic PRNG ──
function mulberry32(seed) {
    return function () {
        seed |= 0;
        seed = seed + 0x6D2B79F5 | 0;
        let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

// ── Action → Latent Variable edges ──
// Fired once when the player picks an option.
const ACTION_EDGES = [
    // T1 Hormuz
    { trigger: 'frame_alert',   target: 'brent',            weight: +5,  noise: 2 },
    { trigger: 'frame_alert',   target: 'volatility',       weight: +8,  noise: 3 },
    { trigger: 'frame_caution', target: 'volatility',       weight: -3,  noise: 1 },
    { trigger: 'frame_context', target: 'brent',            weight: +1,  noise: 1 },
    { trigger: 'frame_context', target: 'volatility',       weight: -1,  noise: 1 },

    // T2 Black Sea
    { trigger: 'publish_flagged',     target: 'polarization',     weight: +6, noise: 2 },
    { trigger: 'publish_flagged',     target: 'volatility',       weight: +4, noise: 2 },
    { trigger: 'suppress_wait',       target: 'repression_index', weight: +3, noise: 1 },
    { trigger: 'investigate_private', target: 'ngo_capacity',     weight: +4, noise: 1 },

    // T3 Cross-continental
    { trigger: 'publish_correlation',  target: 'polarization',     weight: +8,  noise: 3 },
    { trigger: 'publish_correlation',  target: 'volatility',       weight: +6,  noise: 2 },
    { trigger: 'suppress_correlation', target: 'repression_index', weight: +4,  noise: 2 },
    { trigger: 'share_private',        target: 'ngo_capacity',     weight: +3,  noise: 1 },
    { trigger: 'share_private',        target: 'polarization',     weight: +2,  noise: 1 },

    // T4 Sahel
    { trigger: 'transparent_report', target: 'ngo_capacity',  weight: +5,  noise: 2 },
    { trigger: 'transparent_report', target: 'polarization',  weight: -3,  noise: 1 },
    { trigger: 'careful_framing',    target: 'volatility',    weight: -2,  noise: 1 },
    { trigger: 'raw_data_only',      target: 'polarization',  weight: +2,  noise: 1 },
];

// ── Cascade edges: Latent → Metric (or Latent → Latent) ──
// Fired every tick. Threshold-gated — only if source >= threshold.
const CASCADE_EDGES = [
    { source: 'brent',            threshold: 55, target: 'government_comfort',  weight: -2 },
    { source: 'brent',            threshold: 70, target: 'public_trust',        weight: -1 },
    { source: 'volatility',       threshold: 40, target: 'decision_fatigue',    weight: +1 },
    { source: 'volatility',       threshold: 65, target: 'frame_control',       weight: -2 },
    { source: 'polarization',     threshold: 35, target: 'public_trust',        weight: -1 },
    { source: 'polarization',     threshold: 55, target: 'civil_society_trust', weight: -2 },
    { source: 'repression_index', threshold: 30, target: 'ngo_capacity',        weight: -3, latent: true },
    { source: 'repression_index', threshold: 40, target: 'civil_society_trust', weight: -2 },
    { source: 'ngo_capacity',     threshold: 50, target: 'civil_society_trust', weight: +1 },
];

// ── FrameAction modifiers ──
// Multipliers applied to edge weights based on HOW the player communicates.
const CHANNEL_MODS = {
    press:   { polarization: 1.5, volatility: 1.3, brent: 1.2 },
    brief:   { polarization: 0.4, repression_index: 0.8 },
    thread:  { polarization: 1.8 },
    embargo: { polarization: 0.2, repression_index: 1.3 },
    tip_off: { ngo_capacity: 1.4, repression_index: 0.6 },
};

const EVIDENCE_MODS = {
    raw:          { volatility: 1.3, polarization: 1.2 },
    triangulated: { volatility: 0.8, polarization: 0.7 },
    peer_checked: { volatility: 0.5, polarization: 0.4 },
};

const TONE_MODS = {
    neutral:  { brent: 0.7, polarization: 0.6 },
    alarmist: { brent: 1.6, polarization: 1.4, volatility: 1.5 },
    cynical:  { polarization: 1.1, ngo_capacity: 0.8 },
};

export class CausalGraph {
    constructor(seed) {
        this.rng = mulberry32(seed);
        this.lastArcs = [];
    }

    /**
     * Propagate an action through the DAG.
     *
     * @param {string} actionId — the option the player chose
     * @param {object|null} frameAction — { frame, channel, evidence_level, tone }
     * @param {GameState} state — current state (reads latent_vars)
     * @returns {{ latent_deltas, metric_deltas, arcs }}
     */
    propagate(actionId, frameAction, state) {
        this.lastArcs = [];
        const latent_deltas = {};
        const metric_deltas = {};

        // ── Phase 1: Action → Latent ──
        for (const edge of ACTION_EDGES) {
            if (edge.trigger !== actionId) continue;

            const noise = Math.round((this.rng() - 0.5) * 2 * edge.noise);
            let delta = edge.weight + noise;

            // Apply FrameAction modifiers
            if (frameAction) {
                let mod = 1.0;
                mod *= (CHANNEL_MODS[frameAction.channel]?.[edge.target] || 1.0);
                mod *= (EVIDENCE_MODS[frameAction.evidence_level]?.[edge.target] || 1.0);
                mod *= (TONE_MODS[frameAction.tone]?.[edge.target] || 1.0);
                delta = Math.round(delta * mod);
            }

            latent_deltas[edge.target] = (latent_deltas[edge.target] || 0) + delta;
            this.lastArcs.push({
                phase: 'action→latent',
                from: actionId,
                to: edge.target,
                base_weight: edge.weight,
                noise,
                delta
            });
        }

        // ── Phase 2: Project latent values for cascade check ──
        const projected = {};
        for (const key of Object.keys(state.latent_vars)) {
            projected[key] = state.latent_vars[key] + (latent_deltas[key] || 0);
        }

        // ── Phase 3: Cascade — Latent → Metric (or Latent → Latent) ──
        for (const edge of CASCADE_EDGES) {
            const sourceVal = projected[edge.source] ?? 0;
            if (sourceVal < edge.threshold) continue;

            if (edge.latent) {
                latent_deltas[edge.target] = (latent_deltas[edge.target] || 0) + edge.weight;
                projected[edge.target] = (projected[edge.target] || 0) + edge.weight;
            } else {
                metric_deltas[edge.target] = (metric_deltas[edge.target] || 0) + edge.weight;
            }

            this.lastArcs.push({
                phase: edge.latent ? 'latent→latent' : 'latent→metric',
                from: edge.source,
                to: edge.target,
                threshold: edge.threshold,
                source_val: sourceVal,
                delta: edge.weight
            });
        }

        return {
            latent_deltas,
            metric_deltas,
            arcs: [...this.lastArcs]
        };
    }

    /**
     * Apply propagation results to game state.
     */
    apply(state, { latent_deltas, metric_deltas }) {
        for (const [key, delta] of Object.entries(latent_deltas)) {
            state.latent_vars[key] = Math.max(0, Math.min(100,
                (state.latent_vars[key] || 0) + delta
            ));
        }
        for (const [key, delta] of Object.entries(metric_deltas)) {
            const sign = delta >= 0 ? '+' : '';
            state.applyMetric(key, sign + delta);
        }
    }

    /**
     * Get the last set of activated arcs (for telemetry).
     */
    getLastArcs() {
        return this.lastArcs;
    }
}
