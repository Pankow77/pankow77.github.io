import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../config/theme.dart';
import '../../models/victim_profile.dart';
import '../../core/session_manager.dart';
import '../../widgets/scanline_overlay.dart';
import '../../widgets/code_rain.dart';
import '../session/session_screen.dart';

/// The Vocal Testament — the sealed final message.
///
/// From the paper: "At the beginning of the session, the subject records
/// a vocal testament — a message from the perspective of the character's
/// final moments. This message is archived and not referenced during play.
/// At Lumen 0, the testament is reproduced."
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

class _TestamentScreenState extends State<TestamentScreen> {
  final _testamentController = TextEditingController();
  bool _starting = false;

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
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ScanlineOverlay(
      child: Scaffold(
        body: Stack(
          children: [
            // Red code rain — we are sealing a death message
            const Positioned.fill(
              child: CodeRain(
                color: Color(0xFFFF003C),
                density: 0.2,
                speed: 0.15,
                opacity: 0.04,
              ),
            ),
            Column(
              children: [
                SafeArea(
                  bottom: false,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 12, vertical: 8),
                    child: Row(
                      children: [
                        IconButton(
                          icon: const Icon(Icons.arrow_back,
                              color: TerminusTheme.textDim, size: 18),
                          onPressed: () => Navigator.pop(context),
                        ),
                        Text(
                          'THE TESTAMENT',
                          style: TerminusTheme.displayMedium
                              .copyWith(fontSize: 14),
                        ),
                      ],
                    ),
                  ),
                ),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'THE SEALED MESSAGE',
                          style: TerminusTheme.systemLog.copyWith(
                            color: TerminusTheme.neonRed,
                          ),
                        ),
                        const SizedBox(height: 16),
                        Text(
                          'You are in total darkness. This is your last conscious moment. '
                          'Before falling completely, you record a message.\n\n'
                          'Who are you speaking to? What do you tell them as the world ends?\n\n'
                          'This message will be sealed and never mentioned '
                          'until the last light goes out.',
                          style: TerminusTheme.narrative,
                        ),
                        const SizedBox(height: 24),
                        Expanded(
                          child: TextField(
                            controller: _testamentController,
                            style: TerminusTheme.narrative,
                            maxLines: null,
                            expands: true,
                            textAlignVertical: TextAlignVertical.top,
                            decoration: InputDecoration(
                              hintText: 'Write your final message...',
                              hintStyle:
                                  TerminusTheme.narrativeItalic.copyWith(
                                color: TerminusTheme.textDim
                                    .withValues(alpha: 0.5),
                              ),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(4),
                                borderSide: const BorderSide(
                                    color: TerminusTheme.neonRed),
                              ),
                              focusedBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(4),
                                borderSide: const BorderSide(
                                    color: TerminusTheme.neonRed,
                                    width: 1.5),
                              ),
                            ),
                            onChanged: (_) => setState(() {}),
                          ),
                        ),
                        const SizedBox(height: 16),
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: TerminusTheme.neonRed
                                .withValues(alpha: 0.05),
                            border: Border.all(
                                color: TerminusTheme.neonRed
                                    .withValues(alpha: 0.2)),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Row(
                            children: [
                              Icon(Icons.lock_outline,
                                  color: TerminusTheme.neonRed
                                      .withValues(alpha: 0.6),
                                  size: 16),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  'This message will be sealed. '
                                  'It will only play when the last light goes out.',
                                  style: TerminusTheme.systemLog.copyWith(
                                    color: TerminusTheme.neonRed
                                        .withValues(alpha: 0.7),
                                    fontSize: 10,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 16),
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            onPressed: _testamentController.text
                                        .trim()
                                        .isNotEmpty &&
                                    !_starting
                                ? _startSession
                                : null,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: TerminusTheme.neonRed
                                  .withValues(alpha: 0.15),
                              foregroundColor: TerminusTheme.neonRed,
                              disabledBackgroundColor:
                                  TerminusTheme.bgPanel,
                              disabledForegroundColor:
                                  TerminusTheme.textDim,
                              padding: const EdgeInsets.symmetric(
                                  vertical: 16),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(4),
                              ),
                            ),
                            child: Text(
                              _starting
                                  ? 'INITIALIZING...'
                                  : 'SEAL AND BEGIN SESSION',
                              style: TerminusTheme.buttonText,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
