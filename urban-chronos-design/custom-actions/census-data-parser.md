# URBAN_CHRONOS v2.0 — Census Data Parser (Custom Actions)

## Custom Action: parseCensusResponse

Trasforma la risposta grezza del Census Bureau in oggetti strutturati.

### Configurazione FlutterFlow

```
Nome: parseCensusResponse
Return Type: JSON (List<dynamic>)
Arguments:
  - apiResponse: JSON (dynamic)
```

### Codice Dart

```dart
Future<List<dynamic>> parseCensusResponse(dynamic apiResponse) async {
  final List<dynamic> data = apiResponse as List<dynamic>;
  if (data.isEmpty) return [];

  // Prima riga = headers
  final headers = (data[0] as List<dynamic>).map((h) => h.toString()).toList();
  final rows = data.sublist(1);

  return rows.map((row) {
    final values = row as List<dynamic>;
    final map = <String, dynamic>{};

    for (int i = 0; i < headers.length && i < values.length; i++) {
      final key = headers[i];
      final val = values[i];

      // Campi geografici restano stringa
      if (['NAME', 'state', 'county', 'tract', 'place'].contains(key)) {
        map[key] = val?.toString() ?? '';
      } else {
        // Variabili numeriche Census
        final numVal = double.tryParse(val?.toString() ?? '');
        map[key] = numVal ?? 0.0;
        // Census usa valori negativi per "dato non disponibile"
        if (numVal != null && numVal < 0) {
          map[key] = null; // segna come non disponibile
        }
      }
    }

    // Costruisci ID univoco tract
    final tractId = '${map['state']}${map['county']}${map['tract'] ?? ''}';

    return {
      'tractId': tractId,
      'name': map['NAME'] ?? 'Unknown',
      'state': map['state'] ?? '',
      'county': map['county'] ?? '',
      'tract': map['tract'] ?? '',

      // Demografia
      'population': _toInt(map['B01001_001E']),
      'medianAge': _toDouble(map['B01002_001E']),
      'malePop': _toInt(map['B01001_002E']),
      'femalePop': _toInt(map['B01001_026E']),

      // Economia
      'medianIncome': _toDouble(map['B19013_001E']),
      'belowPoverty': _toInt(map['B17001_002E']),

      // Abitazioni
      'medianHomeValue': _toDouble(map['B25077_001E']),
      'medianRent': _toDouble(map['B25064_001E']),
      'totalHousingUnits': _toInt(map['B25001_001E']),
      'occupiedUnits': _toInt(map['B25003_001E']),
      'ownerOccupied': _toInt(map['B25003_002E']),
      'renterOccupied': _toInt(map['B25003_003E']),
      'vacantUnits': _toInt(map['B25002_003E']),

      // Istruzione
      'pop25Plus': _toInt(map['B15003_001E']),
      'highSchool': _toInt(map['B15003_017E']),
      'bachelorDegree': _toInt(map['B15003_022E']),
      'masterDegree': _toInt(map['B15003_023E']),
      'doctorate': _toInt(map['B15003_025E']),

      // Lavoro
      'pop16Plus': _toInt(map['B23025_001E']),
      'inLaborForce': _toInt(map['B23025_002E']),
      'unemployed': _toInt(map['B23025_005E']),

      // Trasporti
      'commutePublicTransit': _toInt(map['B08301_010E']),
      'commuteWalking': _toInt(map['B08301_019E']),
      'commuteWorkFromHome': _toInt(map['B08301_021E']),
    };
  }).toList();
}

int _toInt(dynamic val) {
  if (val == null) return 0;
  if (val is int) return val;
  if (val is double) return val.toInt();
  return int.tryParse(val.toString()) ?? 0;
}

double _toDouble(dynamic val) {
  if (val == null) return 0.0;
  if (val is double) return val;
  if (val is int) return val.toDouble();
  return double.tryParse(val.toString()) ?? 0.0;
}
```

---

## Custom Action: aggregateTractsToSector

Aggrega i dati di piu Census Tracts in un singolo settore.

### Configurazione FlutterFlow

```
Nome: aggregateTractsToSector
Return Type: JSON (Map<String, dynamic>)
Arguments:
  - tracts: JSON (List<dynamic>)   // lista di tract parsati
  - sectorCode: String
  - sectorName: String
```

### Codice Dart

```dart
Future<dynamic> aggregateTractsToSector(
  List<dynamic> tracts,
  String sectorCode,
  String sectorName,
) async {
  if (tracts.isEmpty) {
    return {'error': 'No tracts provided'};
  }

  final tractMaps = tracts.cast<Map<String, dynamic>>();

  // Somme
  int totalPop = 0;
  int totalHousingUnits = 0;
  int totalOccupied = 0;
  int totalOwnerOcc = 0;
  int totalRenterOcc = 0;
  int totalVacant = 0;
  int totalPop25Plus = 0;
  int totalBachelor = 0;
  int totalMaster = 0;
  int totalDoctorate = 0;
  int totalPop16Plus = 0;
  int totalInLaborForce = 0;
  int totalUnemployed = 0;
  int totalBelowPoverty = 0;

  // Per mediane pesate
  double weightedIncome = 0;
  double weightedHomeValue = 0;
  double weightedRent = 0;
  double weightedAge = 0;
  int incomeWeight = 0;
  int homeValueWeight = 0;
  int rentWeight = 0;

  for (final tract in tractMaps) {
    final pop = tract['population'] as int? ?? 0;
    totalPop += pop;
    totalHousingUnits += tract['totalHousingUnits'] as int? ?? 0;
    totalOccupied += tract['occupiedUnits'] as int? ?? 0;
    totalOwnerOcc += tract['ownerOccupied'] as int? ?? 0;
    totalRenterOcc += tract['renterOccupied'] as int? ?? 0;
    totalVacant += tract['vacantUnits'] as int? ?? 0;
    totalPop25Plus += tract['pop25Plus'] as int? ?? 0;
    totalBachelor += tract['bachelorDegree'] as int? ?? 0;
    totalMaster += tract['masterDegree'] as int? ?? 0;
    totalDoctorate += tract['doctorate'] as int? ?? 0;
    totalPop16Plus += tract['pop16Plus'] as int? ?? 0;
    totalInLaborForce += tract['inLaborForce'] as int? ?? 0;
    totalUnemployed += tract['unemployed'] as int? ?? 0;
    totalBelowPoverty += tract['belowPoverty'] as int? ?? 0;

    // Mediane pesate per popolazione
    final income = tract['medianIncome'] as double? ?? 0;
    final homeVal = tract['medianHomeValue'] as double? ?? 0;
    final rent = tract['medianRent'] as double? ?? 0;
    final age = tract['medianAge'] as double? ?? 0;

    if (income > 0 && pop > 0) {
      weightedIncome += income * pop;
      incomeWeight += pop;
    }
    if (homeVal > 0 && pop > 0) {
      weightedHomeValue += homeVal * pop;
      homeValueWeight += pop;
    }
    if (rent > 0) {
      final renters = tract['renterOccupied'] as int? ?? 1;
      weightedRent += rent * renters;
      rentWeight += renters;
    }
    if (age > 0 && pop > 0) {
      weightedAge += age * pop;
    }
  }

  return {
    'sectorCode': sectorCode,
    'name': sectorName,
    'tractCount': tracts.length,
    'population': totalPop,
    'medianIncome': incomeWeight > 0 ? weightedIncome / incomeWeight : 0,
    'medianHomeValue': homeValueWeight > 0 ? weightedHomeValue / homeValueWeight : 0,
    'medianRent': rentWeight > 0 ? weightedRent / rentWeight : 0,
    'medianAge': totalPop > 0 ? weightedAge / totalPop : 0,
    'totalHousingUnits': totalHousingUnits,
    'vacancyRate': totalHousingUnits > 0
        ? (totalVacant / totalHousingUnits) * 100
        : 0,
    'ownershipRate': totalOccupied > 0
        ? (totalOwnerOcc / totalOccupied) * 100
        : 0,
    'unemploymentRate': totalInLaborForce > 0
        ? (totalUnemployed / totalInLaborForce) * 100
        : 0,
    'educationBachelorPlus': totalPop25Plus > 0
        ? ((totalBachelor + totalMaster + totalDoctorate) / totalPop25Plus) * 100
        : 0,
    'povertyRate': totalPop > 0
        ? (totalBelowPoverty / totalPop) * 100
        : 0,
    'laborParticipationRate': totalPop16Plus > 0
        ? (totalInLaborForce / totalPop16Plus) * 100
        : 0,
  };
}
```

---

## Custom Action: buildTimeSeries

Costruisce una serie temporale per un settore attraverso anni multipli.

### Configurazione FlutterFlow

```
Nome: buildTimeSeries
Return Type: JSON (List<dynamic>)
Arguments:
  - yearDataMap: JSON (Map<String, dynamic>)  // { "2010": [...tracts], "2015": [...], ... }
  - sectorTractIds: JSON (List<String>)        // tracts in questo settore
```

### Codice Dart

```dart
Future<List<dynamic>> buildTimeSeries(
  Map<String, dynamic> yearDataMap,
  List<String> sectorTractIds,
) async {
  final timeSeries = <Map<String, dynamic>>[];

  for (final entry in yearDataMap.entries) {
    final year = int.tryParse(entry.key) ?? 0;
    final allTracts = (entry.value as List<dynamic>).cast<Map<String, dynamic>>();

    // Filtra solo i tracts del settore
    final sectorTracts = allTracts
        .where((t) => sectorTractIds.contains(t['tractId']))
        .toList();

    if (sectorTracts.isEmpty) continue;

    // Aggrega
    final aggregated = await aggregateTractsToSector(
      sectorTracts, '', '',
    );

    timeSeries.add({
      'year': year,
      ...aggregated as Map<String, dynamic>,
    });
  }

  timeSeries.sort((a, b) => (a['year'] as int).compareTo(b['year'] as int));

  return timeSeries;
}
```
