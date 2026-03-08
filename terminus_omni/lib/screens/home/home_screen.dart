import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../config/theme.dart';
import '../../core/session_manager.dart';
import '../../services/storage_service.dart';
import '../../widgets/scanline_overlay.dart';
import '../../widgets/glitch_text.dart';
import '../../widgets/code_rain.dart';
import '../../widgets/heartbeat_line.dart';
import '../../widgets/circuit_background.dart';
import '../setup/api_key_screen.dart';
import '../setup/character_creation_screen.dart';
import '../session/session_screen.dart';
import '../archive/sessions_archive_screen.dart';

/// Home screen — REDESIGNED cinematic entry to TERMINUS-OMNI.
///
/// Rich gradient background, circuit pattern overlay,
/// industrial-style buttons with neon glow, metallic accents.
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen>
    with TickerProviderStateMixin {
  bool _hasApiKey = false;
  bool _showUI = false;
  late AnimationController _fadeInController;
  late AnimationController _pulseController;

  @override
  void initState() {
    super.initState();
    _checkApiKey();

    _fadeInController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2500),
    );

    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 4),
    )..repeat(reverse: true);

    Future.delayed(const Duration(milliseconds: 600), () {
      if (mounted) {
        _fadeInController.forward();
        setState(() => _showUI = true);
      }
    });
  }

  @override
  void dispose() {
    _fadeInController.dispose();
    _pulseController.dispose();
    super.dispose();
  }

  Future<void> _checkApiKey() async {
    final key = await context.read<StorageService>().getApiKey();
    setState(() => _hasApiKey = key != null && key.isNotEmpty);
  }

  @override
  Widget build(BuildContext context) {
    final sm = context.watch<SessionManager>();

    return ScanlineOverlay(
      child: Scaffold(
        backgroundColor: Colors.black,
        body: Stack(
          children: [
            // Layer 0: Rich gradient background
            const Positioned.fill(
              child: GradientBackground(),
            ),

            // Layer 1: Circuit pattern overlay
            const Positioned.fill(
              child: CircuitBackground(
                opacity: 0.04,
              ),
            ),

            // Layer 2: Subtle code rain
            Positioned.fill(
              child: CodeRain(
                color: TerminusTheme.neonCyan,
                density: 0.2,
                speed: 0.3,
                opacity: 0.04,
              ),
            ),

            // Layer 3: Dark gradient overlay for depth
            Positioned.fill(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Colors.black.withValues(alpha: 0.7),
                      Colors.transparent,
                      Colors.transparent,
                      Colors.black.withValues(alpha: 0.8),
                    ],
                    stops: const [0.0, 0.25, 0.75, 1.0],
                  ),
                ),
              ),
            ),

            // Layer 4: Main content
            SafeArea(
              child: FadeTransition(
                opacity: _fadeInController,
                child: Column(
                  children: [
                    const SizedBox(height: 60),

                    // TERMINUS OMNI title
                    _buildTitle(),

                    const SizedBox(height: 10),

                    // Subtitle
                    AnimatedBuilder(
                      animation: _pulseController,
                      builder: (context, _) {
                        return Opacity(
                          opacity: 0.4 + _pulseController.value * 0.3,
                          child: Text(
                            'THE INEVITABILITY ENGINE',
                            style: TerminusTheme.labelText.copyWith(
                              color: TerminusTheme.neonRed
                                  .withValues(alpha: 0.7),
                              letterSpacing: 4,
                              fontSize: 10,
                            ),
                          ),
                        );
                      },
                    ),

                    const Spacer(flex: 2),

                    // Heartbeat line in a rich panel
                    Padding(
                      padding:
                          const EdgeInsets.symmetric(horizontal: 32),
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            vertical: 8, horizontal: 16),
                        decoration: TerminusTheme.richPanel(
                          accentColor: TerminusTheme.neonRed,
                        ),
                        child: HeartbeatLine(
                          color: TerminusTheme.neonRed,
                          height: 50,
                          isAlive: true,
                          bpm: 60,
                        ),
                      ),
                    ),

                    const Spacer(flex: 2),

                    // Action buttons
                    if (_showUI) _buildActions(sm),

                    const Spacer(),

                    // Footer
                    _buildFooter(),

                    const SizedBox(height: 16),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTitle() {
    return Column(
      children: [
        const GlitchText(
          text: 'TERMINUS',
          glitchIntensity: 0.08,
        ),
        const SizedBox(height: 4),
        Text(
          'O M N I',
          style: TerminusTheme.displayMedium.copyWith(
            letterSpacing: 16,
            fontSize: 16,
            color: TerminusTheme.neonCyan.withValues(alpha: 0.5),
            shadows: [
              Shadow(
                color: TerminusTheme.neonCyan.withValues(alpha: 0.3),
                blurRadius: 16,
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        // Metallic gold separator
        Container(
          width: 220,
          height: 2,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(1),
            gradient: TerminusTheme.goldAccent,
            boxShadow: [
              BoxShadow(
                color: TerminusTheme.metalGold.withValues(alpha: 0.3),
                blurRadius: 8,
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildActions(SessionManager sm) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 28),
      child: Column(
        children: [
          if (sm.isActive) ...[
            _NeonActionButton(
              label: 'RESUME SESSION',
              color: TerminusTheme.neonOrange,
              icon: Icons.play_arrow_rounded,
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(
                    builder: (_) => const SessionScreen()),
              ),
            ),
            const SizedBox(height: 14),
          ],
          _NeonActionButton(
            label: 'NEW SESSION',
            color: TerminusTheme.neonCyan,
            icon: Icons.local_fire_department_outlined,
            isPrimary: true,
            onTap: () {
              if (!_hasApiKey) {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                      builder: (_) => const ApiKeyScreen()),
                ).then((_) => _checkApiKey());
              } else {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                      builder: (_) =>
                          const CharacterCreationScreen()),
                );
              }
            },
          ),
          const SizedBox(height: 14),
          _NeonActionButton(
            label: 'SESSION ARCHIVE',
            color: TerminusTheme.metalSteel,
            icon: Icons.archive_outlined,
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute(
                  builder: (_) =>
                      const SessionsArchiveScreen()),
            ),
          ),
          const SizedBox(height: 14),
          _NeonActionButton(
            label: 'CONFIGURATION',
            color: TerminusTheme.metalSteel,
            icon: Icons.settings_outlined,
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute(
                  builder: (_) => const ApiKeyScreen()),
            ).then((_) => _checkApiKey()),
          ),
        ],
      ),
    );
  }

  Widget _buildFooter() {
    return Column(
      children: [
        // Gold separator
        Container(
          width: 120,
          height: 1,
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                Colors.transparent,
                TerminusTheme.metalGold.withValues(alpha: 0.3),
                Colors.transparent,
              ],
            ),
          ),
        ),
        const SizedBox(height: 10),
        Text(
          'HYBRID SYNDICATE',
          style: TerminusTheme.labelText.copyWith(
            color: TerminusTheme.metalGold.withValues(alpha: 0.5),
            fontSize: 10,
            letterSpacing: 4,
          ),
        ),
        const SizedBox(height: 3),
        Text(
          'ETHIC SOFTWARE FOUNDATION',
          style: TerminusTheme.labelText.copyWith(
            color: TerminusTheme.metalGold.withValues(alpha: 0.3),
            fontSize: 8,
            letterSpacing: 3,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          '"Everyone will die. There is no salvation.\n'
          'There is only the story of how they fall."',
          style: TerminusTheme.narrativeItalic.copyWith(
            fontSize: 10,
            color: TerminusTheme.textDim.withValues(alpha: 0.3),
          ),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }
}

/// Action button with neon glow, gradient fill, and press animation.
class _NeonActionButton extends StatefulWidget {
  final String label;
  final Color color;
  final IconData icon;
  final VoidCallback onTap;
  final bool isPrimary;

  const _NeonActionButton({
    required this.label,
    required this.color,
    required this.icon,
    required this.onTap,
    this.isPrimary = false,
  });

  @override
  State<_NeonActionButton> createState() => _NeonActionButtonState();
}

class _NeonActionButtonState extends State<_NeonActionButton> {
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: GestureDetector(
        onTapDown: (_) => setState(() => _pressed = true),
        onTapUp: (_) {
          setState(() => _pressed = false);
          widget.onTap();
        },
        onTapCancel: () => setState(() => _pressed = false),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 120),
          padding: const EdgeInsets.symmetric(vertical: 16),
          decoration: TerminusTheme.neonButton(
            color: widget.color,
            isPressed: _pressed,
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                widget.icon,
                color: widget.color.withValues(
                    alpha: _pressed ? 1.0 : 0.8),
                size: 20,
              ),
              const SizedBox(width: 12),
              Text(
                widget.label,
                style: TerminusTheme.buttonText.copyWith(
                  color: widget.color.withValues(
                      alpha: _pressed ? 1.0 : 0.85),
                  fontSize: widget.isPrimary ? 15 : 13,
                  shadows: widget.isPrimary
                      ? [
                          Shadow(
                            color: widget.color.withValues(alpha: 0.4),
                            blurRadius: 8,
                          ),
                        ]
                      : null,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
