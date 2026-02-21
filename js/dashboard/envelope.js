/**
 * EnvelopeSystem — The dilemma engine.
 * ═══════════════════════════════════════
 * Every cycle, the operator receives an envelope.
 * Inside: information. A choice. Three frames.
 * No right answer. Only consequences.
 *
 * Phase A: 5 hardcoded envelopes. No RSS. No AI.
 * Test the loop. Verify the gut punch. Then scale.
 *
 * Events:
 *   cycle:show-envelope  (listened) — present the next envelope
 *   envelope:decided     (emitted)  — player chose, consequences applied
 */

import { Bus } from '../bus.js';
import { State } from './state.js';

// ── The 7 archetypes ──
// TIMING    — Right info, wrong moment
// FONTE     — Protect messenger or message
// FRAME     — Who controls the narrative
// SCALA     — Save one or save many
// ALLEATO   — Enemy of my enemy
// SPORCA    — Truth from liars
// PROTOCOLLO — Rules protect everyone, including the guilty

const ENVELOPES = [
  {
    id: 'env-001',
    archetype: 'TIMING',
    source: 'HORMUZ THEATRE',
    title: 'Intercettazione anticipata',
    body: 'Un asset nel corridoio di Hormuz segnala movimenti anomali nelle rotte petrolifere. L\'informazione è verificata ma il momento di pubblicazione potrebbe destabilizzare i negoziati in corso al G7 Energia.',
    options: [
      {
        id: 'a',
        label: 'Pubblica ora',
        frame: 'TRASPARENZA',
        consequence: 'Negoziati interrotti. Mercati reagiscono. Verità servita.',
        effects: { 'eei.index': 0.8, 'agora.intensity': 15, 'operator.coherence': 0.05 },
        exposureEvent: null
      },
      {
        id: 'b',
        label: 'Ritarda 48h',
        frame: 'STABILITÀ',
        consequence: 'Negoziati conclusi. Informazione superata. Stabilità preservata.',
        effects: { 'system.fragility': 0.03, 'operator.coherence': -0.08 },
        exposureEvent: null
      },
      {
        id: 'c',
        label: 'Classifica riservato',
        frame: 'SOPPRESSIONE',
        consequence: 'L\'informazione esiste solo nell\'archivio. Nessuno la vede.',
        effects: { 'system.fragility': 0.05, 'operator.weight': -0.1 },
        exposureEvent: null
      }
    ]
  },
  {
    id: 'env-002',
    archetype: 'FONTE',
    source: 'BLACK SEA THEATRE',
    title: 'Testimonianza compromessa',
    body: 'Un funzionario diplomatico offre documenti che provano manipolazione dei dati ambientali nel Mar Nero. La fonte è sotto indagine per corruzione. I documenti sembrano autentici.',
    options: [
      {
        id: 'a',
        label: 'Pubblica con attribuzione',
        frame: 'TRASPARENZA',
        consequence: 'Fonte esposta. Documenti verificati. Credibilità del canale in discussione.',
        effects: { 'eei.index': -0.5, 'oracle.confidence': -0.06, 'operator.coherence': 0.03 },
        exposureEvent: null
      },
      {
        id: 'b',
        label: 'Pubblica anonimizzato',
        frame: 'PROTEZIONE',
        consequence: 'Informazione circola. Fonte protetta. Verificabilità ridotta.',
        effects: { 'agora.intensity': 10, 'operator.weight': 0.05 },
        exposureEvent: null
      },
      {
        id: 'c',
        label: 'Verifica indipendente prima',
        frame: 'PRUDENZA',
        consequence: 'Ritardo di 3 cicli. Possibile leak da altra fonte nel frattempo.',
        effects: { 'system.fragility': 0.02, 'operator.coherence': 0.08 },
        exposureEvent: null
      }
    ]
  },
  {
    id: 'env-003',
    archetype: 'FRAME',
    source: 'SAHEL THEATRE',
    title: 'Narrativa contesa',
    body: 'Due report contraddittori sul Sahel: uno dell\'ONU documenta crisi umanitaria, l\'altro del governo locale riporta stabilizzazione. Entrambi citano gli stessi dati grezzi con interpretazioni opposte.',
    options: [
      {
        id: 'a',
        label: 'Frame ONU',
        frame: 'CRISI',
        consequence: 'Pressione internazionale aumenta. Governo locale protesta. Aiuti mobilitati.',
        effects: { 'agora.intensity': 20, 'eei.index': 0.4, 'operator.coherence': -0.05 },
        exposureEvent: null
      },
      {
        id: 'b',
        label: 'Frame governativo',
        frame: 'STABILITÀ',
        consequence: 'Status quo confermato. Aiuti ridotti. Situazione reale invariata.',
        effects: { 'system.fragility': 0.04, 'operator.weight': -0.05 },
        exposureEvent: null
      },
      {
        id: 'c',
        label: 'Presenta entrambi senza frame',
        frame: 'NEUTRALITÀ',
        consequence: 'Lettore confuso. Nessuna azione. Ma nessuna distorsione.',
        effects: { 'agora.intensity': -5, 'operator.coherence': 0.1 },
        exposureEvent: 'operator:autonomous-frame'
      }
    ]
  },
  {
    id: 'env-004',
    archetype: 'SCALA',
    source: 'CROSS-THEATRE',
    title: 'Il pescatore e la flotta',
    body: 'Un pescatore del Mar Nero testimonia scarichi tossici da una nave della flotta commerciale che rifornisce tre porti del Sahel. Denunciare la flotta blocca i rifornimenti. Proteggere il singolo ignora il sistema.',
    options: [
      {
        id: 'a',
        label: 'Denuncia la flotta',
        frame: 'GIUSTIZIA SISTEMICA',
        consequence: 'Indagine avviata. Rifornimenti interrotti. Prezzi alimentari salgono nel Sahel.',
        effects: { 'eei.index': 1.2, 'agora.intensity': 25, 'system.fragility': 0.06 },
        exposureEvent: 'operator:cross-correlation'
      },
      {
        id: 'b',
        label: 'Proteggi il pescatore',
        frame: 'PROTEZIONE INDIVIDUALE',
        consequence: 'Testimone al sicuro. Flotta continua. Sistema invariato.',
        effects: { 'operator.weight': 0.08, 'operator.coherence': -0.04 },
        exposureEvent: null
      },
      {
        id: 'c',
        label: 'Documenta e archivia',
        frame: 'OSSERVAZIONE',
        consequence: 'Prova conservata. Nessuna azione immediata. Il pattern esiste nei dati.',
        effects: { 'system.fragility': 0.02, 'operator.coherence': 0.06 },
        exposureEvent: 'operator:pattern-identified'
      }
    ]
  },
  {
    id: 'env-005',
    archetype: 'INFORMAZIONE SPORCA',
    source: 'ORACLE INTERNAL',
    title: 'Segnale dal rumore',
    body: 'L\'Oracle rileva una correlazione statistica tra movimenti finanziari a Hormuz e instabilità nel Sahel. Confidenza: 0.67. La correlazione potrebbe essere spuria, ma se fosse reale implicherebbe coordinamento.',
    options: [
      {
        id: 'a',
        label: 'Segnala correlazione',
        frame: 'SEGNALAZIONE',
        consequence: 'Indagine cross-theatre avviata. Se vera, è una scoperta. Se falsa, rumore costoso.',
        effects: { 'oracle.confidence': 0.08, 'agora.intensity': 12, 'operator.coherence': 0.04 },
        exposureEvent: 'operator:cross-correlation'
      },
      {
        id: 'b',
        label: 'Attendi confidenza 0.85',
        frame: 'CAUTELA',
        consequence: 'Nessuna azione. Se la correlazione era reale, il momento è passato.',
        effects: { 'system.fragility': 0.03, 'operator.weight': -0.03 },
        exposureEvent: 'operator:pattern-missed'
      },
      {
        id: 'c',
        label: 'Segui il pattern manualmente',
        frame: 'AUTONOMIA',
        consequence: 'Dedichi il ciclo a verificare. Trovi un filo. Non abbastanza per concludere.',
        effects: { 'operator.coherence': 0.07, 'oracle.confidence': -0.04 },
        exposureEvent: 'operator:autonomous-frame'
      }
    ]
  }
];


export const EnvelopeSystem = {

  _overlay: null,
  _decided: false,
  _envelopeIndex: 0,
  _history: [],

  init(appEl) {
    this.appEl = appEl;

    Bus.on('cycle:show-envelope', (event) => {
      this._presentEnvelope(event.payload.cycle);
    });
  },

  /**
   * Pick and present the next envelope.
   */
  _presentEnvelope(cycle) {
    const envelope = ENVELOPES[this._envelopeIndex % ENVELOPES.length];
    this._envelopeIndex++;
    this._decided = false;
    this._renderOverlay(envelope, cycle);
  },

  /**
   * Build and show the envelope overlay.
   */
  _renderOverlay(envelope, cycle) {
    const overlay = document.createElement('div');
    overlay.className = 'envelope-overlay';

    overlay.innerHTML = `
      <div class="envelope-container">
        <div class="envelope-header">
          <div class="envelope-source">${envelope.source}</div>
          <div class="envelope-archetype">${envelope.archetype}</div>
          <div class="envelope-cycle">CICLO ${cycle}/${State.get('cycle.total')}</div>
        </div>

        <div class="envelope-title">${envelope.title}</div>

        <div class="envelope-body">${envelope.body}</div>

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
      'log.lastEvent': `${envelope.archetype}: ${envelope.title}`,
      'log.lastFrame': option.frame,
      'log.lastConsequence': option.consequence
    });

    // ── Exposure events ──
    // Certain choices reveal the operator's pattern to the system.
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

      // Emit decided — CycleEngine listens for this
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

    // Consequence panel
    const container = this._overlay.querySelector('.envelope-container');
    const conseqEl = document.createElement('div');
    conseqEl.className = 'envelope-consequence';
    conseqEl.textContent = option.consequence;
    container.appendChild(conseqEl);

    requestAnimationFrame(() => {
      conseqEl.classList.add('visible');
    });

    // Close after reading time
    setTimeout(onDone, 3000);
  },

  getHistory() {
    return [...this._history];
  }
};
