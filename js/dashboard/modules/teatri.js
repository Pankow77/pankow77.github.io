/**
 * TeatriModule — Theater Monitor.
 * ═══════════════════════════════════
 * Embeds bab-el-mandeb.html — the primary theater monitoring system.
 * Tracks geopolitical chokepoints and narrative seismography.
 */

import { IframeModule } from './iframe-module.js';

export class TeatriModule extends IframeModule {
  constructor() {
    super('teatri', 'bab-el-mandeb.html', { title: 'TEATRI — Theater Monitor' });
  }
}
