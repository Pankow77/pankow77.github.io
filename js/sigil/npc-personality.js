/**
 * npc-personality.js — SIGIL NPC Micro-Humanization Engine
 * ═══════════════════════════════════════════════════════════
 * NPCs are not dialogue trees. They are trust vectors that drift.
 *
 * Each NPC has:
 *   1. PERSONALITY AXES — stable traits that color their responses
 *   2. MOOD — short-term emotional state (3-turn memory)
 *   3. TRUST MEMORY — they remember HOW you changed their trust, not just that you did
 *   4. OPINION DRIFT — they develop opinions about your patterns over time
 *   5. BEHAVIORAL QUIRKS — emergent micro-behaviors from trust × mood × personality
 *
 * Output: per-turn NPC "reactions" — short text fragments that color
 * the feedback the player receives. Not dialogue. Texture.
 *
 * "Elena Voss non risponde per 3 ore." (trust < 30, mood = frustrated)
 * "Dara Khan condivide un thread con il tuo nome." (trust > 70, mood = excited)
 *
 * Browser-native ES Module. Zero dependencies.
 * ═══════════════════════════════════════════════════════════
 */

// ── NPC Personality definitions ──
const NPC_PROFILES = {
    elena_voss: {
        name: 'Elena Voss',
        role: 'Analista OSINT senior',
        origin: 'Tedesca',
        // Personality axes (0-100)
        rigor: 90,           // methodological strictness
        empathy: 40,         // emotional responsiveness
        patience: 70,        // tolerance for slow processes
        ambition: 30,        // desire for public recognition
        // Trust-dependent behavior thresholds
        withdrawal_threshold: 25,  // below this: stops sharing intel
        advocacy_threshold: 65,    // above this: actively supports you
        // Mood response patterns
        mood_triggers: {
            methodological_integrity_up: 'satisfied',
            scientific_credibility_down: 'frustrated',
            public_awareness_up_high: 'concerned',    // she distrusts popularity
        }
    },
    dara_khan: {
        name: 'Dara Khan',
        role: 'Giornalista investigativo',
        origin: 'Pakistano-britannico',
        rigor: 50,
        empathy: 75,
        patience: 30,
        ambition: 80,
        withdrawal_threshold: 20,
        advocacy_threshold: 60,
        mood_triggers: {
            public_awareness_up: 'excited',
            suppress_action: 'frustrated',
            ngo_capacity_down: 'concerned',
        }
    },
    james_whitfield: {
        name: 'James Whitfield',
        role: 'Ex-intelligence',
        origin: 'Americano',
        rigor: 60,
        empathy: 20,
        patience: 40,
        ambition: 70,
        withdrawal_threshold: 10,  // hard to lose
        advocacy_threshold: 50,
        mood_triggers: {
            government_comfort_down: 'alert',
            volatility_up: 'interested',
            repression_index_up: 'neutral',   // he's seen worse
        }
    },
    amara_diallo: {
        name: 'Amara Diallo',
        role: 'Coordinatrice società civile',
        origin: 'Senegalese',
        rigor: 45,
        empathy: 95,
        patience: 60,
        ambition: 20,
        withdrawal_threshold: 30,
        advocacy_threshold: 55,
        mood_triggers: {
            ngo_capacity_down: 'distressed',
            civil_society_trust_up: 'hopeful',
            repression_index_up: 'fearful',
        }
    }
};

// ── Mood types and their behavioral effects ──
const MOOD_EFFECTS = {
    neutral:    { response_delay: 0, tone: 'professionale', sharing: 1.0 },
    satisfied:  { response_delay: -1, tone: 'collaborativo', sharing: 1.3 },
    frustrated: { response_delay: 2, tone: 'freddo', sharing: 0.6 },
    concerned:  { response_delay: 1, tone: 'cauto', sharing: 0.8 },
    excited:    { response_delay: -2, tone: 'energico', sharing: 1.5 },
    alert:      { response_delay: -1, tone: 'teso', sharing: 1.1 },
    interested: { response_delay: 0, tone: 'attento', sharing: 1.2 },
    distressed: { response_delay: 3, tone: 'disperato', sharing: 0.4 },
    hopeful:    { response_delay: -1, tone: 'aperto', sharing: 1.4 },
    fearful:    { response_delay: 4, tone: 'silenzioso', sharing: 0.2 },
};

// ── Opinion templates ──
const OPINIONS = {
    fast_publisher: [
        '{name}: "Pubblichi troppo in fretta. Un giorno brucerai una fonte."',
        '{name} ha smesso di mandarti anticipazioni.',
    ],
    slow_cautious: [
        '{name}: "Mentre aspetti, il mondo va avanti."',
        '{name} condivide le tue analisi con 24 ore di ritardo.',
    ],
    escalator: [
        '{name}: "Ogni tuo report è un allarme. Il sistema non regge."',
        '{name} ha iniziato a verificare indipendentemente le tue fonti.',
    ],
    protector: [
        '{name}: "Sei una delle poche persone di cui mi fido."',
        '{name} ti manda un messaggio cifrato con dati non verificati.',
    ],
    neglected: [
        '{name} non risponde da 2 turni.',
        '{name} ha cambiato canale di comunicazione senza avvisarti.',
    ],
};


export class NPCPersonality {
    constructor() {
        // ── Per-NPC dynamic state ──
        this._npcState = {};

        // Initialize from profiles
        for (const [key, profile] of Object.entries(NPC_PROFILES)) {
            this._npcState[key] = {
                mood: 'neutral',
                moodHistory: [],           // last 3 moods
                trustMemory: [],           // { turn, delta, reason }
                opinion: null,             // current formed opinion
                opinionStrength: 0,        // 0-1, how firm the opinion is
                lastInteractionTurn: 0,
                silentTurns: 0,            // turns since meaningful interaction
            };
        }
    }

    // ═══════════════════════════════════════
    // TURN PROCESSING
    // ═══════════════════════════════════════

    /**
     * Process NPC reactions for a completed turn.
     *
     * @param {number} turn
     * @param {string} actionId — player's choice
     * @param {GameState} state
     * @param {object} consequences — { metrics, npc_changes }
     * @returns {Array<{ npc, reaction, mood, withdrawn }>}
     */
    processTurn(turn, actionId, state, consequences) {
        const reactions = [];

        for (const [key, profile] of Object.entries(NPC_PROFILES)) {
            const npcState = this._npcState[key];
            const trust = state.npcs[key]?.trust ?? 50;

            // ── Update mood based on world state changes ──
            const newMood = this._evaluateMood(key, profile, state, consequences);
            npcState.moodHistory.push(newMood);
            if (npcState.moodHistory.length > 3) npcState.moodHistory.shift();
            npcState.mood = newMood;

            // ── Record trust changes ──
            const trustChange = consequences?.npc_changes?.[key];
            if (trustChange) {
                const delta = typeof trustChange === 'string' ? parseInt(trustChange) : trustChange;
                npcState.trustMemory.push({ turn, delta, action: actionId });
                if (npcState.trustMemory.length > 10) npcState.trustMemory.shift();
                npcState.lastInteractionTurn = turn;
                npcState.silentTurns = 0;
            } else {
                npcState.silentTurns++;
            }

            // ── Form opinion based on trust memory pattern ──
            this._updateOpinion(key, npcState);

            // ── Generate reaction ──
            const withdrawn = trust < profile.withdrawal_threshold;
            const advocating = trust > profile.advocacy_threshold;

            const reaction = this._generateReaction(key, profile, npcState, trust, withdrawn, advocating, turn);

            if (reaction) {
                reactions.push({
                    npc: key,
                    name: profile.name,
                    reaction,
                    mood: npcState.mood,
                    withdrawn,
                    advocating,
                });
            }
        }

        return reactions;
    }

    // ═══════════════════════════════════════
    // MOOD EVALUATION
    // ═══════════════════════════════════════

    _evaluateMood(npcKey, profile, state, consequences) {
        const triggers = profile.mood_triggers;
        const metrics = consequences?.metrics || {};

        // Check each trigger condition
        for (const [condition, mood] of Object.entries(triggers)) {
            if (condition === 'methodological_integrity_up') {
                const change = metrics.methodological_integrity;
                if (change && parseInt(change) > 0) return mood;
            }
            if (condition === 'scientific_credibility_down') {
                const change = metrics.scientific_credibility;
                if (change && parseInt(change) < 0) return mood;
            }
            if (condition === 'public_awareness_up') {
                const change = metrics.public_awareness;
                if (change && parseInt(change) > 0) return mood;
            }
            if (condition === 'public_awareness_up_high') {
                const change = metrics.public_awareness;
                if (change && parseInt(change) > 10) return mood;
            }
            if (condition === 'suppress_action') {
                // placeholder — triggered by suppress-type actions
            }
            if (condition === 'ngo_capacity_down') {
                if ((state.latent_vars.ngo_capacity || 50) < 35) return mood;
            }
            if (condition === 'government_comfort_down') {
                const change = metrics.government_comfort;
                if (change && parseInt(change) < 0) return mood;
            }
            if (condition === 'volatility_up') {
                if ((state.latent_vars.volatility || 0) > 50) return mood;
            }
            if (condition === 'repression_index_up') {
                if ((state.latent_vars.repression_index || 0) > 35) return mood;
            }
            if (condition === 'civil_society_trust_up') {
                const change = metrics.civil_society_trust;
                if (change && parseInt(change) > 0) return mood;
            }
        }

        // Default: personality-influenced baseline
        if (profile.empathy > 70) return 'concerned';
        if (profile.rigor > 70) return 'neutral';
        return 'neutral';
    }

    // ═══════════════════════════════════════
    // OPINION FORMATION
    // ═══════════════════════════════════════

    _updateOpinion(npcKey, npcState) {
        if (npcState.trustMemory.length < 2) return;

        // Analyze trust trajectory
        const recentDeltas = npcState.trustMemory.slice(-5).map(m => m.delta);
        const avg = recentDeltas.reduce((a, b) => a + b, 0) / recentDeltas.length;
        const allNegative = recentDeltas.every(d => d <= 0);
        const allPositive = recentDeltas.every(d => d >= 0);

        if (allNegative && recentDeltas.length >= 2) {
            npcState.opinion = 'neglected';
            npcState.opinionStrength = Math.min(1, recentDeltas.length * 0.25);
        } else if (allPositive && recentDeltas.length >= 2) {
            npcState.opinion = 'protector';
            npcState.opinionStrength = Math.min(1, recentDeltas.length * 0.25);
        } else if (avg < -3) {
            npcState.opinion = 'escalator';
            npcState.opinionStrength = 0.5;
        }

        // Silent turns build neglect opinion
        if (npcState.silentTurns >= 3 && !npcState.opinion) {
            npcState.opinion = 'neglected';
            npcState.opinionStrength = Math.min(1, npcState.silentTurns * 0.2);
        }
    }

    // ═══════════════════════════════════════
    // REACTION GENERATION
    // ═══════════════════════════════════════

    _generateReaction(npcKey, profile, npcState, trust, withdrawn, advocating, turn) {
        const mood = MOOD_EFFECTS[npcState.mood] || MOOD_EFFECTS.neutral;

        // Withdrawn NPCs generate sparse, cold reactions
        if (withdrawn) {
            if (npcState.silentTurns % 2 === 0) {
                return `${profile.name} — [CANALE SILENTE]`;
            }
            return null; // true silence
        }

        // Opinion-based reactions (strong opinions override mood)
        if (npcState.opinion && npcState.opinionStrength > 0.5) {
            const templates = OPINIONS[npcState.opinion];
            if (templates) {
                const idx = turn % templates.length;
                return templates[idx].replace('{name}', profile.name);
            }
        }

        // Mood-based reactions
        if (npcState.mood === 'frustrated' && profile.rigor > 70) {
            return `${profile.name} legge il tuo report in silenzio. Non commenta.`;
        }
        if (npcState.mood === 'excited' && profile.ambition > 60) {
            return `${profile.name} rilancia la tua analisi sui suoi canali.`;
        }
        if (npcState.mood === 'distressed') {
            return `${profile.name}: "Non è un numero. Sono persone."`;
        }
        if (npcState.mood === 'fearful') {
            return `${profile.name} non risponde. Il suo ultimo accesso è di 48 ore fa.`;
        }

        // Advocating NPCs occasionally provide bonus intel
        if (advocating && turn % 3 === 0) {
            return `${profile.name} ti invia un documento riservato con una nota: "Fiducia."`;
        }

        // Default: no reaction (most turns are silent for most NPCs)
        return null;
    }

    // ═══════════════════════════════════════
    // QUERIES
    // ═══════════════════════════════════════

    /**
     * Get NPC mood summary for UI/end screen.
     */
    getNPCSummary() {
        const summary = {};
        for (const [key, profile] of Object.entries(NPC_PROFILES)) {
            const s = this._npcState[key];
            summary[key] = {
                name: profile.name,
                mood: s.mood,
                opinion: s.opinion,
                opinionStrength: s.opinionStrength,
                silentTurns: s.silentTurns,
                trustEvents: s.trustMemory.length,
            };
        }
        return summary;
    }

    /**
     * Get the NPC with the strongest negative opinion.
     * For moral archive integration.
     */
    getMostAntagonistic() {
        let worst = null;
        let worstStrength = 0;

        for (const [key, state] of Object.entries(this._npcState)) {
            if (state.opinion === 'neglected' || state.opinion === 'escalator') {
                if (state.opinionStrength > worstStrength) {
                    worstStrength = state.opinionStrength;
                    worst = {
                        key,
                        name: NPC_PROFILES[key].name,
                        opinion: state.opinion,
                        strength: state.opinionStrength,
                    };
                }
            }
        }

        return worst;
    }

    // ═══════════════════════════════════════
    // SERIALIZATION
    // ═══════════════════════════════════════

    exportState() {
        return JSON.parse(JSON.stringify(this._npcState));
    }

    importState(data) {
        if (!data) return;
        for (const [key, state] of Object.entries(data)) {
            if (this._npcState[key]) {
                Object.assign(this._npcState[key], state);
            }
        }
    }
}
