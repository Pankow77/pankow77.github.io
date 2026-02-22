/**
 * HubGrid — The 3x3 dashboard grid.
 * ═══════════════════════════════════
 * This IS a module. mount/unmount like everything else.
 * When you open an organ → hub.unmount(). When you ESC → hub.mount().
 *
 * Layout:
 *   TEATRI    | AGORA       | ORACLE
 *   ARCHIVIO  | LAGO RÀ     | PNEUMA
 *   BACKBONE  | EEI         | URBAN CHRONOS
 *
 * LAGO RÀ: center, non-clickable, the node.
 * Each tile reads from State for its micro visualization.
 */

import { ModuleBase } from '../module-base.js';
import { State } from '../state.js';
import { Bus } from '../../bus.js';

// ── SVG Icons (matching individual pages) ──
const ICONS = {
  teatri: `<svg viewBox="0 0 24 24" width="18" height="18"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.5"/><circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.8"/><line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" stroke-width="0.8" opacity="0.3"/><line x1="12" y1="3" x2="12" y2="21" stroke="currentColor" stroke-width="0.8" opacity="0.3"/></svg>`,
  agora: `<svg viewBox="0 0 24 24" width="18" height="18"><polygon points="12,2 22,7.5 22,16.5 12,22 2,16.5 2,7.5" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.5"/><polygon points="12,6 18,9 18,15 12,18 6,15 6,9" fill="none" stroke="currentColor" stroke-width="0.8" opacity="0.3"/><circle cx="12" cy="12" r="2" fill="currentColor" opacity="0.8"/></svg>`,
  oracle: `<svg viewBox="0 0 24 24" width="18" height="18"><polyline points="1,12 5,12 8,5 11,19 14,8 17,16 20,12 23,12" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.8"/></svg>`,
  archivio: `<svg viewBox="0 0 24 24" width="18" height="18"><rect x="4" y="3" width="16" height="18" rx="1" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.5"/><line x1="8" y1="8" x2="16" y2="8" stroke="currentColor" stroke-width="1" opacity="0.4"/><line x1="8" y1="12" x2="16" y2="12" stroke="currentColor" stroke-width="1" opacity="0.4"/><line x1="8" y1="16" x2="13" y2="16" stroke="currentColor" stroke-width="1" opacity="0.4"/></svg>`,
  pneuma: `<svg viewBox="0 0 24 24" width="18" height="18"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.4"/><path d="M12 3 Q18 8 12 12 Q6 16 12 21" fill="none" stroke="currentColor" stroke-width="1.2" opacity="0.6"/></svg>`,
  backbone: `<svg viewBox="0 0 24 24" width="18" height="18"><rect x="3" y="3" width="7" height="7" rx="1" fill="none" stroke="currentColor" stroke-width="1.2" opacity="0.5"/><rect x="14" y="3" width="7" height="7" rx="1" fill="none" stroke="currentColor" stroke-width="1.2" opacity="0.5"/><rect x="3" y="14" width="7" height="7" rx="1" fill="none" stroke="currentColor" stroke-width="1.2" opacity="0.5"/><rect x="14" y="14" width="7" height="7" rx="1" fill="none" stroke="currentColor" stroke-width="1.2" opacity="0.5"/><line x1="10" y1="6.5" x2="14" y2="6.5" stroke="currentColor" stroke-width="0.8" opacity="0.3"/><line x1="6.5" y1="10" x2="6.5" y2="14" stroke="currentColor" stroke-width="0.8" opacity="0.3"/></svg>`,
  eei: `<svg viewBox="0 0 24 24" width="18" height="18"><path d="M3 20 L8 12 L12 15 L17 6 L21 10" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.7"/><circle cx="17" cy="6" r="2" fill="currentColor" opacity="0.6"/></svg>`,
  chronos: `<svg viewBox="0 0 24 24" width="18" height="18"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.4"/><line x1="12" y1="6" x2="12" y2="12" stroke="currentColor" stroke-width="1.5" opacity="0.7"/><line x1="12" y1="12" x2="16" y2="14" stroke="currentColor" stroke-width="1.2" opacity="0.5"/><circle cx="12" cy="12" r="1.5" fill="currentColor" opacity="0.6"/></svg>`,
  'lago-ra': `<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="1" opacity="0.3"/><circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.6"/><circle cx="12" cy="12" r="1.5" fill="currentColor" opacity="0.9"/></svg>`
};

// ── Tile definitions ──
const TILES = [
  {
    id: 'teatri', label: 'TEATRI', route: 'teatri',
    subtitle: 'Theater Monitor',
    status: () => {
      const t = State.get('teatri.theaters') || {};
      const alert = Object.values(t).filter(v => v === 'alert').length;
      return alert > 0 ? `${alert} THEATER ALERT` : 'ALL THEATERS NOMINAL';
    },
    micro: (tile) => {
      const t = State.get('teatri.theaters') || {};
      const container = document.createElement('div');
      container.className = 'micro-indicators';
      for (const [name, status] of Object.entries(t)) {
        const ind = document.createElement('span');
        ind.className = `mini-indicator ${status}`;
        ind.textContent = name.toUpperCase().slice(0, 5);
        container.appendChild(ind);
      }
      return container;
    }
  },
  {
    id: 'agora', label: 'AGORA', route: 'agora',
    subtitle: '16-Core Deliberation',
    status: () => {
      const i = State.get('agora.intensity') || 0;
      return `INTENSITÀ: ${i}%`;
    },
    micro: (tile) => {
      const data = State.get('agora.polarization') || [];
      const container = document.createElement('div');
      container.className = 'micro-sparkline';
      const max = Math.max(...data, 1);
      data.forEach(v => {
        const bar = document.createElement('div');
        bar.className = 'spark-bar';
        bar.style.height = `${(v / max) * 100}%`;
        container.appendChild(bar);
      });
      const intensity = State.get('agora.intensity') || 0;
      if (intensity > 60) {
        tile.style.boxShadow = '0 0 15px rgba(255, 51, 68, 0.15)';
      }
      return container;
    }
  },
  {
    id: 'oracle', label: 'ORACLE', route: 'oracle',
    subtitle: 'Planetary Intelligence',
    status: () => {
      const c = State.get('oracle.confidence') || 0;
      const stable = State.get('oracle.stable');
      return `CONFIDENCE: ${(c * 100).toFixed(0)}%${stable === false ? ' · UNSTABLE' : ''}`;
    },
    micro: () => {
      const c = State.get('oracle.confidence') || 0;
      const stable = State.get('oracle.stable');
      const wrap = document.createElement('div');
      wrap.className = 'micro-risk-bar';
      const bar = document.createElement('div');
      bar.className = 'risk-fill';
      bar.style.width = `${c * 100}%`;
      bar.style.background = stable === false
        ? 'linear-gradient(90deg, var(--red-dim), var(--red))'
        : 'linear-gradient(90deg, var(--cyan-dim), var(--cyan))';
      wrap.appendChild(bar);
      return wrap;
    }
  },
  {
    id: 'archivio', label: 'ARCHIVIO', route: 'archivio',
    subtitle: 'Registro Silente',
    status: () => `${State.get('archivio.annotations') || 0} ANNOTAZIONI`,
    micro: () => {
      const succession = State.get('archivio.succession');
      if (succession) {
        const badge = document.createElement('span');
        badge.className = 'ghost-badge';
        badge.textContent = 'GHOST_6';
        return badge;
      }
      const el = document.createElement('div');
      el.className = 'micro-status-line';
      el.textContent = 'REGISTRO ATTIVO';
      return el;
    }
  },
  {
    id: 'lago-ra', label: 'LAGO RÀ', route: null,
    subtitle: '',
    status: () => {
      if (State.get('cycle.ready')) return 'PROSSIMO CICLO';
      return '';
    },
    micro: (tile) => {
      if (State.get('cycle.ready')) {
        const el = document.createElement('div');
        el.className = 'lago-ra-advance';
        el.textContent = '▶ AVANZA';
        tile.classList.add('cycle-ready');
        return el;
      }
      tile.classList.remove('cycle-ready');
      const pulse = document.createElement('div');
      pulse.className = 'lago-ra-pulse';
      return pulse;
    }
  },
  {
    id: 'pneuma', label: 'PNEUMA', route: 'pneuma',
    subtitle: 'Emotional Topology',
    status: () => {
      const tone = State.get('pneuma.tone') || 'neutral';
      return `TONO: ${tone.toUpperCase()}`;
    },
    micro: () => {
      const hue = State.get('pneuma.hue') || '#00c8ff';
      const bar = document.createElement('div');
      bar.className = 'pneuma-tone';
      bar.style.background = `linear-gradient(90deg, ${hue}44, ${hue})`;
      return bar;
    }
  },
  {
    id: 'backbone', label: 'BACKBONE', route: 'backbone',
    subtitle: 'System Metabolism',
    status: () => {
      const modules = State.get('backbone.modules') || 0;
      return `${modules} MODULI ATTIVI`;
    },
    micro: () => {
      const el = document.createElement('div');
      el.className = 'micro-status-line';
      el.textContent = 'METABOLISMO OPERATIVO';
      return el;
    }
  },
  {
    id: 'eei', label: 'EEI', route: 'eei',
    subtitle: 'Exposure Predictor',
    status: () => {
      const idx = State.get('eei.index') || 0;
      const trend = State.get('eei.trend') || 'stable';
      const arrow = trend === 'rising' ? '▲' : trend === 'falling' ? '▼' : '►';
      return `INDICE: ${idx.toFixed(1)} ${arrow}`;
    },
    micro: () => {
      const idx = State.get('eei.index') || 0;
      const wrap = document.createElement('div');
      wrap.className = 'micro-risk-bar';
      const bar = document.createElement('div');
      bar.className = 'risk-fill';
      bar.style.width = `${Math.min(100, idx * 10)}%`;
      bar.style.background = idx > 7
        ? 'linear-gradient(90deg, var(--red-dim), var(--red))'
        : idx > 4
          ? 'linear-gradient(90deg, var(--amber), var(--orange))'
          : 'linear-gradient(90deg, var(--green-dim), var(--green))';
      wrap.appendChild(bar);
      return wrap;
    }
  },
  {
    id: 'chronos', label: 'URBAN CHRONOS', route: 'chronos',
    subtitle: 'Temporal Analysis',
    status: () => {
      const events = State.get('chronos.events') || 0;
      return `${events} EVENTI TRACCIATI`;
    },
    micro: () => {
      const drift = State.get('chronos.drift') || 0;
      const el = document.createElement('div');
      el.className = 'micro-status-line';
      el.textContent = `DRIFT: ${drift}ms`;
      return el;
    }
  }
];


export class HubModule extends ModuleBase {

  constructor(router) {
    super('hub');
    this.router = router;
    this.tileEls = new Map();
  }

  mount(container) {
    super.mount(container);

    // Build grid
    const grid = this.el('div', 'grid-container');

    TILES.forEach(def => {
      const tile = this._buildTile(def);
      grid.appendChild(tile);
      this.tileEls.set(def.id, { element: tile, def });
    });

    container.appendChild(grid);

    // Listen for state changes that affect tiles.
    // Uses subscribe (Bus.on) — tracked for cleanup. Zero leaks.
    this.subscribe('state:changed', (event) => {
      this._onStateChanged(event.payload.key);
    });

    // Also catch batch changes (single emission for N keys)
    this.subscribe('state:batch-changed', (event) => {
      const seen = new Set();
      for (const change of event.payload.changes) {
        const prefix = change.key.split('.')[0];
        if (!seen.has(prefix)) {
          seen.add(prefix);
          this._onStateChanged(change.key);
        }
      }
    });

    // Watch cycle.ready to refresh LAGO RÀ
    this.watchState('cycle.ready', () => {
      const lagoData = this.tileEls.get('lago-ra');
      if (lagoData) this._refreshTile(lagoData);
    });
  }

  unmount() {
    this.tileEls.clear();
    super.unmount();
  }

  _buildTile(def) {
    const tile = this.el('div', 'tile');
    tile.dataset.module = def.id;

    if (def.id === 'lago-ra') {
      tile.classList.add('lago-ra');
    }

    // Header row: icon + title + subtitle
    const header = this.el('div', 'tile-header');

    const icon = ICONS[def.id];
    if (icon) {
      const iconWrap = this.el('div', 'tile-icon');
      iconWrap.innerHTML = icon;
      header.appendChild(iconWrap);
    }

    const titleBlock = this.el('div', 'tile-title-block');
    const title = this.el('div', 'tile-title', def.label);
    titleBlock.appendChild(title);
    if (def.subtitle) {
      const sub = this.el('div', 'tile-subtitle', def.subtitle);
      titleBlock.appendChild(sub);
    }
    header.appendChild(titleBlock);
    tile.appendChild(header);

    // Status
    const status = this.el('div', 'tile-status');
    status.textContent = def.status();
    status.dataset.role = 'status';
    tile.appendChild(status);

    // Micro visualization
    const microContainer = this.el('div', 'tile-micro');
    microContainer.dataset.role = 'micro';
    const microContent = def.micro(tile);
    if (microContent) microContainer.appendChild(microContent);
    tile.appendChild(microContainer);

    // Click handler
    if (def.route) {
      tile.addEventListener('click', () => {
        this.router.open(def.route);
      });
    }

    // LAGO RÀ: cycle advance trigger
    if (def.id === 'lago-ra') {
      tile.addEventListener('click', () => {
        if (State.get('cycle.ready')) {
          Bus.emit('cycle:advance-requested', {}, 'hub');
        }
      });
    }

    return tile;
  }

  /**
   * When state changes, refresh the affected tile(s).
   */
  _onStateChanged(key) {
    // Map state keys to tile IDs
    const prefix = key.split('.')[0];
    const tileData = this.tileEls.get(prefix);

    if (tileData) {
      this._refreshTile(tileData);
    }
  }

  _refreshTile({ element, def }) {
    // Update status text
    const statusEl = element.querySelector('[data-role="status"]');
    if (statusEl) statusEl.textContent = def.status();

    // Rebuild micro visualization
    const microEl = element.querySelector('[data-role="micro"]');
    if (microEl) {
      microEl.innerHTML = '';
      const content = def.micro(element);
      if (content) microEl.appendChild(content);
    }
  }
}
