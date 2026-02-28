/**
 * OracleModule — Planetary Intelligence System.
 * ═══════════════════════════════════════════════
 * Embeds the full oracle.html standalone page inside the dashboard shell.
 * Replaces the previous stub with the live ORACLE v2.0 implementation.
 */

import { IframeModule } from './iframe-module.js';

export class OracleModule extends IframeModule {
  constructor() {
    super('oracle', 'oracle.html', { title: 'ORACLE — Planetary Intelligence' });
  }
}
