import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'config/theme.dart';
import 'config/constants.dart';
import 'models/session_data.dart';
import 'providers/game_provider.dart';
import 'providers/settings_provider.dart';
import 'services/storage_service.dart';
import 'services/prompt_loader.dart';
import 'services/llm/llm_service.dart';
import 'services/llm/openai_compatible_service.dart';
import 'services/llm/anthropic_service.dart';
import 'services/llm/google_ai_service.dart';
import 'screens/boot_screen.dart';
import 'screens/settings_screen.dart';
import 'screens/terminal_screen.dart';
import 'screens/onboarding_screen.dart';

/// Top-level providers.
final storageServiceProvider = Provider<StorageService>((ref) {
  throw UnimplementedError('Must be overridden with actual SharedPreferences');
});

final settingsProvider =
    StateNotifierProvider<SettingsNotifier, LlmSettings>((ref) {
  return SettingsNotifier(ref.watch(storageServiceProvider));
});

final gameProvider =
    StateNotifierProvider<GameNotifier, SessionData>((ref) {
  return GameNotifier();
});

/// Viaggio al Centro del Cuore — the app.
class ViaggioApp extends ConsumerWidget {
  const ViaggioApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return MaterialApp(
      title: AppConstants.appName,
      theme: TerminusTheme.darkTheme,
      debugShowCheckedModeBanner: false,
      home: const _AppShell(),
    );
  }
}

/// The app shell — manages navigation between screens.
///
/// Flow:
///   1. Check LLM config → if missing → Settings
///   2. Boot sequence
///   3. Crew Intake (onboarding)
///   4. Terminal (main game)
///   5. Crew Rest (safety cooldown) → back to Terminal
///   6. Decompression (post-ending)
class _AppShell extends ConsumerStatefulWidget {
  const _AppShell();

  @override
  ConsumerState<_AppShell> createState() => _AppShellState();
}

enum _AppScreen { settings, boot, onboarding, terminal }

class _AppShellState extends ConsumerState<_AppShell> {
  _AppScreen _currentScreen = _AppScreen.boot;

  @override
  void initState() {
    super.initState();
    // Check if LLM is configured on launch
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final settings = ref.read(settingsProvider);
      if (!settings.isConfigured) {
        setState(() => _currentScreen = _AppScreen.settings);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    switch (_currentScreen) {
      case _AppScreen.settings:
        final settings = ref.watch(settingsProvider);
        return SettingsScreen(
          currentProvider: settings.provider,
          currentApiKey: settings.apiKey,
          currentModel: settings.model,
          onSave: _onSettingsSaved,
          onBack: settings.isConfigured
              ? () => setState(() => _currentScreen = _AppScreen.terminal)
              : null,
        );

      case _AppScreen.boot:
        return BootScreen(
          onBootComplete: () {
            final settings = ref.read(settingsProvider);
            if (!settings.isConfigured) {
              setState(() => _currentScreen = _AppScreen.settings);
            } else {
              _initializeEngine();
              setState(() => _currentScreen = _AppScreen.onboarding);
            }
          },
        );

      case _AppScreen.onboarding:
        return OnboardingScreen(
          onComplete: (character, shipLogEntry) async {
            final game = ref.read(gameProvider.notifier);
            game.setUserCharacter(character);
            if (shipLogEntry.isNotEmpty) {
              await game.recordShipLog(shipLogEntry);
            }
            game.setPhase(SessionPhase.playing);
            game.addSystemMessage(
              'TERMINUS SYSTEMS \u2014 Session initialized.',
            );
            game.addSystemMessage(
              'All crew stations active. Lumen Count: 10/10.',
            );
            game.addSystemMessage(
              'Welcome aboard, ${character.name}.',
            );
            setState(() => _currentScreen = _AppScreen.terminal);
          },
        );

      case _AppScreen.terminal:
        final session = ref.watch(gameProvider);

        // Handle crew rest phase — show rest UI overlay
        if (session.phase == SessionPhase.crewRest) {
          return _buildCrewRestScreen();
        }

        return TerminalScreen(
          session: session,
          onSendMessage: (msg) {
            ref.read(gameProvider.notifier).sendMessage(msg);
          },
          onOpenSettings: () {
            setState(() => _currentScreen = _AppScreen.settings);
          },
        );
    }
  }

  void _onSettingsSaved(LlmProvider provider, String apiKey, String model) {
    final notifier = ref.read(settingsProvider.notifier);
    notifier.setProvider(provider);
    notifier.setApiKey(apiKey);
    notifier.setModel(model);

    _initializeEngine();
    setState(() => _currentScreen = _AppScreen.onboarding);
  }

  /// Load prompts and initialize the game engine.
  Future<void> _initializeEngine() async {
    final settings = ref.read(settingsProvider);
    if (settings.apiKey == null || settings.provider == null) return;

    // Load the TERMINUS-OMNI prompts (the soul of the system)
    final promptLoader = PromptLoader();
    await promptLoader.loadAll();

    // Create the appropriate LLM service
    final llmService = _createLlmService(
      settings.provider!,
      settings.apiKey!,
      settings.model ?? settings.provider!.defaultModel,
    );

    // Initialize the game engine with prompts
    final game = ref.read(gameProvider.notifier);
    game.initializeEngine(llmService, promptLoader);
    game.startNewSession();
  }

  LlmService _createLlmService(
    LlmProvider provider,
    String apiKey,
    String model,
  ) {
    switch (provider) {
      case LlmProvider.openai:
        return OpenAiCompatibleService(apiKey: apiKey, model: model);
      case LlmProvider.anthropic:
        return AnthropicService(apiKey: apiKey, model: model);
      case LlmProvider.googleAi:
        return GoogleAiService(apiKey: apiKey, model: model);
    }
  }

  /// Crew Rest screen — the safety cooldown.
  ///
  /// "The crew goes to sleep." Black screen, minimal text.
  /// After a pause, the user can resume.
  Widget _buildCrewRestScreen() {
    return Scaffold(
      backgroundColor: TerminusTheme.background,
      body: SafeArea(
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'The crew is resting.',
                style: TerminusTheme.terminalFont(
                  fontSize: 16,
                  color: TerminusTheme.phosphorDim.withValues(alpha: 0.5),
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Take a moment.',
                style: TerminusTheme.terminalFont(
                  fontSize: 14,
                  color: TerminusTheme.phosphorDim.withValues(alpha: 0.3),
                ),
              ),
              const SizedBox(height: 40),
              GestureDetector(
                onTap: () {
                  ref.read(gameProvider.notifier).resumeFromRest();
                },
                child: Text(
                  '[ Resume when ready ]',
                  style: TerminusTheme.terminalFont(
                    fontSize: 13,
                    color: TerminusTheme.phosphorDim.withValues(alpha: 0.4),
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
