import 'dart:math' as math;
import 'package:flutter/material.dart';

/// Deep descent tunnel — a receding point of light in darkness.
/// The walls close in as lumen drops. Horizontal glitch lines
/// interrupt the geometry. Heavy vignette crushes the edges.
class TunnelPainter extends CustomPainter {
  final double progress;  // 0..1 looping
  final int lumenCount;
  final double glitchIntensity;

  static const int _ringCount = 22;

  TunnelPainter({
    required this.progress,
    required this.lumenCount,
    this.glitchIntensity = 0.0,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final cx = size.width / 2;
    final cy = size.height / 2;

    // Color: fades from cyan to red as lumen drops
    final t = (lumenCount / 10.0).clamp(0.0, 1.0);
    final ringColor = Color.lerp(
      const Color(0xFFFF003C),
      const Color(0xFF00F0FF),
      t,
    )!;

    // ── Vignette ──
    final vignetteRect = Rect.fromLTWH(0, 0, size.width, size.height);
    final vignettePaint = Paint()
      ..shader = RadialGradient(
        colors: [
          Colors.transparent,
          Colors.black.withValues(alpha: 0.6 + (1.0 - t) * 0.3),
        ],
        stops: const [0.3, 1.0],
      ).createShader(vignetteRect);
    canvas.drawRect(vignetteRect, vignettePaint);

    // ── Vanishing point (receding light) ──
    final vpSize = 30.0 + lumenCount * 5.0; // Shrinks as lumen drops
    canvas.drawCircle(
      Offset(cx, cy),
      vpSize,
      Paint()
        ..shader = RadialGradient(
          colors: [
            ringColor.withValues(alpha: 0.15),
            ringColor.withValues(alpha: 0.0),
          ],
        ).createShader(
          Rect.fromCircle(center: Offset(cx, cy), radius: vpSize),
        ),
    );

    // ── Tunnel rings ──
    for (int i = 0; i < _ringCount; i++) {
      final ringT = ((progress * 1.5) + i / _ringCount) % 1.0;
      final scale = math.pow(ringT, 0.5).toDouble();
      if (scale < 0.02) continue;

      // Walls close in: narrower tunnel at low lumen
      final squeeze = 0.7 + t * 0.6;
      final halfW = cx * scale * squeeze;
      final halfH = cy * scale * squeeze;

      double alpha;
      if (ringT < 0.06) {
        alpha = ringT / 0.06;
      } else if (ringT > 0.9) {
        alpha = (1.0 - ringT) / 0.1;
      } else {
        alpha = 1.0;
      }
      alpha *= 0.4;
      if (alpha <= 0.01) continue;

      // Glitch: random horizontal offset
      double xOffset = 0;
      if (glitchIntensity > 0) {
        final rng = math.Random((i * 37 + (progress * 200).toInt()) % 997);
        if (rng.nextDouble() < glitchIntensity * 0.3) {
          xOffset = (rng.nextDouble() - 0.5) * 30 * glitchIntensity;
        }
      }

      final rect = Rect.fromCenter(
        center: Offset(cx + xOffset, cy),
        width: halfW * 2,
        height: halfH * 2,
      );

      // Solid outline
      canvas.drawRect(
        rect,
        Paint()
          ..color = ringColor.withValues(alpha: alpha * 0.5)
          ..style = PaintingStyle.stroke
          ..strokeWidth = 0.8 + scale * 1.5,
      );

      // Glow
      canvas.drawRect(
        rect,
        Paint()
          ..color = ringColor.withValues(alpha: alpha * 0.12)
          ..style = PaintingStyle.stroke
          ..strokeWidth = 3.0 + scale * 6.0
          ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 8),
      );
    }

    // ── Horizontal glitch lines ──
    if (glitchIntensity > 0) {
      _drawGlitchLines(canvas, size, ringColor);
    }

    // ── Heavy vignette on top ──
    canvas.drawRect(
      vignetteRect,
      Paint()
        ..shader = RadialGradient(
          colors: [
            Colors.transparent,
            Colors.black.withValues(alpha: 0.85),
          ],
          stops: [0.2 + t * 0.3, 1.0],
        ).createShader(vignetteRect),
    );
  }

  void _drawGlitchLines(Canvas canvas, Size size, Color color) {
    final rng = math.Random((progress * 500).toInt() % 997);
    final count = (8 * glitchIntensity).round();

    for (int i = 0; i < count; i++) {
      final y = rng.nextDouble() * size.height;
      final h = 1.0 + rng.nextDouble() * 3.0;
      final xShift = (rng.nextDouble() - 0.5) * 40 * glitchIntensity;

      canvas.drawRect(
        Rect.fromLTWH(xShift, y, size.width, h),
        Paint()..color = color.withValues(alpha: 0.08 + rng.nextDouble() * 0.12),
      );
    }
  }

  @override
  bool shouldRepaint(TunnelPainter old) =>
      progress != old.progress ||
      lumenCount != old.lumenCount ||
      glitchIntensity != old.glitchIntensity;
}
