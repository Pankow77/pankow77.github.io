import 'dart:async';
import 'package:flutter/material.dart';
import '../config/theme.dart';
import '../models/session_data.dart';
import '../widgets/blinking_cursor.dart';

/// The Crew Intake screen — onboarding disguised as ship protocol.
///
/// The Captain walks the user through crew registration.
/// Each question builds the UserCharacter profile that feeds
/// into the narrative engine for the rest of the session.
///
/// This is NOT a form. It's a conversation with a terminal.
/// One question at a time. Each answer materializes on screen
/// before the next question appears.
///
/// The questions (from Ten Candles, adapted):
/// 1. Name — "Crew manifest requires a name."
/// 2. Role — "What was your role on this ship?"
/// 3. Virtue — "What keeps you going when everything goes dark?"
/// 4. Vice — "What do you fall back on when you can't cope?"
/// 5. Moment — "If you had one hour left, what would you need to do?"
/// 6. Brink — "What happened to you before you boarded this ship?"
/// 7. Ship's Log — "Record a personal log. If we don't make it..."
class OnboardingScreen extends StatefulWidget {
  final void Function(UserCharacter character, String shipLog) onComplete;

  const OnboardingScreen({super.key, required this.onComplete});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final TextEditingController _inputController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final FocusNode _focusNode = FocusNode();

  final List<_IntakeLine> _visibleLines = [];
  int _currentQuestion = 0;
  bool _waitingForInput = false;

  // Collected answers
  String _name = '';
  String _role = '';
  String _virtue = '';
  String _vice = '';
  String _moment = '';
  String _brink = '';
  String _shipLogEntry = '';

  // The intake sequence — Captain speaks, user answers
  static const List<_IntakeQuestion> _questions = [
    _IntakeQuestion(
      prompt: [
        '[Captain] Good. You\'re awake.',
        '',
        '[Captain] The ship\'s in bad shape. Reactor is unstable.',
        '[Captain] But we\'re still here. That counts for something.',
        '',
        '[Captain] I need to update the crew manifest.',
        '[Captain] What\'s your name?',
      ],
      field: 'name',
    ),
    _IntakeQuestion(
      prompt: [
        '',
        '[Captain] Understood.',
        '[Captain] What was your role on this ship?',
        '[Captain] Before everything went wrong.',
      ],
      field: 'role',
    ),
    _IntakeQuestion(
      prompt: [
        '',
        '[Captain] Noted.',
        '',
        '[Medic] Captain, if I may—',
        '[Medic] For the medical record.',
        '[Medic] What keeps you going when everything goes dark?',
        '[Medic] I don\'t need a philosophy. Just a word. A name. Anything.',
      ],
      field: 'virtue',
    ),
    _IntakeQuestion(
      prompt: [
        '',
        '[Medic] I\'ll remember that.',
        '',
        '[Veteran] Let me ask you something else.',
        '[Veteran] When you can\'t cope — what do you fall back on?',
        '[Veteran] No judgment. We\'ve all got our thing.',
      ],
      field: 'vice',
    ),
    _IntakeQuestion(
      prompt: [
        '',
        '[Veteran] Yeah. I know that one.',
        '',
        '[Captain] One more question.',
        '[Captain] If you had one hour left —',
        '[Captain] Not hypothetical. One real hour.',
        '[Captain] What would you need to do?',
      ],
      field: 'moment',
    ),
    _IntakeQuestion(
      prompt: [
        '',
        '[Captain] ...',
        '',
        '[Engineer] Almost done. Systems won\'t hold forever.',
        '',
        '[Medic] Last question for the record.',
        '[Medic] What happened to you before you boarded this ship?',
        '[Medic] Take your time.',
      ],
      field: 'brink',
    ),
    _IntakeQuestion(
      prompt: [
        '',
        '[Medic] ...',
        '[Medic] Thank you.',
        '',
        '[Captain] Right.',
        '[Captain] One last thing.',
        '[Captain] Record a personal log.',
        '[Captain] If we don\'t make it, I want something left of each of us.',
        '[Captain] Say whatever you need to say.',
      ],
      field: 'shipLog',
    ),
  ];

  @override
  void initState() {
    super.initState();
    // Start the first question after a brief pause
    Timer(const Duration(milliseconds: 800), () => _showNextPrompt());
  }

  @override
  void dispose() {
    _inputController.dispose();
    _scrollController.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  void _showNextPrompt() {
    if (_currentQuestion >= _questions.length) {
      _completeOnboarding();
      return;
    }

    final question = _questions[_currentQuestion];
    _showLines(question.prompt, 0);
  }

  void _showLines(List<String> lines, int index) {
    if (index >= lines.length) {
      // All lines shown, wait for input
      setState(() => _waitingForInput = true);
      _focusNode.requestFocus();
      return;
    }

    setState(() {
      _visibleLines.add(_IntakeLine(
        text: lines[index],
        color: _colorForLine(lines[index]),
      ));
    });
    _scrollToBottom();

    // Delay between lines — longer for empty lines (dramatic pause)
    final delay = lines[index].isEmpty ? 400 : 350;
    Timer(Duration(milliseconds: delay), () => _showLines(lines, index + 1));
  }

  Color _colorForLine(String line) {
    if (line.startsWith('[Captain]')) return TerminusTheme.captainColor;
    if (line.startsWith('[Medic]')) return TerminusTheme.medicColor;
    if (line.startsWith('[Engineer]')) return TerminusTheme.engineerColor;
    if (line.startsWith('[Veteran]')) return TerminusTheme.veteranColor;
    if (line.startsWith('[???]')) return TerminusTheme.ghostColor;
    return TerminusTheme.systemColor;
  }

  void _submitAnswer() {
    final answer = _inputController.text.trim();
    if (answer.isEmpty) return;

    // Store the answer
    final field = _questions[_currentQuestion].field;
    switch (field) {
      case 'name':
        _name = answer;
        break;
      case 'role':
        _role = answer;
        break;
      case 'virtue':
        _virtue = answer;
        break;
      case 'vice':
        _vice = answer;
        break;
      case 'moment':
        _moment = answer;
        break;
      case 'brink':
        _brink = answer;
        break;
      case 'shipLog':
        _shipLogEntry = answer;
        break;
    }

    // Show the user's answer on screen
    setState(() {
      _visibleLines.add(_IntakeLine(
        text: '> $answer',
        color: TerminusTheme.userColor,
      ));
      _waitingForInput = false;
    });

    _inputController.clear();
    _currentQuestion++;

    // Brief pause before next question
    Timer(const Duration(milliseconds: 600), () => _showNextPrompt());
  }

  void _completeOnboarding() {
    // Show completion message
    final completionLines = [
      '',
      '[Captain] Good. Manifest updated.',
      '[Captain] Ship\'s Log recorded.',
      '',
      '[Engineer] Systems are stable. For now.',
      '[Captain] Stations, everyone.',
      '',
      '[SYSTEM] Crew intake complete. All stations active.',
    ];

    _showCompletionLines(completionLines, 0);
  }

  void _showCompletionLines(List<String> lines, int index) {
    if (index >= lines.length) {
      // Done — wait a moment, then transition
      Timer(const Duration(milliseconds: 1500), () {
        final character = UserCharacter(
          name: _name,
          role: _role,
          virtue: _virtue,
          vice: _vice,
          moment: _moment,
          brink: _brink,
        );
        widget.onComplete(character, _shipLogEntry);
      });
      return;
    }

    setState(() {
      _visibleLines.add(_IntakeLine(
        text: lines[index],
        color: _colorForLine(lines[index]),
      ));
    });
    _scrollToBottom();

    final delay = lines[index].isEmpty ? 400 : 350;
    Timer(Duration(milliseconds: delay),
        () => _showCompletionLines(lines, index + 1));
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: TerminusTheme.background,
      body: SafeArea(
        child: Column(
          children: [
            // Header
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Text(
                    'CREW INTAKE PROTOCOL',
                    style: TerminusTheme.terminalFont(
                      fontSize: 12,
                      color: TerminusTheme.phosphorDim,
                    ),
                  ),
                  const Spacer(),
                  Text(
                    '${_currentQuestion}/${_questions.length}',
                    style: TerminusTheme.terminalFont(
                      fontSize: 12,
                      color: TerminusTheme.phosphorDim,
                    ),
                  ),
                ],
              ),
            ),

            Container(
              height: 1,
              color: TerminusTheme.phosphorDim.withValues(alpha: 0.2),
            ),

            // Conversation history
            Expanded(
              child: ListView.builder(
                controller: _scrollController,
                padding: const EdgeInsets.symmetric(
                  horizontal: 16, vertical: 8,
                ),
                itemCount: _visibleLines.length,
                itemBuilder: (context, index) {
                  final line = _visibleLines[index];
                  return Padding(
                    padding: const EdgeInsets.symmetric(vertical: 1),
                    child: Text(
                      line.text,
                      style: TerminusTheme.terminalFont(
                        fontSize: 14,
                        color: line.color,
                      ),
                    ),
                  );
                },
              ),
            ),

            // Input bar (only when waiting for answer)
            if (_waitingForInput)
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  border: Border(
                    top: BorderSide(
                      color: TerminusTheme.phosphorDim.withValues(alpha: 0.2),
                    ),
                  ),
                ),
                child: Row(
                  children: [
                    Text(
                      '> ',
                      style: TerminusTheme.terminalFont(
                        fontSize: 15,
                        color: TerminusTheme.phosphorGreen,
                      ),
                    ),
                    Expanded(
                      child: TextField(
                        controller: _inputController,
                        focusNode: _focusNode,
                        style: TerminusTheme.terminalFont(
                          fontSize: 14,
                          color: TerminusTheme.userColor,
                        ),
                        decoration: const InputDecoration(
                          border: InputBorder.none,
                          isDense: true,
                          contentPadding: EdgeInsets.zero,
                        ),
                        onSubmitted: (_) => _submitAnswer(),
                        textInputAction: TextInputAction.send,
                      ),
                    ),
                    GestureDetector(
                      onTap: _submitAnswer,
                      child: Text(
                        '[ENTER]',
                        style: TerminusTheme.terminalFont(
                          fontSize: 12,
                          color: TerminusTheme.phosphorDim,
                        ),
                      ),
                    ),
                  ],
                ),
              )
            else
              Padding(
                padding: const EdgeInsets.all(12),
                child: Row(
                  children: [
                    const BlinkingCursor(
                      prefix: '  ',
                      fontSize: 14,
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

/// A line in the intake conversation.
class _IntakeLine {
  final String text;
  final Color color;

  const _IntakeLine({required this.text, required this.color});
}

/// A question in the intake sequence.
class _IntakeQuestion {
  final List<String> prompt;
  final String field;

  const _IntakeQuestion({required this.prompt, required this.field});
}
