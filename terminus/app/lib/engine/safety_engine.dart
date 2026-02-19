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
/// This is NOT a traditional safety classifier. It does not use lexical triggers.
/// It monitors the emotional trajectory of the conversation and intervenes
/// WITHIN the narrative frame.
///
/// The safety IS the story. The story IS the safety.
class SafetyEngine {
  /// Evaluate the current emotional state based on recent messages.
  ///
  /// This produces instructions for the LLM about how to modulate,
  /// not direct interventions. The LLM (as the crew) handles the response.
  SafetyLevel evaluate(List<NarrativeMessage> recentMessages) {
    if (recentMessages.isEmpty) return SafetyLevel.nominal;

    // Look at the last N user messages for patterns
    final userMessages = recentMessages
        .where((m) => m.source == MessageSource.user)
        .toList();

    if (userMessages.isEmpty) return SafetyLevel.nominal;

    // Check for rapid escalation (many short, intense messages)
    if (_detectRapidEscalation(userMessages)) {
      return SafetyLevel.crewRest;
    }

    // Check for signs of dissociation (incoherent, very short, withdrawal)
    if (_detectDissociation(userMessages)) {
      return SafetyLevel.modulate;
    }

    return SafetyLevel.nominal;
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

  /// Detect rapid emotional escalation.
  bool _detectRapidEscalation(List<NarrativeMessage> userMessages) {
    if (userMessages.length < 5) return false;

    final recent = userMessages.length > 8
        ? userMessages.sublist(userMessages.length - 8)
        : userMessages;

    // Heuristic: many very short messages in rapid succession
    // may indicate distress rather than engaged play
    final shortMessageCount = recent
        .where((m) => m.content.trim().length < 10)
        .length;

    final rapidFire = recent.length >= 5 &&
        recent.last.timestamp.difference(recent.first.timestamp).inMinutes < 2;

    return shortMessageCount >= 5 && rapidFire;
  }

  /// Detect signs of dissociation.
  bool _detectDissociation(List<NarrativeMessage> userMessages) {
    if (userMessages.length < 3) return false;

    final recent = userMessages.length > 5
        ? userMessages.sublist(userMessages.length - 5)
        : userMessages;

    // Heuristic: sudden shift from longer messages to very short/empty
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
}
