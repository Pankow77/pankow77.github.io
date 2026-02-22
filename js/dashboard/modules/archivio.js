/**
 * ArchivioModule — Silent Archive.
 * ═══════════════════════════════════
 * The player writes. The system stores everything.
 * One annotation per cycle. Persisted in localStorage.
 *
 * Each annotation saves:
 *   { cycle, text, length, timeSpent, timestamp }
 *
 * No sentiment analysis. No performativity tracking.
 * Those are Phase B overlays. This is the raw storage.
 *
 * GHOST_6 annotations are inherited from the predecessor.
 * They exist here to remind you: someone was here before.
 */

import { ModuleBase } from '../module-base.js';
import { State } from '../state.js';

const STORAGE_KEY = 'sigil_annotations';

// Inherited from GHOST_6. Not editable. Not deletable.
const GHOST6_ANNOTATIONS = [
  {
    cycle: 0,
    text: 'Quando qualcosa sembra troppo chiaro, dubita. La certezza è il primo segnale di pericolo.',
    source: 'GHOST_6'
  },
  {
    cycle: 0,
    text: 'Ho contato 37 cicli. Al trentottesimo ho smesso di contare. Non perché avessi finito.',
    source: 'GHOST_6'
  }
];


export class ArchivioModule extends ModuleBase {

  constructor() {
    super('archivio');
    this._openTime = null;
  }

  mount(container) {
    super.mount(container);
    this._openTime = Date.now();

    const annotations = this._load();
    const cycle = this.getState('cycle.current');
    const existingThisCycle = annotations.find(a => a.cycle === cycle);
    const allEntries = [...GHOST6_ANNOTATIONS, ...annotations];

    // ── Build DOM ──
    container.innerHTML = `
      <div class="archivio-view">
        <div class="archivio-header">
          <div class="archivio-title">ARCHIVIO SILENTE</div>
          <div class="archivio-count">${annotations.length} annotazioni registrate</div>
        </div>

        <div class="archivio-input-section">
          <div class="archivio-input-label">CICLO ${cycle} — ANNOTAZIONE</div>
          <textarea class="archivio-textarea"
                    placeholder="Scrivi. Il sistema archivia tutto."
                    maxlength="500" rows="4"
                    ${existingThisCycle ? 'disabled' : ''}>${existingThisCycle ? existingThisCycle.text : ''}</textarea>
          <div class="archivio-input-footer">
            <span class="archivio-chars">${existingThisCycle ? existingThisCycle.text.length : 0}/500</span>
            <button class="archivio-save" ${existingThisCycle ? 'disabled' : 'disabled'}>
              ${existingThisCycle ? 'REGISTRATO' : 'REGISTRA'}
            </button>
          </div>
        </div>

        <div class="archivio-list">
          ${allEntries.length === 0
            ? '<div class="archivio-empty">Nessuna annotazione registrata.</div>'
            : allEntries.slice().reverse().map(entry => `
                <div class="archivio-entry ${entry.source === 'GHOST_6' ? 'ghost6' : ''}">
                  <div class="archivio-entry-meta">
                    <span class="archivio-entry-source">${entry.source || 'GHOST_7'}</span>
                    <span class="archivio-entry-cycle">CICLO ${entry.cycle}</span>
                  </div>
                  <div class="archivio-entry-text">${this._escape(entry.text)}</div>
                </div>
              `).join('')
          }
        </div>

        <div class="archivio-footer">
          <span style="color: var(--text-secondary);">ESC → torna alla dashboard</span>
        </div>
      </div>
    `;

    // ── Wire interactions ──
    if (!existingThisCycle) {
      const textarea = container.querySelector('.archivio-textarea');
      const saveBtn = container.querySelector('.archivio-save');
      const charSpan = container.querySelector('.archivio-chars');

      textarea.addEventListener('input', () => {
        const len = textarea.value.trim().length;
        charSpan.textContent = `${textarea.value.length}/500`;
        saveBtn.disabled = len === 0;
      });

      saveBtn.addEventListener('click', () => {
        const text = textarea.value.trim();
        if (!text) return;

        const timeSpent = Date.now() - this._openTime;
        this._save({
          cycle,
          text,
          length: text.length,
          timeSpent,
          timestamp: Date.now()
        });

        // Update state
        const count = (this.getState('operator.annotations') || 0) + 1;
        this.setState('operator.annotations', count);
        this.setState('archivio.annotations', count);
        this.setState('log.lastEvent', `Annotazione ciclo ${cycle}`);

        // Termination: mark final annotation
        if (this.getState('_termination.triggered')) {
          this.setState('_termination.finalAnnotation', true);
        }

        // Disable and refresh
        textarea.disabled = true;
        saveBtn.textContent = 'REGISTRATO';
        saveBtn.disabled = true;

        // Add new entry to list (no full rebuild)
        const listEl = container.querySelector('.archivio-list');
        if (listEl) {
          const newEntry = document.createElement('div');
          newEntry.className = 'archivio-entry';
          newEntry.innerHTML = `
            <div class="archivio-entry-meta">
              <span class="archivio-entry-source">GHOST_7</span>
              <span class="archivio-entry-cycle">CICLO ${cycle}</span>
            </div>
            <div class="archivio-entry-text">${this._escape(text)}</div>
          `;
          const empty = listEl.querySelector('.archivio-empty');
          if (empty) empty.remove();
          listEl.insertBefore(newEntry, listEl.firstChild);
        }

        // Update header count
        const countEl = container.querySelector('.archivio-count');
        if (countEl) {
          countEl.textContent = `${this._load().length} annotazioni registrate`;
        }
      });
    }
  }

  // ── Persistence ──

  _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  _save(annotation) {
    const annotations = this._load();
    const idx = annotations.findIndex(a => a.cycle === annotation.cycle);
    if (idx >= 0) {
      annotations[idx] = annotation;
    } else {
      annotations.push(annotation);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(annotations));
  }

  _escape(text) {
    const el = document.createElement('span');
    el.textContent = text;
    return el.innerHTML;
  }
}
