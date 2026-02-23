import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';

/// Falling code rain effect — corrupted data cascading down the screen.
/// Inspired by the concept art: not green Matrix, but color-shifting
/// based on game state (cyan → red as entropy rises).
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
      duration: const Duration(seconds: 10),
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
            painter: _CodeRainPainter(
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

class _CodeRainPainter extends CustomPainter {
  final double progress;
  final Color color;
  final double density;
  final double speed;
  final double opacity;

  static final Random _rng = Random(42);
  static final List<_RainColumn> _columns = [];
  static bool _initialized = false;

  static const String _chars =
      '01アイウエオカキクケコサシスセソタチツテト'
      'ナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン'
      'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
      '!@#\$%^&*(){}[]<>?/\\|~';

  _CodeRainPainter({
    required this.progress,
    required this.color,
    required this.density,
    required this.speed,
    required this.opacity,
  });

  @override
  void paint(Canvas canvas, Size size) {
    if (!_initialized || _columns.isEmpty) {
      _initColumns(size);
      _initialized = true;
    }

    final charWidth = 12.0;
    final charHeight = 16.0;
    final numCols = (size.width / charWidth).ceil();

    // Ensure we have enough columns
    while (_columns.length < numCols) {
      _columns.add(_RainColumn(
        speed: 0.3 + _rng.nextDouble() * 0.7,
        offset: _rng.nextDouble() * size.height,
        length: 5 + _rng.nextInt(20),
        chars: List.generate(
            30, (_) => _chars[_rng.nextInt(_chars.length)]),
      ));
    }

    for (int col = 0; col < numCols; col++) {
      if (_rng.nextDouble() > density) continue;

      final column = _columns[col % _columns.length];
      final x = col * charWidth;
      final baseY = (column.offset +
              progress * size.height * column.speed * speed * 3) %
          (size.height + column.length * charHeight);

      for (int row = 0; row < column.length; row++) {
        final y = baseY - row * charHeight;
        if (y < -charHeight || y > size.height) continue;

        final fadeRatio = row / column.length;
        final charOpacity = opacity * (1.0 - fadeRatio * 0.8);

        if (charOpacity <= 0.01) continue;

        final paint = Paint()
          ..color = row == 0
              ? Colors.white.withValues(alpha: charOpacity * 1.5)
              : color.withValues(alpha: charOpacity);

        final charIndex =
            (col * 7 + row * 13 + (progress * 100).toInt()) %
                column.chars.length;
        final char = column.chars[charIndex];

        final textPainter = TextPainter(
          text: TextSpan(
            text: char,
            style: TextStyle(
              fontFamily: 'ShareTechMono',
              fontSize: 11,
              color: paint.color,
            ),
          ),
          textDirection: TextDirection.ltr,
        )..layout();

        textPainter.paint(canvas, Offset(x, y));
      }
    }
  }

  void _initColumns(Size size) {
    _columns.clear();
    final numCols = (size.width / 12).ceil();
    for (int i = 0; i < numCols; i++) {
      _columns.add(_RainColumn(
        speed: 0.3 + _rng.nextDouble() * 0.7,
        offset: _rng.nextDouble() * size.height,
        length: 5 + _rng.nextInt(20),
        chars: List.generate(
            30, (_) => _chars[_rng.nextInt(_chars.length)]),
      ));
    }
  }

  @override
  bool shouldRepaint(covariant _CodeRainPainter oldDelegate) =>
      oldDelegate.progress != progress ||
      oldDelegate.color != color;
}

class _RainColumn {
  final double speed;
  final double offset;
  final int length;
  final List<String> chars;

  _RainColumn({
    required this.speed,
    required this.offset,
    required this.length,
    required this.chars,
  });
}
