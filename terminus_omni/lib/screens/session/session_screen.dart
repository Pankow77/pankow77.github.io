import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../config/theme.dart';
import '../../core/session_manager.dart';
import '../../models/session.dart';
import '../../widgets/scanline_overlay.dart';
import '../../widgets/lumen_display.dart';
import '../../widgets/narrative_text.dart';
import '../../widgets/glitch_text.dart';
import '../finale/final_recording_screen.dart';

/// The main session screen — where TERMINUS-OMNI runs.
///
/// The subject interacts with the LLM through text.
/// The Lumen-Count is visible. The darkness advances.
class SessionScreen extends StatefulWidget {
  const SessionScreen({super.key});

  @override
  State<SessionScreen> createState() => _SessionScreenState();
}

class _SessionScreenState extends State<SessionScreen> {
  final _inputController = TextEditingController();
  final _scrollController = ScrollController();
  final _inputFocus = FocusNode();

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

  Future<void> _sendMessage() async {
    final text = _inputController.text.trim();
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
        body: Center(
          child: Text('Nessuna sessione attiva'),
        ),
      );
    }

    return ScanlineOverlay(
      opacity: _scanlineOpacity(sm.lumen),
      child: Scaffold(
        backgroundColor: _bgColor(sm.lumen),
        body: SafeArea(
          child: Column(
            children: [
              // Header: Lumen display + session info
              _buildHeader(sm, session),

              // Commander pause overlay
              if (sm.isPaused)
                _buildCommanderPause(sm)
              else ...[
                // Message list
                Expanded(child: _buildMessageList(session)),

                // Input area
                if (!session.isComplete) _buildInputArea(sm),

                // Session complete
                if (session.isComplete) _buildSessionComplete(),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(SessionManager sm, TerminusSession session) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: const BoxDecoration(
        color: TerminusTheme.bgPanel,
        border: Border(
          bottom: BorderSide(color: TerminusTheme.border),
        ),
      ),
      child: Column(
        children: [
          Row(
            children: [
              IconButton(
                icon: const Icon(Icons.arrow_back,
                    color: TerminusTheme.textDim, size: 18),
                onPressed: () => Navigator.pop(context),
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
              ),
              const SizedBox(width: 8),
              Text(
                'TERMINUS-OMNI',
                style: TerminusTheme.systemLog.copyWith(
                  color: TerminusTheme.lumenColor(sm.lumen),
                  fontSize: 11,
                ),
              ),
              const Spacer(),
              Text(
                _phaseLabel(sm.phase),
                style: TerminusTheme.systemLog.copyWith(
                  color: TerminusTheme.neonOrange,
                  fontSize: 9,
                ),
              ),
              const SizedBox(width: 12),
              Text(
                'POOL: ${session.dicePool}+${session.hopeDice}',
                style: TerminusTheme.systemLog.copyWith(
                  color: TerminusTheme.textDim,
                  fontSize: 9,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          LumenDisplay(currentLumen: sm.lumen),
        ],
      ),
    );
  }

  Widget _buildMessageList(TerminusSession session) {
    _scrollToBottom();
    return ListView.builder(
      controller: _scrollController,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
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
      // Ghost Voice — heavy glitch, distorted
      return Padding(
        padding: const EdgeInsets.only(bottom: 16),
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: TerminusTheme.neonPurple.withValues(alpha: 0.04),
            borderRadius: BorderRadius.circular(4),
            border: Border.all(
                color: TerminusTheme.neonPurple.withValues(alpha: 0.2)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '[SEGNALE — FREQUENZA SCONOSCIUTA]',
                style: TerminusTheme.systemLog.copyWith(
                  color: TerminusTheme.neonPurple.withValues(alpha: 0.5),
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
      bgColor = TerminusTheme.neonGreen.withValues(alpha: 0.05);
      prefix = '> ';
    } else if (isSystem) {
      textColor = TerminusTheme.neonOrange;
      bgColor = TerminusTheme.neonOrange.withValues(alpha: 0.05);
      prefix = '[SISTEMA] ';
    } else {
      textColor = TerminusTheme.textPrimary;
      bgColor = Colors.transparent;
      prefix = '';
    }

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(4),
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
                animate: msg == (context.read<SessionManager>().session?.messages.lastOrNull),
              ),
      ),
    );
  }

  Widget _buildInputArea(SessionManager sm) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: const BoxDecoration(
        color: TerminusTheme.bgPanel,
        border: Border(
          top: BorderSide(color: TerminusTheme.border),
        ),
      ),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: _inputController,
              focusNode: _inputFocus,
              style: TerminusTheme.narrative.copyWith(
                color: TerminusTheme.neonGreen,
                fontSize: 14,
              ),
              maxLines: 4,
              minLines: 1,
              decoration: InputDecoration(
                hintText: 'Cosa fai?',
                hintStyle: TerminusTheme.narrativeItalic.copyWith(
                  color: TerminusTheme.textDim.withValues(alpha: 0.4),
                ),
                contentPadding: const EdgeInsets.symmetric(
                    horizontal: 12, vertical: 10),
                isDense: true,
              ),
              onSubmitted: (_) => _sendMessage(),
            ),
          ),
          const SizedBox(width: 8),
          IconButton(
            onPressed: sm.isLoading ? null : _sendMessage,
            icon: sm.isLoading
                ? SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                      strokeWidth: 1.5,
                      color: TerminusTheme.neonCyan.withValues(alpha: 0.5),
                    ),
                  )
                : const Icon(
                    Icons.send_rounded,
                    color: TerminusTheme.neonCyan,
                    size: 20,
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
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.shield_outlined,
                color: TerminusTheme.neonOrange.withValues(alpha: 0.6),
                size: 48,
              ),
              const SizedBox(height: 16),
              Text(
                'RIPOSO OPERATIVO',
                style: TerminusTheme.displayMedium.copyWith(
                  color: TerminusTheme.neonOrange,
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'Il Comandante ha ordinato una pausa di 30 minuti.\n'
                'Non ci sono minacce. Non ci sono decisioni.\n'
                'C\'è solo il silenzio e il respiro.',
                style: TerminusTheme.narrative,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 32),
              OutlinedButton(
                onPressed: () => sm.resumeFromPause(),
                style: OutlinedButton.styleFrom(
                  side: BorderSide(
                      color: TerminusTheme.neonOrange.withValues(alpha: 0.3)),
                  padding:
                      const EdgeInsets.symmetric(horizontal: 32, vertical: 14),
                ),
                child: Text(
                  'SONO PRONTO A RIPRENDERE',
                  style: TerminusTheme.buttonText.copyWith(
                    color: TerminusTheme.neonOrange,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSessionComplete() {
    final session = context.read<SessionManager>().session!;
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: const BoxDecoration(
        color: TerminusTheme.bgPanel,
        border: Border(
          top: BorderSide(color: TerminusTheme.border),
        ),
      ),
      child: Column(
        children: [
          Text(
            'TERMINUS-OMNI // SISTEMA OFFLINE',
            style: TerminusTheme.systemLog.copyWith(
              color: TerminusTheme.neonRed,
            ),
          ),
          const SizedBox(height: 12),
          OutlinedButton(
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => FinalRecordingScreen(
                    testament: session.profile.testament,
                    characterName: session.profile.name,
                    shipLog: session.generateShipLog(),
                  ),
                ),
              );
            },
            style: OutlinedButton.styleFrom(
              side: BorderSide(
                  color: TerminusTheme.neonRed.withValues(alpha: 0.3)),
              padding:
                  const EdgeInsets.symmetric(horizontal: 32, vertical: 14),
            ),
            child: Text(
              'RIPRODUZIONE FINALE',
              style: TerminusTheme.buttonText.copyWith(
                color: TerminusTheme.neonRed,
              ),
            ),
          ),
          const SizedBox(height: 8),
          OutlinedButton(
            onPressed: () => Navigator.pop(context),
            style: OutlinedButton.styleFrom(
              side: const BorderSide(color: TerminusTheme.border),
              padding:
                  const EdgeInsets.symmetric(horizontal: 32, vertical: 14),
            ),
            child: Text(
              'TORNA ALLA LUCE',
              style: TerminusTheme.buttonText.copyWith(
                color: TerminusTheme.textDim,
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// Background darkens as lumen decreases.
  Color _bgColor(int lumen) {
    final factor = lumen / 10.0;
    return Color.lerp(
      const Color(0xFF000000),
      TerminusTheme.bgDeep,
      factor,
    )!;
  }

  /// Scanlines intensify as lumen decreases.
  double _scanlineOpacity(int lumen) {
    return 0.04 + (1 - lumen / 10.0) * 0.08;
  }

  String _phaseLabel(SessionPhase phase) {
    switch (phase) {
      case SessionPhase.primiPassi:
        return 'FASE 1: I PRIMI PASSI';
      case SessionPhase.assedio:
        return 'FASE 2: L\'ASSEDIO';
      case SessionPhase.declino:
        return 'FASE 3: IL DECLINO';
      case SessionPhase.ultimaLuce:
        return 'FASE 4: L\'ULTIMA LUCE';
      case SessionPhase.morte:
        return 'LUMEN 0: MORTE';
    }
  }
}
