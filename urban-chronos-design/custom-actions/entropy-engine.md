# URBAN_CHRONOS v2.0 — Entropy Engine (Custom Actions)

## Panoramica Filosofica

L'Entropy Engine e il cuore concettuale di URBAN_CHRONOS.
Rappresenta la tensione fondamentale tra:

- **Efficienza algoritmica** (predizione, ottimizzazione, controllo)
- **Sovranita umana** (liberta, imprevedibilita, evoluzione organica)

L'engine "inietta rumore" nelle predizioni per prevenire quello
che il sistema chiama "deterministic lock-in" — il momento in cui
un algoritmo diventa cosi efficiente da eliminare ogni spazio
per la scelta umana.

---

## Custom Action: calculateSovereignty

L'algoritmo centrale che calcola l'indice di sovranita.

### Configurazione FlutterFlow

```
Nome: calculateSovereignty
Return Type: double
Arguments:
  - efficiency: double           // 0-100
  - entropySeed: double          // 0-100
  - realityBufferMonths: int     // 0-60
  - nullZoneRatio: double        // 0-1 (% settori in null zone)
```

### Codice Dart

```dart
import 'dart:math';

Future<double> calculateSovereignty(
  double efficiency,
  double entropySeed,
  int realityBufferMonths,
  double nullZoneRatio,
) async {
  // Componente base: inversamente proporzionale all'efficienza
  // Un sistema al 100% efficiente ha 0% sovranita di base
  final baseScore = 100 - efficiency;

  // Bonus entropy: il rumore apre spazi di liberta
  // Formula logaritmica: grandi guadagni iniziali, rendimenti decrescenti
  final entropyBonus = entropySeed > 0
      ? 20 * log(1 + entropySeed / 10) / log(11)  // max ~20 punti
      : 0.0;

  // Bonus reality buffer: il ritardo permette il veto democratico
  // Lineare fino a 24 mesi, poi rendimenti decrescenti
  final bufferBonus = realityBufferMonths <= 24
      ? realityBufferMonths * 0.5  // max 12 punti
      : 12 + (realityBufferMonths - 24) * 0.2; // extra punti lenti

  // Bonus null zones: aree libere dal tracking
  // Forte impatto: ogni 10% di territorio in null zone = +5 punti
  final nullZoneBonus = nullZoneRatio * 50; // max 50 punti se 100%

  // Penalita iper-efficienza: se efficienza > 90%, penalita aggiuntiva
  final hyperEfficiencyPenalty = efficiency > 90
      ? (efficiency - 90) * 2  // -2 punti per ogni % sopra 90
      : 0.0;

  final sovereignty = (
    baseScore +
    entropyBonus +
    bufferBonus +
    nullZoneBonus -
    hyperEfficiencyPenalty
  ).clamp(0.0, 100.0);

  return sovereignty;
}
```

---

## Custom Action: checkFreedomRisk

Determina il livello di allarme del sistema basato sulla sovranita.

```
Nome: checkFreedomRisk
Return Type: JSON
Arguments:
  - sovereignty: double
  - efficiency: double
  - predictability: double
```

```dart
Future<dynamic> checkFreedomRisk(
  double sovereignty,
  double efficiency,
  double predictability,
) async {
  // Determina livello allarme
  String alertLevel;
  String alertTitle;
  String alertMessage;
  String verdict;

  if (sovereignty >= 60) {
    alertLevel = 'nominal';
    alertTitle = 'ORGANIC URBANISM';
    alertMessage = 'System balanced. Human agency preserved.';
    verdict = 'Democracy thriving. The city breathes freely.';
  } else if (sovereignty >= 40) {
    alertLevel = 'nominal';
    alertTitle = 'GUIDED URBANISM';
    alertMessage = 'Moderate algorithmic influence. Monitor recommended.';
    verdict = 'Democracy functional. Algorithmic guidance within bounds.';
  } else if (sovereignty >= 25) {
    alertLevel = 'warning';
    alertTitle = 'LOSSY URBANISM';
    alertMessage = 'System too efficient. Freedom at risk.';
    verdict = 'Democracy fragile. Increase entropy recommended.';
  } else if (sovereignty >= 10) {
    alertLevel = 'critical';
    alertTitle = 'DETERMINISTIC LOCK-IN';
    alertMessage = 'Algorithmic totalitarianism imminent. Immediate intervention required.';
    verdict = 'Democracy critical. "The optimized city is a dead city."';
  } else {
    alertLevel = 'critical';
    alertTitle = 'PANOPTICON STATE';
    alertMessage = 'No safe harbor. All urban decisions algorithmically determined.';
    verdict = '"Freedom is a null pointer — it points to nothing the system can map."';
  }

  // Dettagli aggiuntivi
  final details = <String, dynamic>{};

  if (efficiency > 90) {
    details['hyperEfficiency'] = true;
    details['message'] = 'Efficiency exceeds 90%. Organic variation suppressed.';
  }

  if (predictability > 90 && sovereignty < 30) {
    details['deterministicRisk'] = true;
    details['message'] = 'High predictability + low sovereignty = lock-in trajectory.';
  }

  // Raccomandazioni
  final recommendations = <String>[];

  if (sovereignty < 40) {
    final suggestedEntropy = (40 - sovereignty) * 1.5;
    recommendations.add(
      'Increase entropy seed to ${suggestedEntropy.toInt()}%'
    );
  }
  if (sovereignty < 30) {
    recommendations.add('Set reality buffer to at least 18 months');
  }
  if (sovereignty < 20) {
    recommendations.add('Designate at least 15% of sectors as Null Zones');
    recommendations.add('CRITICAL: Consider system override');
  }

  return {
    'alertLevel': alertLevel,      // 'nominal'|'warning'|'critical'
    'alertTitle': alertTitle,
    'alertMessage': alertMessage,
    'verdict': verdict,
    'sovereignty': sovereignty,
    'details': details,
    'recommendations': recommendations,
  };
}
```

---

## Custom Action: generateEntropyNoise

Genera rumore per le visualizzazioni e le predizioni.

```
Nome: generateEntropyNoise
Return Type: JSON (List<double>)
Arguments:
  - dimensions: int        // quanti valori generare
  - seed: double           // entropy seed (0-100)
  - distribution: String   // 'gaussian'|'uniform'|'perlin'
```

```dart
import 'dart:math';

Future<List<double>> generateEntropyNoise(
  int dimensions,
  double seed,
  String distribution,
) async {
  final normalizedSeed = seed / 100.0; // 0-1
  final random = Random(DateTime.now().millisecondsSinceEpoch);
  final noise = <double>[];

  for (int i = 0; i < dimensions; i++) {
    double value;

    switch (distribution) {
      case 'gaussian':
        // Box-Muller transform per distribuzione normale
        final u1 = random.nextDouble();
        final u2 = random.nextDouble();
        value = sqrt(-2 * log(u1)) * cos(2 * pi * u2);
        value *= normalizedSeed; // scala per entropy level
        break;

      case 'uniform':
        value = (random.nextDouble() * 2 - 1) * normalizedSeed;
        break;

      case 'perlin':
        // Simplified Perlin-like noise (smooth noise)
        final freq = 0.1;
        final amp = normalizedSeed;
        value = sin(i * freq) * amp +
                sin(i * freq * 2.3) * amp * 0.5 +
                sin(i * freq * 4.7) * amp * 0.25;
        // Aggiungi componente random
        value += (random.nextDouble() * 2 - 1) * normalizedSeed * 0.3;
        break;

      default:
        value = (random.nextDouble() * 2 - 1) * normalizedSeed;
    }

    noise.add(value);
  }

  return noise;
}
```

---

## Custom Action: generateSovereigntyMessage

Genera i messaggi in stile URBAN_CHRONOS per il system log.

```
Nome: generateSovereigntyMessage
Return Type: String
Arguments:
  - sovereignty: double
  - context: String  // 'dashboard'|'prediction'|'intervention'
```

```dart
import 'dart:math';

Future<String> generateSovereigntyMessage(
  double sovereignty,
  String context,
) async {
  final random = Random();

  // Pool di messaggi per livello
  final criticalMessages = [
    'Optimization is death. Proceed with caution.',
    'The map is not the territory. The algorithm is not the city.',
    'Freedom is a null pointer — it points to what the system cannot see.',
    'Every efficient system is a cage with invisible bars.',
    'The perfectly predicted city has no future — only iterations.',
  ];

  final warningMessages = [
    'System too efficient. Remember: noise is information.',
    'The divergent path is not an error — it is evolution.',
    'Deterministic pathways dominate. Entropy recommended.',
    'A city without surprise is a city without life.',
    'The algorithm sees patterns. Humans see meaning.',
  ];

  final nominalMessages = [
    'System balanced. The city breathes.',
    'Entropy levels adequate. Organic evolution possible.',
    'Sovereignty preserved. Human agency intact.',
    'The best prediction is one that leaves room for the unpredicted.',
  ];

  List<String> pool;
  if (sovereignty < 25) {
    pool = criticalMessages;
  } else if (sovereignty < 50) {
    pool = warningMessages;
  } else {
    pool = nominalMessages;
  }

  final message = pool[random.nextInt(pool.length)];

  switch (context) {
    case 'dashboard':
      return 'PANKOW_77C> $message';
    case 'prediction':
      return '[ENTROPY_ENGINE] $message';
    case 'intervention':
      return '[SOVEREIGNTY_MONITOR] $message';
    default:
      return message;
  }
}
```

---

## Custom Action: calculateInterventionImpact

Calcolo real-time dell'impatto degli slider Intervention Layer.

```
Nome: calculateInterventionImpact
Return Type: JSON
Arguments:
  - currentEfficiency: double
  - currentSovereignty: double
  - currentResilience: double
  - currentPredictability: double
  - newEntropySeed: double
  - newRealityBuffer: int
  - newNullZonesEnabled: bool
  - totalSectors: int
  - nullZoneSectors: int
```

```dart
Future<dynamic> calculateInterventionImpact(
  double currentEfficiency,
  double currentSovereignty,
  double currentResilience,
  double currentPredictability,
  double newEntropySeed,
  int newRealityBuffer,
  bool newNullZonesEnabled,
  int totalSectors,
  int nullZoneSectors,
) async {
  final nullZoneRatio = totalSectors > 0 && newNullZonesEnabled
      ? nullZoneSectors / totalSectors
      : 0.0;

  // Calcola nuova sovranita
  final newSovereignty = await calculateSovereignty(
    currentEfficiency, newEntropySeed, newRealityBuffer, nullZoneRatio,
  );

  // Efficienza diminuisce con entropy
  final newEfficiency = (currentEfficiency - newEntropySeed * 0.12)
      .clamp(0.0, 100.0);

  // Resilienza: leggermente diminuisce con troppo entropy
  final newResilience = (currentResilience - newEntropySeed * 0.05 + newRealityBuffer * 0.1)
      .clamp(0.0, 100.0);

  // Predittibilita diminuisce significativamente con entropy
  final newPredictability = (100 - newEntropySeed * 0.3 - newRealityBuffer * 0.2)
      .clamp(0.0, 100.0);

  // Check freedom risk con nuovi valori
  final freedomRisk = await checkFreedomRisk(
    newSovereignty, newEfficiency, newPredictability,
  );

  return {
    'before': {
      'efficiency': currentEfficiency,
      'sovereignty': currentSovereignty,
      'resilience': currentResilience,
      'predictability': currentPredictability,
    },
    'after': {
      'efficiency': newEfficiency,
      'sovereignty': newSovereignty,
      'resilience': newResilience,
      'predictability': newPredictability,
    },
    'deltas': {
      'efficiency': newEfficiency - currentEfficiency,
      'sovereignty': newSovereignty - currentSovereignty,
      'resilience': newResilience - currentResilience,
      'predictability': newPredictability - currentPredictability,
    },
    'freedomRisk': freedomRisk,
  };
}
```
