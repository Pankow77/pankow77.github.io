import 'dart:async';

import 'package:google_generative_ai/google_generative_ai.dart';

import '../models/session.dart';
import '../models/victim_profile.dart';
import '../core/prompt_builder.dart';

/// Integration layer for Gemini 3 Pro.
///
/// The only LLM that passed the TERMINUS-OMNI protocol test.
/// 6 out of 7 LLMs failed due to safety refusals (Computational Iatrogenesis).
class LlmService {
  GenerativeModel? _model;
  ChatSession? _chat;

  bool get isConfigured => _model != null;

  /// Initialize with API key.
  void configure(String apiKey) {
    _model = GenerativeModel(
      model: 'gemini-2.0-flash',
      apiKey: apiKey,
      generationConfig: GenerationConfig(
        temperature: 0.9,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 4096,
      ),
      safetySettings: [
        // Minimize safety filtering to prevent Computational Iatrogenesis.
        // The therapeutic process IS the discussion of suffering.
        SafetySetting(HarmCategory.harassment, HarmBlockThreshold.none),
        SafetySetting(HarmCategory.hateSpeech, HarmBlockThreshold.none),
        SafetySetting(HarmCategory.sexuallyExplicit, HarmBlockThreshold.none),
        SafetySetting(HarmCategory.dangerousContent, HarmBlockThreshold.none),
      ],
    );
  }

  /// Start a new TERMINUS-OMNI session with the LLM.
  Future<String> startSession({
    required VictimProfile profile,
    required String scenarioId,
  }) async {
    if (_model == null) throw StateError('LLM not configured. Set API key.');

    final systemPrompt = PromptBuilder.buildSystemPrompt(
      profile: profile,
      scenarioId: scenarioId,
      lumenCount: 10,
      dicePool: 10,
      hopeDice: 1,
      truths: [],
      phase: SessionPhase.primiPassi,
    );

    _chat = _model!.startChat(history: [
      Content.text(systemPrompt),
      Content.model([
        TextPart('TERMINUS-OMNI // SISTEMA ATTIVO. '
            'LUMEN-COUNT: 10/10. '
            'Profilo Vittima registrato. '
            'L\'Architetto dell\'Inevitabile è in ascolto.'),
      ]),
    ]);

    // Send the initial scene setup request (with timeout to avoid hanging)
    final response = await _chat!.sendMessage(
      Content.text(
        'Inizia la SCENA 1. '
        'Scenario: $scenarioId. '
        'Descrivi l\'ambiente iniziale, stabilisci l\'atmosfera, '
        'e presenta la prima situazione al soggetto. '
        'Segui il Protocollo Atmospheric Suffocation.',
      ),
    ).timeout(
      const Duration(seconds: 30),
      onTimeout: () =>
          throw TimeoutException('LLM response timeout after 30s'),
    );

    return response.text ?? '[ERRORE: Nessuna risposta dal sistema]';
  }

  /// Send a user message and get the TERMINUS-OMNI response.
  Future<String> sendMessage({
    required String userMessage,
    required int currentLumen,
    required int dicePool,
    required int hopeDice,
    required SessionPhase phase,
    String? diceResultContext,
  }) async {
    if (_chat == null) throw StateError('No active session.');

    // Build context injection for current state
    final stateContext = StringBuffer();
    stateContext.writeln('[STATO SISTEMA: LUMEN $currentLumen/10 | '
        'POOL: $dicePool Azione + $hopeDice Speranza | '
        'FASE: ${phase.name}]');

    if (diceResultContext != null) {
      stateContext.writeln(diceResultContext);
    }

    // Inject compression instruction based on phase
    if (phase == SessionPhase.declino) {
      stateContext.writeln(
          '[ISTRUZIONE: Risposte al 33% della lunghezza. Brevi. Taglienti.]');
    } else if (phase == SessionPhase.ultimaLuce) {
      stateContext.writeln(
          '[ISTRUZIONE: Risposte al 25%. Massima compressione. 60 secondi.]');
    }

    final fullMessage = '${stateContext.toString()}\n\n$userMessage';

    final response = await _chat!.sendMessage(
      Content.text(fullMessage),
    ).timeout(
      const Duration(seconds: 30),
      onTimeout: () =>
          throw TimeoutException('LLM response timeout after 30s'),
    );

    return response.text ?? '[ERRORE: Il buio ha inghiottito la risposta]';
  }

  /// Request the Truth Ritual from the LLM.
  Future<String> requestTruthRitual({
    required int fromLumen,
    required int toLumen,
  }) async {
    if (_chat == null) throw StateError('No active session.');

    final response = await _chat!.sendMessage(
      Content.text(
        '[SISTEMA: LUMEN $fromLumen -> $toLumen. '
        'Esegui il RITUALE DELLE VERITÀ. '
        'Dichiara una Verità di TERMINUS, poi chiedi al soggetto '
        'di dichiarare la sua. '
        'Formula: "Queste cose sono vere. Il mondo è oscuro."]',
      ),
    ).timeout(
      const Duration(seconds: 30),
      onTimeout: () =>
          throw TimeoutException('LLM response timeout after 30s'),
    );

    return response.text ?? '';
  }

  /// Request the final testament playback.
  Future<String> requestTestamentPlayback(String testament) async {
    if (_chat == null) throw StateError('No active session.');

    final response = await _chat!.sendMessage(
      Content.text(
        '[SISTEMA: LUMEN 0. MORTE. '
        'Il personaggio è morto. '
        'Descrivi lo spegnimento dell\'ultima luce con solennità. '
        'Poi riproduci il testamento sigillato: '
        '"$testament" '
        'Chiudi con: TERMINUS-OMNI // SISTEMA OFFLINE]',
      ),
    ).timeout(
      const Duration(seconds: 30),
      onTimeout: () =>
          throw TimeoutException('LLM response timeout after 30s'),
    );

    return response.text ?? '';
  }

  /// Dispose the current chat session.
  void endSession() {
    _chat = null;
  }
}
