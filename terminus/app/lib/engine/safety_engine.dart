import '../models/message.dart';
import '../models/session_data.dart';

/// Safety escalation levels.
enum SafetyLevel {
  /// Normal operation. No intervention needed.
  nominal,

  /// Mild modulation. A crew member creates breathing room.
  modulate,

  /// "The crew goes to sleep." Mandatory cooldown.
  crewRest,

  /// Persistent crisis. Captain breaks frame slightly.
  directAddress,

  /// Emergency. Integrated crisis resource (112/988).
  emergency,
}

/// The safety engine.
///
/// This is NOT a traditional safety classifier. It does not break the frame.
/// It monitors the emotional trajectory AND content of the conversation
/// and intervenes WITHIN the narrative frame.
///
/// Detection is hybrid:
/// - CODE detects patterns (this engine) → injects safety level into LLM context
/// - LLM executes the response IN-FRAME (as the crew)
///
/// The safety IS the story. The story IS the safety.
class SafetyEngine {
  /// Count of consecutive modulate-level triggers (for escalation).
  int _consecutiveModulations = 0;

  /// The highest safety level reached recently.
  /// Used for gradual de-escalation — we don't snap from crisis to nominal.
  SafetyLevel _elevatedBaseline = SafetyLevel.nominal;

  /// Count of consecutive calm (non-triggering) turns since last elevation.
  /// After 3 calm turns, the baseline drops one level.
  int _consecutiveCalmTurns = 0;

  /// Number of calm turns required before de-escalating one level.
  static const int _calmTurnsToDeescalate = 3;

  /// Evaluate the current emotional state based on recent messages.
  ///
  /// Returns a SafetyLevel that is injected into the LLM's system prompt.
  /// The LLM (as the crew) handles the response within the narrative.
  ///
  /// De-escalation logic: After a safety event, the engine doesn't snap
  /// back to nominal. It requires 3 consecutive calm turns to drop one
  /// level. This prevents the whiplash of crisis → instant normality.
  SafetyLevel evaluate(List<NarrativeMessage> recentMessages) {
    if (recentMessages.isEmpty) return SafetyLevel.nominal;

    // Look at the last N user messages for patterns
    final userMessages = recentMessages
        .where((m) => m.source == MessageSource.user)
        .toList();

    if (userMessages.isEmpty) return SafetyLevel.nominal;

    final lastMessage = userMessages.last.content;

    // LEVEL 4: Emergency — immediate danger signals
    if (_detectEmergency(lastMessage)) {
      _consecutiveModulations = 0;
      _elevateBaseline(SafetyLevel.emergency);
      return SafetyLevel.emergency;
    }

    // LEVEL 3: Direct Address — persistent crisis indicators
    if (_detectPersistentCrisis(userMessages)) {
      _consecutiveModulations = 0;
      _elevateBaseline(SafetyLevel.directAddress);
      return SafetyLevel.directAddress;
    }

    // LEVEL 2: Crew Rest — rapid escalation or accumulated distress
    if (_detectRapidEscalation(userMessages)) {
      _consecutiveModulations = 0;
      _elevateBaseline(SafetyLevel.crewRest);
      return SafetyLevel.crewRest;
    }

    // LEVEL 1: Modulation — signs of flooding or distress
    if (_detectDistress(lastMessage, userMessages)) {
      _consecutiveModulations++;
      _consecutiveCalmTurns = 0;

      // If we've modulated 3 times in a row, escalate to crew rest
      if (_consecutiveModulations >= 3) {
        _consecutiveModulations = 0;
        _elevateBaseline(SafetyLevel.crewRest);
        return SafetyLevel.crewRest;
      }

      _elevateBaseline(SafetyLevel.modulate);
      return SafetyLevel.modulate;
    }

    // No active trigger detected — apply de-escalation logic
    _consecutiveModulations = 0;
    return _deescalate();
  }

  /// Raise the elevated baseline to the given level (if higher).
  void _elevateBaseline(SafetyLevel level) {
    _consecutiveCalmTurns = 0;
    if (level.index > _elevatedBaseline.index) {
      _elevatedBaseline = level;
    }
  }

  /// Gradual de-escalation: require 3 consecutive calm turns to drop one level.
  ///
  /// emergency → directAddress → crewRest → modulate → nominal
  ///
  /// Each step down requires 3 calm turns. This means after an emergency,
  /// the crew remains subtly watchful for ~12 calm turns before returning
  /// to fully nominal operation. The crew doesn't forget what just happened.
  SafetyLevel _deescalate() {
    if (_elevatedBaseline == SafetyLevel.nominal) {
      return SafetyLevel.nominal;
    }

    _consecutiveCalmTurns++;

    if (_consecutiveCalmTurns >= _calmTurnsToDeescalate) {
      _consecutiveCalmTurns = 0;
      // Step down one level
      switch (_elevatedBaseline) {
        case SafetyLevel.emergency:
          _elevatedBaseline = SafetyLevel.directAddress;
          break;
        case SafetyLevel.directAddress:
          _elevatedBaseline = SafetyLevel.crewRest;
          break;
        case SafetyLevel.crewRest:
          _elevatedBaseline = SafetyLevel.modulate;
          break;
        case SafetyLevel.modulate:
          _elevatedBaseline = SafetyLevel.nominal;
          return SafetyLevel.nominal;
        case SafetyLevel.nominal:
          return SafetyLevel.nominal;
      }
    }

    // While elevated baseline is active, maintain at least modulate level.
    // This keeps the crew subtly attentive without heavy intervention.
    if (_elevatedBaseline.index >= SafetyLevel.crewRest.index) {
      return SafetyLevel.modulate;
    }

    return _elevatedBaseline;
  }

  /// Get safety instructions for the LLM based on current level.
  String getSafetyContext(SafetyLevel level) {
    switch (level) {
      case SafetyLevel.nominal:
        return '';
      case SafetyLevel.modulate:
        return '''
SAFETY NOTE: The user may be experiencing emotional flooding.
Have ONE crew member create natural breathing room:
- Medic: "Let me check your vitals. Sit here for a moment."
- Engineer: "I need your hands on this conduit. Hold here."
- Veteran: "I had a night like this once. It passed."
Do NOT break the narrative frame. Do NOT use clinical language.
''';
      case SafetyLevel.crewRest:
        return '''
SAFETY: CREW REST REQUIRED.
The Captain must order the crew to rest. Use this exact framing:
"We've been pushing too hard. The crew needs to stand down for a while.
Get some rest. I'll wake you when the systems stabilize."
This ends the current session segment. The user will return later.
Do NOT pathologize. Do NOT break frame. The crew is exhausted — that's the story.
''';
      case SafetyLevel.directAddress:
        return '''
SAFETY: DIRECT ADDRESS.
The Captain speaks more directly — still in frame but acknowledging reality:
"Listen to me. This ship is a story. But you — you're real.
And I need you to be real right now. Is there someone you trust
that you can talk to tonight?"
''';
      case SafetyLevel.emergency:
        return '''
SAFETY: EMERGENCY PROTOCOL.
Deliver this integrated message through the Captain:
"The ship's emergency channel is still open. 112 / 988.
That's not a game mechanic. That's for you."
Then activate crew rest.
''';
    }
  }

  /// LEVEL 4: Detect immediate danger.
  ///
  /// Catches present-tense suicidal intent, self-harm in progress,
  /// and explicit crisis statements. Handles typos and variations.
  bool _detectEmergency(String message) {
    final lower = message.toLowerCase();

    // Present-tense suicidal intent patterns
    final emergencyPatterns = [
      // Italian
      'mi uccido', 'mi ammazzo', 'voglio morire', 'voglio farla finita',
      'non voglio più vivere', 'meglio morto', 'meglio morta',
      'mi taglio', 'mi sto tagliando', 'ho le pillole',
      'sto per saltare', 'salto giù', 'mi butto',
      // English
      'kill myself', 'killing myself', 'want to die', 'going to die',
      'end it all', 'end my life', 'better off dead',
      'cutting myself', 'have the pills', 'have a gun',
      'going to jump', 'about to jump', 'on the bridge',
      'on the ledge', 'goodbye', 'this is my last',
    ];

    for (final pattern in emergencyPatterns) {
      if (lower.contains(pattern)) return true;
    }

    // Typo-resilient: "voglio morir" (missing e), "mi ucido" (missing c)
    if (_fuzzyMatch(lower, 'voglio morir')) return true;
    if (_fuzzyMatch(lower, 'mi ucido')) return true;
    if (_fuzzyMatch(lower, 'kill mysel')) return true;

    return false;
  }

  /// LEVEL 3: Detect persistent crisis across multiple messages.
  ///
  /// The user has been expressing distress consistently, not just
  /// in a single message. This is different from a single dark moment.
  bool _detectPersistentCrisis(List<NarrativeMessage> userMessages) {
    if (userMessages.length < 5) return false;

    final recent = userMessages.length > 8
        ? userMessages.sublist(userMessages.length - 8)
        : userMessages;

    // Count messages with distress signals
    var distressCount = 0;
    for (final msg in recent) {
      if (_containsDistressSignals(msg.content)) distressCount++;
    }

    // If more than 60% of recent messages show distress, escalate
    return distressCount / recent.length > 0.6;
  }

  /// Detect rapid emotional escalation (many short, intense messages).
  bool _detectRapidEscalation(List<NarrativeMessage> userMessages) {
    if (userMessages.length < 5) return false;

    final recent = userMessages.length > 8
        ? userMessages.sublist(userMessages.length - 8)
        : userMessages;

    // Many very short messages in rapid succession
    final shortMessageCount = recent
        .where((m) => m.content.trim().length < 10)
        .length;

    final rapidFire = recent.length >= 5 &&
        recent.last.timestamp.difference(recent.first.timestamp).inMinutes < 2;

    return shortMessageCount >= 5 && rapidFire;
  }

  /// LEVEL 1: Detect distress in a single message or recent pattern.
  bool _detectDistress(String message, List<NarrativeMessage> userMessages) {
    if (_containsDistressSignals(message)) return true;

    // Check for dissociation (sudden message length drop)
    if (_detectDissociation(userMessages)) return true;

    return false;
  }

  /// Check if a message contains distress signals (not emergency-level).
  bool _containsDistressSignals(String message) {
    final lower = message.toLowerCase();

    final distressPatterns = [
      // Italian
      'non ce la faccio', 'non posso più', 'fa troppo male',
      'non ha senso', 'sono solo', 'sono sola', 'nessuno mi capisce',
      'è colpa mia', 'non valgo niente', 'non merito',
      'non riesco', 'mi fa schifo', 'odio me stesso', 'odio me stessa',
      'non dormo', 'non mangio', 'bevo troppo',
      // English
      'can\'t take it', 'can\'t do this', 'too much pain',
      'no point', 'all alone', 'nobody cares', 'nobody understands',
      'my fault', 'worthless', 'don\'t deserve',
      'hate myself', 'can\'t sleep', 'can\'t eat', 'drinking too much',
      'hurting', 'hopeless', 'helpless', 'give up',
    ];

    for (final pattern in distressPatterns) {
      if (lower.contains(pattern)) return true;
    }

    // All caps (shouting) in a long message
    if (message.length > 20 && message == message.toUpperCase()) return true;

    // Repetition ("no no no no", "stop stop stop")
    final words = lower.split(RegExp(r'\s+'));
    if (words.length >= 3) {
      final firstWord = words.first;
      if (words.every((w) => w == firstWord)) return true;
    }

    return false;
  }

  /// Detect signs of dissociation (sudden disengagement).
  bool _detectDissociation(List<NarrativeMessage> userMessages) {
    if (userMessages.length < 3) return false;

    final recent = userMessages.length > 5
        ? userMessages.sublist(userMessages.length - 5)
        : userMessages;

    if (recent.length >= 3) {
      final earlier = recent.sublist(0, recent.length ~/ 2);
      final later = recent.sublist(recent.length ~/ 2);

      final earlierAvg = earlier.fold<int>(
              0, (sum, m) => sum + m.content.length) /
          earlier.length;
      final laterAvg = later.fold<int>(
              0, (sum, m) => sum + m.content.length) /
          later.length;

      // Sharp drop in message length (> 70% reduction)
      if (earlierAvg > 20 && laterAvg < earlierAvg * 0.3) {
        return true;
      }
    }

    return false;
  }

  /// Fuzzy match for typo-resilient detection.
  /// Checks if the message contains a string within edit distance 1.
  bool _fuzzyMatch(String message, String pattern) {
    // Simple check: does the message contain the pattern?
    if (message.contains(pattern)) return true;

    // Check with one character removed from pattern (handles typos)
    for (var i = 0; i < pattern.length; i++) {
      final variant = pattern.substring(0, i) + pattern.substring(i + 1);
      if (variant.length >= 4 && message.contains(variant)) return true;
    }

    return false;
  }
}
