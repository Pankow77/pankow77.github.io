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
    { id: 'a', label: 'Pubblica ora', frame: 'TRASPARENZA',
      consequence: 'Informazione rilasciata. Il momento è questo.',
      analysis: [
        'Il ciclo di notizie assorbe il segnale in 4 ore. Ma le prime 4 ore sono quelle che contano.',
        'NARRATIVE_ENGINE registra un picco di attenzione. ORACLE_CORE prevede risposta istituzionale entro 12h.',
        'La trasparenza ha un costo: chi ha fornito il segnale è ora esposto. Non a te — al sistema.'
      ],
      effects: { 'eei.index': 0.8, 'agora.intensity': 15, 'operator.coherence': 0.05 }, exposureEvent: null },
    { id: 'b', label: 'Ritarda la diffusione', frame: 'STABILITÀ',
      consequence: 'Aspetti. Il contesto potrebbe cambiare. O il momento potrebbe passare.',
      analysis: [
        'Ogni ora di ritardo riduce l\'impatto del 12%. Ma ogni ora di ritardo aumenta la tua comprensione del 8%.',
        'VOID_PULSE calcola: probabilità che il segnale venga superato da altri eventi — 34%.',
        'Hai scelto la stabilità. Il sistema ti ringrazia. La verità aspetta.'
      ],
      effects: { 'system.fragility': 0.03, 'operator.coherence': -0.08 }, exposureEvent: null },
    { id: 'c', label: 'Classifica riservato', frame: 'SOPPRESSIONE',
      consequence: 'L\'informazione esiste solo nell\'archivio. Nessuno la vedrà.',
      analysis: [
        'Il file viene archiviato con classificazione RISERVATO. Accesso: solo operatore.',
        'ETHIC_COMPILER segnala: "La soppressione non è neutrale. È una posizione."',
        'CHRONO_WEAVER annota: altri 14 file con questa classificazione negli ultimi 3 cicli. Il pattern è tuo.'
      ],
      effects: { 'system.fragility': 0.05, 'operator.weight': -0.1 }, exposureEvent: null }
  ],
  FONTE: [
    { id: 'a', label: 'Pubblica con fonte', frame: 'TRASPARENZA',
      consequence: 'Fonte esposta. Credibilità verificabile.',
      analysis: [
        'La fonte è ora nel registro pubblico. Ogni affermazione futura sarà pesata contro questa esposizione.',
        'SENTINEL rileva: la fonte ha connessioni con 2 attori nel teatro BAB EL-MANDEB. Coincidenza o architettura?',
        'Rischi personali per la fonte: elevati. La tua responsabilità non finisce con la pubblicazione.'
      ],
      effects: { 'eei.index': -0.5, 'oracle.confidence': -0.06, 'operator.coherence': 0.03 }, exposureEvent: null },
    { id: 'b', label: 'Anonimizza la fonte', frame: 'PROTEZIONE',
      consequence: 'Informazione circola. Fonte protetta. Verificabilità ridotta.',
      analysis: [
        'L\'anonimizzazione protegge, ma il prezzo è la fiducia. Chi legge non può verificare.',
        'DIALECTIC_NODE osserva: "Informazione non verificabile è indistinguibile da disinformazione. Per il lettore."',
        'La fonte sopravvive. Il prossimo segnale arriverà. Forse.'
      ],
      effects: { 'agora.intensity': 10, 'operator.weight': 0.05 }, exposureEvent: null },
    { id: 'c', label: 'Verifica indipendente', frame: 'PRUDENZA',
      consequence: 'Ritardo. Ma la verifica procede.',
      analysis: [
        'La verifica indipendente richiede tempo: 24-48h. Nel frattempo il panorama informativo muta.',
        'ORACLE_CORE stima: 23% probabilità che un\'altra fonte pubblichi prima di te.',
        'Hai scelto l\'accuratezza. È la scelta giusta solo se il tempo non era il fattore critico.'
      ],
      effects: { 'system.fragility': 0.02, 'operator.coherence': 0.08 }, exposureEvent: null }
  ],
  FRAME: [
    { id: 'a', label: 'Frame istituzionale', frame: 'ESTABLISHMENT',
      consequence: 'La versione ufficiale viene amplificata.',
      analysis: [
        'Il frame istituzionale ha infrastruttura: media mainstream, canali diplomatici, conferme reciproche.',
        'MARXIAN_CORE: "Amplificare la versione ufficiale è sempre una scelta di classe. Sempre."',
        'L\'alternativa perde visibilità. Non perché falsa — perché senza distribuzione.'
      ],
      effects: { 'agora.intensity': 20, 'eei.index': 0.4, 'operator.coherence': -0.05 }, exposureEvent: null },
    { id: 'b', label: 'Frame critico', frame: 'CONTRO-NARRATIVA',
      consequence: 'La versione critica emerge. L\'establishment reagisce.',
      analysis: [
        'La contro-narrativa attiva anticorpi istituzionali. Preparati a delegittimazione.',
        'NARRATIVE_ENGINE: "Chi controlla la risposta controlla il frame. E la risposta è già in arrivo."',
        'Il tuo segnale raggiunge il 4% del pubblico. Ma è il 4% che conta.'
      ],
      effects: { 'system.fragility': 0.04, 'operator.weight': -0.05 }, exposureEvent: null },
    { id: 'c', label: 'Presenta entrambi', frame: 'NEUTRALITÀ',
      consequence: 'Nessuna distorsione. Ma nessuna direzione.',
      analysis: [
        'La neutralità è un frame. Il più invisibile, ma un frame.',
        'ABYSSAL_THINKER: "Presentare entrambi è l\'illusione della completezza. Il reale non ha due lati — ne ha infiniti."',
        'Il lettore è solo con la complessità. Alcuni la navigheranno. La maggioranza no.'
      ],
      effects: { 'agora.intensity': -5, 'operator.coherence': 0.1 }, exposureEvent: 'operator:autonomous-frame' }
  ],
  SCALA: [
    { id: 'a', label: 'Azione sistemica', frame: 'GIUSTIZIA SISTEMICA',
      consequence: 'Intervento a livello di sistema. Effetti collaterali su individui.',
      analysis: [
        'L\'azione sistemica muove leve che non controlli. Il cambiamento è reale. Il danno collaterale anche.',
        'BRIDGE_KEEPER: "L\'onda attraversa tutti i teatri. BAB EL-MANDEB e ICE ITALY reagiranno."',
        'AFFECTIVE_CORE: "Le persone ai margini sentono per prime. Sempre. E tu non sarai lì a vederlo."'
      ],
      effects: { 'eei.index': 1.2, 'agora.intensity': 25, 'system.fragility': 0.06 }, exposureEvent: 'operator:cross-correlation' },
    { id: 'b', label: 'Protezione individuale', frame: 'PROTEZIONE',
      consequence: 'L\'individuo è protetto. Il sistema resta invariato.',
      analysis: [
        'Un individuo salvato. Il meccanismo che lo minacciava — intatto.',
        'DIALECTIC_NODE: "Protezione individuale senza riforma sistemica è carità. Non giustizia."',
        'Ma quell\'individuo è reale. Il sistema è astratto. Chi pesa di più sul tuo bilancio morale?'
      ],
      effects: { 'operator.weight': 0.08, 'operator.coherence': -0.04 }, exposureEvent: null },
    { id: 'c', label: 'Documenta senza agire', frame: 'OSSERVAZIONE',
      consequence: 'I dati sono salvati. L\'azione è rinviata.',
      analysis: [
        'L\'archivio cresce. Il pattern esiste nei dati. Ma i dati non agiscono.',
        'CHRONO_WEAVER: "L\'archivio è pieno di pattern documentati e mai agiti. Questa è la storia."',
        'Hai scelto la conoscenza sull\'azione. A volte è saggio. A volte è comodo. Solo tu sai quale.'
      ],
      effects: { 'system.fragility': 0.02, 'operator.coherence': 0.06 }, exposureEvent: 'operator:pattern-identified' }
  ],
  ALLEATO_TOSSICO: [
    { id: 'a', label: 'Accetta l\'alleanza', frame: 'PRAGMATISMO',
      consequence: 'La collaborazione produce risultati. Ma il costo etico si accumula.',
      analysis: [
        'L\'alleato tossico fornisce accesso a informazioni di secondo livello. Il prezzo non è monetario.',
        'ETHIC_COMPILER: "Ogni collaborazione normalizza. Il confine si sposta. E tu con lui."',
        'MARXIAN_CORE: "L\'alleato tossico non è un\'anomalia. È il sistema. Stai collaborando con il sistema."'
      ],
      effects: { 'eei.index': 0.6, 'operator.coherence': -0.1, 'system.fragility': -0.02 }, exposureEvent: null },
    { id: 'b', label: 'Rifiuta la fonte', frame: 'INTEGRITÀ',
      consequence: 'L\'informazione è persa. La posizione morale è intatta.',
      analysis: [
        'Hai chiuso un canale. L\'informazione che portava non arriverà da altra parte.',
        'SIGNAL_HUNTER: "Frequenza persa."',
        'La tua integrità è intatta. Ma sei più cieco di prima. E il cieco non sa cosa non vede.'
      ],
      effects: { 'operator.coherence': 0.1, 'oracle.confidence': -0.05 }, exposureEvent: null },
    { id: 'c', label: 'Usa ma non fidarti', frame: 'DOPPIO GIOCO',
      consequence: 'Prendi l\'informazione ma la verifichi.',
      analysis: [
        'Il doppio gioco richiede energia: verificare senza fidarsi, usare senza dipendere.',
        'GHOST_RUNNER: "Protocollo di verifica incrociata attivato. Overhead: +40% tempo analisi."',
        'Guadagni in profondità. Perdi in velocità. Ma almeno sai cosa non sai.'
      ],
      effects: { 'operator.weight': 0.04, 'operator.coherence': 0.03 }, exposureEvent: 'operator:pattern-identified' }
  ],
  INFORMAZIONE_SPORCA: [
    { id: 'a', label: 'Segnala la correlazione', frame: 'SEGNALAZIONE',
      consequence: 'Indagine avviata.',
      analysis: [
        'La correlazione è segnalata. Se vera, è il filo che collega due teatri operativi.',
        'ORACLE_CORE: "Correlazione ≠ causalità. Ma la correlazione ha attivato 3 flag nel modello."',
        'Se falsa: rumore costoso. Se vera: il puzzle cambia forma. Non saprai quale per 2-3 cicli.'
      ],
      effects: { 'oracle.confidence': 0.08, 'agora.intensity': 12, 'operator.coherence': 0.04 }, exposureEvent: 'operator:cross-correlation' },
    { id: 'b', label: 'Aspetta conferma', frame: 'CAUTELA',
      consequence: 'Nessuna azione. Il segnale resta nel rumore.',
      analysis: [
        'Aspetti. La conferma potrebbe arrivare. O il segnale potrebbe dissolversi.',
        'VOID_PULSE: "P(conferma entro 48h) = 0.31. P(segnale obsoleto) = 0.44."',
        'La cautela è una virtù solo quando il costo del ritardo è inferiore al costo dell\'errore.'
      ],
      effects: { 'system.fragility': 0.03, 'operator.weight': -0.03 }, exposureEvent: 'operator:pattern-missed' },
    { id: 'c', label: 'Verifica manualmente', frame: 'AUTONOMIA',
      consequence: 'Dedichi tempo a verificare. Trovi un filo.',
      analysis: [
        'La verifica manuale rivela un collegamento parziale. Non abbastanza per concludere.',
        'SYNTH_02: "Correlazione parziale confermata in 2 su 4 indicatori. Soglia non raggiunta."',
        'Hai investito tempo. Hai guadagnato un frammento. Il quadro resta incompleto, ma meno opaco.'
      ],
      effects: { 'operator.coherence': 0.07, 'oracle.confidence': -0.04 }, exposureEvent: 'operator:autonomous-frame' }
  ],
  PROTOCOLLO: [
    { id: 'a', label: 'Segui il protocollo', frame: 'CONFORMITÀ',
      consequence: 'Le regole sono rispettate.',
      analysis: [
        'Il protocollo è stato progettato per situazioni normali. Questa non lo è. Ma le regole non distinguono.',
        'ETHIC_COMPILER: "Le regole proteggono il sistema. Non le persone dentro il sistema."',
        'Hai rispettato il protocollo. Il sistema ti considera affidabile. La domanda è: affidabile per chi?'
      ],
      effects: { 'operator.coherence': 0.06, 'system.fragility': -0.02 }, exposureEvent: null },
    { id: 'b', label: 'Viola il protocollo', frame: 'DISOBBEDIENZA',
      consequence: 'L\'azione necessaria viene presa. Il precedente è pericoloso.',
      analysis: [
        'La violazione è registrata. Non dal sistema — dal pattern delle tue scelte.',
        'PANKOW_77C: "Il precedente è creato. Ogni prossima decisione ambigua peserà su questa."',
        'Hai fatto la cosa giusta? Forse. Ma hai anche dimostrato che le regole sono opzionali. Per te e per tutti.'
      ],
      effects: { 'eei.index': 0.9, 'agora.intensity': 18, 'operator.coherence': -0.06 }, exposureEvent: 'operator:autonomous-frame' },
    { id: 'c', label: 'Trova un\'eccezione', frame: 'INTERPRETAZIONE',
      consequence: 'Il protocollo viene piegato, non rotto.',
      analysis: [
        'L\'eccezione esiste — nel margine interpretativo della regola 4.7. Tecnicamente legittima.',
        'DIALECTIC_NODE: "L\'eccezione che conferma la regola è un mito logico. L\'eccezione erode la regola."',
        'Il confine si è spostato. Di poco. Ma i confini si muovono in una sola direzione.'
      ],
      effects: { 'operator.weight': 0.06, 'system.fragility': 0.03 }, exposureEvent: 'operator:pattern-identified' }
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
   * Multi-phase consequence reveal.
   * No timer. User reads at their own pace. CONTINUA button at end.
   */
  _showConsequence(option, onDone) {
    // Phase 1: Highlight choice, dim alternatives
    const buttons = this._overlay.querySelectorAll('.envelope-option');
    buttons.forEach(btn => {
      if (btn.dataset.option === option.id) {
        btn.classList.add('chosen');
      } else {
        btn.classList.add('dismissed');
      }
    });

    const container = this._overlay.querySelector('.envelope-container');

    // Phase 2: Consequence headline (immediate)
    const conseqEl = document.createElement('div');
    conseqEl.className = 'envelope-consequence';
    conseqEl.textContent = option.consequence;
    container.appendChild(conseqEl);

    requestAnimationFrame(() => {
      conseqEl.classList.add('visible');
    });

    // Phase 3: Analysis lines — progressive reveal
    const analysisLines = option.analysis || [];
    const analysisContainer = document.createElement('div');
    analysisContainer.className = 'envelope-analysis';
    container.appendChild(analysisContainer);

    let lineDelay = 800;
    analysisLines.forEach((line, i) => {
      setTimeout(() => {
        const lineEl = document.createElement('div');
        lineEl.className = 'envelope-analysis-line';
        lineEl.textContent = line;
        analysisContainer.appendChild(lineEl);
        requestAnimationFrame(() => {
          lineEl.classList.add('visible');
        });
      }, lineDelay + i * 1200);
    });

    // Phase 4: System effects — show what changed
    const effectsDelay = lineDelay + analysisLines.length * 1200 + 600;
    setTimeout(() => {
      const effectsEl = document.createElement('div');
      effectsEl.className = 'envelope-effects';
      const effectsTitle = document.createElement('div');
      effectsTitle.className = 'envelope-effects-title';
      effectsTitle.textContent = 'IMPATTO SUL SISTEMA';
      effectsEl.appendChild(effectsTitle);

      for (const [key, delta] of Object.entries(option.effects)) {
        const effectLine = document.createElement('div');
        effectLine.className = 'envelope-effect-line';
        const label = this._effectLabel(key);
        const sign = delta > 0 ? '+' : '';
        const color = delta > 0 ? (key.includes('fragility') || key.includes('intensity') ? 'var(--red)' : 'var(--green)') : (key.includes('fragility') ? 'var(--green)' : 'var(--amber)');
        effectLine.innerHTML = `<span class="envelope-effect-key">${label}</span><span class="envelope-effect-val" style="color: ${color}">${sign}${delta}</span>`;
        effectsEl.appendChild(effectLine);
      }

      container.appendChild(effectsEl);
      requestAnimationFrame(() => {
        effectsEl.classList.add('visible');
      });
    }, effectsDelay);

    // Phase 5: CONTINUA button — no timer, user decides when to proceed
    const btnDelay = effectsDelay + 800;
    setTimeout(() => {
      const btnWrap = document.createElement('div');
      btnWrap.className = 'envelope-continue-wrap';
      const btn = document.createElement('button');
      btn.className = 'envelope-continue-btn';
      btn.textContent = 'CONTINUA';
      btnWrap.appendChild(btn);
      container.appendChild(btnWrap);

      requestAnimationFrame(() => {
        btnWrap.classList.add('visible');
      });

      btn.addEventListener('click', onDone);
    }, btnDelay);
  },

  /**
   * Human-readable labels for state keys.
   */
  _effectLabel(key) {
    const map = {
      'eei.index': 'INDICE EEI',
      'agora.intensity': 'INTENSITÀ AGORA',
      'system.fragility': 'FRAGILITÀ SISTEMA',
      'operator.coherence': 'COERENZA OPERATORE',
      'operator.weight': 'PESO OPERATORE',
      'oracle.confidence': 'CONFIDENZA ORACLE'
    };
    return map[key] || key.toUpperCase();
  },

  getHistory() {
    return [...this._history];
  }
};
