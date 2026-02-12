# URBAN_CHRONOS v2.0 — Neighborhood Analysis Page

## Scopo
Analisi dettagliata di un singolo settore/quartiere con dati storici,
metriche correnti, confronto con la media cittadina, e fattori di rischio.

## Parametri in Ingresso
- `sectorId` (String, obbligatorio)
- `cityId` (String, obbligatorio)

## Layout

```
┌─────────────────────────────────────────┐
│ ← NEIGHBORHOOD ANALYSIS                 │
│─────────────────────────────────────────│
│                                          │
│ ┌─ SECTOR_7G // WEST DISTRICT ────────┐ │
│ │ Classification: MIXED                │ │
│ │ Census Tracts: 12 | Area: 4.2 km²   │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ ┌─ CURRENT METRICS ───────────────────┐ │
│ │                                      │ │
│ │ POPULATION        MEDIAN INCOME      │ │
│ │ 45,230            $52,400            │ │
│ │ ▲ +3.2% vs 2020   ▲ +8.1% vs 2020  │ │
│ │                                      │ │
│ │ HOME VALUE        RENT               │ │
│ │ $385,000          $1,850/mo          │ │
│ │ ▲ +22% vs 2020    ▲ +18% vs 2020   │ │
│ │                                      │ │
│ │ UNEMPLOYMENT      EDUCATION (BA+)    │ │
│ │ 5.2%              42.3%              │ │
│ │ ▼ -1.1% vs 2020   ▲ +4.2% vs 2020  │ │
│ │                                      │ │
│ │ MEDIAN AGE        VACANCY RATE       │ │
│ │ 34.5 yrs          6.2%              │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ ┌─ HISTORICAL TRENDS ─────────────────┐ │
│ │ [POP] [INCOME] [HOME] [UNEMP]       │ │
│ │                                      │ │
│ │  ▲                                   │ │
│ │  │     ╱‾‾‾‾‾╲                     │ │
│ │  │   ╱‾       ‾──────╱‾‾           │ │
│ │  │ ╱‾                               │ │
│ │  └──────────────────────────── ▶     │ │
│ │  2010  2014  2018  2020  2024        │ │
│ │                                      │ │
│ │  ── Sector  ·· City Average          │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ ┌─ VS CITY AVERAGE ───────────────────┐ │
│ │                                      │ │
│ │ POPULATION    ████████░░  +12%       │ │
│ │ INCOME        ██████░░░░  -3%        │ │
│ │ HOME VALUE    █████████░  +28%       │ │
│ │ EDUCATION     ███████░░░  +8%        │ │
│ │ UNEMPLOYMENT  ███░░░░░░░  -42%       │ │
│ │ TRANSIT       ██████████  +35%       │ │
│ │                                      │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ ┌─ RISK ASSESSMENT ───────────────────┐ │
│ │                                      │ │
│ │ GENTRIFICATION   ████████░░  78%  ⚠ │ │
│ │ FLOOD RISK       ██░░░░░░░░  15%    │ │
│ │ ECONOMIC DECLINE ███░░░░░░░  25%    │ │
│ │ INFRA. STRESS    █████░░░░░  52%  ⚠ │ │
│ │                                      │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ ┌─ SOVEREIGNTY ANALYSIS ──────────────┐ │
│ │                                      │ │
│ │ SOVEREIGNTY INDEX: 31%               │ │
│ │ ▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ │
│ │                                      │ │
│ │ "System too efficient. Freedom at    │ │
│ │  risk. Deterministic pathways        │ │
│ │  dominate 69% of urban decisions."   │ │
│ │                                      │ │
│ │ RECOMMENDED: Increase entropy to     │ │
│ │ 15% and reality buffer to 18 months. │ │
│ │                                      │ │
│ │ [ADJUST INTERVENTION ◈]              │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ [ ▲ RUN PREDICTION FOR THIS SECTOR ]    │
│                                          │
└─────────────────────────────────────────┘
```

## Specifiche Widget FlutterFlow

### Sector Header

```
Container:
  background: #111111
  border: 1px solid #222222
  borderLeft: 3px solid [colore sovereignty]
  padding: 16px
  child: Column
    ├── Row
    │     ├── Text(sectorCode)
    │     │     style: Orbitron, 18px, Bold, #00ff41
    │     ├── Text " // "
    │     │     style: 18px, #555555
    │     └── Text(sectorName)
    │           style: Orbitron, 18px, #e0e0e0
    ├── SizedBox(8)
    └── Row
          ├── LabelChip("Classification", sector.classification)
          ├── SizedBox(8)
          ├── Text "Tracts: ${sector.tractIds.length}"
          │     style: Courier New, 11px, #888888
          ├── Text " | "
          ├── Text "Area: ${sector.area} km²"
                style: Courier New, 11px, #888888
```

### Current Metrics Grid

```
Container:
  background: #111111
  border: 1px solid #222222
  padding: 16px
  child: Column
    ├── SectionHeader "CURRENT METRICS"
    ├── SizedBox(12)
    └── GridView(crossAxisCount: 2, childAspectRatio: 2.2)
          children: [
            MetricTile("POPULATION", "45,230", "+3.2%", true),
            MetricTile("MEDIAN INCOME", "$52,400", "+8.1%", true),
            MetricTile("HOME VALUE", "$385,000", "+22%", true),
            MetricTile("RENT", "$1,850/mo", "+18%", true),
            MetricTile("UNEMPLOYMENT", "5.2%", "-1.1%", false),
            MetricTile("EDUCATION (BA+)", "42.3%", "+4.2%", true),
            MetricTile("MEDIAN AGE", "34.5 yrs", null, null),
            MetricTile("VACANCY", "6.2%", null, null),
          ]
```

### MetricTile (componente)

```
Componente: MetricTile
Parametri:
  - label: String
  - value: String
  - changePercent: String? (es. "+3.2%")
  - isPositive: bool? (per colore freccia)

Widget:
  Container
    padding: 12px
    child: Column(crossAxisAlignment: start)
      ├── Text(label)
      │     style: Orbitron, 8px, #555555, uppercase, letterSpacing: 1
      ├── SizedBox(4)
      ├── Text(value)
      │     style: Orbitron, 18px, Bold, #00ff41
      └── if changePercent != null:
            Row
              ├── Icon(isPositive ? arrow_up : arrow_down, 10)
              │     color: isPositive ? #00ff41 : #ff0040
              ├── SizedBox(2)
              └── Text("${changePercent} vs 2020")
                    style: Courier New, 10px,
                           isPositive ? #00ff41 : #ff0040
```

### Historical Trends Chart

```
Container:
  background: #111111
  border: 1px solid #222222
  padding: 16px
  child: Column
    ├── SectionHeader "HISTORICAL TRENDS"
    ├── SizedBox(8)
    ├── Row (tab selector)
    │     ├── ChipButton("POP", selected: true)
    │     ├── ChipButton("INCOME")
    │     ├── ChipButton("HOME")
    │     └── ChipButton("UNEMP")
    ├── SizedBox(12)
    ├── Container(height: 200)
    │     child: LineChart (fl_chart)
    │       lines: [
    │         LineSeries(sectorData, color: #00ff41, width: 2),
    │         LineSeries(cityAvgData, color: #888888, width: 1, dashed)
    │       ]
    │       xAxis: anni (2010-2024)
    │       yAxis: valore metrica selezionata
    │       gridColor: #1a1a1a
    │       backgroundColor: transparent
    │       tooltipBg: #222222
    │       tooltipText: #00ff41
    ├── SizedBox(8)
    └── Row(legend)
          ├── LegendItem(solid line, #00ff41, "Sector")
          └── LegendItem(dashed line, #888888, "City Average")
```

### ChipButton (componente)

```
Componente: ChipButton
Parametri:
  - label: String
  - isSelected: bool

Widget:
  GestureDetector
    child: Container
      padding: 6px 12px
      background: isSelected ? #00ff4120 : transparent
      border: 1px solid (isSelected ? #00ff41 : #333333)
      child: Text(label)
        style: Orbitron, 10px, isSelected ? #00ff41 : #888888
    onTap: → aggiorna selezione, ricalcola chart
```

### VS City Average (Bar Chart orizzontale)

```
Container:
  background: #111111
  border: 1px solid #222222
  padding: 16px
  child: Column
    ├── SectionHeader "VS CITY AVERAGE"
    ├── SizedBox(12)
    └── Column
          children: metrics.map((m) =>
            ComparisonBar(m.label, m.sectorValue, m.cityAvg, m.diff)
          )
```

### ComparisonBar (componente)

```
Componente: ComparisonBar
Parametri:
  - label: String
  - percentage: double (0-100, normalizzato)
  - diffText: String (es. "+12%")

Widget:
  Padding(vertical: 4)
    child: Row
      ├── SizedBox(width: 110)
      │     child: Text(label)
      │       style: Courier New, 11px, #888888
      ├── Expanded
      │     child: Stack
      │       ├── Container(height: 12, bg: #1a1a1a)  // track
      │       └── FractionallySizedBox(widthFactor: percentage/100)
      │             child: Container(height: 12, bg: #00ff41)
      ├── SizedBox(8)
      └── SizedBox(width: 45)
            child: Text(diffText)
              style: Courier New, 11px,
                     diff > 0 ? #00ff41 : #ff0040
```

### Risk Assessment

```
Container:
  background: #111111
  border: 1px solid #222222
  padding: 16px
  child: Column
    ├── SectionHeader "RISK ASSESSMENT"
    ├── SizedBox(12)
    ├── RiskBar("GENTRIFICATION", 78, warning)
    ├── RiskBar("FLOOD RISK", 15, nominal)
    ├── RiskBar("ECONOMIC DECLINE", 25, nominal)
    └── RiskBar("INFRA. STRESS", 52, warning)
```

### RiskBar (componente)

```
Componente: RiskBar
Parametri:
  - label: String
  - value: int (0-100)
  - severity: String

Widget:
  Padding(vertical: 6)
    child: Row
      ├── SizedBox(width: 130)
      │     child: Text(label)
      │       style: Courier New, 11px, #888888
      ├── Expanded
      │     child: Stack
      │       ├── Container(height: 12, bg: #1a1a1a)
      │       └── FractionallySizedBox(widthFactor: value/100)
      │             child: Container(height: 12, bg: [colore severity])
      ├── SizedBox(8)
      ├── Text("${value}%")
      │     style: Courier New, 11px, [colore severity]
      └── if severity != 'nominal':
            Text(" ⚠")
              style: 11px
```

### Sovereignty Analysis Card

```
Container:
  background: #111111
  border: 1px solid [colore sovereignty]
  padding: 16px
  child: Column
    ├── SectionHeader "SOVEREIGNTY ANALYSIS"
    ├── SizedBox(8)
    ├── Row
    │     ├── Text "SOVEREIGNTY INDEX: "
    │     │     style: Orbitron, 14px, #888888
    │     └── Text "${sovereignty}%"
    │           style: Orbitron, 14px, Bold, [colore]
    ├── SizedBox(8)
    ├── SovereigntyBar(sovereignty) // barra piena
    ├── SizedBox(12)
    ├── Text(sovereigntyAnalysisText)
    │     style: Courier New, 12px, #e0e0e0, italic
    ├── SizedBox(12)
    ├── Text(recommendationText)
    │     style: Courier New, 12px, #ffaa00
    ├── SizedBox(12)
    └── OutlinedButton "ADJUST INTERVENTION ◈"
          style: cyberpunk, colore amber
          onTap: → Navigate to InterventionLayerPage
```

### Bottom CTA Button

```
Container
  width: double.infinity
  padding: 16px
  child: ElevatedButton
    "▲ RUN PREDICTION FOR THIS SECTOR"
    style: full-width cyberpunk button
    background: transparent
    border: 2px solid #00ffff
    text: Orbitron, 12px, #00ffff
    onTap: → Navigate to PredictionEnginePage(sectorId)
```

## Azioni On Page Load

```
1. Fetch sector document: cities/{cityId}/sectors/{sectorId}
2. Fetch city aggregate metrics (per confronto)
3. Fetch historical data (Census cache per anni multipli)
4. Custom Action: calculateChangePercents(current, historical)
5. Custom Action: calculateCityComparison(sector, cityAvg)
6. Custom Action: assessRisks(sector)
7. Custom Action: analyzeSovereignty(sector, appState)
8. Popola tutti i widget con i dati calcolati
9. Log: "[INFO] Analysis loaded for {sectorCode}."
```
