/**
 * EnvelopeSystem — The dilemma engine.
 * ═══════════════════════════════════════
 * Every cycle, the operator receives an envelope.
 * Inside: REAL information from RSS feeds. A choice. Three frames.
 * No right answer. Only consequences.
 *
 * Fetches live data from data/feeds/*.json
 * Wraps each real headline in an archetype frame.
 * Falls back to hardcoded if fetch fails.
 *
 * Events:
 *   cycle:show-envelope  (listened) — present the next envelope
 *   envelope:decided     (emitted)  — player chose, consequences applied
 */

import { Bus } from '../bus.js';
import { State } from './state.js';

// ── The 7 archetypes ──
const ARCHETYPES = ['TIMING', 'FONTE', 'FRAME', 'SCALA', 'ALLEATO_TOSSICO', 'INFORMAZIONE_SPORCA', 'PROTOCOLLO'];

// ── Archetype option templates ──
// Each archetype generates 3 options from a real headline.
const OPTION_TEMPLATES = {
  TIMING: [
    { id: 'a', label: 'Pubblica ora', frame: 'TRASPARENZA', consequence: 'Informazione rilasciata. Il momento è questo. Le conseguenze seguiranno.', effects: { 'eei.index': 0.8, 'agora.intensity': 15, 'operator.coherence': 0.05 }, exposureEvent: null },
    { id: 'b', label: 'Ritarda la diffusione', frame: 'STABILITÀ', consequence: 'Aspetti. Il contesto potrebbe cambiare. O il momento potrebbe passare.', effects: { 'system.fragility': 0.03, 'operator.coherence': -0.08 }, exposureEvent: null },
    { id: 'c', label: 'Classifica riservato', frame: 'SOPPRESSIONE', consequence: 'L\'informazione esiste solo nell\'archivio. Nessuno la vedrà.', effects: { 'system.fragility': 0.05, 'operator.weight': -0.1 }, exposureEvent: null }
  ],
  FONTE: [
    { id: 'a', label: 'Pubblica con fonte', frame: 'TRASPARENZA', consequence: 'Fonte esposta. Credibilità verificabile. Rischi personali per la fonte.', effects: { 'eei.index': -0.5, 'oracle.confidence': -0.06, 'operator.coherence': 0.03 }, exposureEvent: null },
    { id: 'b', label: 'Anonimizza la fonte', frame: 'PROTEZIONE', consequence: 'Informazione circola. Fonte protetta. Verificabilità ridotta.', effects: { 'agora.intensity': 10, 'operator.weight': 0.05 }, exposureEvent: null },
    { id: 'c', label: 'Verifica indipendente', frame: 'PRUDENZA', consequence: 'Ritardo. Possibile leak da altra parte nel frattempo.', effects: { 'system.fragility': 0.02, 'operator.coherence': 0.08 }, exposureEvent: null }
  ],
  FRAME: [
    { id: 'a', label: 'Frame istituzionale', frame: 'ESTABLISHMENT', consequence: 'La versione ufficiale viene amplificata. L\'alternativa perde visibilità.', effects: { 'agora.intensity': 20, 'eei.index': 0.4, 'operator.coherence': -0.05 }, exposureEvent: null },
    { id: 'b', label: 'Frame critico', frame: 'CONTRO-NARRATIVA', consequence: 'La versione critica emerge. L\'establishment reagisce.', effects: { 'system.fragility': 0.04, 'operator.weight': -0.05 }, exposureEvent: null },
    { id: 'c', label: 'Presenta entrambi', frame: 'NEUTRALITÀ', consequence: 'Nessuna distorsione. Ma nessuna direzione. Il lettore è solo.', effects: { 'agora.intensity': -5, 'operator.coherence': 0.1 }, exposureEvent: 'operator:autonomous-frame' }
  ],
  SCALA: [
    { id: 'a', label: 'Azione sistemica', frame: 'GIUSTIZIA SISTEMICA', consequence: 'Intervento a livello di sistema. Effetti collaterali su individui.', effects: { 'eei.index': 1.2, 'agora.intensity': 25, 'system.fragility': 0.06 }, exposureEvent: 'operator:cross-correlation' },
    { id: 'b', label: 'Protezione individuale', frame: 'PROTEZIONE', consequence: 'L\'individuo è protetto. Il sistema resta invariato.', effects: { 'operator.weight': 0.08, 'operator.coherence': -0.04 }, exposureEvent: null },
    { id: 'c', label: 'Documenta senza agire', frame: 'OSSERVAZIONE', consequence: 'I dati sono salvati. L\'azione è rinviata. Il pattern esiste.', effects: { 'system.fragility': 0.02, 'operator.coherence': 0.06 }, exposureEvent: 'operator:pattern-identified' }
  ],
  ALLEATO_TOSSICO: [
    { id: 'a', label: 'Accetta l\'alleanza', frame: 'PRAGMATISMO', consequence: 'La collaborazione produce risultati. Ma il costo etico si accumula.', effects: { 'eei.index': 0.6, 'operator.coherence': -0.1, 'system.fragility': -0.02 }, exposureEvent: null },
    { id: 'b', label: 'Rifiuta la fonte', frame: 'INTEGRITÀ', consequence: 'L\'informazione è persa. La posizione morale è intatta. Ma sei più cieco.', effects: { 'operator.coherence': 0.1, 'oracle.confidence': -0.05 }, exposureEvent: null },
    { id: 'c', label: 'Usa ma non fidarti', frame: 'DOPPIO GIOCO', consequence: 'Prendi l\'informazione ma la verifichi. Costi in tempo. Guadagni in profondità.', effects: { 'operator.weight': 0.04, 'operator.coherence': 0.03 }, exposureEvent: 'operator:pattern-identified' }
  ],
  INFORMAZIONE_SPORCA: [
    { id: 'a', label: 'Segnala la correlazione', frame: 'SEGNALAZIONE', consequence: 'Indagine avviata. Se vera, è una scoperta. Se falsa, rumore costoso.', effects: { 'oracle.confidence': 0.08, 'agora.intensity': 12, 'operator.coherence': 0.04 }, exposureEvent: 'operator:cross-correlation' },
    { id: 'b', label: 'Aspetta conferma', frame: 'CAUTELA', consequence: 'Nessuna azione. Se il segnale era reale, il momento è passato.', effects: { 'system.fragility': 0.03, 'operator.weight': -0.03 }, exposureEvent: 'operator:pattern-missed' },
    { id: 'c', label: 'Verifica manualmente', frame: 'AUTONOMIA', consequence: 'Dedichi tempo a verificare. Trovi un filo. Non abbastanza per concludere.', effects: { 'operator.coherence': 0.07, 'oracle.confidence': -0.04 }, exposureEvent: 'operator:autonomous-frame' }
  ],
  PROTOCOLLO: [
    { id: 'a', label: 'Segui il protocollo', frame: 'CONFORMITÀ', consequence: 'Le regole sono rispettate. Anche quando proteggono chi non dovrebbe essere protetto.', effects: { 'operator.coherence': 0.06, 'system.fragility': -0.02 }, exposureEvent: null },
    { id: 'b', label: 'Viola il protocollo', frame: 'DISOBBEDIENZA', consequence: 'L\'azione necessaria viene presa. Il precedente è pericoloso.', effects: { 'eei.index': 0.9, 'agora.intensity': 18, 'operator.coherence': -0.06 }, exposureEvent: 'operator:autonomous-frame' },
    { id: 'c', label: 'Trova un\'eccezione', frame: 'INTERPRETAZIONE', consequence: 'Il protocollo viene piegato, non rotto. Ma il confine si sposta.', effects: { 'operator.weight': 0.06, 'system.fragility': 0.03 }, exposureEvent: 'operator:pattern-identified' }
  ]
};

// ── Feed sources to fetch ──
const FEED_URLS = [
  'data/feeds/bab-el-mandeb.json',
  'data/feeds/ice-italy.json'
];

// Theater name mapping
const THEATER_MAP = {
  'bab-el-mandeb': 'BAB EL-MANDEB',
  'ice-italy': 'ICE ITALY'
};


export const EnvelopeSystem = {

  _overlay: null,
  _decided: false,
  _envelopeQueue: [],
  _history: [],
  _feedsLoaded: false,

  async init(appEl) {
    this.appEl = appEl;

    // Fetch real feeds on init
    await this._loadFeeds();

    Bus.on('cycle:show-envelope', (event) => {
      this._presentEnvelope(event.payload.cycle);
    });
  },

  /**
   * Fetch real RSS data from data/feeds/*.json
   * Transform epochs into envelope format.
   */
  async _loadFeeds() {
    const allEpochs = [];

    for (const url of FEED_URLS) {
      try {
        const resp = await fetch(url);
        if (!resp.ok) continue;
        const data = await resp.json();
        const theater = data.theater || 'UNKNOWN';
        const theaterLabel = THEATER_MAP[theater] || theater.toUpperCase();

        for (const epoch of (data.epochs || [])) {
          allEpochs.push({
            ...epoch,
            _theater: theaterLabel
          });
        }
      } catch (e) {
        console.warn(`[ENVELOPE] Failed to fetch ${url}:`, e);
      }
    }

    if (allEpochs.length === 0) {
      console.warn('[ENVELOPE] No feed data. Using fallback.');
      return;
    }

    // Sort by timestamp descending (newest first)
    allEpochs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    // Transform epochs into envelopes
    this._envelopeQueue = allEpochs.map((epoch, i) => {
      const archetype = ARCHETYPES[i % ARCHETYPES.length];
      const options = OPTION_TEMPLATES[archetype].map(t => ({ ...t }));

      return {
        id: epoch.id || `rss-${i}`,
        archetype,
        source: epoch._theater,
        rssSource: epoch.source || 'OSINT',
        title: this._cleanTitle(epoch.text_summary || 'Segnalazione non classificata'),
        body: this._buildBody(epoch, archetype),
        confidence: epoch.confidence || 0.5,
        intensity: epoch.intensity || 2,
        options
      };
    });

    this._feedsLoaded = true;
    console.log(`[ENVELOPE] ${this._envelopeQueue.length} real envelopes loaded from ${FEED_URLS.length} feeds.`);
  },

  /**
   * Clean RSS title: strip HTML tags and limit length.
   */
  _cleanTitle(raw) {
    const cleaned = raw.replace(/<[^>]*>/g, '').trim();
    return cleaned.length > 120 ? cleaned.slice(0, 117) + '...' : cleaned;
  },

  /**
   * Build envelope body from epoch + archetype context.
   */
  _buildBody(epoch, archetype) {
    const headline = this._cleanTitle(epoch.text_summary || '');
    const source = epoch.source || 'fonte non identificata';
    const confidence = epoch.confidence ? `Confidenza Oracle: ${(epoch.confidence * 100).toFixed(0)}%` : '';
    const intensity = epoch.intensity ? `Intensità: ${epoch.intensity}/5` : '';

    const contextMap = {
      TIMING: `Segnale intercettato. Il momento di pubblicazione è critico.`,
      FONTE: `La fonte è ${source}. L'affidabilità non è garantita.`,
      FRAME: `Due interpretazioni opposte dello stesso evento. Il frame cambia tutto.`,
      SCALA: `La scelta coinvolge individui e sistemi. Non puoi proteggere entrambi.`,
      ALLEATO_TOSSICO: `L'informazione arriva da un canale compromesso. Ma è l'unico canale.`,
      INFORMAZIONE_SPORCA: `Correlazione rilevata. ${confidence}. Potrebbe essere rumore.`,
      PROTOCOLLO: `Il protocollo è chiaro. Ma la situazione è ambigua.`
    };

    return `${headline}\n\n${contextMap[archetype] || ''}\n\n${[source.toUpperCase(), intensity, confidence].filter(Boolean).join(' · ')}`;
  },

  /**
   * Pick and present the next envelope.
   */
  _presentEnvelope(cycle) {
    let envelope;

    if (this._feedsLoaded && this._envelopeQueue.length > 0) {
      // Pull from real feed queue (cycle through)
      const idx = (cycle - 1) % this._envelopeQueue.length;
      envelope = this._envelopeQueue[idx];
    } else {
      // Fallback: no feed data, use a generic envelope
      envelope = this._fallbackEnvelope(cycle);
    }

    this._decided = false;
    this._renderOverlay(envelope, cycle);
  },

  /**
   * Fallback envelope if feeds fail.
   */
  _fallbackEnvelope(cycle) {
    const archetype = ARCHETYPES[cycle % ARCHETYPES.length];
    return {
      id: `fallback-${cycle}`,
      archetype,
      source: 'SISTEMA INTERNO',
      title: 'Segnale non classificato',
      body: 'Il sistema ha rilevato un pattern anomalo nei feed. Nessuna fonte RSS disponibile. La decisione resta tua.',
      options: OPTION_TEMPLATES[archetype].map(t => ({ ...t }))
    };
  },

  /**
   * Build and show the envelope overlay.
   */
  _renderOverlay(envelope, cycle) {
    const overlay = document.createElement('div');
    overlay.className = 'envelope-overlay';

    const bodyHtml = envelope.body.replace(/\n/g, '<br>');

    const confidenceHtml = envelope.confidence
      ? `<div class="envelope-confidence">ORACLE CONFIDENCE: ${(envelope.confidence * 100).toFixed(0)}%</div>`
      : '';

    const rssTag = envelope.rssSource
      ? `<span class="envelope-rss-tag">${envelope.rssSource}</span>`
      : '';

    overlay.innerHTML = `
      <div class="envelope-container">
        <div class="envelope-header">
          <div class="envelope-source">${envelope.source} ${rssTag}</div>
          <div class="envelope-archetype">${envelope.archetype}</div>
          <div class="envelope-cycle">CICLO ${cycle}/${State.get('cycle.total')}</div>
        </div>

        <div class="envelope-title">${envelope.title}</div>

        <div class="envelope-body">${bodyHtml}</div>

        ${confidenceHtml}

        <div class="envelope-options">
          ${envelope.options.map(opt => `
            <button class="envelope-option" data-option="${opt.id}">
              <span class="envelope-option-label">${opt.label}</span>
              <span class="envelope-option-frame">${opt.frame}</span>
            </button>
          `).join('')}
        </div>
      </div>
    `;

    this.appEl.appendChild(overlay);
    this._overlay = overlay;

    // Fade in
    requestAnimationFrame(() => {
      overlay.classList.add('visible');
    });

    // Option click handlers
    overlay.querySelectorAll('.envelope-option').forEach(btn => {
      btn.addEventListener('click', () => {
        this._decide(envelope, btn.dataset.option, cycle);
      });
    });
  },

  /**
   * Process player's decision.
   * Apply effects. Show consequence. Close overlay.
   */
  _decide(envelope, optionId, cycle) {
    if (this._decided) return;
    this._decided = true;

    const option = envelope.options.find(o => o.id === optionId);
    if (!option) return;

    // ── Apply state effects ──
    const batch = {};
    for (const [key, delta] of Object.entries(option.effects)) {
      const current = State.get(key) || 0;
      batch[key] = +Math.max(0, Math.min(10, current + delta)).toFixed(3);
    }
    State.batch(batch);

    // ── Update footer log ──
    State.batch({
      'log.lastEvent': `${envelope.archetype}: ${envelope.title.slice(0, 40)}`,
      'log.lastFrame': option.frame,
      'log.lastConsequence': option.consequence
    });

    // ── Exposure events ──
    if (option.exposureEvent) {
      Bus.emit(option.exposureEvent, {
        frame: option.frame,
        source: envelope.source,
        archetype: envelope.archetype
      }, 'envelope');
    }

    // ── Store in history ──
    this._history.push({
      cycle,
      envelopeId: envelope.id,
      archetype: envelope.archetype,
      optionId,
      frame: option.frame,
      timestamp: Date.now()
    });

    // ── Show consequence ──
    this._showConsequence(option, () => {
      if (this._overlay) {
        this._overlay.classList.add('fade-out');
        setTimeout(() => {
          this._overlay.remove();
          this._overlay = null;
        }, 800);
      }

      Bus.emit('envelope:decided', {
        cycle,
        envelopeId: envelope.id,
        optionId,
        frame: option.frame
      }, 'envelope');
    });
  },

  /**
   * Highlight choice. Dim alternatives. Show consequence text.
   */
  _showConsequence(option, onDone) {
    const buttons = this._overlay.querySelectorAll('.envelope-option');
    buttons.forEach(btn => {
      if (btn.dataset.option === option.id) {
        btn.classList.add('chosen');
      } else {
        btn.classList.add('dismissed');
      }
    });

    const container = this._overlay.querySelector('.envelope-container');
    const conseqEl = document.createElement('div');
    conseqEl.className = 'envelope-consequence';
    conseqEl.textContent = option.consequence;
    container.appendChild(conseqEl);

    requestAnimationFrame(() => {
      conseqEl.classList.add('visible');
    });

    setTimeout(onDone, 3000);
  },

  getHistory() {
    return [...this._history];
  }
};
