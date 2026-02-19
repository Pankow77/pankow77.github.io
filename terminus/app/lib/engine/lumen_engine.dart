import '../models/lumen_state.dart';
import '../config/constants.dart';

/// The Lumen-Count engine.
///
/// Controls the heartbeat of the narrative: 10 → 0.
/// Each Lumen lost = one ship system dead = pacing acceleration.
/// The descent is the architecture. The compression mirrors trauma phenomenology.
class LumenEngine {
  /// Determine if a Lumen should be lost based on narrative context.
  ///
  /// A Lumen is lost when:
  /// - A scene reaches its natural conclusion
  /// - A narrative conflict is failed
  /// - The user makes a choice that closes a narrative door
  /// - Real-time pacing requires acceleration (~10-15 min per Lumen in Act I)
  /// - The user abandons their Virtue (emotional cost)
  bool shouldLoseLumen({
    required LumenState current,
    required int messagesSinceLastLoss,
    required Duration timeSinceLastLoss,
  }) {
    if (current.count <= AppConstants.lumenMin) return false;

    // Pacing guide: messages between Lumen losses decrease as count drops
    final messagesThreshold = _messagesPerLumen(current.count);
    if (messagesSinceLastLoss >= messagesThreshold) return true;

    // Time-based pacing: don't let a Lumen last too long
    final timeThreshold = _timePerLumen(current.count);
    if (timeSinceLastLoss >= timeThreshold) return true;

    return false;
  }

  /// Approximate messages per Lumen based on current count.
  /// Higher Lumen = more breathing room. Lower = compressed.
  int _messagesPerLumen(int lumen) {
    if (lumen >= 8) return 12;  // Act I: atmospheric, slow
    if (lumen >= 6) return 8;   // Early Act II: building pressure
    if (lumen >= 4) return 6;   // Mid Act II: urgent
    if (lumen >= 2) return 4;   // Late Act II: sharp
    return 2;                    // Act III: brutal
  }

  /// Approximate time per Lumen.
  Duration _timePerLumen(int lumen) {
    if (lumen >= 8) return const Duration(minutes: 12);
    if (lumen >= 6) return const Duration(minutes: 10);
    if (lumen >= 4) return const Duration(minutes: 7);
    if (lumen >= 2) return const Duration(minutes: 4);
    return const Duration(minutes: 2);
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
          'Responses can be longer and more detailed. Establish trust with the crew.';
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
