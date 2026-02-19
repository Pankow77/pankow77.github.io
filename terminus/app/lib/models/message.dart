import 'package:flutter/material.dart';
import '../config/theme.dart';
import 'crew_member.dart';

/// Who is speaking?
enum MessageSource {
  system,    // Ship computer / narrative system
  user,      // The player
  captain,
  medic,
  engineer,
  veteran,
  ghost,
  shipLog,   // Ship's Log entries (recorded voice)
}

/// A single message in the narrative.
class NarrativeMessage {
  final String id;
  final MessageSource source;
  final String content;
  final DateTime timestamp;
  final int lumenAtTime;

  const NarrativeMessage({
    required this.id,
    required this.source,
    required this.content,
    required this.timestamp,
    required this.lumenAtTime,
  });

  /// Display prefix for terminal output.
  String get prefix {
    switch (source) {
      case MessageSource.system:
        return '[SYSTEM]';
      case MessageSource.user:
        return '>';
      case MessageSource.captain:
        return '[Captain]';
      case MessageSource.medic:
        return '[Medic]';
      case MessageSource.engineer:
        return '[Engineer]';
      case MessageSource.veteran:
        return '[Veteran]';
      case MessageSource.ghost:
        return '[???]';
      case MessageSource.shipLog:
        return '[SHIP LOG]';
    }
  }

  /// Color for this message source.
  Color get color {
    switch (source) {
      case MessageSource.system:
        return TerminusTheme.systemColor;
      case MessageSource.user:
        return TerminusTheme.userColor;
      case MessageSource.captain:
        return TerminusTheme.captainColor;
      case MessageSource.medic:
        return TerminusTheme.medicColor;
      case MessageSource.engineer:
        return TerminusTheme.engineerColor;
      case MessageSource.veteran:
        return TerminusTheme.veteranColor;
      case MessageSource.ghost:
        return TerminusTheme.ghostColor;
      case MessageSource.shipLog:
        return TerminusTheme.amber;
    }
  }

  /// Convert MessageSource to CrewRole (where applicable).
  CrewRole? get crewRole {
    switch (source) {
      case MessageSource.captain:
        return CrewRole.captain;
      case MessageSource.medic:
        return CrewRole.medic;
      case MessageSource.engineer:
        return CrewRole.engineer;
      case MessageSource.veteran:
        return CrewRole.veteran;
      case MessageSource.ghost:
        return CrewRole.ghost;
      default:
        return null;
    }
  }

  /// Convert to map for LLM context.
  Map<String, String> toLlmMessage() {
    final role = source == MessageSource.user ? 'user' : 'assistant';
    final text = source == MessageSource.user
        ? content
        : '$prefix $content';
    return {'role': role, 'content': text};
  }
}
