import 'dart:math' as math;
import 'package:flutter/material.dart';

/// 6x6 grid that compresses vertically as lumen drops.
/// Each cell represents a fragment of the victim's coherence.
/// Cells flicker, glitch, and go dark as death approaches.
class GridCompressionPainter extends CustomPainter {
  final int lumenCount;
  final double time;

  GridCompressionPainter({required this.lumenCount, this.time = 0.0});

  @override
  void paint(Canvas canvas, Size size) {
    const cols = 6;
    const rows = 6;

    // Vertical compression: grid shrinks as lumen drops
    final compression = 1.0 - (lumenCount / 10.0).clamp(0.0, 1.0) * 0.5;
    final gridH = size.height * compression;
    final gridW = size.width;
    final topOffset = (size.height - gridH) / 2;

    final cellW = gridW / cols;
    final cellH = gridH / rows;

    final rng = math.Random(17);

    for (int row = 0; row < rows; row++) {
      for (int col = 0; col < cols; col++) {
        final cellIndex = row * cols + col;
        final x = col * cellW;
        final y = topOffset + row * cellH;
        final rect = Rect.fromLTWH(x, y, cellW, cellH);

        // How many cells are "alive" (based on lumen)
        final threshold = (lumenCount / 10.0 * 36).round();
        final isAlive = cellIndex < threshold;

        // Flicker for alive cells
        double alpha;
        if (isAlive) {
          alpha = 0.3 + rng.nextDouble() * 0.4;
          // Occasional flicker
          if (rng.nextDouble() < 0.15) {
            alpha *= 0.3 + math.sin(time * math.pi * 2 * (2 + rng.nextDouble() * 3)) * 0.3;
          }
        } else {
          alpha = 0.03 + rng.nextDouble() * 0.04;
        }

        // Color: cyan for alive, dark for dead
        final color = isAlive
            ? const Color(0xFF00F0FF).withValues(alpha: alpha)
            : const Color(0xFF152240).withValues(alpha: alpha);

        canvas.drawRect(rect.deflate(1.5), Paint()..color = color);

        // Border
        canvas.drawRect(
          rect.deflate(1.5),
          Paint()
            ..color = const Color(0xFF152240).withValues(alpha: 0.3)
            ..style = PaintingStyle.stroke
            ..strokeWidth = 0.5,
        );
      }
    }
  }

  @override
  bool shouldRepaint(GridCompressionPainter old) =>
      lumenCount != old.lumenCount || time != old.time;
}
