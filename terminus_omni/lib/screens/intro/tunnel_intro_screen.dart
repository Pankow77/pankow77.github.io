import 'dart:math';
import 'package:flutter/material.dart';
import '../../config/theme.dart';
import '../../widgets/scanline_overlay.dart';
import '../home/home_screen.dart';

/// Tunnel intro — the player is drawn into TERMINUS-OMNI.
///
/// Concentric neon rectangles rush forward in perspective,
/// creating the illusion of moving through a dark corridor.
/// After 6 seconds (or on tap), transitions to HomeScreen.
class TunnelIntroScreen extends StatefulWidget {
  const TunnelIntroScreen({super.key});

  @override
  State<TunnelIntroScreen> createState() => _TunnelIntroScreenState();
}

class _TunnelIntroScreenState extends State<TunnelIntroScreen>
    with TickerProviderStateMixin {
  late AnimationController _tunnelLoop;
  late AnimationController _timeline;
  bool _navigated = false;

  @override
  void initState() {
    super.initState();

    // Continuous tunnel frame cycling (looping)
    _tunnelLoop = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2500),
    )..repeat();

    // Master timeline: 6 seconds total
    //  0.00–0.12  fade in from black
    //  0.12–0.25  title fades in
    //  0.25–0.55  steady tunnel + title
    //  0.55–0.65  "TAP TO ENTER" visible
    //  0.65–0.82  acceleration, title zooms away
    //  0.82–1.00  fade to black → navigate
    _timeline = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 6500),
    )..forward();

    _timeline.addStatusListener((s) {
      if (s == AnimationStatus.completed) _enter();
    });
  }

  @override
  void dispose() {
    _tunnelLoop.dispose();
    _timeline.dispose();
    super.dispose();
  }

  void _enter() {
    if (_navigated) return;
    _navigated = true;
    Navigator.of(context).pushReplacement(
      PageRouteBuilder(
        pageBuilder: (_, __, ___) => const HomeScreen(),
        transitionDuration: const Duration(milliseconds: 600),
        transitionsBuilder: (_, a, __, child) =>
            FadeTransition(opacity: a, child: child),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: _enter,
      child: ScanlineOverlay(
        child: Scaffold(
          backgroundColor: Colors.black,
          body: AnimatedBuilder(
            animation: Listenable.merge([_tunnelLoop, _timeline]),
            builder: (context, _) {
              final t = _timeline.value;

              return Stack(
                children: [
                  // ── Layer 0: Tunnel ──
                  Positioned.fill(
                    child: CustomPaint(
                      painter: _TunnelPainter(
                        loop: _tunnelLoop.value,
                        phase: t,
                      ),
                    ),
                  ),

                  // ── Layer 1: Title ──
                  if (t > 0.12 && t < 0.82)
                    Center(child: _buildTitle(t)),

                  // ── Layer 2: "TAP TO ENTER" ──
                  if (t > 0.30 && t < 0.70)
                    Positioned(
                      bottom: 80,
                      left: 0,
                      right: 0,
                      child: _buildEnterPrompt(t),
                    ),

                  // ── Layer 3: Fade to black ──
                  if (t > 0.82)
                    Positioned.fill(
                      child: ColoredBox(
                        color: Colors.black.withValues(
                          alpha: ((t - 0.82) / 0.18).clamp(0.0, 1.0),
                        ),
                      ),
                    ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }

  // ── Title: TERMINUS / OMNI ──
  Widget _buildTitle(double t) {
    double opacity;
    double scale;

    if (t < 0.25) {
      // Fade in
      opacity = ((t - 0.12) / 0.13).clamp(0.0, 1.0);
      scale = 1.0;
    } else if (t < 0.65) {
      // Hold steady
      opacity = 1.0;
      scale = 1.0;
    } else {
      // Zoom into tunnel + fade
      final exit = ((t - 0.65) / 0.17).clamp(0.0, 1.0);
      opacity = 1.0 - exit;
      scale = 1.0 + exit * 5.0;
    }

    return Opacity(
      opacity: opacity,
      child: Transform.scale(
        scale: scale,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'TERMINUS',
              style: TerminusTheme.displayLarge.copyWith(
                fontSize: 38,
                shadows: [
                  Shadow(
                    color: TerminusTheme.neonCyan.withValues(alpha: 0.8),
                    blurRadius: 24,
                  ),
                  Shadow(
                    color: TerminusTheme.neonCyan.withValues(alpha: 0.3),
                    blurRadius: 50,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 6),
            Text(
              'O M N I',
              style: TerminusTheme.displayMedium.copyWith(
                letterSpacing: 16,
                color: TerminusTheme.neonCyan.withValues(alpha: 0.55),
                shadows: [
                  Shadow(
                    color: TerminusTheme.neonCyan.withValues(alpha: 0.5),
                    blurRadius: 18,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            // Glow separator
            Container(
              width: 200,
              height: 1,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    Colors.transparent,
                    TerminusTheme.neonCyan.withValues(alpha: 0.5),
                    Colors.transparent,
                  ],
                ),
                boxShadow: [
                  BoxShadow(
                    color: TerminusTheme.neonCyan.withValues(alpha: 0.3),
                    blurRadius: 8,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            Text(
              'THE INEVITABILITY ENGINE',
              style: TerminusTheme.systemLog.copyWith(
                fontSize: 9,
                color: TerminusTheme.neonRed.withValues(alpha: 0.5),
                letterSpacing: 3,
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── Pulsing "TAP TO ENTER" prompt ──
  Widget _buildEnterPrompt(double t) {
    final fadeIn = ((t - 0.30) / 0.08).clamp(0.0, 1.0);
    final fadeOut = 1.0 - ((t - 0.62) / 0.08).clamp(0.0, 1.0);
    final pulse =
        (sin(_tunnelLoop.value * 2 * pi * 2) * 0.3 + 0.7).clamp(0.3, 1.0);

    return Opacity(
      opacity: fadeIn * fadeOut * pulse,
      child: Text(
        '[ TAP TO ENTER ]',
        textAlign: TextAlign.center,
        style: TerminusTheme.systemLog.copyWith(
          color: TerminusTheme.neonCyan.withValues(alpha: 0.7),
          letterSpacing: 4,
          fontSize: 11,
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════
//  Custom Painter: Neon tunnel in perspective
// ═══════════════════════════════════════════════════════════════════

class _TunnelPainter extends CustomPainter {
  final double loop;
  final double phase;

  static const int _ringCount = 18;

  _TunnelPainter({required this.loop, required this.phase});

  @override
  void paint(Canvas canvas, Size size) {
    final cx = size.width / 2;
    final cy = size.height / 2;

    // Master fade-in (first 12% of timeline)
    final fadeIn = (phase / 0.12).clamp(0.0, 1.0);

    // Speed multiplier: accelerates in final third
    final speed =
        phase < 0.65 ? 1.0 : 1.0 + (phase - 0.65) / 0.35 * 6.0;

    // ── Vanishing-point glow ──
    final vpRadius = 80.0 + (phase > 0.65 ? (phase - 0.65) * 200 : 0);
    final vpPaint = Paint()
      ..shader = RadialGradient(
        colors: [
          TerminusTheme.neonCyan.withValues(alpha: 0.12 * fadeIn),
          TerminusTheme.neonCyan.withValues(alpha: 0.0),
        ],
      ).createShader(
        Rect.fromCircle(center: Offset(cx, cy), radius: vpRadius),
      );
    canvas.drawCircle(Offset(cx, cy), vpRadius, vpPaint);

    // ── Perspective guide lines (edges of corridor) ──
    _drawGuideLines(canvas, size, cx, cy, fadeIn);

    // ── Floor/ceiling depth lines ──
    _drawDepthLines(canvas, size, cx, cy, fadeIn, speed);

    // ── Tunnel rings (concentric rectangles) ──
    for (int i = 0; i < _ringCount; i++) {
      final ringT = ((loop * speed) + i / _ringCount) % 1.0;

      // Exponential scale for perspective illusion
      final scale = pow(ringT, 0.55).toDouble();
      if (scale < 0.02) continue;

      final halfW = cx * scale * 1.4;
      final halfH = cy * scale * 1.4;

      // Opacity: fade near vanishing point and near camera
      double alpha;
      if (ringT < 0.08) {
        alpha = ringT / 0.08;
      } else if (ringT > 0.88) {
        alpha = (1.0 - ringT) / 0.12;
      } else {
        alpha = 1.0;
      }
      alpha *= fadeIn * 0.55;
      if (alpha <= 0.01) continue;

      final rect = Rect.fromCenter(
        center: Offset(cx, cy),
        width: halfW * 2,
        height: halfH * 2,
      );

      // Solid neon outline
      canvas.drawRect(
        rect,
        Paint()
          ..color = TerminusTheme.neonCyan.withValues(alpha: alpha * 0.5)
          ..style = PaintingStyle.stroke
          ..strokeWidth = 1.0 + scale * 2.0,
      );

      // Glow layer
      canvas.drawRect(
        rect,
        Paint()
          ..color = TerminusTheme.neonCyan.withValues(alpha: alpha * 0.15)
          ..style = PaintingStyle.stroke
          ..strokeWidth = 4.0 + scale * 8.0
          ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 10),
      );
    }

    // ── Speed streaks during acceleration ──
    if (phase > 0.58) {
      _drawSpeedStreaks(canvas, size, cx, cy, fadeIn);
    }
  }

  /// Perspective lines from center to corners/edges (corridor structure)
  void _drawGuideLines(
      Canvas canvas, Size size, double cx, double cy, double fadeIn) {
    final paint = Paint()
      ..color = TerminusTheme.neonCyan.withValues(alpha: 0.05 * fadeIn)
      ..strokeWidth = 0.5;

    final glowPaint = Paint()
      ..color = TerminusTheme.neonCyan.withValues(alpha: 0.03 * fadeIn)
      ..strokeWidth = 3
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 4);

    final center = Offset(cx, cy);
    final endpoints = [
      Offset.zero,
      Offset(size.width, 0),
      Offset(0, size.height),
      Offset(size.width, size.height),
      Offset(0, cy),
      Offset(size.width, cy),
      Offset(cx, 0),
      Offset(cx, size.height),
    ];

    for (final ep in endpoints) {
      canvas.drawLine(center, ep, glowPaint);
      canvas.drawLine(center, ep, paint);
    }
  }

  /// Horizontal depth lines on floor and ceiling for corridor feel
  void _drawDepthLines(Canvas canvas, Size size, double cx, double cy,
      double fadeIn, double speed) {
    final paint = Paint()
      ..color = TerminusTheme.neonCyan.withValues(alpha: 0.04 * fadeIn)
      ..strokeWidth = 0.5;

    const lineCount = 12;
    for (int i = 0; i < lineCount; i++) {
      final depthT = ((loop * speed * 0.7) + i / lineCount) % 1.0;
      final scale = pow(depthT, 0.55).toDouble();
      if (scale < 0.03) continue;

      final halfH = cy * scale * 1.4;
      final halfW = cx * scale * 1.4;

      double alpha;
      if (depthT < 0.1) {
        alpha = depthT / 0.1;
      } else if (depthT > 0.85) {
        alpha = (1.0 - depthT) / 0.15;
      } else {
        alpha = 1.0;
      }
      alpha *= fadeIn * 0.3;
      if (alpha <= 0.01) continue;

      final linePaint = Paint()
        ..color = TerminusTheme.neonCyan.withValues(alpha: alpha * 0.15)
        ..strokeWidth = 0.5;

      // Floor line
      final floorY = cy + halfH;
      canvas.drawLine(
        Offset(cx - halfW, floorY),
        Offset(cx + halfW, floorY),
        linePaint,
      );
      // Ceiling line
      final ceilY = cy - halfH;
      canvas.drawLine(
        Offset(cx - halfW, ceilY),
        Offset(cx + halfW, ceilY),
        linePaint,
      );
    }
  }

  /// Radial speed streaks during acceleration phase
  void _drawSpeedStreaks(
      Canvas canvas, Size size, double cx, double cy, double fadeIn) {
    final rng = Random(42);
    final intensity = ((phase - 0.58) / 0.30).clamp(0.0, 1.0);
    final count = (50 * intensity).round();

    for (int i = 0; i < count; i++) {
      final angle = rng.nextDouble() * 2 * pi;
      final dist = 20.0 + rng.nextDouble() * 60;
      final len = 40.0 + rng.nextDouble() * 150 * intensity;

      final startX = cx + cos(angle) * dist;
      final startY = cy + sin(angle) * dist;
      final endX = cx + cos(angle) * (dist + len);
      final endY = cy + sin(angle) * (dist + len);

      canvas.drawLine(
        Offset(startX, startY),
        Offset(endX, endY),
        Paint()
          ..color = Colors.white.withValues(
            alpha: (0.06 + rng.nextDouble() * 0.18 * intensity) * fadeIn,
          )
          ..strokeWidth = 0.4 + rng.nextDouble() * 0.8,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _TunnelPainter old) =>
      old.loop != loop || old.phase != phase;
}
