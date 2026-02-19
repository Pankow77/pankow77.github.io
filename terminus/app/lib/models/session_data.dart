import 'crew_member.dart';
import 'lumen_state.dart';
import 'message.dart';

/// The phase of the current session.
enum SessionPhase {
  /// App just launched, no session yet.
  idle,

  /// Boot sequence playing.
  booting,

  /// Crew intake / character creation.
  onboarding,

  /// Main narrative in progress.
  playing,

  /// "The crew goes to sleep" — safety cooldown.
  crewRest,

  /// Post-ending decompression (blinking cursor).
  decompression,

  /// Session complete.
  complete,
}

/// The user's character, created during crew intake.
class UserCharacter {
  final String name;
  final String role;        // What was your role on this ship?
  final String virtue;      // What keeps you going when everything goes dark?
  final String vice;        // What do you fall back on when you can't cope?
  final String moment;      // If you had one hour left, what would you need to do?
  final String brink;       // What happened to you before you boarded this ship?

  const UserCharacter({
    required this.name,
    required this.role,
    required this.virtue,
    required this.vice,
    required this.moment,
    required this.brink,
  });

  Map<String, dynamic> toJson() => {
    'name': name,
    'role': role,
    'virtue': virtue,
    'vice': vice,
    'moment': moment,
    'brink': brink,
  };

  factory UserCharacter.fromJson(Map<String, dynamic> json) => UserCharacter(
    name: json['name'] as String,
    role: json['role'] as String,
    virtue: json['virtue'] as String,
    vice: json['vice'] as String,
    moment: json['moment'] as String,
    brink: json['brink'] as String,
  );
}

/// Complete session state — everything the game needs to know.
class SessionData {
  final String sessionId;
  final SessionPhase phase;
  final LumenState lumen;
  final List<NarrativeMessage> messages;
  final List<CrewMember> crew;
  final UserCharacter? userCharacter;
  final bool ghostRevealed;
  final bool isProcessing;
  final DateTime startedAt;
  final String? shipLogEntry;

  const SessionData({
    required this.sessionId,
    this.phase = SessionPhase.idle,
    this.lumen = const LumenState(),
    this.messages = const [],
    this.crew = const [],
    this.userCharacter,
    this.ghostRevealed = false,
    this.isProcessing = false,
    required this.startedAt,
    this.shipLogEntry,
  });

  SessionData copyWith({
    SessionPhase? phase,
    LumenState? lumen,
    List<NarrativeMessage>? messages,
    List<CrewMember>? crew,
    UserCharacter? userCharacter,
    bool? ghostRevealed,
    bool? isProcessing,
    String? shipLogEntry,
  }) {
    return SessionData(
      sessionId: sessionId,
      phase: phase ?? this.phase,
      lumen: lumen ?? this.lumen,
      messages: messages ?? this.messages,
      crew: crew ?? this.crew,
      userCharacter: userCharacter ?? this.userCharacter,
      ghostRevealed: ghostRevealed ?? this.ghostRevealed,
      isProcessing: isProcessing ?? this.isProcessing,
      startedAt: startedAt,
      shipLogEntry: shipLogEntry ?? this.shipLogEntry,
    );
  }

  /// Fresh session with initial crew.
  factory SessionData.newSession(String sessionId) => SessionData(
    sessionId: sessionId,
    crew: CrewMember.initialCrew,
    startedAt: DateTime.now(),
  );
}
