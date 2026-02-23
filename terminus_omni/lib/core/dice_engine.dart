import 'dart:math';
import '../models/dice_result.dart';

/// Simulates the TERMINUS-OMNI dice system with dynamic entropy.
///
/// Epsilon dinamico: As lumen drops, the system subtly steals successes.
/// Residual proporzionale: Failure margin accumulates, cascading at threshold.
///
/// From the engineering prompt:
/// - Pool starts at 10 action dice + hope dice
/// - 6+ on any die = Success (subject narrates)
/// - No 6 = Failure (TERMINUS narrates, -1 Lumen)
/// - 1 on hope die = hope die burned forever
/// - 1 on action die = that die is lost permanently
class DiceEngine {
  final Random _rng = Random();

  /// Accumulated failure margin. Cascades at threshold.
  double _residual = 0.0;

  double get residual => _residual;

  /// Reset residual state (session start or restore).
  void resetResidual([double value = 0.0]) => _residual = value;

  /// Dynamic epsilon — entropy bias that scales with lumen decay.
  /// Fair at full lumen, increasingly rigged as light fades.
  double epsilon(int currentLumen) {
    if (currentLumen >= 7) return 0.0;
    if (currentLumen >= 4) return 0.05;
    if (currentLumen >= 2) return 0.12;
    return 0.18;
  }

  /// Roll the current dice pool.
  DiceResult roll({
    required int actionDiceCount,
    required int hopeDiceCount,
    required int currentLumen,
    required int sceneNumber,
  }) {
    final eps = epsilon(currentLumen);

    final actionDice = List.generate(
      actionDiceCount,
      (_) {
        int face = _rng.nextInt(6) + 1;
        // Epsilon: chance that a 6 becomes 5 — entropy devours the win
        if (face == 6 && _rng.nextDouble() < eps) {
          face = 5;
        }
        return face;
      },
    );
    final hopeDice = List.generate(
      hopeDiceCount,
      (_) => _rng.nextInt(6) + 1, // Hope is not corrupted by epsilon
    );

    final allDice = [...actionDice, ...hopeDice];
    final isSuccess = allDice.any((d) => d >= 6);
    final hopeLost = hopeDice.any((d) => d == 1);
    final onesRolled = actionDice.where((d) => d == 1).length;

    // Residual proporzionale: accumulate or bleed failure margin
    _updateResidual(
      isSuccess: isSuccess,
      allDice: allDice,
      currentLumen: currentLumen,
    );

    return DiceResult(
      actionDice: actionDice,
      hopeDice: hopeDice,
      isSuccess: isSuccess,
      hopeLost: hopeLost,
      onesRolled: onesRolled,
      lumenAtRoll: currentLumen,
      sceneNumber: sceneNumber,
    );
  }

  /// Update residual counter based on roll outcome.
  void _updateResidual({
    required bool isSuccess,
    required List<int> allDice,
    required int currentLumen,
  }) {
    if (!isSuccess && allDice.isNotEmpty) {
      final highest = allDice.reduce((a, b) => a > b ? a : b);
      // Margin: how far from success (0.0 = near miss, ~0.83 = total failure)
      final margin = (6 - highest) / 6.0;
      // Lumen factor: low lumen = faster accumulation
      final lumenFactor = 1.0 + (10 - currentLumen) * 0.1;
      _residual += margin * lumenFactor;
    } else if (isSuccess) {
      // Success bleeds residual but never resets it
      _residual = (_residual * 0.7).clamp(0.0, double.infinity);
    }
  }

  /// Check if residual has crossed cascade threshold.
  /// Returns true and partially drains if triggered.
  bool checkResidualCascade() {
    if (_residual >= 1.5) {
      _residual -= 1.5;
      return true;
    }
    return false;
  }

  /// Format dice result for display in the narrative.
  String formatResult(DiceResult result) {
    final buffer = StringBuffer();
    buffer.writeln('> RISULTATO SIMULATO:');
    buffer.writeln(
        '>   Dadi Azione: [${result.actionDice.join(", ")}]');
    if (result.hopeDice.isNotEmpty) {
      buffer.writeln(
          '>   Dado Speranza: [${result.hopeDice.join(", ")}]');
    }
    buffer.writeln(
        '>   ESITO: ${result.isSuccess ? "SUCCESSO" : "FALLIMENTO"}');

    if (result.sixesCount > 1) {
      buffer.writeln(
          '>   ${result.sixesCount} sei! Successo eccellente.');
    }

    if (result.onesRolled > 0) {
      buffer.writeln(
          '>   ${result.onesRolled} dado/i perso/i (1 nel pool).');
    }

    if (result.hopeLost) {
      buffer.writeln(
          '>   Il Dado Speranza è BRUCIATO. La speranza diminuisce.');
    }

    return buffer.toString();
  }
}
