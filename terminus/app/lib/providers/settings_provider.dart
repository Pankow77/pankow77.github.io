import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/storage_service.dart';
import '../services/llm/llm_service.dart';

/// LLM settings state.
class LlmSettings {
  final LlmProvider? provider;
  final String? apiKey;
  final String? model;
  final bool isConfigured;

  const LlmSettings({
    this.provider,
    this.apiKey,
    this.model,
    this.isConfigured = false,
  });

  LlmSettings copyWith({
    LlmProvider? provider,
    String? apiKey,
    String? model,
    bool? isConfigured,
  }) {
    return LlmSettings(
      provider: provider ?? this.provider,
      apiKey: apiKey ?? this.apiKey,
      model: model ?? this.model,
      isConfigured: isConfigured ?? this.isConfigured,
    );
  }
}

/// Settings state notifier — manages LLM configuration.
class SettingsNotifier extends StateNotifier<LlmSettings> {
  final StorageService _storage;

  SettingsNotifier(this._storage) : super(const LlmSettings()) {
    _loadFromStorage();
  }

  void _loadFromStorage() {
    state = LlmSettings(
      provider: _storage.provider,
      apiKey: _storage.apiKey,
      model: _storage.model,
      isConfigured: _storage.isLlmConfigured,
    );
  }

  void setProvider(LlmProvider provider) {
    _storage.provider = provider;
    state = state.copyWith(
      provider: provider,
      model: provider.defaultModel,
    );
    _storage.model = provider.defaultModel;
  }

  void setApiKey(String key) {
    _storage.apiKey = key;
    state = state.copyWith(
      apiKey: key,
      isConfigured: key.isNotEmpty,
    );
  }

  void setModel(String model) {
    _storage.model = model;
    state = state.copyWith(model: model);
  }
}
