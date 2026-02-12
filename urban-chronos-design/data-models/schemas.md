# URBAN_CHRONOS v2.0 — Data Models & Firestore Schemas

## Panoramica Database

Backend: **Firebase Firestore**
Struttura: NoSQL, document-based

```
firestore/
├── users/                    # Profili utente
├── cities/                   # Citta monitorate
│   └── {cityId}/
│       └── sectors/          # Settori/quartieri
├── census_cache/             # Cache dati Census Bureau
├── predictions/              # Risultati predittivi salvati
├── system_logs/              # Log di sistema
└── app_config/               # Configurazione globale
```

---

## Schema: Users

**Collezione:** `users`
**Documento ID:** Firebase Auth UID

```
{
  "uid": String,                    // Firebase Auth UID
  "email": String,
  "displayName": String,
  "role": String,                   // "operator" | "admin" | "viewer"
  "createdAt": Timestamp,
  "lastLogin": Timestamp,
  "settings": {
    "defaultCityId": String,        // Citta predefinita
    "defaultProjectionYear": int,   // Anno proiezione default
    "entropySeedDefault": double,   // Entropy seed preferito
    "realityBufferDefault": int,    // Reality buffer preferito
    "notificationsEnabled": bool
  },
  "savedAnalyses": List<String>     // IDs delle analisi salvate
}
```

**FlutterFlow Setup:**
- Tipo: Users Collection (standard FlutterFlow)
- Autenticazione: Firebase Auth (email + Google)
- Regole: ogni utente legge/scrive solo il proprio documento

---

## Schema: Cities

**Collezione:** `cities`
**Documento ID:** auto-generato

```
{
  "id": String,
  "name": String,                   // "Berlin" | "Roma" | "New York"
  "state": String,                  // Stato/regione
  "country": String,                // Codice paese ISO
  "fipsCode": String,               // Codice FIPS (per Census Bureau)
  "coordinates": {
    "lat": double,
    "lng": double
  },
  "boundingBox": {
    "northEast": { "lat": double, "lng": double },
    "southWest": { "lat": double, "lng": double }
  },
  "population": int,                // Popolazione corrente
  "area_km2": double,               // Area in km2
  "timezone": String,
  "censusGeoId": String,            // ID geografico Census Bureau
  "lastDataRefresh": Timestamp,
  "isActive": bool
}
```

### Sotto-collezione: Sectors

**Collezione:** `cities/{cityId}/sectors`
**Documento ID:** auto-generato

```
{
  "id": String,
  "sectorCode": String,             // es. "SECTOR_7G"
  "name": String,                   // es. "West District"
  "tractIds": List<String>,         // Census Tract IDs in questo settore
  "boundaries": List<{              // Poligono confini settore
    "lat": double,
    "lng": double
  }>,
  "centerPoint": {
    "lat": double,
    "lng": double
  },
  "classification": String,         // "residential"|"commercial"|"mixed"|"industrial"
  "currentMetrics": {
    "population": int,
    "medianIncome": double,
    "medianHomeValue": double,
    "unemploymentRate": double,
    "educationBachelorPlus": double, // % con laurea+
    "medianAge": double,
    "housingUnits": int,
    "vacancyRate": double,
    "populationDensity": double,     // persone/km2
    "crimeIndex": double,            // 0-100
    "greenSpacePercent": double,     // % area verde
    "transitScore": double,          // 0-100
    "walkScore": double,             // 0-100
    "airQualityIndex": double        // AQI
  },
  "historicalData": {                // Dati storici per anno
    "2010": { /* stessa struttura currentMetrics */ },
    "2015": { /* ... */ },
    "2020": { /* ... */ },
    "2024": { /* ... */ }
  },
  "riskFactors": {
    "gentrificationRisk": double,    // 0-100
    "floodRisk": double,             // 0-100
    "economicDeclineRisk": double,   // 0-100
    "infrastructureStress": double   // 0-100
  },
  "nullZoneStatus": bool,           // True = zona non tracciata
  "lastUpdated": Timestamp
}
```

---

## Schema: Census Cache

**Collezione:** `census_cache`
**Documento ID:** `{geoId}_{year}_{dataset}`

```
{
  "geoId": String,                  // ID geografico Census
  "year": int,                      // Anno dei dati
  "dataset": String,                // "acs5" | "acs1" | "dec" | "pep"
  "variables": {                    // Mappa variabile → valore
    "B01001_001E": int,             // Popolazione totale
    "B19013_001E": int,             // Reddito mediano
    "B25077_001E": int,             // Valore mediano casa
    "B25003_001E": int,             // Unita abitative occupate
    "B25003_002E": int,             // Di cui proprieta
    "B25003_003E": int,             // Di cui affitto
    "B15003_022E": int,             // Laurea triennale
    "B15003_023E": int,             // Laurea magistrale
    "B23025_005E": int,             // Disoccupati
    "B01002_001E": double           // Eta mediana
    // ... altre variabili
  },
  "fetchedAt": Timestamp,
  "expiresAt": Timestamp,           // fetchedAt + 24h
  "source": String                  // URL API originale
}
```

---

## Schema: Predictions

**Collezione:** `predictions`
**Documento ID:** auto-generato

```
{
  "id": String,
  "userId": String,                 // Chi ha generato la predizione
  "cityId": String,
  "sectorId": String,
  "createdAt": Timestamp,
  "parameters": {
    "modelType": String,            // "linear"|"exponential"|"entropy"|"composite"
    "fromYear": int,
    "toYear": int,
    "entropySeed": double,
    "realityBufferMonths": int,
    "confidenceLevel": double       // 0.0-1.0
  },
  "results": {
    "timeline": List<{
      "year": int,
      "population": int,
      "medianIncome": double,
      "medianHomeValue": double,
      "unemploymentRate": double,
      "populationDensity": double,
      "greenSpacePercent": double,
      "transitScore": double,
      "confidence": double          // Confidenza per questo anno
    }>,
    "summaryMetrics": {
      "projectedGrowthRate": double,
      "gentrificationProbability": double,
      "economicStabilityScore": double,
      "environmentalTrend": String  // "improving"|"stable"|"declining"
    },
    "systemMetrics": {
      "efficiency": double,
      "sovereignty": double,
      "resilience": double,
      "predictability": double
    },
    "alerts": List<{
      "type": String,               // "freedom_risk"|"gentrification"|"decline"
      "severity": String,           // "nominal"|"warning"|"critical"
      "message": String,
      "year": int                   // Anno in cui scatta l'alerta
    }>
  },
  "isSaved": bool                   // L'utente ha salvato questa analisi
}
```

---

## Schema: System Logs

**Collezione:** `system_logs`
**Documento ID:** auto-generato

```
{
  "timestamp": Timestamp,
  "level": String,                  // "INFO"|"WARN"|"ERROR"|"SYSTEM"
  "source": String,                 // "CORE"|"CENSUS_API"|"PREDICTION"|"ENTROPY"
  "message": String,                // Messaggio in stile terminale
  "metadata": {                     // Dati aggiuntivi opzionali
    "userId": String,
    "cityId": String,
    "sectorId": String,
    "apiEndpoint": String,
    "responseTime": int,            // ms
    "errorCode": String
  }
}
```

**Esempio messaggi log (stile URBAN_CHRONOS):**
```
[SYSTEM] URBAN_CHRONOS v2.0 initialized. All sectors nominal.
[INFO] Census Bureau API connected. Latency: 145ms.
[INFO] Loaded 47 census tracts for SECTOR_7G.
[WARN] Sovereignty index below threshold: 31%. Freedom at risk.
[INFO] Prediction engine: composite model selected. Projecting 2025-2040.
[WARN] Entropy seed at 5%. Deterministic lock-in probable.
[ERROR] BLS API rate limit exceeded. Switching to cached data.
[SYSTEM] PANKOW_77C> Optimization is death. Proceed with caution.
```

---

## Schema: App Config

**Collezione:** `app_config`
**Documento ID:** `global`

```
{
  "version": String,                // "2.0.0"
  "apiEndpoints": {
    "censusBureau": "https://api.census.gov/data",
    "bls": "https://api.bls.gov/publicAPI/v2",
    "epa": "https://aqs.epa.gov/data/api",
    "openWeather": "https://api.openweathermap.org/data/2.5"
  },
  "defaultCity": String,            // cityId predefinito
  "maxProjectionYear": int,         // 2050
  "cacheExpiryHours": int,          // 24
  "predictionModels": List<String>, // Modelli disponibili
  "featureFlags": {
    "enableNullZones": bool,
    "enableEntropyEngine": bool,
    "enableRealityBuffer": bool,
    "enableLiveLog": bool
  },
  "quotes": List<{                  // Citazioni rotanti per il sistema
    "text": String,
    "author": String
  }>
}
```

---

## Regole Firestore

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users: solo il proprio profilo
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }

    // Cities: tutti leggono, solo admin scrive
    match /cities/{cityId} {
      allow read: if request.auth != null;
      allow write: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';

      match /sectors/{sectorId} {
        allow read: if request.auth != null;
        allow write: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
      }
    }

    // Census Cache: tutti leggono, sistema scrive
    match /census_cache/{docId} {
      allow read: if request.auth != null;
      allow write: if false; // Solo Cloud Functions
    }

    // Predictions: utente legge/scrive le proprie
    match /predictions/{predId} {
      allow read: if request.auth.uid == resource.data.userId;
      allow create: if request.auth != null;
      allow update, delete: if request.auth.uid == resource.data.userId;
    }

    // System Logs: tutti leggono, sistema scrive
    match /system_logs/{logId} {
      allow read: if request.auth != null;
      allow write: if false; // Solo Cloud Functions
    }

    // App Config: tutti leggono, solo admin scrive
    match /app_config/{docId} {
      allow read: if request.auth != null;
      allow write: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

---

## Indici Firestore Consigliati

```
// Per query predictions per utente ordinate per data
Collection: predictions
Fields: userId ASC, createdAt DESC

// Per query system_logs recenti
Collection: system_logs
Fields: timestamp DESC

// Per query census_cache per geo e anno
Collection: census_cache
Fields: geoId ASC, year DESC

// Per query sectors per classificazione
Collection: cities/{cityId}/sectors
Fields: classification ASC, currentMetrics.population DESC
```

---

## Tipi FlutterFlow (Data Types)

In FlutterFlow, crea questi Custom Data Types:

### `CoordinatesStruct`
| Campo | Tipo   |
|-------|--------|
| lat   | double |
| lng   | double |

### `SectorMetricsStruct`
| Campo               | Tipo   |
|---------------------|--------|
| population          | int    |
| medianIncome        | double |
| medianHomeValue     | double |
| unemploymentRate    | double |
| educationBachPlus   | double |
| medianAge           | double |
| housingUnits        | int    |
| vacancyRate         | double |
| populationDensity   | double |
| greenSpacePercent   | double |
| transitScore        | double |
| walkScore           | double |
| airQualityIndex     | double |

### `PredictionPointStruct`
| Campo            | Tipo   |
|------------------|--------|
| year             | int    |
| population       | int    |
| medianIncome     | double |
| medianHomeValue  | double |
| unemploymentRate | double |
| confidence       | double |

### `SystemAlertStruct`
| Campo    | Tipo   |
|----------|--------|
| type     | String |
| severity | String |
| message  | String |
| year     | int    |

### `SystemLogEntryStruct`
| Campo     | Tipo      |
|-----------|-----------|
| timestamp | DateTime  |
| level     | String    |
| source    | String    |
| message   | String    |
