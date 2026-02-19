import 'package:flutter/material.dart';
import '../config/theme.dart';
import '../services/llm/llm_service.dart';
import '../widgets/blinking_cursor.dart';

/// BYOK configuration screen.
///
/// Styled like a ship's configuration terminal. The user enters their
/// LLM API key here. No key ever touches our servers — this is the
/// architecture of privacy, not just a policy.
class SettingsScreen extends StatefulWidget {
  final LlmProvider? currentProvider;
  final String? currentApiKey;
  final String? currentModel;
  final void Function(LlmProvider provider, String apiKey, String model) onSave;
  final VoidCallback? onBack;

  const SettingsScreen({
    super.key,
    this.currentProvider,
    this.currentApiKey,
    this.currentModel,
    required this.onSave,
    this.onBack,
  });

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  late LlmProvider _selectedProvider;
  late TextEditingController _apiKeyController;
  late TextEditingController _modelController;
  bool _obscureKey = true;
  bool _testing = false;
  String? _testResult;

  @override
  void initState() {
    super.initState();
    _selectedProvider = widget.currentProvider ?? LlmProvider.openai;
    _apiKeyController = TextEditingController(text: widget.currentApiKey ?? '');
    _modelController = TextEditingController(
      text: widget.currentModel ?? _selectedProvider.defaultModel,
    );
  }

  @override
  void dispose() {
    _apiKeyController.dispose();
    _modelController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: TerminusTheme.background,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Text(
                '  TERMINUS — CONFIGURATION',
                style: TerminusTheme.terminalFont(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                '  LLM Core Authorization',
                style: TerminusTheme.terminalFont(
                  fontSize: 12,
                  color: TerminusTheme.phosphorDim,
                ),
              ),
              _divider(),

              // Provider selection
              Text(
                '  Select LLM provider:',
                style: TerminusTheme.terminalFont(fontSize: 13),
              ),
              const SizedBox(height: 8),
              ...LlmProvider.values.map(_buildProviderOption),
              _divider(),

              // API Key
              Text(
                '  Authorization key:',
                style: TerminusTheme.terminalFont(fontSize: 13),
              ),
              const SizedBox(height: 8),
              _buildKeyInput(),
              _divider(),

              // Model
              Text(
                '  Model:',
                style: TerminusTheme.terminalFont(fontSize: 13),
              ),
              const SizedBox(height: 8),
              _buildModelInput(),
              _divider(),

              // Test result
              if (_testResult != null) ...[
                Text(
                  '  $_testResult',
                  style: TerminusTheme.terminalFont(
                    fontSize: 12,
                    color: _testResult!.contains('ONLINE')
                        ? TerminusTheme.phosphorGreen
                        : TerminusTheme.critical,
                  ),
                ),
                const SizedBox(height: 12),
              ],

              const Spacer(),

              // Actions
              Row(
                children: [
                  if (widget.onBack != null)
                    _buildButton('< BACK', widget.onBack!),
                  const Spacer(),
                  if (_apiKeyController.text.isNotEmpty)
                    _buildButton(
                      _testing ? 'TESTING...' : 'SAVE & CONNECT',
                      _testing ? () {} : _save,
                      color: TerminusTheme.phosphorBright,
                    ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                '  Your key is stored locally. It never leaves this device.',
                style: TerminusTheme.terminalFont(
                  fontSize: 10,
                  color: TerminusTheme.phosphorDim,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildProviderOption(LlmProvider provider) {
    final isSelected = provider == _selectedProvider;
    return GestureDetector(
      onTap: () {
        setState(() {
          _selectedProvider = provider;
          _modelController.text = provider.defaultModel;
        });
      },
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 3),
        child: Row(
          children: [
            Text(
              isSelected ? '  [●] ' : '  [ ] ',
              style: TerminusTheme.terminalFont(
                fontSize: 13,
                color: isSelected
                    ? TerminusTheme.phosphorGreen
                    : TerminusTheme.phosphorDim,
              ),
            ),
            Text(
              provider.displayName,
              style: TerminusTheme.terminalFont(
                fontSize: 13,
                color: isSelected
                    ? TerminusTheme.phosphorGreen
                    : TerminusTheme.phosphorDim,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildKeyInput() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      decoration: BoxDecoration(
        color: TerminusTheme.inputSurface,
        border: Border.all(
          color: TerminusTheme.phosphorDim.withValues(alpha: 0.3),
        ),
      ),
      child: Row(
        children: [
          Text(
            '> ',
            style: TerminusTheme.terminalFont(
              fontSize: 13,
              color: TerminusTheme.phosphorDim,
            ),
          ),
          Expanded(
            child: TextField(
              controller: _apiKeyController,
              obscureText: _obscureKey,
              style: TerminusTheme.terminalFont(fontSize: 13),
              decoration: InputDecoration(
                border: InputBorder.none,
                hintText: 'sk-...',
                hintStyle: TerminusTheme.terminalFont(
                  fontSize: 13,
                  color: TerminusTheme.phosphorDim.withValues(alpha: 0.3),
                ),
                isDense: true,
                contentPadding: EdgeInsets.zero,
              ),
              onChanged: (_) => setState(() {}),
            ),
          ),
          GestureDetector(
            onTap: () => setState(() => _obscureKey = !_obscureKey),
            child: Text(
              _obscureKey ? '[SHOW]' : '[HIDE]',
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

  Widget _buildModelInput() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      decoration: BoxDecoration(
        color: TerminusTheme.inputSurface,
        border: Border.all(
          color: TerminusTheme.phosphorDim.withValues(alpha: 0.3),
        ),
      ),
      child: Row(
        children: [
          Text(
            '> ',
            style: TerminusTheme.terminalFont(
              fontSize: 13,
              color: TerminusTheme.phosphorDim,
            ),
          ),
          Expanded(
            child: TextField(
              controller: _modelController,
              style: TerminusTheme.terminalFont(fontSize: 13),
              decoration: InputDecoration(
                border: InputBorder.none,
                isDense: true,
                contentPadding: EdgeInsets.zero,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildButton(String label, VoidCallback onTap, {Color? color}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          border: Border.all(
            color: color ?? TerminusTheme.phosphorDim,
          ),
        ),
        child: Text(
          label,
          style: TerminusTheme.terminalFont(
            fontSize: 13,
            color: color ?? TerminusTheme.phosphorDim,
          ),
        ),
      ),
    );
  }

  Widget _divider() {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Text(
        '  ${'─' * 40}',
        style: TerminusTheme.terminalFont(
          fontSize: 12,
          color: TerminusTheme.phosphorDim.withValues(alpha: 0.3),
        ),
      ),
    );
  }

  void _save() {
    final key = _apiKeyController.text.trim();
    if (key.isEmpty) return;

    widget.onSave(
      _selectedProvider,
      key,
      _modelController.text.trim(),
    );
  }
}
