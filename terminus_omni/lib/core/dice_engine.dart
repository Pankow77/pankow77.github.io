import 'dart:math';
import '../models/dice_result.dart';

/// Simulates the TERMINUS-OMNI dice system.
///
/// From the engineering prompt:
/// - Pool starts at 10 action dice + hope dice
/// - 6+ on any die = Success (subject narrates)
/// - No 6 = Failure (TERMINUS narrates, -1 Lumen)
/// - 1 on hope die = hope die burned forever
/// - 1 on action die = that die is lost permanently
class DiceEngine {
  final Random _rng = Random();

  /// Roll the current dice pool.
  DiceResult roll({
    required int actionDiceCount,
    required int hopeDiceCount,
    required int currentLumen,
    required int sceneNumber,
  }) {
    final actionDice = List.generate(
      actionDiceCount,
      (_) => _rng.nextInt(6) + 1,
    );
    final hopeDice = List.generate(
      hopeDiceCount,
      (_) => _rng.nextInt(6) + 1,
    );

    final allDice = [...actionDice, ...hopeDice];
    final isSuccess = allDice.any((d) => d >= 6);
    final hopeLost = hopeDice.any((d) => d == 1);
    final onesRolled = actionDice.where((d) => d == 1).length;

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
