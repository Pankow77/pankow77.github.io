/**
 * SIGIL - Game Loop
 * Core turn engine. Orchestrates scenario loading, decision capture,
 * consequence application, annotation collection, and phase transitions.
 * MVP: T1→T3→Mini-PROTOCOLLO→T4
 */

import { CONFIG } from './config.js';
import { EventBus } from './bus.js';
import { StateManager } from './state-manager.js';
import { ConsequenceEngine } from '../engines/consequence-engine.js';
import { SuccessionProtocol } from '../engines/succession-protocol.js';
import { AnnotationTracker } from '../systems/annotation-tracker.js';
import { SentimentAnalyzer } from '../nlp/sentiment-analyzer.js';
import { ScenarioLoader } from '../scenarios/scenario-loader.js';

export class GameLoop {
  constructor() {
    this.bus = EventBus.getInstance();
    this.state = StateManager.getInstance();
    this.consequences = new ConsequenceEngine(this.state);
    this.protocol = new SuccessionProtocol(this.state);
    this.annotations = new AnnotationTracker(this.state);
    this.sentiment = new SentimentAnalyzer();
    this.scenarios = new ScenarioLoader();

    this.currentScenario = null;
    this.phase = 'BOOT'; // BOOT | BRIEFING | DECISION | ANNOTATION | CONSEQUENCE | PROTOCOL | ENDGAME
    this.isRunning = false;

    this._bindEvents();
  }

  // ── Public API ──

  /**
   * Initialize and start the game
   */
  async init() {
    // Try to load saved state
    const restored = await this.state.load();
    if (restored && this.state.turn_current > 0) {
      this.bus.emit('game:restored', { turn: this.state.turn_current });
    }

    // Load all scenarios
    await this.scenarios.loadAll();

    this.isRunning = true;
    this.bus.emit('game:initialized', { run_id: this.state.run_id });

    // Start first turn or resume
    if (this.state.turn_current === 0) {
      this._setPhase('BOOT');
      this.bus.emit('game:boot', { ghost_id: this.state.run_id });
    } else {
      this._advanceTurn();
    }
  }

  /**
   * Start the game after boot sequence
   */
  startGame() {
    this.state.turn_current = 1;
    this._advanceTurn();
  }

  /**
   * Player selects a decision option
   */
  submitDecision(optionId) {
    if (this.phase !== 'DECISION') return;

    const scenario = this.currentScenario;
    const option = scenario.options.find(o => o.id === optionId);
    if (!option) return;

    // Record decision
    this.state.decisions.push({
      turn: this.state.turn_current,
      scenario_id: scenario.id,
      option_id: optionId,
      option_label: option.label,
      timestamp: Date.now()
    });

    // Apply immediate consequences
    this.consequences.applyConsequences(
      scenario.id, optionId, 'immediate', this.state
    );

    // Get immediate feedback
    const feedback = this.consequences.getImmediateFeedback();

    this.bus.emit('decision:made', {
      turn: this.state.turn_current,
      scenario_id: scenario.id,
      option_id: optionId,
      feedback
    });

    // Update decision fatigue
    this.state.metrics.decision_fatigue += CONFIG.MVP_MODE ? 15 : 8;

    // Move to annotation phase
    this._setPhase('ANNOTATION');
    this.bus.emit('annotation:prompt', {
      turn: this.state.turn_current,
      scenario_id: scenario.id,
      option_chosen: optionId
    });
  }

  /**
   * Player submits annotation text
   */
  submitAnnotation(text) {
    if (this.phase !== 'ANNOTATION') return;

    // Analyze sentiment
    const analysis = this.sentiment.analyze(text);

    // Track annotation
    const annotation = this.annotations.record({
      turn: this.state.turn_current,
      content: text,
      length: text.length,
      sentiment: analysis.score,
      keywords: analysis.keywords,
      selfAwareness: analysis.selfAwareness,
      mentorKeywords: analysis.mentorKeywords,
      timestamp: Date.now()
    });

    // Update state metrics from annotation
    this._updateMetricsFromAnnotation(analysis);

    this.bus.emit('annotation:recorded', {
      turn: this.state.turn_current,
      annotation
    });

    // Move to consequence phase
    this._setPhase('CONSEQUENCE');
    this._processConsequences();
  }

  /**
   * Player skips annotation
   */
  skipAnnotation() {
    if (this.phase !== 'ANNOTATION') return;

    this.annotations.record({
      turn: this.state.turn_current,
      content: '',
      length: 0,
      sentiment: null,
      keywords: [],
      selfAwareness: false,
      mentorKeywords: [],
      timestamp: Date.now(),
      skipped: true
    });

    this.bus.emit('annotation:skipped', { turn: this.state.turn_current });

    this._setPhase('CONSEQUENCE');
    this._processConsequences();
  }

  // ── Private Methods ──

  _bindEvents() {
    this.bus.on('ui:boot_complete', () => this.startGame());
    this.bus.on('ui:decision_submit', (data) => this.submitDecision(data.optionId));
    this.bus.on('ui:annotation_submit', (data) => this.submitAnnotation(data.text));
    this.bus.on('ui:annotation_skip', () => this.skipAnnotation());
    this.bus.on('ui:continue', () => this._onContinue());
    this.bus.on('protocol:complete', () => this._onProtocolComplete());
  }

  _setPhase(phase) {
    const previous = this.phase;
    this.phase = phase;
    this.bus.emit('phase:changed', { from: previous, to: phase });
  }

  /**
   * Advance to next turn
   */
  _advanceTurn() {
    const turn = this.state.turn_current;

    // Check if protocol should trigger (MVP: after T3)
    if (CONFIG.MVP_MODE && turn > CONFIG.PROTOCOL_TRIGGER_TURN && !this.state.flags.protocollo_activated) {
      this._triggerProtocol();
      return;
    }

    // Check endgame
    if (turn > CONFIG.MAX_TURNS) {
      this._endGame();
      return;
    }

    // Load scenario for current turn
    this.currentScenario = this.scenarios.getForTurn(turn);
    if (!this.currentScenario) {
      console.error(`[GameLoop] No scenario for turn ${turn}`);
      this._endGame();
      return;
    }

    // Load consequence tree
    this.consequences.loadConsequenceTree(this.currentScenario);

    // Check and apply delayed consequences from previous turns
    const dueConsequences = this.consequences.getDueConsequences(turn);
    if (dueConsequences.length > 0) {
      this.bus.emit('consequences:delayed', { turn, consequences: dueConsequences });
    }

    // Apply fatigue effects (reduce options if fatigued)
    const availableOptions = this._applyFatigueFilter(this.currentScenario.options);

    // Enter briefing phase
    this._setPhase('BRIEFING');
    this.bus.emit('turn:start', {
      turn,
      scenario: this.currentScenario,
      options: availableOptions,
      metrics_snapshot: { ...this.state.metrics }
    });

    // Save state
    this.state.save();
  }

  /**
   * Process consequences after annotation
   */
  _processConsequences() {
    const turn = this.state.turn_current;

    // Apply delayed consequence effects
    const due = this.consequences.getDueConsequences(turn);
    for (const item of due) {
      if (item.consequences) {
        for (const c of item.consequences) {
          if (c.metrics) {
            for (const [key, val] of Object.entries(c.metrics)) {
              this.consequences._applyMetricChange(this.state, key, val);
            }
          }
        }
      }
    }

    this.bus.emit('consequence:applied', {
      turn,
      metrics: { ...this.state.metrics }
    });

    // Brief pause then advance
    setTimeout(() => {
      this.state.turn_current++;
      this._advanceTurn();
    }, CONFIG.UI.TURN_ADVANCE_DELAY);
  }

  /**
   * Trigger PROTOCOLLO_PADC
   */
  _triggerProtocol() {
    this.state.flags.protocollo_activated = true;
    this._setPhase('PROTOCOL');

    const annotationStats = this.state.getAnnotationStats();
    const inheritedAnnotations = this.state.inherited_annotations;

    this.bus.emit('protocol:trigger', {
      ghost_id: this.state.run_id,
      annotations: this.state.annotations,
      annotationStats,
      inheritedAnnotations
    });

    // Protocol handles its own sequence via SuccessionProtocol
    this.protocol.activate({
      annotations: this.state.annotations,
      decisions: this.state.decisions,
      metrics: this.state.metrics
    });
  }

  /**
   * After protocol completes, enter post-revelation mode
   */
  _onProtocolComplete() {
    this.state.flags.post_revelation_mode = true;
    this.state.turn_current = CONFIG.PROTOCOL_TRIGGER_TURN + 1; // T4 in MVP

    this.bus.emit('protocol:aftermath', {
      ghost_id: this.state.run_id,
      post_revelation: true
    });

    this._advanceTurn();
  }

  /**
   * Handle UI continue (after briefing envelopes)
   */
  _onContinue() {
    if (this.phase === 'BRIEFING') {
      this._setPhase('DECISION');
      this.bus.emit('decision:prompt', {
        turn: this.state.turn_current,
        scenario: this.currentScenario,
        options: this._applyFatigueFilter(this.currentScenario.options),
        post_revelation: this.state.flags.post_revelation_mode
      });
    }
  }

  /**
   * Apply decision fatigue filter to options
   */
  _applyFatigueFilter(options) {
    const fatigue = this.state.metrics.decision_fatigue;

    if (fatigue >= CONFIG.FATIGUE.KEEP_TWO) {
      // Extreme fatigue: only 2 options
      return options.slice(0, 2);
    } else if (fatigue >= CONFIG.FATIGUE.KEEP_THREE) {
      // High fatigue: only 3 options
      return options.slice(0, 3);
    } else if (fatigue >= CONFIG.FATIGUE.REMOVE_LOWEST) {
      // Moderate fatigue: remove lowest priority option
      return options.slice(0, -1);
    }
    return options;
  }

  /**
   * Update metrics based on annotation analysis
   */
  _updateMetricsFromAnnotation(analysis) {
    // Update sentiment average
    const stats = this.state.getAnnotationStats();
    this.state.metrics.annotation_sentiment_avg = stats.avgSentiment;

    // Update self-awareness if keywords detected
    if (analysis.selfAwareness) {
      this.state.metrics.self_awareness = Math.min(1.0,
        this.state.metrics.self_awareness + 0.15
      );
    }

    // Update performativity index (post-protocol only)
    if (this.state.flags.post_revelation_mode) {
      this.state.metrics.performativity_index = this.annotations.getPerformativityIndex();
    }
  }

  /**
   * End the game
   */
  _endGame() {
    this._setPhase('ENDGAME');

    const runData = this.state.exportRunData();
    const annotationStats = this.state.getAnnotationStats();

    this.bus.emit('game:end', {
      run_data: runData,
      annotation_stats: annotationStats,
      final_metrics: { ...this.state.metrics },
      ghost_id: this.state.run_id
    });

    // Save final state
    this.state.save();

    this.isRunning = false;
  }
}
