/**
 * ArchivioModule — Silent Archive (stub)
 * ═══════════════════════════════════════
 * Placeholder. Will be replaced with full ARCHIVIO implementation.
 */

import { ModuleBase } from '../module-base.js';

export class ArchivioModule extends ModuleBase {

  constructor() {
    super('archivio');
  }

  mount(container) {
    super.mount(container);

    const annotations = this.getState('archivio.annotations') || 0;
    const succession = this.getState('archivio.succession');

    container.innerHTML = `
      <div style="padding: 40px; max-width: 700px; margin: 0 auto;">
        <div style="font-family: var(--font-display); font-size: 14px; color: var(--ice);
                    letter-spacing: 3px; margin-bottom: 24px;">
          ARCHIVIO SILENTE
        </div>
        <div style="border: 1px solid var(--border); padding: 20px; margin-bottom: 16px;">
          <div style="font-size: 11px; color: var(--text-dim); letter-spacing: 1px;
                      margin-bottom: 8px;">ANNOTAZIONI REGISTRATE</div>
          <div style="font-family: var(--font-display); font-size: 32px; color: var(--ice);
                      text-shadow: 0 0 15px rgba(136, 204, 255, 0.4);">
            ${annotations}
          </div>
          ${succession ? '<div style="margin-top: 8px;"><span class="ghost-badge">GHOST ATTIVO</span></div>' : ''}
        </div>
        <div style="font-size: 12px; color: var(--text-dim); line-height: 1.8;">
          Modulo in fase di integrazione nella shell.<br>
          Il contenuto completo dell'ARCHIVIO verrà migrato qui.<br><br>
          <span style="color: var(--text-secondary);">ESC → torna alla dashboard</span>
        </div>
      </div>
    `;
  }
}
