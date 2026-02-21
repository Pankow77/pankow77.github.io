/**
 * telemetry.js — SIGIL Internal Telemetry
 * ═══════════════════════════════════════════════════════════
 * Per-turn snapshots of all state + causal arc traces.
 * The "why" behind every metric movement.
 *
 * Not visible to the player. Visible to the developer.
 * Accessible via window.__SIGIL.telemetry in dev console.
 *
 * Browser-native ES Module. Zero dependencies.
 * ═══════════════════════════════════════════════════════════
 */

export class Telemetry {
    constructor() {
        this.snapshots = [];
    }

    /**
     * Take a snapshot of the current state after a turn.
     */
    snapshot(turn, state, arcs, actionId, frameAction, scars) {
        this.snapshots.push({
            turn,
            action: actionId,
            frame_action: frameAction || null,
            metrics: { ...state.metrics },
            latent_vars: { ...state.latent_vars },
            npcs: JSON.parse(JSON.stringify(state.npcs)),
            arcs_activated: arcs || [],
            scars: scars ? JSON.parse(JSON.stringify(scars)) : {},
            collapse_active: (state.metrics.scientific_credibility || 50) < 25,
            timestamp: Date.now()
        });
    }

    /**
     * Get the full history of a single metric or latent var.
     * Returns [{ turn, value }].
     */
    getHistory(key) {
        return this.snapshots.map(s => ({
            turn: s.turn,
            value: s.metrics[key] ?? s.latent_vars[key] ?? null
        })).filter(p => p.value !== null);
    }

    /**
     * Get a "why" trace for a specific turn.
     * Shows which causal arcs fired and what they changed.
     */
    getWhyTrace(turn) {
        const snap = this.snapshots.find(s => s.turn === turn);
        if (!snap) return null;

        const deltas = {};
        for (const arc of snap.arcs_activated) {
            deltas[arc.to] = (deltas[arc.to] || 0) + arc.delta;
        }

        return {
            turn,
            action: snap.action,
            frame_action: snap.frame_action,
            arcs: snap.arcs_activated,
            net_deltas: deltas
        };
    }

    /**
     * Get a compact table of all metrics across all turns.
     * Useful for console.table().
     */
    getMetricTable() {
        return this.snapshots.map(s => ({
            turn: s.turn,
            action: s.action,
            ...s.metrics,
            ...Object.fromEntries(
                Object.entries(s.latent_vars).map(([k, v]) => [`_${k}`, v])
            )
        }));
    }

    /**
     * ASCII sparkline for a metric (dev console).
     */
    sparkline(key) {
        const history = this.getHistory(key);
        if (history.length === 0) return `${key}: (no data)`;

        const min = Math.min(...history.map(h => h.value));
        const max = Math.max(...history.map(h => h.value));
        const range = max - min || 1;
        const blocks = '▁▂▃▄▅▆▇█';

        const line = history.map(h => {
            const idx = Math.round(((h.value - min) / range) * (blocks.length - 1));
            return blocks[idx];
        }).join('');

        return `${key}: ${line}  [${min}→${max}]`;
    }

    /**
     * Export all snapshots.
     */
    export() {
        return [...this.snapshots];
    }
}
