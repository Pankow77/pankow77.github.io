import 'dart:math' as math;
import 'package:flutter/material.dart';

/// Rusted, decayed monitor border — corroded edges with dripping stains.
/// The border of the main HUD panel: industrial, not clean.
class RustedBorderPainter extends CustomPainter {
  final double decay; // 0.0 = clean, 1.0 = heavily corroded

  RustedBorderPainter({this.decay = 0.5});

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Rect.fromLTWH(0, 0, size.width, size.height);
    final rng = math.Random(73);

    // Base border: dark metallic
    canvas.drawRect(
      rect,
      Paint()
        ..color = const Color(0xFF152240).withValues(alpha: 0.5)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 3.0,
    );

    // Inner border: brighter accent
    canvas.drawRect(
      rect.deflate(4),
      Paint()
        ..color = const Color(0xFF00F0FF).withValues(alpha: 0.12)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.0,
    );

    // Rust spots along edges
    final spotCount = (20 * decay).round();
    for (int i = 0; i < spotCount; i++) {
      final edge = rng.nextInt(4);
      double x, y;
      switch (edge) {
        case 0: // top
          x = rng.nextDouble() * size.width;
          y = rng.nextDouble() * 6;
          break;
        case 1: // bottom
          x = rng.nextDouble() * size.width;
          y = size.height - rng.nextDouble() * 6;
          break;
        case 2: // left
          x = rng.nextDouble() * 6;
          y = rng.nextDouble() * size.height;
          break;
        default: // right
          x = size.width - rng.nextDouble() * 6;
          y = rng.nextDouble() * size.height;
      }

      final spotSize = 2.0 + rng.nextDouble() * 8.0 * decay;

      // Rust color: brown-orange
      canvas.drawCircle(
        Offset(x, y),
        spotSize,
        Paint()
          ..color = Color.lerp(
            const Color(0xFF8B4513),
            const Color(0xFFFF6600),
            rng.nextDouble(),
          )!
              .withValues(alpha: 0.1 + rng.nextDouble() * 0.2 * decay)
          ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 3),
      );
    }

    // Drip stains (vertical streaks from top)
    final dripCount = (6 * decay).round();
    for (int i = 0; i < dripCount; i++) {
      final x = rng.nextDouble() * size.width;
      final length = 15.0 + rng.nextDouble() * 40.0 * decay;

      final dripPath = Path()
        ..moveTo(x, 0)
        ..lineTo(x + (rng.nextDouble() - 0.5) * 3, length);

      canvas.drawPath(
        dripPath,
        Paint()
          ..color = const Color(0xFF8B4513).withValues(alpha: 0.1 * decay)
          ..style = PaintingStyle.stroke
          ..strokeWidth = 1.0 + rng.nextDouble() * 2.0
          ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 2),
      );
    }

    // Corner accent: small neon ticks
    const tickLen = 12.0;
    final tickPaint = Paint()
      ..color = const Color(0xFF00F0FF).withValues(alpha: 0.25)
      ..strokeWidth = 1.5;

    // Top-left
    canvas.drawLine(const Offset(0, 0), const Offset(tickLen, 0), tickPaint);
    canvas.drawLine(const Offset(0, 0), const Offset(0, tickLen), tickPaint);
    // Top-right
    canvas.drawLine(Offset(size.width, 0), Offset(size.width - tickLen, 0), tickPaint);
    canvas.drawLine(Offset(size.width, 0), Offset(size.width, tickLen), tickPaint);
    // Bottom-left
    canvas.drawLine(Offset(0, size.height), Offset(tickLen, size.height), tickPaint);
    canvas.drawLine(Offset(0, size.height), Offset(0, size.height - tickLen), tickPaint);
    // Bottom-right
    canvas.drawLine(
        Offset(size.width, size.height), Offset(size.width - tickLen, size.height), tickPaint);
    canvas.drawLine(
        Offset(size.width, size.height), Offset(size.width, size.height - tickLen), tickPaint);
  }

  @override
  bool shouldRepaint(RustedBorderPainter old) => decay != old.decay;
}
