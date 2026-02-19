import 'dart:async';
import 'package:flutter/material.dart';
import '../config/theme.dart';
import '../config/constants.dart';
import '../widgets/blinking_cursor.dart';

/// The TERMINUS boot sequence.
///
/// This is the first thing the user sees. A ship computer coming online.
/// Each line materializes from the dark. Warnings flash amber.
/// The whole thing feels like a real system that is barely alive.
///
/// This IS the tone-setting. If this screen doesn't work, nothing works.
class BootScreen extends StatefulWidget {
  final VoidCallback onBootComplete;

  const BootScreen({super.key, required this.onBootComplete});

  @override
  State<BootScreen> createState() => _BootScreenState();
}

class _BootScreenState extends State<BootScreen> {
  final List<_BootLine> _visibleLines = [];
  int _currentLine = 0;
  bool _bootComplete = false;
  Timer? _timer;

  // The boot sequence — each line is the ship waking up.
  static final List<_BootLine> _bootSequence = [
    _BootLine('', TerminusTheme.phosphorDim, 200),
    _BootLine(
      '  TERMINUS SYSTEMS v${AppConstants.systemVersion}',
      TerminusTheme.phosphorGreen,
      600,
    ),
    _BootLine(
      '  Initializing core systems...',
      TerminusTheme.phosphorDim,
      800,
    ),
    _BootLine('', TerminusTheme.phosphorDim, 200),
    _BootLine(
      '  [####################] BOOT COMPLETE',
      TerminusTheme.phosphorGreen,
      1000,
    ),
    _BootLine('', TerminusTheme.phosphorDim, 300),
    _BootLine(
      '  ⚠ WARNING: Reactor integrity compromised',
      TerminusTheme.amber,
      700,
    ),
    _BootLine(
      '  ⚠ WARNING: Hull breach detected — Sectors 7, 12',
      TerminusTheme.amber,
      500,
    ),
    _BootLine(
      '  ⚠ WARNING: Life support at 67%',
      TerminusTheme.amber,
      500,
    ),
    _BootLine('', TerminusTheme.phosphorDim, 400),
    _BootLine(
      '  LUMEN COUNT: ██████████ 10/10',
      TerminusTheme.phosphorGreen,
      600,
    ),
    _BootLine('', TerminusTheme.phosphorDim, 300),
    _BootLine(
      '  Crew Status:',
      TerminusTheme.phosphorDim,
      400,
    ),
    _BootLine(
      '    > Captain .......... ONLINE',
      TerminusTheme.captainColor,
      350,
    ),
    _BootLine(
      '    > Medic ............ ONLINE',
      TerminusTheme.medicColor,
      350,
    ),
    _BootLine(
      '    > Engineer ......... ONLINE',
      TerminusTheme.engineerColor,
      350,
    ),
    _BootLine(
      '    > Veteran .......... ONLINE',
      TerminusTheme.veteranColor,
      350,
    ),
    _BootLine(
      '    > [CLASSIFIED] ..... ??????',
      TerminusTheme.ghostColor,
      800,
    ),
    _BootLine('', TerminusTheme.phosphorDim, 500),
    _BootLine(
      '  The Void is waiting.',
      TerminusTheme.phosphorDim,
      1200,
    ),
    _BootLine('', TerminusTheme.phosphorDim, 400),
  ];

  @override
  void initState() {
    super.initState();
    _playNextLine();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _playNextLine() {
    if (_currentLine >= _bootSequence.length) {
      setState(() => _bootComplete = true);
      return;
    }

    final line = _bootSequence[_currentLine];
    setState(() {
      _visibleLines.add(line);
      _currentLine++;
    });

    _timer = Timer(Duration(milliseconds: line.delayAfterMs), _playNextLine);
  }

  void _skipBoot() {
    _timer?.cancel();
    setState(() {
      _visibleLines.clear();
      _visibleLines.addAll(_bootSequence);
      _bootComplete = true;
    });
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: _bootComplete ? widget.onBootComplete : _skipBoot,
      behavior: HitTestBehavior.opaque,
      child: Scaffold(
        backgroundColor: TerminusTheme.background,
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: ListView.builder(
                    itemCount: _visibleLines.length,
                    itemBuilder: (context, index) {
                      final line = _visibleLines[index];
                      return Padding(
                        padding: const EdgeInsets.symmetric(vertical: 1),
                        child: Text(
                          line.text,
                          style: TerminusTheme.terminalFont(
                            color: line.color,
                            fontSize: 14,
                          ),
                        ),
                      );
                    },
                  ),
                ),
                if (_bootComplete)
                  Padding(
                    padding: const EdgeInsets.only(top: 16, left: 4),
                    child: Row(
                      children: [
                        Text(
                          '  Press anywhere to continue',
                          style: TerminusTheme.terminalFont(
                            color: TerminusTheme.phosphorDim,
                            fontSize: 12,
                          ),
                        ),
                        const SizedBox(width: 8),
                        const BlinkingCursor(
                          prefix: '',
                          fontSize: 12,
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// A single line in the boot sequence.
class _BootLine {
  final String text;
  final Color color;
  final int delayAfterMs;

  const _BootLine(this.text, this.color, this.delayAfterMs);
}
