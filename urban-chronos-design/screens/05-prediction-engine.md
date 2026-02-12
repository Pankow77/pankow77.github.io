# URBAN_CHRONOS v2.0 — Prediction Engine Page

## Scopo
Motore predittivo interattivo che proietta lo sviluppo del quartiere
nel futuro, con modelli multipli, timeline visiva, e impatto sulla
sovranita.

## Parametri in Ingresso
- `sectorId` (String, opzionale — se null, predizione globale citta)
- `cityId` (String, obbligatorio)

## Layout

```
┌─────────────────────────────────────────┐
│ ← PREDICTION ENGINE          [SAVE 💾] │
│─────────────────────────────────────────│
│                                          │
│ ┌─ TARGET ────────────────────────────┐ │
│ │ SECTOR_7G // WEST DISTRICT          │ │
│ │ Baseline year: 2024                  │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ ┌─ MODEL SELECTION ───────────────────┐ │
│ │ [LINEAR] [EXPONENTIAL] [ENTROPY]    │ │
│ │ [■ COMPOSITE]                        │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ ┌─ PROJECTION RANGE ─────────────────┐ │
│ │                                      │ │
│ │ 2024 ────────●──────────────── 2050 │ │
│ │              2035                     │ │
│ │                                      │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ ┌─ PREDICTION TIMELINE ───────────────┐ │
│ │ [POP] [INCOME] [HOME] [SOVEREIGNTY] │ │
│ │                                      │ │
│ │  ▲                        ╱╱╱       │ │
│ │  │              ╱‾‾‾‾╱╱╱╱           │ │
│ │  │         ╱‾‾‾╱                    │ │
│ │  │    ╱‾‾‾╱                         │ │
│ │  │ ──╱                              │ │
│ │  └──────────────────────────── ▶    │ │
│ │  2024  2028  2032  2036  2040       │ │
│ │                                      │ │
│ │  ── Linear  -- Expon.               │ │
│ │  ·· Entropy ━━ Composite            │ │
│ │  ░░ Confidence interval (±σ)        │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ ┌─ PROJECTED METRICS (2035) ──────────┐ │
│ │                                      │ │
│ │ POPULATION        MEDIAN INCOME      │ │
│ │ 58,400            $68,200            │ │
│ │ (+29% from 2024)  (+30% from 2024)  │ │
│ │ Confidence: 72%   Confidence: 65%    │ │
│ │                                      │ │
│ │ HOME VALUE        UNEMPLOYMENT       │ │
│ │ $520,000          3.8%               │ │
│ │ (+35% from 2024)  (-27% from 2024)  │ │
│ │ Confidence: 58%   Confidence: 61%    │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ ┌─ FUTURE SYSTEM METRICS ─────────────┐ │
│ │                                      │ │
│ │        EFFICIENCY                    │ │
│ │           94%                        │ │
│ │     ╱‾‾‾‾‾‾‾╲                      │ │
│ │ SOV │        │ RES                  │ │
│ │ 18% │        │ 65%                  │ │
│ │     ╲_______╱                       │ │
│ │      PREDICTABILITY                  │ │
│ │           91%                        │ │
│ │                                      │ │
│ │ ⚠ CRITICAL: Sovereignty projected   │ │
│ │   to drop below 20% by 2033.        │ │
│ │   Algorithmic lock-in imminent.      │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ ┌─ ALERTS TIMELINE ───────────────────┐ │
│ │                                      │ │
│ │ 2028 ⚠ Gentrification threshold     │ │
│ │        crossed. Home values +25%.    │ │
│ │                                      │ │
│ │ 2031 ▲ Population peak projected.   │ │
│ │        Density exceeds capacity.     │ │
│ │                                      │ │
│ │ 2033 ⛔ Sovereignty critical.        │ │
│ │        Algorithmic lock-in.          │ │
│ │        "Freedom is a null pointer."  │ │
│ │                                      │ │
│ │ 2038 ⚠ Infrastructure stress >80%.  │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ [◈ ADJUST INTERVENTION PARAMETERS]      │
│                                          │
└─────────────────────────────────────────┘
```

## Specifiche Widget FlutterFlow

### Model Selection

```
Container:
  background: #111111
  border: 1px solid #222222
  padding: 12px 16px
  child: Column
    ├── SectionHeader "MODEL SELECTION"
    ├── SizedBox(8)
    └── Wrap(spacing: 8, runSpacing: 8)
          children:
            ├── ChipButton("LINEAR", selectedModel == 'linear')
            ├── ChipButton("EXPONENTIAL", selectedModel == 'exponential')
            ├── ChipButton("ENTROPY", selectedModel == 'entropy')
            └── ChipButton("■ COMPOSITE", selectedModel == 'composite')
                  // Composite ha bordo piu spesso, e il default

  onSelect: → aggiorna selectedModel, ricalcola predizioni
```

### Projection Range Slider

```
Container:
  background: #111111
  border: 1px solid #222222
  padding: 16px
  child: Column
    ├── SectionHeader "PROJECTION RANGE"
    ├── SizedBox(12)
    ├── RangeSlider
    │     min: 2024
    │     max: 2050
    │     values: RangeValues(2024, toYear)
    │     activeColor: #00ff41
    │     inactiveColor: #222222
    │     thumbShape: square, 16x16, #00ff41
    │     label: year
    ├── SizedBox(4)
    └── Row(mainAxisAlignment: spaceBetween)
          ├── Text "2024"
          │     style: Courier New, 10px, #555555
          ├── Text "${toYear}"
          │     style: Orbitron, 14px, Bold, #00ff41
          └── Text "2050"
                style: Courier New, 10px, #555555

  onChange: → aggiorna toYear, ricalcola predizioni
```

### Prediction Timeline Chart

```
Container:
  background: #111111
  border: 1px solid #222222
  padding: 16px
  child: Column
    ├── SectionHeader "PREDICTION TIMELINE"
    ├── SizedBox(8)
    ├── Row (metric selector chips)
    │     ├── ChipButton("POP")
    │     ├── ChipButton("INCOME")
    │     ├── ChipButton("HOME")
    │     └── ChipButton("SOVEREIGNTY")
    ├── SizedBox(12)
    ├── Container(height: 250)
    │     child: LineChart (fl_chart)
    │       datasets: [
    │         // Dati storici (solidi)
    │         LineData(historicalPoints, color: #888888, width: 1),
    │         // Predizione Linear
    │         LineData(linearPoints, color: #00ff41, width: 1.5, dashed: short),
    │         // Predizione Exponential
    │         LineData(exponentialPoints, color: #00ffff, width: 1.5, dashed: long),
    │         // Predizione Entropy
    │         LineData(entropyPoints, color: #ffaa00, width: 1.5, dotted),
    │         // Predizione Composite (evidenziata)
    │         LineData(compositePoints, color: #00ff41, width: 2.5),
    │         // Confidence interval (area ombreggiata)
    │         AreaData(upperBound, lowerBound, color: #00ff4110),
    │       ]
    │       xAxis: anni
    │       yAxis: valore metrica
    │       gridColor: #1a1a1a
    │       verticalLine: anno corrente (linea tratteggiata #555555)
    │       labelVertical: "NOW" sopra la linea corrente
    │
    ├── SizedBox(8)
    └── Wrap(spacing: 12)
          ├── LegendItem(solid, #00ff41, "Composite")
          ├── LegendItem(dashed, #00ff41, "Linear")
          ├── LegendItem(dashed, #00ffff, "Exponential")
          ├── LegendItem(dotted, #ffaa00, "Entropy")
          └── LegendItem(area, #00ff4110, "Confidence ±σ")
```

### Projected Metrics Grid

```
Container:
  background: #111111
  border: 1px solid #222222
  padding: 16px
  child: Column
    ├── Row
    │     ├── SectionHeader "PROJECTED METRICS"
    │     └── Text "(${toYear})"
    │           style: Orbitron, 10px, #00ff41
    ├── SizedBox(12)
    └── GridView(crossAxisCount: 2, childAspectRatio: 1.8)
          children: [
            ProjectedMetricTile(
              "POPULATION", "58,400",
              "+29% from 2024", 0.72
            ),
            ProjectedMetricTile(
              "MEDIAN INCOME", "$68,200",
              "+30% from 2024", 0.65
            ),
            ProjectedMetricTile(
              "HOME VALUE", "$520,000",
              "+35% from 2024", 0.58
            ),
            ProjectedMetricTile(
              "UNEMPLOYMENT", "3.8%",
              "-27% from 2024", 0.61
            ),
          ]
```

### ProjectedMetricTile (componente)

```
Componente: ProjectedMetricTile
Parametri:
  - label: String
  - value: String
  - changeText: String
  - confidence: double (0-1)

Widget:
  Container
    padding: 12px
    child: Column(crossAxisAlignment: start)
      ├── Text(label)
      │     style: Orbitron, 8px, #555555, uppercase
      ├── SizedBox(4)
      ├── Text(value)
      │     style: Orbitron, 18px, Bold, #00ffff  // cyan per proiettato
      ├── SizedBox(2)
      ├── Text(changeText)
      │     style: Courier New, 10px, #888888
      ├── SizedBox(4)
      └── Row
            ├── Text "Confidence: "
            │     style: Courier New, 9px, #555555
            └── Text "${(confidence * 100).toInt()}%"
                  style: Courier New, 9px,
                         confidence > 0.7 ? #00ff41 :
                         confidence > 0.4 ? #ffaa00 : #ff0040
```

### Future System Metrics (Radar Chart)

```
Stessa struttura del dashboard radar chart, ma con:
  - Dati: metriche PROIETTATE (non correnti)
  - Colore fill: #00ffff20 (cyan, per distinguere da corrente)
  - Colore border: #00ffff
  - Alert sotto il radar per sovereignty critico
```

### Alerts Timeline

```
Container:
  background: #111111
  border: 1px solid #222222
  padding: 16px
  child: Column
    ├── SectionHeader "ALERTS TIMELINE"
    ├── SizedBox(12)
    └── ListView
          children: alerts.map((alert) =>
            AlertTimelineItem(alert)
          )
```

### AlertTimelineItem (componente)

```
Componente: AlertTimelineItem
Parametri:
  - year: int
  - severity: String (warning, critical, info)
  - title: String
  - description: String

Widget:
  IntrinsicHeight
    child: Row
      ├── Column(children: [
      │     Container(width: 2, flex: 1, color: #222222),  // linea verticale
      │     Container(12x12, border: 2px [colore], borderRadius: 6),  // dot
      │     Container(width: 2, flex: 1, color: #222222),  // linea verticale
      │   ])
      ├── SizedBox(12)
      └── Column(crossAxisAlignment: start)
            ├── Text("${year}")
            │     style: Orbitron, 12px, Bold, [colore severity]
            ├── SizedBox(2)
            ├── Text(title)
            │     style: Courier New, 12px, #e0e0e0
            ├── SizedBox(2)
            └── Text(description)
                  style: Courier New, 11px, #888888, italic

Icone severity:
  warning: ⚠ (#ffaa00)
  critical: ⛔ (#ff0040)
  info: ▲ (#00ffff)
```

## Page State

```
PredictionEnginePageState:
  selectedModel: String = 'composite'
  toYear: int = 2035
  selectedMetric: String = 'population'
  isCalculating: bool = false
  predictionResults: PredictionResult?
  timelineData: Map<String, List<DataPoint>>  // per modello
  alerts: List<AlertData>
```

## Azioni

### On Page Load
```
1. Fetch sector data (se sectorId fornito)
2. Fetch historical Census data (serie temporale)
3. Custom Action: runPredictionEngine(
     historicalData, model: 'composite',
     toYear: 2035, entropySeed, realityBuffer
   )
4. Popola chart e metriche proiettate
5. Custom Action: generateAlerts(predictionResults)
6. Log: "[INFO] Prediction engine active. Model: composite. Range: 2024-2035."
```

### On Model Change
```
1. Aggiorna selectedModel
2. Se 'composite': calcola tutti e 3 i modelli + media
3. Altrimenti: calcola solo il modello selezionato
4. Aggiorna chart con nuovi dati
5. Ricalcola metriche proiettate e alerts
```

### On Year Change (slider)
```
1. Aggiorna toYear
2. Ricalcola predizioni fino a nuovo anno
3. Aggiorna metriche proiettate per l'anno selezionato
4. Rigenera alerts
```

### Save Prediction
```
1. Crea documento in Firestore: predictions/
2. Salva tutti i parametri e risultati
3. Aggiorna user.savedAnalyses
4. Mostra SnackBar: "Prediction saved."
5. Log: "[INFO] Prediction saved. ID: {predId}"
```

### Run Prediction (pulsante)
```
1. isCalculating = true
2. Mostra overlay con animazione "CALCULATING..."
3. Custom Action: runPredictionEngine(...)
4. Wait minimo 1.5s (per effetto drammatico)
5. isCalculating = false
6. Aggiorna tutti i widget
7. Log: "[INFO] Prediction complete. Confidence: {n}%."
```
