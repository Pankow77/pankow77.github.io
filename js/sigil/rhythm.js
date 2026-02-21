/**
 * rhythm.js — SIGIL Turn Rhythm Classifier
 * ═══════════════════════════════════════════════════════════
 * Not all turns are equal. The system breathes.
 *
 * Four rhythm types:
 *   CALM       — colori freddi, movimenti lenti, silenzio operativo
 *   TURBULENT  — jitter, rapid updates, edges vibrano
 *   OPAQUE     — fog of war, nodi nascosti, informazione ridotta
 *   INERTIAL   — effetti ritardati esplodono, il passato arriva
 *
 * Classification is f(game_state, pending_delayed, scars).
 * Deterministic. Same state → same rhythm.
 *
 * Browser-native ES Module. Zero dependencies.
 * ═══════════════════════════════════════════════════════════
 */

export class Rhythm {
    constructor() {
        this.current = 'calm';
        this.history = [];
    }

    /**
     * Classify the current turn's rhythm type.
     *
     * @param {GameState} state
     * @param {number} pendingDelayed — number of delayed consequences waiting
     * @param {object} scars — current scar state from CausalGraph
     * @returns {{ type: string, intensity: number, params: object }}
     */
    classify(state, pendingDelayed, scars) {
        const vol = state.latent_vars?.volatility || 0;
        const pol = state.latent_vars?.polarization || 0;
        const rep = state.latent_vars?.repression_index || 0;
        const cred = state.metrics?.scientific_credibility ?? 50;
        const scarCount = Object.keys(scars || {}).length;

        // Score each rhythm type
        const scores = {
            calm: 0,
            turbulent: 0,
            opaque: 0,
            inertial: 0
        };

        // ── TURBULENT: high volatility + high polarization ──
        scores.turbulent += vol > 50 ? (vol - 50) * 0.04 : 0;
        scores.turbulent += pol > 45 ? (pol - 45) * 0.03 : 0;
        scores.turbulent += scarCount * 0.1;

        // ── OPAQUE: low credibility + high repression ──
        scores.opaque += cred < 40 ? (40 - cred) * 0.04 : 0;
        scores.opaque += rep > 35 ? (rep - 35) * 0.03 : 0;

        // ── INERTIAL: many delayed consequences pending ──
        scores.inertial += pendingDelayed * 0.25;
        scores.inertial += scarCount > 2 ? 0.3 : 0;

        // ── CALM: everything low, no pressure ──
        scores.calm += vol < 30 ? (30 - vol) * 0.03 : 0;
        scores.calm += pol < 30 ? (30 - pol) * 0.02 : 0;
        scores.calm += pendingDelayed === 0 ? 0.3 : 0;

        // Anti-repetition: suppress same rhythm 3+ times in a row
        const lastThree = this.history.slice(-3);
        if (lastThree.length === 3 && lastThree.every(h => h === lastThree[0])) {
            scores[lastThree[0]] *= 0.3;
        }

        // Winner takes all
        let winner = 'calm';
        let maxScore = -1;
        for (const [type, score] of Object.entries(scores)) {
            if (score > maxScore) {
                maxScore = score;
                winner = type;
            }
        }

        // Intensity: 0-1, how strongly this rhythm expresses
        const intensity = Math.min(1, maxScore / 2);

        this.current = winner;
        this.history.push(winner);

        return {
            type: winner,
            intensity,
            params: this._getParams(winner, intensity, state)
        };
    }

    /**
     * Get visual/audio parameters for a rhythm type.
     */
    _getParams(type, intensity, state) {
        switch (type) {
            case 'calm':
                return {
                    colorTemp: 'cool',          // blue-green shift
                    driftSpeed: 0.003,           // slow ambient movement
                    typewriterSpeed: 25,         // slower text
                    envelopePause: 1500,         // longer pauses
                    metricWaveSpeed: 0.5,        // gentle breathing
                    propagationDelay: 150,       // arcs reveal slowly
                    showMicroCrisis: false,       // no threshold events
                    scarVisibility: 0.3 * intensity,
                };
            case 'turbulent':
                return {
                    colorTemp: 'warm',           // red-amber shift
                    driftSpeed: 0.02,            // fast jitter
                    typewriterSpeed: 12,         // rapid text
                    envelopePause: 600,          // quick succession
                    metricWaveSpeed: 3.0,        // aggressive oscillation
                    propagationDelay: 50,        // arcs fire fast
                    showMicroCrisis: true,        // threshold events active
                    scarVisibility: 0.8 * intensity,
                    jitter: intensity * 2,        // px of random offset
                };
            case 'opaque':
                return {
                    colorTemp: 'muted',          // desaturated
                    driftSpeed: 0.005,           // slow, uncertain
                    typewriterSpeed: 30,         // text hesitates
                    envelopePause: 2000,         // long, uncomfortable pauses
                    metricWaveSpeed: 0.8,
                    propagationDelay: 200,       // slow reveal
                    showMicroCrisis: false,
                    scarVisibility: 0.2,
                    hiddenMetrics: this._getHiddenMetrics(state),
                    fogDensity: intensity * 0.4,
                };
            case 'inertial':
                return {
                    colorTemp: 'neutral',
                    driftSpeed: 0.01,
                    typewriterSpeed: 15,
                    envelopePause: 400,          // things happen fast
                    metricWaveSpeed: 2.0,
                    propagationDelay: 30,        // rapid cascade
                    showMicroCrisis: true,
                    scarVisibility: 1.0,
                    burstMode: true,             // delayed consequences explode
                };
            default:
                return {};
        }
    }

    /**
     * During OPAQUE turns, some metrics are hidden.
     * Which ones depends on what the player can't see.
     */
    _getHiddenMetrics(state) {
        const hidden = [];
        const cred = state.metrics?.scientific_credibility ?? 50;

        if (cred < 30) hidden.push('civil_society_trust');
        if (cred < 25) hidden.push('government_comfort');
        if (cred < 20) hidden.push('frame_control');

        return hidden;
    }

    /**
     * Get rhythm display label for UI.
     */
    getLabel() {
        const labels = {
            calm: 'OPERATIVO',
            turbulent: 'TURBOLENTO',
            opaque: 'OPACO',
            inertial: 'INERZIALE'
        };
        return labels[this.current] || this.current;
    }
}
