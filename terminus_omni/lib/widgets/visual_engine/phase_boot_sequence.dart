import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'effects/dripping_code_painter.dart';
import 'effects/scanline_shader.dart';
import 'effects/jitter_effect.dart';

/// Phase 1: Boot Sequence — the system wakes up.
/// Dripping code, CRT scanlines, jitter, neon green title with flicker.
class PhaseBootSequence extends StatefulWidget {
  final int lumenCount;

  const PhaseBootSequence({super.key, required this.lumenCount});

  @override
  State<PhaseBootSequence> createState() => _PhaseBootSequenceState();
}

class _PhaseBootSequenceState extends State<PhaseBootSequence>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 120),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, _) {
        // Irregular flicker: sum of 3 sine waves
        final t = _controller.value;
        final flicker = _computeFlicker(t);

        return Stack(
          children: [
            // Background: near-black
            const ColoredBox(
              color: Color(0xFF0A0A0A),
              child: SizedBox.expand(),
            ),

            // Dripping code layer
            Positioned.fill(
              child: CustomPaint(
                painter: DrippingCodePainter(
                  progress: _controller.value,
                  lumenCount: widget.lumenCount,
                ),
              ),
            ),

            // Title + status with jitter
            Center(
              child: JitterEffect(
                intensity: 1.0,
                child: Opacity(
                  opacity: flicker,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // TERMINUS OMNI
                      Text(
                        'TERMINUS OMNI',
                        style: TextStyle(
                          fontFamily: 'Orbitron',
                          fontSize: 42,
                          fontWeight: FontWeight.w700,
                          color: const Color(0xFF00FF41),
                          letterSpacing: 6,
                          shadows: [
                            Shadow(
                              color: const Color(0xFF00FF41)
                                  .withValues(alpha: 0.6),
                              blurRadius: 12,
                            ),
                            Shadow(
                              color: const Color(0xFF00FF41)
                                  .withValues(alpha: 0.3),
                              blurRadius: 24,
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 48),

                      // System status lines
                      _statusLine('LUMEN COUNT: ${widget.lumenCount}'),
                      const SizedBox(height: 8),
                      _statusLine('INEVITABILITY ENGINE ONLINE'),
                      const SizedBox(height: 8),
                      _statusLine('SCREEN BARRIER ACTIVE'),
                      const SizedBox(height: 8),
                      _statusLine('CONSEQUENTIAL MEMORY LOADED'),
                    ],
                  ),
                ),
              ),
            ),

            // Scanline overlay
            const Positioned.fill(
              child: IgnorePointer(child: ScanlineShader(intensity: 0.3)),
            ),
          ],
        );
      },
    );
  }

  double _computeFlicker(double t) {
    final w1 = math.sin(t * math.pi * 2.0 * 0.7);
    final w2 = math.sin(t * math.pi * 2.0 * 1.3);
    final w3 = math.sin(t * math.pi * 2.0 * 2.1);
    return 0.85 + ((w1 + w2 + w3) / 3.0) * 0.15;
  }

  Widget _statusLine(String text) {
    return Text(
      text,
      style: TextStyle(
        fontFamily: 'ShareTechMono',
        fontSize: 13,
        color: const Color(0xFF00FF41).withValues(alpha: 0.7),
        letterSpacing: 2,
      ),
    );
  }
}
