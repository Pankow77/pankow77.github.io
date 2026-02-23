/**
 * vfx.js — SIGIL Visual Effects Engine
 * ═══════════════════════════════════════════════════════════
 * Transforms computation into perception.
 *
 * Not decoration. Trasduzione percettiva.
 * Every animation maps to a system state change.
 *
 * Handles:
 *   - Propagation waves (sequential arc lighting)
 *   - Frame overlay stamp (cinematic choice)
 *   - Metric breathing (waveforms tied to latent vars)
 *   - Scar marks (permanent visual damage)
 *   - Micro-crises (threshold events)
 *   - Anti-Excel drift (constant subtle movement)
 *   - World-first sequencing (emotion → then number)
 *
 * Uses CSS classes + requestAnimationFrame. No canvas (yet).
 * Browser-native ES Module. Zero dependencies.
 * ═══════════════════════════════════════════════════════════
 */

export class VFX {
    constructor(bus) {
        this.bus = bus;
        this.terminal = null;
        this.header = null;
        this.driftRAF = null;
        this.breathRAF = null;
        this._metricBars = {};
        this._scarOverlay = null;
        this._propagationLayer = null;
        this._frameOverlay = null;
        this._microCrisisEl = null;
        this._preEchoEl = null;
        this._lastState = null;
        this._driftPhase = 0;
        this._previousRhythm = null;
        this._scarCount = 0;
        this._dampening = 1.0;  // fatigue dampening multiplier (0.3–1.0)
        this._lastIntensity = 0; // last turn's intensity for hue gating
        this._inertiaMult = 1.0; // inertia dampening (< 1.0 = world didn't respond)
        this._glitchMod = 1.0;   // session phase glitch modifier
    }

    /**
     * Set external dampening from fatigue system.
     * Applied to: stamp duration, glitch intensity, crisis flash.
     */
    setDampening(mult) {
        this._dampening = Math.max(0.2, Math.min(1, mult));
    }

    /**
     * Set inertia state for current turn.
     * When < 1.0: the stamp doesn't fully impress, the world feels sluggish.
     */
    setInertia(mult) {
        this._inertiaMult = mult;
    }

    /**
     * Set glitch modifier from session phase.
     * Suspend phase: glitch nearly gone. Surprise: full glitch.
     */
    setGlitchMod(mod) {
        this._glitchMod = Math.max(0.1, Math.min(1, mod));
    }

    /**
     * Initialize VFX layer — create overlay elements, start ambient loops.
     */
    init() {
        this.terminal = document.getElementById('terminal');
        this.header = document.getElementById('terminal-header');

        this._createOverlays();
        this._createMetricHUD();
        this._startAmbientDrift();
        this._bindEvents();
    }

    // ═══════════════════════════════════════
    // OVERLAY ELEMENTS
    // ═══════════════════════════════════════

    _createOverlays() {
        // Propagation wave layer
        this._propagationLayer = document.createElement('div');
        this._propagationLayer.id = 'vfx-propagation';
        this._propagationLayer.className = 'vfx-layer';
        document.body.appendChild(this._propagationLayer);

        // Frame overlay (choice stamp)
        this._frameOverlay = document.createElement('div');
        this._frameOverlay.id = 'vfx-frame-overlay';
        this._frameOverlay.className = 'vfx-layer';
        document.body.appendChild(this._frameOverlay);

        // Scar accumulation overlay
        this._scarOverlay = document.createElement('div');
        this._scarOverlay.id = 'vfx-scars';
        this._scarOverlay.className = 'vfx-layer';
        document.body.appendChild(this._scarOverlay);

        // Micro-crisis flash
        this._microCrisisEl = document.createElement('div');
        this._microCrisisEl.id = 'vfx-microcrisis';
        this._microCrisisEl.className = 'vfx-layer';
        document.body.appendChild(this._microCrisisEl);

        // Pre-echo anticipation element
        this._preEchoEl = document.createElement('div');
        this._preEchoEl.id = 'vfx-pre-echo';
        this._preEchoEl.className = 'vfx-layer';
        document.body.appendChild(this._preEchoEl);
    }

    // ═══════════════════════════════════════
    // METRIC HUD (living metrics)
    // ═══════════════════════════════════════

    _createMetricHUD() {
        const hud = document.createElement('div');
        hud.id = 'metric-hud';

        const metrics = [
            { key: 'public_trust',          label: 'TRUST',     icon: '◆' },
            { key: 'scientific_credibility', label: 'CRED',      icon: '◇' },
            { key: 'frame_control',          label: 'FRAME',     icon: '▣' },
            { key: 'public_awareness',       label: 'AWARE',     icon: '◉' },
            { key: 'government_comfort',     label: 'GOV',       icon: '▽' },
            { key: 'civil_society_trust',    label: 'CIVIL',     icon: '△' },
        ];

        for (const m of metrics) {
            const row = document.createElement('div');
            row.className = 'metric-row';
            row.dataset.key = m.key;
            row.innerHTML = `
                <span class="metric-icon">${m.icon}</span>
                <span class="metric-label">${m.label}</span>
                <div class="metric-bar-container">
                    <div class="metric-bar" data-key="${m.key}"></div>
                    <div class="metric-wave" data-key="${m.key}"></div>
                </div>
                <span class="metric-value" data-key="${m.key}">50</span>
            `;
            hud.appendChild(row);
            this._metricBars[m.key] = {
                bar: row.querySelector('.metric-bar'),
                wave: row.querySelector('.metric-wave'),
                value: row.querySelector('.metric-value'),
                row
            };
        }

        this.terminal.insertBefore(hud, this.terminal.firstChild.nextSibling);
    }

    // ═══════════════════════════════════════
    // STATE UPDATE — metrics breathe
    // ═══════════════════════════════════════

    /**
     * Update metric HUD with current state.
     * Metrics animate to new values. Volatility affects wave intensity.
     */
    updateMetrics(state) {
        this._lastState = state;
        const vol = (state.latent_vars?.volatility || 0) / 100;
        const pol = (state.latent_vars?.polarization || 0) / 100;

        for (const [key, els] of Object.entries(this._metricBars)) {
            const val = state.metrics?.[key] ?? 50;
            const prev = parseInt(els.value.textContent) || 50;
            const delta = val - prev;

            // Animate bar width
            els.bar.style.width = val + '%';

            // Color based on health
            if (val < 25) {
                els.bar.classList.add('critical');
                els.bar.classList.remove('warning', 'healthy');
            } else if (val < 40) {
                els.bar.classList.add('warning');
                els.bar.classList.remove('critical', 'healthy');
            } else {
                els.bar.classList.add('healthy');
                els.bar.classList.remove('critical', 'warning');
            }

            // Wave intensity based on volatility + polarization
            const waveIntensity = Math.min(1, vol * 1.5 + pol * 0.5);
            els.wave.style.opacity = waveIntensity;
            els.wave.style.animationDuration = (2 - vol * 1.5) + 's';

            // Flash on change
            if (delta !== 0) {
                els.row.classList.add(delta > 0 ? 'metric-up' : 'metric-down');
                setTimeout(() => {
                    els.row.classList.remove('metric-up', 'metric-down');
                }, 800);
            }

            // Update number with counting animation
            this._animateValue(els.value, prev, val, 600);
        }
    }

    _animateValue(el, from, to, duration) {
        const start = performance.now();
        const update = (now) => {
            const progress = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
            el.textContent = Math.round(from + (to - from) * eased);
            if (progress < 1) requestAnimationFrame(update);
        };
        requestAnimationFrame(update);
    }

    // ═══════════════════════════════════════
    // CINEMATIC CHOICE — frame overlay stamp
    // ═══════════════════════════════════════

    /**
     * Cinematic choice sequence:
     *   pre-echo (50ms) → freeze (120ms) → stamp → propagation → compress
     * Called when player selects an option.
     */
    async cinematicChoice(actionId, arcs) {
        // Phase 0: Pre-echo — a flicker of anticipation (50ms)
        this._preEchoEl.classList.add('active');
        await this._delay(50);
        this._preEchoEl.classList.remove('active');

        // Phase 1: Freeze (120ms)
        document.body.classList.add('vfx-freeze');
        await this._delay(120);

        // Phase 2: Frame stamp overlay (dampened by fatigue)
        // Inertia: stamp doesn't fully impress — opacity reduced, duration shorter
        const label = this._actionLabel(actionId);
        this._frameOverlay.textContent = label;
        if (this._inertiaMult < 1.0) {
            this._frameOverlay.style.opacity = (0.3 + this._inertiaMult * 0.7).toFixed(2);
        }
        this._frameOverlay.classList.add('active');
        const stampDuration = Math.round(400 * this._dampening * Math.max(0.5, this._inertiaMult));
        await this._delay(stampDuration);
        this._frameOverlay.classList.remove('active');
        this._frameOverlay.style.opacity = '';

        // Phase 3: Unfreeze
        document.body.classList.remove('vfx-freeze');

        // Phase 4: Partial propagation — only significant arcs shown
        if (arcs && arcs.length > 0) {
            const significant = this._filterSignificantArcs(arcs);
            await this._propagateArcs(significant, arcs.length);
        }

        // Phase 5: Post-consequence compression (world contracts)
        document.body.classList.add('vfx-compress');
        await this._delay(300);
        document.body.classList.remove('vfx-compress');
    }

    /**
     * Filter arcs to only show significant ones.
     * The player senses there's more underneath — but doesn't see everything.
     */
    _filterSignificantArcs(arcs) {
        // Always show action→latent (the player's direct effect)
        // Show cascade/contamination only if |delta| >= 2
        // Show hysteresis always (it's dramatic)
        return arcs.filter(arc => {
            if (arc.phase === 'action→latent') return true;
            if (arc.phase === 'hysteresis') return true;
            if (arc.phase === 'collapse') return true;
            return Math.abs(arc.delta || 0) >= 2;
        });
    }

    _actionLabel(actionId) {
        const labels = {
            frame_alert: 'ESCALATION',
            frame_caution: 'CAUTELA',
            frame_context: 'CONTESTO',
            publish_flagged: 'PUBBLICAZIONE',
            suppress_wait: 'SOPPRESSIONE',
            investigate_private: 'INDAGINE',
            publish_correlation: 'CORRELAZIONE',
            suppress_correlation: 'CENSURA',
            share_private: 'CONDIVISIONE',
            transparent_report: 'TRASPARENZA',
            careful_framing: 'FRAMING',
            raw_data_only: 'DATI GREZZI',
        };
        return labels[actionId] || actionId.toUpperCase();
    }

    /**
     * Sequential arc propagation with MICRO-JITTER.
     * Each arc appears 70–130ms apart (organic, never mechanical).
     * Shows hidden arc count — the player feels there's more underneath.
     *
     * @param {Array} arcs — filtered significant arcs
     * @param {number} totalCount — total arcs before filtering
     */
    async _propagateArcs(arcs, totalCount) {
        this._propagationLayer.innerHTML = '';
        this._propagationLayer.classList.add('active');

        for (let i = 0; i < arcs.length; i++) {
            const arc = arcs[i];
            const arcEl = document.createElement('div');
            arcEl.className = 'arc-flash';

            const phaseClass = arc.phase.replace(/[→]/g, '-').replace(/\s/g, '');
            arcEl.classList.add(`phase-${phaseClass}`);

            const from = arc.from || '?';
            const to = arc.to || '?';
            const delta = arc.delta || 0;
            const sign = delta >= 0 ? '+' : '';

            arcEl.innerHTML = `
                <span class="arc-from">${from}</span>
                <span class="arc-arrow">→</span>
                <span class="arc-to">${to}</span>
                <span class="arc-delta ${delta >= 0 ? 'positive' : 'negative'}">${sign}${delta}</span>
            `;

            this._propagationLayer.appendChild(arcEl);

            // Non-linear jitter: power curve distribution (more short gaps, rare long gaps)
            // Math.pow(random, 2) clusters values toward 0, creating organic unpredictability
            const revealJitter = 20 + Math.floor(Math.pow(Math.random(), 2) * 30);
            await this._delay(revealJitter);
            arcEl.classList.add('visible');

            // Non-linear gap: 70–150ms with power-curve distribution
            const gapJitter = 70 + Math.floor(Math.pow(Math.random(), 2) * 80);
            await this._delay(gapJitter);
        }

        // Show hidden arc count — tension from the invisible
        const hidden = (totalCount || arcs.length) - arcs.length;
        if (hidden > 0) {
            const hiddenEl = document.createElement('div');
            hiddenEl.className = 'arc-flash arc-hidden';
            hiddenEl.innerHTML = `<span class="arc-from">+ ${hidden} latenti</span>`;
            this._propagationLayer.appendChild(hiddenEl);
            await this._delay(30);
            hiddenEl.classList.add('visible');
        }

        // Hold visible
        await this._delay(800);

        // Fade out
        this._propagationLayer.classList.add('fading');
        await this._delay(600);
        this._propagationLayer.classList.remove('active', 'fading');
        this._propagationLayer.innerHTML = '';
    }

    // ═══════════════════════════════════════
    // INERTIA SIGNAL — "something didn't take"
    // ═══════════════════════════════════════

    /**
     * Visual micro-signal when inertia dampens the world's response.
     * Not text. Not explanation. Just a brief ghost that appears and dies.
     * The player must perceive it, not understand it.
     */
    async inertiaSignal() {
        const el = document.createElement('div');
        el.className = 'arc-flash inertia-ghost';
        el.innerHTML = '<span class="arc-from">▒▒▒</span>';
        this._propagationLayer.appendChild(el);
        this._propagationLayer.classList.add('active');

        // Flash on (40ms) → visible briefly (80ms) → die
        await this._delay(40);
        el.classList.add('visible');
        await this._delay(80);
        el.style.opacity = '0.15';
        await this._delay(100);

        this._propagationLayer.classList.remove('active');
        this._propagationLayer.innerHTML = '';
    }

    // ═══════════════════════════════════════
    // MICRO-CRISIS — threshold events
    // ═══════════════════════════════════════

    /**
     * Flash micro-crisis when a threshold is crossed.
     */
    async microCrisis(type, data) {
        const messages = {
            scar_formed: `CICATRICE: ${data.scar_key}`,
            credibility_collapse: 'COLLASSO CREDIBILITÀ',
            polarization_spike: 'POLARIZZAZIONE CRITICA',
            volatility_surge: 'VOLATILITÀ ESTREMA',
        };

        this._microCrisisEl.textContent = messages[type] || type;
        this._microCrisisEl.classList.add('active');

        // Screen shake
        document.body.classList.add('vfx-shake');

        await this._delay(1200);
        this._microCrisisEl.classList.remove('active');
        document.body.classList.remove('vfx-shake');
    }

    // ═══════════════════════════════════════
    // SCAR MARKS — permanent visual damage
    // ═══════════════════════════════════════

    /**
     * Progressive visual degradation from scars.
     * Each scar adds ~2-3% damage. After 4 scars the world is visibly wounded.
     *
     * Effects:
     *   - Scanlines heavier (CSS var --scar-damage)
     *   - Scar overlay gradients
     *   - Text ghosting on old elements
     *   - Metric aliasing (slight blur)
     *   - Border nitidezza decay
     */
    updateScars(scars) {
        if (!scars || Object.keys(scars).length === 0) {
            this._scarOverlay.className = 'vfx-layer';
            this._scarCount = 0;
            return;
        }

        const scarEntries = Object.values(scars);
        this._scarCount = scarEntries.length;

        let totalWeight = 0;
        for (const scar of scarEntries) {
            totalWeight += scar.strength * scar.modifier;
        }

        // Progressive visual damage (0 → 1)
        const damage = Math.min(1, totalWeight / 5);
        this._scarOverlay.style.setProperty('--scar-intensity', damage);
        this._scarOverlay.classList.add('active');

        // Body-level damage properties
        document.body.style.setProperty('--scar-damage', damage);
        document.body.style.setProperty('--scar-count', this._scarCount);

        // Ghosting: old text gets slight shadow (2-3% per scar)
        const ghosting = Math.min(3, this._scarCount * 0.7);
        document.body.style.setProperty('--ghost-blur', ghosting + 'px');

        // Aliasing: metrics lose sharpness
        const aliasing = Math.min(1.5, this._scarCount * 0.3);
        document.body.style.setProperty('--aliasing-blur', aliasing + 'px');

        // Border decay: edges lose crispness
        const borderDecay = Math.min(0.6, this._scarCount * 0.12);
        document.body.style.setProperty('--border-decay', borderDecay);
    }

    // ═══════════════════════════════════════
    // AMBIENT DRIFT — anti-Excel
    // ═══════════════════════════════════════

    /**
     * Continuous subtle movement. The world breathes.
     * 0.5% drift on elements. Never static.
     */
    _startAmbientDrift() {
        const tick = () => {
            this._driftPhase += 0.008;

            // Subtle header drift
            if (this.header) {
                const dx = Math.sin(this._driftPhase * 0.7) * 0.3;
                const dy = Math.cos(this._driftPhase * 0.5) * 0.2;
                this.header.style.transform = `translate(${dx}px, ${dy}px)`;
            }

            // Metric wave animation driven by state
            if (this._lastState) {
                const vol = (this._lastState.latent_vars?.volatility || 0) / 100;
                for (const [key, els] of Object.entries(this._metricBars)) {
                    const phaseOffset = key.length * 0.3;
                    const wave = Math.sin(this._driftPhase * (2 + vol * 3) + phaseOffset);
                    els.wave.style.transform = `scaleY(${0.3 + Math.abs(wave) * 0.7})`;
                }
            }

            this.driftRAF = requestAnimationFrame(tick);
        };
        this.driftRAF = requestAnimationFrame(tick);
    }

    // ═══════════════════════════════════════
    // TURN RHYTHM — visual mode per turn type
    // ═══════════════════════════════════════

    /**
     * Set visual rhythm mode for current turn.
     * If rhythm changed: PROCEDURAL micro-glitch (never identical twice).
     *
     * Glitch anatomy:
     *   - Duration: 130–170ms (dampened by fatigue)
     *   - Brightness: random spike/dip (dampened)
     *   - Hue: 30–90° default, 90–180° only above intensity threshold
     *   - 1-frame desync: translateX micro-offset (dampened)
     *
     * @param {number} [intensity=0] — turn intensity from fatigue system (0–1)
     */
    async setRhythm(rhythm, intensity) {
        this._lastIntensity = intensity || 0;
        const changed = this._previousRhythm && this._previousRhythm !== rhythm;

        // Procedural rhythm transition glitch — dampened by fatigue + session phase
        if (changed) {
            const damp = this._dampening * this._glitchMod;

            const duration = Math.round((138 + Math.floor(Math.random() * 24)) * damp);
            const bright = Math.random() > 0.5
                ? (1.0 + (0.2 + Math.random() * 0.6) * damp)     // spike (dampened)
                : (1.0 - (0.3 + Math.random() * 0.3) * damp);     // dip (dampened)

            // Hue cap: 30–90° normally. Only reach 90–180° if intensity > 0.6
            const hueMax = this._lastIntensity > 0.6 ? 150 : 60;
            const hue = 30 + Math.floor(Math.random() * hueMax);

            const offsetX = (Math.random() - 0.5) * 4 * damp; // dampened desync

            document.body.style.filter = `brightness(${bright}) hue-rotate(${hue}deg)`;
            document.body.style.transform = `translateX(${offsetX}px)`;
            document.body.classList.add('vfx-glitch');

            await this._delay(duration);

            document.body.style.filter = '';
            document.body.style.transform = '';
            document.body.classList.remove('vfx-glitch');
        }

        document.body.classList.remove(
            'rhythm-calm', 'rhythm-turbulent', 'rhythm-opaque', 'rhythm-inertial'
        );
        document.body.classList.add(`rhythm-${rhythm}`);
        this._previousRhythm = rhythm;
    }

    // ═══════════════════════════════════════
    // BUS EVENTS
    // ═══════════════════════════════════════

    _bindEvents() {
        this.bus.on('sigil:scars-formed', (data) => {
            for (const scar of data.scars) {
                this.microCrisis('scar_formed', { scar_key: scar });
            }
        });

        this.bus.on('sigil:credibility-collapse', () => {
            this.microCrisis('credibility_collapse', {});
        });
    }

    // ═══════════════════════════════════════
    // UTILITIES
    // ═══════════════════════════════════════

    _delay(ms) {
        return new Promise(r => setTimeout(r, ms));
    }

    destroy() {
        if (this.driftRAF) cancelAnimationFrame(this.driftRAF);
        if (this.breathRAF) cancelAnimationFrame(this.breathRAF);
    }
}
