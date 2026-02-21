/**
 * App — Bootstrap.
 * ═══════════════════
 * Wires everything. One file to rule them all.
 *
 * Shell:
 *   HeaderStrip  (always mounted, reads State)
 *   ViewContainer (modules mount/unmount here)
 *   FooterStrip  (always mounted, reads State)
 *
 * Router opens modules into ViewContainer.
 * Hub is the default module (the 3x3 grid).
 */

import { Router } from './router.js';
import { HeaderStrip } from './header.js';
import { FooterStrip } from './footer.js';
import { HubModule } from './modules/hub.js';
import { AgoraModule } from './modules/agora.js';
import { OracleModule } from './modules/oracle.js';
import { ArchivioModule } from './modules/archivio.js';

export function boot() {
  // ── Grab shell containers ──
  const headerEl = document.getElementById('header-strip');
  const viewEl = document.getElementById('view-container');
  const footerEl = document.getElementById('footer-strip');

  if (!headerEl || !viewEl || !footerEl) {
    console.error('[APP] Shell containers not found. Aborting.');
    return;
  }

  // ── Initialize Router ──
  Router.init(viewEl);

  // ── Mount persistent components ──
  const header = new HeaderStrip(headerEl, Router);
  const footer = new FooterStrip(footerEl);

  // ── Register modules ──
  Router.register('hub', new HubModule(Router));
  Router.register('agora', new AgoraModule());
  Router.register('oracle', new OracleModule());
  Router.register('archivio', new ArchivioModule());

  // ── Open hub (or restore from URL) ──
  const path = window.location.pathname.replace(/^\//, '').replace(/\/$/, '');
  const target = (path && Router.has(path)) ? path : 'hub';
  Router.open(target, false); // false = don't push, we're restoring

  // ── Console signature ──
  console.log(
    '%c[DASHBOARD] %cShell online. %c' + Router.getModules().length + ' modules registered.',
    'color: #00c8ff; font-weight: bold;',
    'color: #6b7fa3;',
    'color: #39ff14;'
  );

  // ── Expose for debugging ──
  window.__dashboard = { Router, header, footer };
}
