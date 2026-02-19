import '../config/constants.dart';

/// The three acts of the TERMINUS narrative.
enum Act {
  /// Lumen 10-7: Awakening. Trust-building, orientation, crew intake.
  awakening,

  /// Lumen 6-3: The Crossing. Pressure mounts, Ghost appears, real material surfaces.
  crossing,

  /// Lumen 2-0: The Choice. Reactor critical, escape pod revealed, crew insists.
  choice,
}

/// The state of the Lumen-Count system.
///
/// Each Lumen lost = one ship system dead = one step closer to the end.
/// The Lumen-Count is the heartbeat of the narrative pacing engine.
class LumenState {
  final int count;
  final List<String> failedSystems;

  const LumenState({
    this.count = AppConstants.lumenMax,
    this.failedSystems = const [],
  });

  /// Which act are we in?
  Act get currentAct {
    if (count >= AppConstants.actIEnd) return Act.awakening;
    if (count >= AppConstants.actIIEnd) return Act.crossing;
    return Act.choice;
  }

  /// Can the Ghost appear? Only at Lumen 5 or below.
  bool get ghostCanAppear => count <= AppConstants.ghostAppearThreshold;

  /// Is the reactor critical? Lumen 2 or below.
  bool get isReactorCritical => count <= AppConstants.reactorCriticalThreshold;

  /// Is the ship lost? Lumen 0.
  bool get isShipLost => count <= AppConstants.lumenMin;

  /// Narrative speed multiplier. Compression mirrors trauma phenomenology.
  double get narrativeSpeed {
    if (count >= 8) return 1.0;
    if (count >= 6) return 1.5;
    if (count >= 4) return 2.0;
    if (count >= 2) return 3.0;
    return 4.0; // Maximum compression at Lumen 1
  }

  /// Description of the most recent system failure.
  String get currentSystemStatus {
    final index = AppConstants.lumenMax - count;
    if (index < 0 || index >= AppConstants.systemFailures.length) {
      return AppConstants.systemFailures.first;
    }
    return AppConstants.systemFailures[index];
  }

  /// What percentage of the ship is still alive?
  double get shipIntegrity => count / AppConstants.lumenMax;

  /// Lose one Lumen. A system dies. The ship gets closer to the end.
  LumenState loseLumen() {
    if (count <= AppConstants.lumenMin) return this;

    final newCount = count - 1;
    final failureIndex = AppConstants.lumenMax - newCount;
    final newFailure = (failureIndex < AppConstants.systemFailures.length)
        ? AppConstants.systemFailures[failureIndex]
        : 'Unknown system failure';

    return LumenState(
      count: newCount,
      failedSystems: [...failedSystems, newFailure],
    );
  }

  /// Factory: fresh start. All systems nominal.
  static const LumenState initial = LumenState();

  /// Serialize to JSON for session persistence.
  Map<String, dynamic> toJson() => {
    'count': count,
    'failedSystems': failedSystems,
  };

  /// Deserialize from JSON.
  factory LumenState.fromJson(Map<String, dynamic> json) => LumenState(
    count: json['count'] as int,
    failedSystems: (json['failedSystems'] as List<dynamic>)
        .map((e) => e as String)
        .toList(),
  );
}
