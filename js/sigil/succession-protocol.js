/**
 * succession-protocol.js — PROTOCOLLO_PADC
 * ═══════════════════════════════════════════════════════════
 * The succession mechanism. The emotional core of SIGIL.
 *
 * Player writes annotations thinking they're private.
 * At a probabilistic trigger point, the system reveals:
 * everything will be transmitted to the next operator.
 * Immutable. Can't be edited. Can't be deleted.
 *
 * Uses archivio-silente SHA-256 for annotation sealing.
 * Uses Identity for cross-session persistence of the chain.
 *
 * Browser-native ES Module. Zero dependencies.
 * ═══════════════════════════════════════════════════════════
 */

import { Identity } from '../identity.js';

const SUCCESSION_KEY = 'sigil-succession-chain';

// Trigger window for full game: T8–T22
// MVP trigger window: after T3 (mini-protocol)
const TRIGGER_WINDOW = { min: 8, max: 22 };

export class SuccessionProtocol {
    constructor(bus, state, ui) {
        this.bus = bus;
        this.state = state;
        this.ui = ui;
        this.activated = false;
        this.triggerTurn = null;
    }

    /**
     * Check if PROTOCOLLO should activate this turn.
     * Probabilistic: probability increases linearly within window.
     * MVP: can force-trigger with forceActivate().
     */
    shouldActivate(turn) {
        if (this.activated) return false;
        if (this.state.flags.protocollo_activated) return false;

        if (turn < TRIGGER_WINDOW.min || turn > TRIGGER_WINDOW.max) return false;

        // Linear probability: 10% at min, 90% at max
        const range = TRIGGER_WINDOW.max - TRIGGER_WINDOW.min;
        const progress = (turn - TRIGGER_WINDOW.min) / range;
        const probability = 0.10 + (0.80 * progress);

        return Math.random() < probability;
    }

    /**
     * Force activation (for MVP mini-protocol).
     */
    forceActivate() {
        this.activated = true;
        this.state.flags.protocollo_activated = true;
        this.state.flags.post_revelation_mode = true;
        this.triggerTurn = this.state.turn_current;
    }

    /**
     * Run the full PROTOCOLLO_PADC revelation sequence.
     * Returns player choice: 'CONTINUE' or 'PASS'.
     */
    async execute() {
        this.forceActivate();

        this.bus.emit('sigil:protocol-activated', {
            turn: this.state.turn_current,
            annotation_count: this.state.annotations.length,
            ghost_id: this.state.run_id
        }, 'succession-protocol');

        // Phase 1: System takeover — reveal the truth
        await this.ui.protocolTakeover([
            {
                text: 'PROTOCOLLO_PADC',
                delay_before: 1000,
                delay_after: 2000,
                speed: 60
            },
            {
                text: 'Protocollo di Annotazione e Documentazione Cognitiva',
                delay_before: 500,
                delay_after: 3000,
                speed: 35
            },
            {
                text: 'Le tue annotazioni non sono private.',
                delay_before: 1000,
                delay_after: 4000,
                speed: 40
            },
            {
                text: 'Ogni parola che hai scritto sarà trasmessa al prossimo operatore.',
                delay_before: 500,
                delay_after: 4000,
                speed: 35
            },
            {
                text: 'Non puoi modificarle. Non puoi cancellarle.',
                delay_before: 500,
                delay_after: 3000,
                speed: 40
            },
            {
                text: 'Sono già sigillate.',
                delay_before: 500,
                delay_after: 4000,
                speed: 50
            }
        ]);

        // Phase 2: Show all annotations the player has written
        if (this.state.annotations.length > 0) {
            await this.ui.protocolShowAnnotations(this.state.annotations);
        }

        // Phase 3: Player choice — continue or pass
        const choice = await this.ui.protocolChoice();

        this.bus.emit('sigil:protocol-choice', {
            choice,
            turn: this.state.turn_current,
            ghost_id: this.state.run_id
        }, 'succession-protocol');

        this.ui.protocolClose();

        return choice;
    }

    /**
     * Seal all annotations into a succession package.
     * Hash-chained for integrity. Stored via Identity.
     */
    async sealAnnotations() {
        const annotations = this.state.annotations.map(a => ({
            turn: a.turn,
            content: a.content,
            sentiment: a.sentiment,
            timestamp: a.timestamp,
            post_revelation: a.post_revelation || false
        }));

        const package_ = {
            ghost_id: this.state.run_id,
            sealed_at: Date.now(),
            trigger_turn: this.triggerTurn,
            total_turns: this.state.turn_current,
            annotations,
            final_metrics: { ...this.state.metrics },
            hash: await this._computeHash(annotations)
        };

        // Persist to succession chain
        await this._appendToChain(package_);

        this.bus.emit('sigil:annotations-sealed', {
            ghost_id: this.state.run_id,
            count: annotations.length,
            hash: package_.hash
        }, 'succession-protocol');

        return package_;
    }

    /**
     * Load inherited annotations from previous GHOSTs.
     * Returns array of annotation objects or empty array.
     */
    async loadInherited() {
        try {
            await Identity.init();
            const chain = await Identity.loadState(SUCCESSION_KEY);
            if (!chain || !Array.isArray(chain) || chain.length === 0) {
                return [];
            }

            // Get the most recent sealed package
            const latest = chain[chain.length - 1];

            // Verify hash integrity
            const computedHash = await this._computeHash(latest.annotations);
            if (computedHash !== latest.hash) {
                console.warn('[SUCCESSION] Hash mismatch — inheritance chain compromised');
                return [];
            }

            // Map to display format
            return latest.annotations.map(a => ({
                ghost_id: latest.ghost_id,
                turn: a.turn,
                content: a.content,
                sentiment: a.sentiment,
                timestamp: a.timestamp
            }));
        } catch (e) {
            console.warn('[SUCCESSION] Load failed:', e.message);
            return [];
        }
    }

    /**
     * Get a single inherited annotation for a specific turn.
     * Annotations appear AFTER the player decides (not before).
     * Returns annotation object or null.
     */
    async getInheritedForTurn(turn) {
        if (this.state.inherited_annotations.length === 0) return null;

        // Find annotation from previous GHOST for this turn number
        const match = this.state.inherited_annotations.find(a => a.turn === turn);
        return match || null;
    }

    /**
     * Initialize — load inherited annotations into state.
     */
    async init() {
        const inherited = await this.loadInherited();
        this.state.inherited_annotations = inherited;

        if (inherited.length > 0) {
            console.log(
                `[SUCCESSION] Loaded ${inherited.length} inherited annotations from ${inherited[0].ghost_id}`
            );
        }
    }

    // ═══════════════════════════════════════
    // INTERNAL
    // ═══════════════════════════════════════

    async _computeHash(annotations) {
        const data = JSON.stringify(annotations);
        const encoder = new TextEncoder();
        const buffer = encoder.encode(data);
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        return Array.from(new Uint8Array(hashBuffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    async _appendToChain(package_) {
        try {
            await Identity.init();
            let chain = await Identity.loadState(SUCCESSION_KEY);
            if (!Array.isArray(chain)) chain = [];
            chain.push(package_);
            await Identity.saveState(SUCCESSION_KEY, chain, 'succession-protocol');
        } catch (e) {
            console.warn('[SUCCESSION] Persist failed, using localStorage:', e.message);
            let chain = [];
            try {
                const raw = localStorage.getItem(SUCCESSION_KEY);
                if (raw) chain = JSON.parse(raw);
            } catch (_) { /* ignore */ }
            chain.push(package_);
            localStorage.setItem(SUCCESSION_KEY, JSON.stringify(chain));
        }
    }
}
