import 'dart:math';
import 'package:flutter/material.dart';

/// ECG-style heartbeat waveform — the pulse of TERMINUS.
/// Beats rhythmically when alive, flatlines at Lumen 0.
class HeartbeatLine extends StatefulWidget {
  final Color color;
  final double height;
  final bool isAlive;
  final double bpm;

  const HeartbeatLine({
    super.key,
    this.color = const Color(0xFFFF003C),
    this.height = 60,
    this.isAlive = true,
    this.bpm = 72,
  });

  @override
  State<HeartbeatLine> createState() => _HeartbeatLineState();
}

class _HeartbeatLineState extends State<HeartbeatLine>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    final beatDuration = (60000 / widget.bpm).round();
    _controller = AnimationController(
      vsync: this,
      duration: Duration(milliseconds: beatDuration),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: widget.height,
      width: double.infinity,
      child: AnimatedBuilder(
        animation: _controller,
        builder: (context, _) {
          return CustomPaint(
            painter: _HeartbeatPainter(
              progress: _controller.value,
              color: widget.color,
              isAlive: widget.isAlive,
            ),
          );
        },
      ),
    );
  }
}

class _HeartbeatPainter extends CustomPainter {
  final double progress;
  final Color color;
  final bool isAlive;

  _HeartbeatPainter({
    required this.progress,
    required this.color,
    required this.isAlive,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = 2.0
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    final glowPaint = Paint()
      ..color = color.withValues(alpha: 0.3)
      ..strokeWidth = 6.0
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 4);

    final midY = size.height / 2;
    final path = Path();
    path.moveTo(0, midY);

    if (!isAlive) {
      // Flatline
      path.lineTo(size.width, midY);
      canvas.drawPath(path, glowPaint);
      canvas.drawPath(path, paint);
      return;
    }

    // Generate ECG waveform
    final segmentWidth = size.width;
    final offset = progress * segmentWidth;

    for (double x = 0; x < size.width; x += 1) {
      final normalizedX = ((x + offset) % segmentWidth) / segmentWidth;
      final y = _ecgWaveform(normalizedX, size.height);
      if (x == 0) {
        path.moveTo(x, y);
      } else {
        path.lineTo(x, y);
      }
    }

    // Draw glow first, then the line
    canvas.drawPath(path, glowPaint);
    canvas.drawPath(path, paint);

    // Draw the scanning dot
    final dotX = size.width * 0.7;
    final dotNormalizedX =
        ((dotX + offset) % segmentWidth) / segmentWidth;
    final dotY = _ecgWaveform(dotNormalizedX, size.height);
    final dotPaint = Paint()
      ..color = Colors.white
      ..style = PaintingStyle.fill;
    final dotGlow = Paint()
      ..color = color.withValues(alpha: 0.6)
      ..style = PaintingStyle.fill
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 8);
    canvas.drawCircle(Offset(dotX, dotY), 5, dotGlow);
    canvas.drawCircle(Offset(dotX, dotY), 2.5, dotPaint);
  }

  double _ecgWaveform(double t, double height) {
    final midY = height / 2;
    final amplitude = height * 0.35;

    // P wave (small bump)
    if (t >= 0.1 && t < 0.2) {
      final local = (t - 0.1) / 0.1;
      return midY - sin(local * pi) * amplitude * 0.15;
    }
    // Q dip
    if (t >= 0.25 && t < 0.30) {
      final local = (t - 0.25) / 0.05;
      return midY + sin(local * pi) * amplitude * 0.15;
    }
    // R spike (the main peak)
    if (t >= 0.30 && t < 0.38) {
      final local = (t - 0.30) / 0.08;
      return midY - sin(local * pi) * amplitude * 0.9;
    }
    // S dip
    if (t >= 0.38 && t < 0.44) {
      final local = (t - 0.38) / 0.06;
      return midY + sin(local * pi) * amplitude * 0.25;
    }
    // T wave (recovery bump)
    if (t >= 0.5 && t < 0.65) {
      final local = (t - 0.5) / 0.15;
      return midY - sin(local * pi) * amplitude * 0.2;
    }
    // Baseline
    return midY;
  }

  @override
  bool shouldRepaint(covariant _HeartbeatPainter oldDelegate) =>
      oldDelegate.progress != progress ||
      oldDelegate.isAlive != isAlive;
}
