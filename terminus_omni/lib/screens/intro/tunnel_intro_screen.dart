import 'dart:math';
import 'package:flutter/material.dart';
import '../../widgets/scanline_overlay.dart';
import '../../widgets/visual_engine/tunnel_corridor_painter.dart';
import '../home/home_screen.dart';

/// Tunnel intro — the player is drawn into TERMINUS-OMNI.
///
/// A 3D code corridor: walls covered in dense characters, floor with
/// circular data-nodes, everything converging to a dark vanishing point.
/// The image is "risucchiata nel nero" — sucked into the void.
/// After 6.5 seconds (or on tap), transitions to HomeScreen.
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

    // Continuous corridor scroll (slower loop for immersive pull)
    _tunnelLoop = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 4000),
    )..repeat();

    // Master timeline: 6.5 seconds total
    //  0.00–0.12  fade in from black
    //  0.12–0.25  title fades in
    //  0.25–0.55  steady corridor + title
    //  0.55–0.65  "TAP TO ENTER" visible
    //  0.65–0.82  acceleration, title zooms into VP
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
                  // ── Layer 0: 3D Code Corridor ──
                  Positioned.fill(
                    child: CustomPaint(
                      painter: TunnelCorridorPainter(
                        loop: _tunnelLoop.value,
                        phase: t,
                      ),
                    ),
                  ),

                  // ── Layer 1: TERMINUS OMNI title ──
                  if (t > 0.12 && t < 0.82)
                    Positioned(
                      top: 0,
                      left: 0,
                      right: 0,
                      child: SafeArea(
                        child: Padding(
                          padding: const EdgeInsets.only(top: 32),
                          child: _buildTitle(t),
                        ),
                      ),
                    ),

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
                        color: Colors.black.withOpacity(
                          ((t - 0.82) / 0.18).clamp(0.0, 1.0),
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

  // ── Title: TERMINUS / OMNI — white phosphor glow ──
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
      // Zoom into VP + fade
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
              style: TextStyle(
                fontFamily: 'Orbitron',
                fontSize: 34,
                fontWeight: FontWeight.w700,
                color: Colors.white.withOpacity(0.92),
                letterSpacing: 6,
                shadows: [
                  Shadow(
                    color: const Color(0xFFB0D0C0).withOpacity(0.5),
                    blurRadius: 18,
                  ),
                  Shadow(
                    color: const Color(0xFFB0D0C0).withOpacity(0.2),
                    blurRadius: 40,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'O M N I',
              style: TextStyle(
                fontFamily: 'Orbitron',
                fontSize: 15,
                fontWeight: FontWeight.w600,
                letterSpacing: 14,
                color: const Color(0xFFB0D0C0).withOpacity(0.55),
                shadows: [
                  Shadow(
                    color: const Color(0xFFB0D0C0).withOpacity(0.3),
                    blurRadius: 12,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),
            // Thin phosphor separator
            Container(
              width: 180,
              height: 1,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    Colors.transparent,
                    const Color(0xFFB0D0C0).withOpacity(0.35),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
            const SizedBox(height: 10),
            Text(
              'THE INEVITABILITY ENGINE',
              style: TextStyle(
                fontFamily: 'ShareTechMono',
                fontSize: 9,
                color: const Color(0xFFFF003C).withOpacity(0.45),
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
        style: TextStyle(
          fontFamily: 'ShareTechMono',
          fontSize: 11,
          color: const Color(0xFFB0D0C0).withOpacity(0.6),
          letterSpacing: 4,
        ),
      ),
    );
  }
}
