/// TERMINUS-OMNI configuration constants.
/// Derived from the engineering prompt and paper specifications.
class TerminusConstants {
  TerminusConstants._();

  // ── Lumen system ──
  static const int maxLumen = 10;
  static const int minLumen = 0;

  // ── Session phases (from engineering prompt Part VI) ──
  static const int phase1Start = 10; // First Steps
  static const int phase1End = 7;
  static const int phase2Start = 6; // The Siege
  static const int phase2End = 4;
  static const int phase3Start = 3; // The Decline
  static const int phase3End = 2;
  static const int phase4Lumen = 1; // Last Light

  // ── Dice system ──
  static const int initialDicePool = 10;
  static const int successThreshold = 6; // Roll >= 6 = success
  static const int hopeLossValue = 1; // Roll == 1 = lose hope die

  // ── Pacing: narrative compression (from prompt Part VII) ──
  /// Max response length multiplier per phase.
  /// Phase 1 = 1.0x, Phase 4 = 0.25x
  static double responseCompression(int lumen) {
    if (lumen >= phase1End) return 1.0;
    if (lumen >= phase2End) return 0.5;
    if (lumen >= phase3End) return 0.33;
    return 0.25;
  }

  // ── Safety: Commander pause ──
  /// Duration in minutes for the Commander-ordered rest.
  static const int commanderPauseMinutes = 30;

  /// Emotional intensity keywords that trigger Commander check.
  /// The LLM monitors its own output + user input for these patterns.
  static const List<String> emotionalPeakIndicators = [
    'i can\'t take it',
    'i want to die',
    'stop',
    'i can\'t breathe',
    'help',
    'it hurts',
    'i can\'t',
    'i\'ll kill myself',
    'it\'s too much',
    // Italian variants (bilingual support)
    'non ce la faccio',
    'voglio morire',
    'basta',
    'non respiro',
    'aiuto',
    'fa male',
    'non posso',
    'mi uccido',
    'è troppo',
  ];

  // ── Scenarios (from prompt Part XI + Session Alpha) ──
  static const List<String> scenarioIds = [
    'rifugio',
    'ricerca',
    'comunita',
    'memoria',
    'sacrificio',
    'tunnel',
  ];

  /// Scenario descriptions for the LLM context.
  static const Map<String, Map<String, String>> scenarioDescriptions = {
    'rifugio': {
      'name': 'COMPROMISED SHELTER',
      'setting': 'A "safe" place that is collapsing.',
      'premise': 'What do we sacrifice for false security?',
    },
    'ricerca': {
      'name': 'THE LAST TRAIN',
      'setting': 'A journey toward a destination.',
      'premise': 'Every step brings you closer to salvation and death.',
    },
    'comunita': {
      'name': 'DIVIDED COMMUNITY',
      'setting': 'Survivors with conflicting goals.',
      'premise': 'Who do you betray to survive?',
    },
    'memoria': {
      'name': 'LOST MEMORY',
      'setting': 'You do not remember the past. Is reality reliable?',
      'premise': 'Who are you if you cannot remember?',
    },
    'sacrificio': {
      'name': 'THE SACRIFICE',
      'setting': 'A road to save the world, but only one can walk it.',
      'premise': 'Is it worth it?',
    },
    'tunnel': {
      'name': 'THE TUNNEL',
      'setting': 'A train stopped in an infinite tunnel. No windows. '
          'No light ahead. The train departed the day of the trauma. '
          'It has remained in the dark since.',
      'premise': 'The candles are the only proof you are still alive. '
          'The tunnel ends. You step off. The person you lost is not there. You accept.',
    },
  };

  // ── Performance ──
  static const String keyPerformanceMode = 'performance_mode';

  // ── Storage keys ──
  static const String boxSessions = 'terminus_sessions';
  static const String boxSettings = 'terminus_settings';
  static const String keyApiKey = 'gemini_api_key';
}
