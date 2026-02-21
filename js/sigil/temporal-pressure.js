/**
 * temporal-pressure.js — SIGIL Temporal Pressure Engine
 * ═══════════════════════════════════════════════════════════
 * The clock doesn't care about you.
 *
 * Silent deadlines. Invisible countdowns. The world moves at its
 * own pace. If you take too long, opportunities close. If you rush,
 * you miss the window.
 *
 * Three pressure mechanisms:
 *
 *   1. DECAY TIMERS — metrics that erode each turn unless actively
 *      maintained. Public attention spans are finite.
 *
 *   2. WINDOWS — time-limited opportunities that appear and vanish.
 *      Miss the window = the world chooses for you.
 *
 *   3. ESCALATION CLOCK — a hidden countdown that ticks toward
 *      a world event. Player actions can speed up or slow down
 *      the clock, but never stop it.
 *
 * The player NEVER sees a timer. They feel urgency through:
 *   - Faster typewriter speeds
 *   - Shorter envelope display times
 *   - NPCs becoming terse
 *   - Metric bars flickering
 *
 * Browser-native ES Module. Zero dependencies.
 * ═══════════════════════════════════════════════════════════
 */

// ── Decay definitions ──
const DECAY_RULES = [
    {
        metric: 'public_awareness',
        decay_per_turn: 3,              // attention decays fast
        floor: 5,                        // never hits zero (some awareness persists)
        accelerator: 'polarization',     // high polarization = faster decay
        accelerator_threshold: 40,
        accelerator_rate: 1.5,
    },
    {
        metric: 'frame_control',
        decay_per_turn: 2,
        floor: 10,
        accelerator: 'volatility',
        accelerator_threshold: 50,
        accelerator_rate: 1.3,
    },
    {
        metric: 'government_comfort',
        decay_per_turn: 1,
        floor: 15,
        accelerator: 'brent',
        accelerator_threshold: 60,
        accelerator_rate: 1.4,
    },
];

// ── Window definitions ──
const WINDOWS = [
    {
        id: 'early_publication',
        label: 'Finestra di prima pubblicazione',
        open_turn: 1,
        close_turn: 2,
        reward: {
            metrics: { public_awareness: '+10', frame_control: '+5' },
            feedback: 'Sei stato il primo a pubblicare. Il frame è tuo.',
        },
        penalty: {
            metrics: { frame_control: '-5' },
            feedback: 'La finestra si è chiusa. Altri hanno definito la narrativa.',
        },
        // Condition to "use" the window
        condition_action: ['frame_alert', 'publish_flagged', 'publish_correlation'],
    },
    {
        id: 'diplomatic_window',
        label: 'Finestra diplomatica',
        open_turn: 2,
        close_turn: 3,
        reward: {
            metrics: { government_comfort: '+8', civil_society_trust: '+5' },
            feedback: 'Il tuo approccio diplomatico ha funzionato. Canali aperti.',
        },
        penalty: {
            metrics: { government_comfort: '-3' },
            feedback: 'La finestra diplomatica si è chiusa. I canali sono gelidi.',
        },
        condition_action: ['frame_caution', 'frame_context', 'careful_framing'],
    },
    {
        id: 'source_extraction',
        label: 'Finestra di estrazione fonte',
        open_turn: 3,
        close_turn: 4,
        reward: {
            npc_changes: { amara_diallo: '+10' },
            feedback: 'Amara Diallo è stata evacuata. Ti deve la vita.',
        },
        penalty: {
            npc_changes: { amara_diallo: '-15' },
            feedback: 'Amara Diallo è irraggiungibile. I contatti locali non rispondono più.',
        },
        condition_action: ['investigate_private', 'share_private'],
    },
];

// ── Escalation clock ──
const ESCALATION_CLOCK = {
    initial: 10,            // ticks before escalation event
    tick_per_turn: 1,       // base tick rate
    // What speeds up the clock
    accelerators: {
        volatility: { threshold: 50, extra_tick: 0.5 },
        polarization: { threshold: 45, extra_tick: 0.3 },
        brent: { threshold: 65, extra_tick: 0.4 },
    },
    // What slows it down
    decelerators: {
        frame_context: 0.5,          // contextualizing slows escalation
        investigate_private: 0.3,     // investigation buys time
        careful_framing: 0.4,
    },
    // What happens when it hits zero
    event: {
        feedback: 'ESCALAZIONE INCONTROLLATA — Le tensioni nello Stretto hanno superato il punto critico. Un incidente navale è in corso.',
        effects: {
            latent_vars: { volatility: 15, brent: 12 },
            metrics: { public_trust: '-8', government_comfort: '-10', frame_control: '-15' },
        }
    }
};


export class TemporalPressure {
    constructor() {
        // ── Decay tracking ──
        this._decayActive = true;

        // ── Window tracking ──
        // { window_id: 'open'|'used'|'expired' }
        this._windowStates = {};
        for (const w of WINDOWS) {
            this._windowStates[w.id] = 'pending';
        }

        // ── Escalation clock ──
        this._clockRemaining = ESCALATION_CLOCK.initial;
        this._clockTriggered = false;

        // ── Urgency level (0–1) for UI effects ──
        this.urgency = 0;
    }

    // ═══════════════════════════════════════
    // TURN PROCESSING
    // ═══════════════════════════════════════

    /**
     * Process temporal pressure for a turn.
     * Call at the START of a turn, before the player decides.
     *
     * @param {number} turn
     * @param {GameState} state
     * @returns {{ decayed: object, windowsExpired: Array, clockTicked: boolean, escalationTriggered: boolean }}
     */
    processPreTurn(turn, state) {
        const result = {
            decayed: {},
            windowsExpired: [],
            windowsOpened: [],
            clockTicked: false,
            escalationTriggered: false,
        };

        // ── Phase 1: Apply metric decay ──
        if (this._decayActive) {
            for (const rule of DECAY_RULES) {
                const current = state.metrics[rule.metric] ?? 50;
                if (current <= rule.floor) continue;

                let decay = rule.decay_per_turn;

                // Accelerator check
                const accVal = state.latent_vars[rule.accelerator] ?? 0;
                if (accVal > rule.accelerator_threshold) {
                    decay = Math.round(decay * rule.accelerator_rate);
                }

                const newVal = Math.max(rule.floor, current - decay);
                state.applyMetric(rule.metric, String(-(current - newVal)));
                result.decayed[rule.metric] = -(current - newVal);
            }
        }

        // ── Phase 2: Check window states ──
        for (const w of WINDOWS) {
            const ws = this._windowStates[w.id];

            // Open windows that should be open
            if (ws === 'pending' && turn >= w.open_turn) {
                this._windowStates[w.id] = 'open';
                result.windowsOpened.push(w.id);
            }

            // Expire windows that are past their close turn
            if (ws === 'open' && turn > w.close_turn) {
                this._windowStates[w.id] = 'expired';
                result.windowsExpired.push({
                    id: w.id,
                    label: w.label,
                    penalty: w.penalty,
                });

                // Apply penalty
                if (w.penalty.metrics) {
                    for (const [k, v] of Object.entries(w.penalty.metrics)) {
                        state.applyMetric(k, v);
                    }
                }
                if (w.penalty.npc_changes) {
                    for (const [k, v] of Object.entries(w.penalty.npc_changes)) {
                        state.applyNPC(k, v);
                    }
                }
            }
        }

        // ── Phase 3: Tick escalation clock ──
        if (!this._clockTriggered) {
            let tick = ESCALATION_CLOCK.tick_per_turn;

            // Accelerators
            for (const [varKey, config] of Object.entries(ESCALATION_CLOCK.accelerators)) {
                const val = state.latent_vars[varKey] ?? 0;
                if (val > config.threshold) {
                    tick += config.extra_tick;
                }
            }

            this._clockRemaining -= tick;
            result.clockTicked = true;

            if (this._clockRemaining <= 0) {
                this._clockTriggered = true;
                result.escalationTriggered = true;
            }
        }

        // ── Phase 4: Update urgency ──
        this._updateUrgency(state);

        return result;
    }

    /**
     * Process player action — check if it satisfies a window or slows the clock.
     * Call AFTER the player decides.
     *
     * @param {string} actionId
     * @param {number} turn
     * @param {GameState} state
     * @returns {{ windowUsed: object|null, clockSlowed: number }}
     */
    processAction(actionId, turn, state) {
        let windowUsed = null;
        let clockSlowed = 0;

        // ── Check if action satisfies an open window ──
        for (const w of WINDOWS) {
            if (this._windowStates[w.id] !== 'open') continue;
            if (turn < w.open_turn || turn > w.close_turn) continue;

            if (w.condition_action.includes(actionId)) {
                this._windowStates[w.id] = 'used';

                // Apply reward
                if (w.reward.metrics) {
                    for (const [k, v] of Object.entries(w.reward.metrics)) {
                        state.applyMetric(k, v);
                    }
                }
                if (w.reward.npc_changes) {
                    for (const [k, v] of Object.entries(w.reward.npc_changes)) {
                        state.applyNPC(k, v);
                    }
                }

                windowUsed = {
                    id: w.id,
                    label: w.label,
                    reward: w.reward,
                };
                break; // only one window per action
            }
        }

        // ── Check if action slows escalation clock ──
        const decel = ESCALATION_CLOCK.decelerators[actionId];
        if (decel && !this._clockTriggered) {
            this._clockRemaining += decel;
            clockSlowed = decel;
        }

        return { windowUsed, clockSlowed };
    }

    // ═══════════════════════════════════════
    // URGENCY COMPUTATION
    // ═══════════════════════════════════════

    _updateUrgency(state) {
        let urgencyScore = 0;

        // Clock proximity
        if (!this._clockTriggered) {
            const clockUrgency = 1 - (this._clockRemaining / ESCALATION_CLOCK.initial);
            urgencyScore += clockUrgency * 0.4;
        }

        // Open windows about to expire
        const openWindows = WINDOWS.filter(w => this._windowStates[w.id] === 'open');
        urgencyScore += openWindows.length * 0.15;

        // Metric decay rates
        const decayingMetrics = DECAY_RULES.filter(r =>
            (state.metrics[r.metric] ?? 50) > r.floor + 5
        );
        urgencyScore += decayingMetrics.length * 0.05;

        this.urgency = Math.min(1, urgencyScore);
    }

    // ═══════════════════════════════════════
    // QUERIES — for UI/VFX/Audio
    // ═══════════════════════════════════════

    /**
     * Get current urgency level (0–1).
     * Drives: typewriter speed, envelope pause, metric flicker.
     */
    getUrgency() {
        return this.urgency;
    }

    /**
     * Get typewriter speed modifier based on urgency.
     * High urgency = faster typing (feeling of rush).
     */
    getTypewriterSpeedMod() {
        // urgency 0 → 1.0x, urgency 1.0 → 0.5x (faster)
        return 1.0 - this.urgency * 0.5;
    }

    /**
     * Get the escalation clock state (for telemetry, never shown to player).
     */
    getClockState() {
        return {
            remaining: this._clockRemaining,
            triggered: this._clockTriggered,
            pct: this._clockRemaining / ESCALATION_CLOCK.initial,
        };
    }

    /**
     * Get the escalation event data (when triggered).
     */
    getEscalationEvent() {
        if (!this._clockTriggered) return null;
        return ESCALATION_CLOCK.event;
    }

    /**
     * Get open window count (for urgency hints).
     */
    getOpenWindowCount() {
        return WINDOWS.filter(w => this._windowStates[w.id] === 'open').length;
    }

    // ═══════════════════════════════════════
    // SERIALIZATION
    // ═══════════════════════════════════════

    exportState() {
        return {
            windowStates: { ...this._windowStates },
            clockRemaining: this._clockRemaining,
            clockTriggered: this._clockTriggered,
            urgency: this.urgency,
        };
    }

    importState(data) {
        if (!data) return;
        this._windowStates = data.windowStates || {};
        this._clockRemaining = data.clockRemaining ?? ESCALATION_CLOCK.initial;
        this._clockTriggered = data.clockTriggered || false;
        this.urgency = data.urgency || 0;
    }
}
