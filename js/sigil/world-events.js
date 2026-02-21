/**
 * world-events.js — SIGIL Autonomous World Events
 * ═══════════════════════════════════════════════════════════
 * The world doesn't wait for you.
 *
 * Events happen independently of player action.
 * Some are triggered by latent variable thresholds.
 * Some are purely temporal — they arrive at a fixed turn.
 * Some are random within constraints.
 *
 * The player receives these as INTERRUPTS — envelopes that
 * appear between turns, modifying the world state before
 * the next decision point.
 *
 * Design principle: the player is not the protagonist.
 * The world is. You're an analyst inside a machine that
 * runs whether you participate or not.
 *
 * Browser-native ES Module. Zero dependencies.
 * ═══════════════════════════════════════════════════════════
 */

// ── Event catalog ──
// Each event has:
//   trigger: { type: 'turn'|'threshold'|'random', ... }
//   once: boolean — fire only once
//   envelope: { source, domain, summary } — what the player sees
//   effects: { metrics, latent_vars, flags, npc_changes }
const WORLD_EVENTS = [

    // ── TEMPORAL: These happen at fixed turns ──
    {
        id: 'vienna_talks_collapse',
        trigger: { type: 'turn', turn: 2 },
        once: true,
        envelope: {
            source: 'Feed diplomatico — Vienna',
            domain: 'geopolitics',
            summary: 'I negoziati JCPOA si sono interrotti. La delegazione iraniana ha lasciato il tavolo. Nessun comunicato ufficiale. Il silenzio è più eloquente delle parole.',
        },
        effects: {
            latent_vars: { volatility: +8, brent: +6 },
            metrics: { government_comfort: '-3' },
        }
    },
    {
        id: 'sahel_drought_report',
        trigger: { type: 'turn', turn: 3 },
        once: true,
        envelope: {
            source: 'OCHA — Rapporto Siccità',
            domain: 'humanitarian',
            summary: 'La fascia saheliana registra il terzo anno consecutivo di deficit pluviometrico. 12 milioni di persone a rischio alimentare. La crisi è strutturale, non emergenziale.',
        },
        effects: {
            latent_vars: { ngo_capacity: -5 },
            metrics: { civil_society_trust: '-2' },
        }
    },

    // ── THRESHOLD: Triggered by world state ──
    {
        id: 'oil_spike_crisis',
        trigger: { type: 'threshold', var: 'brent', above: 70 },
        once: true,
        envelope: {
            source: 'Bloomberg Terminal',
            domain: 'economics',
            summary: 'Il Brent ha superato $120/barile. Le compagnie aeree europee chiedono interventi governativi. La catena di approvvigionamento globale scricchiola.',
        },
        effects: {
            latent_vars: { volatility: +5 },
            metrics: { government_comfort: '-5', public_trust: '-3' },
        }
    },
    {
        id: 'polarization_media_war',
        trigger: { type: 'threshold', var: 'polarization', above: 55 },
        once: true,
        envelope: {
            source: 'Monitoraggio media — OSINT',
            domain: 'information',
            summary: 'Guerre informative in atto su 4 piattaforme principali. Due narrazioni opposte sulla crisi: "provocazione occidentale" vs "espansione autoritaria". Spazio per l\'analisi: zero.',
        },
        effects: {
            latent_vars: { polarization: +5, repression_index: +3 },
            metrics: { frame_control: '-5', scientific_credibility: '-3' },
        }
    },
    {
        id: 'ngo_crackdown',
        trigger: { type: 'threshold', var: 'repression_index', above: 45 },
        once: true,
        envelope: {
            source: 'Amnesty International — Alert',
            domain: 'rights',
            summary: 'Tre ONG internazionali espulse dalla regione del Sahel. Operativi locali arrestati. La finestra informativa si chiude.',
        },
        effects: {
            latent_vars: { ngo_capacity: -10, repression_index: +5 },
            npc_changes: { amara_diallo: '-10' },
        }
    },
    {
        id: 'whistleblower_contact',
        trigger: { type: 'threshold', var: 'volatility', above: 60 },
        once: true,
        envelope: {
            source: 'Canale cifrato — Anonimo',
            domain: 'intelligence',
            summary: 'Un contatto non verificato offre documenti sulla catena di comando delle operazioni nello Stretto. Prezzo: pubblicazione immediata senza verifica. Timeout: 24 ore.',
        },
        effects: {
            flags: { whistleblower_offer: true },
            metrics: { decision_fatigue: '+3' },
        }
    },

    // ── RANDOM: Probabilistic, constrained ──
    {
        id: 'cyber_incident',
        trigger: { type: 'random', probability: 0.2, min_turn: 2 },
        once: true,
        envelope: {
            source: 'CERT-EU — Incidente',
            domain: 'cyber',
            summary: 'Attacco DDoS su infrastrutture di monitoraggio marittimo. Dati AIS non disponibili per 6 ore. Origine attribuita a gruppo APT con legami statali.',
        },
        effects: {
            latent_vars: { volatility: +4 },
            metrics: { frame_control: '-3' },
        }
    },
    {
        id: 'market_flash_crash',
        trigger: { type: 'random', probability: 0.15, min_turn: 3 },
        once: true,
        envelope: {
            source: 'Trading Floor — Alert',
            domain: 'economics',
            summary: 'Flash crash algoritmico sui futures del greggio. Perdita del 4% in 90 secondi, recupero parziale. Cause: propagazione di panico da trading ad alta frequenza.',
        },
        effects: {
            latent_vars: { brent: -8, volatility: +10 },
            metrics: { public_trust: '-2' },
        }
    },
    {
        id: 'satellite_revelation',
        trigger: { type: 'random', probability: 0.25, min_turn: 2 },
        once: true,
        envelope: {
            source: 'Planet Labs — Immagini',
            domain: 'signal',
            summary: 'Nuove immagini satellitari commerciali mostrano costruzioni non documentate in una zona costiera riservata. Risoluzione insufficiente per identificazione certa.',
        },
        effects: {
            latent_vars: { volatility: +3 },
            metrics: { public_awareness: '+5' },
        }
    },
];


export class WorldEvents {
    constructor(seed) {
        // Seeded pseudo-random for deterministic "random" events
        this._seed = seed || 42;
        this._rng = this._mulberry32(this._seed);

        // Track which events have fired
        this._fired = new Set();

        // Queue of events to deliver this turn
        this._pendingDelivery = [];
    }

    // ═══════════════════════════════════════
    // TURN PROCESSING
    // ═══════════════════════════════════════

    /**
     * Evaluate all world events for the current turn.
     * Returns events that should fire.
     *
     * @param {number} turn — current turn number
     * @param {GameState} state
     * @returns {Array<{ id, envelope, effects }>}
     */
    evaluate(turn, state) {
        const triggered = [];

        for (const event of WORLD_EVENTS) {
            // Already fired one-time events
            if (event.once && this._fired.has(event.id)) continue;

            let shouldFire = false;

            switch (event.trigger.type) {
                case 'turn':
                    shouldFire = (turn === event.trigger.turn);
                    break;

                case 'threshold': {
                    const val = state.latent_vars[event.trigger.var] ?? 0;
                    if (event.trigger.above !== undefined) {
                        shouldFire = val > event.trigger.above;
                    }
                    if (event.trigger.below !== undefined) {
                        shouldFire = val < event.trigger.below;
                    }
                    break;
                }

                case 'random': {
                    if (turn < (event.trigger.min_turn || 1)) break;
                    const roll = this._rng();
                    shouldFire = roll < event.trigger.probability;
                    break;
                }
            }

            if (shouldFire) {
                this._fired.add(event.id);
                triggered.push({
                    id: event.id,
                    envelope: { ...event.envelope, confidence: 0.5 + this._rng() * 0.3 },
                    effects: event.effects
                });
            }
        }

        return triggered;
    }

    /**
     * Apply world event effects to state.
     *
     * @param {GameState} state
     * @param {object} effects
     */
    applyEffects(state, effects) {
        if (!effects) return;

        if (effects.latent_vars) {
            for (const [key, delta] of Object.entries(effects.latent_vars)) {
                state.latent_vars[key] = Math.max(0, Math.min(100,
                    (state.latent_vars[key] || 0) + delta
                ));
            }
        }

        if (effects.metrics) {
            for (const [key, change] of Object.entries(effects.metrics)) {
                state.applyMetric(key, change);
            }
        }

        if (effects.flags) {
            Object.assign(state.flags, effects.flags);
        }

        if (effects.npc_changes) {
            for (const [npc, change] of Object.entries(effects.npc_changes)) {
                state.applyNPC(npc, change);
            }
        }
    }

    // ═══════════════════════════════════════
    // QUERIES
    // ═══════════════════════════════════════

    /**
     * Get IDs of all events that have fired.
     */
    getFiredEvents() {
        return [...this._fired];
    }

    /**
     * Get count of remaining unfired events.
     */
    getRemainingCount() {
        return WORLD_EVENTS.filter(e => !this._fired.has(e.id)).length;
    }

    // ═══════════════════════════════════════
    // SERIALIZATION
    // ═══════════════════════════════════════

    exportState() {
        return {
            seed: this._seed,
            fired: [...this._fired],
        };
    }

    importState(data) {
        if (!data) return;
        this._seed = data.seed || 42;
        this._rng = this._mulberry32(this._seed);
        this._fired = new Set(data.fired || []);
        // Advance RNG to correct position
        const advances = this._fired.size * 3;
        for (let i = 0; i < advances; i++) this._rng();
    }

    // ═══════════════════════════════════════
    // PRNG
    // ═══════════════════════════════════════

    _mulberry32(seed) {
        return function () {
            seed |= 0;
            seed = seed + 0x6D2B79F5 | 0;
            let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }
}
