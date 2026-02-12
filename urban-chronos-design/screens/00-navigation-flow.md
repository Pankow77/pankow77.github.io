# URBAN_CHRONOS v2.0 — Navigation Flow

## Struttura Navigazione

```
SplashBootPage (entry point)
  │
  ├─ [boot completo] → DashboardPage (home)
  │                       │
  │                       ├── SectorMapPage
  │                       │     └── NeighborhoodAnalysisPage
  │                       │           └── PredictionEnginePage
  │                       │
  │                       ├── PredictionEnginePage (accesso diretto)
  │                       │
  │                       ├── InterventionLayerPage
  │                       │
  │                       ├── DataSourcesPage
  │                       │
  │                       └── SystemLogPage
  │
  └─ [non autenticato] → LoginPage → DashboardPage
```

## Tipo di Navigazione: Bottom Navigation Bar + Drawer

### Bottom Navigation Bar (4 tab principali)

```
┌─────────┬─────────┬─────────┬─────────┐
│  HOME   │   MAP   │ PREDICT │  SYSTEM │
│   ◫     │   ◉     │   △     │   ≡     │
└─────────┴─────────┴─────────┴─────────┘
```

| Tab     | Icona            | Pagina                | Colore attivo |
|---------|------------------|-----------------------|---------------|
| HOME    | dashboard/grid   | DashboardPage         | --neon-green  |
| MAP     | map/location     | SectorMapPage         | --neon-green  |
| PREDICT | timeline/trending| PredictionEnginePage  | --neon-green  |
| SYSTEM  | terminal/code    | SystemLogPage         | --neon-green  |

### Stile Bottom Nav Bar

```
BottomNavigationBar:
  Background: --bg-secondary (#111111)
  Border-top: 1px solid --border-default (#222222)
  Selected item color: --neon-green (#00ff41)
  Unselected item color: --text-muted (#555555)
  Label style: Orbitron, labelSmall (10px), uppercase
  Letter-spacing: 1.5px
  Type: fixed (non shifting)
  Elevation: 0
```

### Navigation Drawer (menu laterale)

Accessibile tramite hamburger icon o swipe da sinistra.
Contiene le pagine secondarie:

```
┌──────────────────────────────┐
│  URBAN_CHRONOS v2.0          │
│  ─────────────────────────── │
│                              │
│  ◫  DASHBOARD                │
│  ◉  SECTOR MAP               │
│  △  PREDICTION ENGINE        │
│  ◈  INTERVENTION LAYER       │
│  ⚡  DATA SOURCES             │
│  ≡  SYSTEM LOG               │
│                              │
│  ─────────────────────────── │
│  ⚙  SETTINGS                 │
│  ℹ  ABOUT                    │
│                              │
│  ─────────────────────────── │
│  v2.0.0 // HYBRID SYNDICATE │
└──────────────────────────────┘

Drawer:
  Background: --bg-primary (#0a0a0a)
  Width: 280px
  Header: Orbitron, displayMedium, --neon-green
  Items: Orbitron, bodyLarge, --text-primary
  Selected: --neon-green con background --neon-green-glow
  Divider: --border-default
  Footer: labelSmall, --text-muted
```

## Transizioni tra Pagine

| Da → A                      | Tipo Transizione        | Durata |
|-----------------------------|------------------------|--------|
| Splash → Dashboard          | Fade                   | 500ms  |
| Tra tab Bottom Nav           | Nessuna (instant)      | 0ms    |
| Dashboard → Neighborhood     | Slide Right            | 300ms  |
| Map → Neighborhood           | Slide Up (bottom sheet)| 300ms  |
| Qualsiasi → Drawer Page     | Slide Right            | 300ms  |
| Back                        | Slide Left             | 300ms  |

## Parametri Passati tra Pagine

| Da                  | A                     | Parametri                         |
|---------------------|-----------------------|-----------------------------------|
| Dashboard           | NeighborhoodAnalysis  | sectorId, cityId                  |
| SectorMap           | NeighborhoodAnalysis  | sectorId, cityId, fromMap: true   |
| NeighborhoodAnalysis| PredictionEngine      | sectorId, cityId, currentMetrics  |
| Dashboard           | PredictionEngine      | cityId (predizione globale)       |

## Deep Linking (opzionale)

```
/                     → SplashBootPage
/dashboard            → DashboardPage
/map                  → SectorMapPage
/map/:cityId/:sectorId → SectorMapPage (zoom su settore)
/analysis/:sectorId   → NeighborhoodAnalysisPage
/predict/:sectorId    → PredictionEnginePage
/intervention         → InterventionLayerPage
/log                  → SystemLogPage
```

## Configurazione FlutterFlow

1. **Initial Page:** SplashBootPage
2. **Auth Required:** Si (redirect a LoginPage se non autenticato)
3. **Nav Bar tipo:** Bottom Nav Bar (4 items)
4. **Nav Bar pagine:** Dashboard, SectorMap, PredictionEngine, SystemLog
5. **Drawer:** Abilitato, con tutte le pagine
6. **Theme Mode:** Solo Dark (non offrire Light mode)
