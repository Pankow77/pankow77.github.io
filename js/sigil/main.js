/**
 * main.js — SIGIL Bootstrap
 * ═══════════════════════════════════════════════════════════
 * Entry point. Wires everything. Starts the loop.
 * No configuration screen. No menu. The terminal IS the game.
 *
 * Browser-native ES Module. Zero dependencies.
 * ═══════════════════════════════════════════════════════════
 */

import { Bus } from '../bus.js';
import { GameState } from './state.js';
import { ConsequenceEngine } from './consequence-engine.js';
import { CausalGraph } from './causal-graph.js';
import { AnnotationTracker } from './annotation-tracker.js';
import { Telemetry } from './telemetry.js';
import { Replay } from './replay.js';
import { UI } from './ui.js';
import { SuccessionProtocol } from './succession-protocol.js';
import { ScenarioLoader } from './scenario-loader.js';
import { GameLoop } from './game-loop.js';
import { VFX } from './vfx.js';
import { AudioEngine } from './audio-engine.js';
import { Rhythm } from './rhythm.js';

async function boot() {
    console.log(
        '%c[SIGIL] %cBootstrap iniziato',
        'color: #33ff33; font-weight: bold;',
        'color: #227722;'
    );

    // ── Core modules ──
    const state = new GameState();
    const tracker = new AnnotationTracker();
    const ui = new UI(Bus, tracker);
    const consequences = new ConsequenceEngine(state);
    const succession = new SuccessionProtocol(Bus, state, ui);
    const loader = new ScenarioLoader();

    // ── Causal graph + telemetry ──
    // Derive PRNG seed from run_id for deterministic noise
    const seed = parseInt(state.run_id.replace(/\D/g, '')) || 42;
    const graph = new CausalGraph(seed);
    const telemetry = new Telemetry();

    // ── Wire temporal drift ──
    consequences.setCausalGraph(graph);

    // ── Perception layer ──
    const vfx = new VFX(Bus);
    const audio = new AudioEngine();
    const rhythm = new Rhythm();

    // ── Initialize UI ──
    ui.init();

    // ── Initialize VFX ──
    vfx.init();

    // ── Audio: init on first user interaction (browser policy) ──
    const startAudio = () => {
        audio.init();
        audio.start();
        document.removeEventListener('click', startAudio);
        document.removeEventListener('keydown', startAudio);
    };
    document.addEventListener('click', startAudio, { once: false });
    document.addEventListener('keydown', startAudio, { once: false });

    // ── Audio toggle button ──
    const audioToggle = document.getElementById('audio-toggle');
    if (audioToggle) {
        audioToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const active = audio.toggleMute();
            audioToggle.textContent = active ? 'SND' : 'MUTE';
            audioToggle.classList.toggle('muted', !active);
        });
    }

    // ── Preload scenarios ──
    await loader.preloadMVP();

    // ── Wire game loop ──
    const loop = new GameLoop({
        bus: Bus,
        state,
        ui,
        consequenceEngine: consequences,
        annotationTracker: tracker,
        successionProtocol: succession,
        scenarioLoader: loader,
        causalGraph: graph,
        telemetry,
        vfx,
        audio,
        rhythm
    });

    // ── Initialize and run ──
    await loop.init();

    // ── Debug hooks (dev console) ──
    window.__SIGIL = {
        state,
        loop,
        consequences,
        graph,
        tracker,
        telemetry,
        succession,
        replay: Replay,
        bus: Bus,
        vfx,
        audio,
        rhythm,
        // Dev helpers
        why: (turn) => {
            const trace = telemetry.getWhyTrace(turn);
            if (!trace) { console.log(`No data for turn ${turn}`); return; }
            console.log(`\n── WHY T${turn} ──`);
            console.log(`Action: ${trace.action}`);
            if (trace.frame_action) console.log('Frame:', trace.frame_action);
            console.log('Arcs:', trace.arcs);
            console.log('Net deltas:', trace.net_deltas);
        },
        metrics: () => console.table(telemetry.getMetricTable()),
        spark: (key) => console.log(telemetry.sparkline(key)),
        scars: () => {
            const s = graph.getScars();
            if (Object.keys(s).length === 0) {
                console.log('No scars. System is still clean.');
                return;
            }
            console.log('\n── HYSTERESIS SCARS ──');
            for (const [key, scar] of Object.entries(s)) {
                const bar = '█'.repeat(Math.round(scar.strength * 10));
                const empty = '░'.repeat(10 - Math.round(scar.strength * 10));
                console.log(
                    `${key}: [${bar}${empty}] ${(scar.strength * 100).toFixed(0)}% ` +
                    `(×${scar.modifier} on ${scar.affects.join(', ')})`
                );
            }
        },
        visibility: () => console.log(graph.getVisibility(state)),
        reset: async () => {
            await state.reset();
            location.reload();
        }
    };

    console.log(
        '%c[SIGIL] %cOnline. %c' + state.run_id,
        'color: #33ff33; font-weight: bold;',
        'color: #227722;',
        'color: #33ff33;'
    );
    console.log(
        '%c[SIGIL] %cDev: __SIGIL.why(turn), __SIGIL.metrics(), __SIGIL.spark(key), __SIGIL.scars()',
        'color: #33ff33; font-weight: bold;',
        'color: #666;'
    );

    // ── Start ──
    await loop.run();
}

// ── Boot on DOM ready ──
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
} else {
    boot();
}
