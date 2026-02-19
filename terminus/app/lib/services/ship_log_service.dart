import 'dart:io';
import 'package:path_provider/path_provider.dart';
import '../models/message.dart';

/// The Ship's Log Service.
///
/// Handles recording the user's initial log entry (text and optionally audio)
/// and playing it back at the end of the session.
///
/// The Ship's Log is recorded at session start ("If we don't make it,
/// I want something left of each of us.") and played back in the finale
/// after the pod closes. The distance between the voice at the start
/// and the silence at the end — that's the proof of the journey.
///
/// Implementation:
/// - Text log: always available. Stored in memory + local file.
/// - Audio log: opt-in. Recorded via platform audio, stored locally.
///   Audio NEVER leaves the device. This is a promise.
class ShipLogService {
  String? _textLog;
  String? _audioPath;
  bool _hasAudioLog = false;

  /// Whether a text log has been recorded.
  bool get hasTextLog => _textLog != null && _textLog!.isNotEmpty;

  /// Whether an audio log has been recorded.
  bool get hasAudioLog => _hasAudioLog;

  /// Whether any log has been recorded (text or audio).
  bool get hasLog => hasTextLog || hasAudioLog;

  /// The raw text of the log entry.
  String? get textLog => _textLog;

  /// The file path of the audio recording (null if not recorded).
  String? get audioPath => _audioPath;

  /// Record a text log entry.
  ///
  /// Called during onboarding when the Captain asks:
  /// "Record a personal log. If we don't make it, I want
  /// something left of each of us."
  Future<void> recordTextLog(String entry) async {
    _textLog = entry;

    // Persist to local storage (for crash recovery)
    try {
      final dir = await getApplicationDocumentsDirectory();
      final file = File('${dir.path}/terminus_ship_log.txt');
      await file.writeAsString(entry);
    } catch (_) {
      // Non-critical: log is in memory regardless
    }
  }

  /// Get the playback sequence for the finale.
  ///
  /// Returns a list of NarrativeMessages that recreate the log playback
  /// experience. The log is "played back" character by character in the
  /// typewriter display — the user hears their own voice from the beginning.
  ///
  /// If audio was recorded, the caller should play it simultaneously.
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
        source: MessageSource.system,
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

  /// Clean up local files when the session is complete.
  Future<void> cleanup() async {
    try {
      final dir = await getApplicationDocumentsDirectory();
      final textFile = File('${dir.path}/terminus_ship_log.txt');
      if (await textFile.exists()) await textFile.delete();

      if (_audioPath != null) {
        final audioFile = File(_audioPath!);
        if (await audioFile.exists()) await audioFile.delete();
      }
    } catch (_) {
      // Non-critical
    }

    _textLog = null;
    _audioPath = null;
    _hasAudioLog = false;
  }
}
