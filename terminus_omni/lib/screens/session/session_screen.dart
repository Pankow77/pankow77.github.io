import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../config/theme.dart';
import '../../config/constants.dart';
import '../../core/session_manager.dart';
import '../../models/session.dart';
import '../../services/storage_service.dart';
import '../../widgets/scanline_overlay.dart';
import '../../widgets/lumen_display.dart';
import '../../widgets/narrative_text.dart';
import '../../widgets/glitch_text.dart';
import '../../widgets/code_rain.dart';
import '../../widgets/crt_frame.dart';
import '../../widgets/entropy_graph.dart';
import '../../widgets/heartbeat_line.dart';
import '../../widgets/terminal_grid.dart';
import '../../widgets/circuit_background.dart';
import '../finale/final_recording_screen.dart';
import 'ship_log_confirmation_screen.dart';

/// The main session screen — REDESIGNED with rich industrial UI.
class SessionScreen extends StatefulWidget {
  const SessionScreen({super.key});

  @override
  State<SessionScreen> createState() => _SessionScreenState();
}

class _SessionScreenState extends State<SessionScreen>
    with TickerProviderStateMixin {
  final _inputController = TextEditingController();
  final _scrollController = ScrollController();
  final _inputFocus = FocusNode();
  bool? _performanceMode;

  @override
  void initState() {
    super.initState();
    _detectPerformanceMode();
  }

  Future<void> _detectPerformanceMode() async {
    final storage = context.read<StorageService>();
    final userPref =
        await storage.getSetting(TerminusConstants.keyPerformanceMode);
    if (userPref != null) {
      if (mounted) setState(() => _performanceMode = userPref == 'true');
      return;
    }
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final mq = MediaQuery.of(context);
      final physicalWidth = mq.size.width * mq.devicePixelRatio;
      final physicalHeight = mq.size.height * mq.devicePixelRatio;
      final isLowEnd = (physicalWidth * physicalHeight) < (720 * 1280);
      setState(() => _performanceMode = isLowEnd);
    });
  }

  @override
  void dispose() {
    _inputController.dispose();
    _scrollController.dispose();
    _inputFocus.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _sendMessage([String? override]) async {
    final text = override ?? _inputController.text.trim();
    if (text.isEmpty) return;

    _inputController.clear();
    final sm = context.read<SessionManager>();
    await sm.sendMessage(text);
    _scrollToBottom();
  }

  @override
  Widget build(BuildContext context) {
    final sm = context.watch<SessionManager>();
    final session = sm.session;

    if (session == null) {
      return const Scaffold(
        body: Center(child: Text('No active session')),
      );
    }

    final isPerf = _performanceMode ?? false;

    return ScanlineOverlay(
      opacity: _scanlineOpacity(sm.lumen),
      child: Scaffold(
        backgroundColor: Colors.black,
        body: Stack(
          children: [
            // Background gradient
            Positioned.fill(
              child: GradientBackground(
                colors: [
                  const Color(0xFF040810),
                  Color.lerp(
                    const Color(0xFF0A1428),
                    const Color(0xFF1A0810),
                    1.0 - sm.lumen / 10.0,
                  )!,
                  const Color(0xFF040810),
                ],
              ),
            ),

            // Circuit pattern (fades as lumen drops)
            if (!isPerf && sm.lumen > 3)
              Positioned.fill(
                child: CircuitBackground(
                  color: TerminusTheme.lumenColor(sm.lumen),
                  opacity: 0.02,
                ),
              ),

            // Code rain (intensifies visually, throttled for GPU)
            if (!isPerf)
              Positioned.fill(
                child: CodeRain(
                  color: _rainColor(sm.lumen),
                  density:
                      _rainDensity(sm.lumen) * _throttleFactor(sm.lumen),
                  speed: _rainSpeed(sm.lumen),
                  opacity: _rainOpacity(sm.lumen),
                ),
              ),

            // Main content
            SafeArea(
              child: Column(
                children: [
                  // HUD Header
                  _buildHUD(sm, session),

                  // Commander pause overlay
                  if (sm.isPaused)
                    _buildCommanderPause(sm)
                  else ...[
                    // Narrative area inside CRT frame
                    Expanded(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 4),
                        child: CRTFrame(
                          headerLabel: _crtHeader(sm.lumen, sm.phase),
                          footerLabel:
                              'POOL:${session.dicePool}+${session.hopeDice} | '
                              'SCENE:${session.currentScene} | '
                              'LUMEN:${sm.lumen}/10',
                          borderColor: Color.lerp(
                            const Color(0xFF1A2E50),
                            const Color(0xFF3A1020),
                            1.0 - sm.lumen / 10.0,
                          )!,
                          child: _buildMessageList(session),
                        ),
                      ),
                    ),

                    // Entropy graph
                    if (!isPerf && sm.lumen > 2)
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        child: EntropyGraph(
                          currentLumen: sm.lumen,
                          height: 60,
                        ),
                      ),

                    // Terminal grid
                    if (!session.isComplete)
                      Padding(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 4),
                        child: TerminalGrid(
                          currentLumen: sm.lumen,
                          actions: _buildActions(sm.phase),
                          onActionTap: (action) =>
                              _sendMessage(action.prompt),
                        ),
                      ),

                    // Text input
                    if (!session.isComplete) _buildInputArea(sm),

                    // Session complete
                    if (session.isComplete) _buildSessionComplete(),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHUD(SessionManager sm, TerminusSession session) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            Colors.black.withValues(alpha: 0.9),
            Colors.black.withValues(alpha: 0.6),
          ],
        ),
        border: Border(
          bottom: BorderSide(
            color: TerminusTheme.lumenColor(sm.lumen).withValues(alpha: 0.25),
            width: 1.5,
          ),
        ),
        boxShadow: [
          BoxShadow(
            color: TerminusTheme.lumenColor(sm.lumen).withValues(alpha: 0.05),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            children: [
              GestureDetector(
                onTap: () => Navigator.pop(context),
                child: Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(4),
                    border: Border.all(
                      color: TerminusTheme.textDim.withValues(alpha: 0.2),
                    ),
                  ),
                  child: Icon(Icons.arrow_back,
                      color: TerminusTheme.textDim.withValues(alpha: 0.5),
                      size: 16),
                ),
              ),
              const SizedBox(width: 8),
              if (sm.lumen <= 5)
                GlitchText(
                  text: sm.lumen <= 3 ? 'TERMINUS' : 'TERMINUS-OMNI',
                  style: TerminusTheme.systemLog.copyWith(
                    color: TerminusTheme.lumenColor(sm.lumen),
                    fontSize: 12,
                  ),
                  glitchIntensity: sm.lumen <= 3
                      ? (4 - sm.lumen) * 0.25
                      : (6 - sm.lumen) * 0.08,
                )
              else
                Text(
                  'TERMINUS-OMNI',
                  style: TerminusTheme.systemLog.copyWith(
                    color: TerminusTheme.lumenColor(sm.lumen),
                    fontSize: 12,
                    shadows: [
                      Shadow(
                        color: TerminusTheme.lumenColor(sm.lumen)
                            .withValues(alpha: 0.3),
                        blurRadius: 6,
                      ),
                    ],
                  ),
                ),
              const Spacer(),
              // Phase badge
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(4),
                  gradient: LinearGradient(
                    colors: [
                      _phaseColor(sm.phase).withValues(alpha: 0.12),
                      _phaseColor(sm.phase).withValues(alpha: 0.06),
                    ],
                  ),
                  border: Border.all(
                    color: _phaseColor(sm.phase).withValues(alpha: 0.4),
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: _phaseColor(sm.phase).withValues(alpha: 0.1),
                      blurRadius: 6,
                    ),
                  ],
                ),
                child: Text(
                  _phaseLabel(sm.phase),
                  style: TerminusTheme.labelText.copyWith(
                    color: _phaseColor(sm.phase),
                    fontSize: 9,
                    letterSpacing: 1.5,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                flex: 3,
                child: LumenDisplay(
                  currentLumen: sm.lumen,
                  performanceMode: _performanceMode ?? false,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                flex: 2,
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(vertical: 4, horizontal: 8),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(6),
                    color: TerminusTheme.bgPanel.withValues(alpha: 0.5),
                    border: Border.all(
                      color: TerminusTheme.border.withValues(alpha: 0.3),
                    ),
                  ),
                  child: HeartbeatLine(
                    color: TerminusTheme.lumenColor(sm.lumen),
                    height: 36,
                    isAlive: sm.lumen > 0,
                    bpm: _heartRate(sm.lumen),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildMessageList(TerminusSession session) {
    _scrollToBottom();
    return ListView.builder(
      controller: _scrollController,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      itemCount: session.messages.length,
      itemBuilder: (context, index) {
        final msg = session.messages[index];
        return _buildMessage(msg);
      },
    );
  }

  Widget _buildMessage(ChatMessage msg) {
    final isUser = msg.role == 'user';
    final isSystem = msg.role == 'system';
    final isGhost = msg.role == 'ghost';

    Color textColor;
    Color bgColor;
    String prefix;

    if (isGhost) {
      return Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.all(14),
          decoration: TerminusTheme.richPanel(
            accentColor: TerminusTheme.neonPurple,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '[SIGNAL — UNKNOWN FREQUENCY]',
                style: TerminusTheme.labelText.copyWith(
                  color: TerminusTheme.neonPurple.withValues(alpha: 0.6),
                  fontSize: 9,
                ),
              ),
              const SizedBox(height: 8),
              GlitchText(
                text: msg.content,
                style: TerminusTheme.narrative.copyWith(
                  color: TerminusTheme.neonPurple.withValues(alpha: 0.8),
                  fontStyle: FontStyle.italic,
                ),
                glitchIntensity: 0.8,
              ),
            ],
          ),
        ),
      );
    }

    if (isUser) {
      textColor = TerminusTheme.neonGreen;
      bgColor = TerminusTheme.neonGreen.withValues(alpha: 0.04);
      prefix = '> ';
    } else if (isSystem) {
      textColor = TerminusTheme.neonOrange;
      bgColor = TerminusTheme.neonOrange.withValues(alpha: 0.04);
      prefix = '[SYSTEM] ';
    } else {
      textColor = TerminusTheme.textPrimary;
      bgColor = Colors.transparent;
      prefix = '';
    }

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(6),
          border: isUser || isSystem
              ? Border.all(color: textColor.withValues(alpha: 0.15))
              : null,
        ),
        child: isUser || isSystem
            ? SelectableText(
                '$prefix${msg.content}',
                style: TerminusTheme.narrative.copyWith(
                  color: textColor,
                  fontSize: isSystem ? 12 : 14,
                ),
              )
            : NarrativeText(
                text: msg.content,
                animate: msg ==
                    (context
                        .read<SessionManager>()
                        .session
                        ?.messages
                        .lastOrNull),
              ),
      ),
    );
  }

  Widget _buildInputArea(SessionManager sm) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            Colors.black.withValues(alpha: 0.7),
            Colors.black.withValues(alpha: 0.95),
          ],
        ),
        border: Border(
          top: BorderSide(
            color: TerminusTheme.neonGreen.withValues(alpha: 0.2),
          ),
        ),
      ),
      child: Row(
        children: [
          Text(
            '>_',
            style: TerminusTheme.systemLog.copyWith(
              color: TerminusTheme.neonGreen.withValues(alpha: 0.5),
              fontSize: 14,
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: TextField(
              controller: _inputController,
              focusNode: _inputFocus,
              style: TerminusTheme.narrative.copyWith(
                color: TerminusTheme.neonGreen,
                fontSize: 14,
              ),
              maxLines: 3,
              minLines: 1,
              decoration: InputDecoration(
                hintText: 'What do you do?',
                hintStyle: TerminusTheme.narrativeItalic.copyWith(
                  color: TerminusTheme.textDim.withValues(alpha: 0.3),
                  fontSize: 13,
                ),
                contentPadding: const EdgeInsets.symmetric(
                    horizontal: 12, vertical: 10),
                isDense: true,
                filled: true,
                fillColor: const Color(0xFF060C18),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(6),
                  borderSide: BorderSide(
                    color: TerminusTheme.neonGreen.withValues(alpha: 0.2),
                  ),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(6),
                  borderSide: BorderSide(
                    color: TerminusTheme.neonGreen.withValues(alpha: 0.2),
                  ),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(6),
                  borderSide: BorderSide(
                    color: TerminusTheme.neonGreen.withValues(alpha: 0.5),
                    width: 1.5,
                  ),
                ),
              ),
              onSubmitted: (_) => _sendMessage(),
            ),
          ),
          const SizedBox(width: 8),
          GestureDetector(
            onTap: sm.isLoading ? null : _sendMessage,
            child: Container(
              padding: const EdgeInsets.all(10),
              decoration: TerminusTheme.neonButton(
                color: sm.isLoading
                    ? TerminusTheme.textDim
                    : TerminusTheme.neonCyan,
                radius: 6,
              ),
              child: sm.isLoading
                  ? SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(
                        strokeWidth: 1.5,
                        color:
                            TerminusTheme.neonCyan.withValues(alpha: 0.4),
                      ),
                    )
                  : Icon(
                      Icons.send_rounded,
                      color: TerminusTheme.neonCyan,
                      size: 16,
                    ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCommanderPause(SessionManager sm) {
    return Expanded(
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Container(
            padding: const EdgeInsets.all(32),
            decoration: TerminusTheme.richPanel(
              accentColor: TerminusTheme.neonOrange,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: TerminusTheme.neonOrange.withValues(alpha: 0.1),
                    border: Border.all(
                      color: TerminusTheme.neonOrange.withValues(alpha: 0.3),
                    ),
                  ),
                  child: Icon(
                    Icons.shield_outlined,
                    color: TerminusTheme.neonOrange.withValues(alpha: 0.7),
                    size: 40,
                  ),
                ),
                const SizedBox(height: 20),
                Text(
                  'OPERATIONAL REST',
                  style: TerminusTheme.displayMedium.copyWith(
                    color: TerminusTheme.neonOrange,
                    fontSize: 18,
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  'The Commander has ordered a 30-minute rest.\n'
                  'There are no threats. There are no decisions.\n'
                  'There is only silence and breathing.',
                  style: TerminusTheme.narrative,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 28),
                _ResumeButton(
                  onTap: () => sm.resumeFromPause(),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSessionComplete() {
    final session = context.read<SessionManager>().session!;
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            Colors.black.withValues(alpha: 0.7),
            Colors.black.withValues(alpha: 0.95),
          ],
        ),
        border: Border(
          top: BorderSide(
            color: TerminusTheme.neonRed.withValues(alpha: 0.3),
          ),
        ),
      ),
      child: Column(
        children: [
          HeartbeatLine(
            color: TerminusTheme.neonRed,
            height: 30,
            isAlive: false,
          ),
          const SizedBox(height: 12),
          GlitchText(
            text: '[NULL] // \u2591\u2591\u2591\u2591\u2591\u2591',
            style: TerminusTheme.systemLog.copyWith(
              color: TerminusTheme.neonRed,
              fontSize: 11,
            ),
            glitchIntensity: 0.7,
          ),
          const SizedBox(height: 20),
          _SessionEndButton(
            label: 'FINAL PLAYBACK',
            color: TerminusTheme.neonRed,
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) =>
                    ShipLogConfirmationScreen(session: session),
              ),
            ),
          ),
          const SizedBox(height: 10),
          _SessionEndButton(
            label: 'RETURN TO THE LIGHT',
            color: TerminusTheme.metalSteel,
            onTap: () => Navigator.pop(context),
          ),
        ],
      ),
    );
  }

  // ── Dynamic visual parameters ──

  Color _rainColor(int lumen) {
    if (lumen >= 7) return TerminusTheme.neonCyan;
    if (lumen >= 4) return TerminusTheme.neonGreen;
    if (lumen >= 2) return TerminusTheme.neonOrange;
    return TerminusTheme.neonRed;
  }

  double _rainDensity(int lumen) => 0.15 + (1 - lumen / 10.0) * 0.4;
  double _rainSpeed(int lumen) => 0.3 + (1 - lumen / 10.0) * 0.8;
  double _rainOpacity(int lumen) => 0.04 + (1 - lumen / 10.0) * 0.08;

  double _scanlineOpacity(int lumen) =>
      0.04 + (1 - lumen / 10.0) * 0.10;

  double _heartRate(int lumen) {
    if (lumen >= 7) return 72;
    if (lumen >= 4) return 95;
    if (lumen >= 2) return 120;
    if (lumen == 1) return 140;
    return 0;
  }

  Color _phaseColor(SessionPhase phase) {
    switch (phase) {
      case SessionPhase.primiPassi:
        return TerminusTheme.neonCyan;
      case SessionPhase.assedio:
        return TerminusTheme.neonOrange;
      case SessionPhase.declino:
        return TerminusTheme.neonRed;
      case SessionPhase.ultimaLuce:
        return TerminusTheme.neonRed;
      case SessionPhase.morte:
        return TerminusTheme.neonRed;
    }
  }

  String _phaseLabel(SessionPhase phase) {
    switch (phase) {
      case SessionPhase.primiPassi:
        return 'NOMINAL';
      case SessionPhase.assedio:
        return 'CRITICAL';
      case SessionPhase.declino:
        return 'TERMINAL';
      case SessionPhase.ultimaLuce:
        return 'FLAT';
      case SessionPhase.morte:
        return 'NULL';
    }
  }

  String _crtHeader(int lumen, SessionPhase phase) {
    if (lumen >= 7) return 'TERMINUS-OMNI // ${_phaseLabel(phase)}';
    if (lumen >= 4) return 'TERM-OMNI // ${_phaseLabel(phase)}';
    if (lumen >= 2)
      return 'TER\u2588\u2591NUS // ${_phaseLabel(phase)}';
    if (lumen == 1)
      return '\u2588ER\u2591\u2588\u2591US // \u2591\u2591\u2591\u2591';
    return '[NULL]';
  }

  double _throttleFactor(int lumen) {
    if (lumen >= 7) return 1.0;
    if (lumen >= 4) return 0.8;
    if (lumen >= 2) return 0.5;
    return 0.3;
  }

  List<TerminalAction> _buildActions(SessionPhase phase) {
    switch (phase) {
      case SessionPhase.primiPassi:
        return const [
          TerminalAction(
            id: 'explore',
            label: 'EXPLORE',
            type: ActionType.coherent,
            cost: null,
            prompt: 'I explore my surroundings carefully.',
          ),
          TerminalAction(
            id: 'talk',
            label: 'TALK',
            type: ActionType.coherent,
            cost: null,
            prompt: 'I try to talk to someone nearby.',
          ),
          TerminalAction(
            id: 'observe',
            label: 'OBSERVE',
            type: ActionType.neutral,
            cost: null,
            prompt: 'I stop and observe what is happening around me.',
          ),
          TerminalAction(
            id: 'risk',
            label: 'TAKE RISK',
            type: ActionType.entropic,
            cost: '-1 POOL',
            prompt: 'I take a dangerous risk.',
          ),
        ];
      case SessionPhase.assedio:
        return const [
          TerminalAction(
            id: 'defend',
            label: 'DEFEND',
            type: ActionType.coherent,
            cost: null,
            prompt: 'I try to defend what remains.',
          ),
          TerminalAction(
            id: 'sacrifice',
            label: 'SACRIFICE',
            type: ActionType.entropic,
            cost: '-1 LUMEN',
            prompt: 'I sacrifice something precious to survive.',
          ),
          TerminalAction(
            id: 'truth',
            label: 'SPEAK\nTRUTH',
            type: ActionType.neutral,
            cost: null,
            prompt: 'I speak a truth I have been avoiding.',
          ),
          TerminalAction(
            id: 'flee',
            label: 'FLEE',
            type: ActionType.desperate,
            cost: '-2 POOL',
            prompt: 'I abandon everything and flee.',
          ),
        ];
      case SessionPhase.declino:
        return const [
          TerminalAction(
            id: 'resist',
            label: 'RESIST',
            type: ActionType.coherent,
            cost: null,
            prompt:
                'I resist the darkness with everything I have left.',
          ),
          TerminalAction(
            id: 'accept',
            label: 'ACCEPT',
            type: ActionType.entropic,
            cost: null,
            prompt: 'I accept what is happening.',
          ),
          TerminalAction(
            id: 'remember',
            label: 'REMEMBER',
            type: ActionType.neutral,
            cost: null,
            prompt: 'I remember who I was before all this.',
          ),
          TerminalAction(
            id: 'brink',
            label: 'THE BRINK',
            type: ActionType.desperate,
            cost: 'ALL IN',
            isWide: true,
            requiredLumen: 2,
            prompt:
                'I push myself to the absolute limit. Everything or nothing.',
          ),
        ];
      case SessionPhase.ultimaLuce:
        return const [
          TerminalAction(
            id: 'lastwords',
            label: 'LAST WORDS',
            type: ActionType.coherent,
            cost: null,
            isWide: true,
            prompt: 'I speak my final words.',
          ),
          TerminalAction(
            id: 'letgo',
            label: 'LET GO',
            type: ActionType.entropic,
            cost: null,
            isWide: true,
            prompt: 'I let go.',
          ),
        ];
      case SessionPhase.morte:
        return const [];
    }
  }
}

class _ResumeButton extends StatefulWidget {
  final VoidCallback onTap;
  const _ResumeButton({required this.onTap});
  @override
  State<_ResumeButton> createState() => _ResumeButtonState();
}

class _ResumeButtonState extends State<_ResumeButton> {
  bool _pressed = false;
  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: (_) => setState(() => _pressed = true),
      onTapUp: (_) {
        setState(() => _pressed = false);
        widget.onTap();
      },
      onTapCancel: () => setState(() => _pressed = false),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 120),
        padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
        decoration: TerminusTheme.neonButton(
          color: TerminusTheme.neonOrange,
          isPressed: _pressed,
        ),
        child: Text(
          'I AM READY TO RESUME',
          style: TerminusTheme.buttonText.copyWith(
            color: TerminusTheme.neonOrange,
          ),
        ),
      ),
    );
  }
}

class _SessionEndButton extends StatefulWidget {
  final String label;
  final Color color;
  final VoidCallback onTap;
  const _SessionEndButton(
      {required this.label, required this.color, required this.onTap});
  @override
  State<_SessionEndButton> createState() => _SessionEndButtonState();
}

class _SessionEndButtonState extends State<_SessionEndButton> {
  bool _pressed = false;
  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: (_) => setState(() => _pressed = true),
      onTapUp: (_) {
        setState(() => _pressed = false);
        widget.onTap();
      },
      onTapCancel: () => setState(() => _pressed = false),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 120),
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: TerminusTheme.neonButton(
          color: widget.color,
          isPressed: _pressed,
        ),
        child: Center(
          child: Text(
            widget.label,
            style: TerminusTheme.buttonText.copyWith(color: widget.color),
          ),
        ),
      ),
    );
  }
}
