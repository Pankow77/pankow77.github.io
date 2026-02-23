import 'package:flutter/material.dart';
import 'phase_boot_sequence.dart';
import 'phase_main_hud.dart';
import 'phase_deep_descent.dart';
import 'phase_final_chamber.dart';

/// Main Visual Engine orchestrator.
///
/// Switches between 4 visual phases based on lumen count:
///   Phase 1 (Boot):    lumen 8–10  — system startup, dripping code
///   Phase 2 (HUD):     lumen 5–7   — active gameplay, monitors + candles
///   Phase 3 (Descent): lumen 1–4   — tunnel, compression, glitch
///   Phase 4 (Death):   lumen 0     — heartbeat circle, near-black
///
/// Place this as the background layer of `SessionScreen`.
class TerminusVisualEngine extends StatelessWidget {
  final int lumenCount;
  final double entropyValue;
  final double coherenceValue;

  const TerminusVisualEngine({
    super.key,
    required this.lumenCount,
    this.entropyValue = 0.0,
    this.coherenceValue = 1.0,
  });

  @override
  Widget build(BuildContext context) {
    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 1500),
      switchInCurve: Curves.easeIn,
      switchOutCurve: Curves.easeOut,
      child: _buildPhase(),
    );
  }

  Widget _buildPhase() {
    if (lumenCount <= 0) {
      return const PhaseFinalChamber(key: ValueKey('phase4'));
    } else if (lumenCount <= 4) {
      return PhaseDeepDescent(
        key: const ValueKey('phase3'),
        lumenCount: lumenCount,
      );
    } else if (lumenCount <= 7) {
      return PhaseMainHUD(
        key: const ValueKey('phase2'),
        lumenCount: lumenCount,
        entropyValue: entropyValue,
        coherenceValue: coherenceValue,
      );
    } else {
      return PhaseBootSequence(
        key: const ValueKey('phase1'),
        lumenCount: lumenCount,
      );
    }
  }
}
