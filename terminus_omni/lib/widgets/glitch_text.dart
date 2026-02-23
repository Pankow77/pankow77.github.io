import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import '../config/theme.dart';

/// Glitch effect text — Hybrid Syndicate signature.
class GlitchText extends StatefulWidget {
  final String text;
  final TextStyle? style;
  final double glitchIntensity;

  const GlitchText({
    super.key,
    required this.text,
    this.style,
    this.glitchIntensity = 0.3,
  });

  @override
  State<GlitchText> createState() => _GlitchTextState();
}

class _GlitchTextState extends State<GlitchText> {
  final Random _rng = Random();
  Timer? _timer;
  double _offsetX = 0;
  double _offsetY = 0;
  bool _showCyan = false;
  bool _showRed = false;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(milliseconds: 100), (_) {
      if (_rng.nextDouble() < widget.glitchIntensity) {
        setState(() {
          _offsetX = (_rng.nextDouble() - 0.5) * 4;
          _offsetY = (_rng.nextDouble() - 0.5) * 2;
          _showCyan = _rng.nextBool();
          _showRed = _rng.nextBool();
        });
        Future.delayed(const Duration(milliseconds: 50), () {
          if (mounted) {
            setState(() {
              _offsetX = 0;
              _offsetY = 0;
              _showCyan = false;
              _showRed = false;
            });
          }
        });
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final style = widget.style ?? TerminusTheme.displayLarge;
    return Stack(
      children: [
        if (_showCyan)
          Transform.translate(
            offset: Offset(_offsetX - 2, _offsetY),
            child: Text(
              widget.text,
              style: style.copyWith(
                color: TerminusTheme.neonCyan.withValues(alpha: 0.5),
              ),
            ),
          ),
        if (_showRed)
          Transform.translate(
            offset: Offset(_offsetX + 2, _offsetY),
            child: Text(
              widget.text,
              style: style.copyWith(
                color: TerminusTheme.neonRed.withValues(alpha: 0.5),
              ),
            ),
          ),
        Transform.translate(
          offset: Offset(_offsetX, _offsetY),
          child: Text(widget.text, style: style),
        ),
      ],
    );
  }
}
