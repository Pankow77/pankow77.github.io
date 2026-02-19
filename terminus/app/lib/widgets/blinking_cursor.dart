import 'package:flutter/material.dart';
import '../config/theme.dart';

/// The blinking cursor: > _
///
/// This is the last thing the user sees. The ship is gone.
/// The Void is behind them. And the cursor says:
/// you're still here. You can write whatever you want.
class BlinkingCursor extends StatefulWidget {
  final String prefix;
  final Color? color;
  final double? fontSize;

  const BlinkingCursor({
    super.key,
    this.prefix = '> ',
    this.color,
    this.fontSize,
  });

  @override
  State<BlinkingCursor> createState() => _BlinkingCursorState();
}

class _BlinkingCursorState extends State<BlinkingCursor>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _opacity;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    )..repeat(reverse: true);

    _opacity = Tween<double>(begin: 1.0, end: 0.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final color = widget.color ?? TerminusTheme.phosphorGreen;
    final fontSize = widget.fontSize ?? 16.0;

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          widget.prefix,
          style: TerminusTheme.terminalFont(
            color: color,
            fontSize: fontSize,
          ),
        ),
        AnimatedBuilder(
          animation: _opacity,
          builder: (context, child) {
            return Opacity(
              opacity: _opacity.value,
              child: Text(
                '█',
                style: TerminusTheme.terminalFont(
                  color: color,
                  fontSize: fontSize,
                ),
              ),
            );
          },
        ),
      ],
    );
  }
}
