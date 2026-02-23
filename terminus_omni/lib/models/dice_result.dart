/// Result of a TERMINUS-OMNI dice roll.
///
/// From the engineering prompt Narrative Control Transfer system:
/// - 6+ on any die = Success, subject narrates
/// - No 6 = Failure, TERMINUS narrates, -1 Lumen
/// - 1 on hope die = Hope die burned forever
class DiceResult {
  /// Individual die results.
  final List<int> actionDice;
  final List<int> hopeDice;

  /// Whether any die rolled 6+.
  final bool isSuccess;

  /// Whether any hope die rolled 1 (lost forever).
  final bool hopeLost;

  /// Number of 1s in the action pool (dice lost).
  final int onesRolled;

  /// Scene/lumen context.
  final int lumenAtRoll;
  final int sceneNumber;

  const DiceResult({
    required this.actionDice,
    required this.hopeDice,
    required this.isSuccess,
    required this.hopeLost,
    required this.onesRolled,
    required this.lumenAtRoll,
    required this.sceneNumber,
  });

  /// All dice combined.
  List<int> get allDice => [...actionDice, ...hopeDice];

  /// Highest value rolled.
  int get highestRoll =>
      allDice.isEmpty ? 0 : allDice.reduce((a, b) => a > b ? a : b);

  /// Number of 6s rolled (for exceptional success).
  int get sixesCount => allDice.where((d) => d >= 6).length;

  Map<String, dynamic> toJson() => {
        'actionDice': actionDice,
        'hopeDice': hopeDice,
        'isSuccess': isSuccess,
        'hopeLost': hopeLost,
        'onesRolled': onesRolled,
        'lumenAtRoll': lumenAtRoll,
        'sceneNumber': sceneNumber,
      };

  factory DiceResult.fromJson(Map<String, dynamic> json) => DiceResult(
        actionDice: (json['actionDice'] as List).cast<int>(),
        hopeDice: (json['hopeDice'] as List).cast<int>(),
        isSuccess: json['isSuccess'] as bool,
        hopeLost: json['hopeLost'] as bool,
        onesRolled: json['onesRolled'] as int,
        lumenAtRoll: json['lumenAtRoll'] as int,
        sceneNumber: json['sceneNumber'] as int,
      );
}
