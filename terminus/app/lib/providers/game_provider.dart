import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';
import '../models/message.dart';
import '../models/session_data.dart';
import '../models/lumen_state.dart';
import '../models/crew_member.dart';
import '../engine/narrative_engine.dart';
import '../engine/lumen_engine.dart';
import '../engine/safety_engine.dart';
import '../services/llm/llm_service.dart';
import '../services/prompt_loader.dart';
import '../config/constants.dart';

const _uuid = Uuid();

/// The main game state notifier.
///
/// Manages the entire session: messages, lumen count, crew status,
/// and coordinates with the narrative engine.
class GameNotifier extends StateNotifier<SessionData> {
  NarrativeEngine? _engine;

  GameNotifier() : super(SessionData.newSession(_uuid.v4()));

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
  }

  /// Transition to the next phase.
  void setPhase(SessionPhase phase) {
    state = state.copyWith(phase: phase);
  }

  /// Set the user's character (from crew intake / onboarding).
  void setUserCharacter(UserCharacter character) {
    state = state.copyWith(userCharacter: character);
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
      // Process through the narrative engine
      final response = await _engine!.processMessage(
        userInput: userInput,
        session: state,
      );

      // Add crew responses
      final newMessages = [...state.messages, ...response.messages];

      // Handle Lumen loss
      var newLumen = state.lumen;
      if (response.lumenLost && !state.lumen.isShipLost) {
        newLumen = state.lumen.loseLumen();

        // Add system failure announcement
        final failureMsg = NarrativeMessage(
          id: _uuid.v4(),
          source: MessageSource.system,
          content: '⚠ SYSTEM FAILURE: ${newLumen.currentSystemStatus}',
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

      // Check for Act III / ship lost
      final phase = newLumen.isShipLost ? SessionPhase.decompression : newPhase;

      state = state.copyWith(
        messages: newMessages,
        lumen: newLumen,
        phase: phase,
        ghostRevealed: ghostRevealed,
        isProcessing: false,
      );
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
    addSystemMessage('⚠ SYSTEM FAILURE: ${newLumen.currentSystemStatus}');
    state = state.copyWith(lumen: newLumen);
  }

  /// Record the Ship's Log entry.
  void recordShipLog(String entry) {
    state = state.copyWith(shipLogEntry: entry);
    addSystemMessage('Ship\'s Log recorded. Entry stored.');
  }

  /// Resume from crew rest.
  void resumeFromRest() {
    state = state.copyWith(phase: SessionPhase.playing);
    addSystemMessage(
      'Systems stabilizing. The crew is rested.',
    );
  }
}
