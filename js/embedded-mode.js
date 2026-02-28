/**
 * Embedded Mode — Universal iframe integration layer.
 * ═══════════════════════════════════════════════════════
 * Detects ?embedded=1 in URL and adapts the page for dashboard embedding.
 *
 * When active:
 *   1. Hides navigation headers, footers, and cross-links
 *   2. Intercepts navigation links → sends postMessage to parent
 *   3. Adds body.embedded class for CSS overrides
 *   4. Enables ESC key passthrough to parent
 *
 * Usage: <script src="js/embedded-mode.js"></script>
 * Place at the END of the <body>, after all other scripts.
 */

(function() {
  'use strict';

  const params = new URLSearchParams(window.location.search);
  if (params.get('embedded') !== '1') return;

  // ── Mark body ──
  document.body.classList.add('embedded');

  // ── Route map: standalone page → dashboard module name ──
  const ROUTE_MAP = {
    'oracle.html': 'oracle',
    'agora.html': 'agora',
    'pneuma.html': 'pneuma',
    'urban-chronos.html': 'chronos',
    'archivio-silente.html': 'archivio',
    'eei-predictor.html': 'eei',
    'backbone.html': 'backbone',
    'bab-el-mandeb.html': 'teatri',
    'ice-italy.html': 'teatri',
    'index.html': 'hub',
    'dashboard.html': 'hub'
  };

  // ── Inject CSS to hide navigation elements ──
  const style = document.createElement('style');
  style.textContent = `
    body.embedded {
      /* Remove any top/bottom padding that assumed standalone layout */
      margin: 0 !important;
      padding: 0 !important;
      overflow-x: hidden !important;
    }

    /* ═══ UNIVERSAL NAVIGATION HIDE ═══ */

    /* Main headers */
    body.embedded .top-header,
    body.embedded .header,
    body.embedded .app-header,
    body.embedded .backbone-header,
    body.embedded .top-bar {
      display: none !important;
    }

    /* Tab bars */
    body.embedded .tab-bar {
      display: none !important;
    }

    /* Footers */
    body.embedded .status-footer,
    body.embedded .app-footer,
    body.embedded .predictor-footer,
    body.embedded .command-bar {
      display: none !important;
    }

    /* Boot screens (pneuma etc.) — skip boot animation when embedded */
    body.embedded #bootScreen {
      display: none !important;
    }

    /* Adjust main content to fill space */
    body.embedded .main-layout {
      min-height: 100vh !important;
    }

    body.embedded .main-content {
      padding-top: 16px !important;
    }
  `;
  document.head.appendChild(style);

  // ── Intercept cross-navigation links ──
  document.addEventListener('click', function(e) {
    const link = e.target.closest('a[href]');
    if (!link) return;

    const href = link.getAttribute('href');
    if (!href) return;

    // Only intercept local page links
    const filename = href.split('/').pop().split('?')[0];
    const route = ROUTE_MAP[filename];

    if (route && window.parent !== window) {
      e.preventDefault();
      window.parent.postMessage({
        type: 'sigil:navigate',
        route: route
      }, '*');
    }
  }, true);

  // ── ESC key: passthrough to parent ──
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && window.parent !== window) {
      window.parent.postMessage({
        type: 'sigil:navigate',
        route: 'hub'
      }, '*');
    }
  });

  // ── Listen for state from parent ──
  window.addEventListener('message', function(e) {
    if (!e.data || typeof e.data !== 'object') return;
    if (e.data.type === 'sigil:state') {
      // Parent sends state updates — dispatch custom event
      window.dispatchEvent(new CustomEvent('sigil:state-update', {
        detail: { key: e.data.key, value: e.data.value }
      }));
    }
  });

  // ── Skip boot sequences if embedded ──
  // Pneuma and others have boot screens — force-skip them
  window.addEventListener('DOMContentLoaded', function() {
    const bootScreen = document.getElementById('bootScreen');
    if (bootScreen) {
      bootScreen.style.display = 'none';
      // Trigger any post-boot initialization
      const mainApp = document.getElementById('mainApp') || document.getElementById('app');
      if (mainApp) {
        mainApp.style.display = '';
        mainApp.style.opacity = '1';
      }
    }
  });

  console.log('%c[EMBEDDED] %cModule loaded in dashboard shell.',
    'color: #00c8ff; font-weight: bold;',
    'color: #6b7fa3;'
  );
})();
