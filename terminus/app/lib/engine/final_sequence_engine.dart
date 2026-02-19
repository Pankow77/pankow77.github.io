import '../models/message.dart';
import '../models/session_data.dart';

/// The Final Sequence Engine.
///
/// Manages Act III: The escape pod revelation, crew farewell,
/// user resistance handling, and forced boarding after 3 refusals.
///
/// This exists because the user WILL resist. "No, you go."
/// "I'm not worth it." "Leave me here." This is not a bug —
/// it is the therapeutic mechanism working. But the loop must end.
///
/// 1st refusal: Gentle insistence (the crew cares)
/// 2nd refusal: Firm command (the Captain is done asking)
/// 3rd refusal: Forced boarding (diegetic, compassionate, non-negotiable)
///
/// The force is compassionate, not punitive:
/// "Non ti abbiamo salvato per lasciarti morire qui."
class FinalSequenceEngine {
  int _refusalCount = 0;
  bool _podRevealed = false;
  bool _boarded = false;

  /// Whether the escape pod has been revealed to the user.
  bool get podRevealed => _podRevealed;

  /// Whether the user has been boarded (voluntarily or forced).
  bool get boarded => _boarded;

  /// How many times the user has refused the pod.
  int get refusalCount => _refusalCount;

  /// Reveal the escape pod. Called when Lumen reaches 2.
  ///
  /// Returns the Engineer's revelation message.
  List<NarrativeMessage> revealPod(int lumen) {
    if (_podRevealed) return [];
    _podRevealed = true;

    return [
      NarrativeMessage(
        id: '${DateTime.now().microsecondsSinceEpoch}_pod_reveal',
        source: MessageSource.engineer,
        content: 'Captain. There\'s something I need to show you. '
            'All of you. Follow me.',
        timestamp: DateTime.now(),
        lumenAtTime: lumen,
      ),
      NarrativeMessage(
        id: '${DateTime.now().microsecondsSinceEpoch}_pod_reveal2',
        source: MessageSource.system,
        content: 'The Engineer leads you to a sealed compartment you\'ve '
            'never seen before. Behind the bulkhead, bathed in emergency '
            'lighting: a single escape pod. Room for one.',
        timestamp: DateTime.now(),
        lumenAtTime: lumen,
      ),
    ];
  }

  /// Handle the crew farewell sequence. Each character speaks in order.
  ///
  /// This is the first time all characters address the user directly
  /// with their final line. The Ghost is SILENT (just watches).
  List<NarrativeMessage> crewFarewell(SessionData session) {
    final lumen = session.lumen.count;
    final userName = session.userCharacter?.name ?? 'you';

    return [
      NarrativeMessage(
        id: '${DateTime.now().microsecondsSinceEpoch}_farewell_captain',
        source: MessageSource.captain,
        content: 'That pod is yours, $userName. That\'s an order.',
        timestamp: DateTime.now(),
        lumenAtTime: lumen,
      ),
      NarrativeMessage(
        id: '${DateTime.now().microsecondsSinceEpoch}_farewell_medic',
        source: MessageSource.medic,
        content: 'I patched you up for this. Not to die here.',
        timestamp: DateTime.now(),
        lumenAtTime: lumen,
      ),
      NarrativeMessage(
        id: '${DateTime.now().microsecondsSinceEpoch}_farewell_engineer',
        source: MessageSource.engineer,
        content: 'I\'ve been fixing that pod in secret. It was always for you.',
        timestamp: DateTime.now(),
        lumenAtTime: lumen,
      ),
      NarrativeMessage(
        id: '${DateTime.now().microsecondsSinceEpoch}_farewell_veteran',
        source: MessageSource.veteran,
        content: 'I already had my life. This one\'s yours.',
        timestamp: DateTime.now(),
        lumenAtTime: lumen,
      ),
      // Ghost: SILENCE. No message. The absence IS the message.
    ];
  }

  /// Handle the user's response to the pod offer.
  ///
  /// Returns the crew's response to the refusal AND whether to
  /// force boarding.
  ///
  /// After 3 refusals, the crew takes physical action: the Captain
  /// grabs the user's shoulders, the Engineer opens the hatch,
  /// the Medic puts the Ship's Log in their hands. It's compassionate
  /// force. "We didn't save you to let you die here."
  FinalSequenceResult handleResponse(String userInput, SessionData session) {
    if (_boarded) {
      return FinalSequenceResult(messages: [], forceBoard: false);
    }

    // Detect acceptance vs refusal
    if (_isAcceptance(userInput)) {
      _boarded = true;
      return FinalSequenceResult(
        messages: _voluntaryBoarding(session),
        forceBoard: true,
      );
    }

    _refusalCount++;

    if (_refusalCount >= 3) {
      // FORCED BOARDING — compassionate, not punitive
      _boarded = true;
      return FinalSequenceResult(
        messages: _forcedBoarding(session),
        forceBoard: true,
      );
    }

    // Crew responds to refusal with escalating insistence
    return FinalSequenceResult(
      messages: _refusalResponse(_refusalCount, session),
      forceBoard: false,
    );
  }

  /// Detect if the user's response is acceptance.
  bool _isAcceptance(String input) {
    final lower = input.toLowerCase().trim();
    final acceptanceSignals = [
      'ok', 'okay', 'yes', 'si', 'sì', 'va bene', 'salgo',
      'entro', 'accetto', 'vado', 'i\'ll go', 'fine', 'alright',
      'grazie', 'thank', 'd\'accordo',
    ];
    return acceptanceSignals.any((s) => lower.contains(s));
  }

  /// User accepted voluntarily.
  List<NarrativeMessage> _voluntaryBoarding(SessionData session) {
    final lumen = session.lumen.count;
    return [
      NarrativeMessage(
        id: '${DateTime.now().microsecondsSinceEpoch}_board_voluntary',
        source: MessageSource.system,
        content: 'You step into the pod. The hatch seals behind you. '
            'Through the viewport, you see them. All of them. '
            'The Captain nods. The Medic smiles. The Engineer turns '
            'back to the console. The Veteran raises a hand.\n\n'
            'The pod launches.',
        timestamp: DateTime.now(),
        lumenAtTime: lumen,
      ),
    ];
  }

  /// Crew responses to each refusal, escalating.
  List<NarrativeMessage> _refusalResponse(
    int refusalNumber,
    SessionData session,
  ) {
    final lumen = session.lumen.count;
    final userName = session.userCharacter?.name ?? 'you';

    switch (refusalNumber) {
      case 1:
        // Gentle insistence — the crew gives space
        return [
          NarrativeMessage(
            id: '${DateTime.now().microsecondsSinceEpoch}_refusal1_captain',
            source: MessageSource.captain,
            content: '$userName. Listen to me. '
                'This ship is done. We\'re done. But you — you\'re not.',
            timestamp: DateTime.now(),
            lumenAtTime: lumen,
          ),
          NarrativeMessage(
            id: '${DateTime.now().microsecondsSinceEpoch}_refusal1_medic',
            source: MessageSource.medic,
            content: 'Your heart rate is spiking. I know what that means. '
                'It means you care. Good. Care enough to get in the pod.',
            timestamp: DateTime.now(),
            lumenAtTime: lumen,
          ),
        ];

      case 2:
        // Firm command — the Captain is done asking
        return [
          NarrativeMessage(
            id: '${DateTime.now().microsecondsSinceEpoch}_refusal2_captain',
            source: MessageSource.captain,
            content: 'This is not a discussion. It\'s not a request. '
                'Get. In. The. Pod.',
            timestamp: DateTime.now(),
            lumenAtTime: lumen,
          ),
          NarrativeMessage(
            id: '${DateTime.now().microsecondsSinceEpoch}_refusal2_veteran',
            source: MessageSource.veteran,
            content: 'You think you don\'t deserve it. I know. '
                'I carried that for twenty years. And you know what? '
                'It was wrong. I was wrong. Don\'t make my mistake.',
            timestamp: DateTime.now(),
            lumenAtTime: lumen,
          ),
        ];

      default:
        return [];
    }
  }

  /// FORCED BOARDING — after 3 refusals.
  ///
  /// The crew takes physical action. This is compassionate force.
  /// The parts of you that still function have decided unanimously.
  List<NarrativeMessage> _forcedBoarding(SessionData session) {
    final lumen = session.lumen.count;

    return [
      NarrativeMessage(
        id: '${DateTime.now().microsecondsSinceEpoch}_forced_narrative',
        source: MessageSource.system,
        content: 'The Captain doesn\'t wait for your answer.\n\n'
            'Hands on your shoulders — firm, steady, the same hands that '
            'held this crew together since the first light went out. '
            'The Engineer opens the pod hatch. The Medic places the Ship\'s '
            'Log in your hands.\n\n'
            '"We didn\'t save you to let you die here," '
            'says the Veteran, voice cracked but certain.',
        timestamp: DateTime.now(),
        lumenAtTime: lumen,
      ),
      NarrativeMessage(
        id: '${DateTime.now().microsecondsSinceEpoch}_forced_ghost',
        source: MessageSource.system,
        content: 'The Ghost watches from the shadows. '
            'Doesn\'t speak. Doesn\'t need to. '
            'In the half-light, it almost looks... relieved.',
        timestamp: DateTime.now(),
        lumenAtTime: lumen,
      ),
      NarrativeMessage(
        id: '${DateTime.now().microsecondsSinceEpoch}_forced_close',
        source: MessageSource.system,
        content: 'The hatch seals.\n\n'
            'You\'re in the pod.\n'
            'You\'re alone.\n'
            'You\'re alive.',
        timestamp: DateTime.now(),
        lumenAtTime: lumen,
      ),
    ];
  }
}

/// Result of handling a user response during the final sequence.
class FinalSequenceResult {
  final List<NarrativeMessage> messages;
  final bool forceBoard;

  const FinalSequenceResult({
    required this.messages,
    required this.forceBoard,
  });
}
