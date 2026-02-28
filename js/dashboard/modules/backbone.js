/**
 * BackboneModule — System Metabolic Console.
 * ═══════════════════════════════════════════════
 * Embeds backbone.html — the system health and metabolism monitor.
 * Shows module status, uptime, and system-level diagnostics.
 */

import { IframeModule } from './iframe-module.js';

export class BackboneModule extends IframeModule {
  constructor() {
    super('backbone', 'backbone.html', { title: 'BACKBONE — System Console' });
  }
}
