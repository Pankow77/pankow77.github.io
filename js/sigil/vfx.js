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

        // Phase 2: Frame stamp overlay
        const label = this._actionLabel(actionId);
        this._frameOverlay.textContent = label;
        this._frameOverlay.classList.add('active');
        await this._delay(400);
        this._frameOverlay.classList.remove('active');

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

            // Micro-jitter: 20–40ms reveal onset (organic variation)
            const revealJitter = 20 + Math.floor(Math.random() * 20);
            await this._delay(revealJitter);
            arcEl.classList.add('visible');

            // Micro-jitter: 70–130ms between arcs (never mechanical)
            const gapJitter = 70 + Math.floor(Math.random() * 60);
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
     *   - Duration: 130–170ms (±12ms jitter)
     *   - Brightness: random spike 1.2–1.8 or dip 0.4–0.7
     *   - Hue: random rotation 30–180deg
     *   - 1-frame desync: translateX micro-offset
     */
    async setRhythm(rhythm) {
        const changed = this._previousRhythm && this._previousRhythm !== rhythm;

        // Procedural rhythm transition glitch — never the same twice
        if (changed) {
            const duration = 138 + Math.floor(Math.random() * 24); // 138–162ms
            const bright = Math.random() > 0.5
                ? (1.2 + Math.random() * 0.6)   // spike
                : (0.4 + Math.random() * 0.3);   // dip
            const hue = 30 + Math.floor(Math.random() * 150); // 30–180deg
            const offsetX = (Math.random() - 0.5) * 4; // ±2px desync

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
