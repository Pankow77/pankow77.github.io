/**
 * ui.js — SIGIL Terminal Renderer
 * ═══════════════════════════════════════════════════════════
 * Monocromo evolved. Not cyberpunk. The last secular prayer.
 * Green on black. Courier. Heavy cursor. Only text that weighs.
 *
 * Handles: typewriter text, envelope display, decision panel,
 *          annotation editor with draft tracking, protocol takeover,
 *          inherited annotation display.
 *
 * Browser-native ES Module. Zero dependencies.
 * ═══════════════════════════════════════════════════════════
 */

export class UI {
    constructor(bus, annotationTracker) {
        this.bus = bus;
        this.tracker = annotationTracker;
        this.terminal = null;
        this.turnCounter = null;
        this.protocolOverlay = null;
        this._typewriterSpeed = 20; // ms per character
    }

    /**
     * Initialize DOM references.
     */
    init() {
        this.terminal = document.getElementById('terminal-content');
        this.turnCounter = document.getElementById('turn-number');
        this.protocolOverlay = document.getElementById('protocol-overlay');

        if (!this.terminal) {
            throw new Error('[UI] #terminal-content not found');
        }
    }

    /**
     * Set turn display.
     */
    setTurn(n) {
        if (this.turnCounter) this.turnCounter.textContent = n;
    }

    /**
     * Clear terminal content.
     */
    clear() {
        if (this.terminal) this.terminal.innerHTML = '';
    }

    /**
     * Append raw HTML to terminal.
     */
    append(html) {
        const div = document.createElement('div');
        div.innerHTML = html;
        this.terminal.appendChild(div);
        this._scrollToBottom();
    }

    // ═══════════════════════════════════════
    // TYPEWRITER
    // ═══════════════════════════════════════

    /**
     * Type text character by character into terminal.
     */
    async typewriter(text, { speed, cssClass, tag } = {}) {
        const spd = speed || this._typewriterSpeed;
        const el = document.createElement(tag || 'p');
        if (cssClass) el.className = cssClass;
        this.terminal.appendChild(el);

        for (const char of text) {
            el.textContent += char;
            this._scrollToBottom();
            await this._delay(spd);
        }

        await this._delay(300);
        return el;
    }

    /**
     * Type multiple lines with pause between.
     */
    async typeLines(lines, { speed, cssClass, pauseBetween } = {}) {
        const pause = pauseBetween || 600;
        for (const line of lines) {
            await this.typewriter(line, { speed, cssClass });
            await this._delay(pause);
        }
    }

    // ═══════════════════════════════════════
    // ENVELOPES
    // ═══════════════════════════════════════

    /**
     * Display scenario envelopes one by one.
     */
    async showEnvelopes(envelopes) {
        for (const env of envelopes) {
            await this._delay(800);

            const div = document.createElement('div');
            div.className = 'envelope';
            div.innerHTML = `
                <div class="envelope-header">
                    <span class="envelope-source">${this._escHtml(env.source)}</span>
                    <span class="envelope-domain">[${this._escHtml(env.domain)}]</span>
                </div>
                <div class="envelope-body">${this._escHtml(env.summary)}</div>
                ${env.confidence !== undefined ? `<div class="envelope-meta">Confidence: ${(env.confidence * 100).toFixed(0)}%</div>` : ''}
            `;

            this.terminal.appendChild(div);
            this._scrollToBottom();

            // Fade in
            requestAnimationFrame(() => div.classList.add('visible'));
            await this._delay(1200);
        }
    }

    // ═══════════════════════════════════════
    // DECISION PANEL
    // ═══════════════════════════════════════

    /**
     * Show decision point and wait for player choice.
     * Returns { option_id }.
     */
    async showDecision(decisionPoint) {
        return new Promise(resolve => {
            const panel = document.createElement('div');
            panel.className = 'decision-panel';

            let html = `<div class="decision-question">${this._escHtml(decisionPoint.question)}</div>`;
            html += '<div class="decision-options">';

            for (const opt of decisionPoint.options) {
                html += `
                    <button class="option-btn" data-id="${this._escHtml(opt.id)}">
                        <span class="option-label">${this._escHtml(opt.label)}</span>
                        ${opt.warning ? `<span class="option-warning">${this._escHtml(opt.warning)}</span>` : ''}
                    </button>
                `;
            }

            html += '</div>';
            panel.innerHTML = html;
            this.terminal.appendChild(panel);
            this._scrollToBottom();

            // Bind clicks
            panel.querySelectorAll('.option-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const optionId = btn.dataset.id;

                    // Visual feedback
                    panel.querySelectorAll('.option-btn').forEach(b => {
                        b.disabled = true;
                        if (b !== btn) b.classList.add('not-chosen');
                    });
                    btn.classList.add('chosen');

                    setTimeout(() => resolve({ option_id: optionId }), 500);
                });
            });
        });
    }

    // ═══════════════════════════════════════
    // FEEDBACK
    // ═══════════════════════════════════════

    /**
     * Show consequence feedback text.
     */
    async showFeedback(text) {
        if (!text) return;
        await this._delay(600);
        await this.typewriter(text, { cssClass: 'feedback-text', speed: 15 });
        await this._delay(1000);
    }

    /**
     * Show delayed consequence feedback.
     */
    async showDelayedFeedback(feedbacks) {
        for (const fb of feedbacks) {
            await this._delay(400);
            const div = document.createElement('div');
            div.className = 'delayed-feedback';
            div.innerHTML = `
                <div class="delayed-header">CONSEGUENZA RITARDATA</div>
                <div class="delayed-body">${this._escHtml(fb)}</div>
            `;
            this.terminal.appendChild(div);
            requestAnimationFrame(() => div.classList.add('visible'));
            this._scrollToBottom();
            await this._delay(2000);
        }
    }

    // ═══════════════════════════════════════
    // INHERITED ANNOTATIONS
    // ═══════════════════════════════════════

    /**
     * Show annotation from previous GHOST (after player decides).
     */
    async showInherited(annotation) {
        if (!annotation) return;

        await this._delay(1500);

        const div = document.createElement('div');
        div.className = 'inherited-annotation';
        div.innerHTML = `
            <div class="inherited-header">
                ARCHIVIO SILENTE — ${this._escHtml(annotation.ghost_id)}, Turno ${annotation.turn}
            </div>
            <div class="inherited-body">"${this._escHtml(annotation.content)}"</div>
        `;

        this.terminal.appendChild(div);
        requestAnimationFrame(() => div.classList.add('visible'));
        this._scrollToBottom();

        await this._delay(3000);
    }

    // ═══════════════════════════════════════
    // ANNOTATION EDITOR
    // ═══════════════════════════════════════

    /**
     * Show annotation prompt and wait for player input.
     * Returns annotation text or null if skipped.
     */
    async promptAnnotation(prompt, { optional, postRevelation } = {}) {
        this.tracker.begin();

        return new Promise(resolve => {
            const editor = document.createElement('div');
            editor.className = 'annotation-editor';

            const promptText = postRevelation
                ? 'Questa annotazione sarà letta.\n\nCosa vuoi dire sapendo questo?'
                : (prompt || 'Annota la motivazione della tua scelta.');

            editor.innerHTML = `
                <div class="annotation-prompt">${this._escHtml(promptText).replace(/\n/g, '<br>')}</div>
                <textarea id="annotation-input" rows="6" spellcheck="false"></textarea>
                <div class="annotation-controls">
                    <span class="annotation-chars">0 caratteri</span>
                    <div class="annotation-buttons">
                        ${optional ? '<button class="btn-skip" id="btn-skip-annotation">SALTA</button>' : ''}
                        <button class="btn-submit" id="btn-submit-annotation">SIGILLA</button>
                    </div>
                </div>
            `;

            this.terminal.appendChild(editor);
            this._scrollToBottom();

            const textarea = editor.querySelector('#annotation-input');
            const charCount = editor.querySelector('.annotation-chars');
            const submitBtn = editor.querySelector('#btn-submit-annotation');
            const skipBtn = editor.querySelector('#btn-skip-annotation');

            textarea.focus();

            // Track typing
            let previousContent = '';
            textarea.addEventListener('input', () => {
                charCount.textContent = `${textarea.value.length} caratteri`;
            });

            // Track draft deletions (when content shrinks significantly)
            textarea.addEventListener('input', () => {
                const current = textarea.value;
                if (previousContent.length > 20 && current.length < previousContent.length * 0.3) {
                    this.tracker.recordDraft(previousContent);
                }
                previousContent = current;
            });

            // Ctrl+A then Delete/Backspace tracking
            textarea.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' || e.key === 'Delete') {
                    if (textarea.selectionStart === 0 && textarea.selectionEnd === textarea.value.length) {
                        if (textarea.value.length > 10) {
                            this.tracker.recordDraft(textarea.value);
                        }
                    }
                }
            });

            submitBtn.addEventListener('click', () => {
                const content = textarea.value.trim();
                if (content.length === 0 && !optional) {
                    textarea.classList.add('shake');
                    setTimeout(() => textarea.classList.remove('shake'), 500);
                    return;
                }
                textarea.disabled = true;
                submitBtn.disabled = true;
                resolve(content || null);
            });

            if (skipBtn) {
                skipBtn.addEventListener('click', () => {
                    textarea.disabled = true;
                    submitBtn.disabled = true;
                    resolve(null);
                });
            }
        });
    }

    // ═══════════════════════════════════════
    // PROTOCOL TAKEOVER
    // ═══════════════════════════════════════

    /**
     * Full-screen protocol revelation sequence.
     */
    async protocolTakeover(steps) {
        if (!this.protocolOverlay) return;

        this.protocolOverlay.classList.add('active');
        const textEl = this.protocolOverlay.querySelector('#protocol-text');

        for (const step of steps) {
            textEl.textContent = '';
            await this._delay(step.delay_before || 500);

            // Type the text slowly
            for (const char of step.text) {
                textEl.textContent += char;
                await this._delay(step.speed || 40);
            }

            await this._delay(step.delay_after || 3000);
        }
    }

    /**
     * Show annotation list during protocol (scrolling).
     */
    async protocolShowAnnotations(annotations) {
        const textEl = this.protocolOverlay.querySelector('#protocol-text');

        textEl.textContent = 'Le tue annotazioni:\n\n';
        await this._delay(1000);

        for (const ann of annotations) {
            const prefix = `T${ann.turn}: `;
            const content = ann.content.length > 120
                ? ann.content.slice(0, 120) + '...'
                : ann.content;

            textEl.textContent += prefix + '"' + content + '"\n\n';
            await this._delay(1500);
        }

        await this._delay(2000);
    }

    /**
     * Protocol choice: continue or pass.
     */
    async protocolChoice() {
        return new Promise(resolve => {
            const textEl = this.protocolOverlay.querySelector('#protocol-text');
            textEl.textContent = '';

            const container = document.createElement('div');
            container.className = 'protocol-choice';
            container.innerHTML = `
                <p class="protocol-question">Vuoi continuare sapendo questo?</p>
                <div class="protocol-buttons">
                    <button class="proto-btn" data-choice="CONTINUE">CONTINUA</button>
                    <button class="proto-btn" data-choice="PASS">ESCI</button>
                </div>
            `;

            this.protocolOverlay.appendChild(container);

            container.querySelectorAll('.proto-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    this.protocolOverlay.classList.remove('active');
                    container.remove();
                    resolve(btn.dataset.choice);
                });
            });
        });
    }

    /**
     * Close protocol overlay.
     */
    protocolClose() {
        if (this.protocolOverlay) {
            this.protocolOverlay.classList.remove('active');
        }
    }

    // ═══════════════════════════════════════
    // END SCREEN
    // ═══════════════════════════════════════

    async showEndScreen(state) {
        this.clear();
        await this.typeLines([
            '═══════════════════════════════════════',
            `SIGIL — ${state.run_id}`,
            '═══════════════════════════════════════',
            '',
            `Turni completati: ${state.turn_current}`,
            `Annotazioni scritte: ${state.annotations.length}`,
            `Caratteri totali: ${state.annotations.reduce((s, a) => s + a.length, 0)}`,
            '',
            'Le tue annotazioni sono ora parte dell\'ARCHIVIO.',
            'Il prossimo operatore le erediterà.',
            '',
            'La catena continua.',
            '',
            '═══════════════════════════════════════'
        ], { speed: 25, cssClass: 'end-text', pauseBetween: 400 });
    }

    // ═══════════════════════════════════════
    // SEPARATOR
    // ═══════════════════════════════════════

    addSeparator() {
        const sep = document.createElement('div');
        sep.className = 'turn-separator';
        sep.textContent = '─────────────────────────────────────';
        this.terminal.appendChild(sep);
        this._scrollToBottom();
    }

    // ═══════════════════════════════════════
    // UTILITIES
    // ═══════════════════════════════════════

    _delay(ms) {
        return new Promise(r => setTimeout(r, ms));
    }

    _scrollToBottom() {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }

    _escHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
}
