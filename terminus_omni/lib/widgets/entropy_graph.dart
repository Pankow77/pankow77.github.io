import 'dart:math';
import 'package:flutter/material.dart';
import '../config/theme.dart';

/// The Entropy/Coherence crossing graph — from the concept art.
/// Two curves that inevitably cross: Entropy rises, Coherence falls.
/// The intersection point is where the player loses control.
class EntropyGraph extends StatefulWidget {
  final int currentLumen;
  final double height;

  const EntropyGraph({
    super.key,
    required this.currentLumen,
    this.height = 100,
  });

  @override
  State<EntropyGraph> createState() => _EntropyGraphState();
}

class _EntropyGraphState extends State<EntropyGraph>
    with SingleTickerProviderStateMixin {
  late AnimationController _pulseController;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 3),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: widget.height,
      width: double.infinity,
      child: AnimatedBuilder(
        animation: _pulseController,
        builder: (context, _) {
          return CustomPaint(
            painter: _EntropyGraphPainter(
              lumen: widget.currentLumen,
              pulse: _pulseController.value,
            ),
          );
        },
      ),
    );
  }
}

class _EntropyGraphPainter extends CustomPainter {
  final int lumen;
  final double pulse;

  _EntropyGraphPainter({
    required this.lumen,
    required this.pulse,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final padding = 8.0;
    final graphWidth = size.width - padding * 2;
    final graphHeight = size.height - padding * 2;

    // Background grid
    _drawGrid(canvas, size, padding, graphWidth, graphHeight);

    // Progress marker (where the player is on the X axis)
    final progressX = padding + graphWidth * (1.0 - lumen / 10.0);

    // Draw Coherence curve (falls from top-left to bottom-right) — cyan
    _drawCurve(
      canvas,
      size,
      padding,
      graphWidth,
      graphHeight,
      isCoherence: true,
      progressX: progressX,
    );

    // Draw Entropy curve (rises from bottom-left to top-right) — red
    _drawCurve(
      canvas,
      size,
      padding,
      graphWidth,
      graphHeight,
      isCoherence: false,
      progressX: progressX,
    );

    // Draw intersection marker
    _drawIntersection(
        canvas, size, padding, graphWidth, graphHeight, progressX);

    // Draw current position marker
    _drawPositionMarker(
        canvas, size, padding, graphWidth, graphHeight, progressX);

    // Labels
    _drawLabels(canvas, size, padding);
  }

  void _drawGrid(Canvas canvas, Size size, double padding,
      double graphWidth, double graphHeight) {
    final gridPaint = Paint()
      ..color = TerminusTheme.border.withValues(alpha: 0.3)
      ..strokeWidth = 0.5;

    // Vertical lines
    for (int i = 0; i <= 10; i++) {
      final x = padding + graphWidth * (i / 10.0);
      canvas.drawLine(
        Offset(x, padding),
        Offset(x, padding + graphHeight),
        gridPaint,
      );
    }

    // Horizontal lines
    for (int i = 0; i <= 4; i++) {
      final y = padding + graphHeight * (i / 4.0);
      canvas.drawLine(
        Offset(padding, y),
        Offset(padding + graphWidth, y),
        gridPaint,
      );
    }
  }

  void _drawCurve(
    Canvas canvas,
    Size size,
    double padding,
    double graphWidth,
    double graphHeight, {
    required bool isCoherence,
    required double progressX,
  }) {
    final color = isCoherence ? TerminusTheme.neonCyan : TerminusTheme.neonRed;

    final linePaint = Paint()
      ..color = color.withValues(alpha: 0.8)
      ..strokeWidth = 2.0
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    final glowPaint = Paint()
      ..color = color.withValues(alpha: 0.2)
      ..strokeWidth = 6.0
      ..style = PaintingStyle.stroke
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 3);

    final dimPaint = Paint()
      ..color = color.withValues(alpha: 0.2)
      ..strokeWidth = 1.0
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    final path = Path();
    final futurePath = Path();
    bool passedProgress = false;

    for (double t = 0; t <= 1.0; t += 0.005) {
      final x = padding + graphWidth * t;
      double y;

      if (isCoherence) {
        // Coherence: starts high, drops with an S-curve
        final curve = 1.0 - _sigmoid(t, 0.5, 8);
        y = padding + graphHeight * (1.0 - curve);
      } else {
        // Entropy: starts low, rises with an S-curve
        final curve = _sigmoid(t, 0.5, 8);
        y = padding + graphHeight * (1.0 - curve);
      }

      if (x > progressX && !passedProgress) {
        passedProgress = true;
        futurePath.moveTo(x, y);
      }

      if (!passedProgress) {
        if (t == 0) {
          path.moveTo(x, y);
        } else {
          path.lineTo(x, y);
        }
      }
      futurePath.lineTo(x, y);
    }

    // Draw active portion with glow
    canvas.drawPath(path, glowPaint);
    canvas.drawPath(path, linePaint);

    // Draw future portion dimmed (dashed effect)
    canvas.drawPath(futurePath, dimPaint);
  }

  void _drawIntersection(Canvas canvas, Size size, double padding,
      double graphWidth, double graphHeight, double progressX) {
    // The curves cross at t ≈ 0.5
    final crossX = padding + graphWidth * 0.5;
    final crossY = padding + graphHeight * 0.5;

    final markerPaint = Paint()
      ..color = TerminusTheme.neonOrange.withValues(alpha: 0.6 + pulse * 0.3)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5;

    final glowPaint = Paint()
      ..color = TerminusTheme.neonOrange.withValues(alpha: 0.15 + pulse * 0.1)
      ..style = PaintingStyle.fill
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 6);

    // Pulsing circle at intersection
    final radius = 6.0 + pulse * 2.0;
    canvas.drawCircle(Offset(crossX, crossY), radius + 4, glowPaint);
    canvas.drawCircle(Offset(crossX, crossY), radius, markerPaint);

    // X label
    final textPainter = TextPainter(
      text: TextSpan(
        text: 'X',
        style: TextStyle(
          fontFamily: 'Orbitron',
          fontSize: 8,
          color: TerminusTheme.neonOrange.withValues(alpha: 0.7),
          fontWeight: FontWeight.bold,
        ),
      ),
      textDirection: TextDirection.ltr,
    )..layout();
    textPainter.paint(
        canvas, Offset(crossX - 3, crossY - 4));
  }

  void _drawPositionMarker(Canvas canvas, Size size, double padding,
      double graphWidth, double graphHeight, double progressX) {
    // Vertical line at current position
    final linePaint = Paint()
      ..color = Colors.white.withValues(alpha: 0.4 + pulse * 0.2)
      ..strokeWidth = 1.0;

    canvas.drawLine(
      Offset(progressX, padding),
      Offset(progressX, padding + graphHeight),
      linePaint,
    );

    // Lumen label at top
    final textPainter = TextPainter(
      text: TextSpan(
        text: 'L:$lumen',
        style: TextStyle(
          fontFamily: 'ShareTechMono',
          fontSize: 9,
          color: TerminusTheme.lumenColor(lumen),
        ),
      ),
      textDirection: TextDirection.ltr,
    )..layout();
    textPainter.paint(
        canvas, Offset(progressX - textPainter.width / 2, 0));
  }

  void _drawLabels(Canvas canvas, Size size, double padding) {
    // ENTROPY label (right side, red)
    final entropyPainter = TextPainter(
      text: TextSpan(
        text: 'ENTROPY',
        style: TextStyle(
          fontFamily: 'ShareTechMono',
          fontSize: 8,
          color: TerminusTheme.neonRed.withValues(alpha: 0.6),
          letterSpacing: 1,
        ),
      ),
      textDirection: TextDirection.ltr,
    )..layout();
    entropyPainter.paint(
      canvas,
      Offset(size.width - entropyPainter.width - 4, padding + 2),
    );

    // COHERENCE label (left side, cyan)
    final coherencePainter = TextPainter(
      text: TextSpan(
        text: 'COHERENCE',
        style: TextStyle(
          fontFamily: 'ShareTechMono',
          fontSize: 8,
          color: TerminusTheme.neonCyan.withValues(alpha: 0.6),
          letterSpacing: 1,
        ),
      ),
      textDirection: TextDirection.ltr,
    )..layout();
    coherencePainter.paint(
      canvas,
      Offset(4, padding + 2),
    );
  }

  double _sigmoid(double x, double center, double steepness) {
    return 1.0 / (1.0 + exp(-steepness * (x - center)));
  }

  @override
  bool shouldRepaint(covariant _EntropyGraphPainter oldDelegate) =>
      oldDelegate.lumen != lumen || oldDelegate.pulse != pulse;
}
