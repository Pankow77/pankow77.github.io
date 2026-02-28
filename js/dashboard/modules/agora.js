/**
 * AgoraModule — 16-Core Deliberation Engine.
 * ═══════════════════════════════════════════════
 * Embeds the full agora.html standalone page inside the dashboard shell.
 * Replaces the previous stub with the live AGORA implementation.
 */

import { IframeModule } from './iframe-module.js';

export class AgoraModule extends IframeModule {
  constructor() {
    super('agora', 'agora.html', { title: 'AGORA — Deliberation Engine' });
  }
}
