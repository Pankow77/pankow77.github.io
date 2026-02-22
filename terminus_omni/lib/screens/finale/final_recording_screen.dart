import 'package:flutter/material.dart';

import '../../config/theme.dart';
import '../../widgets/scanline_overlay.dart';
import '../../widgets/narrative_text.dart';

/// The Final Recording screen — plays the sealed testament at Lumen 0.
///
/// From the paper: "The testament functions as a 'now moment':
/// a point of heightened intersubjective awareness where the subject
/// recognizes the transformation that has occurred."
class FinalRecordingScreen extends StatefulWidget {
  final String testament;
  final String characterName;

  const FinalRecordingScreen({
    super.key,
    required this.testament,
    required this.characterName,
  });

  @override
  State<FinalRecordingScreen> createState() => _FinalRecordingScreenState();
}

class _FinalRecordingScreenState extends State<FinalRecordingScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _fadeController;
  bool _showTestament = false;
  bool _showClosing = false;

  @override
  void initState() {
    super.initState();
    _fadeController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 3),
    );
    _startSequence();
  }

  Future<void> _startSequence() async {
    // 3 seconds of pure darkness
    await Future.delayed(const Duration(seconds: 3));

    // Show testament
    if (mounted) setState(() => _showTestament = true);

    // Wait for reading time
    await Future.delayed(const Duration(seconds: 10));

    // Show closing
    if (mounted) setState(() => _showClosing = true);
  }

  @override
  void dispose() {
    _fadeController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ScanlineOverlay(
      opacity: 0.12,
      child: Scaffold(
        backgroundColor: Colors.black,
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                if (_showTestament) ...[
                  Text(
                    '[RIPRODUZIONE TESTAMENTO — FILE SIGILLATO]',
                    style: TerminusTheme.systemLog.copyWith(
                      color: TerminusTheme.neonRed.withValues(alpha: 0.5),
                      fontSize: 10,
                    ),
                  ),
                  const SizedBox(height: 24),
                  NarrativeText(
                    text: '"${widget.testament}"',
                    charDelay: const Duration(milliseconds: 40),
                  ),
                  const SizedBox(height: 32),
                ],
                if (_showClosing) ...[
                  Text(
                    '[FINE TRASMISSIONE]',
                    style: TerminusTheme.systemLog.copyWith(
                      color: TerminusTheme.neonRed.withValues(alpha: 0.3),
                      fontSize: 10,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'TERMINUS-OMNI // SISTEMA OFFLINE',
                    style: TerminusTheme.systemLog.copyWith(
                      color: TerminusTheme.neonRed.withValues(alpha: 0.2),
                      fontSize: 10,
                    ),
                  ),
                  const SizedBox(height: 48),
                  GestureDetector(
                    onTap: () => Navigator.popUntil(
                        context, (route) => route.isFirst),
                    child: Text(
                      'tocca per tornare alla luce',
                      style: TerminusTheme.narrativeItalic.copyWith(
                        fontSize: 11,
                        color: TerminusTheme.textDim.withValues(alpha: 0.3),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
