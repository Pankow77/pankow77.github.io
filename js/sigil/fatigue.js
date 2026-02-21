/**
 * fatigue.js — SIGIL Cognitive Load & Adaptation Engine
 * ═══════════════════════════════════════════════════════════
 * The system that prevents the system from destroying itself.
 *
 * Without contrast, no tension. Without silence, no sound.
 * Without boredom, no surprise. Without frustration, no realism.
 *
 * Three interlocking systems:
 *
 *   1. OXYGEN — intensity tracking over last N turns.
 *      If too intense → dampen everything. Create breathing room.
 *
 *   2. HABITUATION — repeated action×theater combos lose impact.
 *      "Non mi sorprendi più." The system communicates fatigue.
 *
 *   3. SESSION ARC — 10-minute temporal design for total hook.
 *      0–2min: imprint | 3–5min: breathe | 6–8min: surprise | 9–10min: suspend
 *
 * Also provides:
 *   - Cognitive load index (composite internal metric)
 *   - Adaptive thresholds (fatigue raises activation cost)
 *   - Inertia probability (sometimes the world doesn't respond)
 *
 * Browser-native ES Module. Zero dependencies.
 * ═══════════════════════════════════════════════════════════
 */

export class Fatigue {
    constructor() {
        // ── Intensity history (last N turns) ──
        this._intensityHistory = [];
        this._windowSize = 5;        // look back 5 turns

        // ── Habituation map ──
        // Key: `${actionId}::${theater}` → count of times used
        this._habituationMap = {};

        // ── Session timing ──
        this._sessionStartTime = Date.now();

        // ── Cognitive load ──
        this.cognitiveLoad = 0;       // 0.0–1.0

        // ── Output multipliers (computed per turn) ──
        this.oxygenMultiplier = 1.0;  // 0.3–1.0 (dampening factor)
        this.habituationMult = 1.0;   // 0.4–1.0 (per-action dampening)
    }

    // ═══════════════════════════════════════
    // TURN RECORDING
    // ═══════════════════════════════════════

    /**
     * Record the intensity of a completed turn.
     * Call this AFTER the cinematic sequence, with measured data.
     *
     * @param {object} turnData
     *   - arcCount: number of causal arcs fired
     *   - scarsFormed: number of new scars this turn
     *   - collapseActive: boolean
     *   - crisisTriggered: boolean
     *   - rhythm: string (calm/turbulent/opaque/inertial)
     *   - actionId: string
     *   - theater: string|null
     */
    recordTurn(turnData) {
        const intensity = this._computeIntensity(turnData);

        this._intensityHistory.push(intensity);
        if (this._intensityHistory.length > this._windowSize) {
            this._intensityHistory.shift();
        }

        // Record habituation
        const habKey = `${turnData.actionId}::${turnData.theater || 'none'}`;
        this._habituationMap[habKey] = (this._habituationMap[habKey] || 0) + 1;

        // Recompute all multipliers
        this._recompute(turnData);
    }

    /**
     * Compute raw intensity for a single turn (0.0–1.0).
     */
    _computeIntensity(data) {
        let score = 0;

        // Arc density: 0–8 arcs maps to 0–0.4
        score += Math.min(0.4, (data.arcCount || 0) * 0.05);

        // Scar formation is always intense
        score += (data.scarsFormed || 0) * 0.15;

        // Collapse is maximum intensity
        if (data.collapseActive) score += 0.25;

        // Crisis events
        if (data.crisisTriggered) score += 0.1;

        // Turbulent rhythm amplifies
        if (data.rhythm === 'turbulent') score += 0.1;

        return Math.min(1, score);
    }

    // ═══════════════════════════════════════
    // RECOMPUTATION
    // ═══════════════════════════════════════

    _recompute(turnData) {
        // ── Cognitive load: weighted average of recent intensity ──
        if (this._intensityHistory.length === 0) {
            this.cognitiveLoad = 0;
            this.oxygenMultiplier = 1.0;
            return;
        }

        // More recent turns weigh more
        let weightedSum = 0;
        let weightTotal = 0;
        for (let i = 0; i < this._intensityHistory.length; i++) {
            const recency = (i + 1) / this._intensityHistory.length;
            weightedSum += this._intensityHistory[i] * recency;
            weightTotal += recency;
        }
        this.cognitiveLoad = Math.min(1, weightedSum / weightTotal);

        // ── Oxygen multiplier ──
        // If cognitive load > 0.6 → start dampening
        // At load 1.0 → oxygen = 0.35 (heavy dampening, not silence)
        if (this.cognitiveLoad > 0.6) {
            const excess = (this.cognitiveLoad - 0.6) / 0.4; // 0→1
            this.oxygenMultiplier = 1.0 - excess * 0.65;      // 1.0→0.35
        } else {
            this.oxygenMultiplier = 1.0;
        }

        // ── Habituation for current action ──
        const habKey = `${turnData?.actionId}::${turnData?.theater || 'none'}`;
        const uses = this._habituationMap[habKey] || 0;
        // First use: 1.0, second: 0.85, third: 0.6, fourth+: 0.4
        if (uses <= 1) this.habituationMult = 1.0;
        else if (uses === 2) this.habituationMult = 0.85;
        else if (uses === 3) this.habituationMult = 0.6;
        else this.habituationMult = 0.4;
    }

    // ═══════════════════════════════════════
    // QUERIES — used by other modules
    // ═══════════════════════════════════════

    /**
     * Get the current oxygen multiplier.
     * Apply this to: VFX intensity, audio gain, arc count shown, sub-bass volume.
     *
     * 1.0 = full intensity. 0.35 = heavy dampening (breathing room).
     */
    getOxygenMultiplier() {
        return this.oxygenMultiplier;
    }

    /**
     * Get habituation multiplier for a specific action×theater.
     * Apply this to: stamp duration, sub-bass gain, glitch intensity.
     *
     * 1.0 = first time (full impact). 0.4 = fourth+ time (diminished).
     */
    getHabituation(actionId, theater) {
        const habKey = `${actionId}::${theater || 'none'}`;
        const uses = this._habituationMap[habKey] || 0;
        if (uses <= 1) return 1.0;
        if (uses === 2) return 0.85;
        if (uses === 3) return 0.6;
        return 0.4;
    }

    /**
     * Adaptive threshold: fatigue raises the bar for activation.
     * Used by CausalGraph to make cascade edges less trigger-happy
     * when the player is overloaded.
     *
     * @param {number} baseThreshold — the edge's static threshold
     * @returns {number} adjusted threshold (always >= base)
     */
    getAdaptiveThreshold(baseThreshold) {
        // At max cognitive load, thresholds rise by +8
        return baseThreshold + Math.round(this.cognitiveLoad * 8);
    }

    /**
     * Should this turn be an "inertia turn"?
     * Sometimes the world doesn't respond. This is realism.
     *
     * Probability increases with:
     *   - High cognitive load (system gives you a break)
     *   - Calm rhythm (nothing dramatic happening anyway)
     *   - Session breathing phase (minutes 3–5)
     *
     * Returns a dampening factor: 1.0 = normal, 0.0 = full inertia (muted response).
     * Intermediate values (0.3–0.7) mean partial inertia.
     */
    getInertiaDampening() {
        const phase = this.getSessionPhase();
        let inertiaChance = 0;

        // High cognitive load → more likely
        inertiaChance += this.cognitiveLoad * 0.3;

        // Breathing phase → much more likely
        if (phase === 'breathe') inertiaChance += 0.25;

        // Clamp to max 50% chance
        inertiaChance = Math.min(0.5, inertiaChance);

        // Deterministic-ish: use intensity history sum as pseudo-random
        const historySum = this._intensityHistory.reduce((a, b) => a + b, 0);
        const pseudoRand = (historySum * 1000) % 100 / 100;

        if (pseudoRand < inertiaChance) {
            // Inertia turn — dampen response
            // Severity: 0.2 (barely respond) to 0.5 (partial response)
            return 0.2 + pseudoRand * 0.6;
        }

        return 1.0; // Normal turn
    }

    /**
     * Should we show afterimage silence?
     * Returns duration in ms (0 = no afterimage).
     *
     * Triggered after intense events. The void amplifies memory.
     */
    getAfterImageDuration() {
        if (this._intensityHistory.length === 0) return 0;

        const lastIntensity = this._intensityHistory[this._intensityHistory.length - 1];

        // Only trigger after intense turns (> 0.5)
        if (lastIntensity < 0.5) return 0;

        // 300ms base + up to 500ms for maximum intensity
        return 300 + Math.round((lastIntensity - 0.5) * 1000);
    }

    // ═══════════════════════════════════════
    // SESSION ARC — 10-minute temporal design
    // ═══════════════════════════════════════

    /**
     * Get current session phase based on elapsed time.
     *
     *   0–2 min: IMPRINT  — reattività alta, imprinting forte
     *   3–5 min: BREATHE  — respirazione, contrasto
     *   6–8 min: SURPRISE — evento cross-theatre inatteso
     *   9–10 min: SUSPEND — micro-silenzio, tensione sospesa
     *
     * After 10 min: cycle restarts with reduced IMPRINT intensity.
     */
    getSessionPhase() {
        const elapsed = (Date.now() - this._sessionStartTime) / 1000; // seconds
        const cycleLength = 600; // 10 minutes
        const inCycle = elapsed % cycleLength;

        if (inCycle < 120) return 'imprint';      // 0–2 min
        if (inCycle < 300) return 'breathe';       // 2–5 min
        if (inCycle < 480) return 'surprise';      // 5–8 min
        return 'suspend';                           // 8–10 min
    }

    /**
     * Get session phase multipliers for audio/VFX.
     *
     * Returns object with per-phase tuning:
     *   audioGain: overall audio multiplier
     *   vfxIntensity: VFX effect intensity
     *   propagationSpeed: how fast arcs appear
     *   silenceWeight: how much silence between events
     */
    getSessionModifiers() {
        const phase = this.getSessionPhase();
        const elapsed = (Date.now() - this._sessionStartTime) / 1000;
        const cycle = Math.floor(elapsed / 600); // which 10-min cycle

        // Each cycle: imprint gets slightly less intense (returns diminish)
        const cycleDecay = Math.max(0.7, 1.0 - cycle * 0.1);

        switch (phase) {
            case 'imprint':
                return {
                    audioGain: 1.0 * cycleDecay,
                    vfxIntensity: 1.0 * cycleDecay,
                    propagationSpeed: 1.0,
                    silenceWeight: 0.1,   // minimal silence, high reactivity
                };
            case 'breathe':
                return {
                    audioGain: 0.5,
                    vfxIntensity: 0.4,
                    propagationSpeed: 0.6,  // slower reveals
                    silenceWeight: 0.6,     // more space between events
                };
            case 'surprise':
                return {
                    audioGain: 0.9,
                    vfxIntensity: 0.85,
                    propagationSpeed: 1.2,  // fast when it hits
                    silenceWeight: 0.3,
                };
            case 'suspend':
                return {
                    audioGain: 0.3,
                    vfxIntensity: 0.25,
                    propagationSpeed: 0.4,
                    silenceWeight: 0.8,     // mostly silence, tension from absence
                };
            default:
                return {
                    audioGain: 1.0,
                    vfxIntensity: 1.0,
                    propagationSpeed: 1.0,
                    silenceWeight: 0.2,
                };
        }
    }

    /**
     * Get composite dampening factor.
     * Combines oxygen + session + habituation into one multiplier.
     *
     * This is the ONE number other modules need.
     */
    getCompositeDampening(actionId, theater) {
        const oxygen = this.oxygenMultiplier;
        const session = this.getSessionModifiers().vfxIntensity;
        const habit = this.getHabituation(actionId, theater);
        const inertia = this.getInertiaDampening();

        // Geometric mean — all factors contribute, none dominates
        return Math.pow(oxygen * session * habit * inertia, 0.5);
    }

    // ═══════════════════════════════════════
    // SERIALIZATION
    // ═══════════════════════════════════════

    exportState() {
        return {
            intensityHistory: [...this._intensityHistory],
            habituationMap: { ...this._habituationMap },
            sessionStartTime: this._sessionStartTime,
        };
    }

    importState(data) {
        if (!data) return;
        this._intensityHistory = data.intensityHistory || [];
        this._habituationMap = data.habituationMap || {};
        this._sessionStartTime = data.sessionStartTime || Date.now();
        this._recompute(null);
    }
}
