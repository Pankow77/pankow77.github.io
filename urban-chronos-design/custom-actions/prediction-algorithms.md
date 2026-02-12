# URBAN_CHRONOS v2.0 — Prediction Algorithms (Custom Actions)

## Panoramica

Tutti gli algoritmi predittivi sono implementati come **Custom Actions**
in FlutterFlow (codice Dart puro, eseguito client-side).

---

## Custom Action 1: runPredictionEngine

L'azione principale che orchestra tutti i modelli predittivi.

### Configurazione in FlutterFlow

```
Nome: runPredictionEngine
Return Type: JSON (dynamic)
Arguments:
  - historicalData: JSON (List<Map>)   // serie storica Census
  - modelType: String                   // 'linear'|'exponential'|'entropy'|'composite'
  - fromYear: int                       // anno di partenza (2024)
  - toYear: int                         // anno target
  - entropySeed: double                 // 0-100
  - realityBufferMonths: int            // 0-60
```

### Codice Dart

```dart
import 'dart:math';

Future<dynamic> runPredictionEngine(
  dynamic historicalData,
  String modelType,
  int fromYear,
  int toYear,
  double entropySeed,
  int realityBufferMonths,
) async {
  final List<Map<String, dynamic>> history =
      (historicalData as List).cast<Map<String, dynamic>>();

  // Metriche da predire
  final metrics = [
    'population', 'medianIncome', 'medianHomeValue',
    'unemploymentRate', 'educationRate', 'populationDensity'
  ];

  final results = <String, List<Map<String, dynamic>>>{};
  final confidences = <String, double>{};

  for (final metric in metrics) {
    // Estrai serie temporale per questa metrica
    final timeSeries = history
        .where((h) => h[metric] != null)
        .map((h) => MapEntry<int, double>(
              h['year'] as int,
              (h[metric] as num).toDouble(),
            ))
        .toList()
      ..sort((a, b) => a.key.compareTo(b.key));

    if (timeSeries.length < 2) continue;

    List<Map<String, dynamic>> predictions;
    double confidence;

    switch (modelType) {
      case 'linear':
        final result = _linearPrediction(timeSeries, fromYear, toYear);
        predictions = result['predictions'];
        confidence = result['confidence'];
        break;
      case 'exponential':
        final result = _exponentialPrediction(timeSeries, fromYear, toYear);
        predictions = result['predictions'];
        confidence = result['confidence'];
        break;
      case 'entropy':
        final result = _entropyPrediction(
            timeSeries, fromYear, toYear, entropySeed);
        predictions = result['predictions'];
        confidence = result['confidence'];
        break;
      case 'composite':
      default:
        final result = _compositePrediction(
            timeSeries, fromYear, toYear, entropySeed);
        predictions = result['predictions'];
        confidence = result['confidence'];
        break;
    }

    // Applica Reality Buffer: ritarda le predizioni
    if (realityBufferMonths > 0) {
      final delayYears = realityBufferMonths / 12.0;
      predictions = predictions.map((p) {
        return {
          ...p,
          'effectiveYear': (p['year'] as int) + delayYears.ceil(),
        };
      }).toList();
    }

    results[metric] = predictions;
    confidences[metric] = confidence;
  }

  // Calcola metriche di sistema proiettate
  final systemMetrics = _calculateSystemMetrics(
    results, confidences, entropySeed, realityBufferMonths,
  );

  // Genera alerts
  final alerts = _generateAlerts(results, systemMetrics, fromYear, toYear);

  return {
    'predictions': results,
    'confidences': confidences,
    'systemMetrics': systemMetrics,
    'alerts': alerts,
    'modelType': modelType,
    'fromYear': fromYear,
    'toYear': toYear,
  };
}
```

---

## Modello 1: Linear Regression

Estrapolazione lineare basata su regressione dei minimi quadrati.

```dart
Map<String, dynamic> _linearPrediction(
  List<MapEntry<int, double>> timeSeries,
  int fromYear,
  int toYear,
) {
  // Calcola regressione lineare: y = mx + b
  final n = timeSeries.length;
  double sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

  for (final point in timeSeries) {
    final x = point.key.toDouble();
    final y = point.value;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  }

  final m = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  final b = (sumY - m * sumX) / n;

  // Calcola R² per confidenza
  final meanY = sumY / n;
  double ssRes = 0, ssTot = 0;
  for (final point in timeSeries) {
    final predicted = m * point.key + b;
    ssRes += pow(point.value - predicted, 2);
    ssTot += pow(point.value - meanY, 2);
  }
  final rSquared = ssTot > 0 ? 1 - (ssRes / ssTot) : 0.0;

  // Genera predizioni
  final predictions = <Map<String, dynamic>>[];
  for (int year = fromYear; year <= toYear; year++) {
    final predicted = m * year + b;
    // La confidenza diminuisce con la distanza dal presente
    final yearDistance = year - fromYear;
    final yearConfidence = rSquared * pow(0.97, yearDistance);

    predictions.add({
      'year': year,
      'value': predicted,
      'confidence': yearConfidence.clamp(0.0, 1.0),
      'upperBound': predicted * (1 + (1 - yearConfidence) * 0.3),
      'lowerBound': predicted * (1 - (1 - yearConfidence) * 0.3),
    });
  }

  return {
    'predictions': predictions,
    'confidence': rSquared.clamp(0.0, 1.0),
    'slope': m,
    'intercept': b,
  };
}
```

---

## Modello 2: Exponential Growth

Per metriche che tendono a crescere esponenzialmente (popolazione, valori immobiliari).

```dart
Map<String, dynamic> _exponentialPrediction(
  List<MapEntry<int, double>> timeSeries,
  int fromYear,
  int toYear,
) {
  // Trasforma in log-space per regressione lineare su dati esponenziali
  // ln(y) = ln(a) + b*x → y = a * e^(b*x)
  final logSeries = timeSeries
      .where((p) => p.value > 0)
      .map((p) => MapEntry(p.key, log(p.value)))
      .toList();

  if (logSeries.length < 2) {
    return _linearPrediction(timeSeries, fromYear, toYear);
  }

  // Regressione lineare in log-space
  final n = logSeries.length;
  double sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

  for (final point in logSeries) {
    final x = point.key.toDouble();
    final y = point.value;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  }

  final bCoeff = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  final lnA = (sumY - bCoeff * sumX) / n;
  final a = exp(lnA);

  // R² in log-space
  final meanLogY = sumY / n;
  double ssRes = 0, ssTot = 0;
  for (final point in logSeries) {
    final predicted = lnA + bCoeff * point.key;
    ssRes += pow(point.value - predicted, 2);
    ssTot += pow(point.value - meanLogY, 2);
  }
  final rSquared = ssTot > 0 ? 1 - (ssRes / ssTot) : 0.0;

  // Genera predizioni
  final predictions = <Map<String, dynamic>>[];
  for (int year = fromYear; year <= toYear; year++) {
    final predicted = a * exp(bCoeff * year);
    final yearDistance = year - fromYear;
    // Confidenza decresce piu rapidamente per esponenziale
    final yearConfidence = rSquared * pow(0.94, yearDistance);

    predictions.add({
      'year': year,
      'value': predicted,
      'confidence': yearConfidence.clamp(0.0, 1.0),
      'upperBound': predicted * (1 + (1 - yearConfidence) * 0.5),
      'lowerBound': predicted * (1 - (1 - yearConfidence) * 0.5),
    });
  }

  return {
    'predictions': predictions,
    'confidence': (rSquared * 0.9).clamp(0.0, 1.0), // penalita esponenziale
    'growthRate': bCoeff,
  };
}
```

---

## Modello 3: Entropy Model

Predizione con iniezione di rumore — il modello filosofico che
rappresenta l'imprevedibilita umana.

```dart
Map<String, dynamic> _entropyPrediction(
  List<MapEntry<int, double>> timeSeries,
  int fromYear,
  int toYear,
  double entropySeed,
) {
  // Parti dalla predizione lineare come base
  final linearResult = _linearPrediction(timeSeries, fromYear, toYear);
  final linearPredictions = linearResult['predictions'] as List<Map<String, dynamic>>;

  final random = Random(DateTime.now().millisecondsSinceEpoch);
  final noiseLevel = entropySeed / 100.0; // normalizza 0-1

  final predictions = linearPredictions.map((p) {
    final year = p['year'] as int;
    final baseValue = p['value'] as double;
    final yearDistance = year - fromYear;

    // Genera rumore gaussiano (Box-Muller transform)
    final u1 = random.nextDouble();
    final u2 = random.nextDouble();
    final gaussianNoise = sqrt(-2 * log(u1)) * cos(2 * pi * u2);

    // Il rumore aumenta con la distanza temporale e con l'entropySeed
    final noiseAmplitude = baseValue * noiseLevel * (yearDistance / 10.0);
    final noise = gaussianNoise * noiseAmplitude;

    final noisyValue = baseValue + noise;

    // La confidenza diminuisce con entropy
    final baseConfidence = p['confidence'] as double;
    final entropyPenalty = noiseLevel * 0.5;
    final confidence = (baseConfidence - entropyPenalty).clamp(0.0, 1.0);

    return {
      'year': year,
      'value': noisyValue,
      'confidence': confidence,
      'upperBound': noisyValue + noiseAmplitude.abs() * 2,
      'lowerBound': noisyValue - noiseAmplitude.abs() * 2,
      'noise': noise,
    };
  }).toList();

  return {
    'predictions': predictions,
    'confidence': (linearResult['confidence'] as double) * (1 - noiseLevel * 0.4),
    'noiseLevel': noiseLevel,
  };
}
```

---

## Modello 4: Composite (Default)

Media pesata dei tre modelli, con pesi basati sulla confidenza di ciascuno.

```dart
Map<String, dynamic> _compositePrediction(
  List<MapEntry<int, double>> timeSeries,
  int fromYear,
  int toYear,
  double entropySeed,
) {
  final linear = _linearPrediction(timeSeries, fromYear, toYear);
  final exponential = _exponentialPrediction(timeSeries, fromYear, toYear);
  final entropy = _entropyPrediction(timeSeries, fromYear, toYear, entropySeed);

  final linearConf = linear['confidence'] as double;
  final expConf = exponential['confidence'] as double;
  final entropyConf = entropy['confidence'] as double;

  // Pesi normalizzati basati sulla confidenza
  final totalConf = linearConf + expConf + entropyConf;
  final wLinear = totalConf > 0 ? linearConf / totalConf : 1 / 3;
  final wExp = totalConf > 0 ? expConf / totalConf : 1 / 3;
  final wEntropy = totalConf > 0 ? entropyConf / totalConf : 1 / 3;

  final linearPreds = linear['predictions'] as List<Map<String, dynamic>>;
  final expPreds = exponential['predictions'] as List<Map<String, dynamic>>;
  final entropyPreds = entropy['predictions'] as List<Map<String, dynamic>>;

  final predictions = <Map<String, dynamic>>[];

  for (int i = 0; i < linearPreds.length; i++) {
    final lVal = linearPreds[i]['value'] as double;
    final eVal = expPreds[i]['value'] as double;
    final nVal = entropyPreds[i]['value'] as double;

    final compositeValue = lVal * wLinear + eVal * wExp + nVal * wEntropy;

    final lConf = linearPreds[i]['confidence'] as double;
    final eConf = expPreds[i]['confidence'] as double;
    final nConf = entropyPreds[i]['confidence'] as double;
    final compositeConf = lConf * wLinear + eConf * wExp + nConf * wEntropy;

    // Upper/Lower bounds: envelope di tutti i modelli
    final allUpper = [
      linearPreds[i]['upperBound'] as double,
      expPreds[i]['upperBound'] as double,
      entropyPreds[i]['upperBound'] as double,
    ];
    final allLower = [
      linearPreds[i]['lowerBound'] as double,
      expPreds[i]['lowerBound'] as double,
      entropyPreds[i]['lowerBound'] as double,
    ];

    predictions.add({
      'year': linearPreds[i]['year'],
      'value': compositeValue,
      'confidence': compositeConf,
      'upperBound': allUpper.reduce(max),
      'lowerBound': allLower.reduce(min),
      'linearValue': lVal,
      'exponentialValue': eVal,
      'entropyValue': nVal,
    });
  }

  return {
    'predictions': predictions,
    'confidence': (linearConf * wLinear + expConf * wExp + entropyConf * wEntropy),
    'weights': {'linear': wLinear, 'exponential': wExp, 'entropy': wEntropy},
  };
}
```

---

## Calcolo System Metrics

```dart
Map<String, double> _calculateSystemMetrics(
  Map<String, List<Map<String, dynamic>>> predictions,
  Map<String, double> confidences,
  double entropySeed,
  int realityBufferMonths,
) {
  // EFFICIENCY: quanto bene il sistema predice (media confidenze)
  final avgConfidence = confidences.values.isEmpty
      ? 0.0
      : confidences.values.reduce((a, b) => a + b) / confidences.values.length;
  final efficiency = (avgConfidence * 100).clamp(0.0, 100.0);

  // SOVEREIGNTY: inversamente proporzionale all'efficienza + bonus entropy
  final entropyBonus = entropySeed * 0.4;
  final bufferBonus = realityBufferMonths * 0.3;
  final sovereignty = (100 - efficiency + entropyBonus + bufferBonus).clamp(0.0, 100.0);

  // RESILIENCE: basata sulla varianza delle predizioni (meno varianza = piu resiliente)
  double totalVariance = 0;
  int count = 0;
  for (final metricPreds in predictions.values) {
    for (final p in metricPreds) {
      final upper = p['upperBound'] as double;
      final lower = p['lowerBound'] as double;
      final value = p['value'] as double;
      if (value != 0) {
        totalVariance += (upper - lower) / value;
        count++;
      }
    }
  }
  final avgVariance = count > 0 ? totalVariance / count : 0.5;
  final resilience = ((1 - avgVariance.clamp(0.0, 1.0)) * 100).clamp(0.0, 100.0);

  // PREDICTABILITY: basata sulla linearita dei trend
  final predictability = (efficiency * 0.7 + (100 - entropySeed) * 0.3).clamp(0.0, 100.0);

  return {
    'efficiency': efficiency,
    'sovereignty': sovereignty,
    'resilience': resilience,
    'predictability': predictability,
  };
}
```

---

## Generazione Alerts

```dart
List<Map<String, dynamic>> _generateAlerts(
  Map<String, List<Map<String, dynamic>>> predictions,
  Map<String, double> systemMetrics,
  int fromYear,
  int toYear,
) {
  final alerts = <Map<String, dynamic>>[];

  // Check sovereignty
  if (systemMetrics['sovereignty']! < 20) {
    alerts.add({
      'year': fromYear + 5,
      'type': 'freedom_risk',
      'severity': 'critical',
      'title': 'Sovereignty critical',
      'message': 'Algorithmic lock-in. "Freedom is a null pointer."',
    });
  } else if (systemMetrics['sovereignty']! < 40) {
    alerts.add({
      'year': fromYear + 3,
      'type': 'freedom_risk',
      'severity': 'warning',
      'title': 'Sovereignty declining',
      'message': 'System efficiency threatens democratic agency.',
    });
  }

  // Check gentrification (home value growth > 25%)
  final homeValues = predictions['medianHomeValue'];
  if (homeValues != null && homeValues.length >= 2) {
    final firstValue = homeValues.first['value'] as double;
    for (final p in homeValues) {
      final growth = firstValue > 0
          ? ((p['value'] as double) - firstValue) / firstValue
          : 0.0;
      if (growth > 0.25) {
        alerts.add({
          'year': p['year'],
          'type': 'gentrification',
          'severity': 'warning',
          'title': 'Gentrification threshold crossed',
          'message': 'Home values +${(growth * 100).toInt()}% from baseline.',
        });
        break;
      }
    }
  }

  // Check population peak
  final popPreds = predictions['population'];
  if (popPreds != null) {
    double maxPop = 0;
    int maxYear = fromYear;
    for (final p in popPreds) {
      if ((p['value'] as double) > maxPop) {
        maxPop = p['value'] as double;
        maxYear = p['year'] as int;
      }
    }
    // Se il picco non e l'ultimo anno, c'e un declino
    if (maxYear < toYear - 2) {
      alerts.add({
        'year': maxYear,
        'type': 'population_peak',
        'severity': 'warning',
        'title': 'Population peak projected',
        'message': 'Decline expected after $maxYear.',
      });
    }
  }

  // Sort by year
  alerts.sort((a, b) => (a['year'] as int).compareTo(b['year'] as int));

  return alerts;
}
```
