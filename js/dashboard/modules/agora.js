/**
 * AgoraModule — 16-Core Deliberation Engine (stub)
 * ═══════════════════════════════════════════════════
 * Placeholder. Will be replaced with full AGORA implementation.
 */

import { ModuleBase } from '../module-base.js';

export class AgoraModule extends ModuleBase {

  constructor() {
    super('agora');
  }

  mount(container) {
    super.mount(container);

    const intensity = this.getState('agora.intensity') || 0;

    container.innerHTML = `
      <div style="padding: 40px; max-width: 700px; margin: 0 auto;">
        <div style="font-family: var(--font-display); font-size: 14px; color: var(--green);
                    letter-spacing: 3px; margin-bottom: 24px;">
          AGORA — DELIBERATION ENGINE
        </div>
        <div style="border: 1px solid var(--border); padding: 20px; margin-bottom: 16px;">
          <div style="font-size: 11px; color: var(--text-dim); letter-spacing: 1px;
                      margin-bottom: 8px;">INTENSITÀ DELIBERATIVA</div>
          <div data-live="intensity" style="font-family: var(--font-display); font-size: 32px; color: var(--green);
                      text-shadow: 0 0 15px rgba(57, 255, 20, 0.4);">
            ${intensity}%
          </div>
        </div>
        <div style="font-size: 12px; color: var(--text-dim); line-height: 1.8;">
          Modulo in fase di integrazione nella shell.<br>
          Il contenuto completo di AGORA verrà migrato qui.<br><br>
          <span style="color: var(--text-secondary);">ESC → torna alla dashboard</span>
        </div>
      </div>
    `;

    // Tracked via watchState — auto-cleanup on unmount
    this.watchState('agora.intensity', (value) => {
      const display = container.querySelector('[data-live="intensity"]');
      if (display) display.textContent = `${value}%`;
    });
  }
}
