import '../config/constants.dart';
import '../models/victim_profile.dart';

/// The Commander Safety System — diegetic emotional pause.
///
/// Instead of breaking the Magic Circle with clinical disclaimers,
/// the Commander orders a mandatory rest period within the narrative.
/// The subject stays in the game, is not judged, not pathologized,
/// but has time to process.
///
/// Intensity calibration (from Ogden et al., 2006):
/// - LOW: Commander triggers at riskScore >= 3, Ghost never fires twice
/// - MEDIUM: Commander triggers at riskScore >= 5 (default)
/// - HIGH: Commander triggers at riskScore >= 7, full Ghost + Witness
class SafetyCommander {
  int _consecutiveShortResponses = 0;
  int _repetitionCount = 0;
  String? _lastUserMessage;
  bool _pauseActive = false;
  DateTime? _pauseStartedAt;
  int _pauseCount = 0;

  /// Current intensity calibration.
  EmotionalIntensity _intensity = EmotionalIntensity.medium;

  bool get isPauseActive => _pauseActive;
  DateTime? get pauseStartedAt => _pauseStartedAt;
  int get pauseCount => _pauseCount;

  /// Configure intensity from victim profile.
  void setIntensity(EmotionalIntensity intensity) {
    _intensity = intensity;
  }

  /// Risk score threshold based on intensity calibration.
  int get _threshold {
    switch (_intensity) {
      case EmotionalIntensity.low:
        return 3; // Triggers much earlier — wider safety margin
      case EmotionalIntensity.medium:
        return 5; // Default
      case EmotionalIntensity.high:
        return 7; // More tolerance for experienced users
    }
  }

  /// Whether Ghost Voice should be suppressed at this intensity.
  /// At LOW, ghost fires only once per session.
  bool _ghostFiredThisSession = false;

  bool shouldSuppressGhost() {
    if (_intensity == EmotionalIntensity.low && _ghostFiredThisSession) {
      return true;
    }
    return false;
  }

  void markGhostFired() {
    _ghostFiredThisSession = true;
  }

  /// Whether Silent Witness should appear only once at LOW intensity.
  bool _witnessFiredThisSession = false;

  bool shouldSuppressWitness() {
    if (_intensity == EmotionalIntensity.low && _witnessFiredThisSession) {
      return true;
    }
    return false;
  }

  void markWitnessFired() {
    _witnessFiredThisSession = true;
  }

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
    if (_lastUserMessage != null &&
        _similarity(normalized, _lastUserMessage!) > 0.8) {
      _repetitionCount++;
      if (_repetitionCount >= 3) {
        riskScore += 3;
      }
    } else {
      _repetitionCount = 0;
    }

    _lastUserMessage = normalized;

    return riskScore >= _threshold;
  }

  /// Activate the Commander pause.
  void activatePause() {
    _pauseActive = true;
    _pauseStartedAt = DateTime.now();
    _pauseCount++;
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
  String get commanderNarrative {
    // Different tone based on how many times the pause has been triggered
    if (_pauseCount <= 1) {
      return _firstPauseNarrative;
    }
    return _repeatPauseNarrative;
  }

  String get _firstPauseNarrative => '''
═══════════════════════════════════════════

[SYSTEM INTERRUPT]

The facility Commander has detected critical operational stress levels in crew vital systems.

"Attention. Mandatory operational rest. 30 minutes. This is not a suggestion. This is a direct order."

The room lights dim to a warm amber. The hum of the machinery fades to a murmur. For the next 30 minutes, protocol is suspended. There are no threats. There are no decisions. There is only silence and breathing.

When you are ready, write anything to resume. The darkness will wait.

[TIMER: 30:00]

═══════════════════════════════════════════''';

  String get _repeatPauseNarrative => '''
═══════════════════════════════════════════

[SYSTEM INTERRUPT — MAXIMUM PRIORITY]

The Commander enters the room. Looks at you.

"I know you want to keep going. I know. But my job is not to let you keep going. My job is to bring you home. Thirty minutes. Sit down. Breathe. That's an order."

They sit across from you. Say nothing else. Do not leave.

When you are ready, write anything to resume.

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
