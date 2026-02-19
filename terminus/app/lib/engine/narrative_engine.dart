import 'dart:math';
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
  final _random = Random();

  /// Recent speaker suggestions for anti-repeat rotation.
  /// Tracks the last 2 suggested speakers to prevent the same character
  /// being suggested 3 times in a row (MINOR-1 fix).
  final List<String> _recentSpeakers = [];

  /// Maximum words allowed in a Ghost message. Hard code-level constraint.
  /// The prompt tells the LLM to keep it short, but we enforce it here.
  static const int _ghostMaxWords = 5;

  /// Maximum percentage of characters that can be corrupted.
  /// Above this, the Ghost becomes pure noise. We need it recognizable.
  /// "░Mo ther░" = OK. "░▓█▒░▓█" = NOT OK.
  static const double _ghostMaxCorruptionRatio = 0.30;

  /// Characters used to corrupt Ghost text at the code level.
  static const String _glitchChars = '░▒▓█▄▀║═┃━';

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

    // 2. Suggest a speaker based on context (code-level guidance)
    final speakerSuggestion = _suggestSpeaker(userInput, session);

    // 3. Build the system prompt with full context (including narrative pressure)
    final systemPrompt = _buildSystemPrompt(
      session, safetyLevel, speakerSuggestion: speakerSuggestion,
    );

    // 4. Build conversation history for the LLM
    final history = _buildHistory(session.messages, userInput);

    // 5. Send to LLM
    final response = await llmService.sendMessage(
      systemPrompt: systemPrompt,
      messages: history,
      temperature: AppConstants.defaultTemperature,
      maxTokens: _maxTokensForLumen(session.lumen.count),
    );

    // 6. Parse the response into narrative messages
    var messages = _parseResponse(response, session.lumen.count);

    // 7. ENFORCE GHOST CONSTRAINTS — code-level, not prompt-level
    messages = _enforceGhostConstraints(messages, session);

    // 8. Check if a Lumen should be lost (intensity-aware)
    final userMessagesSinceLastLoss = _countMessagesSinceLastLumenLoss(session);
    final timeSinceLastLoss = _timeSinceLastLumenLoss(session);
    final shouldLoseLumen = lumenEngine.shouldLoseLumen(
      current: session.lumen,
      messagesSinceLastLoss: userMessagesSinceLastLoss,
      timeSinceLastLoss: timeSinceLastLoss,
      emotionalIntensity: session.emotionalIntensity,
    );

    return NarrativeResponse(
      messages: messages,
      shouldPauseSession: false,
      lumenLost: shouldLoseLumen,
    );
  }

  /// Suggest which character should speak, based on context.
  ///
  /// This is a CODE-LEVEL suggestion injected into the system prompt.
  /// The LLM can override for strong narrative reasons, but should
  /// generally follow the suggestion. For safety and Ghost situations,
  /// the code FORCES the behavior (via SafetyEngine and Ghost Enforcer).
  String _suggestSpeaker(String userInput, SessionData session) {
    final lower = userInput.toLowerCase();
    final wordCount = userInput.split(RegExp(r'\s+')).length;
    final lumen = session.lumen.count;

    // Act III: all speak in sequence (no suggestion needed)
    if (lumen <= 2) return '';

    // Very short input (1-3 words): user might be defensive or disengaged
    if (wordCount <= 3 && lower.length < 15) {
      return _applySpeakerRotation('Veteran');
    }

    // Long, confessional input (30+ words): Medic should listen and remember
    if (wordCount >= 30) {
      return _applySpeakerRotation('Medic');
    }

    // Questions from the user: Captain should answer with authority
    if (lower.endsWith('?')) {
      return _applySpeakerRotation('Captain');
    }

    // User expresses helplessness: Engineer should give a task
    if (lower.contains('non so') || lower.contains('don\'t know') ||
        lower.contains('non posso') || lower.contains('can\'t') ||
        lower.contains('cosa faccio') || lower.contains('what do i do')) {
      return _applySpeakerRotation('Engineer');
    }

    // User references past trauma or loss: Medic + Veteran
    if (lower.contains('madre') || lower.contains('mother') ||
        lower.contains('padre') || lower.contains('father') ||
        lower.contains('morto') || lower.contains('morta') ||
        lower.contains('died') || lower.contains('lost')) {
      return _applySpeakerRotation('Medic');
    }

    // No strong signal: let the LLM choose based on narrative flow
    return _applySpeakerRotation('');
  }

  /// Apply speaker rotation to prevent the same character 3x in a row.
  ///
  /// If [preferred] is empty, no suggestion is made (LLM chooses freely).
  /// If [preferred] has been suggested for the last 2 turns, rotate to
  /// a different character that fits as secondary support.
  String _applySpeakerRotation(String preferred) {
    if (preferred.isEmpty) {
      _recentSpeakers.add('');
      if (_recentSpeakers.length > 2) _recentSpeakers.removeAt(0);
      return '';
    }

    // Check if this speaker was suggested for the last 2 turns
    final isTripleRepeat = _recentSpeakers.length >= 2 &&
        _recentSpeakers.every((s) => s == preferred);

    String chosen;
    if (isTripleRepeat) {
      // Rotate to secondary support based on the character
      chosen = _getRotationAlternate(preferred);
    } else {
      chosen = preferred;
    }

    // Track the choice
    _recentSpeakers.add(chosen);
    if (_recentSpeakers.length > 2) _recentSpeakers.removeAt(0);

    return _buildSuggestionString(chosen, preferred, isTripleRepeat);
  }

  /// Get a rotation alternate when a speaker has been suggested too many times.
  ///
  /// Uses the therapeutic support pairing from the Character Selection Logic
  /// table in the system prompt.
  String _getRotationAlternate(String overusedSpeaker) {
    switch (overusedSpeaker) {
      case 'Captain': return 'Engineer'; // Both ground through authority/action
      case 'Medic': return 'Veteran';    // Both hold emotional material
      case 'Engineer': return 'Captain'; // Both provide structure
      case 'Veteran': return 'Captain';  // Veteran rotates to steady authority
      default: return 'Captain';
    }
  }

  /// Build the speaker suggestion string for the LLM context.
  String _buildSuggestionString(String chosen, String original, bool wasRotated) {
    final rotationNote = wasRotated
        ? ' (Rotated from $original — give other voices a turn.)'
        : '';
    switch (chosen) {
      case 'Veteran':
        return 'SPEAKER SUGGESTION: Veteran (the user is being brief — '
            'the Veteran can call this out gently or match the energy).$rotationNote';
      case 'Medic':
        return 'SPEAKER SUGGESTION: Medic (the Medic should listen, '
            'reference past details, go one layer deeper).$rotationNote';
      case 'Captain':
        return 'SPEAKER SUGGESTION: Captain (the Captain should respond '
            'with calm authority and operational framing).$rotationNote';
      case 'Engineer':
        return 'SPEAKER SUGGESTION: Engineer (the user needs grounding — '
            'give them a task. "Hold this. Focus on this.").$rotationNote';
      default:
        return '';
    }
  }

  /// Build the full system prompt with all context layers.
  ///
  /// Combines the master TERMINUS-OMNI prompt with dynamic context:
  /// Lumen state, safety state, user character profile, narrative pressure.
  String _buildSystemPrompt(
    SessionData session,
    SafetyLevel safetyLevel, {
    String speakerSuggestion = '',
  }) {
    // Calculate narrative pressure for gentle nudge system
    final timeSinceLastLoss = _timeSinceLastLumenLoss(session);
    final narrativePressure = lumenEngine.getNarrativePressure(
      current: session.lumen,
      timeSinceLastLoss: timeSinceLastLoss,
    );

    final lumenContext = lumenEngine.getLumenContext(
      session.lumen,
      narrativePressure: narrativePressure,
    );
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

    // Ghost state context — uses the weighted point system
    final ghostContext = _buildGhostContext(session);

    return promptLoader.buildFullPrompt(
      lumenContext: lumenContext,
      safetyContext: safetyContext,
      userContext: '''
$userContext
$shipLogContext

GHOST STATUS: $ghostContext
${speakerSuggestion.isNotEmpty ? '\n$speakerSuggestion\n' : ''}
''',
    );
  }

  /// Build the Ghost context string for the system prompt.
  ///
  /// Uses the weighted readiness score and provides nuanced guidance
  /// to the LLM about what the Ghost can do right now.
  String _buildGhostContext(SessionData session) {
    if (session.ghostRevealed) {
      return 'The Ghost has been revealed. It can continue to appear in scenes. '
          'Remember: the Ghost speaks in FRAGMENTS only (1-5 words max). '
          'At Lumen 1 or 0, the Ghost is SILENT. It watches. It does not speak.';
    }

    if (session.ghostIsReady) {
      return 'The Ghost has NOT yet appeared. The user is emotionally ready '
          '(readiness score: ${session.ghostReadinessScore}/10). '
          'Consider introducing it when the narrative moment is right. '
          'The Ghost speaks ONLY in fragments. 1-5 words maximum.';
    }

    if (session.lumen.ghostCanAppear) {
      final score = session.ghostReadinessScore;
      return 'The Ghost must NOT appear yet. Lumen is low enough but '
          'emotional readiness is insufficient (score: $score/6 needed). '
          'Foreshadow only: a shadow, an anomalous reading, a name on a manifest.';
    }

    return 'The Ghost must NOT appear. Lumen is too high. '
        'Subtle foreshadowing only: unexplained sounds, manifest discrepancies.';
  }

  /// GHOST ENFORCER — Hard code-level constraints on Ghost output.
  ///
  /// No matter what the LLM generates, the Ghost is limited to:
  /// 1. Maximum 5 words (truncated with "...")
  /// 2. Text corruption with readability cap (max 30% corrupted)
  /// 3. Completely REMOVED if the Ghost is not ready (weighted gate)
  /// 4. SILENT at Lumen ≤ 1 ONLY IF the Ghost has already appeared.
  ///    If it hasn't appeared yet at Lumen 1, this is the last chance.
  List<NarrativeMessage> _enforceGhostConstraints(
    List<NarrativeMessage> messages,
    SessionData session,
  ) {
    return messages.map((msg) {
      if (msg.source != MessageSource.ghost) return msg;

      // GATE: Ghost not ready? Strip it entirely.
      if (!session.ghostRevealed && !session.ghostIsReady) {
        return null;
      }

      // FINALE SILENCE — but with nuance:
      // If the Ghost has ALREADY appeared, it goes silent at Lumen ≤ 1.
      // If the Ghost has NEVER appeared and this is Lumen 1, this is
      // its last chance. Let it through (the silence applies AFTER this).
      if (session.lumen.count <= 1 && session.ghostRevealed) {
        return null;
      }

      // At Lumen 0: Ghost is always silent. Ship is lost.
      if (session.lumen.count <= 0) {
        return null;
      }

      // TRUNCATION: Max 5 words
      final truncated = _truncateGhostOutput(msg.content);

      // CORRUPTION: Add glitch characters with readability cap
      final corrupted = _corruptGhostOutput(truncated);

      return NarrativeMessage(
        id: msg.id,
        source: msg.source,
        content: corrupted,
        timestamp: msg.timestamp,
        lumenAtTime: msg.lumenAtTime,
      );
    }).whereType<NarrativeMessage>().toList();
  }

  /// Truncate Ghost output to maximum word count.
  /// "I understand your pain and suffering" → "I understand your pain..."
  String _truncateGhostOutput(String content) {
    final words = content.split(RegExp(r'\s+'))
        .where((w) => w.isNotEmpty)
        .toList();

    if (words.length <= _ghostMaxWords) return content;

    return '${words.take(_ghostMaxWords).join(' ')}...';
  }

  /// Add corruption to Ghost output with readability cap.
  ///
  /// "Madre" → "░Mo ther░" (recognizable)
  /// NOT "░▓█▒░▓█" (pure noise)
  ///
  /// The readability cap ensures that no more than 30% of the original
  /// characters are corrupted. If exceeded, corruption is reduced.
  String _corruptGhostOutput(String content) {
    if (content.isEmpty) return '...';

    // Count non-space characters for corruption budget
    final nonSpaceCount = content.replaceAll(' ', '').length;
    final maxCorruptions = (nonSpaceCount * _ghostMaxCorruptionRatio).floor();
    var corruptionsUsed = 0;

    final buffer = StringBuffer();

    // Leading corruption (40% chance, uses 1-2 from budget)
    if (_random.nextDouble() < 0.4 && corruptionsUsed < maxCorruptions) {
      final glitchLen = min(1 + _random.nextInt(2), maxCorruptions - corruptionsUsed);
      buffer.write(_randomGlitch(glitchLen));
      buffer.write(' ');
      corruptionsUsed += glitchLen;
    }

    // Process each character
    for (var i = 0; i < content.length; i++) {
      final char = content[i];

      // 5% chance: replace with glitch character (if budget allows)
      if (_random.nextDouble() < 0.05 &&
          char != ' ' &&
          corruptionsUsed < maxCorruptions) {
        buffer.write(_glitchChars[_random.nextInt(_glitchChars.length)]);
        corruptionsUsed++;
      } else {
        buffer.write(char);
      }

      // 8% chance: add space between characters (fragmentation)
      // This doesn't count as corruption — it's visual fragmentation
      if (_random.nextDouble() < 0.08 && char != ' ' && i < content.length - 1) {
        buffer.write(' ');
      }
    }

    // Trailing corruption (40% chance, if budget allows)
    if (_random.nextDouble() < 0.4 && corruptionsUsed < maxCorruptions) {
      final glitchLen = min(1 + _random.nextInt(2), maxCorruptions - corruptionsUsed);
      buffer.write(' ');
      buffer.write(_randomGlitch(glitchLen));
    }

    return buffer.toString();
  }

  /// Generate a random glitch string of given length.
  String _randomGlitch(int length) {
    return List.generate(length,
        (_) => _glitchChars[_random.nextInt(_glitchChars.length)]).join();
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
