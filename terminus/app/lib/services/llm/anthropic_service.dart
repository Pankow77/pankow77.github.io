import 'dart:convert';
import 'package:http/http.dart' as http;
import 'llm_service.dart';
import 'openai_compatible_service.dart';

/// Anthropic Claude service.
///
/// Claude uses a different API format from OpenAI, so this has its own
/// implementation rather than using the OpenAI-compatible wrapper.
class AnthropicService implements LlmService {
  final String apiKey;
  final String model;

  AnthropicService({
    required this.apiKey,
    this.model = 'claude-sonnet-4-5-20250929',
  });

  @override
  String get providerName => 'Anthropic (Claude)';

  @override
  Future<String> sendMessage({
    required String systemPrompt,
    required List<Map<String, String>> messages,
    double temperature = 0.85,
    int maxTokens = 1024,
  }) async {
    // Anthropic format: system is a top-level field, not in messages array.
    final anthropicMessages = messages.map((m) => {
      'role': m['role'],
      'content': m['content'],
    }).toList();

    final response = await http.post(
      Uri.parse('https://api.anthropic.com/v1/messages'),
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: jsonEncode({
        'model': model,
        'system': systemPrompt,
        'messages': anthropicMessages,
        'temperature': temperature,
        'max_tokens': maxTokens,
      }),
    );

    if (response.statusCode != 200) {
      throw LlmServiceException(
        'Anthropic API failed: ${response.statusCode}',
        statusCode: response.statusCode,
        body: response.body,
      );
    }

    final data = jsonDecode(response.body) as Map<String, dynamic>;
    final content = data['content'] as List<dynamic>;
    if (content.isEmpty) {
      throw const LlmServiceException('Empty response from Claude');
    }

    return content[0]['text'] as String;
  }

  @override
  Future<bool> testConnection() async {
    try {
      await sendMessage(
        systemPrompt: 'Respond with exactly: TERMINUS ONLINE',
        messages: [
          {'role': 'user', 'content': 'Status check.'},
        ],
        maxTokens: 20,
      );
      return true;
    } catch (_) {
      return false;
    }
  }
}
