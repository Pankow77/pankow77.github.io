/**
 * FooterStrip — Minimal live log.
 * ═══════════════════════════════════
 * Shows last event, last frame chosen, last consequence.
 * Reads from StateManager. 1-2 lines. No scroll.
 */

import { State } from './state.js';

export class FooterStrip {

  constructor(container) {
    this.container = container;
    this.subscriptions = [];
    this.els = {};

    this._build();
    this._bind();
  }

  _build() {
    this.container.innerHTML = `
      <div class="log-entry">
        <span class="log-label">EVT</span>
        <span class="log-value" id="log-event">—</span>
      </div>
      <div class="log-entry">
        <span class="log-label">FRM</span>
        <span class="log-value" id="log-frame">—</span>
      </div>
      <div class="log-entry">
        <span class="log-label">CSQ</span>
        <span class="log-value" id="log-consequence">—</span>
      </div>
    `;

    this.els = {
      event: this.container.querySelector('#log-event'),
      frame: this.container.querySelector('#log-frame'),
      consequence: this.container.querySelector('#log-consequence')
    };
  }

  _bind() {
    this.subscriptions.push(
      State.watch('log.lastEvent', (v) => { this.els.event.textContent = v; })
    );
    this.subscriptions.push(
      State.watch('log.lastFrame', (v) => { this.els.frame.textContent = v; })
    );
    this.subscriptions.push(
      State.watch('log.lastConsequence', (v) => { this.els.consequence.textContent = v; })
    );
  }

  destroy() {
    this.subscriptions.forEach(unsub => unsub());
    this.subscriptions = [];
  }
}
