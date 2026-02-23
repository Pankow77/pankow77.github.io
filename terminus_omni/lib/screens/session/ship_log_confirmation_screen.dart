import 'package:flutter/material.dart';

import '../../config/theme.dart';
import '../../models/session.dart';
import '../../widgets/scanline_overlay.dart';
import '../../widgets/code_rain.dart';
import '../finale/final_recording_screen.dart';

/// Confirmation screen before the final recording.
///
/// Shows the Ship's Log with the option to redact sensitive data
/// before it is displayed in the finale sequence. The user can:
/// - Review the full log
/// - Redact specific truths (replace with [REDACTED])
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
    buffer.writeln('\u2551  SHIP\'S LOG \u2014 RECOVERED FILE       \u2551');
    buffer.writeln('\u255a\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255d');
    buffer.writeln();

    if (_profileRedacted) {
      buffer.writeln('SUBJECT: [REDACTED]');
      buffer.writeln('ARCHETYPE: [REDACTED]');
      buffer.writeln('VIRTUE: [REDACTED]');
      buffer.writeln('VICE: [REDACTED]');
      buffer.writeln('DESIRED MOMENT: [REDACTED]');
    } else {
      buffer.writeln('SUBJECT: ${profile.name}');
      buffer.writeln('ARCHETYPE: ${profile.archetype}');
      buffer.writeln('VIRTUE: ${profile.virtue}');
      buffer.writeln('VICE: ${profile.vice}');
      buffer.writeln('DESIRED MOMENT: ${profile.moment}');
    }
    buffer.writeln();
    buffer.writeln('\u2500\u2500 ESTABLISHED TRUTHS \u2500\u2500');
    buffer.writeln();

    final truths = session.truths;
    if (truths.isEmpty) {
      buffer.writeln('No truths declared.');
    } else {
      for (int i = 0; i < truths.length; i++) {
        final t = truths[i];
        final speaker =
            t.speaker == 'terminus' ? 'TERMINUS' : 'SUBJECT';
        if (_truthRedacted[i]) {
          buffer.writeln(
              'TRUTH ${i + 1} [Lumen ${t.lumenAtDeclaration}] '
              '($speaker):');
          buffer.writeln('"[REDACTED]"');
        } else {
          buffer.writeln(
              'TRUTH ${i + 1} [Lumen ${t.lumenAtDeclaration}] '
              '($speaker):');
          buffer.writeln('"${t.text}"');
        }
        buffer.writeln();
      }
    }

    buffer.writeln(
        '\u2500\u2500 DICE ROLLED: ${session.rolls.length} \u2500\u2500');
    final successes = session.rolls.where((r) => r.isSuccess).length;
    final failures = session.rolls.where((r) => !r.isSuccess).length;
    buffer.writeln('Successes: $successes | Failures: $failures');
    if (session.rolls.any((r) => r.hopeLost)) {
      buffer.writeln('THE HOPE DIE HAS BEEN BURNED.');
    }
    buffer.writeln();
    buffer.writeln('FINAL LUMEN: ${session.lumenCount}/10');
    buffer.writeln();
    buffer.writeln('END OF LOG');
    buffer.writeln();
    buffer.writeln(
        '\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501');
    buffer.writeln(
        'NOTICE: This log contains personal data.');
    buffer.writeln(
        'It is stored locally, encrypted on the device.');
    buffer.writeln(
        'It is never transmitted. If you lose the device,');
    buffer.writeln(
        'you lose the log. This is data sovereignty.');
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
        body: Stack(
          children: [
            const Positioned.fill(
              child: CodeRain(
                color: Color(0xFFFF003C),
                density: 0.15,
                speed: 0.2,
                opacity: 0.03,
              ),
            ),
            Column(
              children: [
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
                          'SHIP\'S LOG',
                          style: TerminusTheme.displayMedium
                              .copyWith(fontSize: 14),
                        ),
                      ],
                    ),
                  ),
                ),

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
                        'DATA CONTROL',
                        style: TerminusTheme.systemLog.copyWith(
                          color: TerminusTheme.neonOrange,
                          fontSize: 10,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'You can redact sections of the log before playback. '
                        'Original data remains on the device.',
                        style: TerminusTheme.narrativeItalic
                            .copyWith(fontSize: 11),
                      ),
                      const SizedBox(height: 12),
                      _RedactToggle(
                        label: 'VICTIM PROFILE',
                        description:
                            'Name, archetype, virtue, vice, moment',
                        isRedacted: _profileRedacted,
                        onChanged: (v) =>
                            setState(() => _profileRedacted = v),
                      ),
                      if (truths.isNotEmpty) ...[
                        const SizedBox(height: 8),
                        Text(
                          'DECLARED TRUTHS:',
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
                            label: 'Truth ${i + 1}',
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
                SafeArea(
                  top: false,
                  child: Container(
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
                              'Some sections have been redacted.',
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
                                    testament: widget
                                        .session.profile.testament,
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
                              'PROCEED TO FINAL PLAYBACK',
                              style: TerminusTheme.buttonText,
                            ),
                          ),
                        ),
                      ],
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
}

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
                      text:
                          isRedacted ? '[REDACTED]' : description,
                      style:
                          TerminusTheme.narrativeItalic.copyWith(
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
