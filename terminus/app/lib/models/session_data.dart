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

  /// Can the Ghost appear? Weighted point system, not hard AND gate.
  ///
  /// Lumen ≤ 5 is MANDATORY (the only hard requirement).
  /// Everything else contributes points. Threshold: 6 points.
  ///
  /// This prevents the Ghost from never appearing because ONE factor
  /// is slightly below threshold while everything else is ready.
  bool get ghostIsReady {
    if (!lumen.ghostCanAppear) return false; // Hard requirement

    return ghostReadinessScore >= 6;
  }

  /// Ghost readiness score (0-10+). Threshold for appearance: 6.
  ///
  /// Point system allows multiple paths to Ghost readiness:
  /// - Reserved user with high intensity + low lumen → Ghost unlocked
  /// - Verbose user with shared material + many messages → Ghost unlocked
  /// - Both compensate for each other
  int get ghostReadinessScore {
    var points = 0;

    // Lumen depth: lower = more points (the ship is dying)
    if (lumen.count <= 3) {
      points += 3;
    } else if (lumen.count <= 5) {
      points += 2;
    }

    // Shared personal material (strong signal)
    if (hasSharedPersonalMaterial) points += 2;

    // Emotional intensity (gradient, not binary)
    if (emotionalIntensity > 0.6) {
      points += 3;
    } else if (emotionalIntensity > 0.4) {
      points += 2;
    } else if (emotionalIntensity > 0.2) {
      points += 1;
    }

    // Trust established (message count as proxy)
    if (substantiveMessageCount >= 20) {
      points += 2;
    } else if (substantiveMessageCount >= 15) {
      points += 1;
    }

    return points;
  }

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

  /// Serialize to JSON for session persistence.
  ///
  /// Saves everything needed to restore the session exactly:
  /// messages, lumen, crew, character, emotional state, phase.
  /// Does NOT save isProcessing (always false on restore).
  Map<String, dynamic> toJson() => {
    'sessionId': sessionId,
    'phase': phase.name,
    'lumen': lumen.toJson(),
    'messages': messages.map((m) => m.toJson()).toList(),
    'crew': crew.map((c) => c.toJson()).toList(),
    'userCharacter': userCharacter?.toJson(),
    'ghostRevealed': ghostRevealed,
    'startedAt': startedAt.toIso8601String(),
    'shipLogEntry': shipLogEntry,
    'emotionalIntensity': emotionalIntensity,
    'hasSharedPersonalMaterial': hasSharedPersonalMaterial,
    'substantiveMessageCount': substantiveMessageCount,
  };

  /// Deserialize from JSON.
  factory SessionData.fromJson(Map<String, dynamic> json) {
    return SessionData(
      sessionId: json['sessionId'] as String,
      phase: SessionPhase.values.firstWhere(
        (p) => p.name == json['phase'],
        orElse: () => SessionPhase.playing,
      ),
      lumen: LumenState.fromJson(json['lumen'] as Map<String, dynamic>),
      messages: (json['messages'] as List<dynamic>)
          .map((m) => NarrativeMessage.fromJson(m as Map<String, dynamic>))
          .toList(),
      crew: (json['crew'] as List<dynamic>)
          .map((c) => CrewMember.fromJson(c as Map<String, dynamic>))
          .toList(),
      userCharacter: json['userCharacter'] != null
          ? UserCharacter.fromJson(json['userCharacter'] as Map<String, dynamic>)
          : null,
      ghostRevealed: json['ghostRevealed'] as bool? ?? false,
      startedAt: DateTime.parse(json['startedAt'] as String),
      shipLogEntry: json['shipLogEntry'] as String?,
      emotionalIntensity: (json['emotionalIntensity'] as num?)?.toDouble() ?? 0.0,
      hasSharedPersonalMaterial: json['hasSharedPersonalMaterial'] as bool? ?? false,
      substantiveMessageCount: json['substantiveMessageCount'] as int? ?? 0,
    );
  }
}
