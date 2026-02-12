# URBAN_CHRONOS v2.0 — US Census Bureau API Integration

## Panoramica

Il Census Bureau fornisce i dati demografici, economici e abitativi
che alimentano il motore predittivo. E la sorgente dati piu importante
dell'applicazione.

**Base URL:** `https://api.census.gov/data`
**Autenticazione:** API Key gratuita (richiedi su https://api.census.gov/data/key_signup.html)
**Rate Limit:** 500 req/giorno senza key, illimitate con key
**Formato:** JSON

## Dataset Utilizzati

| Dataset                        | Codice  | Anni Disponibili   | Uso                         |
|--------------------------------|---------|--------------------|-----------------------------|
| American Community Survey 5yr  | acs/acs5| 2009-2023          | Dati demografici dettagliati|
| American Community Survey 1yr  | acs/acs1| 2005-2023          | Stime annuali (citta grandi)|
| Decennial Census               | dec/pl  | 2000, 2010, 2020   | Conteggio popolazione       |
| Population Estimates           | pep     | 2020-2023          | Stime popolazione recenti   |

## Variabili Census Necessarie

### Gruppo 1: Demografia Base

| Variabile     | Descrizione                        | Tabella  |
|---------------|------------------------------------|---------  |
| B01001_001E   | Popolazione totale                 | B01001   |
| B01002_001E   | Eta mediana                        | B01002   |
| B01001_002E   | Popolazione maschile               | B01001   |
| B01001_026E   | Popolazione femminile              | B01001   |
| B02001_002E   | Popolazione bianca                 | B02001   |
| B02001_003E   | Popolazione nera                   | B02001   |
| B03001_003E   | Popolazione ispanica               | B03001   |
| B02001_005E   | Popolazione asiatica               | B02001   |

### Gruppo 2: Economia e Reddito

| Variabile     | Descrizione                        | Tabella  |
|---------------|------------------------------------|----------|
| B19013_001E   | Reddito mediano familiare          | B19013   |
| B19001_001E   | Famiglie totali (per distribuzione)| B19001   |
| B19001_002E   | Reddito < $10,000                  | B19001   |
| B19001_017E   | Reddito > $200,000                 | B19001   |
| B17001_002E   | Sotto soglia di poverta            | B17001   |

### Gruppo 3: Abitazioni e Immobili

| Variabile     | Descrizione                        | Tabella  |
|---------------|------------------------------------|----------|
| B25077_001E   | Valore mediano casa                | B25077   |
| B25064_001E   | Affitto mediano                    | B25064   |
| B25003_001E   | Unita abitative occupate           | B25003   |
| B25003_002E   | Occupate dal proprietario          | B25003   |
| B25003_003E   | Occupate in affitto                | B25003   |
| B25002_003E   | Unita vacanti                      | B25002   |
| B25001_001E   | Totale unita abitative             | B25001   |

### Gruppo 4: Istruzione

| Variabile     | Descrizione                        | Tabella  |
|---------------|------------------------------------|----------|
| B15003_001E   | Popolazione 25+ totale             | B15003   |
| B15003_017E   | Diploma superiore                  | B15003   |
| B15003_022E   | Laurea triennale (Bachelor's)      | B15003   |
| B15003_023E   | Laurea magistrale (Master's)       | B15003   |
| B15003_025E   | Dottorato                          | B15003   |

### Gruppo 5: Lavoro

| Variabile     | Descrizione                        | Tabella  |
|---------------|------------------------------------|----------|
| B23025_001E   | Popolazione 16+ totale             | B23025   |
| B23025_002E   | Nella forza lavoro                 | B23025   |
| B23025_005E   | Disoccupati                        | B23025   |
| B23025_007E   | Non nella forza lavoro             | B23025   |

### Gruppo 6: Trasporti (Commuting)

| Variabile     | Descrizione                        | Tabella  |
|---------------|------------------------------------|----------|
| B08301_001E   | Lavoratori 16+ totale              | B08301   |
| B08301_010E   | Trasporto pubblico                 | B08301   |
| B08301_019E   | A piedi                            | B08301   |
| B08301_021E   | Lavoro da casa                     | B08301   |
| B08303_001E   | Tempo medio commuting              | B08303   |

## Endpoint e Query

### Struttura URL Base

```
https://api.census.gov/data/{year}/acs/acs5?
  get={variabili separate da virgola}&
  for=tract:*&
  in=state:{FIPS_state}&in=county:{FIPS_county}&
  key={API_KEY}
```

### Livelli Geografici

| Livello    | Parametro                                    | Granularita        |
|-----------|----------------------------------------------|--------------------|
| State     | `for=state:{FIPS}`                           | Intero stato       |
| County    | `for=county:*&in=state:{FIPS}`               | Per contea         |
| Tract     | `for=tract:*&in=state:{FIPS}&in=county:{FIPS}` | Per census tract|
| Place     | `for=place:{FIPS}&in=state:{FIPS}`           | Per citta          |

**Census Tract** e il livello ideale per l'analisi quartiere
(2,500-8,000 persone per tract).

### Codici FIPS Citta di Esempio

| Citta           | State FIPS | County FIPS | Place FIPS |
|----------------|------------|-------------|------------|
| New York, NY   | 36         | 061 (Manhattan) | 51000  |
| Los Angeles, CA| 06         | 037         | 44000      |
| Chicago, IL    | 17         | 031         | 14000      |
| Houston, TX    | 48         | 201         | 35000      |
| Philadelphia   | 42         | 101         | 60000      |
| Berlin (DE)*   | N/A        | N/A         | N/A        |
| Roma (IT)*     | N/A        | N/A         | N/A        |

*Per citta europee, usare Open Data locali (vedi `open-data.md`)

## Configurazione API Call in FlutterFlow

### API Call 1: fetchCensusTracts

```
Nome: fetchCensusTracts
URL: https://api.census.gov/data/[year]/acs/acs5
Method: GET
Query Parameters:
  get: B01001_001E,B19013_001E,B25077_001E,B01002_001E,B25064_001E,B23025_005E,B23025_001E,B15003_022E,B15003_001E,NAME
  for: tract:*
  in: state:[stateCode]&in=county:[countyCode]
  key: [CENSUS_API_KEY]

Response Type: JSON
JSON Path mappings:
  La risposta e un array di array. La prima riga e l'header.
  $..[0] → headers (nomi variabili)
  $..[1:] → data rows
```

### API Call 2: fetchCensusTimeSeries

Per ottenere dati storici, fai chiamate per ogni anno:

```
Nome: fetchCensusYear
URL: https://api.census.gov/data/[year]/acs/acs5
Method: GET
Query Parameters:
  get: B01001_001E,B19013_001E,B25077_001E,B01002_001E
  for: tract:[tractId]
  in: state:[stateCode]&in=county:[countyCode]
  key: [CENSUS_API_KEY]

Anni da chiamare: 2010, 2012, 2014, 2016, 2018, 2020, 2022, 2023
(ACS 5-year disponibile ogni anno, ma ogni 2 anni basta)
```

### API Call 3: fetchPopulationEstimates

```
Nome: fetchPopEstimates
URL: https://api.census.gov/data/pep/population
Method: GET
Query Parameters:
  get: POP_2020,POP_2021,POP_2022,POP_2023,NAME
  for: county:[countyCode]
  in: state:[stateCode]
  key: [CENSUS_API_KEY]
```

## Parsing della Risposta Census

La risposta Census e un array di array JSON:

```json
[
  ["B01001_001E","B19013_001E","B25077_001E","NAME","state","county","tract"],
  ["4521","52400","215000","Census Tract 1, Kings County, New York","36","047","000100"],
  ["3892","48700","198000","Census Tract 2, Kings County, New York","36","047","000200"]
]
```

### Custom Action per Parsing

```dart
// Custom Action: parseCensusResponse
// Input: dynamic apiResponse (JSON array of arrays)
// Output: List<CensusTractData> (custom data type)

Future<List<dynamic>> parseCensusResponse(dynamic apiResponse) async {
  final List<dynamic> data = apiResponse as List<dynamic>;
  if (data.isEmpty) return [];

  final headers = (data[0] as List<dynamic>).cast<String>();
  final rows = data.sublist(1);

  return rows.map((row) {
    final values = (row as List<dynamic>);
    final map = <String, dynamic>{};

    for (int i = 0; i < headers.length; i++) {
      final key = headers[i];
      final val = values[i];

      // Census restituisce stringhe, convertiamo in numeri
      if (key != 'NAME' && key != 'state' && key != 'county' && key != 'tract') {
        map[key] = double.tryParse(val?.toString() ?? '') ?? 0.0;
      } else {
        map[key] = val?.toString() ?? '';
      }
    }

    return {
      'tractId': '${map['state']}${map['county']}${map['tract']}',
      'name': map['NAME'],
      'population': (map['B01001_001E'] as double).toInt(),
      'medianIncome': map['B19013_001E'] as double,
      'medianHomeValue': map['B25077_001E'] as double,
      'medianAge': map['B01002_001E'] as double,
      'medianRent': map['B25064_001E'] as double,
      'unemployed': (map['B23025_005E'] as double).toInt(),
      'laborForce': (map['B23025_001E'] as double).toInt(),
      'bachelorDegree': (map['B15003_022E'] as double).toInt(),
      'totalPop25Plus': (map['B15003_001E'] as double).toInt(),
    };
  }).toList();
}
```

## Calcolo Metriche Derivate

```dart
// Da dati Census grezzi a metriche per l'app

double unemploymentRate(int unemployed, int laborForce) {
  if (laborForce == 0) return 0;
  return (unemployed / laborForce) * 100;
}

double educationRate(int bachelorPlus, int totalPop25) {
  if (totalPop25 == 0) return 0;
  return (bachelorPlus / totalPop25) * 100;
}

double vacancyRate(int vacant, int totalUnits) {
  if (totalUnits == 0) return 0;
  return (vacant / totalUnits) * 100;
}

double ownershipRate(int ownerOccupied, int totalOccupied) {
  if (totalOccupied == 0) return 0;
  return (ownerOccupied / totalOccupied) * 100;
}
```

## Serie Temporali per Predizioni

Per alimentare il motore predittivo, servono dati multi-anno:

```
Anno     Variabile         Valore
─────    ─────────         ──────
2010     B01001_001E       42,103    (popolazione)
2012     B01001_001E       43,250
2014     B01001_001E       44,892
2016     B01001_001E       45,230
2018     B01001_001E       46,100
2020     B01001_001E       44,800    (effetto COVID)
2022     B01001_001E       47,500
2023     B01001_001E       48,200
```

Questa serie temporale viene passata al Prediction Engine
(vedi `custom-actions/prediction-algorithms.md`).

## Gestione Errori Census API

```dart
// Custom Action: handleCensusError

String handleCensusError(int statusCode, String body) {
  switch (statusCode) {
    case 200:
      if (body.contains('error')) {
        return '[ERROR] Census API: Invalid variable or geography';
      }
      return 'OK';
    case 204:
      return '[WARN] Census API: No data available for this query';
    case 400:
      return '[ERROR] Census API: Bad request - check parameters';
    case 403:
      return '[ERROR] Census API: Invalid API key';
    case 429:
      return '[WARN] Census API: Rate limit exceeded. Using cached data.';
    case 500:
      return '[ERROR] Census API: Server error. Retry in 60s.';
    default:
      return '[ERROR] Census API: Unknown error ($statusCode)';
  }
}
```

## Strategia di Cache

```
1. Prima chiamata → Fetch da Census API → Salva in Firestore (census_cache)
2. Chiamate successive:
   a. Controlla Firestore: documento esiste E non e scaduto?
      → SI: usa cache
      → NO: fetch da Census API → aggiorna cache
3. Scadenza cache: 24 ore (dati Census cambiano annualmente)
4. Fallback: se API non disponibile, usa ultima cache disponibile
```

### Cloud Function per Cache (Firebase)

```javascript
// functions/src/census-proxy.js
// Questa Cloud Function fa da proxy per Census API
// e gestisce il caching in Firestore

exports.fetchCensusData = functions.https.onCall(async (data, context) => {
  const { year, dataset, variables, geography, stateCode, countyCode } = data;

  const cacheKey = `${geography}_${stateCode}_${countyCode}_${year}_${dataset}`;
  const cacheDoc = await db.collection('census_cache').doc(cacheKey).get();

  // Check cache
  if (cacheDoc.exists) {
    const cached = cacheDoc.data();
    const expiresAt = cached.expiresAt.toDate();
    if (expiresAt > new Date()) {
      return { source: 'cache', data: cached.variables };
    }
  }

  // Fetch from Census
  const url = `https://api.census.gov/data/${year}/${dataset}?` +
    `get=${variables}&for=${geography}&in=state:${stateCode}` +
    `&in=county:${countyCode}&key=${process.env.CENSUS_API_KEY}`;

  const response = await fetch(url);
  const json = await response.json();

  // Save to cache
  await db.collection('census_cache').doc(cacheKey).set({
    geoId: `${stateCode}${countyCode}`,
    year: parseInt(year),
    dataset,
    variables: json,
    fetchedAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    source: url,
  });

  return { source: 'api', data: json };
});
```
