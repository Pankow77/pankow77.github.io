import 'dart:math';

import 'package:flutter/foundation.dart';
import 'package:uuid/uuid.dart';

import '../config/constants.dart';
import '../models/session.dart';
import '../models/victim_profile.dart';
import '../models/dice_result.dart';
import '../services/storage_service.dart';
import '../services/llm_service.dart';
import 'lumen_count.dart';
import 'dice_engine.dart';
import 'safety_commander.dart';

/// Orchestrates the entire TERMINUS-OMNI session.
///
/// This is the Session Manager — the bridge between the subject,
/// the LLM (autonomous conductor), and the game mechanics.
class SessionManager extends ChangeNotifier {
  final StorageService storage;
  final LlmService llm;

  SessionManager({
    required this.storage,
    required this.llm,
  });

  // ── State ──
  TerminusSession? _session;
  final LumenCount _lumenCount = LumenCount();
  final DiceEngine _diceEngine = DiceEngine();
  final SafetyCommander _safetyCommander = SafetyCommander();
  final Random _rng = Random();

  bool _isLoading = false;
  String? _error;

  // ── Getters ──
  TerminusSession? get session => _session;
  int get lumen => _lumenCount.current;
  SessionPhase get phase => _lumenCount.phase;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get isActive => _session != null && !_session!.isComplete;
  bool get isPaused => _safetyCommander.isPauseActive;
  bool get isComplete => _session?.isComplete ?? false;

  // ── Session lifecycle ──

  /// Create and start a new TERMINUS-OMNI session.
  Future<void> startNewSession({
    required VictimProfile profile,
    required String scenarioId,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _session = TerminusSession(
        id: const Uuid().v4(),
        startedAt: DateTime.now(),
        profile: profile,
        scenarioId: scenarioId,
      );
      _lumenCount.restore(10);
      _diceEngine.resetResidual();
      _safetyCommander.setIntensity(profile.intensity);

      // Start LLM session and get initial narrative
      final initialNarrative = await llm.startSession(
        profile: profile,
        scenarioId: scenarioId,
      );

      _session!.messages.add(ChatMessage(
        role: 'terminus',
        content: initialNarrative,
        timestamp: DateTime.now(),
        lumenAtMessage: _lumenCount.current,
      ));

      await storage.saveSession(_session!);

      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      rethrow;
    }
  }

  /// Send a user message and process the response.
  Future<void> sendMessage(String userMessage) async {
    if (_session == null || _session!.isComplete) return;

    // Check Commander safety
    if (_safetyCommander.evaluateMessage(userMessage)) {
      _safetyCommander.activatePause();
      _session!.commanderPauseTriggered = true;
      _session!.messages.add(ChatMessage(
        role: 'system',
        content: _safetyCommander.commanderNarrative,
        timestamp: DateTime.now(),
        lumenAtMessage: _lumenCount.current,
      ));
      await storage.saveSession(_session!);
      notifyListeners();
      return;
    }

    _isLoading = true;
    notifyListeners();

    try {
      // Record user message
      _session!.messages.add(ChatMessage(
        role: 'user',
        content: userMessage,
        timestamp: DateTime.now(),
        lumenAtMessage: _lumenCount.current,
      ));

      // Get TERMINUS response
      final response = await llm.sendMessage(
        userMessage: userMessage,
        currentLumen: _lumenCount.current,
        dicePool: _session!.dicePool,
        hopeDice: _session!.hopeDice,
        phase: _lumenCount.phase,
      );

      _session!.messages.add(ChatMessage(
        role: 'terminus',
        content: response,
        timestamp: DateTime.now(),
        lumenAtMessage: _lumenCount.current,
      ));

      // Climate jitter — environment bites independently
      _applyClimateJitter();

      await storage.saveSession(_session!);

      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Roll the dice for a conflict.
  Future<DiceResult> rollDice() async {
    if (_session == null) throw StateError('No active session');

    final result = _diceEngine.roll(
      actionDiceCount: _session!.dicePool,
      hopeDiceCount: _session!.hopeDice,
      currentLumen: _lumenCount.current,
      sceneNumber: _session!.currentScene,
    );

    _session!.rolls.add(result);

    // Apply consequences
    if (!result.isSuccess) {
      _lumenCount.extinguish(LumenExtinguishReason.diceFailure);
      _session!.lumenCount = _lumenCount.current;
      _session!.phase = _lumenCount.phase;
    }

    // Lose dice on 1s
    _session!.dicePool = (_session!.dicePool - result.onesRolled).clamp(0, 99);

    // Burn hope die
    if (result.hopeLost) {
      _session!.hopeDice = 0;
    }

    // Residual cascade — accumulated failure pressure
    if (_diceEngine.checkResidualCascade()) {
      _lumenCount.extinguish(LumenExtinguishReason.residualCascade);
      _session!.lumenCount = _lumenCount.current;
      _session!.phase = _lumenCount.phase;
      _session!.messages.add(ChatMessage(
        role: 'system',
        content: '[SISTEMA] La pressione accumulata cede. '
            'Una candela si spegne sotto il peso dei fallimenti.',
        timestamp: DateTime.now(),
        lumenAtMessage: _lumenCount.current,
      ));
    }

    // Check for Lumen 0
    if (_lumenCount.isExtinguished) {
      await _playTestament();
    }

    // Send dice result context to LLM and record narrative response
    final diceContext = _diceEngine.formatResult(result);
    final diceNarrative = await llm.sendMessage(
      userMessage: diceContext,
      currentLumen: _lumenCount.current,
      dicePool: _session!.dicePool,
      hopeDice: _session!.hopeDice,
      phase: _lumenCount.phase,
      diceResultContext: diceContext,
    );

    _session!.messages.add(ChatMessage(
      role: 'terminus',
      content: diceNarrative,
      timestamp: DateTime.now(),
      lumenAtMessage: _lumenCount.current,
    ));

    await storage.saveSession(_session!);
    notifyListeners();

    return result;
  }

  /// Manually extinguish a lumen (scene transition, truth, etc).
  void extinguishLumen(LumenExtinguishReason reason, [String? desc]) {
    _lumenCount.extinguish(reason, desc);
    _session?.lumenCount = _lumenCount.current;
    _session?.phase = _lumenCount.phase;
    notifyListeners();
  }

  /// Add a truth declaration.
  void addTruth(String speaker, String text) {
    if (_session == null) return;
    _session!.truths.add(TruthDeclaration(
      lumenAtDeclaration: _lumenCount.current,
      speaker: speaker,
      text: text,
      declaredAt: DateTime.now(),
    ));
    notifyListeners();
  }

  /// Resume from Commander pause.
  Future<void> resumeFromPause() async {
    _safetyCommander.deactivatePause();
    _session!.messages.add(ChatMessage(
      role: 'system',
      content: '[OPERATIONAL RESUME. The Commander has authorized '
          'return to operations. The darkness was waiting.]',
      timestamp: DateTime.now(),
      lumenAtMessage: _lumenCount.current,
    ));
    await storage.saveSession(_session!);
    notifyListeners();
  }

  /// Climate jitter — environmental entropy events.
  /// The system degrades independently of player actions.
  void _applyClimateJitter() {
    if (_session == null || _session!.isComplete) return;
    final lumen = _lumenCount.current;
    if (lumen >= TerminusConstants.climateJitterOnset) return;

    final chance = (TerminusConstants.climateJitterOnset - lumen) *
        TerminusConstants.climateJitterBase;
    if (_rng.nextDouble() > chance) return;

    // Severe event at lumen <= 2: corrode a die from the pool
    if (lumen <= 2 && _session!.dicePool > 1 && _rng.nextDouble() < 0.4) {
      _session!.dicePool--;
      _session!.messages.add(ChatMessage(
        role: 'system',
        content:
            '${TerminusConstants.climateCorrosionEvent} Pool: ${_session!.dicePool}.',
        timestamp: DateTime.now(),
        lumenAtMessage: lumen,
      ));
      return;
    }

    // Very rare severe: climate extinguishes a lumen (only at lumen <= 3)
    if (lumen <= 3 && _rng.nextDouble() < 0.08) {
      _lumenCount.extinguish(LumenExtinguishReason.climateDecay);
      _session!.lumenCount = _lumenCount.current;
      _session!.phase = _lumenCount.phase;
      _session!.messages.add(ChatMessage(
        role: 'system',
        content: '[SISTEMA] Cedimento strutturale. '
            'Una candela vacilla e si spegne. Lumen: ${_lumenCount.current}.',
        timestamp: DateTime.now(),
        lumenAtMessage: _lumenCount.current,
      ));
      return;
    }

    // Atmospheric event (flavor text, no mechanical impact)
    final events = TerminusConstants.climateEvents;
    _session!.messages.add(ChatMessage(
      role: 'system',
      content: events[_rng.nextInt(events.length)],
      timestamp: DateTime.now(),
      lumenAtMessage: lumen,
    ));
  }

  /// Play the sealed testament at Lumen 0.
  Future<void> _playTestament() async {
    if (_session == null || _session!.testamentPlayed) return;

    final testament = await llm.requestTestamentPlayback(
      _session!.profile.testament,
    );

    _session!.messages.add(ChatMessage(
      role: 'terminus',
      content: testament,
      timestamp: DateTime.now(),
      lumenAtMessage: 0,
    ));

    _session!.testamentPlayed = true;
    _session!.completedAt = DateTime.now();
    await storage.saveSession(_session!);
  }

  /// Load an existing session.
  Future<void> loadSession(String id) async {
    final loaded = await storage.loadSession(id);
    if (loaded != null) {
      _session = loaded;
      _lumenCount.restore(loaded.lumenCount);
      notifyListeners();
    }
  }

  /// End and archive the current session.
  Future<void> endSession() async {
    if (_session != null) {
      _session!.completedAt = DateTime.now();
      await storage.saveSession(_session!);
    }
    llm.endSession();
    _session = null;
    notifyListeners();
  }
}
