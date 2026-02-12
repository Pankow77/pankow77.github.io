# URBAN_CHRONOS v2.0 — Intervention Layer Page

## Scopo
Pannello di controllo per i parametri filosofico-tecnici del sistema:
Entropy Seed, Reality Buffer, e Null Zone Designator.
Cuore concettuale dell'applicazione.

## Layout

```
┌─────────────────────────────────────────┐
│ ← INTERVENTION LAYER                    │
│─────────────────────────────────────────│
│                                          │
│ ┌─ SYSTEM PHILOSOPHY ─────────────────┐ │
│ │                                      │ │
│ │ "The null pointer is not absence —   │ │
│ │  it is an excess of unmappable       │ │
│ │  meaning."                           │ │
│ │                         — MARXIAN    │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ ┌─ ENTROPY SEED (Noise) ──────────────┐ │
│ │                                      │ │
│ │ Injects quantum decay noise into     │ │
│ │ pathfinding algorithms to prevent    │ │
│ │ deterministic lock-in.               │ │
│ │                                      │ │
│ │ CURRENT: 5%                          │ │
│ │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ │
│ │ 0%          ●                  100%  │ │
│ │                                      │ │
│ │ EFFECT ON SYSTEM:                    │ │
│ │ Sovereignty: 31% → ~45% (+14)       │ │
│ │ Efficiency:  89% → ~78% (-11)       │ │
│ │ Prediction confidence: -8%           │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ ┌─ REALITY BUFFER (Delay) ────────────┐ │
│ │                                      │ │
│ │ Temporal gap between prediction      │ │
│ │ and execution. Allows for            │ │
│ │ democratic veto.                     │ │
│ │                                      │ │
│ │ CURRENT: 12 Months                   │ │
│ │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ │
│ │ 0 mo        ●                 60 mo  │ │
│ │                                      │ │
│ │ EFFECT ON SYSTEM:                    │ │
│ │ Sovereignty: 31% → ~38% (+7)        │ │
│ │ Responsiveness: -23%                 │ │
│ │ Democratic index: +35%               │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ ┌─ NULL ZONE DESIGNATOR ──────────────┐ │
│ │                                      │ │
│ │ Areas intentionally excluded from    │ │
│ │ algorithmic tracking. Preserves      │ │
│ │ spaces for organic urban evolution.  │ │
│ │                                      │ │
│ │ STATUS: ○ DISABLED                   │ │
│ │                                      │ │
│ │ Null zones: 0 / 24 sectors          │ │
│ │ Population in null zones: 0          │ │
│ │                                      │ │
│ │ ⚠ Panopticon active. No safe harbor.│ │
│ │                                      │ │
│ │ [DESIGNATE NULL ZONES ON MAP →]      │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ ┌─ IMPACT PREVIEW ────────────────────┐ │
│ │                                      │ │
│ │ BEFORE          →        AFTER       │ │
│ │                                      │ │
│ │ EFF: 89%                 EFF: 78%    │ │
│ │ SOV: 31%        →       SOV: 52%    │ │
│ │ RES: 72%                 RES: 68%    │ │
│ │ PRE: 85%                 PRE: 71%    │ │
│ │                                      │ │
│ │ ── Current  ·· Projected             │ │
│ │                                      │ │
│ │ VERDICT: "Democracy recovering.      │ │
│ │ Freedom buffer adequate."            │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ [ ✓ APPLY INTERVENTION ]                │
│ [ ↺ RESET TO DEFAULTS ]                 │
│                                          │
└─────────────────────────────────────────┘
```

## Specifiche Widget FlutterFlow

### Philosophy Quote Card

```
Container:
  background: #0d1117
  border: 1px solid #222222
  borderLeft: 3px solid #9d00ff  // vhs-purple
  padding: 20px
  child: Column
    ├── Text(quoteText)
    │     style: Courier New, 14px, italic, #e0e0e0
    │     lineHeight: 1.6
    ├── SizedBox(12)
    └── Text("— ${quoteAuthor}")
          style: Orbitron, 11px, #9d00ff
          alignment: right

Quote rotanti da Firestore: app_config.quotes
```

### Entropy Seed Control

```
Container:
  background: #111111
  border: 1px solid #222222
  padding: 16px
  child: Column
    ├── SectionHeader "ENTROPY SEED (Noise)"
    ├── SizedBox(8)
    ├── Text(entropyDescription)
    │     style: Courier New, 11px, #888888
    │     lineHeight: 1.5
    ├── SizedBox(16)
    ├── Row
    │     ├── Text "CURRENT: "
    │     │     style: Orbitron, 12px, #888888
    │     └── Text "${entropySeed.toInt()}%"
    │           style: Orbitron, 16px, Bold, #00ff41
    ├── SizedBox(8)
    ├── Slider
    │     value: AppState.entropySeed
    │     min: 0
    │     max: 100
    │     divisions: 100
    │     activeColor: #00ff41
    │     inactiveColor: #222222
    │     thumbShape: square
    │     onChanged: → aggiorna entropySeed, ricalcola effetti
    ├── Row(mainAxisAlignment: spaceBetween)
    │     ├── Text "0%"  style: Courier New, 10px, #555555
    │     └── Text "100%"  style: Courier New, 10px, #555555
    ├── SizedBox(16)
    ├── Text "EFFECT ON SYSTEM:"
    │     style: Orbitron, 9px, #888888, uppercase
    ├── SizedBox(6)
    ├── EffectRow("Sovereignty", currentSov, projectedSov, diff > 0)
    ├── EffectRow("Efficiency", currentEff, projectedEff, diff > 0)
    └── EffectRow("Prediction confidence", null, confidenceDelta, false)
```

### EffectRow (componente)

```
Componente: EffectRow
Parametri:
  - label: String
  - currentValue: double?
  - projectedValue: double
  - isPositive: bool

Widget:
  Padding(vertical: 2)
    child: Row
      ├── Text(label + ": ")
      │     style: Courier New, 11px, #888888
      ├── if currentValue != null:
      │     Text "${currentValue.toInt()}% → "
      │       style: Courier New, 11px, #888888
      ├── Text "~${projectedValue.toInt()}%"
      │     style: Courier New, 11px, isPositive ? #00ff41 : #ffaa00
      └── Text " (${isPositive ? '+' : ''}${diff})"
            style: Courier New, 11px, isPositive ? #00ff41 : #ffaa00
```

### Reality Buffer Control

```
Stessa struttura di Entropy Seed, ma con:
  - Slider min: 0, max: 60 (mesi)
  - Label: "${value} Months"
  - Effetti calcolati:
    - Sovereignty impact
    - Responsiveness impact
    - Democratic index impact
```

### Null Zone Designator

```
Container:
  background: #111111
  border: 1px solid #222222
  padding: 16px
  child: Column
    ├── SectionHeader "NULL ZONE DESIGNATOR"
    ├── SizedBox(8)
    ├── Text(nullZoneDescription)
    │     style: Courier New, 11px, #888888
    ├── SizedBox(16)
    ├── Row
    │     ├── Text "STATUS: "
    │     │     style: Orbitron, 12px, #888888
    │     ├── Switch
    │     │     value: AppState.nullZoneDesignatorOn
    │     │     activeColor: #00ff41
    │     │     onChanged: → toggle null zones
    │     └── Text(isOn ? "ENABLED" : "DISABLED")
    │           style: Orbitron, 12px, isOn ? #00ff41 : #ff0040
    ├── SizedBox(12)
    ├── Text "Null zones: ${nullZoneCount} / ${totalSectors} sectors"
    │     style: Courier New, 11px, #888888
    ├── Text "Population in null zones: ${nullZonePop}"
    │     style: Courier New, 11px, #888888
    ├── SizedBox(12)
    ├── if !isOn:
    │     Container
    │       border: 1px solid #ff0040
    │       background: #ff004010
    │       padding: 8px 12px
    │       child: Text "⚠ Panopticon active. No safe harbor."
    │         style: Courier New, 11px, #ff0040
    ├── SizedBox(12)
    └── OutlinedButton "DESIGNATE NULL ZONES ON MAP →"
          style: cyberpunk, #00ffff
          onTap: → Navigate to SectorMapPage (null zone mode)
```

### Impact Preview (Before/After)

```
Container:
  background: #111111
  border: 1px solid #00ff41
  padding: 16px
  child: Column
    ├── SectionHeader "IMPACT PREVIEW"
    ├── SizedBox(12)
    ├── Row(mainAxisAlignment: spaceAround)
    │     ├── Column(before)
    │     │     ├── Text "BEFORE"
    │     │     │     style: Orbitron, 10px, #888888
    │     │     ├── MetricSmall("EFF", currentEfficiency)
    │     │     ├── MetricSmall("SOV", currentSovereignty)
    │     │     ├── MetricSmall("RES", currentResilience)
    │     │     └── MetricSmall("PRE", currentPredictability)
    │     │
    │     ├── Column(arrow)
    │     │     ├── SizedBox(20)
    │     │     ├── Text "→" style: 24px, #555555
    │     │
    │     └── Column(after)
    │           ├── Text "AFTER"
    │           │     style: Orbitron, 10px, #00ff41
    │           ├── MetricSmall("EFF", projectedEfficiency)
    │           ├── MetricSmall("SOV", projectedSovereignty)
    │           ├── MetricSmall("RES", projectedResilience)
    │           └── MetricSmall("PRE", projectedPredictability)
    │
    ├── SizedBox(12)
    ├── Divider(color: #222222)
    ├── SizedBox(8)
    ├── Text "VERDICT:"
    │     style: Orbitron, 10px, #888888
    ├── SizedBox(4)
    └── Text(verdictText)
          style: Courier New, 13px, italic, #e0e0e0
```

### Action Buttons

```
Column
  ├── ElevatedButton "✓ APPLY INTERVENTION"
  │     width: double.infinity
  │     background: #00ff4120
  │     border: 2px solid #00ff41
  │     text: Orbitron, 12px, #00ff41
  │     onTap:
  │       1. Salva nuovi parametri in AppState
  │       2. Ricalcola tutte le metriche sistema
  │       3. Aggiorna Firestore
  │       4. Log: "[SYSTEM] Intervention applied. Entropy: {n}%. Buffer: {n}mo."
  │       5. Navigate back o mostra conferma
  │
  ├── SizedBox(8)
  │
  └── TextButton "↺ RESET TO DEFAULTS"
        text: Orbitron, 11px, #888888
        onTap:
          1. entropySeed = 5
          2. realityBuffer = 12
          3. nullZoneDesignator = false
          4. Ricalcola effetti
```

## Logica di Calcolo Effetti (Real-time)

Ogni volta che l'utente muove uno slider, ricalcola immediatamente:

```dart
// Custom Action: calculateInterventionImpact
Map<String, double> calculateInterventionImpact({
  required double entropySeed,
  required int realityBufferMonths,
  required bool nullZonesEnabled,
  required double currentEfficiency,
  required double currentSovereignty,
}) {
  // Entropy aumenta sovranita, diminuisce efficienza
  double sovGain = entropySeed * 0.4;
  double effLoss = entropySeed * 0.15;

  // Reality buffer aumenta sovranita, diminuisce reattivita
  double sovBufferGain = realityBufferMonths * 0.3;
  double responsivenessLoss = realityBufferMonths * 0.5;

  // Null zones aumentano sovranita proporzionalmente
  double nullZoneBonus = nullZonesEnabled ? 10.0 : 0.0;

  return {
    'efficiency': (currentEfficiency - effLoss).clamp(0, 100),
    'sovereignty': (currentSovereignty + sovGain + sovBufferGain + nullZoneBonus).clamp(0, 100),
    'resilience': ...,
    'predictability': (100 - entropySeed * 0.3).clamp(0, 100),
    'democraticIndex': (realityBufferMonths / 60 * 100).clamp(0, 100),
  };
}
```

## Generazione Verdict

```dart
String generateVerdict(Map<String, double> projected) {
  if (projected['sovereignty']! > 60) {
    return '"Democracy thriving. Organic urban evolution enabled."';
  } else if (projected['sovereignty']! > 40) {
    return '"Democracy recovering. Freedom buffer adequate."';
  } else if (projected['sovereignty']! > 20) {
    return '"Democracy fragile. Increase entropy recommended."';
  } else {
    return '"Democracy critical. Algorithmic totalitarianism imminent."';
  }
}
```
