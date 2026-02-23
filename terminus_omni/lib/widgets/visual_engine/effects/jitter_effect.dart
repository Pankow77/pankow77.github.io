import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/material.dart';

/// Random position jitter — the screen trembles like a dying CRT.
/// Intensity controls how much it shakes (0.0 = still, 1.0 = ±3px).
class JitterEffect extends StatefulWidget {
  final Widget child;
  final double intensity;

  const JitterEffect({
    super.key,
    required this.child,
    this.intensity = 1.0,
  });

  @override
  State<JitterEffect> createState() => _JitterEffectState();
}

class _JitterEffectState extends State<JitterEffect> {
  final math.Random _rng = math.Random();
  Timer? _timer;
  double _dx = 0;
  double _dy = 0;

  @override
  void initState() {
    super.initState();
    _tick();
  }

  void _tick() {
    _timer = Timer(
      Duration(milliseconds: 60 + _rng.nextInt(140)),
      () {
        if (!mounted) return;
        setState(() {
          _dx = (_rng.nextDouble() - 0.5) * 3.0 * widget.intensity;
          _dy = (_rng.nextDouble() - 0.5) * 2.0 * widget.intensity;
        });
        _tick();
      },
    );
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Transform.translate(
      offset: Offset(_dx, _dy),
      child: widget.child,
    );
  }
}
