/**
 * ProfiloOperativo — "You're not a person. You're a feature vector."
 * ══════════════════════════════════════════════════════════════════
 * Mid-game reveal. Triggered once, cycle 26-28.
 * Shows the player their behavioral profile as the system sees it.
 *
 * Not the endgame vector (that's TerminationSequence).
 * This is the LIVE vector. The system showing its hand early.
 * The player gets to see themselves as data BEFORE the end.
 * Then they play the remaining cycles knowing they're being modeled.
 *
 * The vector:
 *   consistency:    operator.coherence
 *   pattern_depth:  _exposure.crossCorrelations + _exposure.patternDepth
 *   output_density: annotations / cycles
 *   visibility:     _exposure.index
 *   reaction_time:  derived from annotation timeSpent averages
 *   frame_bias:     most-chosen frame type from envelope history
 */

import { Bus } from '../bus.js';
import { State } from './state.js';

const PROFILO_WINDOW_START = 26;
const PROFILO_WINDOW_END = 28;

export const ProfiloOperativo = {

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
    if (State.get('_profilo.revealed')) return false;
    if (cycle < PROFILO_WINDOW_START || cycle > PROFILO_WINDOW_END) return false;

    // 40% chance per cycle in window. By cycle 28 it's almost guaranteed.
    if (cycle === PROFILO_WINDOW_END) return true; // force at 28
    return Math.random() < 0.4;
  },

  _trigger(cycle) {
    State.set('_profilo.revealed', true);
    State.set('_profilo.cycle', cycle);

    Bus.emit('profilo:triggered', { cycle }, 'profilo');

    const vector = this._buildVector(cycle);
    this._showOverlay(vector, cycle);
  },

  _buildVector(cycle) {
    const coherence = State.get('operator.coherence') || 0;
    const crossCorr = State.get('_exposure.crossCorrelations') || 0;
    const patternDepth = State.get('_exposure.patternDepth') || 0;
    const annotations = State.get('operator.annotations') || 0;
    const exposure = State.get('_exposure.index') || 0;

    const outputDensity = cycle > 0 ? (annotations / cycle) : 0;

    // Reaction time from stored annotations
    let avgReaction = 0;
    try {
      const raw = localStorage.getItem('sigil_annotations');
      const stored = raw ? JSON.parse(raw) : [];
      if (stored.length > 0) {
        avgReaction = Math.round(
          stored.reduce((s, a) => s + (a.timeSpent || 0), 0) / stored.length / 1000
        );
      }
    } catch { /* empty */ }

    // Frame bias from envelope history
    let frameBias = 'NESSUN DATO';
    try {
      const envelopeSystem = window.__dashboard?.EnvelopeSystem;
      if (envelopeSystem) {
        const history = envelopeSystem.getHistory();
        if (history.length > 0) {
          const frameCounts = {};
          history.forEach(h => {
            frameCounts[h.frame] = (frameCounts[h.frame] || 0) + 1;
          });
          const sorted = Object.entries(frameCounts).sort((a, b) => b[1] - a[1]);
          frameBias = sorted[0][0];
        }
      }
    } catch { /* empty */ }

    return {
      consistency: coherence.toFixed(3),
      pattern_depth: crossCorr + patternDepth,
      output_density: outputDensity.toFixed(3),
      visibility: exposure.toFixed(3),
      reaction_time: `${avgReaction}s`,
      frame_bias: frameBias
    };
  },

  _showOverlay(vector, cycle) {
    const overlay = document.createElement('div');
    overlay.className = 'profilo-overlay';

    const vectorLines = Object.entries(vector).map(([key, val]) => `
      <div class="profilo-vector-line">
        <span class="profilo-vector-key">${key}:</span>
        <span class="profilo-vector-val">${val}</span>
      </div>
    `).join('');

    overlay.innerHTML = `
      <div class="profilo-container">
        <div class="profilo-header">PROFILO OPERATIVO</div>
        <div class="profilo-subheader">CICLO ${cycle}/${State.get('cycle.total')}</div>

        <div class="profilo-revelation">
          <div class="profilo-line profilo-line-1">Non sei una persona.</div>
          <div class="profilo-line profilo-line-2">Sei un vettore di feature.</div>
        </div>

        <div class="profilo-vector">
          <div class="profilo-vector-title">GHOST_7 — FEATURE VECTOR (LIVE)</div>
          ${vectorLines}
        </div>

        <div class="profilo-footnote">
          Il sistema non ti sta modellando. Ti ha già modellato.
        </div>

        <div class="profilo-actions">
          <button class="profilo-btn" data-action="acknowledge">
            COMPRESO
          </button>
        </div>
      </div>
    `;

    this.appEl.appendChild(overlay);
    this._overlay = overlay;

    requestAnimationFrame(() => overlay.classList.add('visible'));

    // Staggered reveal
    const lines = overlay.querySelectorAll('.profilo-line');
    lines.forEach((line, i) => {
      setTimeout(() => line.classList.add('visible'), 600 + i * 1500);
    });

    // Vector appears after lines
    const vectorEl = overlay.querySelector('.profilo-vector');
    setTimeout(() => vectorEl.classList.add('visible'), 600 + lines.length * 1500 + 800);

    // Footnote after vector
    const footnoteEl = overlay.querySelector('.profilo-footnote');
    setTimeout(() => footnoteEl.classList.add('visible'), 600 + lines.length * 1500 + 2500);

    // Button last
    const actionsEl = overlay.querySelector('.profilo-actions');
    setTimeout(() => actionsEl.classList.add('visible'), 600 + lines.length * 1500 + 3500);

    // Wire button
    overlay.querySelector('[data-action="acknowledge"]').addEventListener('click', () => {
      State.set('log.lastEvent', 'PROFILO: vettore acquisito');

      overlay.classList.add('fade-out');
      setTimeout(() => {
        overlay.remove();
        this._overlay = null;
      }, 1000);

      Bus.emit('profilo:acknowledged', { cycle, vector }, 'profilo');
    });
  }
};
