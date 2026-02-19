/// Abstract interface for LLM communication.
///
/// BYOK architecture: the user provides their own API key.
/// This interface abstracts over different providers so the narrative engine
/// doesn't care whether it's talking to OpenAI, Anthropic, or Google AI.
abstract class LlmService {
  /// Send a message and get a response.
  ///
  /// [systemPrompt] is the TERMINUS-OMNI narrative conductor prompt.
  /// [messages] is the conversation history in [{role, content}] format.
  /// Returns the LLM's response text.
  Future<String> sendMessage({
    required String systemPrompt,
    required List<Map<String, String>> messages,
    double temperature = 0.85,
    int maxTokens = 1024,
  });

  /// Test if the connection and API key are valid.
  Future<bool> testConnection();

  /// Human-readable provider name.
  String get providerName;
}

/// Supported LLM providers.
enum LlmProvider {
  openai,
  anthropic,
  googleAi,
}

extension LlmProviderExtension on LlmProvider {
  String get displayName {
    switch (this) {
      case LlmProvider.openai:
        return 'OpenAI';
      case LlmProvider.anthropic:
        return 'Anthropic (Claude)';
      case LlmProvider.googleAi:
        return 'Google AI (Gemini)';
    }
  }

  String get defaultModel {
    switch (this) {
      case LlmProvider.openai:
        return 'gpt-4o';
      case LlmProvider.anthropic:
        return 'claude-sonnet-4-5-20250929';
      case LlmProvider.googleAi:
        return 'gemini-2.0-flash';
    }
  }

  String get baseUrl {
    switch (this) {
      case LlmProvider.openai:
        return 'https://api.openai.com/v1';
      case LlmProvider.anthropic:
        return 'https://api.anthropic.com/v1';
      case LlmProvider.googleAi:
        return 'https://generativelanguage.googleapis.com/v1beta';
    }
  }
}
