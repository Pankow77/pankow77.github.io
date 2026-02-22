import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';

import '../../config/theme.dart';
import '../../models/session.dart';
import '../../services/storage_service.dart';
import '../../widgets/scanline_overlay.dart';

/// Archive of past TERMINUS-OMNI sessions.
class SessionsArchiveScreen extends StatefulWidget {
  const SessionsArchiveScreen({super.key});

  @override
  State<SessionsArchiveScreen> createState() => _SessionsArchiveScreenState();
}

class _SessionsArchiveScreenState extends State<SessionsArchiveScreen> {
  List<TerminusSession> _sessions = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadSessions();
  }

  Future<void> _loadSessions() async {
    final sessions =
        await context.read<StorageService>().loadAllSessions();
    setState(() {
      _sessions = sessions;
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return ScanlineOverlay(
      child: Scaffold(
        appBar: AppBar(
          title: Text(
            'ARCHIVIO SESSIONI',
            style: TerminusTheme.displayMedium.copyWith(fontSize: 14),
          ),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back, color: TerminusTheme.textDim),
            onPressed: () => Navigator.pop(context),
          ),
        ),
        body: _loading
            ? const Center(
                child:
                    CircularProgressIndicator(color: TerminusTheme.neonCyan))
            : _sessions.isEmpty
                ? Center(
                    child: Text(
                      'Nessuna sessione archiviata.\nIl buio aspetta.',
                      style: TerminusTheme.narrativeItalic,
                      textAlign: TextAlign.center,
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _sessions.length,
                    itemBuilder: (context, index) {
                      final session = _sessions[index];
                      return _SessionCard(session: session);
                    },
                  ),
      ),
    );
  }
}

class _SessionCard extends StatelessWidget {
  final TerminusSession session;

  const _SessionCard({required this.session});

  @override
  Widget build(BuildContext context) {
    final dateFormat = DateFormat('dd MMM yyyy, HH:mm');
    final isComplete = session.completedAt != null;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: TerminusTheme.bgCard,
        border: Border.all(color: TerminusTheme.border),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                session.profile.name,
                style: TerminusTheme.displayMedium.copyWith(fontSize: 14),
              ),
              const Spacer(),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: isComplete
                      ? TerminusTheme.neonRed.withValues(alpha: 0.1)
                      : TerminusTheme.neonGreen.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(2),
                ),
                child: Text(
                  isComplete ? 'COMPLETATA' : 'IN CORSO',
                  style: TerminusTheme.systemLog.copyWith(
                    fontSize: 9,
                    color: isComplete
                        ? TerminusTheme.neonRed
                        : TerminusTheme.neonGreen,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            session.profile.archetype,
            style: TerminusTheme.narrativeItalic.copyWith(fontSize: 12),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Text(
                'LUMEN: ${session.lumenCount}/10',
                style: TerminusTheme.systemLog.copyWith(
                  color: TerminusTheme.lumenColor(session.lumenCount),
                  fontSize: 10,
                ),
              ),
              const SizedBox(width: 16),
              Text(
                'MESSAGGI: ${session.messages.length}',
                style: TerminusTheme.systemLog.copyWith(
                  color: TerminusTheme.textDim,
                  fontSize: 10,
                ),
              ),
              const SizedBox(width: 16),
              Text(
                'VERITÀ: ${session.truths.length}',
                style: TerminusTheme.systemLog.copyWith(
                  color: TerminusTheme.textDim,
                  fontSize: 10,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            dateFormat.format(session.startedAt),
            style: TerminusTheme.systemLog.copyWith(
              color: TerminusTheme.textDim.withValues(alpha: 0.5),
              fontSize: 9,
            ),
          ),
        ],
      ),
    );
  }
}
