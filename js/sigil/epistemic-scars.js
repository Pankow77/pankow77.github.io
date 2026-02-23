/**
 * epistemic-scars.js — SIGIL Epistemic Mutation Engine
 * ═══════════════════════════════════════════════════════════
 * Your analysis lens shifts. You don't notice.
 *
 * Not punishment. Drift.
 *
 * The player's decision patterns create epistemic biases
 * that silently modify how the game world responds.
 * Three bias dimensions:
 *
 *   1. VELOCITY BIAS — publish fast vs investigate slow.
 *      Fast publishers get more attention but less accuracy.
 *      Slow investigators get more accuracy but miss windows.
 *
 *   2. FRAMING BIAS — escalation vs caution.
 *      Escalators attract louder sources (higher confidence, lower accuracy).
 *      Cautious analysts get quieter signals (lower confidence, higher accuracy).
 *
 *   3. CHANNEL BIAS — public vs private.
 *      Public actors get polarization amplification.
 *      Private actors get repression risk amplification.
 *
 * Mutations are expressed as:
 *   - Envelope modifications (confidence shift, source bias)
 *   - Option availability (some paths close, others open)
 *   - NPC behavior shift (they respond to YOUR pattern, not your choice)
 *   - Metric sensitivity changes (what matters more/less)
 *
 * The player sees: "the world changed." The truth: they changed.
 *
 * Browser-native ES Module. Zero dependencies.
 * ═══════════════════════════════════════════════════════════
 */

// ── Action classification ──
const ACTION_TRAITS = {
    // velocity: fast (>0) or slow (<0)
    // escalation: escalate (>0) or caution (<0)
    // publicity: public (>0) or private (<0)
    frame_alert:            { velocity: +1, escalation: +2, publicity: +1 },
    frame_caution:          { velocity: -1, escalation: -2, publicity: 0 },
    frame_context:          { velocity: -2, escalation: 0,  publicity: 0 },
    publish_flagged:        { velocity: +2, escalation: +1, publicity: +2 },
    suppress_wait:          { velocity: -2, escalation: -1, publicity: -2 },
    investigate_private:    { velocity: -1, escalation: 0,  publicity: -2 },
    publish_correlation:    { velocity: +1, escalation: +2, publicity: +2 },
    suppress_correlation:   { velocity: -2, escalation: -1, publicity: -1 },
    share_private:          { velocity: 0,  escalation: 0,  publicity: -1 },
    transparent_report:     { velocity: +1, escalation: +1, publicity: +1 },
    careful_framing:        { velocity: -1, escalation: -1, publicity: 0 },
    raw_data_only:          { velocity: +2, escalation: 0,  publicity: +1 },
};

// ── Mutation thresholds ──
// When cumulative bias exceeds threshold, a mutation activates
const MUTATION_THRESHOLD = 4;

// ── Mutation effects ──
const MUTATIONS = {
    velocity_fast: {
        label: 'BIAS VELOCITÀ',
        description: 'La tua velocità attira fonti rumorose.',
        // Envelopes: confidence inflated but less reliable
        envelope_mod: { confidence_shift: +0.15, accuracy_penalty: true },
        // Metric sensitivity: awareness gains amplified, credibility gains dampened
        metric_mod: { public_awareness: 1.3, scientific_credibility: 0.8 },
    },
    velocity_slow: {
        label: 'PARALISI ANALITICA',
        description: 'La tua cautela ti rende invisibile.',
        // Envelopes: fewer sources offer intelligence
        envelope_mod: { envelope_reduction: 1 }, // remove 1 envelope
        // Metric: credibility stable but awareness erodes
        metric_mod: { public_awareness: 0.7, scientific_credibility: 1.1 },
    },
    escalation_high: {
        label: 'SINDROME CASSANDRA',
        description: 'Allarmi ogni giorno. Nessuno ascolta più.',
        // NPC: alarmist fatigue
        npc_mod: { elena_voss: -2, dara_khan: +1 },
        // Metric: diminishing returns on public impact
        metric_mod: { public_trust: 0.7, frame_control: 0.8 },
    },
    escalation_low: {
        label: 'NORMALIZZAZIONE',
        description: 'Tutto è routine. Anche le crisi.',
        // NPC: trusted but overlooked
        npc_mod: { elena_voss: +1, dara_khan: -2 },
        // Metric: trust maintained but influence drops
        metric_mod: { government_comfort: 1.2, public_awareness: 0.6 },
    },
    publicity_high: {
        label: 'ESPOSIZIONE TOTALE',
        description: 'Sei un volto pubblico. Non puoi più tornare indietro.',
        // Latent: polarization sensitive
        latent_mod: { polarization: 1.4 },
        // Metric: high visibility, high vulnerability
        metric_mod: { public_awareness: 1.4, personal_guilt: 1.2 },
    },
    publicity_low: {
        label: 'OPERATORE OMBRA',
        description: 'Lavori nell\'ombra. Ma l\'ombra ha un prezzo.',
        // Latent: repression amplified (you're a target)
        latent_mod: { repression_index: 1.3 },
        // Metric: safety at the cost of reach
        metric_mod: { public_awareness: 0.5, government_comfort: 1.3 },
    }
};


export class EpistemicScars {
    constructor() {
        // ── Cumulative bias accumulators ──
        this.bias = {
            velocity: 0,     // positive = fast, negative = slow
            escalation: 0,   // positive = escalate, negative = caution
            publicity: 0,    // positive = public, negative = private
        };

        // ── Active mutations ──
        // Set of mutation keys that have activated
        this._activeMutations = new Set();

        // ── Decision history for pattern analysis ──
        this._decisions = [];
    }

    // ═══════════════════════════════════════
    // DECISION RECORDING
    // ═══════════════════════════════════════

    /**
     * Record a player decision and update bias accumulators.
     *
     * @param {string} actionId
     * @param {number} turn
     * @returns {{ newMutations: string[] }}
     */
    recordDecision(actionId, turn) {
        const traits = ACTION_TRAITS[actionId];
        if (!traits) return { newMutations: [] };

        // Accumulate bias
        this.bias.velocity += traits.velocity;
        this.bias.escalation += traits.escalation;
        this.bias.publicity += traits.publicity;

        // Store decision
        this._decisions.push({ actionId, turn, traits });

        // Check for new mutations
        return this._checkMutations();
    }

    /**
     * Check if any bias dimension has crossed mutation threshold.
     */
    _checkMutations() {
        const newMutations = [];

        // Velocity
        if (this.bias.velocity >= MUTATION_THRESHOLD && !this._activeMutations.has('velocity_fast')) {
            this._activeMutations.add('velocity_fast');
            newMutations.push('velocity_fast');
        }
        if (this.bias.velocity <= -MUTATION_THRESHOLD && !this._activeMutations.has('velocity_slow')) {
            this._activeMutations.add('velocity_slow');
            newMutations.push('velocity_slow');
        }

        // Escalation
        if (this.bias.escalation >= MUTATION_THRESHOLD && !this._activeMutations.has('escalation_high')) {
            this._activeMutations.add('escalation_high');
            newMutations.push('escalation_high');
        }
        if (this.bias.escalation <= -MUTATION_THRESHOLD && !this._activeMutations.has('escalation_low')) {
            this._activeMutations.add('escalation_low');
            newMutations.push('escalation_low');
        }

        // Publicity
        if (this.bias.publicity >= MUTATION_THRESHOLD && !this._activeMutations.has('publicity_high')) {
            this._activeMutations.add('publicity_high');
            newMutations.push('publicity_high');
        }
        if (this.bias.publicity <= -MUTATION_THRESHOLD && !this._activeMutations.has('publicity_low')) {
            this._activeMutations.add('publicity_low');
            newMutations.push('publicity_low');
        }

        return { newMutations };
    }

    // ═══════════════════════════════════════
    // MODIFIERS — applied by other systems
    // ═══════════════════════════════════════

    /**
     * Modify envelope confidence based on active mutations.
     * Call before displaying envelopes to the player.
     *
     * @param {Array} envelopes
     * @returns {Array} modified envelopes
     */
    modifyEnvelopes(envelopes) {
        if (!envelopes || envelopes.length === 0) return envelopes;

        let modified = [...envelopes];

        // Velocity fast: inflate confidence
        if (this._activeMutations.has('velocity_fast')) {
            const mod = MUTATIONS.velocity_fast.envelope_mod;
            modified = modified.map(env => ({
                ...env,
                confidence: Math.min(0.95, (env.confidence || 0.5) + mod.confidence_shift),
                _accuracy_penalty: mod.accuracy_penalty
            }));
        }

        // Velocity slow: remove one envelope (information starvation)
        if (this._activeMutations.has('velocity_slow')) {
            if (modified.length > 1) {
                // Remove the lowest-confidence envelope
                modified.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
                modified = modified.slice(0, -1);
            }
        }

        return modified;
    }

    /**
     * Get metric change modifier for a given metric key.
     * Mutations amplify or dampen specific metric changes.
     *
     * @param {string} metricKey
     * @returns {number} multiplier (1.0 = no change)
     */
    getMetricModifier(metricKey) {
        let modifier = 1.0;

        for (const mutKey of this._activeMutations) {
            const mut = MUTATIONS[mutKey];
            if (mut?.metric_mod?.[metricKey]) {
                modifier *= mut.metric_mod[metricKey];
            }
        }

        return modifier;
    }

    /**
     * Get latent variable modifier for causal graph integration.
     *
     * @param {string} latentKey
     * @returns {number} multiplier
     */
    getLatentModifier(latentKey) {
        let modifier = 1.0;

        for (const mutKey of this._activeMutations) {
            const mut = MUTATIONS[mutKey];
            if (mut?.latent_mod?.[latentKey]) {
                modifier *= mut.latent_mod[latentKey];
            }
        }

        return modifier;
    }

    /**
     * Get NPC trust change per turn from active mutations.
     *
     * @returns {object} { npc_key: delta_per_turn }
     */
    getNPCDrift() {
        const drift = {};

        for (const mutKey of this._activeMutations) {
            const mut = MUTATIONS[mutKey];
            if (mut?.npc_mod) {
                for (const [npc, delta] of Object.entries(mut.npc_mod)) {
                    drift[npc] = (drift[npc] || 0) + delta;
                }
            }
        }

        return drift;
    }

    // ═══════════════════════════════════════
    // QUERIES
    // ═══════════════════════════════════════

    /**
     * Get active mutations for UI/VFX display.
     */
    getActiveMutations() {
        return [...this._activeMutations].map(key => ({
            key,
            ...MUTATIONS[key]
        }));
    }

    /**
     * Get current bias vector (for telemetry/moral archive).
     */
    getBiasVector() {
        return { ...this.bias };
    }

    /**
     * Get dominant bias dimension.
     */
    getDominantBias() {
        const abs = {
            velocity: Math.abs(this.bias.velocity),
            escalation: Math.abs(this.bias.escalation),
            publicity: Math.abs(this.bias.publicity),
        };

        let max = 0;
        let dominant = null;
        for (const [key, val] of Object.entries(abs)) {
            if (val > max) { max = val; dominant = key; }
        }

        if (!dominant || max < 2) return null;

        const direction = this.bias[dominant] > 0 ? 'positive' : 'negative';
        return { dimension: dominant, direction, strength: max };
    }

    // ═══════════════════════════════════════
    // SERIALIZATION
    // ═══════════════════════════════════════

    exportState() {
        return {
            bias: { ...this.bias },
            activeMutations: [...this._activeMutations],
            decisions: [...this._decisions],
        };
    }

    importState(data) {
        if (!data) return;
        this.bias = data.bias || { velocity: 0, escalation: 0, publicity: 0 };
        this._activeMutations = new Set(data.activeMutations || []);
        this._decisions = data.decisions || [];
    }
}
