import 'package:flutter/material.dart';
import '../config/theme.dart';
import '../config/constants.dart';
import '../models/lumen_state.dart';

/// Visual Lumen-Count indicator.
///
/// 10 blocks. Each one goes dark when a system fails.
/// This is the heartbeat of the ship made visible.
class LumenIndicator extends StatelessWidget {
  final LumenState lumenState;
  final bool compact;

  const LumenIndicator({
    super.key,
    required this.lumenState,
    this.compact = false,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        if (!compact)
          Padding(
            padding: const EdgeInsets.only(bottom: 4),
            child: Text(
              'LUMEN ${lumenState.count}/${AppConstants.lumenMax}',
              style: TerminusTheme.terminalFont(
                fontSize: 11,
                color: _headerColor,
              ),
            ),
          ),
        Row(
          mainAxisSize: MainAxisSize.min,
          children: List.generate(AppConstants.lumenMax, (index) {
            final isAlive = index < lumenState.count;
            return _LumenBlock(
              isAlive: isAlive,
              index: index,
              lumenCount: lumenState.count,
            );
          }),
        ),
        if (!compact)
          Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Text(
              lumenState.currentSystemStatus,
              style: TerminusTheme.terminalFont(
                fontSize: 10,
                color: _statusColor,
              ),
            ),
          ),
      ],
    );
  }

  Color get _headerColor {
    if (lumenState.isReactorCritical) return TerminusTheme.critical;
    if (lumenState.count <= 5) return TerminusTheme.amber;
    return TerminusTheme.phosphorDim;
  }

  Color get _statusColor {
    if (lumenState.isReactorCritical) return TerminusTheme.critical;
    if (lumenState.count <= 5) return TerminusTheme.amber;
    return TerminusTheme.phosphorDim;
  }
}

class _LumenBlock extends StatelessWidget {
  final bool isAlive;
  final int index;
  final int lumenCount;

  const _LumenBlock({
    required this.isAlive,
    required this.index,
    required this.lumenCount,
  });

  @override
  Widget build(BuildContext context) {
    Color blockColor;
    if (!isAlive) {
      blockColor = TerminusTheme.offline;
    } else if (lumenCount <= 2) {
      blockColor = TerminusTheme.critical;
    } else if (lumenCount <= 5) {
      blockColor = TerminusTheme.amber;
    } else {
      blockColor = TerminusTheme.phosphorGreen;
    }

    return Container(
      width: 20,
      height: 10,
      margin: const EdgeInsets.only(right: 3),
      decoration: BoxDecoration(
        color: isAlive ? blockColor : blockColor.withValues(alpha: 0.15),
        border: Border.all(
          color: blockColor.withValues(alpha: 0.4),
          width: 0.5,
        ),
        boxShadow: isAlive
            ? [
                BoxShadow(
                  color: blockColor.withValues(alpha: 0.3),
                  blurRadius: 4,
                  spreadRadius: 1,
                ),
              ]
            : null,
      ),
    );
  }
}
