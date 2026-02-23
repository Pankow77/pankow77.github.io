import 'dart:math';
import 'package:flutter/material.dart';
import '../config/theme.dart';

/// Interactive terminal grid — the "keyboard" from the concept art.
/// Each key represents a narrative action. Colors degrade from
/// green (safe/coherent) to red (chaotic/entropic) based on game state.
class TerminalGrid extends StatelessWidget {
  final int currentLumen;
  final List<TerminalAction> actions;
  final void Function(TerminalAction action) onActionTap;

  const TerminalGrid({
    super.key,
    required this.currentLumen,
    required this.actions,
    required this.onActionTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: const Color(0xFF050A10),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(
          color: TerminusTheme.border.withValues(alpha: 0.4),
        ),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Grid header
          Row(
            children: [
              Text(
                'ACTION MATRIX',
                style: TextStyle(
                  fontFamily: 'ShareTechMono',
                  fontSize: 9,
                  color: TerminusTheme.textDim.withValues(alpha: 0.5),
                  letterSpacing: 2,
                ),
              ),
              const Spacer(),
              Text(
                'L:$currentLumen',
                style: TextStyle(
                  fontFamily: 'ShareTechMono',
                  fontSize: 9,
                  color: TerminusTheme.lumenColor(currentLumen),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          // Action grid
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: actions.map((action) {
              return _TerminalKey(
                action: action,
                currentLumen: currentLumen,
                onTap: () => onActionTap(action),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }
}

class _TerminalKey extends StatefulWidget {
  final TerminalAction action;
  final int currentLumen;
  final VoidCallback onTap;

  const _TerminalKey({
    required this.action,
    required this.currentLumen,
    required this.onTap,
  });

  @override
  State<_TerminalKey> createState() => _TerminalKeyState();
}

class _TerminalKeyState extends State<_TerminalKey>
    with SingleTickerProviderStateMixin {
  late AnimationController _glowController;
  bool _isPressed = false;

  @override
  void initState() {
    super.initState();
    _glowController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _glowController.dispose();
    super.dispose();
  }

  Color _keyColor() {
    switch (widget.action.type) {
      case ActionType.coherent:
        return TerminusTheme.neonGreen;
      case ActionType.neutral:
        return TerminusTheme.neonCyan;
      case ActionType.entropic:
        return TerminusTheme.neonRed;
      case ActionType.desperate:
        return TerminusTheme.neonOrange;
    }
  }

  @override
  Widget build(BuildContext context) {
    final color = _keyColor();
    final isDisabled = widget.action.requiredLumen > widget.currentLumen;

    return AnimatedBuilder(
      animation: _glowController,
      builder: (context, child) {
        final glowIntensity = isDisabled
            ? 0.0
            : 0.1 + _glowController.value * 0.15;

        return GestureDetector(
          onTapDown: (_) => setState(() => _isPressed = true),
          onTapUp: (_) {
            setState(() => _isPressed = false);
            if (!isDisabled) widget.onTap();
          },
          onTapCancel: () => setState(() => _isPressed = false),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 100),
            width: widget.action.isWide ? 140 : 65,
            height: 44,
            transform: _isPressed
                ? (Matrix4.identity()..translate(0.0, 2.0))
                : Matrix4.identity(),
            decoration: BoxDecoration(
              color: isDisabled
                  ? const Color(0xFF0A0E14)
                  : Color.lerp(
                      const Color(0xFF0A1018),
                      color.withValues(alpha: 0.1),
                      glowIntensity,
                    ),
              borderRadius: BorderRadius.circular(4),
              border: Border.all(
                color: isDisabled
                    ? TerminusTheme.border.withValues(alpha: 0.2)
                    : color.withValues(alpha: 0.3 + glowIntensity),
                width: 1,
              ),
              boxShadow: isDisabled
                  ? null
                  : [
                      BoxShadow(
                        color: color.withValues(alpha: glowIntensity * 0.4),
                        blurRadius: 8,
                        spreadRadius: -2,
                      ),
                      if (_isPressed)
                        BoxShadow(
                          color: color.withValues(alpha: 0.2),
                          blurRadius: 12,
                          spreadRadius: 0,
                        ),
                    ],
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  widget.action.label,
                  style: TextStyle(
                    fontFamily: 'ShareTechMono',
                    fontSize: widget.action.isWide ? 10 : 9,
                    color: isDisabled
                        ? TerminusTheme.textDim.withValues(alpha: 0.2)
                        : color.withValues(alpha: 0.8),
                    letterSpacing: 0.5,
                  ),
                  textAlign: TextAlign.center,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                if (widget.action.cost != null)
                  Text(
                    widget.action.cost!,
                    style: TextStyle(
                      fontFamily: 'ShareTechMono',
                      fontSize: 7,
                      color: isDisabled
                          ? TerminusTheme.textDim.withValues(alpha: 0.15)
                          : TerminusTheme.textDim.withValues(alpha: 0.4),
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

/// A single action on the terminal grid.
class TerminalAction {
  final String id;
  final String label;
  final ActionType type;
  final String? cost;
  final int requiredLumen;
  final bool isWide;
  final String prompt;

  const TerminalAction({
    required this.id,
    required this.label,
    required this.type,
    this.cost,
    this.requiredLumen = 0,
    this.isWide = false,
    required this.prompt,
  });
}

enum ActionType {
  coherent,
  neutral,
  entropic,
  desperate,
}
