import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../../config/theme.dart';
import '../../widgets/visual_engine/effects/dripping_code_painter.dart';
import '../../widgets/visual_engine/effects/tunnel_painter.dart';
import '../../widgets/visual_engine/effects/scanline_shader.dart';
import '../../widgets/visual_engine/effects/jitter_effect.dart';
import '../home/home_screen.dart';

/// Tunnel intro — the player boots into TERMINUS-OMNI.
///
/// Combines boot-sequence aesthetics (dripping code, CRT scanlines,
/// system status text) with forward tunnel motion. The player is
/// drawn through the corridor into the game.
///
/// Timeline (7.5 seconds):
///   0.00–0.15  Black → dripping code fades in
///   0.15–0.30  System boot text types out, tunnel appears
///   0.30–0.55  Title fades in, tunnel moving forward
///   0.55–0.70  "TAP TO ENTER" visible
///   0.70–0.85  Acceleration: title zooms, speed streaks, tunnel rushes
///   0.85–1.00  Fade to black → navigate to HomeScreen
class TunnelIntroScreen extends StatefulWidget {
  const TunnelIntroScreen({super.key});

  @override
  State<TunnelIntroScreen> createState() => _TunnelIntroScreenState();
}

class _TunnelIntroScreenState extends State<TunnelIntroScreen>
    with TickerProviderStateMixin {
  late AnimationController _loop; // continuous cycle for effects
  late AnimationController _timeline; // master 7.5s timeline
  bool _navigated = false;

  @override
  void initState() {
    super.initState();

    _loop = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 3000),
    )..repeat();

    _timeline = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 7500),
    )..forward();

    _timeline.addStatusListener((s) {
      if (s == AnimationStatus.completed) _enter();
    });
  }

  @override
  void dispose() {
    _loop.dispose();
    _timeline.dispose();
    super.dispose();
  }

  void _enter() {
    if (_navigated) return;
    _navigated = true;
    Navigator.of(context).pushReplacement(
      PageRouteBuilder(
        pageBuilder: (_, __, ___) => const HomeScreen(),
        transitionDuration: const Duration(milliseconds: 800),
        transitionsBuilder: (_, a, __, child) =>
            FadeTransition(opacity: a, child: child),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: _enter,
      child: Scaffold(
        backgroundColor: Colors.black,
        body: AnimatedBuilder(
          animation: Listenable.merge([_loop, _timeline]),
          builder: (context, _) {
            final t = _timeline.value;
            final loopVal = _loop.value;

            // Speed multiplier for tunnel during acceleration
            final speed =
                t < 0.70 ? 1.0 : 1.0 + (t - 0.70) / 0.30 * 6.0;

            // Master fade-in
            final fadeIn = (t / 0.12).clamp(0.0, 1.0);

            // Jitter intensity (increases during acceleration)
            final jitterAmt =
                t < 0.70 ? 0.3 : 0.3 + (t - 0.70) / 0.15 * 1.5;

            return Stack(
              children: [
                // ── L0: Near-black background ──
                const ColoredBox(
                  color: Color(0xFF050505),
                  child: SizedBox.expand(),
                ),

                // ── L1: Dripping code ──
                Positioned.fill(
                  child: Opacity(
                    opacity: fadeIn * 0.45,
                    child: CustomPaint(
                      painter: DrippingCodePainter(
                        progress: loopVal,
                        lumenCount: 10,
                      ),
                    ),
                  ),
                ),

                // ── L2: Tunnel (forward motion) ──
                Positioned.fill(
                  child: Opacity(
                    opacity: fadeIn,
                    child: CustomPaint(
                      painter: _IntroTunnelPainter(
                        loop: loopVal,
                        speed: speed,
                        fadeIn: fadeIn,
                        phase: t,
                      ),
                    ),
                  ),
                ),

                // ── L3: Boot text (types in during early phase) ──
                if (t > 0.10 && t < 0.70)
                  Positioned(
                    top: MediaQuery.of(context).padding.top + 40,
                    left: 24,
                    right: 24,
                    child: _buildBootText(t),
                  ),

                // ── L4: Title (with jitter during accel) ──
                if (t > 0.25 && t < 0.88)
                  Center(
                    child: JitterEffect(
                      intensity: jitterAmt.clamp(0.0, 2.0),
                      child: _buildTitle(t),
                    ),
                  ),

                // ── L5: "TAP TO ENTER" prompt ──
                if (t > 0.45 && t < 0.72)
                  Positioned(
                    bottom: 80,
                    left: 0,
                    right: 0,
                    child: _buildEnterPrompt(t),
                  ),

                // ── L6: Speed streaks during acceleration ──
                if (t > 0.65)
                  Positioned.fill(
                    child: IgnorePointer(
                      child: CustomPaint(
                        painter: _SpeedStreaksPainter(
                          phase: t,
                          fadeIn: fadeIn,
                        ),
                      ),
                    ),
                  ),

                // ── L7: Scanline overlay ──
                Positioned.fill(
                  child: IgnorePointer(
                    child: ScanlineShader(
                      intensity: 0.25 + (t > 0.70 ? (t - 0.70) * 0.5 : 0),
                    ),
                  ),
                ),

                // ── L8: Fade to black ──
                if (t > 0.85)
                  Positioned.fill(
                    child: ColoredBox(
                      color: Colors.black.withValues(
                        alpha: ((t - 0.85) / 0.15).clamp(0.0, 1.0),
                      ),
                    ),
                  ),
              ],
            );
          },
        ),
      ),
    );
  }

  // ── Boot sequence text ──
  Widget _buildBootText(double t) {
    final lines = [
      _BootLine(0.10, 'INITIALIZING INEVITABILITY ENGINE...'),
      _BootLine(0.16, 'LUMEN COUNT: 10'),
      _BootLine(0.22, 'SCREEN BARRIER: ACTIVE'),
      _BootLine(0.28, 'CONSEQUENTIAL MEMORY: LOADED'),
      _BootLine(0.34, 'NARRATIVE CORE: ONLINE'),
      _BootLine(0.40, 'AWAITING VICTIM INPUT_'),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (final line in lines)
          if (t >= line.appearAt)
            Padding(
              padding: const EdgeInsets.only(bottom: 5),
              child: _animatedLine(line.text, t, line.appearAt),
            ),
      ],
    );
  }

  Widget _animatedLine(String text, double t, double startAt) {
    // Type in over 0.04 of timeline
    final progress = ((t - startAt) / 0.04).clamp(0.0, 1.0);
    final chars = (text.length * progress).round();
    final visible = text.substring(0, chars);

    // Flicker: slight random opacity
    final flicker =
        0.6 + math.sin(_loop.value * math.pi * 2 * 3) * 0.15;

    return Text(
      visible,
      style: TextStyle(
        fontFamily: 'ShareTechMono',
        fontSize: 11,
        color: const Color(0xFF00FF41).withValues(alpha: flicker),
        letterSpacing: 1.5,
        shadows: [
          Shadow(
            color: const Color(0xFF00FF41).withValues(alpha: 0.3),
            blurRadius: 6,
          ),
        ],
      ),
    );
  }

  // ── Title: TERMINUS / OMNI ──
  Widget _buildTitle(double t) {
    double opacity;
    double scale;

    if (t < 0.35) {
      opacity = ((t - 0.25) / 0.10).clamp(0.0, 1.0);
      scale = 1.0;
    } else if (t < 0.70) {
      opacity = 1.0;
      scale = 1.0;
    } else {
      final exit = ((t - 0.70) / 0.18).clamp(0.0, 1.0);
      opacity = 1.0 - exit;
      scale = 1.0 + exit * 6.0; // Zoom into tunnel
    }

    // Irregular flicker
    final flicker =
        0.92 + math.sin(_loop.value * math.pi * 2.0 * 1.7) * 0.08;

    return Opacity(
      opacity: opacity * flicker,
      child: Transform.scale(
        scale: scale,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // TERMINUS
            Text(
              'TERMINUS',
              style: TextStyle(
                fontFamily: 'Orbitron',
                fontSize: 42,
                fontWeight: FontWeight.w700,
                color: const Color(0xFF00FF41),
                letterSpacing: 8,
                shadows: [
                  Shadow(
                    color: const Color(0xFF00FF41).withValues(alpha: 0.7),
                    blurRadius: 16,
                  ),
                  Shadow(
                    color: const Color(0xFF00FF41).withValues(alpha: 0.3),
                    blurRadius: 40,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),
            // OMNI
            Text(
              'O M N I',
              style: TextStyle(
                fontFamily: 'Orbitron',
                fontSize: 18,
                fontWeight: FontWeight.w600,
                letterSpacing: 14,
                color: const Color(0xFF00FF41).withValues(alpha: 0.5),
                shadows: [
                  Shadow(
                    color: const Color(0xFF00FF41).withValues(alpha: 0.4),
                    blurRadius: 12,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            // Glow separator
            Container(
              width: 220,
              height: 1,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    Colors.transparent,
                    const Color(0xFF00FF41).withValues(alpha: 0.4),
                    Colors.transparent,
                  ],
                ),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF00FF41).withValues(alpha: 0.2),
                    blurRadius: 10,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),
            // Subtitle
            Text(
              'THE INEVITABILITY ENGINE',
              style: TextStyle(
                fontFamily: 'ShareTechMono',
                fontSize: 10,
                color: TerminusTheme.neonRed.withValues(alpha: 0.45),
                letterSpacing: 3,
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── Pulsing "TAP TO ENTER" ──
  Widget _buildEnterPrompt(double t) {
    final fadeIn = ((t - 0.45) / 0.06).clamp(0.0, 1.0);
    final fadeOut = 1.0 - ((t - 0.66) / 0.06).clamp(0.0, 1.0);
    final pulse =
        (math.sin(_loop.value * math.pi * 2 * 2) * 0.3 + 0.7).clamp(0.3, 1.0);

    return Opacity(
      opacity: fadeIn * fadeOut * pulse,
      child: Text(
        '[ TAP TO ENTER ]',
        textAlign: TextAlign.center,
        style: TextStyle(
          fontFamily: 'ShareTechMono',
          fontSize: 12,
          color: const Color(0xFF00FF41).withValues(alpha: 0.6),
          letterSpacing: 5,
          shadows: [
            Shadow(
              color: const Color(0xFF00FF41).withValues(alpha: 0.3),
              blurRadius: 8,
            ),
          ],
        ),
      ),
    );
  }
}

// ── Boot line data ──
class _BootLine {
  final double appearAt;
  final String text;
  const _BootLine(this.appearAt, this.text);
}

// ═══════════════════════════════════════════════════════════════════
//  Intro Tunnel Painter — forward-moving corridor with neon edges
// ═══════════════════════════════════════════════════════════════════

class _IntroTunnelPainter extends CustomPainter {
  final double loop;
  final double speed;
  final double fadeIn;
  final double phase;

  static const int _ringCount = 20;

  _IntroTunnelPainter({
    required this.loop,
    required this.speed,
    required this.fadeIn,
    required this.phase,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final cx = size.width / 2;
    final cy = size.height / 2;

    // Color: neon green (matching boot sequence aesthetic)
    const neonGreen = Color(0xFF00FF41);

    // ── Vanishing-point glow ──
    final vpRadius = 60.0 + (phase > 0.70 ? (phase - 0.70) * 300 : 0);
    canvas.drawCircle(
      Offset(cx, cy),
      vpRadius,
      Paint()
        ..shader = RadialGradient(
          colors: [
            neonGreen.withValues(alpha: 0.10 * fadeIn),
            neonGreen.withValues(alpha: 0.0),
          ],
        ).createShader(
          Rect.fromCircle(center: Offset(cx, cy), radius: vpRadius),
        ),
    );

    // ── Perspective guide lines ──
    final guidePaint = Paint()
      ..color = neonGreen.withValues(alpha: 0.04 * fadeIn)
      ..strokeWidth = 0.5;
    final guideGlow = Paint()
      ..color = neonGreen.withValues(alpha: 0.02 * fadeIn)
      ..strokeWidth = 3
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 4);

    final center = Offset(cx, cy);
    for (final ep in [
      Offset.zero,
      Offset(size.width, 0),
      Offset(0, size.height),
      Offset(size.width, size.height),
      Offset(0, cy),
      Offset(size.width, cy),
      Offset(cx, 0),
      Offset(cx, size.height),
    ]) {
      canvas.drawLine(center, ep, guideGlow);
      canvas.drawLine(center, ep, guidePaint);
    }

    // ── Tunnel rings ──
    for (int i = 0; i < _ringCount; i++) {
      final ringT = ((loop * speed) + i / _ringCount) % 1.0;
      final scale = math.pow(ringT, 0.5).toDouble();
      if (scale < 0.02) continue;

      final halfW = cx * scale * 1.4;
      final halfH = cy * scale * 1.4;

      double alpha;
      if (ringT < 0.06) {
        alpha = ringT / 0.06;
      } else if (ringT > 0.9) {
        alpha = (1.0 - ringT) / 0.1;
      } else {
        alpha = 1.0;
      }
      alpha *= fadeIn * 0.5;
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
          ..color = neonGreen.withValues(alpha: alpha * 0.45)
          ..style = PaintingStyle.stroke
          ..strokeWidth = 0.8 + scale * 2.0,
      );

      // Glow
      canvas.drawRect(
        rect,
        Paint()
          ..color = neonGreen.withValues(alpha: alpha * 0.12)
          ..style = PaintingStyle.stroke
          ..strokeWidth = 3.0 + scale * 7.0
          ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 8),
      );
    }

    // ── Depth lines (floor/ceiling) ──
    const depthLines = 14;
    for (int i = 0; i < depthLines; i++) {
      final dt = ((loop * speed * 0.7) + i / depthLines) % 1.0;
      final s = math.pow(dt, 0.5).toDouble();
      if (s < 0.03) continue;

      double a;
      if (dt < 0.08) {
        a = dt / 0.08;
      } else if (dt > 0.88) {
        a = (1.0 - dt) / 0.12;
      } else {
        a = 1.0;
      }
      a *= fadeIn * 0.2;
      if (a <= 0.01) continue;

      final hw = cx * s * 1.4;
      final hh = cy * s * 1.4;

      final lp = Paint()
        ..color = neonGreen.withValues(alpha: a * 0.12)
        ..strokeWidth = 0.5;

      canvas.drawLine(Offset(cx - hw, cy + hh), Offset(cx + hw, cy + hh), lp);
      canvas.drawLine(Offset(cx - hw, cy - hh), Offset(cx + hw, cy - hh), lp);
    }
  }

  @override
  bool shouldRepaint(_IntroTunnelPainter old) =>
      old.loop != loop || old.speed != speed || old.fadeIn != fadeIn;
}

// ═══════════════════════════════════════════════════════════════════
//  Speed Streaks — radial light lines during acceleration
// ═══════════════════════════════════════════════════════════════════

class _SpeedStreaksPainter extends CustomPainter {
  final double phase;
  final double fadeIn;

  _SpeedStreaksPainter({required this.phase, required this.fadeIn});

  @override
  void paint(Canvas canvas, Size size) {
    final cx = size.width / 2;
    final cy = size.height / 2;
    final rng = math.Random(42);
    final intensity = ((phase - 0.65) / 0.25).clamp(0.0, 1.0);
    final count = (60 * intensity).round();

    for (int i = 0; i < count; i++) {
      final angle = rng.nextDouble() * math.pi * 2;
      final dist = 15.0 + rng.nextDouble() * 50;
      final len = 30.0 + rng.nextDouble() * 180 * intensity;

      canvas.drawLine(
        Offset(
          cx + math.cos(angle) * dist,
          cy + math.sin(angle) * dist,
        ),
        Offset(
          cx + math.cos(angle) * (dist + len),
          cy + math.sin(angle) * (dist + len),
        ),
        Paint()
          ..color = Colors.white.withValues(
            alpha: (0.05 + rng.nextDouble() * 0.2 * intensity) * fadeIn,
          )
          ..strokeWidth = 0.3 + rng.nextDouble() * 1.0,
      );
    }
  }

  @override
  bool shouldRepaint(_SpeedStreaksPainter old) => old.phase != phase;
}
