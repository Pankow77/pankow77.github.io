import 'dart:convert';
import 'package:http/http.dart' as http;
import 'llm_service.dart';

/// OpenAI-compatible LLM service.
///
/// Works with OpenAI, and any provider that implements the
/// OpenAI chat completions API format (many do).
class OpenAiCompatibleService implements LlmService {
  final String apiKey;
  final String model;
  final String baseUrl;

  OpenAiCompatibleService({
    required this.apiKey,
    required this.model,
    this.baseUrl = 'https://api.openai.com/v1',
  });

  @override
  String get providerName => 'OpenAI';

  @override
  Future<String> sendMessage({
    required String systemPrompt,
    required List<Map<String, String>> messages,
    double temperature = 0.85,
    int maxTokens = 1024,
  }) async {
    final allMessages = [
      {'role': 'system', 'content': systemPrompt},
      ...messages,
    ];

    final response = await http.post(
      Uri.parse('$baseUrl/chat/completions'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $apiKey',
      },
      body: jsonEncode({
        'model': model,
        'messages': allMessages,
        'temperature': temperature,
        'max_tokens': maxTokens,
      }),
    );

    if (response.statusCode != 200) {
      throw LlmServiceException(
        'API request failed: ${response.statusCode}',
        statusCode: response.statusCode,
        body: response.body,
      );
    }

    final data = jsonDecode(response.body) as Map<String, dynamic>;
    final choices = data['choices'] as List<dynamic>;
    if (choices.isEmpty) {
      throw const LlmServiceException('Empty response from LLM');
    }

    final message = choices[0]['message'] as Map<String, dynamic>;
    return message['content'] as String;
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

/// Exception for LLM service errors.
class LlmServiceException implements Exception {
  final String message;
  final int? statusCode;
  final String? body;

  const LlmServiceException(this.message, {this.statusCode, this.body});

  @override
  String toString() => 'LlmServiceException: $message';
}
