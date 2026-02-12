# URBAN_CHRONOS v2.0 — Dashboard Page

## Scopo
Panoramica principale con metriche vitali del sistema, stato dei settori,
e accesso rapido alle funzionalita principali.

## Layout (Mobile-first)

```
┌─────────────────────────────────────────┐
│ ☰  URBAN_CHRONOS v2.0        ● ONLINE  │
│─────────────────────────────────────────│
│                                          │
│ ┌─ CITY SELECTOR ─────────────────────┐ │
│ │ 📍 New York, NY          ▼         │ │
│ └─────────────────────────────────────┘ │
│                                          │
│ ┌─ SYSTEM VITALITY METRICS ───────────┐ │
│ │                                      │ │
│ │        EFFICIENCY                    │ │
│ │           89%                        │ │
│ │     ╱‾‾‾‾‾‾‾╲                      │ │
│ │ SOV │ RADAR  │ RES                  │ │
│ │ 31% │ CHART  │ 72%                  │ │
│ │     ╲_______╱                       │ │
│ │      PREDICTABILITY                  │ │
│ │           85%                        │ │
│ │                                      │ │
│ │ ── OPTIMIZED PATH (Algorithm)        │ │
│ │ ·· DIVERGENT PATH (Human)            │ │
│ │ ░░ NULL ZONE (Untracked)             │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ ┌─ SECTOR OVERVIEW ───────────────────┐ │
│ │ SECTOR_1A  ■ POP: 45K  SOV: 67%    │ │
│ │ SECTOR_2B  ■ POP: 32K  SOV: 54%    │ │
│ │ SECTOR_3C  ▲ POP: 28K  SOV: 23%    │ │
│ │ SECTOR_4D  ■ POP: 51K  SOV: 71%    │ │
│ │ SECTOR_5E  ▲ POP: 19K  SOV: 15%    │ │
│ │            [VIEW ALL SECTORS →]      │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ ┌─ QUICK STATS ───────────────────────┐ │
│ │ TOTAL POP     MEDIAN INC   GROWTH   │ │
│ │ 1.2M          $58,400      +2.3%    │ │
│ │                                      │ │
│ │ UNEMPLOYMENT  VACANCY     AQI       │ │
│ │ 4.8%          6.2%        42        │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ ┌─ SYSTEM STATUS ─────────────────────┐ │
│ │ CORE: ONLINE  LATENCY: 12ms        │ │
│ │ CENSUS: ✓     BLS: ✓     EPA: ✓    │ │
│ │ Last refresh: 2 hours ago           │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ ┌─ LATEST ALERT ──────────────────────┐ │
│ │ ⚠ LOSSY URBANISM                    │ │
│ │ System too efficient in SECTOR_3C.  │ │
│ │ Freedom at risk. Sovereignty: 23%   │ │
│ │ [INVESTIGATE →]                      │ │
│ └──────────────────────────────────────┘ │
│                                          │
└─────────────────────────────────────────┘
│  HOME  │  MAP   │ PREDICT │ SYSTEM  │
```

## Specifiche Widget FlutterFlow

### AppBar

```
AppBar:
  backgroundColor: #0a0a0a
  elevation: 0
  leading: IconButton (hamburger ☰) → apre Drawer
  title: Row
    ├── Text "URBAN_CHRONOS"
    │     style: Orbitron, 16px, Bold, #00ff41
    │     letterSpacing: 2px
    └── Text " v2.0"
          style: Orbitron, 12px, #888888
  actions:
    └── Row
          ├── Container(8x8, borderRadius: 4, color: #00ff41) // dot
          ├── SizedBox(4)
          └── Text "ONLINE"
                style: Orbitron, 10px, #00ff41
```

### City Selector

```
Container:
  background: #111111
  border: 1px solid #222222
  padding: 12px 16px
  child: Row
    ├── Icon(location, 16, #00ffff)
    ├── SizedBox(8)
    ├── Text(selectedCityName)
    │     style: Orbitron, 14px, #e0e0e0
    ├── Spacer()
    └── Icon(chevron_down, 16, #888888)

  onTap: → mostra BottomSheet con lista citta
         → oppure navigazione a pagina ricerca citta
```

### System Vitality Metrics (Radar Chart)

```
Container:
  background: #111111
  border: 1px solid #222222
  padding: 16px
  child: Column
    ├── SectionHeader "SYSTEM VITALITY METRICS"
    │
    ├── SizedBox(16)
    │
    ├── Container(height: 220)
    │     child: CustomWidget → RadarChart (fl_chart)
    │       data: [efficiency, sovereignty, resilience, predictability]
    │       maxValue: 100
    │       fillColor: #00ff4120
    │       borderColor: #00ff41
    │       gridColor: #222222
    │       labelColor: #888888
    │
    ├── SizedBox(12)
    │
    ├── Row(mainAxisAlignment: spaceEvenly)
    │     ├── MetricBadge("EFFICIENCY", 89, nominal)
    │     ├── MetricBadge("SOVEREIGNTY", 31, warning)
    │     ├── MetricBadge("RESILIENCE", 72, nominal)
    │     └── MetricBadge("PREDICT.", 85, nominal)
    │
    ├── SizedBox(16)
    │
    └── LegendRow
          ├── LegendItem(square, #00ff41, "OPTIMIZED PATH (Algorithm)")
          ├── LegendItem(circle, #ffaa00, "DIVERGENT PATH (Human)")
          └── LegendItem(hatched, #ff0040, "NULL ZONE (Untracked)")
```

### MetricBadge (componente riutilizzabile)

```
Componente: MetricBadge
Parametri:
  - label: String
  - value: double
  - status: enum (nominal, warning, critical)

Widget:
  Column(crossAxisAlignment: center)
    ├── Text(label)
    │     style: Orbitron, 8px, uppercase, #888888
    │     letterSpacing: 1px
    ├── SizedBox(4)
    └── Container
          padding: 4px 8px
          border: 1px solid [colore per status]
          background: [colore per status con alpha 15%]
          child: Text("${value.toInt()}%")
            style: Orbitron, 14px, Bold, [colore per status]

Colori per status:
  nominal:  #00ff41
  warning:  #ffaa00
  critical: #ff0040
```

### Sector Overview (Lista settori)

```
Container:
  background: #111111
  border: 1px solid #222222
  padding: 16px
  child: Column
    ├── SectionHeader "SECTOR OVERVIEW"
    ├── SizedBox(12)
    ├── ListView.builder
    │     itemCount: min(5, sectors.length) // mostra max 5
    │     itemBuilder: SectorListItem
    ├── SizedBox(8)
    └── TextButton "VIEW ALL SECTORS →"
          style: Orbitron, 12px, #00ffff
          onTap: → Navigate to SectorMapPage
```

### SectorListItem (componente)

```
Componente: SectorListItem
Parametri:
  - sectorCode: String
  - population: int
  - sovereignty: double

Widget:
  Container
    padding: 10px 0
    border-bottom: 1px solid #1a1a1a
    child: Row
      ├── Container(10x10, color: [colore sovereignty])  // indicatore
      ├── SizedBox(12)
      ├── Text(sectorCode)
      │     style: Courier New, 13px, #e0e0e0
      ├── Spacer()
      ├── Text("POP: ${formatK(population)}")
      │     style: Courier New, 11px, #888888
      ├── SizedBox(16)
      └── Text("SOV: ${sovereignty.toInt()}%")
            style: Courier New, 11px, [colore sovereignty]

    onTap: → Navigate to NeighborhoodAnalysisPage(sectorId)
```

### Quick Stats Grid

```
Container:
  background: #111111
  border: 1px solid #222222
  padding: 16px
  child: Column
    ├── SectionHeader "QUICK STATS"
    ├── SizedBox(12)
    ├── Row (prima riga - 3 colonne)
    │     ├── StatCell("TOTAL POP", "1.2M")
    │     ├── StatCell("MEDIAN INC", "$58,400")
    │     └── StatCell("GROWTH", "+2.3%")
    ├── SizedBox(8)
    └── Row (seconda riga - 3 colonne)
          ├── StatCell("UNEMPLOY.", "4.8%")
          ├── StatCell("VACANCY", "6.2%")
          └── StatCell("AQI", "42")
```

### StatCell (componente)

```
Componente: StatCell
Parametri:
  - label: String
  - value: String

Widget:
  Expanded
    child: Column(crossAxisAlignment: center)
      ├── Text(label)
      │     style: Orbitron, 8px, #555555, uppercase
      │     letterSpacing: 1px
      ├── SizedBox(4)
      └── Text(value)
            style: Orbitron, 16px, Bold, #00ff41
```

### System Status Bar

```
Container:
  background: #111111
  border: 1px solid #222222
  padding: 12px 16px
  child: Column
    ├── Row
    │     ├── Text "CORE: "
    │     │     style: Courier New, 11px, #888888
    │     ├── Text "ONLINE"
    │     │     style: Courier New, 11px, #00ff41
    │     ├── SizedBox(16)
    │     ├── Text "LATENCY: "
    │     │     style: Courier New, 11px, #888888
    │     └── Text "12ms"
    │           style: Courier New, 11px, #00ff41
    ├── SizedBox(6)
    ├── Row
    │     ├── APIStatusChip("CENSUS", true)
    │     ├── APIStatusChip("BLS", true)
    │     └── APIStatusChip("EPA", true)
    ├── SizedBox(6)
    └── Text "Last refresh: 2 hours ago"
          style: Courier New, 10px, #555555
```

### Latest Alert Card

```
Container:
  background: #111111
  border: 1px solid #ffaa00  // amber per warning
  padding: 16px
  child: Column
    ├── Row
    │     ├── Text "⚠"
    │     │     style: 16px
    │     ├── SizedBox(8)
    │     └── Text "LOSSY URBANISM"
    │           style: Orbitron, 14px, Bold, #ffaa00
    ├── SizedBox(8)
    ├── Text(alertMessage)
    │     style: Courier New, 12px, #e0e0e0
    ├── SizedBox(12)
    └── TextButton "[INVESTIGATE →]"
          style: Orbitron, 11px, #00ffff
          onTap: → Navigate to sector analysis

Varianti bordo:
  warning: #ffaa00
  critical: #ff0040 + animazione pulse
  nominal: #222222 (nascosto o messaggio positivo)
```

## SectionHeader (componente globale)

```
Componente: SectionHeader
Parametri:
  - title: String

Widget:
  Column
    ├── Text(title)
    │     style: Orbitron, 10px, Bold, #888888, uppercase
    │     letterSpacing: 2px
    └── SizedBox(2)
```

## Azioni On Page Load

```
1. Leggi AppState.selectedCityId
2. Se null → mostra City Selector modal
3. Altrimenti:
   a. Fetch sectors da Firestore (cities/{cityId}/sectors)
   b. Calcola metriche aggregate (Custom Action: calculateCityMetrics)
   c. Controlla alerts (Custom Action: checkSystemAlerts)
   d. Aggiorna Page State con i risultati
   e. Log: "[INFO] Dashboard loaded. {n} sectors nominal."
```

## Pull-to-Refresh

```
Azione:
1. Mostra indicatore refresh (colore: #00ff41)
2. Re-fetch dati Census per citta corrente
3. Ricalcola metriche
4. Aggiorna UI
5. Log: "[INFO] Data refreshed. Latency: {n}ms"
```

## Responsive (Tablet/Desktop)

Su schermi larghi (>768px), usa layout a 2 colonne:

```
┌──────────────────┬──────────────────┐
│  VITALITY METRICS│  SECTOR OVERVIEW │
│  (Radar Chart)   │  (Lista completa)│
│                  │                  │
├──────────────────┤                  │
│  QUICK STATS     │                  │
│  (Grid 3x2)     │                  │
├──────────────────┤                  │
│  SYSTEM STATUS   ├──────────────────┤
│                  │  LATEST ALERT    │
└──────────────────┴──────────────────┘
```
