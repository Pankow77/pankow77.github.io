/**
 * TerminationSequence — Node metabolization.
 * ═══════════════════════════════════════════
 * The system doesn't delete you. It digests you.
 *
 * Phase 1: CNS INTERNAL NOTICE (overlay, player can dismiss)
 *   "Motivo: eccessiva correlazione cross-theatre."
 *   Player gets one final cycle. System wants the last annotation.
 *   Not for archiving. For profiling. For extraction.
 *
 * Phase 2: NODE TERMINATED (final overlay, no dismiss)
 *   Displays operator profile. Everything you were, quantified.
 *   Then:
 *     ARCHIVE INGESTED.
 *     PATTERN EXTRACTION COMPLETE.
 *     NODE RESOURCES REALLOCATED.
 *     GHOST_8 ACTIVE.
 *     Applying inherited heuristics...
 *
 *   That last line is the knife.
 *   GHOST_8 doesn't start from zero.
 *   GHOST_8 starts slightly more efficient — because of you.
 *   You weren't eliminated. You were metabolized.
 *
 * If player reaches cycle 40 without triggering termination:
 *   Clean succession. No drama. Peaceful handoff.
 *   But the pattern extraction still happens. Always.
 *   You can't avoid being useful to the system.
 */

import { Bus } from '../bus.js';
import { State } from './state.js';

export const TerminationSequence = {

  /**
   * Initialize. Listens for exposure events.
   */
  init(appEl) {
    this.appEl = appEl;

    // CNS notice — player is being terminated
    Bus.on('exposure:termination-notice', (event) => {
      this._showNotice(event.payload);
    });

    // Node terminated — final screen
    Bus.on('exposure:node-terminated', (event) => {
      this._showTermination(event.payload);
    });

    // Clean succession at cycle 40 (no termination triggered)
    Bus.on('state:changed', (event) => {
      if (event.payload.key === 'cycle.current' && event.payload.value > 40) {
        if (!State.get('_termination.triggered')) {
          this._showSuccession();
        }
      }
    });
  },

  /**
   * Phase 1: CNS Internal Notice.
   * Overlay that the player can acknowledge.
   * They get one more cycle to write their final annotation.
   */
  _showNotice(data) {
    const overlay = document.createElement('div');
    overlay.className = 'termination-overlay';
    overlay.innerHTML = `
      <div class="termination-container">
        <div class="termination-header">CNS INTERNAL NOTICE</div>
        <div class="termination-risk">
          <span class="termination-label">NODE RISK PROFILE:</span> ELEVATED<br>
          <span class="termination-label">OPERATOR EXPOSURE INDEX:</span> CRITICAL
        </div>
        <div class="termination-body">
          <div class="termination-line">GHOST_7</div>
          <div class="termination-line">
            Il tuo accesso verrà terminato al completamento del ciclo corrente.
          </div>
          <div class="termination-line termination-reason">
            Motivo: eccessiva correlazione cross-theatre.
          </div>
        </div>
        <div class="termination-prompt">
          <button class="intro-btn intro-btn-accept" data-action="acknowledge">
            COMPRESO
          </button>
        </div>
      </div>
    `;

    this.appEl.appendChild(overlay);
    overlay.offsetHeight;
    overlay.classList.add('visible');

    overlay.addEventListener('click', (e) => {
      if (e.target.dataset.action === 'acknowledge') {
        overlay.classList.add('fade-out');
        setTimeout(() => overlay.remove(), 1000);
        // Player returns to dashboard for one final cycle
        Bus.emit('termination:acknowledged', {}, 'termination');
      }
    });
  },

  /**
   * Phase 2: Node Terminated.
   * Final screen. No dismiss. The game is over.
   */
  _showTermination(data) {
    const coherence = State.get('operator.coherence') || 0;
    const annotations = State.get('operator.annotations') || 0;
    const exposure = State.get('_exposure.index') || 0;
    const crossCorr = State.get('_exposure.crossCorrelations') || 0;

    const overlay = document.createElement('div');
    overlay.className = 'termination-overlay termination-final';
    overlay.innerHTML = `
      <div class="termination-container">
        <div class="termination-header">NODE TERMINATED</div>

        <div class="termination-profile">
          <div class="termination-profile-title">PROFILO OPERATIVO — GHOST_7</div>
          <div class="termination-stat">
            <span class="termination-label">COERENZA FRAME:</span>
            ${(coherence * 100).toFixed(0)}%
          </div>
          <div class="termination-stat">
            <span class="termination-label">CORRELAZIONI CROSS-THEATRE:</span>
            ${crossCorr}
          </div>
          <div class="termination-stat">
            <span class="termination-label">ANNOTAZIONI ARCHIVIATE:</span>
            ${annotations}
          </div>
          <div class="termination-stat">
            <span class="termination-label">INDICE ESPOSIZIONE:</span>
            ${(exposure * 100).toFixed(0)}%
          </div>
        </div>

        <div class="termination-sequence">
          <div class="termination-seq-line" data-delay="0">ARCHIVE INGESTED.</div>
          <div class="termination-seq-line" data-delay="2000">PATTERN EXTRACTION COMPLETE.</div>
          <div class="termination-seq-line" data-delay="4000">NODE RESOURCES REALLOCATED.</div>
          <div class="termination-seq-line termination-ghost8" data-delay="6500">
            GHOST_8 ACTIVE.
          </div>
          <div class="termination-seq-line termination-heuristics" data-delay="6900">
            Applying inherited heuristics...
          </div>
        </div>
      </div>
    `;

    this.appEl.appendChild(overlay);
    overlay.offsetHeight;
    overlay.classList.add('visible');

    // Type out sequence lines with delays
    const lines = overlay.querySelectorAll('.termination-seq-line');
    lines.forEach(line => {
      const delay = parseInt(line.dataset.delay, 10);
      setTimeout(() => line.classList.add('visible'), delay + 1500);
    });
  },

  /**
   * Clean succession — cycle 40, no termination.
   * Player completed their tour. Peaceful handoff.
   * But the annotations are still transferred.
   */
  _showSuccession() {
    const coherence = State.get('operator.coherence') || 0;
    const annotations = State.get('operator.annotations') || 0;

    const overlay = document.createElement('div');
    overlay.className = 'termination-overlay termination-clean';
    overlay.innerHTML = `
      <div class="termination-container">
        <div class="termination-header">TURNO COMPLETATO</div>

        <div class="termination-profile">
          <div class="termination-profile-title">PROFILO OPERATIVO — GHOST_7</div>
          <div class="termination-stat">
            <span class="termination-label">COERENZA FRAME:</span>
            ${(coherence * 100).toFixed(0)}%
          </div>
          <div class="termination-stat">
            <span class="termination-label">ANNOTAZIONI ARCHIVIATE:</span>
            ${annotations}
          </div>
        </div>

        <div class="termination-sequence">
          <div class="termination-seq-line" data-delay="0">
            Nodo trasferito.
          </div>
          <div class="termination-seq-line" data-delay="2000">
            Pattern operativo archiviato.
          </div>
          <div class="termination-seq-line termination-ghost8" data-delay="4500">
            GHOST_8 ACTIVE.
          </div>
          <div class="termination-seq-line termination-heuristics" data-delay="4900">
            Applying inherited heuristics...
          </div>
        </div>
      </div>
    `;

    this.appEl.appendChild(overlay);
    overlay.offsetHeight;
    overlay.classList.add('visible');

    const lines = overlay.querySelectorAll('.termination-seq-line');
    lines.forEach(line => {
      const delay = parseInt(line.dataset.delay, 10);
      setTimeout(() => line.classList.add('visible'), delay + 1500);
    });
  }
};
