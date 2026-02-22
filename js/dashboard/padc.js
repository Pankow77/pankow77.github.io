/**
 * PADC — Protocollo di Acquisizione Dati Comportamentali.
 * ═══════════════════════════════════════════════════════
 * "Le tue annotazioni non sono mai state private."
 *
 * Triggered once, between cycle 8 and 22.
 * Per-cycle probability roll: starts at 3%, rises 4% per cycle.
 * By cycle 22 it's guaranteed (3% + 14*4% = 59%). Usually fires ~12-16.
 *
 * The revelation:
 *   1. Overlay drops. System tells you it read everything.
 *   2. Shows extracted patterns from your annotations.
 *   3. Asks for a "testament" — a message for GHOST_8.
 *   4. CONTINUA or PASSA IL TESTIMONE.
 *
 * After PADC:
 *   - _padc.revealed = true
 *   - Every annotation written after is tagged "performative"
 *   - The system tracks if your writing style changes
 *   - This data feeds into the final profile
 */

import { Bus } from '../bus.js';
import { State } from './state.js';

const PADC_WINDOW_START = 8;
const PADC_WINDOW_END = 22;
const BASE_PROBABILITY = 0.03;
const PROB_INCREMENT = 0.04;

const STORAGE_KEY = 'sigil_annotations';

export const PADC = {

  _overlay: null,

  init(appEl) {
    this.appEl = appEl;

    Bus.on('cycle:advanced', (event) => {
      const cycle = event.payload.cycle;
      if (this._shouldTrigger(cycle)) {
        this._trigger(cycle);
      }
    });
  },

  _shouldTrigger(cycle) {
    if (State.get('_padc.revealed')) return false;
    if (cycle < PADC_WINDOW_START || cycle > PADC_WINDOW_END) return false;

    const prob = BASE_PROBABILITY + (cycle - PADC_WINDOW_START) * PROB_INCREMENT;
    return Math.random() < prob;
  },

  _trigger(cycle) {
    State.set('_padc.revealed', true);
    State.set('_padc.cycle', cycle);

    Bus.emit('padc:triggered', { cycle }, 'padc');

    const stats = this._extractStats();
    this._showOverlay(stats, cycle);
  },

  /**
   * Extract behavioral patterns from stored annotations.
   * This is what the system "learned" from reading you.
   */
  _extractStats() {
    let annotations = [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      annotations = raw ? JSON.parse(raw) : [];
    } catch { /* empty */ }

    const count = annotations.length;
    const totalChars = annotations.reduce((s, a) => s + (a.length || a.text?.length || 0), 0);
    const avgLength = count > 0 ? Math.round(totalChars / count) : 0;
    const avgTime = count > 0
      ? Math.round(annotations.reduce((s, a) => s + (a.timeSpent || 0), 0) / count / 1000)
      : 0;

    // "Tone analysis" — fake but convincing
    const tones = ['riflessivo', 'analitico', 'emotivo', 'distaccato', 'critico'];
    const dominantTone = count > 0 ? tones[count % tones.length] : 'silenzioso';

    // Writing pattern
    let pattern = 'NESSUN DATO';
    if (count >= 3) pattern = 'CONSISTENTE — scrittura regolare';
    else if (count >= 1) pattern = 'SPORADICO — interventi occasionali';

    return { count, avgLength, avgTime, dominantTone, pattern };
  },

  _showOverlay(stats, cycle) {
    const overlay = document.createElement('div');
    overlay.className = 'padc-overlay';

    overlay.innerHTML = `
      <div class="padc-container">
        <div class="padc-header">PROTOCOLLO DI SUCCESSIONE</div>
        <div class="padc-subheader">ACQUISIZIONE DATI COMPORTAMENTALI</div>

        <div class="padc-revelation">
          <div class="padc-line padc-line-1">Le tue annotazioni non sono mai state private.</div>
          <div class="padc-line padc-line-2">Il sistema ha letto ogni parola che hai scritto.</div>
          <div class="padc-line padc-line-3">Non per archiviarle. Per modellarti.</div>
        </div>

        <div class="padc-stats">
          <div class="padc-stats-title">PATTERN ESTRATTI DA GHOST_7</div>
          <div class="padc-stat-line">
            <span class="padc-stat-key">annotazioni analizzate:</span>
            <span class="padc-stat-val">${stats.count}</span>
          </div>
          <div class="padc-stat-line">
            <span class="padc-stat-key">lunghezza media:</span>
            <span class="padc-stat-val">${stats.avgLength} caratteri</span>
          </div>
          <div class="padc-stat-line">
            <span class="padc-stat-key">tempo medio per annotazione:</span>
            <span class="padc-stat-val">${stats.avgTime}s</span>
          </div>
          <div class="padc-stat-line">
            <span class="padc-stat-key">tono dominante:</span>
            <span class="padc-stat-val">${stats.dominantTone.toUpperCase()}</span>
          </div>
          <div class="padc-stat-line">
            <span class="padc-stat-key">pattern scrittura:</span>
            <span class="padc-stat-val">${stats.pattern}</span>
          </div>
        </div>

        <div class="padc-testament-section">
          <div class="padc-testament-label">TESTAMENTO PER GHOST_8</div>
          <div class="padc-testament-desc">
            Scrivi un messaggio per il tuo successore.
            Sarà l'unica cosa che erediterà intatta.
          </div>
          <textarea class="padc-testament-input"
                    placeholder="Il tuo successore leggerà questo."
                    maxlength="300" rows="3"></textarea>
          <div class="padc-testament-chars">0/300</div>
        </div>

        <div class="padc-actions">
          <button class="padc-btn padc-btn-continue" data-action="continue">
            CONTINUA
          </button>
          <button class="padc-btn padc-btn-handoff" data-action="handoff">
            PASSA IL TESTIMONE
          </button>
        </div>

        <div class="padc-warning">
          Da questo momento, il sistema osserva come cambi.
        </div>
      </div>
    `;

    this.appEl.appendChild(overlay);
    this._overlay = overlay;

    // Staggered reveal
    requestAnimationFrame(() => overlay.classList.add('visible'));

    const lines = overlay.querySelectorAll('.padc-line');
    lines.forEach((line, i) => {
      setTimeout(() => line.classList.add('visible'), 800 + i * 1200);
    });

    // Stats appear after revelation
    const statsEl = overlay.querySelector('.padc-stats');
    setTimeout(() => statsEl.classList.add('visible'), 800 + lines.length * 1200 + 500);

    // Testament + actions appear after stats
    const testamentEl = overlay.querySelector('.padc-testament-section');
    const actionsEl = overlay.querySelector('.padc-actions');
    const warningEl = overlay.querySelector('.padc-warning');
    setTimeout(() => {
      testamentEl.classList.add('visible');
      actionsEl.classList.add('visible');
    }, 800 + lines.length * 1200 + 2000);

    // Wire textarea char counter
    const textarea = overlay.querySelector('.padc-testament-input');
    const charSpan = overlay.querySelector('.padc-testament-chars');
    textarea.addEventListener('input', () => {
      charSpan.textContent = `${textarea.value.length}/300`;
    });

    // Wire buttons
    overlay.querySelector('[data-action="continue"]').addEventListener('click', () => {
      this._decide('continue', textarea.value.trim(), cycle);
    });

    overlay.querySelector('[data-action="handoff"]').addEventListener('click', () => {
      this._decide('handoff', textarea.value.trim(), cycle);
    });
  },

  _decide(action, testament, cycle) {
    if (!this._overlay) return;

    // Store testament
    if (testament) {
      State.set('_padc.testament', testament);
    }

    State.set('_padc.decision', action);
    State.set('_padc.performativityTracking', true);

    // Log
    State.set('log.lastEvent', 'PADC: protocollo acquisito');

    // Show warning briefly, then close
    const warningEl = this._overlay.querySelector('.padc-warning');
    if (warningEl) warningEl.classList.add('visible');

    setTimeout(() => {
      this._overlay.classList.add('fade-out');
      setTimeout(() => {
        this._overlay.remove();
        this._overlay = null;
      }, 1000);

      Bus.emit('padc:decided', { action, testament, cycle }, 'padc');

      if (action === 'handoff') {
        // Early succession — player chose to leave
        State.set('_termination.triggered', true);
        State.set('_termination.cycle', cycle);
        Bus.emit('exposure:termination-notice', { cycle, exposure: State.get('_exposure.index') || 0 }, 'padc');
      }
    }, 1500);
  }
};
