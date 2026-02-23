import 'package:flutter/material.dart';
import '../config/theme.dart';

/// CRT monitor frame — wraps content in a retro terminal bezel.
/// Inspired by the concept art: the physical monitor with rust,
/// scan artifacts, and phosphor glow.
class CRTFrame extends StatelessWidget {
  final Widget child;
  final Color borderColor;
  final double cornerRadius;
  final bool showScanlines;
  final String? headerLabel;
  final String? footerLabel;

  const CRTFrame({
    super.key,
    required this.child,
    this.borderColor = const Color(0xFF1A2A40),
    this.cornerRadius = 8,
    this.showScanlines = true,
    this.headerLabel,
    this.footerLabel,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(cornerRadius + 4),
        border: Border.all(
          color: borderColor,
          width: 3,
        ),
        boxShadow: [
          BoxShadow(
            color: borderColor.withValues(alpha: 0.3),
            blurRadius: 12,
            spreadRadius: 2,
          ),
          const BoxShadow(
            color: Color(0xFF000000),
            blurRadius: 20,
            spreadRadius: -4,
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(cornerRadius),
        child: Container(
          color: const Color(0xFF020408),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Header bar
              if (headerLabel != null)
                Container(
                  width: double.infinity,
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: borderColor.withValues(alpha: 0.4),
                    border: Border(
                      bottom: BorderSide(
                        color: borderColor.withValues(alpha: 0.6),
                        width: 1,
                      ),
                    ),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 6,
                        height: 6,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: TerminusTheme.neonGreen.withValues(alpha: 0.6),
                          boxShadow: [
                            BoxShadow(
                              color: TerminusTheme.neonGreen
                                  .withValues(alpha: 0.3),
                              blurRadius: 4,
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        headerLabel!,
                        style: TextStyle(
                          fontFamily: 'ShareTechMono',
                          fontSize: 9,
                          color:
                              TerminusTheme.textDim.withValues(alpha: 0.6),
                          letterSpacing: 1,
                        ),
                      ),
                    ],
                  ),
                ),

              // Content with scanline overlay
              Stack(
                children: [
                  child,
                  if (showScanlines)
                    Positioned.fill(
                      child: IgnorePointer(
                        child: CustomPaint(
                          painter: _CRTScanlinePainter(),
                        ),
                      ),
                    ),
                  // Vignette effect
                  Positioned.fill(
                    child: IgnorePointer(
                      child: DecoratedBox(
                        decoration: BoxDecoration(
                          gradient: RadialGradient(
                            center: Alignment.center,
                            radius: 1.2,
                            colors: [
                              Colors.transparent,
                              Colors.black.withValues(alpha: 0.3),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),

              // Footer bar
              if (footerLabel != null)
                Container(
                  width: double.infinity,
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                  decoration: BoxDecoration(
                    color: borderColor.withValues(alpha: 0.3),
                    border: Border(
                      top: BorderSide(
                        color: borderColor.withValues(alpha: 0.5),
                        width: 1,
                      ),
                    ),
                  ),
                  child: Text(
                    footerLabel!,
                    style: TextStyle(
                      fontFamily: 'ShareTechMono',
                      fontSize: 8,
                      color: TerminusTheme.textDim.withValues(alpha: 0.4),
                      letterSpacing: 1,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CRTScanlinePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.black.withValues(alpha: 0.06)
      ..strokeWidth = 1;

    for (double y = 0; y < size.height; y += 2.5) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), paint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
