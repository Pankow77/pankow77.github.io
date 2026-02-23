/// The Profilo Vittima — psychological dossier for each subject.
///
/// From the engineering prompt:
/// ├─ Nome & Archetipo
/// ├─ Virtù (compulsione di aiuto)
/// ├─ Vizio (sopravvivenza)
/// ├─ MOMENTO (obiettivo che darà speranza)
/// ├─ BRINK (punto di rottura)
/// ├─ Ghost Voice (la voce frammentata che appare a Lumen ≤ 3)
/// └─ Silent Witness (la presenza muta che non parla mai)

/// Narrative metaphor for the scenario's physical environment.
/// The conductor chooses based on the type of trauma.
enum NarrativeMetaphor {
  train,   // Movimento forzato verso collisione inevitabile
  ship,    // Isolamento in acque nere + sistemi che cedono
  tunnel,  // Vuoto dissociativo, buio infinito, nessuna uscita
  room,    // Crisi claustrofobica, muri che si stringono
  eclipse, // Perdita graduale di luce, il mondo che si spegne
}

/// Emotional intensity calibration.
///
/// Controls how aggressively Ghost Voice, Silent Witness, and
/// atmospheric elements operate. Lower intensity = wider safety
/// margins, Commander triggers earlier, Ghost appears less frequently.
///
/// This is NOT a difficulty setting. It's a therapeutic dosing control
/// (Ogden et al., 2006 — Window of Tolerance).
enum EmotionalIntensity {
  low,    // First-time users, recent trauma (<6 months), high sensitivity
  medium, // Default. Balanced dosing, standard Commander threshold
  high,   // Experienced users, resolved-but-unprocessed trauma
}

class VictimProfile {
  /// Full name of the character/subject.
  final String name;

  /// Who they were before the darkness.
  final String archetype;

  /// The compulsion to help — what makes them still human.
  final String virtue;

  /// Survival mechanism — what they do when lucidity fails.
  final String vice;

  /// The specific scene they want to achieve before death.
  final String moment;

  /// The breaking point — what they saw/did that changed them forever.
  final String brink;

  /// The sealed vocal testament — final message before the darkness.
  final String testament;

  /// Optional: audio file path for recorded testament.
  final String? testamentAudioPath;

  /// The Ghost Voice — a fragmented voice from the past that appears
  /// at Lumen ≤ 3. It says one phrase. Then silence. It never responds.
  /// e.g. "Non ero pronto… ma questa volta sono qua."
  final String? ghostVoicePhrase;

  /// Who the ghost is — unnamed in the narrative, but the subject knows.
  /// e.g. "mia madre", "il mio migliore amico"
  final String? ghostIdentity;

  /// The Silent Witness — a presence that never speaks.
  /// Their silence is insupportable and necessary.
  /// e.g. "Papà", "Mio fratello"
  final String? silentWitnessName;

  /// The object the Silent Witness is associated with.
  /// e.g. "pianoforte", "sedia vuota", "fotografia"
  final String? silentWitnessObject;

  /// The narrative metaphor chosen for this session.
  final NarrativeMetaphor metaphor;

  /// Emotional intensity calibration (therapeutic dosing).
  final EmotionalIntensity intensity;

  const VictimProfile({
    required this.name,
    required this.archetype,
    required this.virtue,
    required this.vice,
    required this.moment,
    required this.brink,
    required this.testament,
    this.testamentAudioPath,
    this.ghostVoicePhrase,
    this.ghostIdentity,
    this.silentWitnessName,
    this.silentWitnessObject,
    this.metaphor = NarrativeMetaphor.train,
    this.intensity = EmotionalIntensity.medium,
  });

  Map<String, dynamic> toJson() => {
        'name': name,
        'archetype': archetype,
        'virtue': virtue,
        'vice': vice,
        'moment': moment,
        'brink': brink,
        'testament': testament,
        'testamentAudioPath': testamentAudioPath,
        'ghostVoicePhrase': ghostVoicePhrase,
        'ghostIdentity': ghostIdentity,
        'silentWitnessName': silentWitnessName,
        'silentWitnessObject': silentWitnessObject,
        'metaphor': metaphor.name,
        'intensity': intensity.name,
      };

  factory VictimProfile.fromJson(Map<String, dynamic> json) => VictimProfile(
        name: json['name'] as String,
        archetype: json['archetype'] as String,
        virtue: json['virtue'] as String,
        vice: json['vice'] as String,
        moment: json['moment'] as String,
        brink: json['brink'] as String,
        testament: json['testament'] as String,
        testamentAudioPath: json['testamentAudioPath'] as String?,
        ghostVoicePhrase: json['ghostVoicePhrase'] as String?,
        ghostIdentity: json['ghostIdentity'] as String?,
        silentWitnessName: json['silentWitnessName'] as String?,
        silentWitnessObject: json['silentWitnessObject'] as String?,
        metaphor: json['metaphor'] != null
            ? NarrativeMetaphor.values.byName(json['metaphor'] as String)
            : NarrativeMetaphor.train,
        intensity: json['intensity'] != null
            ? EmotionalIntensity.values.byName(json['intensity'] as String)
            : EmotionalIntensity.medium,
      );
}
