import 'dart:math';
import 'package:flutter/material.dart';
import '../config/theme.dart';

/// Visual display of the Lumen-Count.
/// 10 animated candles that flicker when lit and fade to darkness
/// when extinguished — with flicker, fade, and screen shake.
class LumenDisplay extends StatelessWidget {
  final int currentLumen;
  final bool performanceMode;

  const LumenDisplay({
    super.key,
    required this.currentLumen,
    this.performanceMode = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: TerminusTheme.bgPanel,
        border: Border.all(color: TerminusTheme.border),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            'LUMEN-COUNT',
            style: TerminusTheme.systemLog.copyWith(
              color: TerminusTheme.lumenColor(currentLumen),
              fontSize: 10,
            ),
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(10, (i) {
              final lumenIndex = i + 1; // 1, 2, 3... 10
              final isLit = lumenIndex <= currentLumen;
              return Padding(
                padding: const EdgeInsets.symmetric(horizontal: 3),
                child: isLit
                    ? performanceMode
                        ? _StaticCandle(
                            color: TerminusTheme.lumenColor(lumenIndex))
                        : _FlickeringCandle(
                            color: TerminusTheme.lumenColor(lumenIndex),
                            intensity: lumenIndex <= 3 ? 0.8 : 0.4,
                          )
                    : performanceMode
                        ? _StaticExtinguished()
                        : _ExtinguishedCandle(
                            color: TerminusTheme.lumenColor(lumenIndex),
                          ),
              );
            }),
          ),
          const SizedBox(height: 6),
          Text(
            '$currentLumen/10',
            style: TerminusTheme.displayMedium.copyWith(
              color: TerminusTheme.lumenColor(currentLumen),
              fontSize: 18,
            ),
          ),
        ],
      ),
    );
  }
}

/// A single lit candle with a flickering flame animation.
class _FlickeringCandle extends StatefulWidget {
  final Color color;
  final double intensity;

  const _FlickeringCandle({
    required this.color,
    this.intensity = 0.4,
  });

  @override
  State<_FlickeringCandle> createState() => _FlickeringCandleState();
}

class _FlickeringCandleState extends State<_FlickeringCandle>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  final Random _rng = Random();

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: Duration(milliseconds: 200 + _rng.nextInt(200)),
    )..repeat(reverse: true);
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
      builder: (context, child) {
        final flicker =
            0.7 + (_controller.value * 0.3 * (1 + widget.intensity));
        final offsetX = (_rng.nextDouble() - 0.5) * widget.intensity * 1.5;
        return Transform.translate(
          offset: Offset(offsetX, 0),
          child: SizedBox(
            width: 20,
            height: 36,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Flame
                Opacity(
                  opacity: flicker.clamp(0.0, 1.0),
                  child: Container(
                    width: 10,
                    height: 14,
                    decoration: BoxDecoration(
                      borderRadius: const BorderRadius.only(
                        topLeft: Radius.circular(5),
                        topRight: Radius.circular(5),
                        bottomLeft: Radius.circular(3),
                        bottomRight: Radius.circular(3),
                      ),
                      gradient: RadialGradient(
                        colors: [
                          Colors.white.withValues(alpha: 0.9),
                          widget.color.withValues(alpha: 0.8),
                          widget.color.withValues(alpha: 0.3),
                        ],
                        stops: const [0.0, 0.4, 1.0],
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: widget.color.withValues(alpha: 0.6),
                          blurRadius: 12,
                          spreadRadius: 3,
                        ),
                        BoxShadow(
                          color: widget.color.withValues(alpha: 0.2),
                          blurRadius: 24,
                          spreadRadius: 6,
                        ),
                      ],
                    ),
                  ),
                ),
                // Wick
                Container(
                  width: 2,
                  height: 3,
                  color: TerminusTheme.textDim,
                ),
                // Candle body
                Container(
                  width: 8,
                  height: 15,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(1),
                    color: widget.color.withValues(alpha: 0.25),
                    border: Border.all(
                      color: widget.color.withValues(alpha: 0.15),
                      width: 0.5,
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

/// An extinguished candle — dark, still, dead.
class _ExtinguishedCandle extends StatefulWidget {
  final Color color;

  const _ExtinguishedCandle({required this.color});

  @override
  State<_ExtinguishedCandle> createState() => _ExtinguishedCandleState();
}

class _ExtinguishedCandleState extends State<_ExtinguishedCandle>
    with SingleTickerProviderStateMixin {
  late AnimationController _fadeController;

  @override
  void initState() {
    super.initState();
    _fadeController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..forward();
  }

  @override
  void dispose() {
    _fadeController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _fadeController,
      builder: (context, child) {
        return Opacity(
          opacity: 0.3 + (1 - _fadeController.value) * 0.7,
          child: SizedBox(
            width: 20,
            height: 36,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Smoke wisp (fades out)
                Opacity(
                  opacity: (1 - _fadeController.value) * 0.4,
                  child: Container(
                    width: 4,
                    height: 14,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(2),
                      color: TerminusTheme.textDim.withValues(alpha: 0.15),
                    ),
                  ),
                ),
                // Dead wick
                Container(
                  width: 2,
                  height: 3,
                  color: TerminusTheme.bgDeep,
                ),
                // Candle body (dark)
                Container(
                  width: 8,
                  height: 15,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(1),
                    color: TerminusTheme.bgDeep,
                    border: Border.all(
                      color: TerminusTheme.border.withValues(alpha: 0.3),
                      width: 0.5,
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

/// Static lit candle — no animation, for performance mode.
class _StaticCandle extends StatelessWidget {
  final Color color;
  const _StaticCandle({required this.color});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 20,
      height: 36,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 10,
            height: 14,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(5),
              color: color.withValues(alpha: 0.8),
              boxShadow: [
                BoxShadow(
                  color: color.withValues(alpha: 0.4),
                  blurRadius: 8,
                  spreadRadius: 2,
                ),
              ],
            ),
          ),
          Container(width: 2, height: 3, color: TerminusTheme.textDim),
          Container(
            width: 8,
            height: 15,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(1),
              color: color.withValues(alpha: 0.25),
            ),
          ),
        ],
      ),
    );
  }
}

/// Static extinguished candle — no animation, for performance mode.
class _StaticExtinguished extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 20,
      height: 36,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(width: 4, height: 14, color: Colors.transparent),
          Container(width: 2, height: 3, color: TerminusTheme.bgDeep),
          Container(
            width: 8,
            height: 15,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(1),
              color: TerminusTheme.bgDeep,
              border: Border.all(
                color: TerminusTheme.border.withValues(alpha: 0.2),
                width: 0.5,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
