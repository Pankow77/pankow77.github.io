/**
 * SigilAudio — The nervous system.
 * ═══════════════════════════════════
 * Pure Web Audio API synthesis. Zero samples. Zero files.
 * Evolved monochrome: square waves, filtered noise, precise envelopes.
 * The Spectrum beeper that never stopped evolving.
 *
 * Architecture:
 *   DRONE LAYER     — Continuous low tone, pitch tracks fragility
 *   TICK LAYER      — Cycle metronome, barely perceptible
 *   UI LAYER        — Decision clicks, envelope sounds
 *   EVENT LAYER     — PADC compression, profilo scan, termination
 *   ISOLATION LAYER — Flutter, distortion, granular noise
 *
 * All sounds are state-reactive via Bus events.
 * AudioContext created on first user gesture (browser policy).
 *
 * Usage:
 *   SigilAudio.init(appEl);   // Called from app.js after intro
 *   // Everything else is automatic via Bus listeners.
 */

import { Bus } from '../bus.js';
import { State } from './state.js';

// ── Constants ──
const MASTER_VOLUME = 0.35;
const DRONE_BASE_FREQ = 55;        // A1 — just above threshold of perception
const DRONE_MAX_FREQ = 82.41;      // E2 — tension ceiling
const TICK_FREQ = 1200;            // High, short, like dot matrix
const TICK_DURATION = 0.04;
const CLICK_FREQ = 800;
const CLICK_DURATION = 0.025;

export const SigilAudio = {

  _ctx: null,
  _master: null,
  _initialized: false,
  _muted: false,

  // Persistent nodes
  _drone: null,
  _droneGain: null,
  _droneFilter: null,
  _droneLFO: null,
  _droneLFOGain: null,

  // Isolation layer
  _isolationNoise: null,
  _isolationNoiseGain: null,
  _isolationFilter: null,
  _isolationLFO: null,
  _isolationDepth: 0,

  // ═══════════════════════════════════
  //  INITIALIZATION
  // ═══════════════════════════════════

  /**
   * Initialize audio system.
   * Attaches a one-time click listener to create AudioContext
   * (required by browser autoplay policy).
   */
  init(appEl) {
    if (this._initialized) return;
    this._initialized = true;

    // AudioContext requires user gesture
    const activate = () => {
      if (this._ctx) return;
      this._createContext();
      this._startDrone();
      this._bindEvents();
      document.removeEventListener('click', activate);
      document.removeEventListener('keydown', activate);
    };

    document.addEventListener('click', activate, { once: false });
    document.addEventListener('keydown', activate, { once: false });
  },

  /**
   * Create AudioContext and master chain.
   */
  _createContext() {
    this._ctx = new (window.AudioContext || window.webkitAudioContext)();

    // Master gain — everything routes through here
    this._master = this._ctx.createGain();
    this._master.gain.value = MASTER_VOLUME;
    this._master.connect(this._ctx.destination);

    // Master compressor — glues everything, prevents clipping
    this._compressor = this._ctx.createDynamicsCompressor();
    this._compressor.threshold.value = -24;
    this._compressor.knee.value = 12;
    this._compressor.ratio.value = 4;
    this._compressor.attack.value = 0.003;
    this._compressor.release.value = 0.25;
    this._compressor.connect(this._master);
  },

  // ═══════════════════════════════════
  //  DRONE LAYER — The heartbeat
  // ═══════════════════════════════════
  //  Low sawtooth, heavily filtered.
  //  Barely audible at fragility 0.12.
  //  Impossible to ignore at 0.85.
  //  Pitch rises with fragility.
  //  LFO adds breathing.

  _startDrone() {
    const ctx = this._ctx;

    // Oscillator: sawtooth, rich harmonics
    this._drone = ctx.createOscillator();
    this._drone.type = 'sawtooth';
    this._drone.frequency.value = DRONE_BASE_FREQ;

    // Second oscillator: detuned for thickness
    this._drone2 = ctx.createOscillator();
    this._drone2.type = 'sawtooth';
    this._drone2.frequency.value = DRONE_BASE_FREQ + 0.5; // beating

    // Low-pass filter: cuts everything above ~120Hz
    this._droneFilter = ctx.createBiquadFilter();
    this._droneFilter.type = 'lowpass';
    this._droneFilter.frequency.value = 120;
    this._droneFilter.Q.value = 2;

    // Gain for drone layer
    this._droneGain = ctx.createGain();
    this._droneGain.gain.value = 0.08; // barely there at start

    // LFO: slow breathing on filter cutoff
    this._droneLFO = ctx.createOscillator();
    this._droneLFO.type = 'sine';
    this._droneLFO.frequency.value = 0.08; // one breath every ~12 seconds
    this._droneLFOGain = ctx.createGain();
    this._droneLFOGain.gain.value = 15; // subtle filter modulation

    // Routing
    this._drone.connect(this._droneFilter);
    this._drone2.connect(this._droneFilter);
    this._droneFilter.connect(this._droneGain);
    this._droneGain.connect(this._compressor);

    this._droneLFO.connect(this._droneLFOGain);
    this._droneLFOGain.connect(this._droneFilter.frequency);

    // Start
    this._drone.start();
    this._drone2.start();
    this._droneLFO.start();
  },

  /**
   * Update drone based on fragility (0.0 - 1.0).
   * Higher fragility = higher pitch, louder, wider filter, faster breathing.
   */
  _updateDrone(fragility) {
    if (!this._ctx || this._muted) return;
    const t = this._ctx.currentTime;

    // Pitch: A1 (55Hz) → E2 (82Hz) with fragility
    const freq = DRONE_BASE_FREQ + (DRONE_MAX_FREQ - DRONE_BASE_FREQ) * fragility;
    this._drone.frequency.setTargetAtTime(freq, t, 2);
    this._drone2.frequency.setTargetAtTime(freq + 0.5 + fragility * 2, t, 2);

    // Volume: 0.08 → 0.28
    const vol = 0.08 + fragility * 0.20;
    this._droneGain.gain.setTargetAtTime(vol, t, 1.5);

    // Filter opens: 120Hz → 350Hz
    const cutoff = 120 + fragility * 230;
    this._droneFilter.frequency.setTargetAtTime(cutoff, t, 2);

    // LFO speed: 0.08Hz → 0.25Hz (breathing accelerates)
    const lfoFreq = 0.08 + fragility * 0.17;
    this._droneLFO.frequency.setTargetAtTime(lfoFreq, t, 3);

    // LFO depth increases
    const lfoDepth = 15 + fragility * 40;
    this._droneLFOGain.gain.setTargetAtTime(lfoDepth, t, 2);
  },

  // ═══════════════════════════════════
  //  TICK LAYER — Cycle metronome
  // ═══════════════════════════════════
  //  Short square wave blip.
  //  Like a dot matrix printer advancing one line.
  //  Pitch drops slightly each cycle (system aging).

  playCycleTick(cycle) {
    if (!this._ctx || this._muted) return;
    const ctx = this._ctx;
    const t = ctx.currentTime;

    // Pitch drops with cycle age
    const freq = TICK_FREQ - (cycle / 40) * 200;

    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = freq;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.12, t + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.001, t + TICK_DURATION);

    // High-pass to thin it out
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 600;

    osc.connect(hp);
    hp.connect(gain);
    gain.connect(this._compressor);

    osc.start(t);
    osc.stop(t + TICK_DURATION + 0.01);
  },

  // ═══════════════════════════════════
  //  UI LAYER — Decision sounds
  // ═══════════════════════════════════

  /**
   * Envelope presented — descending tone, like fax receiving.
   */
  playEnvelopeOpen() {
    if (!this._ctx || this._muted) return;
    const ctx = this._ctx;
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(900, t);
    osc.frequency.exponentialRampToValueAtTime(200, t + 0.3);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.07, t + 0.01);
    gain.gain.setTargetAtTime(0.04, t + 0.05, 0.1);
    gain.gain.setTargetAtTime(0.001, t + 0.25, 0.05);

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1800;

    osc.connect(lp);
    lp.connect(gain);
    gain.connect(this._compressor);

    osc.start(t);
    osc.stop(t + 0.4);
  },

  /**
   * Decision click — sharp, decisive. Different per frame.
   * @param {string} frame — TRASPARENZA, STABILITÀ, SOPPRESSIONE, etc.
   */
  playDecisionClick(frame) {
    if (!this._ctx || this._muted) return;
    const ctx = this._ctx;
    const t = ctx.currentTime;

    // Frame determines character
    const frameMap = {
      'TRASPARENZA':          { freq: 1000, type: 'square',   dur: 0.03 },
      'STABILITÀ':            { freq: 600,  type: 'triangle', dur: 0.05 },
      'SOPPRESSIONE':         { freq: 300,  type: 'sawtooth', dur: 0.06 },
      'PROTEZIONE':           { freq: 800,  type: 'triangle', dur: 0.04 },
      'PRUDENZA':             { freq: 700,  type: 'sine',     dur: 0.05 },
      'CRISI':                { freq: 1100, type: 'sawtooth', dur: 0.03 },
      'NEUTRALITÀ':           { freq: 500,  type: 'sine',     dur: 0.06 },
      'GIUSTIZIA SISTEMICA':  { freq: 900,  type: 'square',   dur: 0.04 },
      'PROTEZIONE INDIVIDUALE': { freq: 650, type: 'triangle', dur: 0.05 },
      'OSSERVAZIONE':         { freq: 550,  type: 'sine',     dur: 0.07 },
      'SEGNALAZIONE':         { freq: 950,  type: 'square',   dur: 0.03 },
      'CAUTELA':              { freq: 450,  type: 'sine',     dur: 0.06 },
      'AUTONOMIA':            { freq: 800,  type: 'sawtooth', dur: 0.04 },
    };

    const params = frameMap[frame] || { freq: CLICK_FREQ, type: 'square', dur: CLICK_DURATION };

    const osc = ctx.createOscillator();
    osc.type = params.type;
    osc.frequency.value = params.freq;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.15, t + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.001, t + params.dur);

    osc.connect(gain);
    gain.connect(this._compressor);

    osc.start(t);
    osc.stop(t + params.dur + 0.01);
  },

  /**
   * Consequence revealed — low resonant pulse.
   */
  playConsequence() {
    if (!this._ctx || this._muted) return;
    const ctx = this._ctx;
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 110;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.10, t + 0.05);
    gain.gain.setTargetAtTime(0.001, t + 0.4, 0.15);

    osc.connect(gain);
    gain.connect(this._compressor);

    osc.start(t);
    osc.stop(t + 0.8);
  },

  /**
   * Annotation keystroke — micro tick.
   */
  playKeystroke() {
    if (!this._ctx || this._muted) return;
    const ctx = this._ctx;
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = 2400 + Math.random() * 400;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.02, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.015);

    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 1800;

    osc.connect(hp);
    hp.connect(gain);
    gain.connect(this._compressor);

    osc.start(t);
    osc.stop(t + 0.02);
  },

  // ═══════════════════════════════════
  //  EVENT LAYER — Irreversible moments
  // ═══════════════════════════════════

  /**
   * PADC — The air tightens.
   * Not a jumpscare. Compression. The room shrinks.
   * 3-second sequence:
   *   1. Drone pitch bends down (gravity)
   *   2. High-pass filter opens (frequencies stripped away)
   *   3. Low rumble enters
   *   4. Brief silence
   *   5. Single clean tone (the new reality)
   */
  playPADC() {
    if (!this._ctx || this._muted) return;
    const ctx = this._ctx;
    const t = ctx.currentTime;

    // 1. Drone drops — gravity
    this._drone.frequency.setTargetAtTime(35, t, 0.5);
    this._drone2.frequency.setTargetAtTime(35.3, t, 0.5);
    this._droneGain.gain.setTargetAtTime(0.30, t, 0.3);
    this._droneFilter.frequency.setTargetAtTime(60, t, 0.4);

    // 2. Sub-bass rumble
    const sub = ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.value = 30;
    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0, t);
    subGain.gain.linearRampToValueAtTime(0.20, t + 0.8);
    subGain.gain.setTargetAtTime(0.001, t + 2.5, 0.3);
    sub.connect(subGain);
    subGain.connect(this._compressor);
    sub.start(t);
    sub.stop(t + 3.5);

    // 3. High-frequency compression — strip the air
    const noise = this._createNoiseBuffer(2);
    const noiseNode = ctx.createBufferSource();
    noiseNode.buffer = noise;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0, t + 0.5);
    noiseGain.gain.linearRampToValueAtTime(0.04, t + 1.0);
    noiseGain.gain.setTargetAtTime(0.001, t + 2.0, 0.3);

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 4000;
    bp.Q.value = 8;

    noiseNode.connect(bp);
    bp.connect(noiseGain);
    noiseGain.connect(this._compressor);
    noiseNode.start(t + 0.5);
    noiseNode.stop(t + 3);

    // 4. Brief silence (drone dips to near-zero)
    this._droneGain.gain.setTargetAtTime(0.01, t + 2.5, 0.2);

    // 5. Clean tone — the new world
    const cleanTone = ctx.createOscillator();
    cleanTone.type = 'sine';
    cleanTone.frequency.value = 440; // A4 — clarity
    const cleanGain = ctx.createGain();
    cleanGain.gain.setValueAtTime(0, t + 3.2);
    cleanGain.gain.linearRampToValueAtTime(0.08, t + 3.5);
    cleanGain.gain.setTargetAtTime(0.001, t + 5.0, 0.4);
    cleanTone.connect(cleanGain);
    cleanGain.connect(this._compressor);
    cleanTone.start(t + 3.2);
    cleanTone.stop(t + 5.5);

    // 6. Drone recovers — but different. Higher baseline.
    const fragility = State.get('system.fragility') || 0.5;
    setTimeout(() => this._updateDrone(Math.max(fragility, 0.5)), 5000);
  },

  /**
   * Profilo Operativo — Scanning sound.
   * Ascending harmonics. Data being read off your soul.
   */
  playProfilo() {
    if (!this._ctx || this._muted) return;
    const ctx = this._ctx;
    const t = ctx.currentTime;

    // Series of ascending tones
    const notes = [220, 330, 440, 550, 660, 880];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = freq;

      const gain = ctx.createGain();
      const start = t + i * 0.25;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.06, start + 0.01);
      gain.gain.setTargetAtTime(0.001, start + 0.15, 0.04);

      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 2000;

      osc.connect(lp);
      lp.connect(gain);
      gain.connect(this._compressor);

      osc.start(start);
      osc.stop(start + 0.2);
    });

    // Final sustained tone — you've been read
    const final = ctx.createOscillator();
    final.type = 'sine';
    final.frequency.value = 880;
    const finalGain = ctx.createGain();
    const finalStart = t + notes.length * 0.25 + 0.3;
    finalGain.gain.setValueAtTime(0, finalStart);
    finalGain.gain.linearRampToValueAtTime(0.10, finalStart + 0.1);
    finalGain.gain.setTargetAtTime(0.001, finalStart + 1.5, 0.3);
    final.connect(finalGain);
    finalGain.connect(this._compressor);
    final.start(finalStart);
    final.stop(finalStart + 2);
  },

  /**
   * Termination notice — single low pulse. Then silence.
   */
  playTerminationNotice() {
    if (!this._ctx || this._muted) return;
    const ctx = this._ctx;
    const t = ctx.currentTime;

    // Kill the drone
    this._droneGain.gain.setTargetAtTime(0.001, t, 0.5);

    // Single pulse
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 55;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t + 0.8);
    gain.gain.linearRampToValueAtTime(0.25, t + 0.85);
    gain.gain.setTargetAtTime(0.001, t + 1.5, 0.2);
    osc.connect(gain);
    gain.connect(this._compressor);
    osc.start(t + 0.8);
    osc.stop(t + 2.5);
  },

  /**
   * Node terminated — drone dies. Digital silence.
   * Then GHOST_8 boot tone.
   */
  playTerminationFinal() {
    if (!this._ctx || this._muted) return;
    const ctx = this._ctx;
    const t = ctx.currentTime;

    // Everything dies
    this._droneGain.gain.setTargetAtTime(0, t, 0.3);
    if (this._isolationNoiseGain) {
      this._isolationNoiseGain.gain.setTargetAtTime(0, t, 0.3);
    }

    // 4 seconds of digital silence

    // Then: GHOST_8 boot tone — three ascending beeps
    const bootNotes = [440, 554.37, 659.25]; // A4, C#5, E5 — major triad. Hope.
    bootNotes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = freq;

      const gain = ctx.createGain();
      const start = t + 5 + i * 0.15;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.08, start + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.1);

      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 3000;

      osc.connect(lp);
      lp.connect(gain);
      gain.connect(this._compressor);

      osc.start(start);
      osc.stop(start + 0.15);
    });
  },

  /**
   * Succession (clean) — peaceful handoff tone.
   */
  playSuccession() {
    if (!this._ctx || this._muted) return;
    const ctx = this._ctx;
    const t = ctx.currentTime;

    // Drone fades peacefully
    this._droneGain.gain.setTargetAtTime(0.02, t, 2);
    this._drone.frequency.setTargetAtTime(DRONE_BASE_FREQ, t, 2);

    // Clean bell — sine with slight detune
    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.value = 523.25; // C5

    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = 659.25; // E5

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t + 1);
    gain.gain.linearRampToValueAtTime(0.10, t + 1.1);
    gain.gain.setTargetAtTime(0.001, t + 3, 0.6);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this._compressor);

    osc1.start(t + 1);
    osc2.start(t + 1);
    osc1.stop(t + 4);
    osc2.stop(t + 4);
  },

  // ═══════════════════════════════════
  //  ISOLATION LAYER — The walls close in
  // ═══════════════════════════════════

  /**
   * Begin isolation. Subtle at first.
   * Shallow: LFO flutter on drone filter.
   * Deep: harmonic distortion.
   * Critical: white noise granular under everything.
   */
  setIsolation(depth) {
    if (!this._ctx || this._muted) return;
    this._isolationDepth = depth;
    const ctx = this._ctx;
    const t = ctx.currentTime;

    // ── Shallow (depth 0-1): LFO flutter ──
    if (depth >= 0 && !this._isolationLFO) {
      this._isolationLFO = ctx.createOscillator();
      this._isolationLFO.type = 'sine';
      this._isolationLFO.frequency.value = 3; // fast tremolo
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0;
      this._isolationLFO.connect(lfoGain);
      lfoGain.connect(this._droneGain.gain);
      this._isolationLFO.start();
      this._isolationLFOGain = lfoGain;
    }

    if (this._isolationLFOGain) {
      // Flutter intensity scales with depth
      const flutterAmount = Math.min(0.04, depth * 0.01);
      this._isolationLFOGain.gain.setTargetAtTime(flutterAmount, t, 0.5);
      // Flutter speed increases
      if (this._isolationLFO) {
        this._isolationLFO.frequency.setTargetAtTime(3 + depth * 2, t, 1);
      }
    }

    // ── Deep (depth 2+): Harmonic distortion on drone ──
    if (depth >= 2 && !this._isolationDistortion) {
      this._isolationDistortion = ctx.createWaveShaper();
      this._isolationDistortion.curve = this._makeDistortionCurve(200);
      this._isolationDistortion.oversample = '4x';

      this._isolationDistortionGain = ctx.createGain();
      this._isolationDistortionGain.gain.value = 0;

      // Tap drone → distort → mix back
      this._droneFilter.connect(this._isolationDistortion);
      this._isolationDistortion.connect(this._isolationDistortionGain);
      this._isolationDistortionGain.connect(this._compressor);
    }

    if (this._isolationDistortionGain && depth >= 2) {
      const distAmount = Math.min(0.06, (depth - 2) * 0.015);
      this._isolationDistortionGain.gain.setTargetAtTime(distAmount, t, 1);
    }

    // ── Critical (depth 4+): White noise granular ──
    if (depth >= 4 && !this._isolationNoise) {
      const buf = this._createNoiseBuffer(10);
      this._isolationNoise = ctx.createBufferSource();
      this._isolationNoise.buffer = buf;
      this._isolationNoise.loop = true;

      this._isolationNoiseGain = ctx.createGain();
      this._isolationNoiseGain.gain.value = 0;

      this._isolationFilter = ctx.createBiquadFilter();
      this._isolationFilter.type = 'bandpass';
      this._isolationFilter.frequency.value = 2000;
      this._isolationFilter.Q.value = 1;

      this._isolationNoise.connect(this._isolationFilter);
      this._isolationFilter.connect(this._isolationNoiseGain);
      this._isolationNoiseGain.connect(this._compressor);
      this._isolationNoise.start();
    }

    if (this._isolationNoiseGain && depth >= 4) {
      const noiseAmount = Math.min(0.05, (depth - 4) * 0.015);
      this._isolationNoiseGain.gain.setTargetAtTime(noiseAmount, t, 1);
      // Filter sweeps slowly — granular movement
      if (this._isolationFilter) {
        this._isolationFilter.frequency.setTargetAtTime(
          1500 + Math.sin(t * 0.1) * 800, t, 2
        );
      }
    }
  },

  /**
   * Phase change sound — low, structural shift.
   */
  playPhaseChange(phase) {
    if (!this._ctx || this._muted) return;
    const ctx = this._ctx;
    const t = ctx.currentTime;

    const phaseFreqs = {
      'ELASTICITY': 220,
      'ACCUMULATION': 196,
      'RIGIDITY': 165,
      'FRACTURE_RISK': 138.59
    };

    const freq = phaseFreqs[phase] || 200;

    // Two-tone announcement
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.setValueAtTime(freq * 0.75, t + 0.2);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.12, t + 0.02);
    gain.gain.setTargetAtTime(0.08, t + 0.18, 0.02);
    gain.gain.setTargetAtTime(0.001, t + 0.4, 0.1);

    osc.connect(gain);
    gain.connect(this._compressor);

    osc.start(t);
    osc.stop(t + 0.6);
  },

  /**
   * Boot beep — intro sequence sound.
   * Three ascending tones, Spectrum-style.
   */
  playBoot() {
    if (!this._ctx || this._muted) return;
    const ctx = this._ctx;
    const t = ctx.currentTime;

    const notes = [262, 330, 392]; // C4, E4, G4
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = freq;

      const gain = ctx.createGain();
      const start = t + i * 0.12;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.06, start + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.08);

      osc.connect(gain);
      gain.connect(this._compressor);

      osc.start(start);
      osc.stop(start + 0.1);
    });
  },

  // ═══════════════════════════════════
  //  BUS EVENT BINDINGS
  // ═══════════════════════════════════

  _bindEvents() {
    // ── Fragility → drone ──
    State.watch('system.fragility', (value) => {
      this._updateDrone(value);
    });

    // ── Cycle advance → tick ──
    Bus.on('cycle:advanced', (event) => {
      this.playCycleTick(event.payload.cycle);
    });

    // ── Envelope presented → open sound ──
    Bus.on('cycle:show-envelope', () => {
      this.playEnvelopeOpen();
    });

    // ── Envelope decided → consequence sound ──
    Bus.on('envelope:decided', (event) => {
      this.playDecisionClick(event.payload.frame);
      setTimeout(() => this.playConsequence(), 300);
    });

    // ── Phase change ──
    Bus.on('cycle:phase-change', (event) => {
      this.playPhaseChange(event.payload.phase);
    });

    // ── PADC ──
    Bus.on('padc:triggered', () => {
      this.playPADC();
    });

    // ── Profilo ──
    Bus.on('profilo:triggered', () => {
      this.playProfilo();
    });

    // ── Termination notice ──
    Bus.on('exposure:termination-notice', () => {
      this.playTerminationNotice();
    });

    // ── Node terminated ──
    Bus.on('exposure:node-terminated', () => {
      this.playTerminationFinal();
    });

    // ── Clean succession ──
    Bus.on('state:changed', (event) => {
      if (event.payload.key === 'cycle.current' && event.payload.value > 40) {
        if (!State.get('_termination.triggered')) {
          this.playSuccession();
        }
      }
    });

    // ── Isolation depth ──
    Bus.on('exposure:isolation-begin', () => {
      this.setIsolation(0);
    });

    // Track isolation depth from CSS data attribute
    const isolationObserver = new MutationObserver(() => {
      const depth = parseInt(document.body.dataset.isolationDepth || '0', 10);
      if (depth !== this._isolationDepth) {
        this.setIsolation(depth);
      }
    });
    isolationObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ['data-isolation-depth']
    });

    // ── Jitter update — modulate drone timing ──
    Bus.on('exposure:jitter-update', (event) => {
      if (!this._ctx) return;
      const { jitter } = event.payload;
      // Detune second oscillator more — destabilize
      const baseFreq = this._drone.frequency.value;
      this._drone2.frequency.setTargetAtTime(
        baseFreq + 0.5 + jitter * 8,
        this._ctx.currentTime, 1
      );
    });
  },

  // ═══════════════════════════════════
  //  UTILITIES
  // ═══════════════════════════════════

  /**
   * Create a white noise AudioBuffer.
   * @param {number} seconds — duration
   * @returns {AudioBuffer}
   */
  _createNoiseBuffer(seconds) {
    const ctx = this._ctx;
    const length = ctx.sampleRate * seconds;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  },

  /**
   * Create a waveshaper distortion curve.
   * @param {number} amount — distortion intensity (50-400)
   * @returns {Float32Array}
   */
  _makeDistortionCurve(amount) {
    const samples = 44100;
    const curve = new Float32Array(samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
    }
    return curve;
  },

  /**
   * Mute/unmute toggle.
   */
  toggleMute() {
    this._muted = !this._muted;
    if (this._master) {
      this._master.gain.setTargetAtTime(
        this._muted ? 0 : MASTER_VOLUME,
        this._ctx.currentTime, 0.1
      );
    }
    return this._muted;
  },

  /**
   * Check if muted.
   */
  isMuted() {
    return this._muted;
  }
};
