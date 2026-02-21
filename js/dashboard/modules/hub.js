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

// ── Tile definitions ──
const TILES = [
  {
    id: 'teatri', label: 'TEATRI', route: 'teatri',
    status: () => {
      const t = State.get('teatri.theaters') || {};
      const alert = Object.values(t).filter(v => v === 'alert').length;
      return alert > 0 ? `${alert} theater alert` : 'All theaters nominal';
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
    status: () => `Intensità: ${State.get('agora.intensity') || 0}%`,
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
      // Glow red if intensity > 60
      const intensity = State.get('agora.intensity') || 0;
      if (intensity > 60) {
        tile.style.boxShadow = '0 0 15px rgba(255, 51, 68, 0.15)';
      }
      return container;
    }
  },
  {
    id: 'oracle', label: 'ORACLE', route: 'oracle',
    status: () => {
      const c = State.get('oracle.confidence') || 0;
      return `Confidenza: ${c.toFixed(2)}`;
    },
    micro: () => {
      const c = State.get('oracle.confidence') || 0;
      const stable = State.get('oracle.stable');
      const el = document.createElement('div');
      el.className = `micro-confidence${stable === false ? ' unstable' : ''}`;
      el.textContent = (c * 100).toFixed(0) + '%';
      return el;
    }
  },
  {
    id: 'archivio', label: 'ARCHIVIO', route: 'archivio',
    status: () => `${State.get('archivio.annotations') || 0} annotazioni`,
    micro: () => {
      const succession = State.get('archivio.succession');
      if (succession) {
        const badge = document.createElement('span');
        badge.className = 'ghost-badge';
        badge.textContent = 'GHOST';
        return badge;
      }
      const el = document.createElement('div');
      el.style.cssText = 'font-size: 10px; color: var(--text-dim);';
      el.textContent = 'Registro attivo';
      return el;
    }
  },
  {
    id: 'lago-ra', label: 'LAGO RÀ', route: null, // Non-clickable
    status: () => '',
    micro: () => {
      const pulse = document.createElement('div');
      pulse.className = 'lago-ra-pulse';
      return pulse;
    }
  },
  {
    id: 'pneuma', label: 'PNEUMA', route: 'pneuma',
    status: () => {
      const tone = State.get('pneuma.tone') || 'neutral';
      return `Tono: ${tone}`;
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
    status: () => {
      const modules = State.get('backbone.modules') || 0;
      return `${modules} moduli attivi`;
    },
    micro: () => {
      const el = document.createElement('div');
      el.style.cssText = 'font-size: 10px; color: var(--text-dim);';
      el.textContent = 'Metabolismo sistema';
      return el;
    }
  },
  {
    id: 'eei', label: 'EEI', route: 'eei',
    status: () => {
      const idx = State.get('eei.index') || 0;
      const trend = State.get('eei.trend') || 'stable';
      const arrow = trend === 'rising' ? '↑' : trend === 'falling' ? '↓' : '→';
      return `Indice: ${idx.toFixed(1)} ${arrow}`;
    },
    micro: () => {
      const idx = State.get('eei.index') || 0;
      const el = document.createElement('div');
      el.className = 'micro-confidence';
      el.style.color = idx > 7 ? 'var(--red)' : idx > 4 ? 'var(--amber)' : 'var(--green)';
      el.textContent = idx.toFixed(1);
      return el;
    }
  },
  {
    id: 'chronos', label: 'URBAN CHRONOS', route: 'chronos',
    status: () => {
      const events = State.get('chronos.events') || 0;
      return `${events} eventi tracciati`;
    },
    micro: () => {
      const drift = State.get('chronos.drift') || 0;
      const el = document.createElement('div');
      el.style.cssText = 'font-size: 10px; color: var(--text-dim);';
      el.textContent = `Drift: ${drift}ms`;
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

    // Listen for state changes that affect tiles
    this.subscribe('state:changed', (event) => {
      this._onStateChanged(event.payload.key);
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

    // Title
    const title = this.el('div', 'tile-title', def.label);
    tile.appendChild(title);

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

    // Click handler (not for LAGO RÀ)
    if (def.route) {
      tile.addEventListener('click', () => {
        this.router.open(def.route);
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
