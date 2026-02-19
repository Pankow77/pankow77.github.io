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
  /// 1. Time floor with intensity override (prevents 20-min sessions,
  ///    but doesn't cage fast users in catharsis)
  /// 2. Message threshold scaled by act and intensity
  /// 3. Time ceiling as gentle pressure, then hard cutoff after grace period
  bool shouldLoseLumen({
    required LumenState current,
    required int messagesSinceLastLoss,
    required Duration timeSinceLastLoss,
    double emotionalIntensity = 0.0,
  }) {
    if (current.count <= AppConstants.lumenMin) return false;

    // GATE 1: Time floor with intensity override.
    //
    // The floor prevents 20-minute sessions. BUT if the user has reached
    // deep catharsis (intensity > 0.75) AND has exchanged enough messages (≥8),
    // the floor drops by 40%. The system follows the user, not the clock.
    final baseMinTime = _minimumTimePerLumen(current.count);
    final intensityOverride = emotionalIntensity > 0.75 && messagesSinceLastLoss >= 8;
    final effectiveMinTime = intensityOverride
        ? baseMinTime * 0.6  // 40% reduction: 8 min → ~5 min
        : baseMinTime;

    if (timeSinceLastLoss < effectiveMinTime) return false;

    // GATE 2: Time ceiling — two stages.
    //
    // Stage 1 (ceiling): Returns "pressure" signal (checked separately
    //   via getNarrativePressure). Does NOT force decay.
    // Stage 2 (ceiling + grace): Hard cutoff. Now it's justified.
    final hardCutoff = _maximumTimePerLumen(current.count) + _gracePeriod;
    if (timeSinceLastLoss >= hardCutoff) return true;

    // GATE 3: Message threshold check. Enough conversation has happened.
    final messagesThreshold = _messagesPerLumen(current.count);

    // Emotional intensity reduces the threshold (catharsis burns faster)
    // Intensity 0.0 = no effect, 1.0 = threshold halved
    final intensityModifier = 1.0 - (emotionalIntensity * 0.5).clamp(0.0, 0.5);
    final adjustedThreshold = (messagesThreshold * intensityModifier).ceil();

    if (messagesSinceLastLoss >= adjustedThreshold) return true;

    return false;
  }

  /// Grace period after the soft ceiling before hard cutoff.
  static const Duration _gracePeriod = Duration(minutes: 10);

  /// Get the narrative pressure level for the current Lumen state.
  ///
  /// Returns 0.0 (no pressure) to 1.0 (maximum pressure).
  /// The narrative engine injects this into the system prompt so the crew
  /// applies gentle nudges ("Engineer: I can't hold this much longer")
  /// instead of sudden forced decay.
  double getNarrativePressure({
    required LumenState current,
    required Duration timeSinceLastLoss,
  }) {
    if (current.count <= AppConstants.lumenMin) return 0.0;

    final ceiling = _maximumTimePerLumen(current.count);
    final ceilingMs = ceiling.inMilliseconds;
    final graceMs = _gracePeriod.inMilliseconds;
    final elapsed = timeSinceLastLoss.inMilliseconds;

    // Before ceiling: no extra pressure
    if (elapsed < ceilingMs) return 0.0;

    // Between ceiling and ceiling+grace: linear ramp 0.0 → 1.0
    final overCeiling = elapsed - ceilingMs;
    return (overCeiling / graceMs).clamp(0.0, 1.0);
  }

  /// Hard minimum time floor per Lumen.
  ///
  /// Act I:   8 minutes minimum per Lumen (exploration, trust-building)
  /// Act II:  6 minutes minimum per Lumen (pressure, but not too fast)
  /// Act III: 3 minutes minimum per Lumen (compressed, but still breathable)
  ///
  /// With intensity override (>0.75): floor × 0.6
  /// Total minimum: worst case ~37 min (all overrides), normal ~62 min, target 90-180 min
  Duration _minimumTimePerLumen(int lumen) {
    if (lumen >= 7) return const Duration(minutes: 8);
    if (lumen >= 3) return const Duration(minutes: 6);
    return const Duration(minutes: 3);
  }

  /// Soft ceiling per Lumen. After this, narrative pressure increases.
  /// After ceiling + 10 minutes grace, hard cutoff forces decay.
  ///
  /// Act I:   25 minutes (soft) + 10 grace = 35 minutes hard
  /// Act II:  18 minutes (soft) + 10 grace = 28 minutes hard
  /// Act III: 10 minutes (soft) + 10 grace = 20 minutes hard
  Duration _maximumTimePerLumen(int lumen) {
    if (lumen >= 7) return const Duration(minutes: 25);
    if (lumen >= 3) return const Duration(minutes: 18);
    return const Duration(minutes: 10);
  }

  /// Message threshold per Lumen. Baseline without intensity modifier.
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
  String getLumenContext(LumenState state, {double narrativePressure = 0.0}) {
    final act = state.currentAct;
    final pacing = state.narrativeSpeed;

    var context = '''
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

    // Inject narrative pressure nudge
    if (narrativePressure > 0.0) {
      context += '''

NARRATIVE PRESSURE: ${(narrativePressure * 100).toStringAsFixed(0)}%
The current scene has been active for a long time. Increase urgency NATURALLY:
- The Engineer should report deteriorating systems
- Sounds should become more insistent
- The environment should convey "time is running out"
DO NOT force a scene change. Let the pressure build diegetically.
${narrativePressure > 0.7 ? 'WARNING: Scene must conclude soon. Apply strong narrative closure.' : ''}
''';
    }

    return context;
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
