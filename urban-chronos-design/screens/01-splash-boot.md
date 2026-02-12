# URBAN_CHRONOS v2.0 — Splash / Boot Sequence Page

## Scopo
Schermata di avvio con effetto terminale/boot che carica i dati iniziali
e crea l'atmosfera cyberpunk dell'applicazione.

## Layout

```
┌─────────────────────────────────────────┐
│                                          │
│                                          │
│                                          │
│                                          │
│       URBAN_CHRONOS v2.0                 │
│       ─────────────────────              │
│                                          │
│       > Initializing core systems...     │
│       > Connecting Census Bureau API... ✓│
│       > Loading sector database...    ✓  │
│       > Calibrating prediction engine... │
│       > Entropy seed: 5%                 │
│       > Reality buffer: 12 months        │
│       > System ready.                    │
│       > _                                │
│                                          │
│       ████████████████████░░░░ 78%       │
│                                          │
│                                          │
│                                          │
│       HYBRID SYNDICATE // 2025           │
│                                          │
└─────────────────────────────────────────┘
```

## Specifiche FlutterFlow

### Struttura Widget

```
Scaffold
  backgroundColor: #0a0a0a
  body: SafeArea
    child: Column(mainAxisAlignment: center)
      │
      ├── Text "URBAN_CHRONOS v2.0"
      │     style: Orbitron, 28px, Bold, #00ff41
      │     letterSpacing: 4px
      │
      ├── SizedBox(height: 8)
      │
      ├── Container(width: 200, height: 1, color: #00ff41)  // linea
      │
      ├── SizedBox(height: 40)
      │
      ├── Container(padding: 24, width: 340)
      │     child: Column(crossAxisStart)
      │       │
      │       ├── TerminalLine "> Initializing core systems..."
      │       ├── TerminalLine "> Connecting Census Bureau API... ✓"
      │       ├── TerminalLine "> Loading sector database...    ✓"
      │       ├── TerminalLine "> Calibrating prediction engine..."
      │       ├── TerminalLine "> Entropy seed: 5%"
      │       ├── TerminalLine "> Reality buffer: 12 months"
      │       ├── TerminalLine "> System ready."
      │       └── BlinkingCursor "> _"
      │
      ├── SizedBox(height: 32)
      │
      ├── ProgressBar
      │     width: 280
      │     height: 4
      │     backgroundColor: #222222
      │     progressColor: #00ff41
      │     progress: animatedValue (0.0 → 1.0)
      │
      ├── SizedBox(height: 8)
      │
      ├── Text "${progressPercent}%"
      │     style: Courier New, 12px, #888888
      │
      ├── Spacer()
      │
      └── Text "HYBRID SYNDICATE // 2025"
            style: Orbitron, 10px, #555555
            letterSpacing: 3px
```

### TerminalLine Widget (componente riutilizzabile)

```
Componente: TerminalLine
Parametri:
  - text: String
  - delay: int (ms prima di apparire)
  - showCheckmark: bool

Widget:
  AnimatedOpacity (da 0 a 1, durata 200ms, delay variabile)
    child: Row
      ├── Text(text)
      │     style: Courier New, 13px, #00ff41
      │     letterSpacing: 0.5px
      └── if showCheckmark:
            Text " ✓"
              style: Courier New, 13px, #00ff41
```

### Animazione Boot Sequence

```
Timeline:
  0ms     → Titolo appare (fade in)
  300ms   → Linea separatore appare
  800ms   → Riga 1: "Initializing core systems..."
  1200ms  → Riga 2: "Connecting Census Bureau API..." + ✓
  1600ms  → Riga 3: "Loading sector database..." + ✓
  2000ms  → Riga 4: "Calibrating prediction engine..."
  2400ms  → Riga 5: "Entropy seed: 5%"
  2600ms  → Riga 6: "Reality buffer: 12 months"
  3200ms  → Riga 7: "System ready."
  3500ms  → Progress bar inizia animazione
  4500ms  → Progress bar completa (100%)
  5000ms  → Navigazione automatica a DashboardPage
```

### Implementazione FlutterFlow

1. **Page State Variables:**
   - `bootStep` (int, default 0) — step corrente del boot
   - `progressValue` (double, default 0.0) — valore progress bar

2. **On Page Load Action:**
   ```
   Action Flow:
   1. Wait 800ms
   2. Update bootStep = 1
   3. Wait 400ms
   4. Update bootStep = 2
   5. Wait 400ms
   6. Update bootStep = 3
   ... (continua per ogni step)
   7. Animate progressValue da 0.0 a 1.0 (1000ms)
   8. Wait 500ms
   9. Navigate to DashboardPage (fade transition, 500ms)
   ```

3. **Visibility Conditions:**
   - Riga 1: visibile se `bootStep >= 1`
   - Riga 2: visibile se `bootStep >= 2`
   - ... etc.

4. **Progress Bar:**
   - Usa un Container con width animata
   - Oppure LinearProgressIndicator con valore `progressValue`

### Logica Reale (opzionale)

Durante il boot, puoi effettivamente:
1. Verificare autenticazione Firebase
2. Caricare App Config da Firestore
3. Pre-fetch dati della citta predefinita
4. Verificare connettivita API

Se una verifica fallisce, mostra il messaggio con `[FAIL]` in rosso
e offri un pulsante "RETRY" o procedi con dati cached.
