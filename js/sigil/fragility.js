/**
 * fragility.js — SIGIL System Fragility Engine
 * ═══════════════════════════════════════════════════════════
 * Latent instability. The system remembers damage you can't see.
 *
 * Not difficulty. Structural memory.
 *
 * Three mechanisms:
 *
 *   1. STRESS ACCUMULATION — each turn adds micro-stress to subsystems.
 *      Subsystems: INFRA (infrastructure), TRUST (social fabric),
 *      SIGNAL (information quality), FIELD (operational capacity).
 *      Stress is invisible. The player never sees the number.
 *
 *   2. FRACTURE LINES — when stress > threshold, a fracture opens.
 *      Fractures are permanent modifiers that shift how the world responds.
 *      The player sees the EFFECT, not the cause.
 *      Example: INFRA fracture → all delayed consequences arrive 1 turn late.
 *
 *   3. CASCADING FAILURE — when 3+ fractures exist, each new fracture
 *      has a chance of triggering a cascade. Cascade = all subsystem
 *      stresses spike simultaneously. The system doesn't fail gracefully.
 *
 * Design principle: the player should feel the world becoming
 * more brittle without understanding the exact mechanism.
 * Opacity is the point. Complexity that rewards attention.
 *
 * Browser-native ES Module. Zero dependencies.
 * ═══════════════════════════════════════════════════════════
 */

// ── Subsystem definitions ──
const SUBSYSTEMS = {
    infra: {
        label: 'INFRASTRUTTURA',
        threshold: 70,           // stress level to fracture
        decay: 0.5,              // natural stress relief per turn
        stressors: {             // what adds stress
            volatility: 0.3,     // high volatility → infra stress
            brent: 0.2,          // oil price → infrastructure cost
        }
    },
    trust: {
        label: 'TESSUTO SOCIALE',
        threshold: 65,
        decay: 0.3,              // trust heals slowly
        stressors: {
            polarization: 0.4,
            repression_index: 0.3,
        }
    },
    signal: {
        label: 'QUALITÀ SEGNALE',
        threshold: 60,
        decay: 0.8,              // signal recovers faster
        stressors: {
            polarization: 0.2,
            volatility: 0.2,
        }
    },
    field: {
        label: 'CAPACITÀ OPERATIVA',
        threshold: 75,
        decay: 0.4,
        stressors: {
            repression_index: 0.4,
            ngo_capacity_inverse: 0.3,   // low ngo_capacity → more stress
        }
    }
};

// ── Fracture effects ──
// What happens when a subsystem fractures
const FRACTURE_EFFECTS = {
    infra: {
        description: 'Ritardi sistematici nelle conseguenze',
        // Delayed consequences arrive +1 turn late
        delay_modifier: 1,
        // Metric change dampening (world responds less)
        metric_dampening: 0.85,
    },
    trust: {
        description: 'Erosione del consenso sociale',
        // Public trust decays each turn
        trust_decay_per_turn: { public_trust: -1, civil_society_trust: -1 },
        // NPC trust decays faster
        npc_trust_modifier: 1.3,
    },
    signal: {
        description: 'Degradazione dell\'informazione',
        // Envelope confidence reduced
        confidence_modifier: 0.7,
        // Noise on all causal graph edges increases
        noise_amplifier: 1.4,
    },
    field: {
        description: 'Collasso capacità operativa',
        // Some decision options may become unavailable
        option_filter: true,
        // NPC availability affected
        npc_availability_stress: true,
    }
};


export class Fragility {
    constructor() {
        // ── Subsystem stress levels (0–100) ──
        this.stress = {
            infra: 0,
            trust: 0,
            signal: 0,
            field: 0,
        };

        // ── Active fractures ──
        // { subsystem: { turn_formed, severity (0–1), effect } }
        this.fractures = {};

        // ── Cascade counter ──
        this._cascadeCount = 0;

        // ── Turn tracking ──
        this._turnCount = 0;
    }

    // ═══════════════════════════════════════
    // TURN PROCESSING
    // ═══════════════════════════════════════

    /**
     * Process one turn of fragility accumulation.
     * Call after consequences are applied, before state save.
     *
     * @param {GameState} state
     * @param {object} turnData
     *   - arcCount: number of causal arcs fired
     *   - scarsFormed: string[] — new scar keys
     *   - actionId: string
     * @returns {{ newFractures: string[], cascadeTriggered: boolean, effects: object }}
     */
    processTurn(state, turnData) {
        this._turnCount++;
        const newFractures = [];
        let cascadeTriggered = false;

        // ── Phase 1: Accumulate stress from latent vars ──
        for (const [sub, config] of Object.entries(SUBSYSTEMS)) {
            let stressGain = 0;

            for (const [source, weight] of Object.entries(config.stressors)) {
                if (source === 'ngo_capacity_inverse') {
                    // Inverted: low value = high stress
                    const val = 100 - (state.latent_vars.ngo_capacity || 50);
                    stressGain += (val / 100) * weight * 10;
                } else {
                    const val = state.latent_vars[source] || 0;
                    stressGain += (val / 100) * weight * 10;
                }
            }

            // Scars amplify stress
            if (turnData.scarsFormed && turnData.scarsFormed.length > 0) {
                stressGain += turnData.scarsFormed.length * 3;
            }

            // High arc density = more system load
            stressGain += (turnData.arcCount || 0) * 0.5;

            // Existing fractures in OTHER subsystems amplify this one
            const otherFractureCount = Object.keys(this.fractures)
                .filter(k => k !== sub).length;
            stressGain *= (1 + otherFractureCount * 0.15);

            // Apply stress (minus natural decay)
            this.stress[sub] = Math.max(0, Math.min(100,
                this.stress[sub] + stressGain - config.decay
            ));
        }

        // ── Phase 2: Check for new fractures ──
        for (const [sub, config] of Object.entries(SUBSYSTEMS)) {
            if (this.fractures[sub]) continue; // already fractured
            if (this.stress[sub] >= config.threshold) {
                this.fractures[sub] = {
                    turn_formed: this._turnCount,
                    severity: Math.min(1, (this.stress[sub] - config.threshold) / 30),
                    effect: FRACTURE_EFFECTS[sub]
                };
                newFractures.push(sub);
            }
        }

        // ── Phase 3: Cascade check ──
        const fractureCount = Object.keys(this.fractures).length;
        if (fractureCount >= 3 && newFractures.length > 0) {
            // Each new fracture after 3rd has 40% + 20% per extra fracture chance
            const cascadeChance = 0.4 + (fractureCount - 3) * 0.2;
            // Deterministic: use stress sum as pseudo-random
            const stressSum = Object.values(this.stress).reduce((a, b) => a + b, 0);
            const pseudoRand = (stressSum * 137) % 100 / 100;

            if (pseudoRand < cascadeChance) {
                cascadeTriggered = true;
                this._cascadeCount++;
                // Spike all subsystem stresses
                for (const sub of Object.keys(this.stress)) {
                    this.stress[sub] = Math.min(100, this.stress[sub] + 20);
                }
            }
        }

        // ── Phase 4: Apply passive fracture effects to state ──
        const effects = this._applyPassiveEffects(state);

        return {
            newFractures,
            cascadeTriggered,
            effects,
            fractureCount,
            stressLevels: { ...this.stress }
        };
    }

    // ═══════════════════════════════════════
    // PASSIVE EFFECTS — applied each turn
    // ═══════════════════════════════════════

    _applyPassiveEffects(state) {
        const effects = {};

        // TRUST fracture: passive trust decay
        if (this.fractures.trust) {
            const decay = FRACTURE_EFFECTS.trust.trust_decay_per_turn;
            for (const [metric, delta] of Object.entries(decay)) {
                state.applyMetric(metric, String(delta));
            }
            effects.trust_decay = true;
        }

        // SIGNAL fracture: increase decision fatigue (noise = cognitive cost)
        if (this.fractures.signal) {
            state.applyMetric('decision_fatigue', '+1');
            effects.signal_noise = true;
        }

        return effects;
    }

    // ═══════════════════════════════════════
    // QUERIES — used by other modules
    // ═══════════════════════════════════════

    /**
     * Get delay modifier for consequence scheduling.
     * INFRA fracture makes delayed consequences arrive later.
     */
    getDelayModifier() {
        if (!this.fractures.infra) return 0;
        return FRACTURE_EFFECTS.infra.delay_modifier;
    }

    /**
     * Get metric dampening factor.
     * INFRA fracture reduces how much the world responds to actions.
     */
    getMetricDampening() {
        if (!this.fractures.infra) return 1.0;
        return FRACTURE_EFFECTS.infra.metric_dampening;
    }

    /**
     * Get noise amplifier for causal graph edges.
     * SIGNAL fracture increases noise on all computations.
     */
    getNoiseAmplifier() {
        if (!this.fractures.signal) return 1.0;
        return FRACTURE_EFFECTS.signal.noise_amplifier;
    }

    /**
     * Get confidence modifier for envelopes.
     * SIGNAL fracture reduces intelligence quality.
     */
    getConfidenceModifier() {
        if (!this.fractures.signal) return 1.0;
        return FRACTURE_EFFECTS.signal.confidence_modifier;
    }

    /**
     * Should field-dependent options be filtered?
     * FIELD fracture may restrict operational choices.
     */
    shouldFilterFieldOptions() {
        return !!this.fractures.field;
    }

    /**
     * Get NPC trust change modifier.
     * TRUST fracture means NPC trust changes are amplified (negative ones more).
     */
    getNPCTrustModifier() {
        if (!this.fractures.trust) return 1.0;
        return FRACTURE_EFFECTS.trust.npc_trust_modifier;
    }

    /**
     * Get total system fragility (0–1).
     * For VFX/audio — how damaged is the world?
     */
    getFragilityIndex() {
        const avgStress = Object.values(this.stress).reduce((a, b) => a + b, 0) / 4;
        const fracturePenalty = Object.keys(this.fractures).length * 10;
        const cascadePenalty = this._cascadeCount * 15;
        return Math.min(1, (avgStress + fracturePenalty + cascadePenalty) / 100);
    }

    /**
     * Get active fracture list for UI/VFX.
     */
    getActiveFractures() {
        return Object.entries(this.fractures).map(([key, data]) => ({
            subsystem: key,
            label: SUBSYSTEMS[key].label,
            turn_formed: data.turn_formed,
            severity: data.severity,
            description: data.effect.description
        }));
    }

    // ═══════════════════════════════════════
    // SERIALIZATION
    // ═══════════════════════════════════════

    exportState() {
        return {
            stress: { ...this.stress },
            fractures: JSON.parse(JSON.stringify(this.fractures)),
            cascadeCount: this._cascadeCount,
            turnCount: this._turnCount,
        };
    }

    importState(data) {
        if (!data) return;
        this.stress = data.stress || { infra: 0, trust: 0, signal: 0, field: 0 };
        this.fractures = data.fractures || {};
        this._cascadeCount = data.cascadeCount || 0;
        this._turnCount = data.turnCount || 0;
    }
}
