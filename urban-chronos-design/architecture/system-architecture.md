# URBAN_CHRONOS v2.0 — Architettura di Sistema

## Panoramica

```
┌─────────────────────────────────────────────────────────────────┐
│                    URBAN_CHRONOS v2.0                            │
│                 FlutterFlow Application                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │ Dashboard │  │ Sector   │  │Prediction│  │ Intervention  │   │
│  │   View   │  │   Map    │  │  Engine  │  │    Layer      │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬───────┘   │
│       │              │              │               │            │
│  ┌────┴──────────────┴──────────────┴───────────────┴────┐      │
│  │              APP STATE MANAGER                         │      │
│  │     (FlutterFlow App State + Page State)               │      │
│  └────┬──────────────┬──────────────┬───────────────┬────┘      │
│       │              │              │               │            │
│  ┌────┴─────┐  ┌─────┴────┐  ┌─────┴────┐  ┌──────┴──────┐   │
│  │  API     │  │ Firebase  │  │ Prediction│  │  Entropy    │   │
│  │  Layer   │  │ Layer     │  │ Engine    │  │  Engine     │   │
│  └────┬─────┘  └─────┬────┘  └─────┬────┘  └──────┬──────┘   │
│       │              │              │               │            │
└───────┼──────────────┼──────────────┼───────────────┼────────────┘
        │              │              │               │
   ┌────┴────┐   ┌─────┴────┐  ┌─────┴────┐   ┌─────┴─────┐
   │ Google  │   │ Firebase │  │ Custom   │   │  Random   │
   │ Maps    │   │Firestore │  │ Actions  │   │  Noise    │
   │ Census  │   │   Auth   │  │  (Dart)  │   │ Generator │
   │ BLS     │   │Functions │  │          │   │           │
   │ EPA     │   │          │  │          │   │           │
   └─────────┘   └──────────┘  └──────────┘   └───────────┘
```

## Livelli dell'Architettura

### 1. Presentation Layer (FlutterFlow Pages)

| Pagina                | Tipo       | Descrizione                                   |
|----------------------|------------|-----------------------------------------------|
| SplashBootPage       | Splash     | Boot sequence animata in stile terminale       |
| DashboardPage        | Home       | Panoramica metriche vitali del sistema         |
| SectorMapPage        | Map        | Google Maps con overlay settori urbani         |
| NeighborhoodPage     | Detail     | Analisi dettagliata singolo quartiere          |
| PredictionEnginePage | Analytics  | Proiezioni future con timeline interattiva     |
| InterventionPage     | Controls   | Slider Entropy/Reality Buffer/Null Zones       |
| DataSourcesPage      | Settings   | Gestione API e sorgenti dati                   |
| SystemLogPage        | Debug      | Feed live del sistema                          |

### 2. State Management Layer

#### App State (Globale — persiste tra le pagine)

```
AppState {
  // Configurazione sistema
  String    selectedCityId
  String    selectedSectorId
  int       projectionYear          // 2025-2050
  bool      systemTrackingEnabled

  // Metriche correnti
  double    efficiencyScore         // 0-100
  double    sovereigntyScore        // 0-100
  double    resilienceScore         // 0-100
  double    predictabilityScore     // 0-100

  // Parametri intervento
  double    entropySeed             // 0-100 (% noise)
  int       realityBufferMonths     // 0-60 mesi
  bool      nullZoneDesignatorOn

  // Dati caricati
  List<JSON>  censusData
  List<JSON>  sectorsList
  List<JSON>  predictionResults
  List<JSON>  systemLogs

  // UI State
  String    currentView             // 'dashboard'|'map'|'prediction'|...
  bool      darkModeOnly            // sempre true (cyberpunk)
  String    activeAlertLevel        // 'nominal'|'warning'|'critical'
}
```

#### Page State (Locale per pagina)

```
SectorMapPageState {
  LatLng    mapCenter
  double    zoomLevel
  String    selectedOverlay         // 'population'|'income'|'growth'|...
  bool      showHeatmap
  bool      showNullZones
  List<Marker>  activeMarkers
}

PredictionPageState {
  int       fromYear
  int       toYear
  String    predictionModel         // 'linear'|'exponential'|'entropy'
  List<JSON>  timelineData
  bool      isCalculating
}
```

### 3. API Integration Layer

```
┌─────────────────────────────────────────────────────┐
│                  API LAYER                           │
├──────────────┬──────────────────────────────────────┤
│              │                                       │
│  Google      │  Maps JavaScript SDK                  │
│  Maps API    │  Geocoding API                        │
│              │  Places API                           │
│              │                                       │
├──────────────┼──────────────────────────────────────┤
│              │                                       │
│  US Census   │  American Community Survey (ACS)      │
│  Bureau      │  Decennial Census                     │
│              │  Population Estimates                  │
│              │                                       │
├──────────────┼──────────────────────────────────────┤
│              │                                       │
│  Bureau of   │  Employment Statistics                │
│  Labor Stats │  Consumer Price Index                 │
│              │  Occupational Data                    │
│              │                                       │
├──────────────┼──────────────────────────────────────┤
│              │                                       │
│  EPA         │  Air Quality Index                    │
│  + Weather   │  Environmental Facilities             │
│              │  OpenWeatherMap (climate)              │
│              │                                       │
├──────────────┼──────────────────────────────────────┤
│              │                                       │
│  Open Data   │  City-specific Open Data portals      │
│  Portals     │  Socrata Open Data API                │
│              │  data.gov datasets                    │
│              │                                       │
└──────────────┴──────────────────────────────────────┘
```

### 4. Prediction Engine Layer (Custom Actions — Dart)

Il motore predittivo è il cuore dell'applicazione. Viene implementato
come Custom Actions in FlutterFlow (codice Dart puro).

```
PredictionEngine {
  // Input
  HistoricalData[]    censusTimeSeries      // Serie storica Census
  EconomicData[]      laborTimeSeries       // Serie storica BLS
  EnvironmentalData[] envTimeSeries         // Serie storica ambientale

  // Parametri
  double              entropySeed           // Noise injection
  int                 realityBufferMonths   // Delay democratico
  String              modelType             // Tipo di modello

  // Output
  PredictionResult[]  predictions           // Risultati predittivi
  double              confidenceScore       // Affidabilita predizione
  RiskAssessment      risks                 // Valutazione rischi
  SovereigntyImpact   impact                // Impatto sulla sovranita
}
```

**Modelli predittivi implementati:**

1. **Linear Regression** — Estrapolazione lineare trend storici
2. **Exponential Growth** — Modello di crescita esponenziale
3. **Entropy Model** — Modello con iniezione di rumore casuale
4. **Composite Model** — Media pesata dei tre modelli

### 5. Entropy Engine Layer

L'Entropy Engine inietta "rumore" nelle predizioni per prevenire
il determinismo algoritmico. Filosoficamente rappresenta l'imprevedibilita
umana.

```
EntropyEngine {
  // Genera noise gaussiano
  generateNoise(seed: double, dimensions: int) → List<double>

  // Applica noise alle predizioni
  applyEntropy(predictions: List, noiseLevel: double) → List

  // Calcola "Sovereignty Score" basato sul livello di determinismo
  calculateSovereignty(efficiency: double, entropy: double) → double

  // Determina se il sistema e "troppo efficiente"
  checkFreedomRisk(metrics: SystemMetrics) → AlertLevel
}
```

## Flusso Dati Principale

```
1. BOOT → Carica configurazione Firebase
           ↓
2. FETCH → Chiama Census Bureau API per citta selezionata
         → Chiama BLS API per dati economici
         → Chiama EPA/Weather per dati ambientali
           ↓
3. PARSE → Custom Action: parseCensusData()
         → Custom Action: parseLaborData()
         → Custom Action: parseEnvironmentalData()
           ↓
4. STORE → Salva dati parsati in App State
         → Cache in Firestore per accesso offline
           ↓
5. COMPUTE → Custom Action: runPredictionEngine()
           → Applica Entropy Engine
           → Calcola metriche (Efficiency, Sovereignty, etc.)
             ↓
6. RENDER → Dashboard aggiorna radar chart
          → Mappa aggiorna overlay/heatmap
          → Timeline aggiorna proiezioni
          → System Log registra operazioni
             ↓
7. INTERACT → Utente modifica Entropy Seed / Reality Buffer
            → Torna al passo 5 (ricalcolo)
```

## Sicurezza e Performance

### API Key Management
- Tutte le API key salvate in Firebase Remote Config
- MAI hardcodate nel codice FlutterFlow
- Accesso tramite Firebase Cloud Functions come proxy

### Rate Limiting
- Census Bureau: 500 richieste/giorno (senza key), illimitate con key
- Google Maps: gestito da quota progetto GCP
- BLS: 500 richieste/giorno (v2, registrazione gratuita)
- Cache aggressiva in Firestore (refresh ogni 24h)

### Performance
- Lazy loading delle pagine
- Paginazione dati Census (max 50 variabili per chiamata)
- Predizioni calcolate client-side (no round-trip server)
- Mappa: max 500 marker visibili, clustering per zoom out
