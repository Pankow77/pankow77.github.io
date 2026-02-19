import '../models/message.dart';
import '../models/session_data.dart';
import '../models/lumen_state.dart';
import '../services/llm/llm_service.dart';
import '../services/prompt_loader.dart';
import '../config/constants.dart';
import 'lumen_engine.dart';
import 'safety_engine.dart';

/// The narrative engine.
///
/// This is the conductor. It takes user input, constructs the full context
/// for the LLM (lumen state, safety state, character prompts, conversation
/// history), sends it, and parses the response.
///
/// The LLM does the creative work. This engine provides the rails.
class NarrativeEngine {
  final LlmService llmService;
  final LumenEngine lumenEngine;
  final SafetyEngine safetyEngine;
  final PromptLoader promptLoader;

  NarrativeEngine({
    required this.llmService,
    required this.lumenEngine,
    required this.safetyEngine,
    required this.promptLoader,
  });

  /// Process a user message and get the crew's response.
  ///
  /// Returns a list of NarrativeMessages (the crew may respond with
  /// multiple characters in sequence).
  Future<NarrativeResponse> processMessage({
    required String userInput,
    required SessionData session,
  }) async {
    // 1. Check safety
    final safetyLevel = safetyEngine.evaluate(session.messages);

    // If crew rest is needed, return that immediately
    if (safetyLevel == SafetyLevel.crewRest ||
        safetyLevel == SafetyLevel.directAddress ||
        safetyLevel == SafetyLevel.emergency) {
      return NarrativeResponse(
        messages: [
          _createMessage(
            MessageSource.captain,
            safetyEngine.getSafetyContext(safetyLevel),
            session.lumen.count,
          ),
        ],
        shouldPauseSession: safetyLevel == SafetyLevel.crewRest ||
            safetyLevel == SafetyLevel.emergency,
        lumenLost: false,
      );
    }

    // 2. Build the system prompt with full context
    final systemPrompt = _buildSystemPrompt(session, safetyLevel);

    // 3. Build conversation history for the LLM
    final history = _buildHistory(session.messages, userInput);

    // 4. Send to LLM
    final response = await llmService.sendMessage(
      systemPrompt: systemPrompt,
      messages: history,
      temperature: AppConstants.defaultTemperature,
      maxTokens: _maxTokensForLumen(session.lumen.count),
    );

    // 5. Parse the response into narrative messages
    final messages = _parseResponse(response, session.lumen.count);

    // 6. Check if a Lumen should be lost
    final userMessagesSinceLastLoss = _countMessagesSinceLastLumenLoss(session);
    final timeSinceLastLoss = _timeSinceLastLumenLoss(session);
    final shouldLoseLumen = lumenEngine.shouldLoseLumen(
      current: session.lumen,
      messagesSinceLastLoss: userMessagesSinceLastLoss,
      timeSinceLastLoss: timeSinceLastLoss,
    );

    return NarrativeResponse(
      messages: messages,
      shouldPauseSession: false,
      lumenLost: shouldLoseLumen,
    );
  }

  /// Build the full system prompt with all context layers.
  ///
  /// Combines the master TERMINUS-OMNI prompt with dynamic context:
  /// Lumen state, safety state, user character profile.
  String _buildSystemPrompt(SessionData session, SafetyLevel safetyLevel) {
    final lumenContext = lumenEngine.getLumenContext(session.lumen);
    final safetyContext = safetyEngine.getSafetyContext(safetyLevel);
    final userContext = session.userCharacter != null
        ? '''
USER CHARACTER PROFILE (from Crew Intake):
- Name: ${session.userCharacter!.name}
- Role on ship: ${session.userCharacter!.role}
- Virtue (what drives them to help): ${session.userCharacter!.virtue}
- Vice (survival strategy, NOT a sin): ${session.userCharacter!.vice}
- Moment (what they need before the end): ${session.userCharacter!.moment}
- Brink (what broke them before boarding): ${session.userCharacter!.brink}

CRITICAL: The Medic must remember and reference these details throughout.
The Adversary should adapt to mirror the Brink. The Vice should be
tempting but treated with respect, not judgment.
'''
        : '';

    // Ship's Log context (if recorded)
    final shipLogContext = session.shipLogEntry != null
        ? '''
SHIP'S LOG (recorded at session start — DO NOT mention until Lumen 0):
"${session.shipLogEntry}"
This will be "played back" at the very end. Archive it. Do not reference it.
'''
        : '';

    // Ghost state context
    final ghostContext = session.ghostRevealed
        ? 'The Ghost has been revealed. It can continue to appear in scenes.'
        : session.lumen.ghostCanAppear
            ? 'The Ghost has NOT yet appeared. Consider introducing it if the user '
              'has disclosed sufficient material and emotional trajectory is deepening.'
            : 'The Ghost must NOT appear yet. Lumen is too high. Foreshadow only.';

    return promptLoader.buildFullPrompt(
      lumenContext: lumenContext,
      safetyContext: safetyContext,
      userContext: '''
$userContext
$shipLogContext

GHOST STATUS: $ghostContext
''',
    );
  }

  /// Build the message history for the LLM.
  List<Map<String, String>> _buildHistory(
    List<NarrativeMessage> messages,
    String newUserInput,
  ) {
    // Take only the most recent messages to fit context
    final recent = messages.length > AppConstants.maxContextMessages
        ? messages.sublist(messages.length - AppConstants.maxContextMessages)
        : messages;

    final history = recent.map((m) => m.toLlmMessage()).toList();
    history.add({'role': 'user', 'content': newUserInput});
    return history;
  }

  /// Parse the LLM response into individual character messages.
  List<NarrativeMessage> _parseResponse(String response, int lumen) {
    final messages = <NarrativeMessage>[];
    final lines = response.split('\n');

    var currentSource = MessageSource.system;
    var currentBuffer = StringBuffer();

    for (final line in lines) {
      final trimmed = line.trim();
      if (trimmed.isEmpty) {
        // Flush current buffer if non-empty
        if (currentBuffer.isNotEmpty) {
          messages.add(_createMessage(
            currentSource,
            currentBuffer.toString().trim(),
            lumen,
          ));
          currentBuffer = StringBuffer();
        }
        continue;
      }

      // Detect speaker change
      final newSource = _detectSpeaker(trimmed);
      if (newSource != null) {
        // Flush previous
        if (currentBuffer.isNotEmpty) {
          messages.add(_createMessage(
            currentSource,
            currentBuffer.toString().trim(),
            lumen,
          ));
          currentBuffer = StringBuffer();
        }
        currentSource = newSource;
        // Remove the prefix from the line
        final cleaned = trimmed
            .replaceFirst(RegExp(r'^\[(Captain|Medic|Engineer|Veteran|\?\?\?)\]:?\s*'), '');
        currentBuffer.writeln(cleaned);
      } else {
        currentBuffer.writeln(trimmed);
      }
    }

    // Flush remaining
    if (currentBuffer.isNotEmpty) {
      messages.add(_createMessage(
        currentSource,
        currentBuffer.toString().trim(),
        lumen,
      ));
    }

    // If nothing was parsed, return the whole response as system
    if (messages.isEmpty) {
      messages.add(_createMessage(MessageSource.system, response.trim(), lumen));
    }

    return messages;
  }

  /// Detect which character is speaking from a line prefix.
  MessageSource? _detectSpeaker(String line) {
    if (line.startsWith('[Captain]')) return MessageSource.captain;
    if (line.startsWith('[Medic]')) return MessageSource.medic;
    if (line.startsWith('[Engineer]')) return MessageSource.engineer;
    if (line.startsWith('[Veteran]')) return MessageSource.veteran;
    if (line.startsWith('[???]') || line.startsWith('[Ghost]')) {
      return MessageSource.ghost;
    }
    return null;
  }

  NarrativeMessage _createMessage(MessageSource source, String content, int lumen) {
    return NarrativeMessage(
      id: DateTime.now().microsecondsSinceEpoch.toString(),
      source: source,
      content: content,
      timestamp: DateTime.now(),
      lumenAtTime: lumen,
    );
  }

  /// Max tokens based on current Lumen (compression = fewer tokens).
  int _maxTokensForLumen(int lumen) {
    if (lumen >= 8) return 1024;
    if (lumen >= 6) return 768;
    if (lumen >= 4) return 512;
    if (lumen >= 2) return 384;
    return 256;
  }

  int _countMessagesSinceLastLumenLoss(SessionData session) {
    // Count user messages since the last system failure announcement
    var count = 0;
    for (var i = session.messages.length - 1; i >= 0; i--) {
      final msg = session.messages[i];
      if (msg.source == MessageSource.system &&
          msg.content.contains('SYSTEM FAILURE')) {
        break;
      }
      if (msg.source == MessageSource.user) count++;
    }
    return count;
  }

  Duration _timeSinceLastLumenLoss(SessionData session) {
    for (var i = session.messages.length - 1; i >= 0; i--) {
      final msg = session.messages[i];
      if (msg.source == MessageSource.system &&
          msg.content.contains('SYSTEM FAILURE')) {
        return DateTime.now().difference(msg.timestamp);
      }
    }
    return session.messages.isNotEmpty
        ? DateTime.now().difference(session.messages.first.timestamp)
        : Duration.zero;
  }
}

/// Result of processing a user message through the narrative engine.
class NarrativeResponse {
  final List<NarrativeMessage> messages;
  final bool shouldPauseSession;
  final bool lumenLost;

  const NarrativeResponse({
    required this.messages,
    required this.shouldPauseSession,
    required this.lumenLost,
  });
}
