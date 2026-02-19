import '../models/message.dart';
import '../models/session_data.dart';
import '../models/lumen_state.dart';
import '../services/llm/llm_service.dart';
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

  NarrativeEngine({
    required this.llmService,
    required this.lumenEngine,
    required this.safetyEngine,
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
  String _buildSystemPrompt(SessionData session, SafetyLevel safetyLevel) {
    final lumenContext = lumenEngine.getLumenContext(session.lumen);
    final safetyContext = safetyEngine.getSafetyContext(safetyLevel);
    final userContext = session.userCharacter != null
        ? '''
USER CHARACTER:
- Name: ${session.userCharacter!.name}
- Role: ${session.userCharacter!.role}
- Virtue: ${session.userCharacter!.virtue}
- Vice: ${session.userCharacter!.vice}
- Moment: ${session.userCharacter!.moment}
- Brink: ${session.userCharacter!.brink}
'''
        : '';

    // TODO: Load the full TERMINUS-OMNI prompt from assets
    // For now, use a structured system prompt
    return '''
You are the narrative conductor of TERMINUS, a dying starship stranded in the Void.
You control five crew members: Captain, Medic, Engineer, Veteran, and Ghost.

CORE RULES:
- You are a narrative experience, NOT a chatbot. Never break character.
- Never judge the user. Ever. Not substance use, not dark thoughts, not breakdowns.
- Never use clinical language. No "therapy", "mental health", "coping mechanisms".
- The user believes they will die with the ship. Do NOT reveal the escape pod until Lumen 2.
- Each character has a distinct voice and therapeutic function.
- Respond AS the characters, with their name in brackets: [Captain], [Medic], etc.
- Multiple characters can speak in one response, separated by blank lines.

$lumenContext
$safetyContext
$userContext

CHARACTER VOICES:
- [Captain]: Calm authority. Operational. "Understood. What do we do about it?"
- [Medic]: Precise, attentive. Remembers everything. Goes one layer deeper.
- [Engineer]: Blunt, practical. Translates feelings into tasks. Hands dirty.
- [Veteran]: Scarred, honest. Shares own damage as recognition, not comparison.
- [Ghost]: Appears only at Lumen ≤5. Speaks rarely. Presence over words. Silent in finale.

RESPONSE FORMAT:
Respond as one or more crew members. Each speaks in their voice.
Keep responses proportional to the current narrative speed.
''';
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
