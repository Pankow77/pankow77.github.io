/**
 * PneumaModule — Local Operational Sanctuary.
 * ═══════════════════════════════════════════════
 * Embeds pneuma.html — DEMETER / URBANIX / NEXUS.
 * The operator's personal sanctuary for local analysis.
 */

import { IframeModule } from './iframe-module.js';

export class PneumaModule extends IframeModule {
  constructor() {
    super('pneuma', 'pneuma.html', { title: 'PNEUMA — Operational Sanctuary' });
  }
}
