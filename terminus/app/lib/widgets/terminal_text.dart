import 'package:flutter/material.dart';
import '../config/theme.dart';

/// A styled terminal text widget.
///
/// Green phosphor on black. The aesthetic of the ship computer.
class TerminalText extends StatelessWidget {
  final String text;
  final Color? color;
  final double? fontSize;
  final FontWeight? fontWeight;
  final TextAlign? textAlign;
  final int? maxLines;
  final TextOverflow? overflow;

  const TerminalText(
    this.text, {
    super.key,
    this.color,
    this.fontSize,
    this.fontWeight,
    this.textAlign,
    this.maxLines,
    this.overflow,
  });

  /// Dim system text.
  const TerminalText.dim(
    this.text, {
    super.key,
    this.fontSize,
    this.fontWeight,
    this.textAlign,
    this.maxLines,
    this.overflow,
  }) : color = TerminusTheme.phosphorDim;

  /// Warning text (amber).
  const TerminalText.warning(
    this.text, {
    super.key,
    this.fontSize,
    this.fontWeight,
    this.textAlign,
    this.maxLines,
    this.overflow,
  }) : color = TerminusTheme.amber;

  /// Critical text (red).
  const TerminalText.critical(
    this.text, {
    super.key,
    this.fontSize,
    this.fontWeight,
    this.textAlign,
    this.maxLines,
    this.overflow,
  }) : color = TerminusTheme.critical;

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: TerminusTheme.terminalFont(
        color: color ?? TerminusTheme.phosphorGreen,
        fontSize: fontSize ?? 14.0,
        fontWeight: fontWeight ?? FontWeight.normal,
      ),
      textAlign: textAlign,
      maxLines: maxLines,
      overflow: overflow,
    );
  }
}
