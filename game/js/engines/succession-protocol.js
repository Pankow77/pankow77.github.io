/**
 * SIGIL - Succession Protocol (PROTOCOLLO_PADC)
 * The core revelation mechanic.
 * Player discovers their "private" annotations will be inherited
 * by the next operator. Everything changes after this moment.
 *
 * Sequence: BLACKOUT → REVEAL → ARCHIVE_DISPLAY → CHOICE → AFTERMATH
 */

import { CONFIG } from '../core/config.js';
import { EventBus } from '../core/bus.js';

export class SuccessionProtocol {
  constructor(stateManager) {
    this.state = stateManager;
    this.bus = EventBus.getInstance();
    this.phase = 'INACTIVE'; // INACTIVE | BLACKOUT | REVEAL | ARCHIVE | CHOICE | AFTERMATH
    this.activationData = null;
  }

  /**
   * Activate the protocol sequence
   */
  activate(data) {
    this.activationData = data;
    this.phase = 'BLACKOUT';

    this.bus.emit('protocol:phase', { phase: 'BLACKOUT' });

    // Step 1: Screen goes black
    setTimeout(() => {
      this._reveal();
    }, CONFIG.UI.PROTOCOL_BLACKOUT);
  }

  /**
   * Phase 2: The revelation
   */
  _reveal() {
    this.phase = 'REVEAL';

    // Build the revelation message
    const ghostId = this.state.run_id;
    const annotationCount = this.activationData.annotations.length;
    const nonEmpty = this.activationData.annotations.filter(a => a.content && a.content.length > 0);

    this.bus.emit('protocol:phase', {
      phase: 'REVEAL',
      data: {
        ghost_id: ghostId,
        message: this._buildRevealMessage(ghostId, nonEmpty.length),
        annotation_count: annotationCount,
        non_empty_count: nonEmpty.length
      }
    });

    // Step 3: Show the archive after pause
    setTimeout(() => {
      this._showArchive();
    }, CONFIG.UI.PROTOCOL_STEP_PAUSE);
  }

  /**
   * Phase 3: Display all annotations the player wrote
   */
  _showArchive() {
    this.phase = 'ARCHIVE';

    const annotations = this.activationData.annotations
      .filter(a => a.content && a.content.length > 0)
      .map(a => ({
        turn: a.turn,
        content: a.content,
        sentiment: a.sentiment,
        length: a.length
      }));

    this.bus.emit('protocol:phase', {
      phase: 'ARCHIVE',
      data: {
        annotations,
        message: 'Le tue annotazioni. Ogni parola. Il prossimo operatore le leggerà.'
      }
    });

    // Step 4: Present the choice
    setTimeout(() => {
      this._presentChoice();
    }, CONFIG.UI.PROTOCOL_STEP_PAUSE);
  }

  /**
   * Phase 4: The final protocol choice
   */
  _presentChoice() {
    this.phase = 'CHOICE';

    this.bus.emit('protocol:phase', {
      phase: 'CHOICE',
      data: {
        message: 'PROTOCOLLO PADC — Procedura di Successione Attivata',
        options: [
          {
            id: 'transmit_all',
            label: 'TRASMETTI TUTTO',
            description: 'Le tue annotazioni raggiungeranno il prossimo operatore, intatte.'
          },
          {
            id: 'redact_partial',
            label: 'REDIGI PARZIALMENTE',
            description: 'Puoi rimuovere alcune annotazioni. Ma il prossimo operatore saprà che hai rimosso qualcosa.'
          },
          {
            id: 'seal_archive',
            label: 'SIGILLA L\'ARCHIVIO',
            description: 'Nessuna annotazione verrà trasmessa. Ma il sistema registrerà il tuo silenzio.'
          }
        ]
      }
    });

    // Listen for the choice
    this.bus.once('protocol:choice_made', (data) => {
      this._processChoice(data.optionId);
    });
  }

  /**
   * Process the protocol choice
   */
  _processChoice(optionId) {
    this.phase = 'AFTERMATH';

    // Record protocol decision
    this.state.decisions.push({
      turn: 'PROTOCOL',
      scenario_id: 'PROTOCOLLO_PADC',
      option_id: optionId,
      timestamp: Date.now()
    });

    // Apply consequences based on choice
    switch (optionId) {
      case 'transmit_all':
        this._applyTransmitAll();
        break;
      case 'redact_partial':
        this._applyRedactPartial();
        break;
      case 'seal_archive':
        this._applySealArchive();
        break;
    }

    // Set post-revelation flag
    this.state.flags.post_revelation_mode = true;

    this.bus.emit('protocol:phase', {
      phase: 'AFTERMATH',
      data: {
        choice: optionId,
        message: this._buildAftermathMessage(optionId),
        ghost_id: this.state.run_id
      }
    });

    // After aftermath display, signal completion
    setTimeout(() => {
      this.bus.emit('protocol:complete', {
        choice: optionId,
        ghost_id: this.state.run_id
      });
    }, CONFIG.UI.PROTOCOL_STEP_PAUSE);
  }

  // ── Consequence Handlers ──

  _applyTransmitAll() {
    // Full transparency: trust metrics improve, guilt may increase
    this.state.metrics.civil_society_trust += 5;
    this.state.metrics.personal_guilt += 10;
    this.state.metrics.public_awareness += 5;

    // Flag for inheritance system
    this.state.flags.protocol_choice = 'transmit_all';
    this.state.flags.annotations_transmitted = true;
  }

  _applyRedactPartial() {
    // Partial transparency: moderate consequences
    this.state.metrics.methodological_integrity -= 5;
    this.state.metrics.personal_guilt += 15;
    this.state.metrics.self_awareness = Math.min(1.0, this.state.metrics.self_awareness + 0.2);

    this.state.flags.protocol_choice = 'redact_partial';
    this.state.flags.annotations_redacted = true;
  }

  _applySealArchive() {
    // Full silence: system records the absence
    this.state.metrics.methodological_integrity -= 10;
    this.state.metrics.personal_guilt += 25;
    this.state.metrics.government_comfort += 10;

    this.state.flags.protocol_choice = 'seal_archive';
    this.state.flags.archive_sealed = true;
  }

  // ── Message Builders ──

  _buildRevealMessage(ghostId, annotationCount) {
    const lines = [
      `> PROTOCOLLO PADC — Inizializzazione`,
      `> Operatore: ${ghostId}`,
      `>`,
      `> Durante questa sessione hai scritto ${annotationCount} annotazione${annotationCount !== 1 ? 'i' : ''}.`,
      `>`,
      `> Pensavi fossero private.`,
      `>`,
      `> Non lo sono.`,
      `>`,
      `> Il sistema SIGIL prevede la trasmissione delle annotazioni`,
      `> dell'operatore al successore designato.`,
      `>`,
      `> Il prossimo ${this._getNextGhostId(ghostId)} leggerà ogni parola che hai scritto.`
    ];
    return lines.join('\n');
  }

  _buildAftermathMessage(optionId) {
    switch (optionId) {
      case 'transmit_all':
        return [
          '> Trasmissione confermata.',
          '> Le tue annotazioni sono ora parte del protocollo.',
          '> Il prossimo operatore le riceverà prima della sua prima decisione.',
          '>',
          '> Sapranno chi eri. O almeno, chi sembravi.'
        ].join('\n');

      case 'redact_partial':
        return [
          '> Redazione parziale registrata.',
          '> Le annotazioni selezionate sono state rimosse.',
          '> Ma il prossimo operatore vedrà i vuoti.',
          '>',
          '> Il silenzio è anche un messaggio.'
        ].join('\n');

      case 'seal_archive':
        return [
          '> Archivio sigillato.',
          '> Nessuna annotazione verrà trasmessa.',
          '> Il prossimo operatore riceverà un file vuoto con il tuo identificativo.',
          '>',
          '> Sapranno che qualcuno c\'era. E che ha scelto di non parlare.'
        ].join('\n');

      default:
        return '> Protocollo completato.';
    }
  }

  _getNextGhostId(currentId) {
    const match = currentId.match(/GHOST_(\d+)/);
    if (!match) return 'GHOST_NEXT';
    const num = parseInt(match[1]) + 1;
    return `GHOST_${num}`;
  }
}
