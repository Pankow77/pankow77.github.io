/**
 * AgoraModule — 16-Core Deliberation Engine (stub)
 * ═══════════════════════════════════════════════════
 * Reads ONLY through selectAgora(). Never touches raw State.
 * All rendering is derived. Zero local cache.
 *
 * Pattern:
 *   State (normalized) → selector (derived) → DOM (stateless)
 */

import { ModuleBase } from '../module-base.js';
import { createSelector } from '../selectors.js';

// ── Selector: raw state → view-model ──
const selectAgora = createSelector(
  ['agora.intensity', 'agora.polarization'],
  (intensity, polarization) => {
    const pol = polarization || [];
    const avg = pol.length > 0
      ? pol.reduce((a, b) => a + b, 0) / pol.length
      : 0;

    return {
      intensity: intensity || 0,
      polarization: pol,
      polarizationAvg: Math.round(avg),
      status: intensity > 80 ? 'CRITICAL' : intensity > 50 ? 'ACTIVE' : 'NOMINAL',
      bars: pol.map(v => ({
        height: Math.round((v / 100) * 48),
        value: v
      }))
    };
  }
);

export class AgoraModule extends ModuleBase {

  constructor() {
    super('agora');
  }

  mount(container) {
    super.mount(container);
    this._render(container);

    // Re-render on any agora.* state change via selector
    this.watchState('agora.intensity', () => this._update());
    this.watchState('agora.polarization', () => this._update());
  }

  _render(container) {
    const vm = selectAgora();

    container.innerHTML = `
      <div style="padding: 40px; max-width: 700px; margin: 0 auto;">
        <div style="font-family: var(--font-display); font-size: 14px; color: var(--green);
                    letter-spacing: 3px; margin-bottom: 24px;">
          AGORA — DELIBERATION ENGINE
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
          <!-- Intensity -->
          <div style="border: 1px solid var(--border); padding: 20px;">
            <div style="font-size: 11px; color: var(--text-dim); letter-spacing: 1px;
                        margin-bottom: 8px;">INTENSIT&Agrave; DELIBERATIVA</div>
            <div data-live="intensity" style="font-family: var(--font-display); font-size: 32px; color: var(--green);
                        text-shadow: 0 0 15px rgba(57, 255, 20, 0.4);">
              ${vm.intensity}%
            </div>
            <div data-live="status" style="font-size: 11px; color: var(--text-dim); margin-top: 8px;
                        letter-spacing: 1px;">
              ${vm.status}
            </div>
          </div>

          <!-- Polarization avg -->
          <div style="border: 1px solid var(--border); padding: 20px;">
            <div style="font-size: 11px; color: var(--text-dim); letter-spacing: 1px;
                        margin-bottom: 8px;">POLARIZZAZIONE MEDIA</div>
            <div data-live="pol-avg" style="font-family: var(--font-display); font-size: 32px; color: var(--amber);
                        text-shadow: 0 0 15px rgba(255, 170, 0, 0.3);">
              ${vm.polarizationAvg}
            </div>
          </div>
        </div>

        <!-- Polarization bars -->
        <div style="border: 1px solid var(--border); padding: 20px;">
          <div style="font-size: 11px; color: var(--text-dim); letter-spacing: 1px;
                      margin-bottom: 12px;">DISTRIBUZIONE POLARIZZAZIONE</div>
          <div data-live="bars" style="display: flex; gap: 6px; align-items: flex-end; height: 48px;">
            ${vm.bars.map(b => `
              <div style="width: 20px; height: ${b.height}px; background: var(--green);
                          opacity: ${0.4 + (b.value / 100) * 0.6};"></div>
            `).join('')}
          </div>
        </div>

        <div style="font-size: 12px; color: var(--text-dim); line-height: 1.8; margin-top: 16px;">
          Modulo in fase di integrazione nella shell.<br>
          <span style="color: var(--text-secondary);">ESC &rarr; torna alla dashboard</span>
        </div>
      </div>
    `;
  }

  /**
   * Selector-driven update. Re-reads derived view-model,
   * patches only the live elements. No full re-render.
   */
  _update() {
    if (!this.container) return;
    const vm = selectAgora();

    const el = (sel) => this.container.querySelector(`[data-live="${sel}"]`);

    const intensityEl = el('intensity');
    if (intensityEl) intensityEl.textContent = `${vm.intensity}%`;

    const statusEl = el('status');
    if (statusEl) statusEl.textContent = vm.status;

    const polAvgEl = el('pol-avg');
    if (polAvgEl) polAvgEl.textContent = vm.polarizationAvg;

    const barsEl = el('bars');
    if (barsEl) {
      barsEl.innerHTML = vm.bars.map(b => `
        <div style="width: 20px; height: ${b.height}px; background: var(--green);
                    opacity: ${0.4 + (b.value / 100) * 0.6};"></div>
      `).join('');
    }
  }
}
