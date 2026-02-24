import 'dart:math';
import 'package:flutter/material.dart';
import '../config/theme.dart';

/// Industrial circuit-board background pattern.
/// Subtle geometric lines and nodes inspired by PCB traces
/// and the Hybrid Syndicate branding aesthetic.
class CircuitBackground extends StatelessWidget {
  final Color? color;
  final double opacity;

  const CircuitBackground({
    super.key,
    this.color,
    this.opacity = 0.06,
  });

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: CustomPaint(
        painter: _CircuitPainter(
          color: color ?? TerminusTheme.neonCyan,
          opacity: opacity,
        ),
        size: Size.infinite,
      ),
    );
  }
}

class _CircuitPainter extends CustomPainter {
  final Color color;
  final double opacity;

  _CircuitPainter({required this.color, required this.opacity});

  @override
  void paint(Canvas canvas, Size size) {
    final rng = Random(77);
    final tracePaint = Paint()
      ..color = color.withValues(alpha: opacity)
      ..strokeWidth = 1.0
      ..style = PaintingStyle.stroke;

    final nodePaint = Paint()
      ..color = color.withValues(alpha: opacity * 1.5)
      ..style = PaintingStyle.fill;

    final glowPaint = Paint()
      ..color = color.withValues(alpha: opacity * 0.5)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 4);

    final gridSize = 60.0;
    final cols = (size.width / gridSize).ceil() + 1;
    final rows = (size.height / gridSize).ceil() + 1;

    // Draw PCB traces
    for (int row = 0; row < rows; row++) {
      for (int col = 0; col < cols; col++) {
        final x = col * gridSize;
        final y = row * gridSize;

        if (rng.nextDouble() < 0.35) {
          // Horizontal trace
          final traceLen = gridSize * (0.5 + rng.nextDouble() * 0.5);
          canvas.drawLine(Offset(x, y), Offset(x + traceLen, y), tracePaint);

          // Right-angle bend
          if (rng.nextDouble() < 0.4) {
            final bendLen = gridSize * (0.3 + rng.nextDouble() * 0.4);
            final dir = rng.nextBool() ? 1.0 : -1.0;
            canvas.drawLine(
              Offset(x + traceLen, y),
              Offset(x + traceLen, y + bendLen * dir),
              tracePaint,
            );
          }
        }

        if (rng.nextDouble() < 0.25) {
          // Vertical trace
          final traceLen = gridSize * (0.4 + rng.nextDouble() * 0.6);
          canvas.drawLine(Offset(x, y), Offset(x, y + traceLen), tracePaint);
        }

        // Connection node
        if (rng.nextDouble() < 0.15) {
          final nodeSize = 2.0 + rng.nextDouble() * 2.0;
          canvas.drawCircle(Offset(x, y), nodeSize + 3, glowPaint);
          canvas.drawCircle(Offset(x, y), nodeSize, nodePaint);

          // Node ring
          if (rng.nextDouble() < 0.5) {
            canvas.drawCircle(Offset(x, y), nodeSize + 4, tracePaint);
          }
        }

        // Small IC/chip rectangle
        if (rng.nextDouble() < 0.04) {
          final chipW = 12.0 + rng.nextDouble() * 16.0;
          final chipH = 8.0 + rng.nextDouble() * 10.0;
          canvas.drawRect(
            Rect.fromCenter(
              center: Offset(x, y),
              width: chipW,
              height: chipH,
            ),
            tracePaint,
          );
          // Chip pins
          for (int p = 0; p < 3; p++) {
            final pinX = x - chipW / 2 + (p + 1) * chipW / 4;
            canvas.drawLine(
              Offset(pinX, y - chipH / 2),
              Offset(pinX, y - chipH / 2 - 4),
              tracePaint,
            );
            canvas.drawLine(
              Offset(pinX, y + chipH / 2),
              Offset(pinX, y + chipH / 2 + 4),
              tracePaint,
            );
          }
        }
      }
    }
  }

  @override
  bool shouldRepaint(covariant _CircuitPainter oldDelegate) => false;
}

/// Rich gradient background with optional vignette effect.
/// Replaces plain black backgrounds across all screens.
class GradientBackground extends StatelessWidget {
  final List<Color>? colors;
  final bool showVignette;
  final double vignetteIntensity;

  const GradientBackground({
    super.key,
    this.colors,
    this.showVignette = true,
    this.vignetteIntensity = 0.4,
  });

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        // Base gradient
        Positioned.fill(
          child: DecoratedBox(
            decoration: BoxDecoration(
              gradient: colors != null
                  ? LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: colors!,
                    )
                  : TerminusTheme.bgGradient,
            ),
          ),
        ),
        // Vignette
        if (showVignette)
          Positioned.fill(
            child: IgnorePointer(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: RadialGradient(
                    center: Alignment.center,
                    radius: 1.2,
                    colors: [
                      Colors.transparent,
                      Colors.black.withValues(alpha: vignetteIntensity),
                    ],
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }
}
