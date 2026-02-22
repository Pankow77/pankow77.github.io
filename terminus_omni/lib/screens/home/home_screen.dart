import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../config/theme.dart';
import '../../core/session_manager.dart';
import '../../services/storage_service.dart';
import '../../widgets/scanline_overlay.dart';
import '../../widgets/glitch_text.dart';
import '../setup/api_key_screen.dart';
import '../setup/character_creation_screen.dart';
import '../session/session_screen.dart';
import '../archive/sessions_archive_screen.dart';

/// Home screen — the entry point to TERMINUS-OMNI.
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  bool _hasApiKey = false;

  @override
  void initState() {
    super.initState();
    _checkApiKey();
  }

  Future<void> _checkApiKey() async {
    final key = await context.read<StorageService>().getApiKey();
    setState(() => _hasApiKey = key != null && key.isNotEmpty);
  }

  @override
  Widget build(BuildContext context) {
    final sm = context.watch<SessionManager>();

    return ScanlineOverlay(
      child: Scaffold(
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                const SizedBox(height: 60),

                // Title
                const GlitchText(
                  text: 'TERMINUS',
                  glitchIntensity: 0.15,
                ),
                const SizedBox(height: 4),
                Text(
                  'O M N I',
                  style: TerminusTheme.displayMedium.copyWith(
                    letterSpacing: 12,
                    color: TerminusTheme.textDim,
                  ),
                ),
                const SizedBox(height: 8),
                Container(
                  width: 200,
                  height: 1,
                  color: TerminusTheme.border,
                ),
                const SizedBox(height: 12),
                Text(
                  'L\'ARCHITETTO DELL\'INEVITABILE',
                  style: TerminusTheme.systemLog.copyWith(fontSize: 10),
                ),
                const SizedBox(height: 4),
                Text(
                  'Engine Narrativo per la Sublimazione del Trauma',
                  style: TerminusTheme.narrativeItalic.copyWith(fontSize: 11),
                  textAlign: TextAlign.center,
                ),

                const SizedBox(height: 60),

                // Main actions
                if (sm.isActive) ...[
                  _ActionButton(
                    label: 'RIPRENDI SESSIONE',
                    color: TerminusTheme.neonOrange,
                    icon: Icons.play_arrow_rounded,
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(
                          builder: (_) => const SessionScreen()),
                    ),
                  ),
                  const SizedBox(height: 16),
                ],

                _ActionButton(
                  label: 'NUOVA SESSIONE',
                  color: TerminusTheme.neonCyan,
                  icon: Icons.local_fire_department_outlined,
                  onTap: () {
                    if (!_hasApiKey) {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                            builder: (_) => const ApiKeyScreen()),
                      ).then((_) => _checkApiKey());
                    } else {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                            builder: (_) =>
                                const CharacterCreationScreen()),
                      );
                    }
                  },
                ),

                const SizedBox(height: 16),

                _ActionButton(
                  label: 'ARCHIVIO SESSIONI',
                  color: TerminusTheme.textDim,
                  icon: Icons.archive_outlined,
                  onTap: () => Navigator.push(
                    context,
                    MaterialPageRoute(
                        builder: (_) => const SessionsArchiveScreen()),
                  ),
                ),

                const SizedBox(height: 16),

                _ActionButton(
                  label: 'CONFIGURAZIONE',
                  color: TerminusTheme.textDim,
                  icon: Icons.settings_outlined,
                  onTap: () => Navigator.push(
                    context,
                    MaterialPageRoute(
                        builder: (_) => const ApiKeyScreen()),
                  ).then((_) => _checkApiKey()),
                ),

                const Spacer(),

                // Footer
                Text(
                  'HYBRID SYNDICATE',
                  style: TerminusTheme.systemLog.copyWith(
                    color: TerminusTheme.textDim,
                    fontSize: 9,
                    letterSpacing: 3,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'ETHIC SOFTWARE FOUNDATION',
                  style: TerminusTheme.systemLog.copyWith(
                    color: TerminusTheme.textDim.withValues(alpha: 0.5),
                    fontSize: 8,
                    letterSpacing: 2,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '"Tutti moriranno. Non c\'è salvezza.\nC\'è solo la storia di come cadono."',
                  style: TerminusTheme.narrativeItalic.copyWith(
                    fontSize: 10,
                    color: TerminusTheme.textDim.withValues(alpha: 0.4),
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 24),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _ActionButton extends StatelessWidget {
  final String label;
  final Color color;
  final IconData icon;
  final VoidCallback onTap;

  const _ActionButton({
    required this.label,
    required this.color,
    required this.icon,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: OutlinedButton.icon(
        onPressed: onTap,
        icon: Icon(icon, color: color, size: 18),
        label: Text(
          label,
          style: TerminusTheme.buttonText.copyWith(color: color),
        ),
        style: OutlinedButton.styleFrom(
          padding: const EdgeInsets.symmetric(vertical: 16),
          side: BorderSide(color: color.withValues(alpha: 0.3)),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(4),
          ),
        ),
      ),
    );
  }
}
