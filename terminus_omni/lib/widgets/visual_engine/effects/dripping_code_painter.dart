import 'dart:math' as math;
import 'package:flutter/material.dart';

/// Falling code that "drips" down the screen — dense, slow, decayed.
/// Not clean Matrix rain: this is corrupted data leaking from memory.
class DrippingCodePainter extends CustomPainter {
  final double progress;
  final int lumenCount;

  static const List<String> _chars = [
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
    'A', 'B', 'C', 'D', 'E', 'F', 'a', 'b', 'c', 'd',
    '{', '}', '[', ']', '(', ')', ';', ':', '|', '/',
    '\u00A7', '\u00B6', '\u2020', '\u2021', '\u2588', '\u2593',
  ];

  DrippingCodePainter({required this.progress, required this.lumenCount});

  @override
  void paint(Canvas canvas, Size size) {
    final columnCount = (size.width / 28).floor().clamp(10, 40);
    final columnWidth = size.width / columnCount;

    for (int col = 0; col < columnCount; col++) {
      _drawColumn(canvas, size, col, columnWidth);
    }
  }

  void _drawColumn(Canvas canvas, Size size, int col, double colW) {
    final rng = math.Random(col * 31 + 7);
    final speed = 18.0 + rng.nextDouble() * 14.0;
    final charCount = 12 + rng.nextInt(16);
    const charH = 15.0;

    // Vertical offset wraps around
    final yBase = (progress * speed * 50.0 + rng.nextDouble() * size.height) %
        (size.height + charCount * charH + 100);

    // Color shifts from green to red as lumen drops
    final greenAmount = (lumenCount / 10.0).clamp(0.0, 1.0);
    final baseColor = Color.lerp(
      const Color(0xFFFF003C), // red (low lumen)
      const Color(0xFF00FF41), // green (high lumen)
      greenAmount,
    )!;

    for (int i = 0; i < charCount; i++) {
      final y = yBase - i * charH - 100;
      if (y < -charH || y > size.height) continue;

      // Fade: bright at head, dim at tail
      final fadeRatio = i / charCount;
      double alpha = (1.0 - fadeRatio * 0.85) * 0.55;

      // Head character is white-hot
      final isHead = i == 0;

      // Random variation
      alpha *= 0.6 + rng.nextDouble() * 0.4;
      if (alpha <= 0.02) continue;

      final char = _chars[(col * 13 + i * 7 + (progress * 80).toInt()) %
          _chars.length];

      final tp = TextPainter(
        text: TextSpan(
          text: char,
          style: TextStyle(
            fontFamily: 'ShareTechMono',
            fontSize: 11,
            color: isHead
                ? Colors.white.withValues(alpha: alpha * 1.4)
                : baseColor.withValues(alpha: alpha),
            fontWeight: isHead ? FontWeight.w700 : FontWeight.w400,
          ),
        ),
        textDirection: TextDirection.ltr,
      )..layout();

      tp.paint(canvas, Offset(col * colW + colW / 2 - 4, y));
    }
  }

  @override
  bool shouldRepaint(DrippingCodePainter old) =>
      progress != old.progress || lumenCount != old.lumenCount;
}
