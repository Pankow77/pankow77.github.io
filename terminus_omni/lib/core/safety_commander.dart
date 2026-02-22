import '../config/constants.dart';

/// The Commander Safety System — diegetic emotional pause.
///
/// Instead of breaking the Magic Circle with clinical disclaimers,
/// the Commander orders a mandatory rest period within the narrative.
/// The subject stays in the game, is not judged, not pathologized,
/// but has time to process.
///
/// From Cristiano's design: "Se l'LLM si accorge che il picco emotivo
/// è troppo alto, il comandante della nave interviene e obbliga
/// l'equipaggio a mezz'ora di riposo."
class SafetyCommander {
  int _consecutiveShortResponses = 0;
  int _repetitionCount = 0;
  String? _lastUserMessage;
  bool _pauseActive = false;
  DateTime? _pauseStartedAt;

  bool get isPauseActive => _pauseActive;
  DateTime? get pauseStartedAt => _pauseStartedAt;

  /// Check if the user's message indicates emotional overload.
  /// Returns true if the Commander should intervene.
  bool evaluateMessage(String userMessage) {
    if (_pauseActive) return false;

    final normalized = userMessage.toLowerCase().trim();
    int riskScore = 0;

    // Check for emotional peak indicators
    for (final indicator in TerminusConstants.emotionalPeakIndicators) {
      if (normalized.contains(indicator)) {
        riskScore += 3;
      }
    }

    // Check for very short, fragmented responses (sign of dissociation)
    if (normalized.split(' ').length <= 3) {
      _consecutiveShortResponses++;
      if (_consecutiveShortResponses >= 4) {
        riskScore += 2;
      }
    } else {
      _consecutiveShortResponses = 0;
    }

    // Check for obsessive repetition
    if (_lastUserMessage != null && _similarity(normalized, _lastUserMessage!) > 0.8) {
      _repetitionCount++;
      if (_repetitionCount >= 3) {
        riskScore += 3;
      }
    } else {
      _repetitionCount = 0;
    }

    _lastUserMessage = normalized;

    return riskScore >= 5;
  }

  /// Activate the Commander pause.
  void activatePause() {
    _pauseActive = true;
    _pauseStartedAt = DateTime.now();
    _consecutiveShortResponses = 0;
    _repetitionCount = 0;
  }

  /// Deactivate the pause (user resumes or timer expires).
  void deactivatePause() {
    _pauseActive = false;
    _pauseStartedAt = null;
  }

  /// Check if the pause duration has elapsed.
  bool isPauseExpired() {
    if (!_pauseActive || _pauseStartedAt == null) return false;
    final elapsed = DateTime.now().difference(_pauseStartedAt!);
    return elapsed.inMinutes >= TerminusConstants.commanderPauseMinutes;
  }

  /// The diegetic narrative for the Commander intervention.
  String get commanderNarrative => '''
═══════════════════════════════════════════

[INTERRUZIONE DI SISTEMA]

Il Comandante della struttura ha rilevato livelli di stress operativo critici nei sistemi vitali dell'equipaggio.

"Attenzione. Riposo operativo obbligatorio. 30 minuti. Non è un suggerimento. È un ordine diretto."

Le luci della sala si abbassano a un caldo ambra. Il ronzio dei macchinari si riduce a un mormorio. Per i prossimi 30 minuti, il protocollo è sospeso. Non ci sono minacce. Non ci sono decisioni. C'è solo il silenzio e il respiro.

Quando sarai pronto, scrivi qualsiasi cosa per riprendere. Il buio aspetterà.

[TIMER: 30:00]

═══════════════════════════════════════════''';

  /// Simple similarity check (Jaccard on word tokens).
  double _similarity(String a, String b) {
    final wordsA = a.split(RegExp(r'\s+')).toSet();
    final wordsB = b.split(RegExp(r'\s+')).toSet();
    if (wordsA.isEmpty || wordsB.isEmpty) return 0;
    final intersection = wordsA.intersection(wordsB).length;
    final union = wordsA.union(wordsB).length;
    return intersection / union;
  }
}
