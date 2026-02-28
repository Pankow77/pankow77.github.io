/**
 * EEIModule — Ethical Ecosystem Index Predictor.
 * ═══════════════════════════════════════════════
 * Embeds eei-predictor.html — the EEI divergence projection matrix.
 * Tracks ethical impact across all system domains.
 */

import { IframeModule } from './iframe-module.js';

export class EEIModule extends IframeModule {
  constructor() {
    super('eei', 'eei-predictor.html', { title: 'EEI — Ethical Ecosystem Index' });
  }
}
