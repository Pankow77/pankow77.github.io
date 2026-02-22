import 'package:flutter/material.dart';

import '../../config/theme.dart';
import '../../models/session.dart';
import '../../widgets/scanline_overlay.dart';
import '../finale/final_recording_screen.dart';

/// Confirmation screen before the final recording.
///
/// Shows the Ship's Log with the option to redact sensitive data
/// before it is displayed in the finale sequence. The user can:
/// - Review the full log
/// - Redact specific truths (replace with [REDATTO])
/// - Redact the profile section
/// - Proceed to the final recording or go back
///
/// This is a data sovereignty feature: the subject controls
/// what gets archived and displayed, even at Lumen 0.
class ShipLogConfirmationScreen extends StatefulWidget {
  final TerminusSession session;

  const ShipLogConfirmationScreen({
    super.key,
    required this.session,
  });

  @override
  State<ShipLogConfirmationScreen> createState() =>
      _ShipLogConfirmationScreenState();
}

class _ShipLogConfirmationScreenState
    extends State<ShipLogConfirmationScreen> {
  late List<bool> _truthRedacted;
  bool _profileRedacted = false;

  @override
  void initState() {
    super.initState();
    _truthRedacted =
        List.filled(widget.session.truths.length, false);
  }

  String _buildRedactedLog() {
    final session = widget.session;
    final profile = session.profile;
    final buffer = StringBuffer();

    buffer.writeln('\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557');
    buffer.writeln('\u2551  REGISTRO DI BORDO \u2014 FILE RECUPERATO \u2551');
    buffer.writeln('\u255a\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255d');
    buffer.writeln();

    if (_profileRedacted) {
      buffer.writeln('SOGGETTO: [REDATTO]');
      buffer.writeln('ARCHETIPO: [REDATTO]');
      buffer.writeln('VIRT\u00d9: [REDATTO]');
      buffer.writeln('VIZIO: [REDATTO]');
      buffer.writeln('MOMENTO DESIDERATO: [REDATTO]');
    } else {
      buffer.writeln('SOGGETTO: ${profile.name}');
      buffer.writeln('ARCHETIPO: ${profile.archetype}');
      buffer.writeln('VIRT\u00d9: ${profile.virtue}');
      buffer.writeln('VIZIO: ${profile.vice}');
      buffer.writeln('MOMENTO DESIDERATO: ${profile.moment}');
    }
    buffer.writeln();
    buffer.writeln('\u2500\u2500 VERIT\u00c0 STABILITE \u2500\u2500');
    buffer.writeln();

    final truths = session.truths;
    if (truths.isEmpty) {
      buffer.writeln('Nessuna verit\u00e0 dichiarata.');
    } else {
      for (int i = 0; i < truths.length; i++) {
        final t = truths[i];
        final speaker =
            t.speaker == 'terminus' ? 'TERMINUS' : 'SOGGETTO';
        if (_truthRedacted[i]) {
          buffer.writeln(
              'VERIT\u00c0 ${i + 1} [Lumen ${t.lumenAtDeclaration}] '
              '($speaker):');
          buffer.writeln('"[REDATTO]"');
        } else {
          buffer.writeln(
              'VERIT\u00c0 ${i + 1} [Lumen ${t.lumenAtDeclaration}] '
              '($speaker):');
          buffer.writeln('"${t.text}"');
        }
        buffer.writeln();
      }
    }

    buffer.writeln(
        '\u2500\u2500 DADI LANCIATI: ${session.rolls.length} \u2500\u2500');
    final successes = session.rolls.where((r) => r.isSuccess).length;
    final failures = session.rolls.where((r) => !r.isSuccess).length;
    buffer.writeln('Successi: $successes | Fallimenti: $failures');
    if (session.rolls.any((r) => r.hopeLost)) {
      buffer.writeln('IL DADO SPERANZA \u00c8 STATO BRUCIATO.');
    }
    buffer.writeln();
    buffer.writeln('LUMEN FINALE: ${session.lumenCount}/10');
    buffer.writeln();
    buffer.writeln('FINE DEL REGISTRO');
    buffer.writeln();
    buffer.writeln(
        '\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501');
    buffer.writeln(
        'AVVISO: Questo registro contiene dati personali.');
    buffer.writeln(
        '\u00c8 archiviato localmente, crittografato sul dispositivo.');
    buffer.writeln(
        'Non viene mai trasmesso. Se perdi il dispositivo,');
    buffer.writeln(
        'perdi il registro. Questa \u00e8 la sovranit\u00e0 dei dati.');
    buffer.writeln(
        '\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501');
    return buffer.toString();
  }

  @override
  Widget build(BuildContext context) {
    final truths = widget.session.truths;
    final hasRedactions =
        _profileRedacted || _truthRedacted.any((r) => r);

    return ScanlineOverlay(
      opacity: 0.10,
      child: Scaffold(
        backgroundColor: TerminusTheme.bgDeep,
        appBar: AppBar(
          title: Text(
            'REGISTRO DI BORDO',
            style: TerminusTheme.displayMedium.copyWith(fontSize: 14),
          ),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back,
                color: TerminusTheme.textDim),
            onPressed: () => Navigator.pop(context),
          ),
        ),
        body: Column(
          children: [
            // Redaction controls
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: const BoxDecoration(
                color: TerminusTheme.bgPanel,
                border: Border(
                  bottom: BorderSide(color: TerminusTheme.border),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'CONTROLLO DATI',
                    style: TerminusTheme.systemLog.copyWith(
                      color: TerminusTheme.neonOrange,
                      fontSize: 10,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Puoi oscurare parti del registro prima della riproduzione. '
                    'I dati originali restano sul dispositivo.',
                    style: TerminusTheme.narrativeItalic
                        .copyWith(fontSize: 11),
                  ),
                  const SizedBox(height: 12),
                  // Profile redaction toggle
                  _RedactToggle(
                    label: 'PROFILO VITTIMA',
                    description: 'Nome, archetipo, virt\u00f9, vizio, momento',
                    isRedacted: _profileRedacted,
                    onChanged: (v) =>
                        setState(() => _profileRedacted = v),
                  ),
                  // Truth redaction toggles
                  if (truths.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Text(
                      'VERIT\u00c0 DICHIARATE:',
                      style: TerminusTheme.systemLog.copyWith(
                        color: TerminusTheme.textDim,
                        fontSize: 9,
                      ),
                    ),
                    const SizedBox(height: 4),
                    ...List.generate(truths.length, (i) {
                      final t = truths[i];
                      final preview = t.text.length > 40
                          ? '${t.text.substring(0, 40)}...'
                          : t.text;
                      return _RedactToggle(
                        label: 'Verit\u00e0 ${i + 1}',
                        description: '"$preview"',
                        isRedacted: _truthRedacted[i],
                        onChanged: (v) =>
                            setState(() => _truthRedacted[i] = v),
                      );
                    }),
                  ],
                ],
              ),
            ),

            // Log preview
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: SelectableText(
                  _buildRedactedLog(),
                  style: TerminusTheme.narrative.copyWith(
                    fontSize: 11,
                    height: 1.6,
                  ),
                ),
              ),
            ),

            // Action buttons
            Container(
              padding: const EdgeInsets.all(16),
              decoration: const BoxDecoration(
                color: TerminusTheme.bgPanel,
                border: Border(
                  top: BorderSide(color: TerminusTheme.border),
                ),
              ),
              child: Column(
                children: [
                  if (hasRedactions)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Text(
                        'Alcune sezioni sono state oscurate.',
                        style: TerminusTheme.systemLog.copyWith(
                          color: TerminusTheme.neonOrange
                              .withValues(alpha: 0.7),
                          fontSize: 9,
                        ),
                      ),
                    ),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () {
                        Navigator.pushReplacement(
                          context,
                          MaterialPageRoute(
                            builder: (_) => FinalRecordingScreen(
                              testament:
                                  widget.session.profile.testament,
                              characterName:
                                  widget.session.profile.name,
                              shipLog: _buildRedactedLog(),
                            ),
                          ),
                        );
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: TerminusTheme.neonRed
                            .withValues(alpha: 0.15),
                        foregroundColor: TerminusTheme.neonRed,
                        padding: const EdgeInsets.symmetric(
                            vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(4),
                        ),
                      ),
                      child: Text(
                        'PROCEDI ALLA RIPRODUZIONE FINALE',
                        style: TerminusTheme.buttonText,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Toggle widget for redacting a section of the Ship's Log.
class _RedactToggle extends StatelessWidget {
  final String label;
  final String description;
  final bool isRedacted;
  final ValueChanged<bool> onChanged;

  const _RedactToggle({
    required this.label,
    required this.description,
    required this.isRedacted,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: InkWell(
        onTap: () => onChanged(!isRedacted),
        child: Row(
          children: [
            Icon(
              isRedacted
                  ? Icons.visibility_off
                  : Icons.visibility,
              color: isRedacted
                  ? TerminusTheme.neonRed.withValues(alpha: 0.6)
                  : TerminusTheme.textDim.withValues(alpha: 0.4),
              size: 16,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: RichText(
                text: TextSpan(
                  children: [
                    TextSpan(
                      text: '$label: ',
                      style: TerminusTheme.systemLog.copyWith(
                        color: isRedacted
                            ? TerminusTheme.neonRed
                                .withValues(alpha: 0.7)
                            : TerminusTheme.textSecondary,
                        fontSize: 10,
                      ),
                    ),
                    TextSpan(
                      text: isRedacted ? '[REDATTO]' : description,
                      style: TerminusTheme.narrativeItalic.copyWith(
                        fontSize: 10,
                        color: isRedacted
                            ? TerminusTheme.neonRed
                                .withValues(alpha: 0.4)
                            : TerminusTheme.textDim,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
