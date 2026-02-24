import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../config/theme.dart';
import '../../models/victim_profile.dart';
import '../../core/session_manager.dart';
import '../../widgets/scanline_overlay.dart';
import '../../widgets/circuit_background.dart';
import '../session/session_screen.dart';

/// The Vocal Testament — REDESIGNED with atmospheric depth.
///
/// Rich gradient background, dramatic typography, deep card panels,
/// metallic accents. The sealed final message before darkness.
class TestamentScreen extends StatefulWidget {
  final VictimProfile profile;
  final String scenarioId;

  const TestamentScreen({
    super.key,
    required this.profile,
    required this.scenarioId,
  });

  @override
  State<TestamentScreen> createState() => _TestamentScreenState();
}

class _TestamentScreenState extends State<TestamentScreen>
    with SingleTickerProviderStateMixin {
  final _testamentController = TextEditingController();
  bool _starting = false;
  late AnimationController _fadeIn;

  @override
  void initState() {
    super.initState();
    _fadeIn = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..forward();
  }

  Future<void> _startSession() async {
    final testament = _testamentController.text.trim();
    if (testament.isEmpty) return;

    setState(() => _starting = true);

    final fullProfile = VictimProfile(
      name: widget.profile.name,
      archetype: widget.profile.archetype,
      virtue: widget.profile.virtue,
      vice: widget.profile.vice,
      moment: widget.profile.moment,
      brink: widget.profile.brink,
      testament: testament,
      ghostVoicePhrase: widget.profile.ghostVoicePhrase,
      ghostIdentity: widget.profile.ghostIdentity,
      silentWitnessName: widget.profile.silentWitnessName,
      silentWitnessObject: widget.profile.silentWitnessObject,
      metaphor: widget.profile.metaphor,
      intensity: widget.profile.intensity,
    );

    final sm = context.read<SessionManager>();
    await sm.startNewSession(
      profile: fullProfile,
      scenarioId: widget.scenarioId,
    );

    if (mounted) {
      Navigator.pushAndRemoveUntil(
        context,
        MaterialPageRoute(builder: (_) => const SessionScreen()),
        (route) => route.isFirst,
      );
    }
  }

  @override
  void dispose() {
    _testamentController.dispose();
    _fadeIn.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ScanlineOverlay(
      child: Scaffold(
        body: Stack(
          children: [
            // Background layers
            const Positioned.fill(
              child: GradientBackground(
                colors: [
                  Color(0xFF0A0408),
                  Color(0xFF120810),
                  Color(0xFF1A0C14),
                  Color(0xFF0A0408),
                ],
              ),
            ),

            // Circuit pattern in red
            const Positioned.fill(
              child: CircuitBackground(
                color: Color(0xFFFF003C),
                opacity: 0.025,
              ),
            ),

            // Red atmospheric glow from bottom
            Positioned.fill(
              child: IgnorePointer(
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: RadialGradient(
                      center: const Alignment(0, 1.2),
                      radius: 1.5,
                      colors: [
                        TerminusTheme.neonRed.withValues(alpha: 0.08),
                        Colors.transparent,
                      ],
                    ),
                  ),
                ),
              ),
            ),

            // Main content
            FadeTransition(
              opacity: _fadeIn,
              child: Column(
                children: [
                  // Header
                  SafeArea(
                    bottom: false,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 10),
                      decoration: BoxDecoration(
                        border: Border(
                          bottom: BorderSide(
                            color:
                                TerminusTheme.neonRed.withValues(alpha: 0.15),
                          ),
                        ),
                      ),
                      child: Row(
                        children: [
                          GestureDetector(
                            onTap: () => Navigator.pop(context),
                            child: Container(
                              padding: const EdgeInsets.all(6),
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(6),
                                border: Border.all(
                                  color: TerminusTheme.textDim
                                      .withValues(alpha: 0.3),
                                ),
                              ),
                              child: Icon(
                                Icons.arrow_back,
                                color: TerminusTheme.textDim
                                    .withValues(alpha: 0.7),
                                size: 18,
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Text(
                            'THE TESTAMENT',
                            style: TerminusTheme.displaySmall.copyWith(
                              color: TerminusTheme.neonRed
                                  .withValues(alpha: 0.9),
                              shadows: [
                                Shadow(
                                  color: TerminusTheme.neonRed
                                      .withValues(alpha: 0.4),
                                  blurRadius: 12,
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  Expanded(
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.all(20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Section label
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(4),
                              gradient: LinearGradient(
                                colors: [
                                  TerminusTheme.neonRed
                                      .withValues(alpha: 0.12),
                                  Colors.transparent,
                                ],
                              ),
                              border: Border(
                                left: BorderSide(
                                  color: TerminusTheme.neonRed
                                      .withValues(alpha: 0.6),
                                  width: 2,
                                ),
                              ),
                            ),
                            child: Text(
                              'THE SEALED MESSAGE',
                              style: TerminusTheme.labelText.copyWith(
                                color: TerminusTheme.neonRed,
                                letterSpacing: 3,
                              ),
                            ),
                          ),

                          const SizedBox(height: 20),

                          // Prompt text in rich panel
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(20),
                            decoration: TerminusTheme.richPanel(
                              accentColor: TerminusTheme.neonRed,
                            ),
                            child: Text(
                              'You are in total darkness. This is your last conscious moment. '
                              'Before falling completely, you record a message.\n\n'
                              'Who are you speaking to? What do you tell them as the world ends?\n\n'
                              'This message will be sealed and never mentioned '
                              'until the last light goes out.',
                              style: TerminusTheme.narrative.copyWith(
                                height: 1.8,
                              ),
                            ),
                          ),

                          const SizedBox(height: 24),

                          // Text input in rich container
                          Container(
                            constraints: const BoxConstraints(minHeight: 160),
                            decoration: TerminusTheme.richPanel(
                              accentColor: TerminusTheme.neonRed,
                              borderWidth: 1.5,
                            ),
                            child: TextField(
                              controller: _testamentController,
                              style: TerminusTheme.narrative.copyWith(
                                color: TerminusTheme.textPrimary,
                              ),
                              maxLines: null,
                              minLines: 6,
                              decoration: InputDecoration(
                                hintText: 'Write your final message...',
                                hintStyle:
                                    TerminusTheme.narrativeItalic.copyWith(
                                  color: TerminusTheme.textDim
                                      .withValues(alpha: 0.4),
                                ),
                                filled: false,
                                border: InputBorder.none,
                                contentPadding: const EdgeInsets.all(16),
                              ),
                              onChanged: (_) => setState(() {}),
                            ),
                          ),

                          const SizedBox(height: 20),

                          // Info box
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                                colors: [
                                  TerminusTheme.neonRed
                                      .withValues(alpha: 0.06),
                                  TerminusTheme.bgCard,
                                  TerminusTheme.neonRed
                                      .withValues(alpha: 0.04),
                                ],
                              ),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(
                                color: TerminusTheme.neonRed
                                    .withValues(alpha: 0.2),
                              ),
                            ),
                            child: Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(8),
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    color: TerminusTheme.neonRed
                                        .withValues(alpha: 0.1),
                                    border: Border.all(
                                      color: TerminusTheme.neonRed
                                          .withValues(alpha: 0.3),
                                    ),
                                  ),
                                  child: Icon(
                                    Icons.lock_outline,
                                    color: TerminusTheme.neonRed
                                        .withValues(alpha: 0.7),
                                    size: 18,
                                  ),
                                ),
                                const SizedBox(width: 14),
                                Expanded(
                                  child: Text(
                                    'This message will be sealed. '
                                    'It will only play when the last light goes out.',
                                    style:
                                        TerminusTheme.narrative.copyWith(
                                      color: TerminusTheme.neonRed
                                          .withValues(alpha: 0.7),
                                      fontSize: 13,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),

                          const SizedBox(height: 24),

                          // Seal button
                          SizedBox(
                            width: double.infinity,
                            child: _SealButton(
                              enabled: _testamentController.text
                                      .trim()
                                      .isNotEmpty &&
                                  !_starting,
                              isLoading: _starting,
                              onTap: _startSession,
                            ),
                          ),

                          const SizedBox(height: 16),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SealButton extends StatefulWidget {
  final bool enabled;
  final bool isLoading;
  final VoidCallback onTap;

  const _SealButton({
    required this.enabled,
    required this.isLoading,
    required this.onTap,
  });

  @override
  State<_SealButton> createState() => _SealButtonState();
}

class _SealButtonState extends State<_SealButton> {
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    final color = widget.enabled ? TerminusTheme.neonRed : TerminusTheme.textDim;

    return GestureDetector(
      onTapDown: widget.enabled
          ? (_) => setState(() => _pressed = true)
          : null,
      onTapUp: widget.enabled
          ? (_) {
              setState(() => _pressed = false);
              widget.onTap();
            }
          : null,
      onTapCancel: () => setState(() => _pressed = false),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 120),
        padding: const EdgeInsets.symmetric(vertical: 18),
        decoration: TerminusTheme.neonButton(
          color: color,
          isPressed: _pressed && widget.enabled,
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (widget.isLoading)
              SizedBox(
                width: 18,
                height: 18,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: TerminusTheme.neonRed.withValues(alpha: 0.6),
                ),
              )
            else
              Icon(
                Icons.lock_rounded,
                color: color.withValues(alpha: 0.8),
                size: 18,
              ),
            const SizedBox(width: 12),
            Text(
              widget.isLoading ? 'INITIALIZING...' : 'SEAL AND BEGIN SESSION',
              style: TerminusTheme.buttonText.copyWith(
                color: color.withValues(alpha: 0.9),
                shadows: widget.enabled
                    ? [
                        Shadow(
                          color: color.withValues(alpha: 0.4),
                          blurRadius: 8,
                        ),
                      ]
                    : null,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
