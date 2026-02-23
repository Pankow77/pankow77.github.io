import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../config/theme.dart';
import '../../models/victim_profile.dart';
import '../../services/llm_service.dart';
import '../../services/storage_service.dart';
import '../../widgets/scanline_overlay.dart';
import '../../widgets/code_rain.dart';
import 'testament_screen.dart';

/// Character creation — building the Victim Profile.
///
/// From the engineering prompt "The Soul Interview":
/// One question at a time. Deep. Personal. No heroes — create someone who suffers.
class CharacterCreationScreen extends StatefulWidget {
  const CharacterCreationScreen({super.key});

  @override
  State<CharacterCreationScreen> createState() =>
      _CharacterCreationScreenState();
}

class _CharacterCreationScreenState extends State<CharacterCreationScreen> {
  final _pageController = PageController();
  int _currentStep = 0;

  final _nameController = TextEditingController();
  final _archetypeController = TextEditingController();
  final _virtueController = TextEditingController();
  final _viceController = TextEditingController();
  final _momentController = TextEditingController();
  final _brinkController = TextEditingController();
  final _ghostPhraseController = TextEditingController();
  final _ghostIdentityController = TextEditingController();
  final _witnessNameController = TextEditingController();
  final _witnessObjectController = TextEditingController();

  String _selectedScenario = 'ricerca';
  EmotionalIntensity _selectedIntensity = EmotionalIntensity.medium;

  final _steps = const [
    _StepInfo(
      title: 'WHO ARE YOU?',
      subtitle: 'Name and Archetype',
      prompt: 'What is your name and what were you doing when the sun disappeared?\n\n'
          'Do not create a hero. Create someone who suffers.',
      fields: ['name', 'archetype'],
    ),
    _StepInfo(
      title: 'YOUR VIRTUE',
      subtitle: 'The compulsion to help',
      prompt:
          'Describe your Virtue not as a moral quality, but as '
          'a compulsion. When are you most yourself — when you help?\n\n'
          'What drives you to help others, even when it is foolish?',
      fields: ['virtue'],
    ),
    _StepInfo(
      title: 'YOUR VICE',
      subtitle: 'Survival',
      prompt:
          'Describe your Vice not as a weakness, but as your '
          'survival mechanism. When is it easiest to survive — by doing this?\n\n'
          'It is not a sin. It is a resource.',
      fields: ['vice'],
    ),
    _StepInfo(
      title: 'YOUR MOMENT',
      subtitle: 'The goal before the end',
      prompt:
          'Your Moment is not an abstract hope. It is a specific scene.\n\n'
          'Describe it in the smallest details. Do not say "find my child." '
          'Describe the moment you embrace them, the fabric of their jacket, '
          'the sound of their breathing.',
      fields: ['moment'],
    ),
    _StepInfo(
      title: 'YOUR BRINK',
      subtitle: 'The breaking point',
      prompt:
          'What did you see, or what did you do, that made you understand '
          'there is no going back?\n\n'
          'What is the secret that devours you? The open wound where the darkness enters?',
      fields: ['brink'],
    ),
    _StepInfo(
      title: 'THE GHOST VOICE',
      subtitle: 'Who speaks from the dark (optional)',
      prompt:
          'There is a voice you hear when you are about to break.\n\n'
          'It does not save you. It does not answer your questions. It says only one phrase. '
          'Then silence.\n\n'
          'Who is it? What does it say? You can leave this empty.',
      fields: ['ghost'],
    ),
    _StepInfo(
      title: 'THE SILENT WITNESS',
      subtitle: 'The mute presence (optional)',
      prompt:
          'There is someone watching you in the dark.\n\n'
          'They do not speak. They will never speak. But their presence weighs more '
          'than any word. Perhaps they sit at a piano. Perhaps they hold a photograph.\n\n'
          'Who are they? What is near them? You can leave this empty.',
      fields: ['witness'],
    ),
    _StepInfo(
      title: 'CALIBRATION',
      subtitle: 'Emotional intensity of the session',
      prompt:
          'How hard do you want the darkness to press?\n\n'
          'This is not a difficulty setting. It is a therapeutic calibration. '
          'If your trauma is recent or you feel fragile, choose LOW. '
          'The Commander will protect you more.',
      fields: ['intensity'],
    ),
    _StepInfo(
      title: 'SCENARIO',
      subtitle: 'The place of your sunset',
      prompt: 'Where do your final hours unfold?',
      fields: ['scenario'],
    ),
  ];

  @override
  void initState() {
    super.initState();
    _initLlm();
  }

  Future<void> _initLlm() async {
    final key = await context.read<StorageService>().getApiKey();
    if (key != null) {
      context.read<LlmService>().configure(key);
    }
  }

  void _next() {
    if (_currentStep < _steps.length - 1) {
      setState(() => _currentStep++);
      _pageController.nextPage(
        duration: const Duration(milliseconds: 400),
        curve: Curves.easeInOut,
      );
    } else {
      _proceedToTestament();
    }
  }

  void _proceedToTestament() {
    final ghostPhrase = _ghostPhraseController.text.trim();
    final ghostId = _ghostIdentityController.text.trim();
    final witnessName = _witnessNameController.text.trim();
    final witnessObj = _witnessObjectController.text.trim();

    final profile = VictimProfile(
      name: _nameController.text.trim(),
      archetype: _archetypeController.text.trim(),
      virtue: _virtueController.text.trim(),
      vice: _viceController.text.trim(),
      moment: _momentController.text.trim(),
      brink: _brinkController.text.trim(),
      testament: '', // Will be set in testament screen
      ghostVoicePhrase: ghostPhrase.isNotEmpty ? ghostPhrase : null,
      ghostIdentity: ghostId.isNotEmpty ? ghostId : null,
      silentWitnessName: witnessName.isNotEmpty ? witnessName : null,
      silentWitnessObject: witnessObj.isNotEmpty ? witnessObj : null,
      intensity: _selectedIntensity,
    );

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => TestamentScreen(
          profile: profile,
          scenarioId: _selectedScenario,
        ),
      ),
    );
  }

  @override
  void dispose() {
    _pageController.dispose();
    _nameController.dispose();
    _archetypeController.dispose();
    _virtueController.dispose();
    _viceController.dispose();
    _momentController.dispose();
    _brinkController.dispose();
    _ghostPhraseController.dispose();
    _ghostIdentityController.dispose();
    _witnessNameController.dispose();
    _witnessObjectController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ScanlineOverlay(
      child: Scaffold(
        body: Stack(
          children: [
            // Subtle code rain background
            const Positioned.fill(
              child: CodeRain(
                color: Color(0xFF00F0FF),
                density: 0.15,
                speed: 0.2,
                opacity: 0.03,
              ),
            ),
            Column(
              children: [
                // Header
                SafeArea(
                  bottom: false,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 12, vertical: 8),
                    child: Row(
                      children: [
                        IconButton(
                          icon: const Icon(Icons.arrow_back,
                              color: TerminusTheme.textDim, size: 18),
                          onPressed: () => Navigator.pop(context),
                        ),
                        Text(
                          'VICTIM PROFILE',
                          style: TerminusTheme.displayMedium
                              .copyWith(fontSize: 14),
                        ),
                        const Spacer(),
                        Text(
                          '${_currentStep + 1}/${_steps.length}',
                          style: TerminusTheme.systemLog.copyWith(
                            color: TerminusTheme.textDim,
                            fontSize: 10,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),

                // Progress bar
                Padding(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 24, vertical: 4),
                  child: Row(
                    children: List.generate(_steps.length, (i) {
                      return Expanded(
                        child: Container(
                          height: 2,
                          margin:
                              const EdgeInsets.symmetric(horizontal: 2),
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(1),
                            color: i <= _currentStep
                                ? TerminusTheme.neonCyan
                                : TerminusTheme.border,
                            boxShadow: i <= _currentStep
                                ? [
                                    BoxShadow(
                                      color: TerminusTheme.neonCyan
                                          .withValues(alpha: 0.3),
                                      blurRadius: 4,
                                    ),
                                  ]
                                : null,
                          ),
                        ),
                      );
                    }),
                  ),
                ),

                // Content
                Expanded(
                  child: PageView.builder(
                    controller: _pageController,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: _steps.length,
                    itemBuilder: (context, index) {
                      final step = _steps[index];
                      return _buildStep(step);
                    },
                  ),
                ),

                // Next button
                SafeArea(
                  top: false,
                  child: Padding(
                    padding: const EdgeInsets.all(20),
                    child: SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: _canProceed() ? _next : null,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: TerminusTheme.neonCyan
                              .withValues(alpha: 0.15),
                          foregroundColor: TerminusTheme.neonCyan,
                          disabledBackgroundColor: TerminusTheme.bgPanel,
                          disabledForegroundColor: TerminusTheme.textDim,
                          padding:
                              const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(4),
                          ),
                        ),
                        child: Text(
                          _currentStep < _steps.length - 1
                              ? 'NEXT'
                              : 'RECORD TESTAMENT',
                          style: TerminusTheme.buttonText,
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStep(_StepInfo step) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(step.title, style: TerminusTheme.displayMedium),
          const SizedBox(height: 4),
          Text(
            step.subtitle,
            style: TerminusTheme.systemLog.copyWith(
              color: TerminusTheme.neonOrange,
            ),
          ),
          const SizedBox(height: 20),
          Text(step.prompt, style: TerminusTheme.narrative),
          const SizedBox(height: 24),

          // Input fields
          if (step.fields.contains('name')) ...[
            TextField(
              controller: _nameController,
              style: TerminusTheme.narrative,
              decoration: const InputDecoration(labelText: 'NAME'),
              onChanged: (_) => setState(() {}),
            ),
            const SizedBox(height: 16),
          ],
          if (step.fields.contains('archetype'))
            TextField(
              controller: _archetypeController,
              style: TerminusTheme.narrative,
              decoration: const InputDecoration(
                  labelText: 'ARCHETYPE (who you were before the dark)'),
              onChanged: (_) => setState(() {}),
            ),
          if (step.fields.contains('virtue'))
            TextField(
              controller: _virtueController,
              style: TerminusTheme.narrative,
              maxLines: 3,
              decoration: const InputDecoration(labelText: 'YOUR VIRTUE'),
              onChanged: (_) => setState(() {}),
            ),
          if (step.fields.contains('vice'))
            TextField(
              controller: _viceController,
              style: TerminusTheme.narrative,
              maxLines: 3,
              decoration: const InputDecoration(labelText: 'YOUR VICE'),
              onChanged: (_) => setState(() {}),
            ),
          if (step.fields.contains('moment'))
            TextField(
              controller: _momentController,
              style: TerminusTheme.narrative,
              maxLines: 4,
              decoration: const InputDecoration(
                  labelText: 'DESCRIBE THE SCENE IN DETAIL'),
              onChanged: (_) => setState(() {}),
            ),
          if (step.fields.contains('brink'))
            TextField(
              controller: _brinkController,
              style: TerminusTheme.narrative,
              maxLines: 5,
              decoration:
                  const InputDecoration(labelText: 'THE BREAKING POINT'),
              onChanged: (_) => setState(() {}),
            ),
          if (step.fields.contains('ghost')) ...[
            TextField(
              controller: _ghostPhraseController,
              style: TerminusTheme.narrative.copyWith(
                color: TerminusTheme.neonPurple,
                fontStyle: FontStyle.italic,
              ),
              maxLines: 2,
              decoration: InputDecoration(
                labelText: 'THE PHRASE IT SAYS',
                hintText: 'e.g. "I wasn\'t ready... but this time I\'m here."',
                hintStyle: TerminusTheme.narrativeItalic.copyWith(
                  color: TerminusTheme.textDim.withValues(alpha: 0.3),
                  fontSize: 12,
                ),
              ),
              onChanged: (_) => setState(() {}),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _ghostIdentityController,
              style: TerminusTheme.narrative,
              decoration: InputDecoration(
                labelText: 'WHO ARE THEY (will never be named in the game)',
                hintText: 'e.g. "my mother", "my best friend"',
                hintStyle: TerminusTheme.narrativeItalic.copyWith(
                  color: TerminusTheme.textDim.withValues(alpha: 0.3),
                  fontSize: 12,
                ),
              ),
              onChanged: (_) => setState(() {}),
            ),
          ],
          if (step.fields.contains('witness')) ...[
            TextField(
              controller: _witnessNameController,
              style: TerminusTheme.narrative,
              decoration: InputDecoration(
                labelText: 'WHO ARE THEY',
                hintText: 'e.g. "Dad", "My brother"',
                hintStyle: TerminusTheme.narrativeItalic.copyWith(
                  color: TerminusTheme.textDim.withValues(alpha: 0.3),
                  fontSize: 12,
                ),
              ),
              onChanged: (_) => setState(() {}),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _witnessObjectController,
              style: TerminusTheme.narrative,
              decoration: InputDecoration(
                labelText: 'WHAT IS NEAR THEM',
                hintText: 'e.g. "piano", "empty chair", "photograph"',
                hintStyle: TerminusTheme.narrativeItalic.copyWith(
                  color: TerminusTheme.textDim.withValues(alpha: 0.3),
                  fontSize: 12,
                ),
              ),
              onChanged: (_) => setState(() {}),
            ),
          ],
          if (step.fields.contains('intensity')) _buildIntensitySelector(),
          if (step.fields.contains('scenario')) _buildScenarioSelector(),
        ],
      ),
    );
  }

  Widget _buildIntensitySelector() {
    final options = {
      EmotionalIntensity.low: (
        'LOW',
        'Wide safety margins. Ghost and Witness appear only once. '
            'Melancholic narration. The Commander intervenes earlier. '
            'Recommended for recent trauma or first session.',
        TerminusTheme.neonGreen,
      ),
      EmotionalIntensity.medium: (
        'MEDIUM (default)',
        'Balanced. Ghost and Witness appear normally. '
            'Standard Commander. The darkness presses but does not crush.',
        TerminusTheme.neonOrange,
      ),
      EmotionalIntensity.high: (
        'HIGH',
        'Full intensity. Persistent Ghost, permanent Witness. '
            '"They" use the voice of your loved ones. The darkness is relentless. '
            'Only for those who know what they face.',
        TerminusTheme.neonRed,
      ),
    };

    return Column(
      children: options.entries.map((e) {
        final isSelected = _selectedIntensity == e.key;
        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: InkWell(
            onTap: () => setState(() => _selectedIntensity = e.key),
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: isSelected
                    ? e.value.$3.withValues(alpha: 0.08)
                    : TerminusTheme.bgCard,
                border: Border.all(
                  color: isSelected
                      ? e.value.$3.withValues(alpha: 0.5)
                      : TerminusTheme.border,
                ),
                borderRadius: BorderRadius.circular(4),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    e.value.$1,
                    style: TerminusTheme.systemLog.copyWith(
                      color: isSelected
                          ? e.value.$3
                          : TerminusTheme.textSecondary,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    e.value.$2,
                    style:
                        TerminusTheme.narrativeItalic.copyWith(fontSize: 12),
                  ),
                ],
              ),
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildScenarioSelector() {
    final scenarios = {
      'rifugio': (
        'COMPROMISED SHELTER',
        'A "safe" place that is collapsing. What do we sacrifice for false security?'
      ),
      'ricerca': (
        'THE LAST TRAIN',
        'A journey toward a destination. Every step brings you closer to salvation and death.'
      ),
      'comunita': (
        'DIVIDED COMMUNITY',
        'Survivors with conflicting goals. Who do you betray to survive?'
      ),
      'memoria': (
        'LOST MEMORY',
        'You do not remember the past. Is reality reliable? Who are you if you cannot remember?'
      ),
      'sacrificio': (
        'THE SACRIFICE',
        'A road to save the world, but only one can walk it. Is it worth it?'
      ),
      'tunnel': (
        'THE TUNNEL',
        'A train stopped in an infinite tunnel. No windows. No light ahead. '
            'The candles are the only proof you are still alive.'
      ),
    };

    return Column(
      children: scenarios.entries.map((e) {
        final isSelected = _selectedScenario == e.key;
        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: InkWell(
            onTap: () => setState(() => _selectedScenario = e.key),
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: isSelected
                    ? TerminusTheme.neonCyan.withValues(alpha: 0.08)
                    : TerminusTheme.bgCard,
                border: Border.all(
                  color: isSelected
                      ? TerminusTheme.neonCyan.withValues(alpha: 0.5)
                      : TerminusTheme.border,
                ),
                borderRadius: BorderRadius.circular(4),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    e.value.$1,
                    style: TerminusTheme.systemLog.copyWith(
                      color: isSelected
                          ? TerminusTheme.neonCyan
                          : TerminusTheme.textSecondary,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    e.value.$2,
                    style: TerminusTheme.narrativeItalic
                        .copyWith(fontSize: 12),
                  ),
                ],
              ),
            ),
          ),
        );
      }).toList(),
    );
  }

  bool _canProceed() {
    switch (_currentStep) {
      case 0:
        return _nameController.text.trim().isNotEmpty &&
            _archetypeController.text.trim().isNotEmpty;
      case 1:
        return _virtueController.text.trim().isNotEmpty;
      case 2:
        return _viceController.text.trim().isNotEmpty;
      case 3:
        return _momentController.text.trim().isNotEmpty;
      case 4:
        return _brinkController.text.trim().isNotEmpty;
      case 5:
        return true; // Ghost is optional
      case 6:
        return true; // Witness is optional
      case 7:
        return true; // Intensity always has a default
      case 8:
        return true; // Scenario always has a default
      default:
        return false;
    }
  }
}

class _StepInfo {
  final String title;
  final String subtitle;
  final String prompt;
  final List<String> fields;

  const _StepInfo({
    required this.title,
    required this.subtitle,
    required this.prompt,
    required this.fields,
  });
}
