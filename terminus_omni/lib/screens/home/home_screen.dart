import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../config/theme.dart';
import '../../core/session_manager.dart';
import '../../services/storage_service.dart';
import '../../widgets/scanline_overlay.dart';
import '../../widgets/glitch_text.dart';
import '../../widgets/code_rain.dart';
import '../../widgets/heartbeat_line.dart';
import '../setup/api_key_screen.dart';
import '../setup/character_creation_screen.dart';
import '../session/session_screen.dart';
import '../archive/sessions_archive_screen.dart';

/// Home screen — the cinematic entry to TERMINUS-OMNI.
///
/// Inspired by "La Pianura della Voce Morta":
/// - Code rain falling in the background
/// - TERMINUS OMNI in cyan, glowing
/// - Red heartbeat waveform pulsing across the center
/// - Minimal action buttons that emerge from darkness
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
      duration: const Duration(milliseconds: 3000),
    );

    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 4),
    )..repeat(reverse: true);

    // Delay UI reveal for cinematic effect
    Future.delayed(const Duration(milliseconds: 800), () {
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
            // Layer 0: Code rain background
            const Positioned.fill(
              child: CodeRain(
                color: Color(0xFF00F0FF),
                density: 0.3,
                speed: 0.4,
                opacity: 0.06,
              ),
            ),

            // Layer 1: Gradient overlay (darkness from top and bottom)
            Positioned.fill(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Colors.black.withValues(alpha: 0.9),
                      Colors.black.withValues(alpha: 0.3),
                      Colors.black.withValues(alpha: 0.3),
                      Colors.black.withValues(alpha: 0.95),
                    ],
                    stops: const [0.0, 0.3, 0.7, 1.0],
                  ),
                ),
              ),
            ),

            // Layer 2: Main content
            SafeArea(
              child: FadeTransition(
                opacity: _fadeInController,
                child: Column(
                  children: [
                    const SizedBox(height: 80),

                    // TERMINUS OMNI title
                    _buildTitle(),

                    const SizedBox(height: 8),

                    // Subtitle
                    AnimatedBuilder(
                      animation: _pulseController,
                      builder: (context, _) {
                        return Opacity(
                          opacity:
                              0.3 + _pulseController.value * 0.3,
                          child: Text(
                            'THE INEVITABILITY ENGINE',
                            style: TerminusTheme.systemLog.copyWith(
                              fontSize: 10,
                              color: TerminusTheme.neonRed
                                  .withValues(alpha: 0.6),
                              letterSpacing: 3,
                            ),
                          ),
                        );
                      },
                    ),

                    const Spacer(flex: 2),

                    // Heartbeat line
                    Padding(
                      padding:
                          const EdgeInsets.symmetric(horizontal: 24),
                      child: HeartbeatLine(
                        color: TerminusTheme.neonRed,
                        height: 50,
                        isAlive: true,
                        bpm: 60,
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
          glitchIntensity: 0.1,
        ),
        const SizedBox(height: 2),
        Text(
          'O M N I',
          style: TerminusTheme.displayMedium.copyWith(
            letterSpacing: 14,
            color: TerminusTheme.neonCyan.withValues(alpha: 0.5),
          ),
        ),
        const SizedBox(height: 12),
        // Thin glowing separator line
        Container(
          width: 180,
          height: 1,
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                Colors.transparent,
                TerminusTheme.neonCyan.withValues(alpha: 0.4),
                Colors.transparent,
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildActions(SessionManager sm) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 32),
      child: Column(
        children: [
          if (sm.isActive) ...[
            _ActionButton(
              label: 'RESUME SESSION',
              color: TerminusTheme.neonOrange,
              icon: Icons.play_arrow_rounded,
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(
                    builder: (_) => const SessionScreen()),
              ),
            ),
            const SizedBox(height: 12),
          ],
          _ActionButton(
            label: 'NEW SESSION',
            color: TerminusTheme.neonCyan,
            icon: Icons.local_fire_department_outlined,
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
          const SizedBox(height: 12),
          _ActionButton(
            label: 'SESSION ARCHIVE',
            color: TerminusTheme.textDim,
            icon: Icons.archive_outlined,
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute(
                  builder: (_) =>
                      const SessionsArchiveScreen()),
            ),
          ),
          const SizedBox(height: 12),
          _ActionButton(
            label: 'CONFIGURATION',
            color: TerminusTheme.textDim,
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
        Text(
          'HYBRID SYNDICATE',
          style: TerminusTheme.systemLog.copyWith(
            color: TerminusTheme.textDim.withValues(alpha: 0.4),
            fontSize: 9,
            letterSpacing: 3,
          ),
        ),
        const SizedBox(height: 3),
        Text(
          'ETHIC SOFTWARE FOUNDATION',
          style: TerminusTheme.systemLog.copyWith(
            color: TerminusTheme.textDim.withValues(alpha: 0.25),
            fontSize: 8,
            letterSpacing: 2,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          '"Everyone will die. There is no salvation.\n'
          'There is only the story of how they fall."',
          style: TerminusTheme.narrativeItalic.copyWith(
            fontSize: 10,
            color: TerminusTheme.textDim.withValues(alpha: 0.25),
          ),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }
}

class _ActionButton extends StatefulWidget {
  final String label;
  final Color color;
  final IconData icon;
  final VoidCallback onTap;

  const _ActionButton({
    required this.label,
    required this.color,
    required this.icon,
    required this.onTap,
  });

  @override
  State<_ActionButton> createState() => _ActionButtonState();
}

class _ActionButtonState extends State<_ActionButton> {
  bool _hovering = false;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: GestureDetector(
        onTapDown: (_) => setState(() => _hovering = true),
        onTapUp: (_) {
          setState(() => _hovering = false);
          widget.onTap();
        },
        onTapCancel: () => setState(() => _hovering = false),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          padding: const EdgeInsets.symmetric(vertical: 14),
          decoration: BoxDecoration(
            color: _hovering
                ? widget.color.withValues(alpha: 0.08)
                : Colors.transparent,
            borderRadius: BorderRadius.circular(4),
            border: Border.all(
              color: widget.color.withValues(
                  alpha: _hovering ? 0.5 : 0.2),
              width: 1,
            ),
            boxShadow: _hovering
                ? [
                    BoxShadow(
                      color: widget.color.withValues(alpha: 0.1),
                      blurRadius: 12,
                      spreadRadius: -2,
                    ),
                  ]
                : null,
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(widget.icon, color: widget.color, size: 16),
              const SizedBox(width: 10),
              Text(
                widget.label,
                style: TerminusTheme.buttonText.copyWith(
                  color: widget.color,
                  fontSize: 12,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
