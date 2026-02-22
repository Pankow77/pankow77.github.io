import '../models/session.dart';

/// The Lumen-Count system — the heartbeat of TERMINUS-OMNI.
///
/// From the paper: "The Lumen-Count system operationalizes the
/// Inevitability Paradigm. The subject knows from the first moment
/// that the counter will reach zero and that death is certain."
///
/// Lumen does not decrease uniformly. It decreases based on
/// narrative psychology, not real time.
class LumenCount {
  int _current;
  final List<LumenEvent> _history = [];

  LumenCount([int initial = 10]) : _current = initial;

  int get current => _current;
  bool get isExtinguished => _current <= 0;
  List<LumenEvent> get history => List.unmodifiable(_history);

  /// Current session phase based on lumen count.
  SessionPhase get phase {
    if (_current >= 7) return SessionPhase.primiPassi;
    if (_current >= 4) return SessionPhase.assedio;
    if (_current >= 2) return SessionPhase.declino;
    if (_current == 1) return SessionPhase.ultimaLuce;
    return SessionPhase.morte;
  }

  /// Extinguish a lumen. Returns the new count.
  ///
  /// Triggers:
  /// - Direct failure (dice roll)
  /// - Narrative death of an element
  /// - Truth that closes a narrative door
  /// - Abandonment of virtue
  int extinguish(LumenExtinguishReason reason, [String? description]) {
    if (_current <= 0) return 0;
    _current--;
    _history.add(LumenEvent(
      fromLumen: _current + 1,
      toLumen: _current,
      reason: reason,
      description: description ?? reason.defaultDescription,
      timestamp: DateTime.now(),
    ));
    return _current;
  }

  /// Restore state from saved session.
  void restore(int count) {
    _current = count;
  }
}

/// Reasons a lumen can be extinguished.
enum LumenExtinguishReason {
  diceFailure,
  narrativeDeath,
  truthClosure,
  virtueAbandoned,
  sceneTransition,
  momentBurned,
}

extension LumenReasonExt on LumenExtinguishReason {
  String get defaultDescription {
    switch (this) {
      case LumenExtinguishReason.diceFailure:
        return 'Il tiro è fallito. L\'oscurità avanza.';
      case LumenExtinguishReason.narrativeDeath:
        return 'Qualcosa è morto nella narrazione.';
      case LumenExtinguishReason.truthClosure:
        return 'Una verità ha chiuso una porta per sempre.';
      case LumenExtinguishReason.virtueAbandoned:
        return 'La virtù è stata tradita. Il costo è una luce.';
      case LumenExtinguishReason.sceneTransition:
        return 'La scena è cambiata. Il mondo è più freddo.';
      case LumenExtinguishReason.momentBurned:
        return 'Il Momento è bruciato. La speranza muore.';
    }
  }
}

/// Record of a lumen extinguishing event.
class LumenEvent {
  final int fromLumen;
  final int toLumen;
  final LumenExtinguishReason reason;
  final String description;
  final DateTime timestamp;

  const LumenEvent({
    required this.fromLumen,
    required this.toLumen,
    required this.reason,
    required this.description,
    required this.timestamp,
  });
}
