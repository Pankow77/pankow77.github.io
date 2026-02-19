import 'package:flutter/material.dart';
import '../config/theme.dart';

/// The five crew members of the TERMINUS.
/// Each is a therapeutic function wearing a narrative face.
enum CrewRole {
  captain,
  medic,
  engineer,
  veteran,
  ghost,
}

/// The user's status during their journey.
enum CrewStatus {
  online,
  offline,
  resting,   // "crew goes to sleep" safety mechanism
  unknown,   // Ghost initial state
}

/// A member of the TERMINUS crew.
class CrewMember {
  final CrewRole role;
  final CrewStatus status;

  const CrewMember({
    required this.role,
    this.status = CrewStatus.online,
  });

  String get name {
    switch (role) {
      case CrewRole.captain:
        return 'Captain';
      case CrewRole.medic:
        return 'Medic';
      case CrewRole.engineer:
        return 'Engineer';
      case CrewRole.veteran:
        return 'Veteran';
      case CrewRole.ghost:
        return '???';
    }
  }

  String get rank {
    switch (role) {
      case CrewRole.captain:
        return 'Commander';
      case CrewRole.medic:
        return 'Medical Officer';
      case CrewRole.engineer:
        return 'Systems Specialist';
      case CrewRole.veteran:
        return 'Senior Crew';
      case CrewRole.ghost:
        return '[CLASSIFIED]';
    }
  }

  String get statusDisplay {
    switch (status) {
      case CrewStatus.online:
        return 'ONLINE';
      case CrewStatus.offline:
        return 'OFFLINE';
      case CrewStatus.resting:
        return 'RESTING';
      case CrewStatus.unknown:
        return '??????';
    }
  }

  Color get color {
    switch (role) {
      case CrewRole.captain:
        return TerminusTheme.captainColor;
      case CrewRole.medic:
        return TerminusTheme.medicColor;
      case CrewRole.engineer:
        return TerminusTheme.engineerColor;
      case CrewRole.veteran:
        return TerminusTheme.veteranColor;
      case CrewRole.ghost:
        return TerminusTheme.ghostColor;
    }
  }

  String get prefix => '[$name]';

  CrewMember copyWith({CrewStatus? status}) {
    return CrewMember(
      role: role,
      status: status ?? this.status,
    );
  }

  /// The initial crew roster at session start.
  static List<CrewMember> get initialCrew => const [
    CrewMember(role: CrewRole.captain),
    CrewMember(role: CrewRole.medic),
    CrewMember(role: CrewRole.engineer),
    CrewMember(role: CrewRole.veteran),
    CrewMember(role: CrewRole.ghost, status: CrewStatus.unknown),
  ];
}
