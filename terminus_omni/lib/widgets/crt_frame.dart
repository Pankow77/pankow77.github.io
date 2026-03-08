import 'package:flutter/material.dart';
import '../config/theme.dart';

/// CRT monitor frame — REDESIGNED with industrial depth.
///
/// Multi-layer border with metallic accents, inner glow,
/// rich header/footer bars, and subtle scan artifacts.
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
    this.borderColor = const Color(0xFF1A2E50),
    this.cornerRadius = 10,
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
          color: borderColor.withValues(alpha: 0.5),
          width: 2,
        ),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            borderColor.withValues(alpha: 0.15),
            const Color(0xFF020408),
            borderColor.withValues(alpha: 0.1),
          ],
        ),
        boxShadow: [
          // Outer glow
          BoxShadow(
            color: borderColor.withValues(alpha: 0.2),
            blurRadius: 16,
            spreadRadius: 1,
          ),
          // Deep shadow
          const BoxShadow(
            color: Color(0xDD000000),
            blurRadius: 24,
            spreadRadius: -2,
            offset: Offset(0, 4),
          ),
          // Inner glow illusion (spread inward)
          BoxShadow(
            color: borderColor.withValues(alpha: 0.08),
            blurRadius: 40,
            spreadRadius: -8,
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(cornerRadius),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Header bar
            if (headerLabel != null)
              Container(
                width: double.infinity,
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      borderColor.withValues(alpha: 0.3),
                      borderColor.withValues(alpha: 0.15),
                      borderColor.withValues(alpha: 0.3),
                    ],
                  ),
                  border: Border(
                    bottom: BorderSide(
                      color: borderColor.withValues(alpha: 0.5),
                      width: 1,
                    ),
                  ),
                ),
                child: Row(
                  children: [
                    // Status LED
                    Container(
                      width: 7,
                      height: 7,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: TerminusTheme.neonGreen.withValues(alpha: 0.7),
                        boxShadow: [
                          BoxShadow(
                            color:
                                TerminusTheme.neonGreen.withValues(alpha: 0.4),
                            blurRadius: 6,
                            spreadRadius: 1,
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      headerLabel!,
                      style: TextStyle(
                        fontFamily: 'ShareTechMono',
                        fontSize: 10,
                        color: TerminusTheme.textSecondary.withValues(alpha: 0.7),
                        letterSpacing: 1.5,
                      ),
                    ),
                    const Spacer(),
                    // Decorative dots
                    ...List.generate(
                      3,
                      (i) => Padding(
                        padding: const EdgeInsets.only(left: 4),
                        child: Container(
                          width: 5,
                          height: 5,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            border: Border.all(
                              color:
                                  TerminusTheme.textDim.withValues(alpha: 0.3),
                              width: 0.5,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),

            // Content with scanline overlay and vignette
            Expanded(
              child: Stack(
                children: [
                  // Dark inner bg
                  const Positioned.fill(
                    child: ColoredBox(color: Color(0xFF030610)),
                  ),
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
                              Colors.black.withValues(alpha: 0.25),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // Footer bar
            if (footerLabel != null)
              Container(
                width: double.infinity,
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      borderColor.withValues(alpha: 0.2),
                      borderColor.withValues(alpha: 0.1),
                      borderColor.withValues(alpha: 0.2),
                    ],
                  ),
                  border: Border(
                    top: BorderSide(
                      color: borderColor.withValues(alpha: 0.4),
                      width: 1,
                    ),
                  ),
                ),
                child: Text(
                  footerLabel!,
                  style: TextStyle(
                    fontFamily: 'ShareTechMono',
                    fontSize: 9,
                    color: TerminusTheme.textDim.withValues(alpha: 0.5),
                    letterSpacing: 1.5,
                  ),
                  textAlign: TextAlign.center,
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _CRTScanlinePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.black.withValues(alpha: 0.05)
      ..strokeWidth = 1;

    for (double y = 0; y < size.height; y += 3) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), paint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
