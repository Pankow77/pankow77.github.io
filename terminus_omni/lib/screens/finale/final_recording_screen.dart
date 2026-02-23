import 'package:flutter/material.dart';

import '../../config/theme.dart';
import '../../widgets/scanline_overlay.dart';
import '../../widgets/narrative_text.dart';
import '../../widgets/glitch_text.dart';
import '../../widgets/code_rain.dart';
import '../../widgets/heartbeat_line.dart';

/// The Final Recording screen — plays Ship's Log + sealed testament at Lumen 0.
///
/// Visual concept: "Lumen 0 / Final Chamber"
/// - Red code rain cascading from above (arterial blood, not Matrix green)
/// - ECG flatline in the center
/// - The last circle — the last Lumen — empty, hollow
/// - Pure darkness breathing around the edges
///
/// Sequence:
/// 1. Pure darkness (3 seconds)
/// 2. Red code rain begins slowly
/// 3. Ship's Log — the subject's entire journey read back
/// 4. Pause — flatline appears (3 seconds)
/// 5. Testament — the sealed message from the beginning
/// 6. TERMINUS-OMNI // SYSTEM OFFLINE
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
    with TickerProviderStateMixin {
  late AnimationController _fadeController;
  late AnimationController _rainFadeController;
  late AnimationController _circleController;
  _FinalePhase _phase = _FinalePhase.darkness;

  @override
  void initState() {
    super.initState();
    _fadeController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 3),
    );
    _rainFadeController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 5),
    );
    _circleController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 4),
    )..repeat(reverse: true);

    _startSequence();
  }

  Future<void> _startSequence() async {
    // Phase 1: Pure darkness (3 seconds)
    await Future.delayed(const Duration(seconds: 3));

    // Start red rain fade-in
    _rainFadeController.forward();

    // Phase 2: Ship's Log
    if (mounted) {
      setState(() => _phase = _FinalePhase.shipLog);
      _fadeController.forward();
    }

    // Wait for reading the log
    final logReadTime = (widget.shipLog.length / 20).clamp(8, 30).toInt();
    await Future.delayed(Duration(seconds: logReadTime));

    // Phase 3: Pause between log and testament
    if (mounted) setState(() => _phase = _FinalePhase.pause);
    await Future.delayed(const Duration(seconds: 4));

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
    _rainFadeController.dispose();
    _circleController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ScanlineOverlay(
      opacity: 0.12,
      child: Scaffold(
        backgroundColor: Colors.black,
        body: Stack(
          children: [
            // Red code rain background
            Positioned.fill(
              child: FadeTransition(
                opacity: _rainFadeController,
                child: const CodeRain(
                  color: Color(0xFFFF003C),
                  density: 0.5,
                  speed: 0.3,
                  opacity: 0.12,
                ),
              ),
            ),

            // Dark gradient overlay
            Positioned.fill(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: RadialGradient(
                    center: Alignment.center,
                    radius: 1.5,
                    colors: [
                      Colors.black.withValues(alpha: 0.5),
                      Colors.black.withValues(alpha: 0.85),
                    ],
                  ),
                ),
              ),
            ),

            // Main content
            SafeArea(
              child: SingleChildScrollView(
                padding:
                    const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(height: 20),

                    // TERMINUS OMNI header (fading, corrupted)
                    Center(
                      child: GlitchText(
                        text: 'TERMINUS OMNI',
                        style: TerminusTheme.displayLarge.copyWith(
                          fontSize: 20,
                          color:
                              TerminusTheme.neonCyan.withValues(alpha: 0.25),
                          letterSpacing: 4,
                        ),
                        glitchIntensity: 0.6,
                      ),
                    ),

                    const SizedBox(height: 32),

                    // Ship's Log
                    if (_phase.index >= _FinalePhase.shipLog.index) ...[
                      Text(
                        '[RECOVERING SHIP\'S LOG...]',
                        style: TerminusTheme.systemLog.copyWith(
                          color: TerminusTheme.neonRed.withValues(alpha: 0.4),
                          fontSize: 10,
                        ),
                      ),
                      const SizedBox(height: 12),
                      NarrativeText(
                        text: widget.shipLog,
                        charDelay: const Duration(milliseconds: 15),
                      ),
                      const SizedBox(height: 24),
                    ],

                    // Pause — flatline + the last circle
                    if (_phase.index >= _FinalePhase.pause.index) ...[
                      // Flatline
                      HeartbeatLine(
                        color: TerminusTheme.neonRed.withValues(alpha: 0.5),
                        height: 40,
                        isAlive: false,
                      ),
                      const SizedBox(height: 16),

                      // The last circle — the empty Lumen
                      Center(
                        child: AnimatedBuilder(
                          animation: _circleController,
                          builder: (context, _) {
                            final pulseAlpha =
                                0.15 + _circleController.value * 0.15;
                            return Container(
                              width: 60,
                              height: 60,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                border: Border.all(
                                  color: TerminusTheme.neonRed
                                      .withValues(alpha: pulseAlpha),
                                  width: 2,
                                ),
                                boxShadow: [
                                  BoxShadow(
                                    color: TerminusTheme.neonRed
                                        .withValues(alpha: pulseAlpha * 0.5),
                                    blurRadius: 20,
                                    spreadRadius: 4,
                                  ),
                                ],
                              ),
                              child: Center(
                                child: Text(
                                  '0',
                                  style: TerminusTheme.displayMedium.copyWith(
                                    color: TerminusTheme.neonRed
                                        .withValues(alpha: pulseAlpha * 2),
                                    fontSize: 22,
                                  ),
                                ),
                              ),
                            );
                          },
                        ),
                      ),
                      const SizedBox(height: 24),
                    ],

                    // Testament
                    if (_phase.index >= _FinalePhase.testament.index) ...[
                      Text(
                        '[PLAYING TESTAMENT — SEALED FILE]',
                        style: TerminusTheme.systemLog.copyWith(
                          color: TerminusTheme.neonRed.withValues(alpha: 0.5),
                          fontSize: 10,
                        ),
                      ),
                      const SizedBox(height: 16),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(4),
                          border: Border.all(
                            color:
                                TerminusTheme.neonRed.withValues(alpha: 0.15),
                          ),
                          color:
                              TerminusTheme.neonRed.withValues(alpha: 0.03),
                        ),
                        child: NarrativeText(
                          text: '"${widget.testament}"',
                          charDelay: const Duration(milliseconds: 40),
                        ),
                      ),
                      const SizedBox(height: 24),
                    ],

                    // Closing
                    if (_phase == _FinalePhase.closing) ...[
                      Center(
                        child: Column(
                          children: [
                            Text(
                              '[END TRANSMISSION]',
                              style: TerminusTheme.systemLog.copyWith(
                                color: TerminusTheme.neonRed
                                    .withValues(alpha: 0.3),
                                fontSize: 10,
                              ),
                            ),
                            const SizedBox(height: 6),
                            GlitchText(
                              text: 'TERMINUS-OMNI // SYSTEM OFFLINE',
                              style: TerminusTheme.systemLog.copyWith(
                                color: TerminusTheme.neonRed
                                    .withValues(alpha: 0.2),
                                fontSize: 10,
                              ),
                              glitchIntensity: 0.3,
                            ),
                            const SizedBox(height: 40),
                            GestureDetector(
                              onTap: () => Navigator.popUntil(
                                  context, (route) => route.isFirst),
                              child: Text(
                                'touch to return to the light',
                                style: TerminusTheme.narrativeItalic.copyWith(
                                  fontSize: 11,
                                  color: TerminusTheme.textDim
                                      .withValues(alpha: 0.25),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],

                    const SizedBox(height: 40),
                  ],
                ),
              ),
            ),
          ],
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
