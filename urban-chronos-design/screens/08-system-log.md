# URBAN_CHRONOS v2.0 — System Log Page

## Scopo
Feed live di tutti gli eventi del sistema in formato terminale.
Stile monitor di controllo cyberpunk.

## Layout

```
┌─────────────────────────────────────────┐
│ ← SYSTEM LOG // LIVE FEED    [⏸] [🗑] │
│─────────────────────────────────────────│
│                                          │
│ ┌─ FILTERS ───────────────────────────┐ │
│ │ [ALL] [INFO] [WARN] [ERROR] [SYSTEM]│ │
│ └──────────────────────────────────────┘ │
│                                          │
│ ┌─────────────────────────────────────┐ │
│ │                                      │ │
│ │ [14:23:01] [SYSTEM]                  │ │
│ │ URBAN_CHRONOS v2.0 initialized.      │ │
│ │ All sectors nominal.                 │ │
│ │                                      │ │
│ │ [14:23:02] [INFO]                    │ │
│ │ Census Bureau API connected.         │ │
│ │ Latency: 145ms.                      │ │
│ │                                      │ │
│ │ [14:23:03] [INFO]                    │ │
│ │ Loaded 287 census tracts for         │ │
│ │ New York, NY.                        │ │
│ │                                      │ │
│ │ [14:23:05] [WARN]                    │ │
│ │ Sovereignty index below threshold:   │ │
│ │ 31%. Freedom at risk.                │ │
│ │                                      │ │
│ │ [14:23:06] [INFO]                    │ │
│ │ Prediction engine: composite model   │ │
│ │ selected. Projecting 2024-2035.      │ │
│ │                                      │ │
│ │ [14:23:08] [WARN]                    │ │
│ │ Entropy seed at 5%. Deterministic    │ │
│ │ lock-in probable.                    │ │
│ │                                      │ │
│ │ [14:25:30] [INFO]                    │ │
│ │ Dashboard loaded. 24 sectors nominal.│ │
│ │                                      │ │
│ │ [14:28:15] [SYSTEM]                  │ │
│ │ PANKOW_77C> Optimization is death.   │ │
│ │ Proceed with caution.                │ │
│ │                                      │ │
│ │ > _                                  │ │
│ │                                      │ │
│ └─────────────────────────────────────┘ │
│                                          │
│ ┌─ SYSTEM STATS ──────────────────────┐ │
│ │ CORE: ONLINE | LATENCY: 12ms        │ │
│ │ UPTIME: 00:14:32 | EVENTS: 47       │ │
│ │ ERRORS: 0 | WARNINGS: 3             │ │
│ └──────────────────────────────────────┘ │
│                                          │
└─────────────────────────────────────────┘
```

## Specifiche Widget FlutterFlow

### Log Entry (componente)

```
Componente: LogEntry
Parametri:
  - timestamp: String
  - level: String (INFO, WARN, ERROR, SYSTEM)
  - message: String

Widget:
  Container
    padding: 8px 0
    borderBottom: 1px solid #0d0d0d
    child: Column(crossAxisAlignment: start)
      ├── Row
      │     ├── Text "[${timestamp}]"
      │     │     style: Courier New, 10px, #555555
      │     ├── SizedBox(8)
      │     └── Container
      │           padding: 1px 6px
      │           background: [colore level con alpha 20%]
      │           border: 1px solid [colore level]
      │           child: Text "[${level}]"
      │             style: Courier New, 10px, Bold, [colore level]
      ├── SizedBox(4)
      └── Text(message)
            style: Courier New, 12px, #e0e0e0
            lineHeight: 1.4

Colori per livello:
  INFO:   #00ff41
  WARN:   #ffaa00
  ERROR:  #ff0040
  SYSTEM: #9d00ff (vhs-purple)
```

### Log Container

```
Container:
  background: #0a0a0a
  border: 1px solid #222222
  padding: 12px
  child: Column
    ├── ListView (reverse: true, per auto-scroll al fondo)
    │     stream: Firestore query system_logs orderBy timestamp DESC
    │     itemBuilder: LogEntry
    │
    └── BlinkingCursor
          child: Text "> _"
            style: Courier New, 12px, #00ff41
            animation: opacity 0/1, 500ms loop
```

### Filter Chips

```
Row:
  ├── FilterChip("ALL", activeFilter == null)
  ├── FilterChip("INFO", activeFilter == 'INFO')
  ├── FilterChip("WARN", activeFilter == 'WARN')
  ├── FilterChip("ERROR", activeFilter == 'ERROR')
  └── FilterChip("SYSTEM", activeFilter == 'SYSTEM')

Stile:
  Active: background #00ff4120, border #00ff41, text #00ff41
  Inactive: background transparent, border #333333, text #555555
  Font: Orbitron, 9px, uppercase
```

### Log Actions

```
Pause (⏸): ferma l'auto-scroll, l'utente puo scorrere liberamente
Clear (🗑): conferma dialog, poi cancella logs da Firestore
```

## Logging nel Sistema

In ogni pagina e Custom Action, usa questa utility per loggare:

```dart
// Custom Action: logSystemEvent
Future<void> logSystemEvent({
  required String level,    // 'INFO'|'WARN'|'ERROR'|'SYSTEM'
  required String source,   // 'CORE'|'CENSUS_API'|'PREDICTION'|'ENTROPY'
  required String message,
}) async {
  // Aggiungi a Firestore
  await FirebaseFirestore.instance.collection('system_logs').add({
    'timestamp': FieldValue.serverTimestamp(),
    'level': level,
    'source': source,
    'message': message,
    'metadata': {
      'userId': currentUser?.uid,
    },
  });

  // Aggiungi anche ad AppState.systemLogs per visualizzazione immediata
  // (evita latenza Firestore per UI real-time)
}
```
