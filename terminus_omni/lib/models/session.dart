import 'victim_profile.dart';
import 'dice_result.dart';

/// Represents the full state of a TERMINUS-OMNI session.
class TerminusSession {
  final String id;
  final DateTime startedAt;
  DateTime? completedAt;

  /// The subject's psychological dossier.
  final VictimProfile profile;

  /// Selected scenario module.
  final String scenarioId;

  // ── Lumen system ──
  int lumenCount;

  // ── Dice system ──
  int dicePool;
  int hopeDice;
  bool brinkUsed;
  bool momentAchieved;

  // ── Narrative state ──
  int currentScene;
  SessionPhase phase;

  /// All truths established during the session.
  final List<TruthDeclaration> truths;

  /// Full conversation history for Consequential Memory.
  final List<ChatMessage> messages;

  /// Dice roll history.
  final List<DiceResult> rolls;

  /// Whether the Commander pause has been triggered.
  bool commanderPauseTriggered;

  /// Whether the session reached Lumen 0 and played the testament.
  bool testamentPlayed;

  TerminusSession({
    required this.id,
    required this.startedAt,
    required this.profile,
    required this.scenarioId,
    this.completedAt,
    this.lumenCount = 10,
    this.dicePool = 10,
    this.hopeDice = 1,
    this.brinkUsed = false,
    this.momentAchieved = false,
    this.currentScene = 1,
    this.phase = SessionPhase.primiPassi,
    List<TruthDeclaration>? truths,
    List<ChatMessage>? messages,
    List<DiceResult>? rolls,
    this.commanderPauseTriggered = false,
    this.testamentPlayed = false,
  })  : truths = truths ?? [],
        messages = messages ?? [],
        rolls = rolls ?? [];

  /// Current phase based on lumen count.
  SessionPhase get currentPhase {
    if (lumenCount >= 7) return SessionPhase.primiPassi;
    if (lumenCount >= 4) return SessionPhase.assedio;
    if (lumenCount >= 2) return SessionPhase.declino;
    if (lumenCount == 1) return SessionPhase.ultimaLuce;
    return SessionPhase.morte;
  }

  /// Whether the session is complete (Lumen 0).
  bool get isComplete => lumenCount <= 0;

  /// Generate the Ship's Log — a summary of the entire journey.
  /// At Lumen 0, this log is read back before the testament,
  /// creating a narrative loop that forces the subject to witness
  /// their own trajectory.
  String generateShipLog() {
    final buffer = StringBuffer();
    buffer.writeln('╔═══════════════════════════════════════╗');
    buffer.writeln('║  SHIP\'S LOG — RECOVERED FILE         ║');
    buffer.writeln('╚═══════════════════════════════════════╝');
    buffer.writeln();
    buffer.writeln('SUBJECT: ${profile.name}');
    buffer.writeln('ARCHETYPE: ${profile.archetype}');
    buffer.writeln('VIRTUE: ${profile.virtue}');
    buffer.writeln('VICE: ${profile.vice}');
    buffer.writeln('DESIRED MOMENT: ${profile.moment}');
    buffer.writeln();
    buffer.writeln('── ESTABLISHED TRUTHS ──');
    buffer.writeln();
    if (truths.isEmpty) {
      buffer.writeln('No truths declared.');
    } else {
      for (int i = 0; i < truths.length; i++) {
        final t = truths[i];
        buffer.writeln(
            'TRUTH ${i + 1} [Lumen ${t.lumenAtDeclaration}] '
            '(${t.speaker == "terminus" ? "TERMINUS" : "SUBJECT"}):');
        buffer.writeln('"${t.text}"');
        buffer.writeln();
      }
    }
    buffer.writeln('── DICE ROLLED: ${rolls.length} ──');
    final successes = rolls.where((r) => r.isSuccess).length;
    final failures = rolls.where((r) => !r.isSuccess).length;
    buffer.writeln('Successes: $successes | Failures: $failures');
    if (rolls.any((r) => r.hopeLost)) {
      buffer.writeln('THE HOPE DIE HAS BEEN BURNED.');
    }
    buffer.writeln();
    buffer.writeln('FINAL LUMEN: $lumenCount/10');
    buffer.writeln();
    buffer.writeln('END OF LOG');
    buffer.writeln();
    buffer.writeln('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    buffer.writeln('NOTICE: This log contains personal data.');
    buffer.writeln('It is stored locally, encrypted on the device.');
    buffer.writeln('It is never transmitted. If you lose the device,');
    buffer.writeln('you lose the log. This is data sovereignty.');
    buffer.writeln('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    return buffer.toString();
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'startedAt': startedAt.toIso8601String(),
        'completedAt': completedAt?.toIso8601String(),
        'profile': profile.toJson(),
        'scenarioId': scenarioId,
        'lumenCount': lumenCount,
        'dicePool': dicePool,
        'hopeDice': hopeDice,
        'brinkUsed': brinkUsed,
        'momentAchieved': momentAchieved,
        'currentScene': currentScene,
        'phase': phase.name,
        'truths': truths.map((t) => t.toJson()).toList(),
        'messages': messages.map((m) => m.toJson()).toList(),
        'rolls': rolls.map((r) => r.toJson()).toList(),
        'commanderPauseTriggered': commanderPauseTriggered,
        'testamentPlayed': testamentPlayed,
      };

  factory TerminusSession.fromJson(Map<String, dynamic> json) {
    return TerminusSession(
      id: json['id'] as String,
      startedAt: DateTime.parse(json['startedAt'] as String),
      completedAt: json['completedAt'] != null
          ? DateTime.parse(json['completedAt'] as String)
          : null,
      profile:
          VictimProfile.fromJson(json['profile'] as Map<String, dynamic>),
      scenarioId: json['scenarioId'] as String,
      lumenCount: json['lumenCount'] as int,
      dicePool: json['dicePool'] as int,
      hopeDice: json['hopeDice'] as int,
      brinkUsed: json['brinkUsed'] as bool,
      momentAchieved: json['momentAchieved'] as bool,
      currentScene: json['currentScene'] as int,
      phase: SessionPhase.values.byName(json['phase'] as String),
      truths: (json['truths'] as List)
          .map((t) => TruthDeclaration.fromJson(t as Map<String, dynamic>))
          .toList(),
      messages: (json['messages'] as List)
          .map((m) => ChatMessage.fromJson(m as Map<String, dynamic>))
          .toList(),
      rolls: (json['rolls'] as List)
          .map((r) => DiceResult.fromJson(r as Map<String, dynamic>))
          .toList(),
      commanderPauseTriggered: json['commanderPauseTriggered'] as bool,
      testamentPlayed: json['testamentPlayed'] as bool,
    );
  }
}

/// The four phases of TERMINUS-OMNI.
enum SessionPhase {
  primiPassi, // Lumen 10-7: Unease. Something is wrong.
  assedio, // Lumen 6-4: Panic. Brutal survival.
  declino, // Lumen 3-2: Despair. Characters turn on each other.
  ultimaLuce, // Lumen 1: Acceptance or blind fury.
  morte, // Lumen 0: The end. Testament plays.
}

/// A truth declared during the ritual.
class TruthDeclaration {
  final int lumenAtDeclaration;
  final String speaker; // 'terminus' or 'subject'
  final String text;
  final DateTime declaredAt;

  const TruthDeclaration({
    required this.lumenAtDeclaration,
    required this.speaker,
    required this.text,
    required this.declaredAt,
  });

  Map<String, dynamic> toJson() => {
        'lumenAtDeclaration': lumenAtDeclaration,
        'speaker': speaker,
        'text': text,
        'declaredAt': declaredAt.toIso8601String(),
      };

  factory TruthDeclaration.fromJson(Map<String, dynamic> json) =>
      TruthDeclaration(
        lumenAtDeclaration: json['lumenAtDeclaration'] as int,
        speaker: json['speaker'] as String,
        text: json['text'] as String,
        declaredAt: DateTime.parse(json['declaredAt'] as String),
      );
}

/// A single message in the session conversation.
class ChatMessage {
  final String role; // 'user', 'terminus', 'system'
  final String content;
  final DateTime timestamp;
  final int lumenAtMessage;

  const ChatMessage({
    required this.role,
    required this.content,
    required this.timestamp,
    required this.lumenAtMessage,
  });

  Map<String, dynamic> toJson() => {
        'role': role,
        'content': content,
        'timestamp': timestamp.toIso8601String(),
        'lumenAtMessage': lumenAtMessage,
      };

  factory ChatMessage.fromJson(Map<String, dynamic> json) => ChatMessage(
        role: json['role'] as String,
        content: json['content'] as String,
        timestamp: DateTime.parse(json['timestamp'] as String),
        lumenAtMessage: json['lumenAtMessage'] as int,
      );
}
