import 'package:flutter/material.dart';
import '../config/theme.dart';

/// Visual display of the Lumen-Count.
/// Shows 10 candles that progressively extinguish.
class LumenDisplay extends StatelessWidget {
  final int currentLumen;

  const LumenDisplay({super.key, required this.currentLumen});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
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
          const SizedBox(height: 6),
          Row(
            mainAxisSize: MainAxisSize.min,
            children: List.generate(10, (i) {
              final lumenIndex = 10 - i; // 10, 9, 8... 1
              final isLit = lumenIndex <= currentLumen;
              return Padding(
                padding: const EdgeInsets.symmetric(horizontal: 2),
                child: _CandleIcon(
                  isLit: isLit,
                  color: TerminusTheme.lumenColor(lumenIndex),
                ),
              );
            }),
          ),
          const SizedBox(height: 4),
          Text(
            '$currentLumen/10',
            style: TerminusTheme.displayMedium.copyWith(
              color: TerminusTheme.lumenColor(currentLumen),
              fontSize: 20,
            ),
          ),
        ],
      ),
    );
  }
}

class _CandleIcon extends StatelessWidget {
  final bool isLit;
  final Color color;

  const _CandleIcon({required this.isLit, required this.color});

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 800),
      curve: Curves.easeOut,
      width: 8,
      height: 24,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(2),
        color: isLit ? color.withValues(alpha: 0.9) : TerminusTheme.bgDeep,
        border: Border.all(
          color: isLit ? color.withValues(alpha: 0.5) : TerminusTheme.border,
          width: 0.5,
        ),
        boxShadow: isLit
            ? [
                BoxShadow(
                  color: color.withValues(alpha: 0.4),
                  blurRadius: 8,
                  spreadRadius: 1,
                ),
              ]
            : null,
      ),
    );
  }
}
