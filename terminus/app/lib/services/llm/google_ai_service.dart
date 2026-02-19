import 'dart:convert';
import 'package:http/http.dart' as http;
import 'llm_service.dart';
import 'openai_compatible_service.dart';

/// Google AI (Gemini) service.
///
/// Gemini uses a different API format from OpenAI/Anthropic.
class GoogleAiService implements LlmService {
  final String apiKey;
  final String model;

  GoogleAiService({
    required this.apiKey,
    this.model = 'gemini-2.0-flash',
  });

  @override
  String get providerName => 'Google AI (Gemini)';

  @override
  Future<String> sendMessage({
    required String systemPrompt,
    required List<Map<String, String>> messages,
    double temperature = 0.85,
    int maxTokens = 1024,
  }) async {
    // Convert to Gemini format.
    final contents = <Map<String, dynamic>>[];

    for (final msg in messages) {
      final role = msg['role'] == 'user' ? 'user' : 'model';
      contents.add({
        'role': role,
        'parts': [{'text': msg['content']}],
      });
    }

    final response = await http.post(
      Uri.parse(
        'https://generativelanguage.googleapis.com/v1beta/models/$model:generateContent?key=$apiKey',
      ),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'systemInstruction': {
          'parts': [{'text': systemPrompt}],
        },
        'contents': contents,
        'generationConfig': {
          'temperature': temperature,
          'maxOutputTokens': maxTokens,
        },
      }),
    );

    if (response.statusCode != 200) {
      throw LlmServiceException(
        'Gemini API failed: ${response.statusCode}',
        statusCode: response.statusCode,
        body: response.body,
      );
    }

    final data = jsonDecode(response.body) as Map<String, dynamic>;
    final candidates = data['candidates'] as List<dynamic>?;
    if (candidates == null || candidates.isEmpty) {
      throw const LlmServiceException('Empty response from Gemini');
    }

    final parts = candidates[0]['content']['parts'] as List<dynamic>;
    return parts.map((p) => p['text'] as String).join();
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
