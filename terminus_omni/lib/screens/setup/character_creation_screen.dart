import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../config/theme.dart';
import '../../models/victim_profile.dart';
import '../../services/llm_service.dart';
import '../../services/storage_service.dart';
import '../../widgets/scanline_overlay.dart';
import 'testament_screen.dart';

/// Character creation — building the Profilo Vittima.
///
/// From the engineering prompt "L'Intervista dell'Anima":
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
      title: 'CHI SEI?',
      subtitle: 'Nome e Archetipo',
      prompt: 'Come ti chiami e cosa facevi quando il sole è scomparso?\n\n'
          'Non creare un eroe. Crea qualcuno che soffre.',
      fields: ['name', 'archetype'],
    ),
    _StepInfo(
      title: 'LA TUA VIRTÙ',
      subtitle: 'La compulsione di aiuto',
      prompt:
          'Descrivi la tua Virtù non come una qualità morale, ma come '
          'una compulsione. Quando sei più te stesso — quando aiuti?\n\n'
          'Cosa ti spinge ad aiutare gli altri, anche quando è stupido farlo?',
      fields: ['virtue'],
    ),
    _StepInfo(
      title: 'IL TUO VIZIO',
      subtitle: 'La sopravvivenza',
      prompt:
          'Descrivi il tuo Vizio non come una debolezza, ma come la tua '
          'sopravvivenza. Quando è più facile sopravvivere — facendolo?\n\n'
          'Non è un peccato. È una risorsa.',
      fields: ['vice'],
    ),
    _StepInfo(
      title: 'IL TUO MOMENTO',
      subtitle: 'L\'obiettivo prima della fine',
      prompt:
          'Il tuo Momento non è una speranza astratta. È una scena specifica.\n\n'
          'Descrivila nei minimi dettagli. Non dire "ritrovare mio figlio". '
          'Descrivi il momento in cui lo abbracci, il tessuto della sua giacca, '
          'il suono del suo respiro.',
      fields: ['moment'],
    ),
    _StepInfo(
      title: 'IL TUO BRINK',
      subtitle: 'Il punto di rottura',
      prompt:
          'Cosa hai visto, o cosa hai fatto, che ti ha fatto capire che non '
          'c\'è più ritorno?\n\n'
          'Qual è il segreto che ti divora? La ferita aperta da cui entra il buio?',
      fields: ['brink'],
    ),
    _StepInfo(
      title: 'LA VOCE DEL FANTASMA',
      subtitle: 'Chi parla dal buio (opzionale)',
      prompt:
          'C\'è una voce che senti quando sei sul punto di cedere.\n\n'
          'Non ti salva. Non risponde alle tue domande. Dice solo una frase. '
          'Poi silenzio.\n\n'
          'Chi è? Cosa dice? Puoi lasciare vuoto se preferisci.',
      fields: ['ghost'],
    ),
    _StepInfo(
      title: 'IL TESTIMONE SILENZIOSO',
      subtitle: 'La presenza muta (opzionale)',
      prompt:
          'C\'è qualcuno che ti guarda nel buio.\n\n'
          'Non parla. Non parlerà mai. Ma la sua presenza pesa più di qualsiasi '
          'parola. Forse è seduto a un pianoforte. Forse tiene una fotografia.\n\n'
          'Chi è? Cosa ha vicino? Puoi lasciare vuoto se preferisci.',
      fields: ['witness'],
    ),
    _StepInfo(
      title: 'CALIBRAZIONE',
      subtitle: 'Intensità emotiva della sessione',
      prompt:
          'Quanto vuoi che il buio prema?\n\n'
          'Non è una difficoltà. È una calibrazione terapeutica. '
          'Se il tuo trauma è recente o ti senti fragile, scegli BASSA. '
          'Il Comandante ti proteggerà di più.',
      fields: ['intensity'],
    ),
    _StepInfo(
      title: 'SCENARIO',
      subtitle: 'Il luogo del tuo tramonto',
      prompt: 'Dove si consumano le tue ultime ore?',
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
        appBar: AppBar(
          title: Text(
            'PROFILO VITTIMA',
            style: TerminusTheme.displayMedium.copyWith(fontSize: 14),
          ),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back, color: TerminusTheme.textDim),
            onPressed: () => Navigator.pop(context),
          ),
        ),
        body: Column(
          children: [
            // Progress bar
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
              child: Row(
                children: List.generate(_steps.length, (i) {
                  return Expanded(
                    child: Container(
                      height: 2,
                      margin: const EdgeInsets.symmetric(horizontal: 2),
                      color: i <= _currentStep
                          ? TerminusTheme.neonCyan
                          : TerminusTheme.border,
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
            Padding(
              padding: const EdgeInsets.all(24),
              child: SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _canProceed() ? _next : null,
                  style: ElevatedButton.styleFrom(
                    backgroundColor:
                        TerminusTheme.neonCyan.withValues(alpha: 0.15),
                    foregroundColor: TerminusTheme.neonCyan,
                    disabledBackgroundColor: TerminusTheme.bgPanel,
                    disabledForegroundColor: TerminusTheme.textDim,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                  child: Text(
                    _currentStep < _steps.length - 1
                        ? 'AVANTI'
                        : 'REGISTRA TESTAMENTO',
                    style: TerminusTheme.buttonText,
                  ),
                ),
              ),
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
              decoration: const InputDecoration(labelText: 'NOME'),
              onChanged: (_) => setState(() {}),
            ),
            const SizedBox(height: 16),
          ],
          if (step.fields.contains('archetype'))
            TextField(
              controller: _archetypeController,
              style: TerminusTheme.narrative,
              decoration: const InputDecoration(
                  labelText: 'ARCHETIPO (chi eri prima del buio)'),
              onChanged: (_) => setState(() {}),
            ),
          if (step.fields.contains('virtue'))
            TextField(
              controller: _virtueController,
              style: TerminusTheme.narrative,
              maxLines: 3,
              decoration: const InputDecoration(labelText: 'LA TUA VIRTÙ'),
              onChanged: (_) => setState(() {}),
            ),
          if (step.fields.contains('vice'))
            TextField(
              controller: _viceController,
              style: TerminusTheme.narrative,
              maxLines: 3,
              decoration: const InputDecoration(labelText: 'IL TUO VIZIO'),
              onChanged: (_) => setState(() {}),
            ),
          if (step.fields.contains('moment'))
            TextField(
              controller: _momentController,
              style: TerminusTheme.narrative,
              maxLines: 4,
              decoration: const InputDecoration(
                  labelText: 'DESCRIVI LA SCENA NEI DETTAGLI'),
              onChanged: (_) => setState(() {}),
            ),
          if (step.fields.contains('brink'))
            TextField(
              controller: _brinkController,
              style: TerminusTheme.narrative,
              maxLines: 5,
              decoration:
                  const InputDecoration(labelText: 'IL PUNTO DI ROTTURA'),
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
                labelText: 'LA FRASE CHE DICE',
                hintText: 'es: "Non ero pronto… ma questa volta sono qua."',
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
                labelText: 'CHI È (non verrà mai nominato nel gioco)',
                hintText: 'es: "mia madre", "il mio migliore amico"',
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
                labelText: 'CHI È',
                hintText: 'es: "Papà", "Mio fratello"',
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
                labelText: 'COSA HA VICINO',
                hintText: 'es: "pianoforte", "sedia vuota", "fotografia"',
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
        'BASSA',
        'Margini di sicurezza ampi. Ghost e Testimone appaiono una sola volta. '
            'Narrazione malinconica. Il Comandante interviene prima. '
            'Consigliata per traumi recenti o prima sessione.',
        TerminusTheme.neonGreen,
      ),
      EmotionalIntensity.medium: (
        'MEDIA (default)',
        'Bilanciata. Ghost e Testimone appaiono normalmente. '
            'Commander standard. Il buio preme ma non schiaccia.',
        TerminusTheme.neonOrange,
      ),
      EmotionalIntensity.high: (
        'ALTA',
        'Piena intensità. Ghost persistente, Testimone permanente. '
            '"Loro" usano la voce dei tuoi cari. Il buio è implacabile. '
            'Solo per chi sa cosa affronta.',
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
                      color: isSelected ? e.value.$3 : TerminusTheme.textSecondary,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    e.value.$2,
                    style: TerminusTheme.narrativeItalic.copyWith(fontSize: 12),
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
        'RIFUGIO COMPROMESSO',
        'Un luogo "sicuro" che sta crollando. Cosa sacrifichiamo per la sicurezza falsa?'
      ),
      'ricerca': (
        'L\'ULTIMO TRENO',
        'Un viaggio verso una destinazione. Ogni passo ti avvicina alla salvezza e alla morte.'
      ),
      'comunita': (
        'COMUNITÀ DIVISA',
        'Sopravvissuti con obiettivi conflittuali. Chi tradisci per sopravvivere?'
      ),
      'memoria': (
        'MEMORIA PERDUTA',
        'Non ricordi il passato. La realtà è affidabile? Chi sei se non ricordi?'
      ),
      'sacrificio': (
        'IL SACRIFICIO',
        'Una strada per salvare il mondo, ma solo uno può farlo. Vale la pena?'
      ),
      'tunnel': (
        'IL TUNNEL',
        'Un treno fermo in un tunnel infinito. Nessuna finestra. Nessuna luce avanti. '
            'Le candele sono l\'unica prova che sei ancora vivo.'
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
                    style: TerminusTheme.narrativeItalic.copyWith(
                      fontSize: 12,
                    ),
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
