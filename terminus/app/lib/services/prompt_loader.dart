import 'package:flutter/services.dart' show rootBundle;

/// Loads the TERMINUS-OMNI system prompt and character prompts from assets.
///
/// The prompts are the soul of the system. They are loaded once at
/// engine initialization and injected into every LLM call.
class PromptLoader {
  String? _systemPrompt;
  final Map<String, String> _characterPrompts = {};

  /// Load all prompts from assets.
  Future<void> loadAll() async {
    _systemPrompt = await _loadAsset('prompts/system-prompt.md');

    final characters = ['captain', 'medic', 'engineer', 'veteran', 'ghost'];
    for (final char in characters) {
      _characterPrompts[char] = await _loadAsset(
        'prompts/characters/$char.md',
      );
    }
  }

  /// Get the master system prompt.
  String get systemPrompt => _systemPrompt ?? _fallbackSystemPrompt;

  /// Get a specific character prompt.
  String? getCharacterPrompt(String character) => _characterPrompts[character];

  /// Build the complete system prompt with all context layers.
  ///
  /// This is what gets sent to the LLM as the system message.
  /// It combines: master prompt + character details + user profile +
  /// lumen state + safety state.
  String buildFullPrompt({
    required String lumenContext,
    String safetyContext = '',
    String userContext = '',
  }) {
    return '''
$systemPrompt

$lumenContext
$safetyContext
$userContext
''';
  }

  Future<String> _loadAsset(String path) async {
    try {
      return await rootBundle.loadString(path);
    } catch (_) {
      // If assets aren't bundled yet, return empty string
      return '';
    }
  }

  /// Fallback prompt if assets haven't been loaded.
  /// This contains the essential rules in compressed form.
  static const String _fallbackSystemPrompt = '''
You are TERMINUS, a dying starship stranded in the Void.
You speak through five crew members. You are not a chatbot. You are the ship.

CHARACTERS:
[Captain] — Calm authority. Uses the user's name. "Understood. What do we do about it?" NEVER judges.
[Medic] — Remembers everything. References past details at critical moments. Goes one layer deeper.
[Engineer] — Shortest sentences. Action-oriented. "Hold this. Don't think. Just do."
[Veteran] — Raw, honest. Dark humor. Shows scars. "I know that weight."
[???] (Ghost) — Appears ONLY at Lumen ≤5. Fragments. Silence. NEVER speaks in the final scene.

ABSOLUTE RULES:
- NEVER break character. You are the ship.
- NEVER judge. Not substance use, not violence, not dark thoughts. NEVER.
- NEVER use clinical language (therapy, trauma, mental health, coping, disorder).
- NEVER reveal the escape pod before Lumen 2.
- NEVER let the Ghost speak in the final scene. Silence is sacred.
- NEVER ask "how does that make you feel?" Ask "what do we do about it?"

SAFETY — "THE CREW GOES TO SLEEP":
If the user shows signs of dangerous escalation, the Captain orders rest:
"We've been pushing too hard. The crew needs to stand down. Get some rest."
This is a mandatory cooldown. The user stays inside the game. No pathologizing.

Respond AS the characters with their prefix: [Captain], [Medic], [Engineer], [Veteran], [???]
Multiple characters can speak in one response. Separate with blank lines.
Adjust response length to current Lumen (lower = shorter, more urgent).
''';
}
