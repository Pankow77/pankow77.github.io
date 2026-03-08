import 'dart:math' as math;
import 'dart:ui' as ui;
import 'package:flutter/material.dart';

/// Renders a 3D code corridor faithful to the TERMINUS OMNI concept art.
///
/// Walls covered in dense code characters, floor with circular data-nodes,
/// everything converging to a dark vanishing point — sucked into the void.
class TunnelCorridorPainter extends CustomPainter {
  final double loop;
  final double phase;

  static const String _chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789{}[]<>()@#\$%&*+-=|/\\:;!?~';

  // Pale green-gray: the color of old terminal phosphor
  static const Color _charColor = Color(0xFFB0D0C0);
  static const Color _charBright = Color(0xFFD0F0E0);

  // Reusable TextPainter to reduce GC pressure
  static final TextPainter _tp = TextPainter(textDirection: TextDirection.ltr);

  TunnelCorridorPainter({required this.loop, required this.phase});

  double _lerp(double a, double b, double t) => a + (b - a) * t;

  @override
  void paint(Canvas canvas, Size size) {
    final cx = size.width / 2;
    final cy = size.height * 0.42;

    final fadeIn = (phase / 0.12).clamp(0.0, 1.0);
    final speed = phase < 0.65 ? 1.0 : 1.0 + (phase - 0.65) / 0.35 * 6.0;

    // 1. Corridor structural wireframe
    _drawStructure(canvas, size, cx, cy, fadeIn);

    // 2. Depth layers: wall characters, ceiling characters, floor circles
    const layerCount = 24;
    for (int i = 0; i < layerCount; i++) {
      final t = ((i / layerCount) + loop * speed * 0.12) % 1.0;
      _drawLayer(canvas, size, cx, cy, t, i, fadeIn);
    }

    // 3. Vanishing-point glow
    _drawVanishingPoint(canvas, cx, cy, fadeIn);

    // 4. Radial vignette (darkness swallows the edges)
    _drawVignette(canvas, size, cx, cy);
  }

  // ── Corridor edge lines from corners to vanishing point ──
  void _drawStructure(
      Canvas canvas, Size s, double cx, double cy, double fade) {
    final vp = Offset(cx, cy);

    final mainPaint = Paint()
      ..color = _charColor.withValues(alpha: 0.07 * fade)
      ..strokeWidth = 0.5;

    // Corner-to-VP lines (define wall/floor/ceiling trapezoids)
    canvas.drawLine(Offset.zero, vp, mainPaint);
    canvas.drawLine(Offset(s.width, 0), vp, mainPaint);
    canvas.drawLine(Offset(0, s.height), vp, mainPaint);
    canvas.drawLine(Offset(s.width, s.height), vp, mainPaint);

    // Mid-edge guide lines (additional corridor structure)
    final faintPaint = Paint()
      ..color = _charColor.withValues(alpha: 0.035 * fade)
      ..strokeWidth = 0.3;

    canvas.drawLine(Offset(0, cy), vp, faintPaint);
    canvas.drawLine(Offset(s.width, cy), vp, faintPaint);
    canvas.drawLine(Offset(cx, 0), vp, faintPaint);
    canvas.drawLine(Offset(cx, s.height), vp, faintPaint);

    // Diagonal quarter-lines for extra depth
    canvas.drawLine(Offset(s.width * 0.25, 0), vp, faintPaint);
    canvas.drawLine(Offset(s.width * 0.75, 0), vp, faintPaint);
    canvas.drawLine(Offset(s.width * 0.25, s.height), vp, faintPaint);
    canvas.drawLine(Offset(s.width * 0.75, s.height), vp, faintPaint);
  }

  // ── Single depth layer: frame, wall chars, ceiling, floor circles ──
  void _drawLayer(Canvas canvas, Size s, double cx, double cy, double t,
      int layerIdx, double fade) {
    final scale = 1.0 - t;
    if (scale < 0.02) return;

    // Corridor rectangle at this depth
    final left = _lerp(0, cx, t);
    final right = _lerp(s.width, cx, t);
    final top = _lerp(0, cy, t);
    final bottom = _lerp(s.height, cy, t);

    // Opacity: brighter near camera, dimmer near VP
    final alpha = (scale * 0.6 * fade).clamp(0.0, 0.6);
    if (alpha < 0.02) return;

    final charSize = (13.0 * scale).clamp(2.0, 13.0);

    // ── Depth frame (wireframe rectangle) ──
    final framePaint = Paint()
      ..color = _charColor.withValues(alpha: alpha * 0.18)
      ..strokeWidth = (0.7 * scale).clamp(0.2, 0.7);
    canvas.drawLine(Offset(left, top), Offset(right, top), framePaint);
    canvas.drawLine(Offset(left, bottom), Offset(right, bottom), framePaint);
    canvas.drawLine(Offset(left, top), Offset(left, bottom), framePaint);
    canvas.drawLine(Offset(right, top), Offset(right, bottom), framePaint);

    // Too small for text? Stop here.
    if (charSize < 3.0) return;

    // ── Left wall: 1-3 character columns ──
    _drawWallColumn(
        canvas, left + charSize * 0.2, top, bottom, charSize, alpha * 0.85,
        layerIdx, 0);
    if (charSize > 5.0) {
      _drawWallColumn(
          canvas, left + charSize * 1.3, top, bottom, charSize, alpha * 0.50,
          layerIdx, 1);
    }
    if (charSize > 8.0) {
      _drawWallColumn(
          canvas, left + charSize * 2.4, top, bottom, charSize, alpha * 0.28,
          layerIdx, 2);
    }

    // ── Right wall: 1-3 character columns ──
    _drawWallColumn(
        canvas, right - charSize * 1.0, top, bottom, charSize, alpha * 0.85,
        layerIdx, 3);
    if (charSize > 5.0) {
      _drawWallColumn(
          canvas, right - charSize * 2.1, top, bottom, charSize, alpha * 0.50,
          layerIdx, 4);
    }
    if (charSize > 8.0) {
      _drawWallColumn(
          canvas, right - charSize * 3.2, top, bottom, charSize, alpha * 0.28,
          layerIdx, 5);
    }

    // ── Ceiling: horizontal character row ──
    _drawCharRow(canvas, left + charSize, right - charSize, top + charSize * 0.15,
        charSize, alpha * 0.40, layerIdx, 10);

    // ── Floor: elliptical data-node circles ──
    _drawFloorCircles(
        canvas, left, right, bottom, charSize, alpha * 0.55, layerIdx, scale);
  }

  // ── Vertical column of characters on a wall ──
  void _drawWallColumn(Canvas canvas, double x, double top, double bottom,
      double charSize, double alpha, int layerIdx, int seed) {
    final spacing = charSize * 1.3;
    final count = ((bottom - top) / spacing).floor().clamp(0, 14);

    for (int j = 0; j < count; j++) {
      final y = top + j * spacing + spacing * 0.2;
      final charIdx =
          (layerIdx * 17 + j * 7 + seed * 13 + (loop * 40).toInt()) %
              _chars.length;

      // Per-character brightness variation
      final bv = 0.75 + ((layerIdx * 3 + j * 11 + seed) % 10) * 0.035;
      _drawChar(canvas, _chars[charIdx], x, y, charSize,
          (alpha * bv).clamp(0.0, 0.7));
    }
  }

  // ── Horizontal row of characters (ceiling) ──
  void _drawCharRow(Canvas canvas, double left, double right, double y,
      double charSize, double alpha, int layerIdx, int seed) {
    final spacing = charSize * 1.3;
    final count = ((right - left) / spacing).floor().clamp(0, 12);

    for (int j = 0; j < count; j++) {
      final x = left + j * spacing + spacing * 0.15;
      final charIdx =
          (layerIdx * 13 + j * 11 + seed + (loop * 25).toInt()) %
              _chars.length;
      _drawChar(canvas, _chars[charIdx], x, y, charSize, alpha);
    }
  }

  // ── Floor circles (perspective-squished ellipses) ──
  void _drawFloorCircles(Canvas canvas, double left, double right,
      double bottomY, double charSize, double alpha, int layerIdx,
      double scale) {
    final radius = charSize * 0.65;
    final spacing = charSize * 2.2;
    final count = ((right - left) / spacing).floor().clamp(0, 9);
    final y = bottomY - charSize * 0.35;

    final paint = Paint()
      ..color = _charColor.withValues(alpha: alpha)
      ..style = PaintingStyle.stroke
      ..strokeWidth = (1.0 * scale).clamp(0.3, 1.0);

    for (int j = 0; j < count; j++) {
      final x = left + (j + 0.5) * spacing;
      canvas.drawOval(
        Rect.fromCenter(
          center: Offset(x, y),
          width: radius * 2,
          height: radius * 1.0, // Vertically squished = floor perspective
        ),
        paint,
      );
    }
  }

  // ── Draw a single character using the shared TextPainter ──
  void _drawChar(
      Canvas canvas, String char, double x, double y, double size, double a) {
    if (a < 0.02) return;

    _tp.text = TextSpan(
      text: char,
      style: TextStyle(
        fontFamily: 'ShareTechMono',
        fontSize: size,
        color: _charColor.withValues(alpha: a),
      ),
    );
    _tp.layout();
    _tp.paint(canvas, Offset(x, y));
  }

  // ── Small bright dot at the vanishing point ──
  void _drawVanishingPoint(Canvas canvas, double cx, double cy, double fade) {
    // Bright core
    canvas.drawCircle(
      Offset(cx, cy),
      1.5,
      Paint()..color = _charBright.withValues(alpha: 0.85 * fade),
    );

    // Soft glow halo
    canvas.drawCircle(
      Offset(cx, cy),
      28.0,
      Paint()
        ..shader = ui.Gradient.radial(
          Offset(cx, cy),
          28.0,
          [
            _charColor.withValues(alpha: 0.09 * fade),
            Colors.transparent,
          ],
        ),
    );
  }

  // ── Radial darkness: edges swallow the light ──
  void _drawVignette(Canvas canvas, Size size, double cx, double cy) {
    final rect = Rect.fromLTWH(0, 0, size.width, size.height);
    canvas.drawRect(
      rect,
      Paint()
        ..shader = ui.Gradient.radial(
          Offset(cx, cy),
          size.width * 0.7,
          [
            Colors.transparent,
            Colors.black.withValues(alpha: 0.55),
          ],
          [0.35, 1.0],
        ),
    );
  }

  @override
  bool shouldRepaint(TunnelCorridorPainter old) =>
      old.loop != loop || old.phase != phase;
}
