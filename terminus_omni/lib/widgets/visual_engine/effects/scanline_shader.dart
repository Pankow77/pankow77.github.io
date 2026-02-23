import 'dart:math' as math;
import 'package:flutter/material.dart';

/// CRT scanline overlay — irregular spacing, variable opacity.
/// Not the clean 3px-apart lines of a cheap filter: these are
/// the organic imperfections of a dying monitor.
class ScanlineShader extends StatelessWidget {
  final double intensity;

  const ScanlineShader({super.key, this.intensity = 0.3});

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      painter: _ScanlinePainter(intensity: intensity),
      size: Size.infinite,
    );
  }
}

class _ScanlinePainter extends CustomPainter {
  final double intensity;

  _ScanlinePainter({required this.intensity});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..strokeWidth = 1.0;
    final rng = math.Random(42);

    double y = 0.0;
    while (y < size.height) {
      final spacing = 2.0 + rng.nextDouble() * 4.0;
      final alpha = intensity * (0.2 + rng.nextDouble() * 0.5);

      paint.color = Colors.black.withValues(alpha: alpha);
      canvas.drawLine(Offset(0, y), Offset(size.width, y), paint);

      y += spacing;
    }

    // Subtle horizontal color aberration bands (every ~80px)
    double bandY = rng.nextDouble() * 40;
    while (bandY < size.height) {
      final bandHeight = 1.0 + rng.nextDouble() * 2.0;
      canvas.drawRect(
        Rect.fromLTWH(0, bandY, size.width, bandHeight),
        Paint()
          ..color = const Color(0xFF00FF41).withValues(alpha: 0.015 * intensity),
      );
      bandY += 60 + rng.nextDouble() * 50;
    }
  }

  @override
  bool shouldRepaint(_ScanlinePainter old) => intensity != old.intensity;
}
