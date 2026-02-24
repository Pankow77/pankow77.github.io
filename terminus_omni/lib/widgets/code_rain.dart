import 'dart:math';
import 'package:flutter/material.dart';

/// High-performance code rain effect — uses drawRect particles instead of
/// TextPainter, which was causing web freezes. Each "raindrop" is a
/// glowing rectangle falling with trail fade, giving a similar effect
/// at 10x less GPU cost.
class CodeRain extends StatefulWidget {
  final Color color;
  final double density;
  final double speed;
  final double opacity;

  const CodeRain({
    super.key,
    this.color = const Color(0xFF00F0FF),
    this.density = 0.6,
    this.speed = 1.0,
    this.opacity = 0.15,
  });

  @override
  State<CodeRain> createState() => _CodeRainState();
}

class _CodeRainState extends State<CodeRain>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 12),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: AnimatedBuilder(
        animation: _controller,
        builder: (context, _) {
          return CustomPaint(
            painter: _RainPainter(
              progress: _controller.value,
              color: widget.color,
              density: widget.density,
              speed: widget.speed,
              opacity: widget.opacity,
            ),
            size: Size.infinite,
          );
        },
      ),
    );
  }
}

class _RainPainter extends CustomPainter {
  final double progress;
  final Color color;
  final double density;
  final double speed;
  final double opacity;

  static final Random _rng = Random(42);
  static List<_Drop>? _drops;
  static int _lastDropCount = 0;

  _RainPainter({
    required this.progress,
    required this.color,
    required this.density,
    required this.speed,
    required this.opacity,
  });

  @override
  void paint(Canvas canvas, Size size) {
    if (size.width <= 0 || size.height <= 0) return;

    final colWidth = 18.0;
    final numCols = (size.width / colWidth).ceil();
    final targetDrops = (numCols * density).ceil();

    if (_drops == null || _lastDropCount != targetDrops) {
      _initDrops(targetDrops, numCols, size);
      _lastDropCount = targetDrops;
    }

    for (final drop in _drops!) {
      final x = drop.col * colWidth + colWidth * 0.5;
      final baseY = ((drop.startY + progress * size.height * drop.speed * speed * 2.5)
              % (size.height + drop.length * 12.0)) -
          drop.length * 12.0;

      for (int i = 0; i < drop.length; i++) {
        final y = baseY + i * 12.0;
        if (y < -12 || y > size.height) continue;

        final fadeRatio = i / drop.length;
        final alpha = opacity * (1.0 - fadeRatio * 0.85);
        if (alpha <= 0.01) continue;

        final isHead = i == 0;
        final cellColor = isHead
            ? Colors.white.withValues(alpha: alpha * 1.5)
            : color.withValues(alpha: alpha);

        final paint = Paint()..color = cellColor;

        // Draw small glowing rectangles instead of text characters
        final w = isHead ? 4.0 : 3.0;
        final h = isHead ? 8.0 : 6.0;
        canvas.drawRRect(
          RRect.fromRectAndRadius(
            Rect.fromCenter(center: Offset(x, y), width: w, height: h),
            const Radius.circular(1),
          ),
          paint,
        );

        // Add glow for head particle
        if (isHead) {
          final glowPaint = Paint()
            ..color = color.withValues(alpha: alpha * 0.4)
            ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 6);
          canvas.drawCircle(Offset(x, y), 4, glowPaint);
        }
      }
    }
  }

  void _initDrops(int count, int numCols, Size size) {
    _drops = List.generate(count, (i) {
      final col = i % numCols;
      return _Drop(
        col: col,
        startY: _rng.nextDouble() * size.height * 2,
        speed: 0.4 + _rng.nextDouble() * 0.6,
        length: 4 + _rng.nextInt(12),
      );
    });
  }

  @override
  bool shouldRepaint(covariant _RainPainter oldDelegate) =>
      oldDelegate.progress != progress || oldDelegate.color != color;
}

class _Drop {
  final int col;
  final double startY;
  final double speed;
  final int length;

  _Drop({
    required this.col,
    required this.startY,
    required this.speed,
    required this.length,
  });
}
