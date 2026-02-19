import 'package:shared_preferences/shared_preferences.dart';
import '../models/message.dart';

/// The Ship's Log Service.
///
/// Handles recording the user's initial log entry and playing it back
/// at the end of the session.
///
/// The Ship's Log is recorded at session start ("If we don't make it,
/// I want something left of each of us.") and played back in the finale
/// after the pod closes. The distance between the voice at the start
/// and the silence at the end — that's the proof of the journey.
///
/// Uses SharedPreferences for persistence (web-compatible).
/// No dart:io. Runs everywhere Flutter runs.
class ShipLogService {
  static const String _logKey = 'terminus_ship_log';

  String? _textLog;

  /// Whether a text log has been recorded.
  bool get hasTextLog => _textLog != null && _textLog!.isNotEmpty;

  /// Whether any log has been recorded.
  bool get hasLog => hasTextLog;

  /// The raw text of the log entry.
  String? get textLog => _textLog;

  /// Record a text log entry.
  ///
  /// Called during onboarding when the Captain asks:
  /// "Record a personal log. If we don't make it, I want
  /// something left of each of us."
  Future<void> recordTextLog(String entry) async {
    _textLog = entry;

    // Persist for crash recovery
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_logKey, entry);
    } catch (_) {
      // Non-critical: log is in memory regardless
    }
  }

  /// Load a previously recorded log from storage (for session recovery).
  Future<void> loadFromStorage() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      _textLog = prefs.getString(_logKey);
    } catch (_) {
      // Non-critical
    }
  }

  /// Get the playback sequence for the finale.
  ///
  /// Returns a list of NarrativeMessages that recreate the log playback
  /// experience. The log is "played back" character by character in the
  /// typewriter display — the user hears their own voice from the beginning.
  List<NarrativeMessage> getPlaybackSequence(int lumen) {
    final messages = <NarrativeMessage>[];
    final now = DateTime.now();

    // Header: the log is playing
    messages.add(NarrativeMessage(
      id: '${now.microsecondsSinceEpoch}_log_header',
      source: MessageSource.system,
      content: '[ Ship\'s Log — Playback Initiated ]',
      timestamp: now,
      lumenAtTime: lumen,
    ));

    // The actual log entry
    if (hasTextLog) {
      messages.add(NarrativeMessage(
        id: '${now.microsecondsSinceEpoch}_log_content',
        source: MessageSource.shipLog,
        content: '"$_textLog"',
        timestamp: now.add(const Duration(milliseconds: 500)),
        lumenAtTime: lumen,
      ));
    }

    // Footer: end of transmission
    messages.add(NarrativeMessage(
      id: '${now.microsecondsSinceEpoch}_log_footer',
      source: MessageSource.system,
      content: '[ End of transmission ]',
      timestamp: now.add(const Duration(seconds: 2)),
      lumenAtTime: lumen,
    ));

    return messages;
  }

  /// The decompression screen content.
  ///
  /// After the log playback, the screen goes black with a blinking cursor.
  /// This is the "projective space" — the user sits with the experience.
  /// What they type next (if anything) is for them, not for the ship.
  NarrativeMessage getDecompressionMessage(int lumen) {
    return NarrativeMessage(
      id: '${DateTime.now().microsecondsSinceEpoch}_decompression',
      source: MessageSource.system,
      content: '> _',
      timestamp: DateTime.now(),
      lumenAtTime: lumen,
    );
  }

  /// Clean up stored log when the session is complete.
  Future<void> cleanup() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_logKey);
    } catch (_) {
      // Non-critical
    }
    _textLog = null;
  }
}
