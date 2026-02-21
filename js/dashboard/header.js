/**
 * HeaderStrip — Always-on nervous system readout.
 * ═══════════════════════════════════════════════════
 * Reads ONLY from StateManager. Never touches modules.
 * Shows: system state, fragility index, simulated clock, session phase.
 *
 * Click on brand → Router.open('hub')
 */

import { Bus } from '../bus.js';
import { State } from './state.js';

export class HeaderStrip {

  constructor(container, router) {
    this.container = container;
    this.router = router;
    this.subscriptions = [];
    this.clockInterval = null;
    this.els = {};

    this._build();
    this._bind();
    this._startClock();
  }

  _build() {
    this.container.innerHTML = `
      <div class="header-left">
        <div class="header-brand" id="header-brand">SIGIL</div>
        <div class="system-state" id="system-state">
          <div class="state-dot elastic" id="state-dot"></div>
          <span class="state-label elastic" id="state-label">ELASTIC</span>
        </div>
      </div>
      <div class="header-center">
        <div class="fragility-index">
          <span>FRAGILITY</span>
          <span class="fragility-value" id="fragility-value">0.12</span>
        </div>
      </div>
      <div class="header-right">
        <div class="cycle-counter" id="cycle-counter">CYCLE 1/40</div>
        <div class="sim-clock" id="sim-clock">--:--:--</div>
        <div class="session-phase" id="session-phase">ELASTICITY</div>
      </div>
    `;

    this.els = {
      brand: this.container.querySelector('#header-brand'),
      stateDot: this.container.querySelector('#state-dot'),
      stateLabel: this.container.querySelector('#state-label'),
      fragility: this.container.querySelector('#fragility-value'),
      clock: this.container.querySelector('#sim-clock'),
      phase: this.container.querySelector('#session-phase'),
      cycle: this.container.querySelector('#cycle-counter')
    };
  }

  _bind() {
    // Brand click → return to hub
    this.els.brand.style.cursor = 'pointer';
    this.els.brand.addEventListener('click', () => {
      this.router.open('hub');
    });

    // State watchers
    this.subscriptions.push(
      State.watch('system.state', (value) => this._updateSystemState(value))
    );
    this.subscriptions.push(
      State.watch('system.fragility', (value) => this._updateFragility(value))
    );
    this.subscriptions.push(
      State.watch('system.phase', (value) => this._updatePhase(value))
    );
    this.subscriptions.push(
      State.watch('cycle.current', (value) => this._updateCycle(value))
    );
  }

  _startClock() {
    const tick = () => {
      const now = new Date();
      this.els.clock.textContent = now.toLocaleTimeString('it-IT', {
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      });
    };
    tick();
    this.clockInterval = setInterval(tick, 1000);
  }

  _updateSystemState(value) {
    const lower = value.toLowerCase();
    const states = ['elastic', 'rigid', 'fractured'];

    states.forEach(s => {
      this.els.stateDot.classList.remove(s);
      this.els.stateLabel.classList.remove(s);
    });

    this.els.stateDot.classList.add(lower);
    this.els.stateLabel.classList.add(lower);
    this.els.stateLabel.textContent = value;

    // Body class for global CSS effects
    document.body.classList.remove('state-elastic', 'state-rigid', 'state-fractured');
    document.body.classList.add(`state-${lower}`);
  }

  _updateFragility(value) {
    this.els.fragility.textContent = value.toFixed(2);

    // Color shift based on severity
    if (value > 0.7) {
      this.els.fragility.style.color = 'var(--red)';
    } else if (value > 0.4) {
      this.els.fragility.style.color = 'var(--amber)';
    } else {
      this.els.fragility.style.color = 'var(--cyan)';
    }
  }

  _updatePhase(value) {
    this.els.phase.textContent = value;
  }

  _updateCycle(value) {
    const total = State.get('cycle.total') || 40;
    this.els.cycle.textContent = `CYCLE ${value}/${total}`;
  }

  destroy() {
    this.subscriptions.forEach(unsub => unsub());
    this.subscriptions = [];
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
      this.clockInterval = null;
    }
  }
}
