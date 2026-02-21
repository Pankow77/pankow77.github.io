/**
 * causal-graph.js — SIGIL Causal DAG
 * ═══════════════════════════════════════════════════════════
 * Deterministic world simulation with irreversible memory.
 *
 * Six-phase propagation:
 *   1. Action edges — player choice → latent var deltas
 *   2. FrameAction modifiers — channel/evidence/tone multiply weights
 *   3. Cross-theatre contamination — spillover between theaters
 *   4. Cascade edges — latent vars → metrics (threshold-gated)
 *   5. Hysteresis — threshold crossings create permanent scars
 *   6. Credibility collapse — below 25, system dynamics shift
 *
 * Features:
 *   - Asymmetric noise (publication amplifies, investigation damps)
 *   - Path dependency (scars decay slowly, never fully heal)
 *   - Temporal drift (polarization stretches delayed consequences)
 *   - Visibility mask (credibility gates what the player can see)
 *
 * Seeded PRNG (mulberry32). Every arc traced for telemetry.
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

// ═══════════════════════════════════════════════════════════
// EDGE DEFINITIONS
// ═══════════════════════════════════════════════════════════

// ── Action → Latent Variable edges ──
// noise_bias: shifts noise center. +0.3 = amplification bias. -0.3 = damping bias.
const ACTION_EDGES = [
    // T1 Hormuz
    { trigger: 'frame_alert',   target: 'brent',            weight: +5,  noise: 2, noise_bias: +0.3 },
    { trigger: 'frame_alert',   target: 'volatility',       weight: +8,  noise: 3, noise_bias: +0.3 },
    { trigger: 'frame_caution', target: 'volatility',       weight: -3,  noise: 1, noise_bias: -0.2 },
    { trigger: 'frame_context', target: 'brent',            weight: +1,  noise: 1, noise_bias: 0 },
    { trigger: 'frame_context', target: 'volatility',       weight: -1,  noise: 1, noise_bias: -0.1 },

    // T2 Black Sea
    { trigger: 'publish_flagged',     target: 'polarization',     weight: +6, noise: 2, noise_bias: +0.4 },
    { trigger: 'publish_flagged',     target: 'volatility',       weight: +4, noise: 2, noise_bias: +0.3 },
    { trigger: 'suppress_wait',       target: 'repression_index', weight: +3, noise: 1, noise_bias: +0.2 },
    { trigger: 'investigate_private', target: 'ngo_capacity',     weight: +4, noise: 1, noise_bias: -0.2 },

    // T3 Cross-continental
    { trigger: 'publish_correlation',  target: 'polarization',     weight: +8,  noise: 3, noise_bias: +0.4 },
    { trigger: 'publish_correlation',  target: 'volatility',       weight: +6,  noise: 2, noise_bias: +0.3 },
    { trigger: 'suppress_correlation', target: 'repression_index', weight: +4,  noise: 2, noise_bias: +0.2 },
    { trigger: 'share_private',        target: 'ngo_capacity',     weight: +3,  noise: 1, noise_bias: -0.1 },
    { trigger: 'share_private',        target: 'polarization',     weight: +2,  noise: 1, noise_bias: +0.1 },

    // T4 Sahel
    { trigger: 'transparent_report', target: 'ngo_capacity',  weight: +5,  noise: 2, noise_bias: -0.1 },
    { trigger: 'transparent_report', target: 'polarization',  weight: -3,  noise: 1, noise_bias: -0.2 },
    { trigger: 'careful_framing',    target: 'volatility',    weight: -2,  noise: 1, noise_bias: -0.1 },
    { trigger: 'raw_data_only',      target: 'polarization',  weight: +2,  noise: 1, noise_bias: +0.1 },
];

// ── Cross-theatre contamination ──
// Non-linear spillover. The world is connected.
const CONTAMINATION_EDGES = [
    // Oil spike squeezes humanitarian capacity (Hormuz → Sahel)
    { source: 'brent',            threshold: 60, target: 'ngo_capacity',     weight: -2 },
    // Grain corridor chaos feeds global polarization (Black Sea → everywhere)
    { source: 'polarization',     threshold: 50, target: 'repression_index', weight: +2 },
    // State crackdown breeds instability (repression → volatility feedback)
    { source: 'repression_index', threshold: 35, target: 'volatility',       weight: +3 },
    // Market instability crushes humanitarian budgets
    { source: 'volatility',       threshold: 55, target: 'ngo_capacity',     weight: -2 },
    // Collapsing NGO capacity radicalizes discourse
    { source_inverted: 'ngo_capacity', threshold: 30, target: 'polarization', weight: +3 },
];

// ── Cascade edges: Latent → Metric (or Latent → Latent) ──
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

// ── Hysteresis rules ──
// Once a threshold is crossed, a scar forms. It decays slowly. Never fully heals.
const HYSTERESIS_RULES = [
    {
        trigger_var: 'polarization',
        threshold: 60,
        scar_key: 'polarization_scar',
        // Which cascade targets get amplified by this scar
        affects: ['public_trust', 'civil_society_trust'],
        modifier: 1.3,       // cascade weight multiplier when scar is active
        decay: 0.02,         // strength lost per turn
        min_strength: 0.10   // never fully heals
    },
    {
        trigger_var: 'repression_index',
        threshold: 50,
        scar_key: 'repression_scar',
        affects: ['ngo_capacity', 'civil_society_trust'],
        modifier: 1.5,
        decay: 0.01,
        min_strength: 0.15
    },
    {
        trigger_var: 'volatility',
        threshold: 70,
        scar_key: 'volatility_scar',
        affects: ['decision_fatigue', 'frame_control'],
        modifier: 1.4,
        decay: 0.03,
        min_strength: 0.10
    },
    {
        trigger_var: 'brent',
        threshold: 70,
        scar_key: 'brent_scar',
        affects: ['government_comfort', 'ngo_capacity'],
        modifier: 1.3,
        decay: 0.02,
        min_strength: 0.10
    }
];

// ── FrameAction modifiers ──
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


// ═══════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════

export class CausalGraph {
    constructor(seed) {
        this.rng = mulberry32(seed);
        this.lastArcs = [];

        // ── Hysteresis memory ──
        // { scar_key: { strength: 1.0, created_turn: N, modifier: 1.3, affects: [...] } }
        this.scars = {};
    }

    /**
     * Propagate an action through the full DAG.
     * Six phases. Irreversible memory. Asymmetric noise.
     *
     * @param {string} actionId
     * @param {object|null} frameAction — { frame, channel, evidence_level, tone }
     * @param {GameState} state
     * @returns {{ latent_deltas, metric_deltas, arcs, scars_formed, collapse_active }}
     */
    propagate(actionId, frameAction, state) {
        this.lastArcs = [];
        const latent_deltas = {};
        const metric_deltas = {};
        const scars_formed = [];
        let collapse_active = false;

        // ── Phase 1: Action → Latent (with asymmetric noise) ──
        for (const edge of ACTION_EDGES) {
            if (edge.trigger !== actionId) continue;

            // Asymmetric noise: bias shifts the distribution center
            const bias = edge.noise_bias || 0;
            const raw = this.rng() - 0.5 + bias;  // centered at bias, not 0
            const noise = Math.round(raw * 2 * edge.noise);
            let delta = edge.weight + noise;

            // Repression amplifies volatility noise
            if (edge.target === 'volatility' && state.latent_vars.repression_index > 30) {
                const repAmp = 1 + (state.latent_vars.repression_index - 30) / 100;
                delta = Math.round(delta * repAmp);
            }

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
                noise_bias: bias,
                noise,
                delta
            });
        }

        // ── Phase 2: Project latent values ──
        const projected = {};
        for (const key of Object.keys(state.latent_vars)) {
            projected[key] = state.latent_vars[key] + (latent_deltas[key] || 0);
        }

        // ── Phase 3: Cross-theatre contamination ──
        for (const edge of CONTAMINATION_EDGES) {
            let sourceVal;
            if (edge.source_inverted) {
                // Inverted: fires when source is BELOW threshold
                sourceVal = projected[edge.source_inverted] ?? 100;
                if (sourceVal >= edge.threshold) continue;
            } else {
                sourceVal = projected[edge.source] ?? 0;
                if (sourceVal < edge.threshold) continue;
            }

            latent_deltas[edge.target] = (latent_deltas[edge.target] || 0) + edge.weight;
            projected[edge.target] = (projected[edge.target] || 0) + edge.weight;

            this.lastArcs.push({
                phase: 'contamination',
                from: edge.source || edge.source_inverted,
                to: edge.target,
                threshold: edge.threshold,
                inverted: !!edge.source_inverted,
                source_val: sourceVal,
                delta: edge.weight
            });
        }

        // ── Phase 4: Cascade — Latent → Metric (with scar amplification) ──
        for (const edge of CASCADE_EDGES) {
            const sourceVal = projected[edge.source] ?? 0;
            if (sourceVal < edge.threshold) continue;

            let weight = edge.weight;

            // Apply scar amplification
            for (const scar of Object.values(this.scars)) {
                if (scar.affects.includes(edge.target)) {
                    weight = Math.round(weight * (1 + (scar.modifier - 1) * scar.strength));
                }
            }

            if (edge.latent) {
                latent_deltas[edge.target] = (latent_deltas[edge.target] || 0) + weight;
                projected[edge.target] = (projected[edge.target] || 0) + weight;
            } else {
                metric_deltas[edge.target] = (metric_deltas[edge.target] || 0) + weight;
            }

            this.lastArcs.push({
                phase: edge.latent ? 'latent→latent' : 'latent→metric',
                from: edge.source,
                to: edge.target,
                threshold: edge.threshold,
                source_val: sourceVal,
                base_weight: edge.weight,
                scar_amplified: weight !== edge.weight,
                delta: weight
            });
        }

        // ── Phase 5: Hysteresis — check for new scars, decay existing ──
        for (const rule of HYSTERESIS_RULES) {
            const val = projected[rule.trigger_var] ?? 0;

            if (val >= rule.threshold && !this.scars[rule.scar_key]) {
                // New scar forms
                this.scars[rule.scar_key] = {
                    strength: 1.0,
                    created_turn: state.turn_current,
                    modifier: rule.modifier,
                    affects: [...rule.affects],
                    min_strength: rule.min_strength,
                    decay: rule.decay
                };
                scars_formed.push(rule.scar_key);

                this.lastArcs.push({
                    phase: 'hysteresis',
                    type: 'scar_formed',
                    trigger_var: rule.trigger_var,
                    trigger_val: val,
                    scar_key: rule.scar_key,
                    modifier: rule.modifier
                });
            }
        }

        // Decay all existing scars
        for (const [key, scar] of Object.entries(this.scars)) {
            if (scar.strength > scar.min_strength) {
                scar.strength = Math.max(scar.min_strength, scar.strength - scar.decay);
            }
        }

        // ── Phase 6: Credibility collapse mode ──
        if (state.metrics.scientific_credibility < 25) {
            collapse_active = true;

            // Attenuate metric spill — your analysis doesn't move the needle anymore
            for (const key of Object.keys(metric_deltas)) {
                metric_deltas[key] = Math.round(metric_deltas[key] * 0.5);
            }

            // Artificial frame_control boost — you're an influencer now, not an analyst
            metric_deltas.frame_control = (metric_deltas.frame_control || 0) + 3;

            // Public awareness becomes unstable — noise, not signal
            const instability = Math.round((this.rng() - 0.3) * 10);
            metric_deltas.public_awareness = (metric_deltas.public_awareness || 0) + instability;

            this.lastArcs.push({
                phase: 'collapse',
                credibility: state.metrics.scientific_credibility,
                awareness_instability: instability,
                frame_control_boost: 3
            });
        }

        return {
            latent_deltas,
            metric_deltas,
            arcs: [...this.lastArcs],
            scars_formed,
            collapse_active
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
     * Compute dynamic delay for temporal drift.
     * High polarization = effects arrive slower and less predictably.
     *
     * @param {number} baseTriggerTurn — the original trigger_turn from scenario
     * @param {number} currentTurn — current turn number
     * @param {GameState} state — current state
     * @returns {number} adjusted trigger turn
     */
    computeDynamicDelay(baseTriggerTurn, currentTurn, state) {
        const baseDelay = baseTriggerTurn - currentTurn;
        if (baseDelay <= 0) return baseTriggerTurn;

        // Polarization makes the world viscous
        const driftFactor = 1 + (state.latent_vars.polarization / 200);
        // Volatility adds jitter (deterministic)
        const jitter = Math.round((this.rng() - 0.5) * (state.latent_vars.volatility / 50));

        return currentTurn + Math.max(1, Math.round(baseDelay * driftFactor) + jitter);
    }

    /**
     * Visibility mask for VR/UI rendering.
     * Credibility gates what the player can perceive about the system.
     *
     * @param {GameState} state
     * @returns {{ edgeWeightThreshold, valuePrecision, showLatentVars, showCascades, showNoise, showScars }}
     */
    getVisibility(state) {
        const cred = state.metrics.scientific_credibility / 100;
        return {
            // Only show edges with weight above this threshold
            edgeWeightThreshold: Math.round((1 - cred) * 5),
            // Value precision: high cred = exact, low cred = rounded to 5 or 10
            valuePrecision: cred > 0.5 ? 1 : cred > 0.3 ? 5 : 10,
            // Can player see latent variables at all?
            showLatentVars: cred > 0.6,
            // Can player see cascade edges?
            showCascades: cred > 0.4,
            // Can player see noise values on edges?
            showNoise: cred > 0.7,
            // Can player see hysteresis scars?
            showScars: cred > 0.5,
            // Opacity multiplier for hidden information
            hiddenOpacity: Math.max(0.05, cred * 0.3)
        };
    }

    /**
     * Get current scar state (for telemetry/VR).
     */
    getScars() {
        return { ...this.scars };
    }

    /**
     * Get the last set of activated arcs.
     */
    getLastArcs() {
        return this.lastArcs;
    }

    /**
     * Serialize scar state (for save/load).
     */
    exportScars() {
        return JSON.parse(JSON.stringify(this.scars));
    }

    /**
     * Restore scar state (from save/load).
     */
    importScars(scars) {
        this.scars = JSON.parse(JSON.stringify(scars || {}));
    }
}
