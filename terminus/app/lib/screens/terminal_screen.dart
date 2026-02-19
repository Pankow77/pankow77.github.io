import 'package:flutter/material.dart';
import '../config/theme.dart';
import '../models/message.dart';
import '../models/lumen_state.dart';
import '../models/session_data.dart';
import '../widgets/lumen_indicator.dart';
import '../widgets/blinking_cursor.dart';

/// The main terminal screen — where the journey happens.
///
/// A terminal interface with:
/// - Lumen indicator at the top (the heartbeat)
/// - Message history (each character has their color)
/// - Input field at the bottom (the user's voice)
///
/// This screen is the ship. The user lives here until the ship dies.
class TerminalScreen extends StatefulWidget {
  final SessionData session;
  final void Function(String message) onSendMessage;
  final VoidCallback? onOpenSettings;

  const TerminalScreen({
    super.key,
    required this.session,
    required this.onSendMessage,
    this.onOpenSettings,
  });

  @override
  State<TerminalScreen> createState() => _TerminalScreenState();
}

class _TerminalScreenState extends State<TerminalScreen> {
  final TextEditingController _inputController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final FocusNode _focusNode = FocusNode();

  @override
  void dispose() {
    _inputController.dispose();
    _scrollController.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  @override
  void didUpdateWidget(TerminalScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    // Auto-scroll when new messages arrive
    if (widget.session.messages.length != oldWidget.session.messages.length) {
      _scrollToBottom();
    }
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

  void _sendMessage() {
    final text = _inputController.text.trim();
    if (text.isEmpty) return;
    if (widget.session.isProcessing) return;

    widget.onSendMessage(text);
    _inputController.clear();
    _focusNode.requestFocus();
  }

  @override
  Widget build(BuildContext context) {
    final isDecompression = widget.session.phase == SessionPhase.decompression;

    return Scaffold(
      backgroundColor: TerminusTheme.background,
      body: SafeArea(
        child: Column(
          children: [
            // Top bar: Lumen indicator + settings
            _buildTopBar(),

            // Divider
            Container(
              height: 1,
              color: TerminusTheme.phosphorDim.withValues(alpha: 0.2),
            ),

            // Message history
            Expanded(
              child: _buildMessageList(),
            ),

            // Input area
            if (!isDecompression)
              _buildInputBar()
            else
              _buildDecompressionInput(),
          ],
        ),
      ),
    );
  }

  Widget _buildTopBar() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        children: [
          Expanded(
            child: LumenIndicator(
              lumenState: widget.session.lumen,
            ),
          ),
          if (widget.onOpenSettings != null)
            GestureDetector(
              onTap: widget.onOpenSettings,
              child: Text(
                '[CFG]',
                style: TerminusTheme.terminalFont(
                  fontSize: 11,
                  color: TerminusTheme.phosphorDim,
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildMessageList() {
    if (widget.session.messages.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'TERMINUS',
              style: TerminusTheme.terminalFont(
                fontSize: 24,
                color: TerminusTheme.phosphorDim.withValues(alpha: 0.3),
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Awaiting crew input...',
              style: TerminusTheme.terminalFont(
                fontSize: 12,
                color: TerminusTheme.phosphorDim.withValues(alpha: 0.2),
              ),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      controller: _scrollController,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      itemCount: widget.session.messages.length +
          (widget.session.isProcessing ? 1 : 0),
      itemBuilder: (context, index) {
        // Processing indicator
        if (index == widget.session.messages.length) {
          return Padding(
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: Row(
              children: [
                Text(
                  '  ',
                  style: TerminusTheme.terminalFont(fontSize: 13),
                ),
                const BlinkingCursor(
                  prefix: '',
                  fontSize: 13,
                  color: TerminusTheme.phosphorDim,
                ),
              ],
            ),
          );
        }

        return _buildMessageTile(widget.session.messages[index]);
      },
    );
  }

  Widget _buildMessageTile(NarrativeMessage message) {
    final isUser = message.source == MessageSource.user;
    final isSystem = message.source == MessageSource.system;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Prefix
          SizedBox(
            width: isUser ? 20 : 100,
            child: Text(
              message.prefix,
              style: TerminusTheme.terminalFont(
                fontSize: 13,
                color: message.color,
                fontWeight: isSystem ? FontWeight.normal : FontWeight.bold,
              ),
            ),
          ),
          const SizedBox(width: 4),
          // Content
          Expanded(
            child: Text(
              message.content,
              style: TerminusTheme.terminalFont(
                fontSize: 13,
                color: isUser
                    ? TerminusTheme.userColor
                    : isSystem
                        ? message.color.withValues(alpha: 0.7)
                        : message.color,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInputBar() {
    return Container(
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
              decoration: InputDecoration(
                border: InputBorder.none,
                hintText: widget.session.isProcessing
                    ? ''
                    : 'Type your response...',
                hintStyle: TerminusTheme.terminalFont(
                  fontSize: 14,
                  color: TerminusTheme.phosphorDim.withValues(alpha: 0.3),
                ),
                isDense: true,
                contentPadding: EdgeInsets.zero,
              ),
              enabled: !widget.session.isProcessing,
              onSubmitted: (_) => _sendMessage(),
              textInputAction: TextInputAction.send,
            ),
          ),
          GestureDetector(
            onTap: _sendMessage,
            child: Text(
              '[SEND]',
              style: TerminusTheme.terminalFont(
                fontSize: 12,
                color: widget.session.isProcessing
                    ? TerminusTheme.offline
                    : TerminusTheme.phosphorDim,
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// Post-ending: black screen, blinking cursor, write whatever you want.
  Widget _buildDecompressionInput() {
    return Container(
      padding: const EdgeInsets.all(12),
      child: Row(
        children: [
          Text(
            '> ',
            style: TerminusTheme.terminalFont(
              fontSize: 16,
              color: TerminusTheme.phosphorGreen,
            ),
          ),
          Expanded(
            child: TextField(
              controller: _inputController,
              focusNode: _focusNode,
              style: TerminusTheme.terminalFont(
                fontSize: 15,
                color: TerminusTheme.userColor,
              ),
              decoration: const InputDecoration(
                border: InputBorder.none,
                isDense: true,
                contentPadding: EdgeInsets.zero,
              ),
              onSubmitted: (_) => _sendMessage(),
              maxLines: null,
            ),
          ),
        ],
      ),
    );
  }
}
