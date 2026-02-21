/**
 * audio-engine.js — SIGIL Dynamic Sound Layer
 * ═══════════════════════════════════════════════════════════
 * Pure Web Audio API synthesis. Zero external files.
 * Zero dependencies. Everything generated at runtime.
 *
 * Not music. Cognitive environment.
 *
 * Layers:
 *   - Base drone: filtered noise, always present, barely audible
 *   - Tension hum: low oscillator, grows with repression_index
 *   - Static crackle: noise bursts, frequency tied to volatility
 *   - Ticker pulse: rhythmic click, rate tied to market activity
 *   - Sub-bass hit: 40Hz punch on player choice (120ms)
 *   - Scar tone: dissonant partial, permanent after scar forms
 *
 * State-reactive: every parameter is f(game_state).
 * The player never hears the same soundscape twice.
 *
 * Browser-native ES Module. Zero dependencies.
 * ═══════════════════════════════════════════════════════════
 */

export class AudioEngine {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.started = false;

        // Layer nodes
        this._drone = null;
        this._tensionOsc = null;
        this._tensionGain = null;
        this._staticNode = null;
        this._staticGain = null;
        this._tickerInterval = null;
        this._scarOscs = [];

        // State tracking
        this._muted = false;
        this._masterVolume = 0.15;
    }

    /**
     * Initialize audio context. Must be called from user gesture.
     */
    init() {
        if (this.ctx) return;

        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this._masterVolume;
        this.masterGain.connect(this.ctx.destination);
    }

    /**
     * Start all ambient layers. Call after first user interaction.
     */
    start() {
        if (this.started || !this.ctx) return;
        this.started = true;

        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        this._startDrone();
        this._startTension();
        this._startStatic();
        this._startTicker();
    }

    // ═══════════════════════════════════════
    // LAYER: Base drone — filtered noise
    // ═══════════════════════════════════════

    _startDrone() {
        // White noise source
        const bufferSize = this.ctx.sampleRate * 2;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;

        // Bandpass filter: only low frequencies pass
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 120;
        filter.Q.value = 0.8;

        const gain = this.ctx.createGain();
        gain.gain.value = 0.06;

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        noise.start();

        this._drone = { noise, filter, gain };
    }

    // ═══════════════════════════════════════
    // LAYER: Tension hum — low oscillator
    // ═══════════════════════════════════════

    _startTension() {
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = 42; // sub-bass, felt more than heard

        // Slight detuning for unease
        const osc2 = this.ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.value = 43.5; // beating frequency ~1.5Hz

        const gain = this.ctx.createGain();
        gain.gain.value = 0; // starts silent, grows with repression

        osc.connect(gain);
        osc2.connect(gain);
        gain.connect(this.masterGain);
        osc.start();
        osc2.start();

        this._tensionOsc = [osc, osc2];
        this._tensionGain = gain;
    }

    // ═══════════════════════════════════════
    // LAYER: Static crackle — noise bursts
    // ═══════════════════════════════════════

    _startStatic() {
        // Create short noise buffer for crackle
        const bufferSize = this.ctx.sampleRate * 0.05; // 50ms burst
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            // Shaped noise: sharp attack, quick decay
            const env = Math.exp(-i / (bufferSize * 0.1));
            data[i] = (Math.random() * 2 - 1) * env;
        }

        // Highpass to make it crackle-like
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 3000;

        const gain = this.ctx.createGain();
        gain.gain.value = 0;

        filter.connect(gain);
        gain.connect(this.masterGain);

        this._staticNode = { buffer, filter, gain };
    }

    _fireStaticBurst() {
        if (!this._staticNode || !this.ctx) return;

        const source = this.ctx.createBufferSource();
        source.buffer = this._staticNode.buffer;
        source.connect(this._staticNode.filter);
        source.start();
    }

    // ═══════════════════════════════════════
    // LAYER: Ticker — rhythmic click
    // ═══════════════════════════════════════

    _startTicker() {
        // Ticker is scheduled via setInterval, rate changes with state
        this._tickerRate = 2000; // ms between ticks
        this._tickerInterval = setInterval(() => this._fireTick(), this._tickerRate);
    }

    _fireTick() {
        if (!this.ctx || this._muted) return;

        const osc = this.ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.value = 800;

        const gain = this.ctx.createGain();
        const now = this.ctx.currentTime;
        gain.gain.setValueAtTime(0.03, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.03);
    }

    // ═══════════════════════════════════════
    // ACTION: Sub-bass hit
    // ═══════════════════════════════════════

    /**
     * Context-sensitive sub-bass hit. Called on player choice.
     * The same action in different contexts sounds different.
     *
     * Base: 40Hz sine, 120ms.
     * Modifiers:
     *   - Scar count shifts frequency (more scars = lower, heavier)
     *   - Volatility adds harmonic distortion
     *   - Repression lengthens the tail
     *
     * The player never hears the same punch twice if the world has changed.
     */
    subBassHit(state) {
        if (!this.ctx || this._muted) return;

        const now = this.ctx.currentTime;
        const scarCount = this._scarOscs.length;
        const vol = (state?.latent_vars?.volatility || 0) / 100;
        const rep = (state?.latent_vars?.repression_index || 0) / 100;

        // Frequency: 40Hz base, drops 2Hz per scar (heavier world = deeper hit)
        const freq = Math.max(28, 40 - scarCount * 2);

        // Duration: 120ms base, +40ms per 0.5 repression
        const duration = 0.12 + rep * 0.04;

        // Main tone
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + duration + 0.05);

        // Volatility harmonic: adds grit when volatile
        if (vol > 0.3) {
            const harmonic = this.ctx.createOscillator();
            harmonic.type = 'sawtooth';
            harmonic.frequency.value = freq * 1.5; // fifth above

            const hGain = this.ctx.createGain();
            hGain.gain.setValueAtTime(vol * 0.08, now);
            hGain.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.7);

            harmonic.connect(hGain);
            hGain.connect(this.masterGain);
            harmonic.start(now);
            harmonic.stop(now + duration);
        }
    }

    /**
     * Post-consequence compression.
     * Brief global volume dip — the world contracts after an action.
     * 300ms. Subtle but perceptible.
     */
    postConsequenceCompress() {
        if (!this.ctx || !this.started || this._muted) return;

        const now = this.ctx.currentTime;
        const current = this.masterGain.gain.value;

        // Duck to 60%, recover over 300ms
        this.masterGain.gain.setValueAtTime(current, now);
        this.masterGain.gain.linearRampToValueAtTime(current * 0.6, now + 0.05);
        this.masterGain.gain.linearRampToValueAtTime(current, now + 0.35);
    }

    // ═══════════════════════════════════════
    // ACTION: Micro-crisis sound
    // ═══════════════════════════════════════

    /**
     * Dissonant burst for threshold crossing.
     * Short, unsettling. Something broke.
     */
    crisisSound() {
        if (!this.ctx || this._muted) return;

        const now = this.ctx.currentTime;

        // Dissonant chord: tritone
        const freqs = [220, 311]; // A3 + Eb4 = tritone
        for (const freq of freqs) {
            const osc = this.ctx.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.value = freq;

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 2000;
            filter.frequency.exponentialRampToValueAtTime(200, now + 0.4);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterGain);
            osc.start(now);
            osc.stop(now + 0.5);
        }
    }

    // ═══════════════════════════════════════
    // ACTION: Scar tone — permanent
    // ═══════════════════════════════════════

    /**
     * Add a permanent dissonant partial. One per scar.
     * Very quiet. Accumulates. After 3-4 scars the drone is unsettling.
     *
     * Dynamic compression: older scars get quieter as new ones arrive.
     * Not removed — compacted. The memory doesn't disappear. It recedes.
     */
    addScarTone(scarKey) {
        if (!this.ctx || this._muted) return;

        // Each scar gets a unique dissonant frequency
        const scarFreqs = {
            polarization_scar: 67,    // sub-bass, slightly sharp
            repression_scar: 89,      // beating against drone
            volatility_scar: 113,     // near drone, creates interference
            brent_scar: 157,          // higher partial, uncomfortable
        };

        const freq = scarFreqs[scarKey] || 73;

        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;

        const gain = this.ctx.createGain();
        const now = this.ctx.currentTime;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.025, now + 3);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start();

        this._scarOscs.push({ osc, gain, key: scarKey });

        // Compress older scar tones — they recede, not disappear
        this._compressScarTones();
    }

    /**
     * Dynamic compression: as scars accumulate, older ones get quieter.
     * Total scar volume is capped. Each new scar pushes older ones down.
     * The sonic texture stays dense but never becomes cacophonous.
     */
    _compressScarTones() {
        if (!this.ctx) return;

        const count = this._scarOscs.length;
        if (count <= 2) return; // no compression needed for 1-2 scars

        // Total budget: 0.05 gain shared among all scars
        // Newest scar gets most, oldest gets least
        const totalBudget = 0.05;
        const now = this.ctx.currentTime;

        for (let i = 0; i < count; i++) {
            const age = count - 1 - i; // 0 = newest, count-1 = oldest
            // Exponential decay: newest = full share, oldest = compressed
            const share = Math.pow(0.6, age);
            const normalizedShare = share / this._sumGeometric(count, 0.6);
            const targetGain = totalBudget * normalizedShare;

            this._scarOscs[i].gain.gain.linearRampToValueAtTime(
                Math.max(0.003, targetGain), // never fully silent
                now + 2
            );
        }
    }

    _sumGeometric(n, ratio) {
        let sum = 0;
        for (let i = 0; i < n; i++) sum += Math.pow(ratio, i);
        return sum;
    }

    // ═══════════════════════════════════════
    // STATE UPDATE — reactive soundscape
    // ═══════════════════════════════════════

    /**
     * Update all layers based on current game state.
     * Called every turn after state changes.
     */
    update(state) {
        if (!this.ctx || !this.started) return;

        const vol = (state.latent_vars?.volatility || 0) / 100;
        const rep = (state.latent_vars?.repression_index || 0) / 100;
        const pol = (state.latent_vars?.polarization || 0) / 100;
        const brent = (state.latent_vars?.brent || 0) / 100;

        // Drone: filter frequency shifts with polarization
        if (this._drone) {
            this._drone.filter.frequency.linearRampToValueAtTime(
                80 + pol * 200,
                this.ctx.currentTime + 0.5
            );
            this._drone.gain.gain.linearRampToValueAtTime(
                0.04 + vol * 0.08,
                this.ctx.currentTime + 0.5
            );
        }

        // Tension: volume grows with repression
        if (this._tensionGain) {
            this._tensionGain.gain.linearRampToValueAtTime(
                rep * 0.12,
                this.ctx.currentTime + 1
            );
        }

        // Static: burst frequency tied to volatility
        if (this._staticNode) {
            this._staticNode.gain.gain.linearRampToValueAtTime(
                vol * 0.15,
                this.ctx.currentTime + 0.3
            );

            // Random crackle bursts, more frequent with volatility
            if (vol > 0.2 && Math.random() < vol * 0.3) {
                this._fireStaticBurst();
            }
        }

        // Ticker: rate increases with brent/market pressure
        const newRate = Math.max(200, 2000 - brent * 1800);
        if (Math.abs(newRate - this._tickerRate) > 100) {
            this._tickerRate = newRate;
            clearInterval(this._tickerInterval);
            this._tickerInterval = setInterval(() => this._fireTick(), this._tickerRate);
        }

        // Scar tone maintenance: recompress if scars have decayed
        if (this._scarOscs.length > 2) {
            this._compressScarTones();
        }
    }

    // ═══════════════════════════════════════
    // RHYTHM — turn type affects ambience
    // ═══════════════════════════════════════

    /**
     * Adjust audio for turn rhythm type.
     */
    setRhythm(rhythm) {
        if (!this.ctx || !this.started) return;

        const now = this.ctx.currentTime;
        switch (rhythm) {
            case 'calm':
                this.masterGain.gain.linearRampToValueAtTime(0.08, now + 1);
                if (this._drone) this._drone.filter.Q.linearRampToValueAtTime(0.3, now + 1);
                break;
            case 'turbulent':
                this.masterGain.gain.linearRampToValueAtTime(0.22, now + 0.5);
                if (this._drone) this._drone.filter.Q.linearRampToValueAtTime(2.0, now + 0.5);
                break;
            case 'opaque':
                this.masterGain.gain.linearRampToValueAtTime(0.05, now + 2);
                break;
            case 'inertial':
                this.masterGain.gain.linearRampToValueAtTime(0.18, now + 0.3);
                break;
        }
    }

    // ═══════════════════════════════════════
    // CONTROLS
    // ═══════════════════════════════════════

    mute() {
        this._muted = true;
        if (this.masterGain) {
            this.masterGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.3);
        }
    }

    unmute() {
        this._muted = false;
        if (this.masterGain) {
            this.masterGain.gain.linearRampToValueAtTime(
                this._masterVolume, this.ctx.currentTime + 0.3
            );
        }
    }

    toggleMute() {
        if (this._muted) this.unmute(); else this.mute();
        return !this._muted;
    }

    destroy() {
        clearInterval(this._tickerInterval);
        for (const s of this._scarOscs) {
            try { s.osc.stop(); } catch {}
        }
        if (this.ctx) this.ctx.close();
    }
}
