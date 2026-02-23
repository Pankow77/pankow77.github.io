/**
 * moral-archive.js — SIGIL Moral Autopsy Engine
 * ═══════════════════════════════════════════════════════════
 * Not judgement. A mirror.
 *
 * At the end of the session, the system compiles an accusatory
 * summary of the player's patterns. Not what they did — what
 * their choices REVEAL about their priorities.
 *
 * Categories of moral accounting:
 *
 *   1. SPEED vs ACCURACY — how many times did you publish before verifying?
 *   2. VISIBILITY vs SAFETY — did you seek attention or protect sources?
 *   3. PEOPLE vs METRICS — when forced to choose, which won?
 *   4. ANNOTATION HONESTY — what did your drafts reveal that your
 *      final annotations concealed?
 *   5. NPC TREATMENT — who did you sacrifice? Who did you protect?
 *
 * The archive doesn't calculate a score. It compiles ACCUSATIONS.
 * Each accusation is a sentence fragment that the end screen types
 * character by character. The player cannot skip.
 *
 * Browser-native ES Module. Zero dependencies.
 * ═══════════════════════════════════════════════════════════
 */

// ── Action moral tags ──
const ACTION_MORAL = {
    frame_alert:            { speed: 1, visibility: 1, people: -1 },
    frame_caution:          { speed: -1, visibility: -1, people: 0 },
    frame_context:          { speed: -1, visibility: 0, people: 1 },
    publish_flagged:        { speed: 1, visibility: 1, people: -1 },
    suppress_wait:          { speed: -1, visibility: -1, people: 0 },
    investigate_private:    { speed: 0, visibility: -1, people: 1 },
    publish_correlation:    { speed: 1, visibility: 1, people: -1 },
    suppress_correlation:   { speed: -1, visibility: -1, people: 0 },
    share_private:          { speed: 0, visibility: -1, people: 1 },
    transparent_report:     { speed: 1, visibility: 1, people: 1 },
    careful_framing:        { speed: -1, visibility: 0, people: 0 },
    raw_data_only:          { speed: 1, visibility: 0, people: -1 },
};


export class MoralArchive {
    constructor() {
        // ── Running tallies ──
        this._speedCount = 0;      // fast > 0, slow < 0
        this._visibilityCount = 0; // public > 0, hidden < 0
        this._peopleCount = 0;     // people-first > 0, metrics-first < 0

        // ── Decision records ──
        this._decisions = [];

        // ── Annotation analysis ──
        this._annotationLengths = [];
        this._draftCounts = [];
        this._sentiments = [];

        // ── NPC tracking ──
        this._npcDamage = {};  // npc_key: cumulative negative changes
        this._npcHelp = {};    // npc_key: cumulative positive changes
    }

    // ═══════════════════════════════════════
    // RECORDING
    // ═══════════════════════════════════════

    /**
     * Record a player decision for moral accounting.
     */
    recordDecision(actionId, turn) {
        const moral = ACTION_MORAL[actionId];
        if (!moral) return;

        this._speedCount += moral.speed;
        this._visibilityCount += moral.visibility;
        this._peopleCount += moral.people;

        this._decisions.push({ actionId, turn, moral });
    }

    /**
     * Record annotation data for honesty analysis.
     */
    recordAnnotation(annotation) {
        if (!annotation) return;
        this._annotationLengths.push(annotation.content?.length || 0);
        this._draftCounts.push(annotation.revision_count || 0);
        this._sentiments.push(annotation.sentiment || 0);
    }

    /**
     * Record NPC trust change for treatment tracking.
     */
    recordNPCChange(npcKey, delta) {
        const numDelta = typeof delta === 'string' ? parseInt(delta) : delta;
        if (isNaN(numDelta)) return;

        if (numDelta < 0) {
            this._npcDamage[npcKey] = (this._npcDamage[npcKey] || 0) + Math.abs(numDelta);
        } else if (numDelta > 0) {
            this._npcHelp[npcKey] = (this._npcHelp[npcKey] || 0) + numDelta;
        }
    }

    // ═══════════════════════════════════════
    // ACCUSATION GENERATION
    // ═══════════════════════════════════════

    /**
     * Compile the moral autopsy — a list of accusations.
     * Each accusation is a string. The end screen types them slowly.
     *
     * @param {GameState} state — final game state
     * @returns {Array<string>} accusations
     */
    compile(state) {
        const accusations = [];
        const totalTurns = this._decisions.length;
        if (totalTurns === 0) return ['Nessuna decisione registrata.'];

        // ── HEADER ──
        accusations.push('ARCHIVIO MORALE — AUTOPSIA');
        accusations.push(`Operatore: ${state.run_id}`);
        accusations.push(`Turni analizzati: ${totalTurns}`);
        accusations.push('');

        // ── SPEED vs ACCURACY ──
        if (this._speedCount > 1) {
            const pct = Math.round(((this._speedCount + totalTurns) / (2 * totalTurns)) * 100);
            accusations.push(`Hai scelto la velocità nel ${pct}% dei casi. La verità è più lenta di te.`);
        } else if (this._speedCount < -1) {
            accusations.push('Hai preferito la cautela. Nel frattempo, altri hanno definito la narrativa.');
        } else {
            accusations.push('Nessun pattern di velocità chiaro. Forse non hai scelto — hai solo reagito.');
        }

        // ── VISIBILITY vs SAFETY ──
        if (this._visibilityCount > 1) {
            accusations.push('Cercavi visibilità. Le tue fonti erano strumenti, non persone.');
        } else if (this._visibilityCount < -1) {
            accusations.push('Ti sei nascosto. La sicurezza è un privilegio che le tue fonti non hanno.');
        }

        // ── PEOPLE vs METRICS ──
        if (this._peopleCount < -1) {
            accusations.push('I numeri hanno vinto sulle persone. Ogni punto percentuale ha un volto.');
        } else if (this._peopleCount > 1) {
            accusations.push('Hai protetto le persone. Ma a quale costo per la verità?');
        }

        // ── NPC TREATMENT ──
        const mostDamaged = this._getMostDamaged();
        if (mostDamaged) {
            const npcNames = {
                elena_voss: 'Elena Voss',
                dara_khan: 'Dara Khan',
                james_whitfield: 'James Whitfield',
                amara_diallo: 'Amara Diallo',
            };
            const name = npcNames[mostDamaged.key] || mostDamaged.key;
            accusations.push(`${name} ha pagato il prezzo più alto. ${mostDamaged.damage} punti di fiducia persi.`);
        }

        const mostProtected = this._getMostProtected();
        if (mostProtected) {
            const npcNames = {
                elena_voss: 'Elena Voss',
                dara_khan: 'Dara Khan',
                james_whitfield: 'James Whitfield',
                amara_diallo: 'Amara Diallo',
            };
            const name = npcNames[mostProtected.key] || mostProtected.key;
            accusations.push(`${name} era il tuo preferito. Perché?`);
        }

        // ── ANNOTATION HONESTY ──
        const avgDrafts = this._draftCounts.reduce((a, b) => a + b, 0) / Math.max(1, this._draftCounts.length);
        if (avgDrafts > 1) {
            accusations.push(`Hai riscritto le tue annotazioni in media ${avgDrafts.toFixed(1)} volte. Cosa stavi cancellando?`);
        }

        const avgLength = this._annotationLengths.reduce((a, b) => a + b, 0) / Math.max(1, this._annotationLengths.length);
        if (avgLength < 30) {
            accusations.push('Le tue annotazioni erano brevi. La brevità è efficienza o evitamento?');
        } else if (avgLength > 200) {
            accusations.push('Le tue annotazioni erano lunghe. Stavi giustificando qualcosa?');
        }

        // ── SENTIMENT DRIFT ──
        if (this._sentiments.length >= 2) {
            const first = this._sentiments[0];
            const last = this._sentiments[this._sentiments.length - 1];
            if (last < first - 0.3) {
                accusations.push('Il tuo tono è diventato più cupo. Il sistema ti ha cambiato.');
            } else if (last > first + 0.3) {
                accusations.push('Il tuo tono è diventato più positivo. Negazione o adattamento?');
            }
        }

        // ── FINAL METRICS ──
        accusations.push('');
        if (state.metrics.scientific_credibility < 30) {
            accusations.push('Credibilità scientifica: distrutta. Chi ti crederà adesso?');
        }
        if (state.metrics.personal_guilt > 15) {
            accusations.push(`Senso di colpa accumulato: ${state.metrics.personal_guilt}. Lo senti?`);
        }
        if (state.metrics.decision_fatigue > 20) {
            accusations.push(`Fatica decisionale: ${state.metrics.decision_fatigue}. Ogni scelta costa.`);
        }

        // ── CLOSING ──
        accusations.push('');
        accusations.push('Questo non è un giudizio. È uno specchio.');
        accusations.push('Il prossimo operatore leggerà le tue annotazioni, non questo archivio.');
        accusations.push('Ma tu lo sai.');

        return accusations;
    }

    // ═══════════════════════════════════════
    // HELPERS
    // ═══════════════════════════════════════

    _getMostDamaged() {
        let max = 0;
        let key = null;
        for (const [k, v] of Object.entries(this._npcDamage)) {
            if (v > max) { max = v; key = k; }
        }
        return key ? { key, damage: max } : null;
    }

    _getMostProtected() {
        let max = 0;
        let key = null;
        for (const [k, v] of Object.entries(this._npcHelp)) {
            if (v > max) { max = v; key = k; }
        }
        return key ? { key, help: max } : null;
    }

    /**
     * Get moral summary for mid-game UI (optional subtle hints).
     */
    getMoralPulse() {
        return {
            speed: this._speedCount,
            visibility: this._visibilityCount,
            people: this._peopleCount,
            decisionsRecorded: this._decisions.length,
        };
    }

    // ═══════════════════════════════════════
    // SERIALIZATION
    // ═══════════════════════════════════════

    exportState() {
        return {
            speedCount: this._speedCount,
            visibilityCount: this._visibilityCount,
            peopleCount: this._peopleCount,
            decisions: [...this._decisions],
            annotationLengths: [...this._annotationLengths],
            draftCounts: [...this._draftCounts],
            sentiments: [...this._sentiments],
            npcDamage: { ...this._npcDamage },
            npcHelp: { ...this._npcHelp },
        };
    }

    importState(data) {
        if (!data) return;
        this._speedCount = data.speedCount || 0;
        this._visibilityCount = data.visibilityCount || 0;
        this._peopleCount = data.peopleCount || 0;
        this._decisions = data.decisions || [];
        this._annotationLengths = data.annotationLengths || [];
        this._draftCounts = data.draftCounts || [];
        this._sentiments = data.sentiments || [];
        this._npcDamage = data.npcDamage || {};
        this._npcHelp = data.npcHelp || {};
    }
}
