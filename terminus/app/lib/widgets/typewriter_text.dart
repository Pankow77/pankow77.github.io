import 'dart:async';
import 'dart:math';
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

  /// When true, the text appears with irregular timing, character corruption,
  /// and visual glitches. Used for the Ghost — a signal that shouldn't exist.
  final bool ghostMode;

  const TypewriterText(
    this.text, {
    super.key,
    this.color,
    this.fontSize,
    this.charDelay = const Duration(milliseconds: AppConstants.typewriterCharDelay),
    this.onComplete,
    this.ghostMode = false,
  });

  @override
  State<TypewriterText> createState() => _TypewriterTextState();
}

class _TypewriterTextState extends State<TypewriterText> {
  int _currentLength = 0;
  Timer? _timer;
  bool _completed = false;
  final _random = Random();

  // Ghost mode: tracks which characters are currently "corrupted"
  final Set<int> _corruptedIndices = {};

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
    if (widget.ghostMode) {
      _startGhostTyping();
    } else {
      _startNormalTyping();
    }
  }

  void _startNormalTyping() {
    _timer = Timer.periodic(widget.charDelay, (timer) {
      if (_currentLength >= widget.text.length) {
        timer.cancel();
        _complete();
        return;
      }
      setState(() {
        _currentLength++;
      });
    });
  }

  /// Ghost typing: irregular delays, occasional pauses, character corruption.
  /// The Ghost's voice is an interference pattern — it shouldn't be here.
  void _startGhostTyping() {
    _scheduleNextGhostChar();
  }

  void _scheduleNextGhostChar() {
    if (_currentLength >= widget.text.length) {
      _complete();
      return;
    }

    // Irregular timing: base delay + random jitter + occasional long pauses
    var delay = widget.charDelay.inMilliseconds;

    // Random jitter: ±50% of base delay
    delay += _random.nextInt(delay) - (delay ~/ 2);

    // 15% chance of a long pause (the signal drops out)
    if (_random.nextDouble() < 0.15) {
      delay += 200 + _random.nextInt(400);
    }

    // 8% chance of a very long pause (the Ghost hesitates)
    if (_random.nextDouble() < 0.08) {
      delay += 600 + _random.nextInt(800);
    }

    // 5% chance of rapid burst (3-4 chars at once, signal spike)
    final burstCount = _random.nextDouble() < 0.05
        ? 2 + _random.nextInt(3)
        : 1;

    _timer = Timer(Duration(milliseconds: max(10, delay)), () {
      if (!mounted) return;
      setState(() {
        _currentLength = min(_currentLength + burstCount, widget.text.length);

        // 10% chance of temporarily corrupting a visible character
        if (_random.nextDouble() < 0.10 && _currentLength > 1) {
          final corruptIndex = _random.nextInt(_currentLength);
          _corruptedIndices.add(corruptIndex);

          // Corruption heals after 100-400ms
          Timer(Duration(milliseconds: 100 + _random.nextInt(300)), () {
            if (mounted) {
              setState(() => _corruptedIndices.remove(corruptIndex));
            }
          });
        }
      });
      _scheduleNextGhostChar();
    });
  }

  void _complete() {
    if (!_completed) {
      _completed = true;
      widget.onComplete?.call();
    }
  }

  /// Skip to the end (tap to skip).
  void skipToEnd() {
    _timer?.cancel();
    setState(() {
      _currentLength = widget.text.length;
      _corruptedIndices.clear();
    });
    _complete();
  }

  @override
  Widget build(BuildContext context) {
    final baseColor = widget.color ?? TerminusTheme.phosphorGreen;
    final baseFontSize = widget.fontSize ?? 14.0;
    final showCursor = _currentLength < widget.text.length;

    return GestureDetector(
      onTap: skipToEnd,
      child: widget.ghostMode
          ? _buildGhostText(baseColor, baseFontSize, showCursor)
          : _buildNormalText(baseColor, baseFontSize, showCursor),
    );
  }

  Widget _buildNormalText(Color color, double fontSize, bool showCursor) {
    final displayText = widget.text.substring(0, _currentLength);
    return RichText(
      text: TextSpan(
        style: TerminusTheme.terminalFont(color: color, fontSize: fontSize),
        children: [
          TextSpan(text: displayText),
          if (showCursor)
            TextSpan(
              text: '█',
              style: TerminusTheme.terminalFont(
                color: color.withValues(alpha: 0.7),
                fontSize: fontSize,
              ),
            ),
        ],
      ),
    );
  }

  /// Ghost text: individual characters can be corrupted, flickering, wrong.
  Widget _buildGhostText(Color color, double fontSize, bool showCursor) {
    final displayText = widget.text.substring(0, _currentLength);
    final spans = <InlineSpan>[];

    // Glitch characters used for corruption
    const glitchChars = '░▒▓█▄▀╔╗╚╝║═┃━▪▫◊◈⌐¬¼½';

    for (var i = 0; i < displayText.length; i++) {
      final isCorrupted = _corruptedIndices.contains(i);
      final char = isCorrupted
          ? glitchChars[_random.nextInt(glitchChars.length)]
          : displayText[i];

      // Ghost text has slight alpha variation per character
      final alphaJitter = isCorrupted
          ? 0.3 + _random.nextDouble() * 0.4
          : 0.6 + _random.nextDouble() * 0.4;

      spans.add(TextSpan(
        text: char,
        style: TerminusTheme.terminalFont(
          color: color.withValues(alpha: alphaJitter),
          fontSize: fontSize,
        ),
      ));
    }

    if (showCursor) {
      // Ghost cursor: irregular blink via random alpha
      spans.add(TextSpan(
        text: '▌',
        style: TerminusTheme.terminalFont(
          color: color.withValues(alpha: 0.3 + _random.nextDouble() * 0.4),
          fontSize: fontSize,
        ),
      ));
    }

    return RichText(text: TextSpan(children: spans));
  }
}
