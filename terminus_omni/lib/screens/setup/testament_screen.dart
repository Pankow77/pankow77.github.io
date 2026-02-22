import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../config/theme.dart';
import '../../models/victim_profile.dart';
import '../../core/session_manager.dart';
import '../../widgets/scanline_overlay.dart';
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
    );

    final sm = context.read<SessionManager>();
    await sm.startNewSession(
      profile: fullProfile,
      scenarioId: widget.scenarioId,
    );

    if (mounted) {
      // Navigate to session, replacing the setup stack
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
        appBar: AppBar(
          title: Text(
            'IL TESTAMENTO',
            style: TerminusTheme.displayMedium.copyWith(fontSize: 14),
          ),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back, color: TerminusTheme.textDim),
            onPressed: () => Navigator.pop(context),
          ),
        ),
        body: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'IL MESSAGGIO VOCALE',
                style: TerminusTheme.systemLog.copyWith(
                  color: TerminusTheme.neonRed,
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'Sei nel buio totale. È il tuo ultimo istante consapevole. '
                'Prima di sprofondare completamente, registri un messaggio.\n\n'
                'A chi parli? Cosa dici loro mentre il mondo finisce?\n\n'
                'Questo messaggio verrà sigillato e non sarà mai menzionato '
                'fino all\'ultimo istante.',
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
                    hintText: 'Scrivi il tuo messaggio finale...',
                    hintStyle: TerminusTheme.narrativeItalic.copyWith(
                      color: TerminusTheme.textDim.withValues(alpha: 0.5),
                    ),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(4),
                      borderSide:
                          const BorderSide(color: TerminusTheme.neonRed),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(4),
                      borderSide: const BorderSide(
                          color: TerminusTheme.neonRed, width: 1.5),
                    ),
                  ),
                  onChanged: (_) => setState(() {}),
                ),
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: TerminusTheme.neonRed.withValues(alpha: 0.05),
                  border: Border.all(
                      color: TerminusTheme.neonRed.withValues(alpha: 0.2)),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Row(
                  children: [
                    Icon(Icons.lock_outline,
                        color: TerminusTheme.neonRed.withValues(alpha: 0.6),
                        size: 16),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Questo messaggio sarà sigillato. '
                        'Verrà riprodotto solo quando l\'ultima luce si spegne.',
                        style: TerminusTheme.systemLog.copyWith(
                          color: TerminusTheme.neonRed.withValues(alpha: 0.7),
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
                  onPressed:
                      _testamentController.text.trim().isNotEmpty && !_starting
                          ? _startSession
                          : null,
                  style: ElevatedButton.styleFrom(
                    backgroundColor:
                        TerminusTheme.neonRed.withValues(alpha: 0.15),
                    foregroundColor: TerminusTheme.neonRed,
                    disabledBackgroundColor: TerminusTheme.bgPanel,
                    disabledForegroundColor: TerminusTheme.textDim,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                  child: Text(
                    _starting
                        ? 'INIZIALIZZAZIONE...'
                        : 'SIGILLA E INIZIA LA SESSIONE',
                    style: TerminusTheme.buttonText,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
