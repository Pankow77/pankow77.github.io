import 'dart:math' as math;
import 'package:flutter/material.dart';

/// Oscilloscope-style entropy/coherence graph.
/// Two waveforms: entropy (chaotic, red-orange) and coherence (smooth, cyan).
/// As the game progresses, entropy dominates and coherence flatlines.
class EntropyGraphPainter extends CustomPainter {
  final double entropy;    // 0.0–1.0
  final double coherence;  // 0.0–1.0
  final double time;       // animated time value

  EntropyGraphPainter({
    required this.entropy,
    required this.coherence,
    this.time = 0.0,
  });

  @override
  void paint(Canvas canvas, Size size) {
    // Grid lines
    _drawGrid(canvas, size);

    // Entropy waveform (chaotic)
    _drawWaveform(
      canvas, size,
      amplitude: entropy,
      color: const Color(0xFFFF6600),
      frequency: 3.0 + entropy * 8.0,
      noise: entropy * 0.4,
      yOffset: 0.35,
    );

    // Coherence waveform (smooth)
    _drawWaveform(
      canvas, size,
      amplitude: coherence,
      color: const Color(0xFF00F0FF),
      frequency: 1.5,
      noise: (1.0 - coherence) * 0.15,
      yOffset: 0.65,
    );

    // Labels
    _drawLabel(canvas, 'ENTROPY', const Color(0xFFFF6600), Offset(8, 4));
    _drawLabel(
        canvas, 'COHERENCE', const Color(0xFF00F0FF), Offset(8, size.height - 18));
  }

  void _drawGrid(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = const Color(0xFF152240).withValues(alpha: 0.5)
      ..strokeWidth = 0.5;

    // Horizontal
    for (int i = 0; i <= 4; i++) {
      final y = size.height * i / 4;
      canvas.drawLine(Offset(0, y), Offset(size.width, y), paint);
    }
    // Vertical
    for (int i = 0; i <= 8; i++) {
      final x = size.width * i / 8;
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), paint);
    }
  }

  void _drawWaveform(
    Canvas canvas,
    Size size, {
    required double amplitude,
    required Color color,
    required double frequency,
    required double noise,
    required double yOffset,
  }) {
    final rng = math.Random(42);
    final path = Path();
    final centerY = size.height * yOffset;
    final amp = size.height * 0.15 * amplitude;

    for (int x = 0; x <= size.width.toInt(); x++) {
      final t = x / size.width;
      final wave = math.sin((t * frequency + time) * math.pi * 2) * amp;
      final noiseVal = (rng.nextDouble() - 0.5) * amp * noise * 2;
      final y = centerY + wave + noiseVal;

      if (x == 0) {
        path.moveTo(x.toDouble(), y);
      } else {
        path.lineTo(x.toDouble(), y);
      }
    }

    // Glow
    canvas.drawPath(
      path,
      Paint()
        ..color = color.withValues(alpha: 0.15)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 4
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 6),
    );

    // Solid line
    canvas.drawPath(
      path,
      Paint()
        ..color = color.withValues(alpha: 0.7)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.5,
    );
  }

  void _drawLabel(Canvas canvas, String text, Color color, Offset offset) {
    final tp = TextPainter(
      text: TextSpan(
        text: text,
        style: TextStyle(
          fontFamily: 'ShareTechMono',
          fontSize: 9,
          color: color.withValues(alpha: 0.6),
          letterSpacing: 2,
        ),
      ),
      textDirection: TextDirection.ltr,
    )..layout();
    tp.paint(canvas, offset);
  }

  @override
  bool shouldRepaint(EntropyGraphPainter old) =>
      entropy != old.entropy || coherence != old.coherence || time != old.time;
}
