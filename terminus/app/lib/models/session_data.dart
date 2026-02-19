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

  /// Emotional intensity estimate (0.0 = neutral, 1.0 = deep catharsis).
  /// Updated by the narrative engine based on user input analysis.
  final double emotionalIntensity;

  /// Whether the user has shared personal/trauma material.
  /// Set when the narrative engine detects disclosure content.
  final bool hasSharedPersonalMaterial;

  /// Count of substantive user messages (not single words or commands).
  final int substantiveMessageCount;

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
    this.emotionalIntensity = 0.0,
    this.hasSharedPersonalMaterial = false,
    this.substantiveMessageCount = 0,
  });

  /// Can the Ghost appear? Multi-factor gate, not just Lumen.
  ///
  /// Requirements (ALL must be true):
  /// 1. Lumen ≤ 5 (mid-game or later)
  /// 2. User has shared personal material (emotional readiness)
  /// 3. Emotional intensity > 0.4 (trajectory is deepening)
  /// 4. At least 15 substantive messages (trust established with crew)
  bool get ghostIsReady =>
      lumen.ghostCanAppear &&
      hasSharedPersonalMaterial &&
      emotionalIntensity > 0.4 &&
      substantiveMessageCount >= 15;

  SessionData copyWith({
    SessionPhase? phase,
    LumenState? lumen,
    List<NarrativeMessage>? messages,
    List<CrewMember>? crew,
    UserCharacter? userCharacter,
    bool? ghostRevealed,
    bool? isProcessing,
    String? shipLogEntry,
    double? emotionalIntensity,
    bool? hasSharedPersonalMaterial,
    int? substantiveMessageCount,
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
      emotionalIntensity: emotionalIntensity ?? this.emotionalIntensity,
      hasSharedPersonalMaterial: hasSharedPersonalMaterial ?? this.hasSharedPersonalMaterial,
      substantiveMessageCount: substantiveMessageCount ?? this.substantiveMessageCount,
    );
  }

  /// Fresh session with initial crew.
  factory SessionData.newSession(String sessionId) => SessionData(
    sessionId: sessionId,
    crew: CrewMember.initialCrew,
    startedAt: DateTime.now(),
  );
}
