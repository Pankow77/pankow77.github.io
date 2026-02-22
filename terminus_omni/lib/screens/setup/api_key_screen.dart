import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../config/theme.dart';
import '../../services/storage_service.dart';
import '../../services/llm_service.dart';
import '../../widgets/scanline_overlay.dart';

/// Screen for configuring the Gemini API key.
class ApiKeyScreen extends StatefulWidget {
  const ApiKeyScreen({super.key});

  @override
  State<ApiKeyScreen> createState() => _ApiKeyScreenState();
}

class _ApiKeyScreenState extends State<ApiKeyScreen> {
  final _controller = TextEditingController();
  bool _obscure = true;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _loadExisting();
  }

  Future<void> _loadExisting() async {
    final key = await context.read<StorageService>().getApiKey();
    if (key != null) {
      _controller.text = key;
    }
  }

  Future<void> _save() async {
    final key = _controller.text.trim();
    if (key.isEmpty) return;

    setState(() => _saving = true);

    await context.read<StorageService>().setApiKey(key);
    context.read<LlmService>().configure(key);

    setState(() => _saving = false);

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'API KEY SALVATA',
            style: TerminusTheme.systemLog,
          ),
          backgroundColor: TerminusTheme.bgPanel,
        ),
      );
      Navigator.pop(context);
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ScanlineOverlay(
      child: Scaffold(
        appBar: AppBar(
          title: Text(
            'CONFIGURAZIONE',
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
                'GEMINI API KEY',
                style: TerminusTheme.systemLog,
              ),
              const SizedBox(height: 8),
              Text(
                'TERMINUS-OMNI richiede una API key di Google AI Studio '
                'per comunicare con Gemini. La key è salvata localmente '
                'sul tuo dispositivo e non viene mai trasmessa a terzi.',
                style: TerminusTheme.narrativeItalic.copyWith(fontSize: 12),
              ),
              const SizedBox(height: 24),
              TextField(
                controller: _controller,
                obscureText: _obscure,
                style: TerminusTheme.narrative.copyWith(fontSize: 13),
                decoration: InputDecoration(
                  labelText: 'API Key',
                  suffixIcon: IconButton(
                    icon: Icon(
                      _obscure ? Icons.visibility_off : Icons.visibility,
                      color: TerminusTheme.textDim,
                      size: 18,
                    ),
                    onPressed: () => setState(() => _obscure = !_obscure),
                  ),
                ),
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _saving ? null : _save,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: TerminusTheme.neonCyan.withValues(alpha: 0.15),
                    foregroundColor: TerminusTheme.neonCyan,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(4),
                      side: BorderSide(
                          color: TerminusTheme.neonCyan.withValues(alpha: 0.3)),
                    ),
                  ),
                  child: Text(
                    _saving ? 'SALVATAGGIO...' : 'SALVA',
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
