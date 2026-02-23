import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'effects/dripping_code_painter.dart';
import 'effects/tunnel_painter.dart';
import 'effects/scanline_shader.dart';
import 'effects/jitter_effect.dart';

/// Phase 3: Deep Descent — lumen ≤ 4.
/// Tunnel with receding light, vertical compression,
/// horizontal glitch lines, heavy vignette.
class PhaseDeepDescent extends StatefulWidget {
  final int lumenCount;

  const PhaseDeepDescent({super.key, required this.lumenCount});

  @override
  State<PhaseDeepDescent> createState() => _PhaseDeepDescentState();
}

class _PhaseDeepDescentState extends State<PhaseDeepDescent>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 4),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // Vertical compression: screen squeezes as lumen drops
    final compressionRatio =
        0.6 + (widget.lumenCount / 10.0).clamp(0.0, 1.0) * 0.4;

    // Glitch intensity increases as lumen drops
    final glitchIntensity =
        (1.0 - widget.lumenCount / 4.0).clamp(0.0, 1.0) * 0.8;

    return AnimatedBuilder(
      animation: _controller,
      builder: (context, _) {
        return JitterEffect(
          intensity: glitchIntensity,
          child: Stack(
            children: [
              // Deep black background
              const ColoredBox(
                color: Color(0xFF050505),
                child: SizedBox.expand(),
              ),

              // Tunnel
              Positioned.fill(
                child: Center(
                  child: FractionallySizedBox(
                    heightFactor: compressionRatio,
                    child: CustomPaint(
                      painter: TunnelPainter(
                        progress: _controller.value,
                        lumenCount: widget.lumenCount,
                        glitchIntensity: glitchIntensity,
                      ),
                      size: Size.infinite,
                    ),
                  ),
                ),
              ),

              // Dripping code (very sparse at this phase)
              Positioned.fill(
                child: Opacity(
                  opacity: 0.3,
                  child: CustomPaint(
                    painter: DrippingCodePainter(
                      progress: _controller.value,
                      lumenCount: widget.lumenCount,
                    ),
                  ),
                ),
              ),

              // Horizontal glitch bands
              if (glitchIntensity > 0.1)
                Positioned.fill(
                  child: IgnorePointer(
                    child: CustomPaint(
                      painter: _HorizontalGlitchPainter(
                        time: _controller.value,
                        intensity: glitchIntensity,
                      ),
                    ),
                  ),
                ),

              // Status text
              Positioned(
                bottom: 40,
                left: 0,
                right: 0,
                child: _buildStatus(),
              ),

              // Scanline overlay (heavier)
              Positioned.fill(
                child: IgnorePointer(
                  child: ScanlineShader(
                    intensity: 0.35 + glitchIntensity * 0.15,
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildStatus() {
    return Column(
      children: [
        Text(
          'LUMEN: ${widget.lumenCount}',
          textAlign: TextAlign.center,
          style: TextStyle(
            fontFamily: 'Orbitron',
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: const Color(0xFFFF003C).withValues(alpha: 0.6),
            letterSpacing: 4,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          'SIGNAL DEGRADING',
          textAlign: TextAlign.center,
          style: TextStyle(
            fontFamily: 'ShareTechMono',
            fontSize: 10,
            color: const Color(0xFFFF6600).withValues(alpha: 0.4),
            letterSpacing: 3,
          ),
        ),
      ],
    );
  }
}

/// Random horizontal displacement bands — screen tearing effect.
class _HorizontalGlitchPainter extends CustomPainter {
  final double time;
  final double intensity;

  _HorizontalGlitchPainter({required this.time, required this.intensity});

  @override
  void paint(Canvas canvas, Size size) {
    final rng = math.Random((time * 400).toInt() % 997);
    final bandCount = (6 * intensity).round();

    for (int i = 0; i < bandCount; i++) {
      final y = rng.nextDouble() * size.height;
      final h = 2.0 + rng.nextDouble() * 8.0;
      final xShift = (rng.nextDouble() - 0.5) * 50 * intensity;

      // Displaced band
      canvas.save();
      canvas.clipRect(Rect.fromLTWH(0, y, size.width, h));
      canvas.translate(xShift, 0);

      // Color stripe
      canvas.drawRect(
        Rect.fromLTWH(-xShift, y, size.width, h),
        Paint()
          ..color = const Color(0xFF00F0FF)
              .withValues(alpha: 0.04 + rng.nextDouble() * 0.08),
      );

      canvas.restore();
    }
  }

  @override
  bool shouldRepaint(_HorizontalGlitchPainter old) =>
      time != old.time || intensity != old.intensity;
}
