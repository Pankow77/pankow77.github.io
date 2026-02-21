/**
 * OracleModule — Planetary Intelligence System (stub)
 * ═══════════════════════════════════════════════════
 * Placeholder. Will be replaced with full ORACLE implementation.
 */

import { ModuleBase } from '../module-base.js';

export class OracleModule extends ModuleBase {

  constructor() {
    super('oracle');
  }

  mount(container) {
    super.mount(container);

    const confidence = this.getState('oracle.confidence') || 0;
    const stable = this.getState('oracle.stable');

    container.innerHTML = `
      <div style="padding: 40px; max-width: 700px; margin: 0 auto;">
        <div style="font-family: var(--font-display); font-size: 14px; color: var(--purple);
                    letter-spacing: 3px; margin-bottom: 24px;">
          ORACLE — PLANETARY INTELLIGENCE
        </div>
        <div style="border: 1px solid var(--border); padding: 20px; margin-bottom: 16px;">
          <div style="font-size: 11px; color: var(--text-dim); letter-spacing: 1px;
                      margin-bottom: 8px;">CONFIDENZA PREDITTIVA</div>
          <div style="font-family: var(--font-display); font-size: 32px; color: var(--purple);
                      text-shadow: 0 0 15px rgba(136, 85, 255, 0.4);">
            ${(confidence * 100).toFixed(0)}%
          </div>
          <div style="font-size: 10px; color: ${stable ? 'var(--green)' : 'var(--red)'}; margin-top: 4px;">
            ${stable ? 'STABILE' : 'INSTABILE'}
          </div>
        </div>
        <div style="font-size: 12px; color: var(--text-dim); line-height: 1.8;">
          Modulo in fase di integrazione nella shell.<br>
          Il contenuto completo di ORACLE verrà migrato qui.<br><br>
          <span style="color: var(--text-secondary);">ESC → torna alla dashboard</span>
        </div>
      </div>
    `;
  }
}
