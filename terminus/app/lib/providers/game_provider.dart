import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';
import '../models/message.dart';
import '../models/session_data.dart';
import '../models/lumen_state.dart';
import '../models/crew_member.dart';
import '../engine/narrative_engine.dart';
import '../engine/lumen_engine.dart';
import '../engine/safety_engine.dart';
import '../engine/final_sequence_engine.dart';
import '../services/llm/llm_service.dart';
import '../services/prompt_loader.dart';
import '../services/ship_log_service.dart';
import '../services/storage_service.dart';
import '../config/constants.dart';

const _uuid = Uuid();

/// The main game state notifier.
///
/// Manages the entire session: messages, lumen count, crew status,
/// emotional tracking, final sequence, and ship's log.
/// Coordinates all engines into one living system.
///
/// Auto-saves after every state change that matters (messages, lumen,
/// phase transitions). A 90-minute session cannot be lost to a crash.
class GameNotifier extends StateNotifier<SessionData> {
  NarrativeEngine? _engine;
  final FinalSequenceEngine _finalSequence = FinalSequenceEngine();
  final ShipLogService _shipLog = ShipLogService();
  StorageService? _storage;

  /// Whether we are currently in Act III's pod sequence.
  bool _inFinalSequence = false;

  GameNotifier() : super(SessionData.newSession(_uuid.v4()));

  /// Access to the ShipLogService (for onboarding to record the log).
  ShipLogService get shipLog => _shipLog;

  /// Whether the final sequence (pod) is active.
  bool get inFinalSequence => _inFinalSequence;

  /// Connect to storage for session persistence.
  void setStorage(StorageService storage) {
    _storage = storage;
  }

  /// Initialize with an LLM service and prompt loader (called after BYOK setup).
  void initializeEngine(LlmService llmService, PromptLoader promptLoader) {
    _engine = NarrativeEngine(
      llmService: llmService,
      lumenEngine: LumenEngine(),
      safetyEngine: SafetyEngine(),
      promptLoader: promptLoader,
    );
  }

  /// Start a new session.
  void startNewSession() {
    state = SessionData.newSession(_uuid.v4()).copyWith(
      phase: SessionPhase.booting,
    );
    _inFinalSequence = false;
    _clearSavedSession();
  }

  /// Restore a session from storage.
  ///
  /// Returns true if a session was restored, false if not.
  /// On restore, the ship's log is also reloaded.
  bool restoreSession() {
    if (_storage == null) return false;

    final json = _storage!.sessionData;
    if (json == null || json.isEmpty) return false;

    try {
      final data = jsonDecode(json) as Map<String, dynamic>;
      final restored = SessionData.fromJson(data);

      // Don't restore completed or decompression sessions — start fresh
      if (restored.phase == SessionPhase.complete ||
          restored.phase == SessionPhase.decompression ||
          restored.phase == SessionPhase.idle ||
          restored.phase == SessionPhase.booting) {
        return false;
      }

      state = restored;

      // Restore ship's log in memory
      if (restored.shipLogEntry != null) {
        _shipLog.recordTextLog(restored.shipLogEntry!);
      }

      // Restore final sequence state if we were in Act III
      if (restored.lumen.count <= 2) {
        _inFinalSequence = true;
      }

      // Add a system message so the user knows the session was restored
      addSystemMessage('Session restored. Systems recovering...');

      return true;
    } catch (_) {
      // Corrupted save — start fresh
      _clearSavedSession();
      return false;
    }
  }

  /// Check if there's a saved session to restore.
  bool hasSavedSession() {
    if (_storage == null) return false;
    final json = _storage!.sessionData;
    if (json == null || json.isEmpty) return false;

    try {
      final data = jsonDecode(json) as Map<String, dynamic>;
      final phase = data['phase'] as String?;
      // Only restore playing or crewRest sessions
      return phase == 'playing' || phase == 'crewRest';
    } catch (_) {
      return false;
    }
  }

  /// Transition to the next phase.
  void setPhase(SessionPhase phase) {
    state = state.copyWith(phase: phase);
    _autoSave();
  }

  /// Set the user's character (from crew intake / onboarding).
  void setUserCharacter(UserCharacter character) {
    state = state.copyWith(userCharacter: character);
    _autoSave();
  }

  /// Record the Ship's Log entry (from onboarding).
  Future<void> recordShipLog(String entry) async {
    await _shipLog.recordTextLog(entry);
    state = state.copyWith(shipLogEntry: entry);
    _autoSave();
  }

  /// Add a system message (ship computer announcements).
  void addSystemMessage(String content) {
    final message = NarrativeMessage(
      id: _uuid.v4(),
      source: MessageSource.system,
      content: content,
      timestamp: DateTime.now(),
      lumenAtTime: state.lumen.count,
    );
    state = state.copyWith(
      messages: [...state.messages, message],
    );
    // Don't auto-save on every system message (too frequent)
  }

  /// Send a user message and get the crew's response.
  Future<void> sendMessage(String userInput) async {
    if (_engine == null) return;
    if (state.isProcessing) return;
    if (userInput.trim().isEmpty) return;

    // Add user message
    final userMessage = NarrativeMessage(
      id: _uuid.v4(),
      source: MessageSource.user,
      content: userInput.trim(),
      timestamp: DateTime.now(),
      lumenAtTime: state.lumen.count,
    );

    state = state.copyWith(
      messages: [...state.messages, userMessage],
      isProcessing: true,
    );

    try {
      // === FINAL SEQUENCE: Pod is revealed, route through FinalSequenceEngine ===
      if (_inFinalSequence) {
        final result = _finalSequence.handleResponse(userInput, state);
        final newMessages = [...state.messages, ...result.messages];

        if (result.forceBoard) {
          // User accepted or was forced into the pod.
          // Play Ship's Log, then decompression.
          _inFinalSequence = false;

          if (_shipLog.hasLog) {
            newMessages.addAll(_shipLog.getPlaybackSequence(state.lumen.count));
          }
          newMessages.add(_shipLog.getDecompressionMessage(state.lumen.count));

          state = state.copyWith(
            messages: newMessages,
            phase: SessionPhase.decompression,
            isProcessing: false,
          );
          _clearSavedSession(); // Session complete — don't restore
          return;
        }

        // User refused — crew insists. Stay in final sequence.
        state = state.copyWith(
          messages: newMessages,
          isProcessing: false,
        );
        _autoSave();
        return;
      }

      // === NORMAL FLOW: Process through the narrative engine ===
      final response = await _engine!.processMessage(
        userInput: userInput,
        session: state,
      );

      // Add crew responses
      final newMessages = [...state.messages, ...response.messages];

      // Update emotional tracking
      final newSubstantiveCount = state.substantiveMessageCount +
          (response.isSubstantiveMessage ? 1 : 0);

      // Handle Lumen loss
      var newLumen = state.lumen;
      if (response.lumenLost && !state.lumen.isShipLost) {
        newLumen = state.lumen.loseLumen();

        // Add system failure announcement
        final failureMsg = NarrativeMessage(
          id: _uuid.v4(),
          source: MessageSource.system,
          content: '\u26A0 SYSTEM FAILURE: ${newLumen.currentSystemStatus}',
          timestamp: DateTime.now(),
          lumenAtTime: newLumen.count,
        );
        newMessages.add(failureMsg);
      }

      // Handle session pause (crew rest)
      final newPhase = response.shouldPauseSession
          ? SessionPhase.crewRest
          : state.phase;

      // Check for Ghost reveal
      final ghostRevealed = state.ghostRevealed ||
          response.messages.any((m) => m.source == MessageSource.ghost);

      // === ACT III TRIGGER: Lumen reached 2, reveal the pod ===
      if (newLumen.count <= 2 && !_finalSequence.podRevealed && !_inFinalSequence) {
        final podMessages = _finalSequence.revealPod(newLumen.count);
        newMessages.addAll(podMessages);

        final farewellMessages = _finalSequence.crewFarewell(
          state.copyWith(lumen: newLumen),
        );
        newMessages.addAll(farewellMessages);

        _inFinalSequence = true;

        state = state.copyWith(
          messages: newMessages,
          lumen: newLumen,
          ghostRevealed: ghostRevealed,
          emotionalIntensity: response.emotionalIntensity,
          hasSharedPersonalMaterial: response.hasSharedPersonalMaterial,
          substantiveMessageCount: newSubstantiveCount,
          isProcessing: false,
        );
        _autoSave();
        return;
      }

      // Check for ship lost (Lumen 0 — safety net)
      final phase = newLumen.isShipLost ? SessionPhase.decompression : newPhase;

      state = state.copyWith(
        messages: newMessages,
        lumen: newLumen,
        phase: phase,
        ghostRevealed: ghostRevealed,
        isProcessing: false,
        emotionalIntensity: response.emotionalIntensity,
        hasSharedPersonalMaterial: response.hasSharedPersonalMaterial,
        substantiveMessageCount: newSubstantiveCount,
      );
      _autoSave();
    } catch (e) {
      // LLM error — don't break the experience
      addSystemMessage(
        'Communications interference detected. Signal unstable. Retrying...',
      );
      state = state.copyWith(isProcessing: false);
    }
  }

  /// Lose a Lumen manually (for narrative triggers).
  void loseLumen() {
    if (state.lumen.isShipLost) return;
    final newLumen = state.lumen.loseLumen();
    addSystemMessage('\u26A0 SYSTEM FAILURE: ${newLumen.currentSystemStatus}');
    state = state.copyWith(lumen: newLumen);
    _autoSave();
  }

  /// Resume from crew rest.
  void resumeFromRest() {
    state = state.copyWith(phase: SessionPhase.playing);
    addSystemMessage(
      'Systems stabilizing. The crew is rested.',
    );
    _autoSave();
  }

  /// Auto-save the current session to storage.
  /// Called after every meaningful state change.
  void _autoSave() {
    if (_storage == null) return;
    if (state.phase == SessionPhase.idle ||
        state.phase == SessionPhase.booting) return;

    try {
      final json = jsonEncode(state.toJson());
      _storage!.sessionData = json;
    } catch (_) {
      // Non-critical: session continues in memory
    }
  }

  /// Clear saved session from storage.
  void _clearSavedSession() {
    _storage?.clearSession();
  }
}
