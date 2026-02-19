import 'dart:async';
import 'package:flutter/material.dart';
import '../config/theme.dart';
import '../config/constants.dart';

/// Text that appears character by character, like a CRT terminal.
///
/// This is the voice of the ship. Each character materializes from the dark
/// with the rhythm of a machine that is barely holding together.
class TypewriterText extends StatefulWidget {
  final String text;
  final Color? color;
  final double? fontSize;
  final Duration charDelay;
  final VoidCallback? onComplete;

  const TypewriterText(
    this.text, {
    super.key,
    this.color,
    this.fontSize,
    this.charDelay = const Duration(milliseconds: AppConstants.typewriterCharDelay),
    this.onComplete,
  });

  @override
  State<TypewriterText> createState() => _TypewriterTextState();
}

class _TypewriterTextState extends State<TypewriterText> {
  int _currentLength = 0;
  Timer? _timer;
  bool _completed = false;

  @override
  void initState() {
    super.initState();
    _startTyping();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _startTyping() {
    _timer = Timer.periodic(widget.charDelay, (timer) {
      if (_currentLength >= widget.text.length) {
        timer.cancel();
        if (!_completed) {
          _completed = true;
          widget.onComplete?.call();
        }
        return;
      }
      setState(() {
        _currentLength++;
      });
    });
  }

  /// Skip to the end (tap to skip).
  void skipToEnd() {
    _timer?.cancel();
    setState(() {
      _currentLength = widget.text.length;
    });
    if (!_completed) {
      _completed = true;
      widget.onComplete?.call();
    }
  }

  @override
  Widget build(BuildContext context) {
    final displayText = widget.text.substring(0, _currentLength);
    final showCursor = _currentLength < widget.text.length;

    return GestureDetector(
      onTap: skipToEnd,
      child: RichText(
        text: TextSpan(
          style: TerminusTheme.terminalFont(
            color: widget.color ?? TerminusTheme.phosphorGreen,
            fontSize: widget.fontSize ?? 14.0,
          ),
          children: [
            TextSpan(text: displayText),
            if (showCursor)
              TextSpan(
                text: '█',
                style: TerminusTheme.terminalFont(
                  color: (widget.color ?? TerminusTheme.phosphorGreen)
                      .withValues(alpha: 0.7),
                  fontSize: widget.fontSize ?? 14.0,
                ),
              ),
          ],
        ),
      ),
    );
  }
}
