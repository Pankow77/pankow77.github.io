/// TERMINUS-OMNI configuration constants.
/// Derived from the engineering prompt and paper specifications.
class TerminusConstants {
  TerminusConstants._();

  // ── Lumen system ──
  static const int maxLumen = 10;
  static const int minLumen = 0;

  // ── Session phases (from engineering prompt Part VI) ──
  static const int phase1Start = 10; // I Primi Passi
  static const int phase1End = 7;
  static const int phase2Start = 6; // L'Assedio
  static const int phase2End = 4;
  static const int phase3Start = 3; // Il Declino
  static const int phase3End = 2;
  static const int phase4Lumen = 1; // L'Ultima Luce

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
      'name': 'RIFUGIO COMPROMESSO',
      'setting': 'Un luogo "sicuro" che sta crollando.',
      'premise': 'Cosa sacrifichiamo per la sicurezza falsa?',
    },
    'ricerca': {
      'name': 'L\'ULTIMO TRENO',
      'setting': 'Un viaggio verso una destinazione.',
      'premise': 'Ogni passo ti avvicina alla salvezza e alla morte.',
    },
    'comunita': {
      'name': 'COMUNITÀ DIVISA',
      'setting': 'Sopravvissuti con obiettivi conflittuali.',
      'premise': 'Chi tradisci per sopravvivere?',
    },
    'memoria': {
      'name': 'MEMORIA PERDUTA',
      'setting': 'Non ricordi il passato. La realtà è affidabile?',
      'premise': 'Chi sei se non ricordi?',
    },
    'sacrificio': {
      'name': 'IL SACRIFICIO',
      'setting': 'Una strada per salvare il mondo, ma solo uno può farlo.',
      'premise': 'Vale la pena?',
    },
    'tunnel': {
      'name': 'IL TUNNEL',
      'setting': 'Un treno fermo in un tunnel infinito. Nessuna finestra. '
          'Nessuna luce avanti. Il treno è partito il giorno del trauma. '
          'È rimasto nel buio da allora.',
      'premise': 'Le candele sono l\'unica prova che sei ancora vivo. '
          'Il tunnel finisce. Scendi. La persona che hai perso non c\'è. Accetti.',
    },
  };

  // ── Storage keys ──
  static const String boxSessions = 'terminus_sessions';
  static const String boxSettings = 'terminus_settings';
  static const String keyApiKey = 'gemini_api_key';
}
