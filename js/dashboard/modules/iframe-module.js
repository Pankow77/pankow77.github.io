/**
 * IframeModule — Base class for embedding standalone pages.
 * ═══════════════════════════════════════════════════════════
 * Extends ModuleBase. Mounts a standalone HTML page inside the
 * dashboard shell via iframe. The standalone page receives
 * ?embedded=1 so it can hide its own navigation.
 *
 * Inter-frame communication:
 *   - Parent → iframe: postMessage({ type: 'sigil:state', key, value })
 *   - Iframe → parent: postMessage({ type: 'sigil:navigate', route })
 *
 * Usage:
 *   class OracleModule extends IframeModule {
 *     constructor() { super('oracle', 'oracle.html'); }
 *   }
 */

import { ModuleBase } from '../module-base.js';
import { State } from '../state.js';

export class IframeModule extends ModuleBase {

  /**
   * @param {string} name   — module name (matches router key)
   * @param {string} src    — relative path to standalone HTML page
   * @param {Object} opts   — optional config
   * @param {string} opts.title — accessible title for iframe
   */
  constructor(name, src, opts = {}) {
    super(name);
    this.src = src;
    this.iframeTitle = opts.title || name.toUpperCase();
    this._iframe = null;
    this._messageHandler = null;
  }

  mount(container) {
    super.mount(container);

    // Build wrapper
    const wrapper = this.el('div', 'iframe-module-wrapper');

    // Build iframe
    const iframe = document.createElement('iframe');
    iframe.className = 'module-iframe';
    iframe.src = this.src + (this.src.includes('?') ? '&' : '?') + 'embedded=1';
    iframe.title = this.iframeTitle;
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups');
    iframe.setAttribute('loading', 'lazy');

    this._iframe = iframe;
    wrapper.appendChild(iframe);
    container.appendChild(wrapper);

    // Listen for messages from iframe
    this._messageHandler = (event) => {
      if (!event.data || typeof event.data !== 'object') return;
      if (event.data.type === 'sigil:navigate' && event.data.route) {
        // Iframe requests navigation to another module
        const { Bus } = window.__dashboard || {};
        if (window.__dashboard && window.__dashboard.Router) {
          window.__dashboard.Router.open(event.data.route);
        }
      }
      if (event.data.type === 'sigil:state-update' && event.data.key) {
        State.set(event.data.key, event.data.value);
      }
    };
    window.addEventListener('message', this._messageHandler);
  }

  unmount() {
    // Clean up message listener
    if (this._messageHandler) {
      window.removeEventListener('message', this._messageHandler);
      this._messageHandler = null;
    }

    // Remove iframe reference
    this._iframe = null;

    super.unmount();
  }

  /**
   * Send state to the embedded page.
   */
  postToIframe(type, payload) {
    if (this._iframe && this._iframe.contentWindow) {
      this._iframe.contentWindow.postMessage({ type, ...payload }, '*');
    }
  }
}
