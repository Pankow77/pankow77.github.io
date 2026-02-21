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
import { Fatigue } from './fatigue.js';
import { Fragility } from './fragility.js';
import { WorldEvents } from './world-events.js';
import { EpistemicScars } from './epistemic-scars.js';
import { MoralArchive } from './moral-archive.js';
import { NPCPersonality } from './npc-personality.js';
import { TemporalPressure } from './temporal-pressure.js';

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

    // ── Fatigue system — cognitive load, oxygen, habituation, session arc ──
    const fatigue = new Fatigue();

    // Inject fatigue into causal graph for adaptive thresholds + inertia
    graph.setFatigue(fatigue);

    // ── New subsystems ──
    const fragility = new Fragility();
    const worldEvents = new WorldEvents(seed);
    const epistemicScars = new EpistemicScars();
    const moralArchive = new MoralArchive();
    const npcPersonality = new NPCPersonality();
    const temporalPressure = new TemporalPressure();

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
        rhythm,
        fatigue,
        fragility,
        worldEvents,
        epistemicScars,
        moralArchive,
        npcPersonality,
        temporalPressure
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
        fatigue,
        fragility,
        worldEvents,
        epistemicScars,
        moralArchive,
        npcPersonality,
        temporalPressure,
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
        load: () => {
            const f = fatigue;
            console.log('\n── COGNITIVE LOAD ──');
            console.log(`Load: ${(f.cognitiveLoad * 100).toFixed(0)}%`);
            console.log(`Oxygen: ${(f.oxygenMultiplier * 100).toFixed(0)}%`);
            console.log(`Session phase: ${f.getSessionPhase()}`);
            console.log(`Inertia dampening: ${f.getInertiaDampening().toFixed(2)}`);
            console.log(`Afterimage: ${f.getAfterImageDuration()}ms`);
        },
        stress: () => {
            console.log('\n── SYSTEM FRAGILITY ──');
            console.log(`Fragility index: ${(fragility.getFragilityIndex() * 100).toFixed(0)}%`);
            for (const [k, v] of Object.entries(fragility.stress)) {
                const bar = '█'.repeat(Math.round(v / 10));
                const empty = '░'.repeat(10 - Math.round(v / 10));
                const fractured = fragility.fractures[k] ? ' [FRACTURED]' : '';
                console.log(`${k}: [${bar}${empty}] ${v.toFixed(0)}${fractured}`);
            }
        },
        bias: () => {
            console.log('\n── EPISTEMIC BIAS ──');
            const b = epistemicScars.getBiasVector();
            console.log(`Velocity: ${b.velocity > 0 ? '+' : ''}${b.velocity} (fast↔slow)`);
            console.log(`Escalation: ${b.escalation > 0 ? '+' : ''}${b.escalation} (escalate↔caution)`);
            console.log(`Publicity: ${b.publicity > 0 ? '+' : ''}${b.publicity} (public↔private)`);
            const muts = epistemicScars.getActiveMutations();
            if (muts.length > 0) {
                console.log('Active mutations:', muts.map(m => m.label).join(', '));
            }
        },
        npcs: () => {
            console.log('\n── NPC STATES ──');
            const summary = npcPersonality.getNPCSummary();
            for (const [k, v] of Object.entries(summary)) {
                console.log(`${v.name}: mood=${v.mood}, opinion=${v.opinion || 'none'}, silent=${v.silentTurns}`);
            }
        },
        clock: () => {
            const c = temporalPressure.getClockState();
            console.log('\n── ESCALATION CLOCK ──');
            console.log(`Remaining: ${c.remaining.toFixed(1)} ticks (${(c.pct * 100).toFixed(0)}%)`);
            console.log(`Triggered: ${c.triggered}`);
            console.log(`Urgency: ${(temporalPressure.getUrgency() * 100).toFixed(0)}%`);
        },
        moral: () => {
            const pulse = moralArchive.getMoralPulse();
            console.log('\n── MORAL PULSE ──');
            console.log(`Speed: ${pulse.speed > 0 ? '+' : ''}${pulse.speed}`);
            console.log(`Visibility: ${pulse.visibility > 0 ? '+' : ''}${pulse.visibility}`);
            console.log(`People: ${pulse.people > 0 ? '+' : ''}${pulse.people}`);
        },
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
        '%c[SIGIL] %cDev: why(t) metrics() scars() load() stress() bias() npcs() clock() moral()',
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
