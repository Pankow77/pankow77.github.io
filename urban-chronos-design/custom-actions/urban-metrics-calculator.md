# URBAN_CHRONOS v2.0 — Urban Metrics Calculator (Custom Actions)

## Custom Action: calculateCityMetrics

Calcola le metriche aggregate per l'intera citta (usato nel Dashboard).

### Configurazione FlutterFlow

```
Nome: calculateCityMetrics
Return Type: JSON
Arguments:
  - sectors: JSON (List<dynamic>)  // lista settori con metriche
```

### Codice Dart

```dart
Future<dynamic> calculateCityMetrics(List<dynamic> sectors) async {
  final sectorMaps = sectors.cast<Map<String, dynamic>>();
  if (sectorMaps.isEmpty) return {};

  int totalPop = 0;
  double totalIncome = 0;
  double totalHomeValue = 0;
  double totalUnemployment = 0;
  double totalVacancy = 0;
  int sectorCount = sectorMaps.length;

  for (final s in sectorMaps) {
    final metrics = s['currentMetrics'] as Map<String, dynamic>? ?? s;
    totalPop += (metrics['population'] as num?)?.toInt() ?? 0;
    totalIncome += (metrics['medianIncome'] as num?)?.toDouble() ?? 0;
    totalHomeValue += (metrics['medianHomeValue'] as num?)?.toDouble() ?? 0;
    totalUnemployment += (metrics['unemploymentRate'] as num?)?.toDouble() ?? 0;
    totalVacancy += (metrics['vacancyRate'] as num?)?.toDouble() ?? 0;
  }

  return {
    'totalPopulation': totalPop,
    'avgMedianIncome': totalIncome / sectorCount,
    'avgMedianHomeValue': totalHomeValue / sectorCount,
    'avgUnemploymentRate': totalUnemployment / sectorCount,
    'avgVacancyRate': totalVacancy / sectorCount,
    'sectorCount': sectorCount,
  };
}
```

---

## Custom Action: calculateChangePercents

Calcola le variazioni percentuali tra periodo corrente e storico.

```
Nome: calculateChangePercents
Return Type: JSON
Arguments:
  - currentMetrics: JSON
  - historicalMetrics: JSON (anno di riferimento, es. 2020)
```

```dart
Future<dynamic> calculateChangePercents(
  Map<String, dynamic> current,
  Map<String, dynamic> historical,
) async {
  final changes = <String, dynamic>{};

  final keysToCompare = [
    'population', 'medianIncome', 'medianHomeValue', 'medianRent',
    'unemploymentRate', 'educationBachelorPlus', 'vacancyRate',
    'medianAge', 'populationDensity',
  ];

  for (final key in keysToCompare) {
    final curr = (current[key] as num?)?.toDouble() ?? 0;
    final hist = (historical[key] as num?)?.toDouble() ?? 0;

    if (hist != 0) {
      final change = ((curr - hist) / hist) * 100;
      changes[key] = {
        'current': curr,
        'historical': hist,
        'changePercent': change,
        'changeFormatted': '${change >= 0 ? '+' : ''}${change.toStringAsFixed(1)}%',
        'isPositive': _isChangePositive(key, change),
      };
    } else {
      changes[key] = {
        'current': curr,
        'historical': hist,
        'changePercent': 0,
        'changeFormatted': 'N/A',
        'isPositive': null,
      };
    }
  }

  return changes;
}

// Determina se un cambiamento e "positivo" per il quartiere
bool _isChangePositive(String metric, double change) {
  switch (metric) {
    case 'population':
    case 'medianIncome':
    case 'educationBachelorPlus':
      return change > 0;  // Crescita = positivo
    case 'unemploymentRate':
    case 'vacancyRate':
      return change < 0;  // Diminuzione = positivo
    case 'medianHomeValue':
    case 'medianRent':
      return change > 0 && change < 15;  // Crescita moderata = positivo
    default:
      return change > 0;
  }
}
```

---

## Custom Action: assessRisks

Calcola i fattori di rischio per un settore.

```
Nome: assessRisks
Return Type: JSON
Arguments:
  - currentMetrics: JSON
  - historicalMetrics: JSON
  - cityAverages: JSON
```

```dart
Future<dynamic> assessRisks(
  Map<String, dynamic> current,
  Map<String, dynamic> historical,
  Map<String, dynamic> cityAvg,
) async {
  // GENTRIFICATION RISK
  // Basato su: aumento valore immobili, aumento reddito, aumento istruzione
  final homeGrowth = _pctChange(current['medianHomeValue'], historical['medianHomeValue']);
  final incomeGrowth = _pctChange(current['medianIncome'], historical['medianIncome']);
  final eduGrowth = _pctChange(current['educationBachelorPlus'], historical['educationBachelorPlus']);
  final rentGrowth = _pctChange(current['medianRent'], historical['medianRent']);

  double gentrificationRisk = 0;
  gentrificationRisk += (homeGrowth / 50 * 30).clamp(0, 30);   // max 30 punti
  gentrificationRisk += (incomeGrowth / 30 * 25).clamp(0, 25);  // max 25 punti
  gentrificationRisk += (eduGrowth / 20 * 20).clamp(0, 20);     // max 20 punti
  gentrificationRisk += (rentGrowth / 40 * 25).clamp(0, 25);    // max 25 punti

  // ECONOMIC DECLINE RISK
  final unemployRate = (current['unemploymentRate'] as num?)?.toDouble() ?? 0;
  final vacancyRate = (current['vacancyRate'] as num?)?.toDouble() ?? 0;
  final cityUnemploy = (cityAvg['avgUnemploymentRate'] as num?)?.toDouble() ?? 5;

  double economicDeclineRisk = 0;
  economicDeclineRisk += ((unemployRate / cityUnemploy - 1) * 50).clamp(0, 40);
  economicDeclineRisk += (vacancyRate / 20 * 30).clamp(0, 30);
  if (incomeGrowth < 0) {
    economicDeclineRisk += (-incomeGrowth / 10 * 30).clamp(0, 30);
  }

  // INFRASTRUCTURE STRESS
  // Basato su densita vs media, crescita rapida, eta immobili
  final density = (current['populationDensity'] as num?)?.toDouble() ?? 0;
  final cityDensity = (cityAvg['avgPopulationDensity'] as num?)?.toDouble() ?? 5000;
  final popGrowth = _pctChange(current['population'], historical['population']);

  double infraStress = 0;
  infraStress += ((density / cityDensity - 1) * 40).clamp(0, 40);
  infraStress += (popGrowth / 20 * 30).clamp(0, 30);
  infraStress += ((1 - vacancyRate / 10) * 30).clamp(0, 30); // bassa vacancy = stress

  // FLOOD RISK (placeholder — richiederebbe dati FEMA)
  double floodRisk = 15; // default basso, da aggiornare con dati reali

  return {
    'gentrificationRisk': gentrificationRisk.clamp(0, 100),
    'economicDeclineRisk': economicDeclineRisk.clamp(0, 100),
    'infrastructureStress': infraStress.clamp(0, 100),
    'floodRisk': floodRisk.clamp(0, 100),
    'overallRisk': (
      (gentrificationRisk * 0.35 +
       economicDeclineRisk * 0.30 +
       infraStress * 0.25 +
       floodRisk * 0.10)
    ).clamp(0, 100),
  };
}

double _pctChange(dynamic current, dynamic historical) {
  final curr = (current as num?)?.toDouble() ?? 0;
  final hist = (historical as num?)?.toDouble() ?? 0;
  if (hist == 0) return 0;
  return ((curr - hist) / hist) * 100;
}
```

---

## Custom Action: calculateCityComparison

Confronta metriche settore vs media cittadina.

```
Nome: calculateCityComparison
Return Type: JSON
Arguments:
  - sectorMetrics: JSON
  - cityAverages: JSON
```

```dart
Future<dynamic> calculateCityComparison(
  Map<String, dynamic> sector,
  Map<String, dynamic> cityAvg,
) async {
  final comparisons = <String, dynamic>{};

  final metrics = {
    'population': {'sector': 'population', 'city': 'avgPopulation'},
    'income': {'sector': 'medianIncome', 'city': 'avgMedianIncome'},
    'homeValue': {'sector': 'medianHomeValue', 'city': 'avgMedianHomeValue'},
    'education': {'sector': 'educationBachelorPlus', 'city': 'avgEducation'},
    'unemployment': {'sector': 'unemploymentRate', 'city': 'avgUnemploymentRate'},
    'transit': {'sector': 'transitScore', 'city': 'avgTransitScore'},
  };

  for (final entry in metrics.entries) {
    final sVal = (sector[entry.value['sector']] as num?)?.toDouble() ?? 0;
    final cVal = (cityAvg[entry.value['city']] as num?)?.toDouble() ?? 0;

    double diff = 0;
    double normalized = 50; // 50 = uguale alla media

    if (cVal > 0) {
      diff = ((sVal - cVal) / cVal) * 100;
      normalized = (50 + diff / 2).clamp(0, 100);
    }

    comparisons[entry.key] = {
      'sectorValue': sVal,
      'cityAverage': cVal,
      'diffPercent': diff,
      'diffFormatted': '${diff >= 0 ? '+' : ''}${diff.toStringAsFixed(0)}%',
      'normalizedBar': normalized, // 0-100 per barra visuale
    };
  }

  return comparisons;
}
```

---

## Custom Action: formatNumber

Utility per formattazione numeri nell'interfaccia.

```
Nome: formatNumber
Return Type: String
Arguments:
  - value: double
  - type: String  // 'compact'|'currency'|'percent'|'integer'
```

```dart
Future<String> formatNumber(double value, String type) async {
  switch (type) {
    case 'compact':
      if (value >= 1000000) {
        return '${(value / 1000000).toStringAsFixed(1)}M';
      } else if (value >= 1000) {
        return '${(value / 1000).toStringAsFixed(0)}K';
      }
      return value.toStringAsFixed(0);

    case 'currency':
      if (value >= 1000000) {
        return '\$${(value / 1000000).toStringAsFixed(1)}M';
      } else if (value >= 1000) {
        return '\$${(value / 1000).toStringAsFixed(0)},${(value % 1000).toStringAsFixed(0).padLeft(3, '0')}';
      }
      return '\$${value.toStringAsFixed(0)}';

    case 'percent':
      return '${value.toStringAsFixed(1)}%';

    case 'integer':
      // Con separatore migliaia
      final intVal = value.toInt();
      final str = intVal.toString();
      final result = StringBuffer();
      for (int i = 0; i < str.length; i++) {
        if (i > 0 && (str.length - i) % 3 == 0) {
          result.write(',');
        }
        result.write(str[i]);
      }
      return result.toString();

    default:
      return value.toStringAsFixed(2);
  }
}
```
