import 'package:flutter/material.dart';

import '../../config/theme.dart';
import '../../widgets/scanline_overlay.dart';
import '../../widgets/narrative_text.dart';

/// The Final Recording screen — plays Ship's Log + sealed testament at Lumen 0.
///
/// Sequence:
/// 1. Pure darkness (3 seconds)
/// 2. Ship's Log — the subject's entire journey read back to them
/// 3. Pause (3 seconds)
/// 4. Testament — the sealed message from the beginning
/// 5. TERMINUS-OMNI // SISTEMA OFFLINE
///
/// From the paper: "The testament functions as a 'now moment':
/// a point of heightened intersubjective awareness where the subject
/// recognizes the transformation that has occurred."
class FinalRecordingScreen extends StatefulWidget {
  final String testament;
  final String characterName;
  final String shipLog;

  const FinalRecordingScreen({
    super.key,
    required this.testament,
    required this.characterName,
    required this.shipLog,
  });

  @override
  State<FinalRecordingScreen> createState() => _FinalRecordingScreenState();
}

class _FinalRecordingScreenState extends State<FinalRecordingScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _fadeController;
  _FinalePhase _phase = _FinalePhase.darkness;

  @override
  void initState() {
    super.initState();
    _fadeController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 3),
    );
    _startSequence();
  }

  Future<void> _startSequence() async {
    // Phase 1: Pure darkness (3 seconds)
    await Future.delayed(const Duration(seconds: 3));

    // Phase 2: Ship's Log
    if (mounted) setState(() => _phase = _FinalePhase.shipLog);

    // Wait for reading the log (scales with length)
    final logReadTime = (widget.shipLog.length / 20).clamp(8, 30).toInt();
    await Future.delayed(Duration(seconds: logReadTime));

    // Phase 3: Pause between log and testament
    if (mounted) setState(() => _phase = _FinalePhase.pause);
    await Future.delayed(const Duration(seconds: 3));

    // Phase 4: Testament
    if (mounted) setState(() => _phase = _FinalePhase.testament);

    // Wait for reading testament
    final testamentReadTime =
        (widget.testament.length / 15).clamp(6, 20).toInt();
    await Future.delayed(Duration(seconds: testamentReadTime));

    // Phase 5: Closing
    if (mounted) setState(() => _phase = _FinalePhase.closing);
  }

  @override
  void dispose() {
    _fadeController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ScanlineOverlay(
      opacity: 0.12,
      child: Scaffold(
        backgroundColor: Colors.black,
        body: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 40),

                // Ship's Log
                if (_phase.index >= _FinalePhase.shipLog.index) ...[
                  Text(
                    '[RECUPERO REGISTRO DI BORDO...]',
                    style: TerminusTheme.systemLog.copyWith(
                      color: TerminusTheme.neonGreen.withValues(alpha: 0.4),
                      fontSize: 10,
                    ),
                  ),
                  const SizedBox(height: 16),
                  NarrativeText(
                    text: widget.shipLog,
                    charDelay: const Duration(milliseconds: 15),
                  ),
                  const SizedBox(height: 32),
                ],

                // Pause separator
                if (_phase.index >= _FinalePhase.pause.index) ...[
                  Center(
                    child: Container(
                      width: 100,
                      height: 1,
                      color: TerminusTheme.neonRed.withValues(alpha: 0.15),
                    ),
                  ),
                  const SizedBox(height: 32),
                ],

                // Testament
                if (_phase.index >= _FinalePhase.testament.index) ...[
                  Text(
                    '[RIPRODUZIONE TESTAMENTO — FILE SIGILLATO]',
                    style: TerminusTheme.systemLog.copyWith(
                      color: TerminusTheme.neonRed.withValues(alpha: 0.5),
                      fontSize: 10,
                    ),
                  ),
                  const SizedBox(height: 24),
                  NarrativeText(
                    text: '"${widget.testament}"',
                    charDelay: const Duration(milliseconds: 40),
                  ),
                  const SizedBox(height: 32),
                ],

                // Closing
                if (_phase == _FinalePhase.closing) ...[
                  Text(
                    '[FINE TRASMISSIONE]',
                    style: TerminusTheme.systemLog.copyWith(
                      color: TerminusTheme.neonRed.withValues(alpha: 0.3),
                      fontSize: 10,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'TERMINUS-OMNI // SISTEMA OFFLINE',
                    style: TerminusTheme.systemLog.copyWith(
                      color: TerminusTheme.neonRed.withValues(alpha: 0.2),
                      fontSize: 10,
                    ),
                  ),
                  const SizedBox(height: 48),
                  Center(
                    child: GestureDetector(
                      onTap: () => Navigator.popUntil(
                          context, (route) => route.isFirst),
                      child: Text(
                        'tocca per tornare alla luce',
                        style: TerminusTheme.narrativeItalic.copyWith(
                          fontSize: 11,
                          color:
                              TerminusTheme.textDim.withValues(alpha: 0.3),
                        ),
                      ),
                    ),
                  ),
                ],

                const SizedBox(height: 40),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

enum _FinalePhase {
  darkness,
  shipLog,
  pause,
  testament,
  closing,
}
