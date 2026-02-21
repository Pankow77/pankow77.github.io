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
        this._lastState = null;
        this._driftPhase = 0;
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
     * Cinematic choice sequence: freeze → stamp → propagation wave.
     * 1200ms total. Called when player selects an option.
     */
    async cinematicChoice(actionId, arcs) {
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

        // Phase 4: Propagation wave — arcs light up sequentially
        if (arcs && arcs.length > 0) {
            await this._propagateArcs(arcs);
        }
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
     * Sequential arc propagation — each arc lights up 100ms apart.
     * Phase labels shown. This is the causal chain made visible.
     */
    async _propagateArcs(arcs) {
        this._propagationLayer.innerHTML = '';
        this._propagationLayer.classList.add('active');

        for (const arc of arcs) {
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

            // Sequential reveal
            await this._delay(30);
            arcEl.classList.add('visible');
            await this._delay(100);
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
     * Add permanent scar mark to the visual layer.
     * After 6-7 turns, the world should look damaged.
     */
    updateScars(scars) {
        if (!scars || Object.keys(scars).length === 0) {
            this._scarOverlay.className = 'vfx-layer';
            return;
        }

        let totalWeight = 0;
        for (const scar of Object.values(scars)) {
            totalWeight += scar.strength * scar.modifier;
        }

        // Progressive visual damage
        const damage = Math.min(1, totalWeight / 5);
        this._scarOverlay.style.setProperty('--scar-intensity', damage);
        this._scarOverlay.classList.add('active');

        // Affect body styling
        document.body.style.setProperty('--scar-damage', damage);
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
     */
    setRhythm(rhythm) {
        document.body.classList.remove(
            'rhythm-calm', 'rhythm-turbulent', 'rhythm-opaque', 'rhythm-inertial'
        );
        document.body.classList.add(`rhythm-${rhythm}`);
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
