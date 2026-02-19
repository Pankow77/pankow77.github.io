import 'dart:math';
import '../models/lumen_state.dart';
import '../config/constants.dart';

/// The Lumen-Count engine.
///
/// Controls the heartbeat of the narrative: 10 → 0.
/// Each Lumen lost = one ship system dead = pacing acceleration.
/// The descent is the architecture. The compression mirrors trauma phenomenology.
///
/// TARGET SESSION: 90-180 minutes. NOT 20.
/// The Lumen clock is intensity-based, not message-count-based.
/// More emotional depth = faster burn. Exploration = slower burn.
class LumenEngine {
  /// Determine if a Lumen should be lost based on narrative context.
  ///
  /// Uses a multi-factor gate system:
  /// 1. Hard minimum time floor (prevents 20-minute sessions)
  /// 2. Message threshold scaled by act (breathing room in Act I)
  /// 3. Emotional intensity accelerator (catharsis burns candles)
  /// 4. Maximum time ceiling (prevents stalling)
  bool shouldLoseLumen({
    required LumenState current,
    required int messagesSinceLastLoss,
    required Duration timeSinceLastLoss,
    double emotionalIntensity = 0.0,
  }) {
    if (current.count <= AppConstants.lumenMin) return false;

    // GATE 1: Hard minimum time floor. A Lumen cannot be lost faster than this.
    // This prevents the 20-minute session problem.
    final minTime = _minimumTimePerLumen(current.count);
    if (timeSinceLastLoss < minTime) return false;

    // GATE 2: Maximum time ceiling. If too much time passes, force decay.
    // Prevents infinite stalling that breaks narrative momentum.
    final maxTime = _maximumTimePerLumen(current.count);
    if (timeSinceLastLoss >= maxTime) return true;

    // GATE 3: Message threshold check. Enough conversation has happened.
    final messagesThreshold = _messagesPerLumen(current.count);

    // Emotional intensity reduces the threshold (catharsis burns faster)
    // Intensity 0.0 = no effect, 1.0 = threshold halved
    final intensityModifier = 1.0 - (emotionalIntensity * 0.5).clamp(0.0, 0.5);
    final adjustedThreshold = (messagesThreshold * intensityModifier).ceil();

    if (messagesSinceLastLoss >= adjustedThreshold) return true;

    return false;
  }

  /// Hard minimum time floor per Lumen. Cannot lose a Lumen faster than this.
  ///
  /// Act I:   8 minutes minimum per Lumen (exploration, trust-building)
  /// Act II:  6 minutes minimum per Lumen (pressure, but not too fast)
  /// Act III: 3 minutes minimum per Lumen (compressed, but still breathable)
  ///
  /// Total minimum: 4×8 + 4×6 + 2×3 = 32+24+6 = 62 minutes
  /// (This is the absolute floor — normal play will be 90-180 min)
  Duration _minimumTimePerLumen(int lumen) {
    if (lumen >= 7) return const Duration(minutes: 8);
    if (lumen >= 3) return const Duration(minutes: 6);
    return const Duration(minutes: 3);
  }

  /// Maximum time ceiling per Lumen. Force decay if stalling too long.
  ///
  /// Act I:   25 minutes max (don't let them camp forever)
  /// Act II:  18 minutes max (momentum must continue)
  /// Act III: 10 minutes max (the ship is dying)
  Duration _maximumTimePerLumen(int lumen) {
    if (lumen >= 7) return const Duration(minutes: 25);
    if (lumen >= 3) return const Duration(minutes: 18);
    return const Duration(minutes: 10);
  }

  /// Message threshold per Lumen. Baseline without intensity modifier.
  ///
  /// Act I:   10-12 exchanges per Lumen (room to breathe, explore, trust)
  /// Act II:  6-8 exchanges per Lumen (building pressure)
  /// Act III: 3-4 exchanges per Lumen (sharp, compressed)
  int _messagesPerLumen(int lumen) {
    if (lumen >= 9) return 12;  // Very early: maximum breathing room
    if (lumen >= 7) return 10;  // Act I: exploration
    if (lumen >= 5) return 8;   // Early Act II: building pressure
    if (lumen >= 3) return 6;   // Mid Act II: urgent
    if (lumen >= 2) return 4;   // Late Act II: sharp
    return 3;                    // Act III: brutal
  }

  /// Get the system failure announcement for a Lumen transition.
  String getFailureAnnouncement(int newLumenCount) {
    final index = AppConstants.lumenMax - newLumenCount;
    if (index < 0 || index >= AppConstants.systemFailures.length) {
      return 'Unknown system failure detected.';
    }
    return AppConstants.systemFailures[index];
  }

  /// Get the narrative context string for the LLM based on current Lumen.
  String getLumenContext(LumenState state) {
    final act = state.currentAct;
    final pacing = state.narrativeSpeed;

    return '''
CURRENT STATE:
- Lumen Count: ${state.count}/${AppConstants.lumenMax}
- Act: ${act.name.toUpperCase()}
- Narrative speed: ${pacing}x
- Ship integrity: ${(state.shipIntegrity * 100).toStringAsFixed(0)}%
- Failed systems: ${state.failedSystems.join(', ')}
- Ghost can appear: ${state.ghostCanAppear}
- Reactor critical: ${state.isReactorCritical}

PACING INSTRUCTIONS:
${_pacingInstructions(state.count)}
''';
  }

  String _pacingInstructions(int lumen) {
    if (lumen >= 8) {
      return 'Full atmospheric descriptions. Build the world. Let the user explore. '
          'Responses can be longer and more detailed. Establish trust with the crew. '
          'Take your time. The session target is 90-180 minutes.';
    }
    if (lumen >= 6) {
      return 'Reduce description by 20%. Increase urgency. Systems are failing. '
          'The crew is under pressure. Introduce harder choices.';
    }
    if (lumen >= 4) {
      return 'Half-length responses. Sharp, pressing. Every word must count. '
          'The Ghost may appear. The real material should be surfacing.';
    }
    if (lumen >= 2) {
      return 'Concise, brutal, essential. No filler. The ship is dying. '
          'Existential consequences for every choice. The end approaches.';
    }
    return 'Single sentences. Silence between words. Maximum compression. '
        'The reactor is critical. Minutes remain.';
  }
}
