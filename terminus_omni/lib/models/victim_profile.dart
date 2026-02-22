/// The Profilo Vittima — psychological dossier for each subject.
///
/// From the engineering prompt:
/// ├─ Nome & Archetipo
/// ├─ Virtù (compulsione di aiuto)
/// ├─ Vizio (sopravvivenza)
/// ├─ MOMENTO (obiettivo che darà speranza)
/// └─ BRINK (punto di rottura)
class VictimProfile {
  /// Full name of the character/subject.
  final String name;

  /// Who they were before the darkness.
  /// e.g. "Musicista, romanziere, cineasta"
  final String archetype;

  /// The compulsion to help — what makes them still human.
  /// e.g. "Il senso di colpa mi spinge ad aiutare gli altri"
  final String virtue;

  /// Survival mechanism — what they do when lucidity fails.
  /// e.g. "Dipendenza da crack"
  final String vice;

  /// The specific scene they want to achieve before death.
  /// Must be sensory and detailed, not abstract.
  /// e.g. "Vivere la sensazione di avere la mia famiglia accanto"
  final String moment;

  /// The breaking point — what they saw/did that changed them forever.
  /// e.g. "Il giorno in cui è morta mia madre, ero legato a un letto di ferro"
  final String brink;

  /// The sealed vocal testament — final message before the darkness.
  /// Text or audio file path.
  final String testament;

  /// Optional: audio file path for recorded testament.
  final String? testamentAudioPath;

  const VictimProfile({
    required this.name,
    required this.archetype,
    required this.virtue,
    required this.vice,
    required this.moment,
    required this.brink,
    required this.testament,
    this.testamentAudioPath,
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
      );
}
