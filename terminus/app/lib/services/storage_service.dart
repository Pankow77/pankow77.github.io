import 'package:shared_preferences/shared_preferences.dart';
import 'llm/llm_service.dart';

/// Local storage for settings and session persistence.
///
/// API keys are stored locally on the user's device. BYOK means the key
/// never touches our servers. Privacy is architecture, not policy.
class StorageService {
  static const _keyProvider = 'llm_provider';
  static const _keyApiKey = 'llm_api_key';
  static const _keyModel = 'llm_model';
  static const _keySessionData = 'session_data';
  static const _keyHasCompletedOnboarding = 'has_completed_onboarding';

  final SharedPreferences _prefs;

  StorageService(this._prefs);

  // --- LLM Configuration ---

  LlmProvider? get provider {
    final value = _prefs.getString(_keyProvider);
    if (value == null) return null;
    return LlmProvider.values.firstWhere(
      (p) => p.name == value,
      orElse: () => LlmProvider.openai,
    );
  }

  set provider(LlmProvider? value) {
    if (value == null) {
      _prefs.remove(_keyProvider);
    } else {
      _prefs.setString(_keyProvider, value.name);
    }
  }

  String? get apiKey => _prefs.getString(_keyApiKey);

  set apiKey(String? value) {
    if (value == null) {
      _prefs.remove(_keyApiKey);
    } else {
      _prefs.setString(_keyApiKey, value);
    }
  }

  String? get model => _prefs.getString(_keyModel);

  set model(String? value) {
    if (value == null) {
      _prefs.remove(_keyModel);
    } else {
      _prefs.setString(_keyModel, value);
    }
  }

  bool get isLlmConfigured => apiKey != null && apiKey!.isNotEmpty;

  // --- Session Data ---

  String? get sessionData => _prefs.getString(_keySessionData);

  set sessionData(String? value) {
    if (value == null) {
      _prefs.remove(_keySessionData);
    } else {
      _prefs.setString(_keySessionData, value);
    }
  }

  bool get hasCompletedOnboarding =>
      _prefs.getBool(_keyHasCompletedOnboarding) ?? false;

  set hasCompletedOnboarding(bool value) {
    _prefs.setBool(_keyHasCompletedOnboarding, value);
  }

  /// Clear all session data (for new voyage).
  void clearSession() {
    _prefs.remove(_keySessionData);
    _prefs.remove(_keyHasCompletedOnboarding);
  }

  /// Clear everything (full reset).
  void clearAll() {
    _prefs.clear();
  }
}
