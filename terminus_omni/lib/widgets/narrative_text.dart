import 'package:flutter/material.dart';
import '../config/theme.dart';

/// Typewriter-style narrative text widget.
/// Text appears character by character, as if TERMINUS is speaking.
class NarrativeText extends StatefulWidget {
  final String text;
  final bool animate;
  final Duration charDelay;
  final VoidCallback? onComplete;

  const NarrativeText({
    super.key,
    required this.text,
    this.animate = true,
    this.charDelay = const Duration(milliseconds: 20),
    this.onComplete,
  });

  @override
  State<NarrativeText> createState() => _NarrativeTextState();
}

class _NarrativeTextState extends State<NarrativeText> {
  String _displayedText = '';
  bool _isAnimating = false;
  bool _skipped = false;

  @override
  void initState() {
    super.initState();
    if (widget.animate) {
      _startTypewriter();
    } else {
      _displayedText = widget.text;
    }
  }

  @override
  void didUpdateWidget(NarrativeText oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.text != widget.text) {
      _skipped = false;
      if (widget.animate) {
        _startTypewriter();
      } else {
        setState(() => _displayedText = widget.text);
      }
    }
  }

  Future<void> _startTypewriter() async {
    _isAnimating = true;
    _displayedText = '';

    for (int i = 0; i < widget.text.length; i++) {
      if (!mounted || _skipped) break;
      await Future.delayed(widget.charDelay);
      if (!mounted) return;
      setState(() {
        _displayedText = widget.text.substring(0, i + 1);
      });
    }

    if (mounted) {
      setState(() {
        _displayedText = widget.text;
        _isAnimating = false;
      });
      widget.onComplete?.call();
    }
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        if (_isAnimating) {
          _skipped = true;
          setState(() {
            _displayedText = widget.text;
            _isAnimating = false;
          });
          widget.onComplete?.call();
        }
      },
      child: RichText(
        text: TextSpan(
          text: _displayedText,
          style: TerminusTheme.narrative,
          children: _isAnimating
              ? [
                  TextSpan(
                    text: '█',
                    style: TerminusTheme.narrative.copyWith(
                      color: TerminusTheme.neonCyan.withValues(alpha: 0.7),
                    ),
                  ),
                ]
              : null,
        ),
      ),
    );
  }
}
