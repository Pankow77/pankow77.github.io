/**
 * App — Bootstrap.
 * ═══════════════════
 * Wires everything. One file to rule them all.
 *
 * Boot sequence:
 *   1. Intro overlay (succession protocol) — runs once per session
 *   2. Shell mounts (Header, Footer, Router)
 *   3. Router opens hub (or restores from URL)
 *
 * If player refuses intro, app does not boot.
 */

import { Router } from './router.js';
import { HeaderStrip } from './header.js';
import { FooterStrip } from './footer.js';
import { HubModule } from './modules/hub.js';
import { AgoraModule } from './modules/agora.js';
import { OracleModule } from './modules/oracle.js';
import { ArchivioModule } from './modules/archivio.js';
import { runIntro } from './intro.js';

export async function boot() {
  const appEl = document.getElementById('app');

  if (!appEl) {
    console.error('[APP] #app container not found. Aborting.');
    return;
  }

  // ── Phase 1: Succession Protocol ──
  // Shell is hidden during intro. Overlay sits on top.
  try {
    await runIntro(appEl);
  } catch (e) {
    // Player refused. App does not boot.
    console.log('%c[APP] %cOperator refused succession.', 'color: #ff3344;', 'color: #6b7fa3;');
    return;
  }

  // ── Phase 2: Shell activation ──
  const headerEl = document.getElementById('header-strip');
  const viewEl = document.getElementById('view-container');
  const footerEl = document.getElementById('footer-strip');

  if (!headerEl || !viewEl || !footerEl) {
    console.error('[APP] Shell containers not found. Aborting.');
    return;
  }

  // Show shell (hidden during intro)
  appEl.classList.add('shell-active');

  Router.init(viewEl);

  const header = new HeaderStrip(headerEl, Router);
  const footer = new FooterStrip(footerEl);

  Router.register('hub', new HubModule(Router));
  Router.register('agora', new AgoraModule());
  Router.register('oracle', new OracleModule());
  Router.register('archivio', new ArchivioModule());

  // ── Phase 3: Open default view ──
  const path = window.location.pathname.replace(/^\//, '').replace(/\/$/, '');
  const target = (path && Router.has(path)) ? path : 'hub';
  Router.open(target, { push: false });

  console.log(
    '%c[APP] %cShell online. %c' + Router.getModules().length + ' modules registered.',
    'color: #00c8ff; font-weight: bold;',
    'color: #6b7fa3;',
    'color: #39ff14;'
  );

  window.__dashboard = { Router, header, footer };
}
