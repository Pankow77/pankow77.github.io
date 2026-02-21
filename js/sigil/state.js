/**
 * state.js — SIGIL Game State
 * ═══════════════════════════════════════════════════════════
 * Persistent game state. Uses Identity layer for IndexedDB.
 * All metrics hidden from player. Only the system sees numbers.
 *
 * Browser-native ES Module. Zero dependencies beyond Identity.
 * ═══════════════════════════════════════════════════════════
 */

import { Identity } from '../identity.js';

const STATE_KEY = 'sigil-game-state';

export class GameState {
    constructor() {
        this.run_id = 'GHOST_' + Math.floor(Math.random() * 900 + 100);
        this.turn_current = 0;
        this.act_current = 1;
        this.started_at = Date.now();

        this.metrics = {
            scientific_credibility: 50,
            methodological_integrity: 50,
            public_trust: 50,
            civil_society_trust: 50,
            government_comfort: 50,
            personal_guilt: 0,
            decision_fatigue: 0,
            public_awareness: 10,
            frame_control: 50,
            annotation_sentiment_avg: 0,
            performativity_index: 0
        };

        this.npcs = {
            elena_voss: { trust: 50, status: 'active' },       // German — senior OSINT analyst, methodological rigor
            dara_khan: { trust: 50, status: 'active' },         // Pakistani-British — investigative journalist, field contacts
            james_whitfield: { trust: 0, status: 'unknown', active: false },  // American — ex-intelligence, unclear loyalties
            amara_diallo: { trust: 30, status: 'background' }   // Senegalese — civil society coordinator, ground truth
        };

        this.flags = {
            protocollo_activated: false,
            post_revelation_mode: false,
            frame_oracle_stance: null,
            protocol_violation: false
        };

        this.decisions = [];
        this.annotations = [];
        this.inherited_annotations = [];
    }

    applyMetric(key, change) {
        const current = this.metrics[key] || 0;
        if (typeof change === 'string') {
            if (change.startsWith('+')) {
                this.metrics[key] = current + parseInt(change.slice(1));
            } else if (change.startsWith('-')) {
                this.metrics[key] = current - parseInt(change.slice(1));
            }
        } else if (typeof change === 'number') {
            this.metrics[key] = change;
        }
        // Clamp 0-100 except unbounded metrics
        const unbounded = [
            'decision_fatigue', 'personal_guilt',
            'annotation_sentiment_avg', 'performativity_index'
        ];
        if (!unbounded.includes(key)) {
            this.metrics[key] = Math.max(0, Math.min(100, this.metrics[key]));
        }
    }

    applyNPC(key, change) {
        if (!this.npcs[key]) return;
        if (typeof change === 'string') {
            if (change.startsWith('+') || change.startsWith('-')) {
                this.npcs[key].trust += parseInt(change);
            }
        } else if (typeof change === 'object') {
            Object.assign(this.npcs[key], change);
        }
    }

    async save() {
        try {
            await Identity.init();
            await Identity.saveState(STATE_KEY, this._serialize(), 'sigil');
        } catch (e) {
            console.warn('[STATE] Save failed, using localStorage fallback:', e.message);
            localStorage.setItem(STATE_KEY, this._serialize());
        }
    }

    async load() {
        try {
            await Identity.init();
            const saved = await Identity.loadState(STATE_KEY);
            if (saved) {
                this._deserialize(saved);
                return true;
            }
        } catch (e) {
            console.warn('[STATE] IndexedDB load failed, trying localStorage:', e.message);
            const fallback = localStorage.getItem(STATE_KEY);
            if (fallback) {
                this._deserialize(fallback);
                return true;
            }
        }
        return false;
    }

    async reset() {
        const fresh = new GameState();
        Object.assign(this, fresh);
        await this.save();
    }

    exportRun() {
        return {
            run_id: this.run_id,
            started_at: this.started_at,
            ended_at: Date.now(),
            total_turns: this.turn_current,
            decisions: this.decisions,
            annotations: this.annotations.map(a => ({
                turn: a.turn,
                content: a.content,
                sentiment: a.sentiment,
                timestamp: a.timestamp
            })),
            final_metrics: { ...this.metrics },
            npc_states: JSON.parse(JSON.stringify(this.npcs))
        };
    }

    _serialize() {
        return JSON.stringify({
            run_id: this.run_id,
            turn_current: this.turn_current,
            act_current: this.act_current,
            started_at: this.started_at,
            metrics: this.metrics,
            npcs: this.npcs,
            flags: this.flags,
            decisions: this.decisions,
            annotations: this.annotations,
            inherited_annotations: this.inherited_annotations
        });
    }

    _deserialize(json) {
        const data = typeof json === 'string' ? JSON.parse(json) : json;
        this.run_id = data.run_id;
        this.turn_current = data.turn_current;
        this.act_current = data.act_current;
        this.started_at = data.started_at;
        this.metrics = data.metrics;
        this.npcs = data.npcs;
        this.flags = data.flags;
        this.decisions = data.decisions;
        this.annotations = data.annotations;
        this.inherited_annotations = data.inherited_annotations || [];
    }
}
