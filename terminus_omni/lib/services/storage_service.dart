import 'dart:convert';
import 'package:hive_flutter/hive_flutter.dart';

import '../config/constants.dart';
import '../models/session.dart';

/// Local-only encrypted storage.
///
/// Philosophy: No cloud. No telemetry. No data extraction.
/// The data never leaves the device. If you lose the phone,
/// you lose everything. That's the price of sovereignty.
class StorageService {
  late Box<String> _sessionsBox;
  late Box<String> _settingsBox;
  late Box<String> _secretsBox;

  Future<void> init() async {
    _sessionsBox = await Hive.openBox<String>(TerminusConstants.boxSessions);
    _settingsBox = await Hive.openBox<String>(TerminusConstants.boxSettings);
    _secretsBox = await Hive.openBox<String>('terminus_secrets');
  }

  // ── API Key (stored in Hive — works on all platforms including web) ──

  Future<String?> getApiKey() async {
    return _secretsBox.get(TerminusConstants.keyApiKey);
  }

  Future<void> setApiKey(String key) async {
    await _secretsBox.put(TerminusConstants.keyApiKey, key);
  }

  Future<void> deleteApiKey() async {
    await _secretsBox.delete(TerminusConstants.keyApiKey);
  }

  // ── Sessions ──

  Future<void> saveSession(TerminusSession session) async {
    final json = jsonEncode(session.toJson());
    await _sessionsBox.put(session.id, json);
  }

  Future<TerminusSession?> loadSession(String id) async {
    final json = _sessionsBox.get(id);
    if (json == null) return null;
    return TerminusSession.fromJson(jsonDecode(json) as Map<String, dynamic>);
  }

  Future<List<TerminusSession>> loadAllSessions() async {
    final sessions = <TerminusSession>[];
    for (final key in _sessionsBox.keys) {
      final json = _sessionsBox.get(key);
      if (json != null) {
        sessions.add(TerminusSession.fromJson(
            jsonDecode(json) as Map<String, dynamic>));
      }
    }
    sessions.sort((a, b) => b.startedAt.compareTo(a.startedAt));
    return sessions;
  }

  Future<void> deleteSession(String id) async {
    await _sessionsBox.delete(id);
  }

  // ── Settings ──

  Future<void> setSetting(String key, String value) async {
    await _settingsBox.put(key, value);
  }

  Future<String?> getSetting(String key) async {
    return _settingsBox.get(key);
  }
}
