import 'dart:math' as math;
import 'package:flutter/material.dart';

/// Pulsing heartbeat circle — irregular rhythm like a failing heart.
/// At lumen 0: the last vital sign before flatline.
class HeartbeatCircle extends StatefulWidget {
  final double radius;
  final Color color;
  final double bpm; // beats per minute (irregular)

  const HeartbeatCircle({
    super.key,
    this.radius = 80,
    this.color = const Color(0xFFFF003C),
    this.bpm = 40,
  });

  @override
  State<HeartbeatCircle> createState() => _HeartbeatCircleState();
}

class _HeartbeatCircleState extends State<HeartbeatCircle>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 8),
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
        return CustomPaint(
          painter: _HeartbeatPainter(
            time: _controller.value,
            radius: widget.radius,
            color: widget.color,
            bpm: widget.bpm,
          ),
          size: Size(widget.radius * 3, widget.radius * 3),
        );
      },
    );
  }
}

class _HeartbeatPainter extends CustomPainter {
  final double time;
  final double radius;
  final Color color;
  final double bpm;

  _HeartbeatPainter({
    required this.time,
    required this.radius,
    required this.color,
    required this.bpm,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final cx = size.width / 2;
    final cy = size.height / 2;

    // Irregular heartbeat: sharp systole + diastole
    final beatPhase = (time * bpm / 60.0 * 8.0) % 1.0;
    double pulse;
    if (beatPhase < 0.08) {
      // Systole: sharp expansion
      pulse = math.sin(beatPhase / 0.08 * math.pi) * 0.25;
    } else if (beatPhase < 0.2) {
      // Dicrotic notch
      pulse = math.sin((beatPhase - 0.08) / 0.12 * math.pi) * 0.08;
    } else {
      // Diastole: rest
      pulse = 0;
    }

    // Skip occasional beats (irregular)
    final rng = math.Random((time * 100).floor() % 47);
    if (rng.nextDouble() < 0.12) pulse *= 0.1;

    final r = radius * (1.0 + pulse);

    // Outer glow
    canvas.drawCircle(
      Offset(cx, cy),
      r * 1.5,
      Paint()
        ..shader = RadialGradient(
          colors: [
            color.withValues(alpha: 0.06 + pulse * 0.15),
            color.withValues(alpha: 0.0),
          ],
        ).createShader(
          Rect.fromCircle(center: Offset(cx, cy), radius: r * 1.5),
        ),
    );

    // Main circle
    canvas.drawCircle(
      Offset(cx, cy),
      r,
      Paint()
        ..color = color.withValues(alpha: 0.08 + pulse * 0.25)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2.0 + pulse * 3.0,
    );

    // Inner glow
    canvas.drawCircle(
      Offset(cx, cy),
      r * 0.7,
      Paint()
        ..color = color.withValues(alpha: 0.03 + pulse * 0.1)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.0
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 12),
    );
  }

  @override
  bool shouldRepaint(_HeartbeatPainter old) => old.time != time;
}
