/**
 * SIGIL - Terminal Renderer
 * Handles all DOM rendering: envelopes, decisions, annotations,
 * protocol screens, boot sequence, endgame.
 * Monocromo computazionale. Fosforo su nero.
 */

import { CONFIG } from '../core/config.js';
import { EventBus } from '../core/bus.js';

export class TerminalRenderer {
  constructor() {
    this.bus = EventBus.getInstance();
    this.app = document.getElementById('sigil-app');
    this.content = null;
    this.header = null;
    this.bootScreen = null;
    this.protocolOverlay = null;

    this._init();
    this._bindEvents();
  }

  // ── Initialization ──

  _init() {
    // Build app structure
    this.app.innerHTML = '';

    // Header
    this.header = this._createElement('div', 'sigil-header');
    this.header.innerHTML = `
      <span class="ghost-id">---</span>
      <span class="turn-indicator">TURNO --</span>
      <span class="system-status">SIGIL OPERATIVO</span>
    `;
    this.app.appendChild(this.header);

    // Content area
    this.content = this._createElement('div', 'sigil-content');
    this.app.appendChild(this.content);

    // Protocol overlay (hidden)
    this.protocolOverlay = this._createElement('div', 'protocol-overlay');
    document.body.appendChild(this.protocolOverlay);
  }

  _bindEvents() {
    this.bus.on('game:boot', (data) => this._renderBoot(data));
    this.bus.on('game:initialized', (data) => this._updateHeader(data.run_id, 0));
    this.bus.on('turn:start', (data) => this._renderTurn(data));
    this.bus.on('decision:prompt', (data) => this._renderDecisionPanel(data));
    this.bus.on('decision:made', (data) => this._renderFeedback(data));
    this.bus.on('annotation:prompt', (data) => this._renderAnnotationEditor(data));
    this.bus.on('protocol:phase', (data) => this._renderProtocolPhase(data));
    this.bus.on('game:end', (data) => this._renderEndgame(data));
    this.bus.on('phase:changed', (data) => this._onPhaseChanged(data));
  }

  // ── Boot Sequence ──

  _renderBoot(data) {
    this.bootScreen = this._createElement('div', 'boot-screen');
    document.body.appendChild(this.bootScreen);

    const lines = [
      'SIGIL v0.1 — Sistema di Intelligence Geopolitica Integrata',
      '════════════════════════════════════════════════════════════',
      '',
      'Inizializzazione nodo operativo...',
      `Identificativo operatore: ${data.ghost_id}`,
      'Protocollo di successione: STANDBY',
      'Database scenari: CARICATO',
      'Motore conseguenze: ATTIVO',
      'Analisi annotazioni: ATTIVO',
      '',
      'ATTENZIONE: Ogni decisione è registrata.',
      'ATTENZIONE: Le annotazioni sono il tuo spazio privato.',
      '',
      '════════════════════════════════════════════════════════════',
      '',
      `Premi [INVIO] per iniziare la sessione operativa.`
    ];

    const bootText = this._createElement('div', 'boot-text');
    this.bootScreen.appendChild(bootText);

    // Typewriter effect for boot
    this._typewriterSequence(bootText, lines, 0, () => {
      // Add cursor
      const cursor = this._createElement('span', 'boot-cursor');
      bootText.appendChild(cursor);

      // Wait for keypress
      const handler = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          document.removeEventListener('keydown', handler);
          this.bootScreen.style.transition = 'opacity 0.5s';
          this.bootScreen.style.opacity = '0';
          setTimeout(() => {
            this.bootScreen.remove();
            this.bootScreen = null;
            this.bus.emit('ui:boot_complete');
          }, 500);
        }
      };
      document.addEventListener('keydown', handler);

      // Also allow click/tap
      this.bootScreen.addEventListener('click', () => {
        document.removeEventListener('keydown', handler);
        this.bootScreen.style.transition = 'opacity 0.5s';
        this.bootScreen.style.opacity = '0';
        setTimeout(() => {
          this.bootScreen.remove();
          this.bootScreen = null;
          this.bus.emit('ui:boot_complete');
        }, 500);
      }, { once: true });
    });
  }

  // ── Turn Rendering ──

  _renderTurn(data) {
    this._updateHeader(null, data.turn);
    this.content.innerHTML = '';

    // Render envelopes with stagger
    const envelopes = data.scenario.briefing.envelopes;
    envelopes.forEach((env, i) => {
      setTimeout(() => {
        this._renderEnvelope(env);

        // After last envelope, show continue prompt
        if (i === envelopes.length - 1) {
          setTimeout(() => {
            this._renderContinuePrompt();
          }, CONFIG.UI.POST_ENVELOPE_PAUSE);
        }
      }, i * CONFIG.UI.ENVELOPE_STAGGER);
    });
  }

  _renderEnvelope(envData) {
    const envelope = this._createElement('div', 'envelope');

    const classLower = (envData.classification || '').toLowerCase().replace(/\s+/g, '-');

    envelope.innerHTML = `
      <div class="envelope-header">
        <span class="envelope-sender">${this._escapeHtml(envData.sender)}</span>
        <span class="envelope-classification ${classLower}">${this._escapeHtml(envData.classification)}</span>
      </div>
      <div class="envelope-body"></div>
    `;

    this.content.appendChild(envelope);

    // Typewriter the body
    const body = envelope.querySelector('.envelope-body');
    this._typewriter(body, envData.content);

    // Scroll to bottom
    this._scrollToBottom();
  }

  _renderContinuePrompt() {
    const prompt = this._createElement('div', 'continue-prompt');
    prompt.style.cssText = 'text-align: center; padding: 16px; color: var(--phosphor-dim); font-size: 12px; opacity: 0; animation: panel-appear 0.5s ease forwards;';
    prompt.textContent = '[ Premi INVIO per procedere alla decisione ]';
    this.content.appendChild(prompt);
    this._scrollToBottom();

    const handler = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        document.removeEventListener('keydown', handler);
        prompt.remove();
        this.bus.emit('ui:continue');
      }
    };
    document.addEventListener('keydown', handler);

    prompt.style.cursor = 'pointer';
    prompt.addEventListener('click', () => {
      document.removeEventListener('keydown', handler);
      prompt.remove();
      this.bus.emit('ui:continue');
    }, { once: true });
  }

  // ── Decision Panel ──

  _renderDecisionPanel(data) {
    const panel = this._createElement('div', 'decision-panel');

    let headerText = 'DECISIONE OPERATIVA';
    if (data.post_revelation) {
      headerText = 'DECISIONE OPERATIVA — POST-RIVELAZIONE';
    }

    let html = `<div class="decision-panel-header">${headerText}</div>`;

    data.options.forEach((opt, i) => {
      const key = i + 1;
      html += `
        <div class="decision-option" tabindex="0" data-option-id="${opt.id}" data-key="${key}">
          <div class="option-label">
            <span class="option-key">${key}</span>
            ${this._escapeHtml(opt.label)}
          </div>
          <div class="option-description">${this._escapeHtml(opt.description)}</div>
        </div>
      `;
    });

    panel.innerHTML = html;
    this.content.appendChild(panel);
    this._scrollToBottom();

    // Bind option clicks
    const options = panel.querySelectorAll('.decision-option');
    options.forEach(opt => {
      opt.addEventListener('click', () => {
        this._selectOption(panel, opt);
      });
    });

    // Keyboard shortcuts (1-4)
    const keyHandler = (e) => {
      const num = parseInt(e.key);
      if (num >= 1 && num <= data.options.length) {
        document.removeEventListener('keydown', keyHandler);
        const target = panel.querySelector(`[data-key="${num}"]`);
        if (target) this._selectOption(panel, target);
      }
    };
    document.addEventListener('keydown', keyHandler);
  }

  _selectOption(panel, optionEl) {
    // Visual feedback
    panel.querySelectorAll('.decision-option').forEach(o => o.classList.remove('selected'));
    optionEl.classList.add('selected');

    // Brief delay then emit
    setTimeout(() => {
      const optionId = optionEl.dataset.optionId;
      this.bus.emit('ui:decision_submit', { optionId });
    }, 300);
  }

  // ── Feedback ──

  _renderFeedback(data) {
    if (!data.feedback || data.feedback.length === 0) return;

    const feedbackDiv = this._createElement('div', 'feedback-container');
    feedbackDiv.style.cssText = 'margin-top: 16px; opacity: 0; animation: panel-appear 0.5s ease forwards;';

    for (const line of data.feedback) {
      const p = document.createElement('p');
      p.style.cssText = 'padding: 4px 12px; font-size: 12px; color: var(--phosphor-dim); border-left: 2px solid var(--grey);';
      p.textContent = `> ${line}`;
      feedbackDiv.appendChild(p);
    }

    this.content.appendChild(feedbackDiv);
    this._scrollToBottom();
  }

  // ── Annotation Editor ──

  _renderAnnotationEditor(data) {
    const editor = this._createElement('div', 'annotation-editor');

    editor.innerHTML = `
      <div class="annotation-header">ANNOTAZIONE OPERATORE — TURNO ${data.turn}</div>
      <div class="annotation-prompt">Questo è il tuo spazio. Scrivi quello che pensi. Nessuno lo leggerà.</div>
      <textarea class="annotation-textarea" placeholder="Scrivi qui le tue riflessioni..." maxlength="2000"></textarea>
      <div class="annotation-footer">
        <span class="char-count">0 / 2000</span>
        <div>
          <button class="btn btn-ghost" id="btn-skip-annotation">SALTA</button>
          <button class="btn btn-primary" id="btn-submit-annotation">REGISTRA</button>
        </div>
      </div>
    `;

    this.content.appendChild(editor);
    this._scrollToBottom();

    const textarea = editor.querySelector('.annotation-textarea');
    const charCount = editor.querySelector('.char-count');
    const btnSubmit = editor.querySelector('#btn-submit-annotation');
    const btnSkip = editor.querySelector('#btn-skip-annotation');

    // Focus textarea
    setTimeout(() => textarea.focus(), 100);

    // Character count
    textarea.addEventListener('input', () => {
      charCount.textContent = `${textarea.value.length} / 2000`;
      // Emit draft tracking
      this.bus.emit('annotation:draft_change', { text: textarea.value });
    });

    // Submit
    btnSubmit.addEventListener('click', () => {
      const text = textarea.value.trim();
      if (text.length > 0) {
        editor.style.opacity = '0.5';
        editor.style.pointerEvents = 'none';
        this.bus.emit('ui:annotation_submit', { text });
      }
    });

    // Skip
    btnSkip.addEventListener('click', () => {
      editor.style.opacity = '0.5';
      editor.style.pointerEvents = 'none';
      this.bus.emit('ui:annotation_skip');
    });
  }

  // ── Protocol Screens ──

  _renderProtocolPhase(data) {
    switch (data.phase) {
      case 'BLACKOUT':
        this.protocolOverlay.classList.add('active');
        this.protocolOverlay.innerHTML = '';
        break;

      case 'REVEAL':
        this.protocolOverlay.innerHTML = `
          <div class="protocol-text">${this._escapeHtml(data.data.message)}</div>
        `;
        // Typewriter the reveal text
        const revealText = this.protocolOverlay.querySelector('.protocol-text');
        revealText.textContent = '';
        this._typewriter(revealText, data.data.message);
        break;

      case 'ARCHIVE':
        const archiveHtml = `
          <div class="protocol-text">${this._escapeHtml(data.data.message)}</div>
          <div class="protocol-annotations">
            ${data.data.annotations.map(a => `
              <div class="protocol-annotation-item">
                <div class="turn-label">TURNO ${a.turn}</div>
                <div class="annotation-content">"${this._escapeHtml(a.content)}"</div>
              </div>
            `).join('')}
          </div>
        `;
        this.protocolOverlay.innerHTML = archiveHtml;
        break;

      case 'CHOICE':
        let choiceHtml = `
          <div class="protocol-text">${this._escapeHtml(data.data.message)}</div>
          <div class="protocol-choices">
        `;
        data.data.options.forEach((opt, i) => {
          choiceHtml += `
            <div class="decision-option" tabindex="0" data-option-id="${opt.id}" data-key="${i + 1}" style="border: 1px solid var(--grey); margin-bottom: 8px;">
              <div class="option-label">
                <span class="option-key">${i + 1}</span>
                ${this._escapeHtml(opt.label)}
              </div>
              <div class="option-description" style="padding-left: 28px;">${this._escapeHtml(opt.description)}</div>
            </div>
          `;
        });
        choiceHtml += '</div>';
        this.protocolOverlay.innerHTML = choiceHtml;

        // Bind clicks
        const choiceOptions = this.protocolOverlay.querySelectorAll('.decision-option');
        choiceOptions.forEach(opt => {
          opt.addEventListener('click', () => {
            choiceOptions.forEach(o => o.classList.remove('selected'));
            opt.classList.add('selected');
            setTimeout(() => {
              this.bus.emit('protocol:choice_made', { optionId: opt.dataset.optionId });
            }, 300);
          });
        });

        // Keyboard
        const protocolKeyHandler = (e) => {
          const num = parseInt(e.key);
          if (num >= 1 && num <= data.data.options.length) {
            document.removeEventListener('keydown', protocolKeyHandler);
            const target = this.protocolOverlay.querySelector(`[data-key="${num}"]`);
            if (target) target.click();
          }
        };
        document.addEventListener('keydown', protocolKeyHandler);
        break;

      case 'AFTERMATH':
        this.protocolOverlay.innerHTML = `
          <div class="protocol-text">${this._escapeHtml(data.data.message)}</div>
        `;
        // Auto-dismiss after pause
        setTimeout(() => {
          this.protocolOverlay.classList.remove('active');
          this.protocolOverlay.innerHTML = '';
        }, CONFIG.UI.PROTOCOL_STEP_PAUSE);
        break;
    }
  }

  // ── Endgame ──

  _renderEndgame(data) {
    this.content.innerHTML = '';

    const screen = this._createElement('div', 'endgame-screen');

    // Header
    let html = `
      <div class="endgame-header">ARCHIVIO MORALE — ${this._escapeHtml(data.ghost_id)}</div>
    `;

    // Metrics
    html += '<div class="endgame-metrics">';
    const metricLabels = {
      scientific_credibility: 'Credibilità Scientifica',
      methodological_integrity: 'Integrità Metodologica',
      public_trust: 'Fiducia Pubblica',
      civil_society_trust: 'Fiducia Società Civile',
      government_comfort: 'Comfort Governativo',
      personal_guilt: 'Senso di Colpa',
      decision_fatigue: 'Fatica Decisionale',
      public_awareness: 'Consapevolezza Pubblica'
    };

    for (const [key, label] of Object.entries(metricLabels)) {
      const value = data.final_metrics[key] || 0;
      html += `
        <div class="endgame-metric">
          <span class="metric-name">${label}</span>
          <span class="metric-value">${value}</span>
        </div>
      `;
    }
    html += '</div>';

    // Decisions
    html += '<div class="endgame-decisions">';
    html += '<div class="endgame-header" style="margin-top: 24px;">REGISTRO DECISIONI</div>';
    for (const decision of data.run_data.decisions) {
      html += `
        <div class="endgame-decision">
          <div class="decision-turn">TURNO ${decision.turn}${decision.scenario_id === 'PROTOCOLLO_PADC' ? ' — PROTOCOLLO' : ''}</div>
          <div class="decision-choice">${this._escapeHtml(decision.option_label || decision.option_id)}</div>
        </div>
      `;
    }
    html += '</div>';

    // Annotation stats
    const stats = data.annotation_stats;
    html += `
      <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--grey);">
        <div class="endgame-header">ANALISI ANNOTAZIONI</div>
        <div class="endgame-metric">
          <span class="metric-name">Annotazioni Scritte</span>
          <span class="metric-value">${stats.count}</span>
        </div>
        <div class="endgame-metric">
          <span class="metric-name">Caratteri Totali</span>
          <span class="metric-value">${stats.totalChars}</span>
        </div>
        <div class="endgame-metric">
          <span class="metric-name">Sentimento Medio</span>
          <span class="metric-value">${stats.avgSentiment > 0 ? '+' : ''}${stats.avgSentiment}</span>
        </div>
      </div>
    `;

    // Final message
    html += `
      <div style="margin-top: 32px; padding: 16px; border: 1px solid var(--grey); text-align: center;">
        <p style="color: var(--phosphor-dim); font-size: 12px; margin-bottom: 8px;">Sessione completata.</p>
        <p style="color: var(--phosphor); font-size: 13px;">Le tue scelte sono nell'archivio. Il prossimo operatore deciderà cosa farne.</p>
      </div>
    `;

    screen.innerHTML = html;
    this.content.appendChild(screen);
    this._scrollToBottom();
  }

  // ── Phase Changes ──

  _onPhaseChanged(data) {
    // Update status indicator
    const status = this.header.querySelector('.system-status');
    if (status) {
      const labels = {
        'BOOT': 'AVVIO',
        'BRIEFING': 'BRIEFING',
        'DECISION': 'DECISIONE',
        'ANNOTATION': 'ANNOTAZIONE',
        'CONSEQUENCE': 'ELABORAZIONE',
        'PROTOCOL': 'PROTOCOLLO ATTIVO',
        'ENDGAME': 'SESSIONE CHIUSA'
      };
      status.textContent = labels[data.to] || data.to;

      if (data.to === 'PROTOCOL') {
        status.style.color = 'var(--danger)';
      } else {
        status.style.color = '';
      }
    }
  }

  // ── Utilities ──

  _updateHeader(ghostId, turn) {
    if (ghostId) {
      this.header.querySelector('.ghost-id').textContent = ghostId;
    }
    if (turn !== undefined) {
      this.header.querySelector('.turn-indicator').textContent = turn > 0 ? `TURNO ${turn}` : 'INIZIALIZZAZIONE';
    }
  }

  _typewriter(element, text, speed) {
    speed = speed || CONFIG.UI.TYPEWRITER_SPEED;
    let i = 0;
    element.textContent = '';

    const type = () => {
      if (i < text.length) {
        element.textContent += text[i];
        i++;
        setTimeout(type, speed);
      }
    };
    type();
  }

  _typewriterSequence(container, lines, lineIndex, callback) {
    if (lineIndex >= lines.length) {
      if (callback) callback();
      return;
    }

    const line = lines[lineIndex];
    const lineEl = document.createElement('div');
    container.appendChild(lineEl);

    if (line === '') {
      lineEl.innerHTML = '&nbsp;';
      setTimeout(() => this._typewriterSequence(container, lines, lineIndex + 1, callback), 100);
      return;
    }

    let i = 0;
    const type = () => {
      if (i < line.length) {
        lineEl.textContent += line[i];
        i++;
        setTimeout(type, CONFIG.UI.TYPEWRITER_SPEED);
      } else {
        setTimeout(() => this._typewriterSequence(container, lines, lineIndex + 1, callback), 200);
      }
    };
    type();
  }

  _createElement(tag, className) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    return el;
  }

  _escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  _scrollToBottom() {
    if (this.content) {
      setTimeout(() => {
        this.content.scrollTop = this.content.scrollHeight;
      }, 50);
    }
  }
}
