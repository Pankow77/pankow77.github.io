# URBAN_CHRONOS v2.0 — Data Sources Page

## Scopo
Gestione delle sorgenti dati, stato delle connessioni API,
e configurazione della citta/area di analisi.

## Layout

```
┌─────────────────────────────────────────┐
│ ← DATA SOURCES                          │
│─────────────────────────────────────────│
│                                          │
│ ┌─ ACTIVE CITY ───────────────────────┐ │
│ │ 📍 New York, NY                     │ │
│ │ State FIPS: 36 | County FIPS: 061   │ │
│ │ Sectors: 24 | Tracts: 287           │ │
│ │ Last refresh: 2h ago                │ │
│ │                                      │ │
│ │ [CHANGE CITY]  [↻ REFRESH DATA]     │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ ┌─ API STATUS ────────────────────────┐ │
│ │                                      │ │
│ │ GOOGLE MAPS       ● CONNECTED       │ │
│ │ Quota: 28K/28K remaining            │ │
│ │                                      │ │
│ │ CENSUS BUREAU     ● CONNECTED       │ │
│ │ Last call: 2h ago | Cached: 287     │ │
│ │                                      │ │
│ │ BLS               ● CONNECTED       │ │
│ │ Calls today: 12/500                 │ │
│ │                                      │ │
│ │ EPA               ○ NOT CONFIGURED  │ │
│ │ [CONFIGURE →]                        │ │
│ │                                      │ │
│ │ OPENWEATHER       ● CONNECTED       │ │
│ │ Calls/min: 3/60                     │ │
│ │                                      │ │
│ │ WALK SCORE        ○ NOT CONFIGURED  │ │
│ │ [CONFIGURE →]                        │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ ┌─ CACHED DATA ───────────────────────┐ │
│ │                                      │ │
│ │ Census 2023 ACS5    287 tracts  ✓   │ │
│ │ Census 2020 ACS5    287 tracts  ✓   │ │
│ │ Census 2015 ACS5    285 tracts  ✓   │ │
│ │ Census 2010 ACS5    281 tracts  ✓   │ │
│ │ BLS Employment      24 series   ✓   │ │
│ │ Air Quality 2023    12 stations ✓   │ │
│ │                                      │ │
│ │ Total cache: 2.4 MB                  │ │
│ │ [CLEAR CACHE]  [EXPORT JSON]        │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ ┌─ ADD CITY ──────────────────────────┐ │
│ │                                      │ │
│ │ Search: [________________] [GO]      │ │
│ │                                      │ │
│ │ Popular:                             │ │
│ │ • Los Angeles, CA                    │ │
│ │ • Chicago, IL                        │ │
│ │ • Houston, TX                        │ │
│ │ • Philadelphia, PA                   │ │
│ └──────────────────────────────────────┘ │
│                                          │
└─────────────────────────────────────────┘
```

## Widget Principali

### APIStatusCard (componente)

```
Componente: APIStatusCard
Parametri:
  - name: String
  - isConnected: bool
  - statusDetail: String
  - onConfigure: Action?

Widget:
  Container
    padding: 12px 0
    borderBottom: 1px solid #1a1a1a
    child: Row
      ├── Column(crossAxisAlignment: start, flex: 1)
      │     ├── Text(name)
      │     │     style: Orbitron, 12px, #e0e0e0
      │     ├── SizedBox(4)
      │     └── Text(statusDetail)
      │           style: Courier New, 10px, #888888
      └── Row
            ├── Container(8x8, borderRadius: 4,
            │     color: isConnected ? #00ff41 : #555555)
            ├── SizedBox(6)
            └── Text(isConnected ? "CONNECTED" : "NOT CONFIGURED")
                  style: Orbitron, 9px,
                         isConnected ? #00ff41 : #555555
```

### Refresh Data Action

```
1. Mostra dialog conferma: "Refresh all data? This will use API calls."
2. Per ogni API connessa:
   a. Fetch nuovi dati
   b. Aggiorna cache Firestore
   c. Log risultato
3. Ricalcola tutte le metriche settore
4. Aggiorna lastDataRefresh
5. Log: "[SYSTEM] Full data refresh complete. {n} API calls made."
```

### Change City Flow

```
1. Mostra BottomSheet con campo ricerca
2. Utente digita → placesAutocomplete
3. Utente seleziona citta
4. geocodeAddress → ottieni coordinate
5. Cerca FIPS code (da tabella locale o API)
6. Crea/carica documento city in Firestore
7. Fetch Census tracts per la nuova citta
8. Aggiorna AppState.selectedCityId
9. Navigate to Dashboard
10. Log: "[SYSTEM] City changed to {name}. Loading {n} tracts."
```
