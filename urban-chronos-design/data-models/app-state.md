# URBAN_CHRONOS v2.0 — App State (FlutterFlow)

## App State Variables

Configurale in **FlutterFlow > App State** nel pannello sinistro.

### Variabili Persistenti (salvate tra sessioni)

| Nome                    | Tipo     | Default      | Persistente | Descrizione                          |
|-------------------------|----------|-------------|-------------|--------------------------------------|
| selectedCityId          | String   | ''          | Si          | ID citta attiva in Firestore         |
| selectedCityName        | String   | ''          | Si          | Nome citta per display               |
| selectedSectorId        | String   | ''          | No          | Settore attualmente selezionato      |
| projectionYear          | int      | 2035        | Si          | Anno target predizione               |
| systemTrackingEnabled   | bool     | true        | Si          | Tracking globale attivo              |
| entropySeed             | double   | 5.0         | Si          | Livello entropy (0-100)              |
| realityBufferMonths     | int      | 12          | Si          | Reality buffer in mesi (0-60)        |
| nullZoneDesignatorOn    | bool     | false       | Si          | Null zones attive                    |
| darkModeOnly            | bool     | true        | Si          | Sempre dark (non modificabile)       |

### Variabili Runtime (non persistenti)

| Nome                    | Tipo          | Default | Descrizione                           |
|-------------------------|---------------|---------|---------------------------------------|
| efficiencyScore         | double        | 0.0     | Metrica efficienza corrente           |
| sovereigntyScore        | double        | 0.0     | Metrica sovranita corrente            |
| resilienceScore         | double        | 0.0     | Metrica resilienza corrente           |
| predictabilityScore     | double        | 0.0     | Metrica predittibilita corrente       |
| activeAlertLevel        | String        | 'nominal' | 'nominal'\|'warning'\|'critical'    |
| activeAlertTitle        | String        | ''      | Titolo alert corrente                 |
| activeAlertMessage      | String        | ''      | Messaggio alert corrente              |
| systemLogs              | JSON (List)   | []      | Log recenti per display veloce        |
| currentLatency          | int           | 0       | Latenza sistema in ms                 |
| lastDataRefresh         | DateTime      | now     | Ultimo aggiornamento dati             |
| isLoading               | bool          | false   | Flag caricamento globale              |

## Come Configurare in FlutterFlow

### Passo 1: Crea le variabili

1. Apri il tuo progetto FlutterFlow
2. Nel pannello sinistro, clicca **App State**
3. Per ogni variabile della tabella sopra:
   - Clicca **+ Add State Variable**
   - Inserisci nome, tipo, e valore default
   - Seleziona "Persisted" se indicato come Si

### Passo 2: Inizializzazione

Nella pagina SplashBootPage, nel **On Page Load** action:

```
1. Se AppState.selectedCityId == '':
   → Mostra dialog selezione citta (prima volta)

2. Altrimenti:
   → Carica dati citta da Firestore
   → Calcola metriche sistema
   → Aggiorna AppState.efficiencyScore, etc.
   → Naviga a Dashboard
```

### Passo 3: Aggiornamento metriche

Dopo ogni modifica ai parametri (entropy, buffer, null zones):

```
1. Custom Action: calculateSovereignty(...)
   → Aggiorna AppState.sovereigntyScore

2. Custom Action: checkFreedomRisk(...)
   → Aggiorna AppState.activeAlertLevel
   → Aggiorna AppState.activeAlertTitle
   → Aggiorna AppState.activeAlertMessage
```

## Page State Variables

Ogni pagina ha le proprie variabili locali. Configurale in
**Page > Local State** per ogni pagina.

### DashboardPage State

| Nome              | Tipo          | Default |
|-------------------|---------------|---------|
| sectors           | JSON (List)   | []      |
| cityMetrics       | JSON          | {}      |
| isRefreshing      | bool          | false   |

### SectorMapPage State

| Nome              | Tipo          | Default        |
|-------------------|---------------|----------------|
| selectedOverlay   | String        | 'sovereignty'  |
| showNullZones     | bool          | false          |
| isSearching       | bool          | false          |
| searchQuery       | String        | ''             |
| activeSectorData  | JSON          | null           |
| mapZoom           | double        | 12.0           |

### NeighborhoodAnalysisPage State

| Nome              | Tipo          | Default |
|-------------------|---------------|---------|
| sectorData        | JSON          | {}      |
| historicalData    | JSON (List)   | []      |
| cityComparison    | JSON          | {}      |
| riskAssessment    | JSON          | {}      |
| selectedTrendMetric | String      | 'population' |

### PredictionEnginePage State

| Nome              | Tipo          | Default     |
|-------------------|---------------|-------------|
| selectedModel     | String        | 'composite' |
| toYear            | int           | 2035        |
| selectedMetric    | String        | 'population'|
| isCalculating     | bool          | false       |
| predictionResults | JSON          | null        |
| alerts            | JSON (List)   | []          |

### InterventionLayerPage State

| Nome              | Tipo          | Default |
|-------------------|---------------|---------|
| previewEntropy    | double        | 5.0     |
| previewBuffer     | int           | 12      |
| previewNullZones  | bool          | false   |
| impactPreview     | JSON          | null    |
| hasChanges        | bool          | false   |

### SystemLogPage State

| Nome              | Tipo          | Default |
|-------------------|---------------|---------|
| activeFilter      | String        | null    |
| isPaused          | bool          | false   |
| logEntries        | JSON (List)   | []      |
