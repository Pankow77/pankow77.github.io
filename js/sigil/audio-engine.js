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
 *   - Sub-bass hit: context-sensitive 40Hz punch on choice
 *   - Scar tones: hierarchical (foreground/midlayer/cluster)
 *   - Theater signatures: each theater has a timbral fingerprint
 *   - Pre-echo click: micro-anticipation sound
 *
 * Scar Architecture 2.0:
 *   Scars 1-2: foreground (audible, unstable)
 *   Scars 3-4: mid-layer (filtered, less dynamic)
 *   Scars 5+:  merged into single modulated cluster drone
 *
 * State-reactive. The player never hears the same soundscape twice.
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

        // Scar architecture
        this._scarOscs = [];        // individual scar oscillators
        this._scarCluster = null;   // merged drone for scars 5+
        this._scarClusterCount = 0;

        // Theater signature
        this._currentTheater = null;

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
        const bufferSize = this.ctx.sampleRate * 2;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;

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
        osc.frequency.value = 42;

        const osc2 = this.ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.value = 43.5;

        const gain = this.ctx.createGain();
        gain.gain.value = 0;

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
        const bufferSize = this.ctx.sampleRate * 0.05;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            const env = Math.exp(-i / (bufferSize * 0.1));
            data[i] = (Math.random() * 2 - 1) * env;
        }

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
        this._tickerRate = 2000;
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
    // ACTION: Pre-echo click
    // ═══════════════════════════════════════

    /**
     * Micro-click before the freeze. 8ms. Subcortical anticipation.
     * The player flinches before they know why.
     */
    preEchoClick() {
        if (!this.ctx || this._muted) return;

        const now = this.ctx.currentTime;

        // Short impulse — filtered click
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = 1200;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.008);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.01);
    }

    // ═══════════════════════════════════════
    // ACTION: Sub-bass hit (context-sensitive)
    // ═══════════════════════════════════════

    /**
     * Context-sensitive sub-bass hit with theater timbral signature.
     * Same action, different context = different sound.
     */
    subBassHit(state, theater) {
        if (!this.ctx || this._muted) return;

        const now = this.ctx.currentTime;
        const scarCount = this._scarOscs.length + this._scarClusterCount;
        const vol = (state?.latent_vars?.volatility || 0) / 100;
        const rep = (state?.latent_vars?.repression_index || 0) / 100;

        // Base frequency drops with scars
        const freq = Math.max(28, 40 - scarCount * 2);
        const duration = 0.12 + rep * 0.04;

        // Theater timbral signature modifies the hit
        const sig = this._getTheaterSignature(theater);

        // Main tone
        const osc = this.ctx.createOscillator();
        osc.type = sig.waveform;
        osc.frequency.value = freq * sig.freqMult;

        // Theater-specific filter
        const filter = this.ctx.createBiquadFilter();
        filter.type = sig.filterType;
        filter.frequency.value = sig.filterFreq;
        filter.Q.value = sig.filterQ;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration * sig.tailMult);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + duration * sig.tailMult + 0.05);

        // Volatility harmonic
        if (vol > 0.3) {
            const harmonic = this.ctx.createOscillator();
            harmonic.type = 'sawtooth';
            harmonic.frequency.value = freq * 1.5;

            const hGain = this.ctx.createGain();
            hGain.gain.setValueAtTime(vol * 0.08, now);
            hGain.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.7);

            harmonic.connect(hGain);
            hGain.connect(this.masterGain);
            harmonic.start(now);
            harmonic.stop(now + duration);
        }
    }

    // ═══════════════════════════════════════
    // THEATER SIGNATURES — timbral identity
    // ═══════════════════════════════════════

    /**
     * Each theater has a timbral fingerprint.
     * Same causal graph, different sonic space.
     *
     *   Hormuz:  sub + metallic resonance (oil, steel, desert)
     *   Sahel:   warm granular noise (dust, heat, voices)
     *   BlackSea: slow cold oscillation (water, distance, fog)
     *   Cross:   dry, mathematical (data, cables, abstraction)
     */
    _getTheaterSignature(theater) {
        const signatures = {
            hormuz: {
                waveform: 'sine',
                freqMult: 1.0,
                filterType: 'bandpass',
                filterFreq: 200,
                filterQ: 4,          // metallic resonance
                tailMult: 1.0,
                droneShift: 0,       // Hz offset on drone
                staticBias: 0.8,     // less crackle
            },
            sahel: {
                waveform: 'triangle',
                freqMult: 1.05,      // slightly warm
                filterType: 'lowpass',
                filterFreq: 300,
                filterQ: 0.5,        // soft, granular
                tailMult: 1.3,       // longer tail (heat dissipates slowly)
                droneShift: +15,
                staticBias: 1.2,     // more crackle (dry air)
            },
            blacksea: {
                waveform: 'sine',
                freqMult: 0.95,      // slightly cold
                filterType: 'lowpass',
                filterFreq: 180,
                filterQ: 1.0,        // rounded, distant
                tailMult: 1.6,       // long tail (water reverb)
                droneShift: -10,
                staticBias: 0.5,     // less crackle (wet)
            },
            cross: {
                waveform: 'square',
                freqMult: 1.0,
                filterType: 'highpass',
                filterFreq: 60,
                filterQ: 0.3,        // dry, mathematical
                tailMult: 0.7,       // short, clipped
                droneShift: 0,
                staticBias: 1.0,
            }
        };

        return signatures[theater] || signatures.cross;
    }

    /**
     * Set active theater — modulates ambient layers.
     */
    setTheater(theater) {
        if (!this.ctx || !this.started || this._currentTheater === theater) return;
        this._currentTheater = theater;

        const sig = this._getTheaterSignature(theater);
        const now = this.ctx.currentTime;

        // Shift drone frequency for theater color
        if (this._drone) {
            this._drone.filter.frequency.linearRampToValueAtTime(
                120 + sig.droneShift,
                now + 2
            );
        }
    }

    // ═══════════════════════════════════════
    // ACTION: Post-consequence compression
    // ═══════════════════════════════════════

    postConsequenceCompress() {
        if (!this.ctx || !this.started || this._muted) return;

        const now = this.ctx.currentTime;
        const current = this.masterGain.gain.value;

        this.masterGain.gain.setValueAtTime(current, now);
        this.masterGain.gain.linearRampToValueAtTime(current * 0.6, now + 0.05);
        this.masterGain.gain.linearRampToValueAtTime(current, now + 0.35);
    }

    // ═══════════════════════════════════════
    // ACTION: Micro-crisis sound
    // ═══════════════════════════════════════

    crisisSound() {
        if (!this.ctx || this._muted) return;

        const now = this.ctx.currentTime;

        const freqs = [220, 311];
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
    // SCAR TONES — hierarchical architecture
    // ═══════════════════════════════════════

    /**
     * Scar tone architecture 2.0:
     *   Scars 1-2: FOREGROUND — individual oscs, audible, unstable
     *   Scars 3-4: MID-LAYER — filtered, lowpass < 2kHz, less LFO
     *   Scars 5+:  CLUSTER — merged into single modulated drone
     *
     * New scars bite. Old scars become weight.
     */
    addScarTone(scarKey) {
        if (!this.ctx || this._muted) return;

        const scarFreqs = {
            polarization_scar: 67,
            repression_scar: 89,
            volatility_scar: 113,
            brent_scar: 157,
        };

        const freq = scarFreqs[scarKey] || 73;
        const totalScars = this._scarOscs.length + this._scarClusterCount;
        const now = this.ctx.currentTime;

        if (totalScars < 2) {
            // FOREGROUND: raw, direct, biting
            this._addForegroundScar(freq, now);
        } else if (totalScars < 4) {
            // MID-LAYER: filtered, compressed psychoacoustically
            this._addMidLayerScar(freq, now);
        } else {
            // CLUSTER: merge into drone
            this._mergeIntoCluster(freq, now);
        }
    }

    _addForegroundScar(freq, now) {
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;

        // LFO for instability
        const lfo = this.ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.3; // slow wobble
        const lfoGain = this.ctx.createGain();
        lfoGain.gain.value = 3; // ±3Hz modulation
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        lfo.start();

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.025, now + 3);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start();

        this._scarOscs.push({ osc, gain, lfo, key: 'foreground', freq, layer: 'foreground' });
    }

    _addMidLayerScar(freq, now) {
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;

        // Lowpass filter: cuts high frequencies, makes it feel "older"
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 800; // psychoacoustic compression: no highs > 800Hz
        filter.Q.value = 0.5;

        // Reduced LFO — less dynamic, more static weight
        const lfo = this.ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.1; // very slow
        const lfoGain = this.ctx.createGain();
        lfoGain.gain.value = 1; // ±1Hz — barely moving
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        lfo.start();

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.015, now + 3); // quieter than foreground

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        osc.start();

        this._scarOscs.push({ osc, gain, lfo, filter, key: 'midlayer', freq, layer: 'midlayer' });

        // Compress foreground scars down slightly
        this._compressForeground(now);
    }

    _mergeIntoCluster(freq, now) {
        this._scarClusterCount++;

        if (!this._scarCluster) {
            // Create the cluster drone — a single modulated texture
            // representing cumulative memory
            const osc1 = this.ctx.createOscillator();
            osc1.type = 'sine';
            osc1.frequency.value = freq;

            const osc2 = this.ctx.createOscillator();
            osc2.type = 'sine';
            osc2.frequency.value = freq + 1.5; // beating

            // Heavy lowpass — this is deep weight, not sharp sound
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 400;
            filter.Q.value = 0.3;

            // Slow amplitude modulation — breathing
            const amLfo = this.ctx.createOscillator();
            amLfo.type = 'sine';
            amLfo.frequency.value = 0.05; // 20-second cycle
            const amGain = this.ctx.createGain();
            amGain.gain.value = 0.005;

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.02, now + 5);

            osc1.connect(filter);
            osc2.connect(filter);
            filter.connect(gain);
            amLfo.connect(amGain);
            amGain.connect(gain.gain);
            gain.connect(this.masterGain);
            osc1.start();
            osc2.start();
            amLfo.start();

            this._scarCluster = { osc1, osc2, filter, amLfo, gain, baseFreq: freq };
        } else {
            // Add frequency to cluster — shift the beating pattern
            // Each new scar makes the cluster slightly more complex
            const newFreq = (this._scarCluster.baseFreq + freq) / 2;
            const beating = 1.5 + this._scarClusterCount * 0.3;

            this._scarCluster.osc1.frequency.linearRampToValueAtTime(newFreq, now + 2);
            this._scarCluster.osc2.frequency.linearRampToValueAtTime(newFreq + beating, now + 2);
            this._scarCluster.baseFreq = newFreq;

            // Cluster gets slightly louder but never past 0.03
            const newGain = Math.min(0.03, 0.02 + this._scarClusterCount * 0.002);
            this._scarCluster.gain.gain.linearRampToValueAtTime(newGain, now + 3);
        }

        // Compress mid-layer scars further
        this._compressMidLayer(now);
    }

    _compressForeground(now) {
        for (const scar of this._scarOscs) {
            if (scar.layer === 'foreground') {
                scar.gain.gain.linearRampToValueAtTime(0.018, now + 2);
            }
        }
    }

    _compressMidLayer(now) {
        for (const scar of this._scarOscs) {
            if (scar.layer === 'midlayer') {
                scar.gain.gain.linearRampToValueAtTime(0.008, now + 2);
                if (scar.filter) {
                    scar.filter.frequency.linearRampToValueAtTime(400, now + 2);
                }
            }
            if (scar.layer === 'foreground') {
                scar.gain.gain.linearRampToValueAtTime(0.012, now + 2);
            }
        }
    }

    // ═══════════════════════════════════════
    // STATE UPDATE — reactive soundscape
    // ═══════════════════════════════════════

    update(state) {
        if (!this.ctx || !this.started) return;

        const vol = (state.latent_vars?.volatility || 0) / 100;
        const rep = (state.latent_vars?.repression_index || 0) / 100;
        const pol = (state.latent_vars?.polarization || 0) / 100;
        const brent = (state.latent_vars?.brent || 0) / 100;
        const now = this.ctx.currentTime;

        // Theater-specific static bias
        const sig = this._getTheaterSignature(this._currentTheater);
        const staticBias = sig.staticBias || 1.0;

        // Drone
        if (this._drone) {
            this._drone.filter.frequency.linearRampToValueAtTime(
                80 + pol * 200, now + 0.5
            );
            this._drone.gain.gain.linearRampToValueAtTime(
                0.04 + vol * 0.08, now + 0.5
            );
        }

        // Tension
        if (this._tensionGain) {
            this._tensionGain.gain.linearRampToValueAtTime(rep * 0.12, now + 1);
        }

        // Static (with theater bias)
        if (this._staticNode) {
            this._staticNode.gain.gain.linearRampToValueAtTime(
                vol * 0.15 * staticBias, now + 0.3
            );
            if (vol > 0.2 && Math.random() < vol * 0.3 * staticBias) {
                this._fireStaticBurst();
            }
        }

        // Ticker
        const newRate = Math.max(200, 2000 - brent * 1800);
        if (Math.abs(newRate - this._tickerRate) > 100) {
            this._tickerRate = newRate;
            clearInterval(this._tickerInterval);
            this._tickerInterval = setInterval(() => this._fireTick(), this._tickerRate);
        }

        // Scar cluster modulation: polarization affects the breathing speed
        if (this._scarCluster) {
            this._scarCluster.amLfo.frequency.linearRampToValueAtTime(
                0.05 + pol * 0.1, now + 1
            );
        }
    }

    // ═══════════════════════════════════════
    // RHYTHM
    // ═══════════════════════════════════════

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
            try { s.lfo.stop(); } catch {}
        }
        if (this._scarCluster) {
            try { this._scarCluster.osc1.stop(); } catch {}
            try { this._scarCluster.osc2.stop(); } catch {}
            try { this._scarCluster.amLfo.stop(); } catch {}
        }
        if (this.ctx) this.ctx.close();
    }
}
