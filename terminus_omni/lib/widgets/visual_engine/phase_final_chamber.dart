import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'effects/dripping_code_painter.dart';
import 'effects/heartbeat_circle.dart';
import 'effects/scanline_shader.dart';

/// Phase 4: Final Chamber — lumen 0. Death.
/// Near-total darkness. A red heartbeat circle. Weak cyan pulse on title.
/// The screen barely exists. The data is almost gone.
class PhaseFinalChamber extends StatefulWidget {
  const PhaseFinalChamber({super.key});

  @override
  State<PhaseFinalChamber> createState() => _PhaseFinalChamberState();
}

class _PhaseFinalChamberState extends State<PhaseFinalChamber>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 30),
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
        // Very slow, weak title pulse
        final titlePulse =
            (math.sin(_controller.value * math.pi * 2 * 3) * 0.15 + 0.2)
                .clamp(0.05, 0.35);

        return Stack(
          children: [
            // Near-total black (5% grey)
            const ColoredBox(
              color: Color(0xFF0D0D0D),
              child: SizedBox.expand(),
            ),

            // Very slow, sparse dripping code (almost invisible)
            Positioned.fill(
              child: Opacity(
                opacity: 0.12,
                child: CustomPaint(
                  painter: DrippingCodePainter(
                    progress: _controller.value,
                    lumenCount: 0,
                  ),
                ),
              ),
            ),

            // Central heartbeat circle
            const Center(
              child: HeartbeatCircle(
                radius: 80,
                color: Color(0xFFFF003C),
                bpm: 30,
              ),
            ),

            // Fading title
            Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'TERMINUS',
                    style: TextStyle(
                      fontFamily: 'Orbitron',
                      fontSize: 28,
                      fontWeight: FontWeight.w700,
                      color: const Color(0xFF00F0FF)
                          .withValues(alpha: titlePulse),
                      letterSpacing: 6,
                    ),
                  ),
                  const SizedBox(height: 60),
                  // Lumen 0 warning
                  Text(
                    'LUMEN: 0',
                    style: TextStyle(
                      fontFamily: 'ShareTechMono',
                      fontSize: 12,
                      color: const Color(0xFFFF003C)
                          .withValues(alpha: titlePulse * 0.8),
                      letterSpacing: 4,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'SIGNAL LOST',
                    style: TextStyle(
                      fontFamily: 'ShareTechMono',
                      fontSize: 10,
                      color: const Color(0xFFFF003C)
                          .withValues(alpha: titlePulse * 0.5),
                      letterSpacing: 6,
                    ),
                  ),
                ],
              ),
            ),

            // Heavy vignette
            Positioned.fill(
              child: IgnorePointer(
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: RadialGradient(
                      colors: [
                        Colors.transparent,
                        Colors.black.withValues(alpha: 0.9),
                      ],
                      stops: const [0.15, 0.85],
                    ),
                  ),
                ),
              ),
            ),

            // Scanline (very heavy)
            const Positioned.fill(
              child: IgnorePointer(child: ScanlineShader(intensity: 0.45)),
            ),
          ],
        );
      },
    );
  }
}
