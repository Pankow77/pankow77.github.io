# URBAN_CHRONOS v2.0 — Sector Map Page

## Scopo
Mappa interattiva con Google Maps che mostra i settori urbani,
overlay demografici, heatmap, e null zones.

## Layout

```
┌─────────────────────────────────────────┐
│ ← SECTOR MAP         [🔍] [LAYERS ▼]  │
│─────────────────────────────────────────│
│                                          │
│  ┌───────────────────────────────────┐  │
│  │                                    │  │
│  │                                    │  │
│  │                                    │  │
│  │         GOOGLE MAP                 │  │
│  │      (cyberpunk style)             │  │
│  │                                    │  │
│  │    ┌─────┐                         │  │
│  │    │SEC7G│  poligoni colorati      │  │
│  │    └─────┘  per sovereignty        │  │
│  │                                    │  │
│  │                                    │  │
│  │                                    │  │
│  │                                    │  │
│  └───────────────────────────────────┘  │
│                                          │
│  ┌─ OVERLAY: SOVEREIGNTY ─────────────┐ │
│  │ LOW ░░░░░░░▓▓▓▓▓▓▓████████ HIGH   │ │
│  │ 0%            50%           100%    │ │
│  └────────────────────────────────────┘ │
│                                          │
│  ┌─ ACTIVE SECTOR ────────────────────┐ │
│  │ SECTOR_7G // WEST DISTRICT          │ │
│  │ POP: 45,230  INCOME: $52,400       │ │
│  │ SOVEREIGNTY: 31% ▲ CRITICAL        │ │
│  │ [FULL ANALYSIS]  [PREDICT]          │ │
│  └────────────────────────────────────┘ │
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
  leading: BackButton (se navigato da altra pagina)
           oppure DrawerButton (se tab principale)
  title: Text "SECTOR MAP"
    style: Orbitron, 16px, Bold, #00ff41
  actions:
    ├── IconButton(search)
    │     color: #888888
    │     onTap: → mostra SearchBar per citta/quartiere
    └── PopupMenuButton "LAYERS"
          style: Orbitron, 10px, #888888
          items: [overlay options]
```

### Google Map Widget

```
GoogleMap:
  height: MediaQuery.height * 0.55 (55% dello schermo)
  width: double.infinity
  initialLocation: AppState.selectedCity.coordinates
  initialZoom: 12.0
  mapType: normal
  mapStyle: [cyberpunk JSON — vedi color-palette.md]
  myLocationEnabled: false
  zoomControlsEnabled: false (usiamo gesture)
  compassEnabled: false
  markers: generati da Custom Action (generateSectorMarkers)
  polygons: generati da Custom Action (generateSectorPolygons)

  onMapCreated: → salva MapController in Page State
  onTap(LatLng): → identifica settore toccato, aggiorna selezione
```

### Layer Selector (Overlay)

```
Opzioni overlay (PopupMenu o BottomSheet):

| Overlay          | Descrizione                    | Default |
|------------------|--------------------------------|---------|
| SOVEREIGNTY      | Indice sovranita (calcolato)   | ✓       |
| POPULATION       | Densita popolazione            |         |
| INCOME           | Reddito mediano                |         |
| HOME VALUE       | Valore immobiliare mediano     |         |
| UNEMPLOYMENT     | Tasso disoccupazione           |         |
| EDUCATION        | % laureati                     |         |
| GROWTH           | Tasso crescita popolazione     |         |
| NULL ZONES       | Zone non tracciate             |         |

Quando l'utente seleziona un overlay:
1. Aggiorna Page State: selectedOverlay
2. Ricalcola colori poligoni (Custom Action)
3. Aggiorna legenda scala colore
```

### Scala Colore (Color Legend)

```
Container:
  background: #111111
  border: 1px solid #222222
  padding: 8px 16px
  margin: 8px horizontal
  child: Column
    ├── Text "OVERLAY: ${selectedOverlay}"
    │     style: Orbitron, 9px, #888888, uppercase
    ├── SizedBox(6)
    ├── Row
    │     ├── Text "LOW"
    │     │     style: Courier New, 10px, #555555
    │     ├── SizedBox(8)
    │     ├── GradientBar
    │     │     height: 8
    │     │     flex: 1
    │     │     gradient: LinearGradient(
    │     │       colors: [#00ffff, #00ff41, #ffaa00, #ff0040]
    │     │     )
    │     ├── SizedBox(8)
    │     └── Text "HIGH"
    │           style: Courier New, 10px, #555555
    └── Row(mainAxisAlignment: spaceBetween)
          ├── Text "0%"
          ├── Text "50%"
          └── Text "100%"
          style: Courier New, 9px, #555555
```

### Active Sector Card (Bottom Panel)

Appare quando l'utente tocca un settore sulla mappa.

```
AnimatedContainer (slide up da bottom):
  duration: 300ms
  background: #111111
  border-top: 1px solid #222222
  border-left: 2px solid [colore sovereignty]
  padding: 16px
  child: Column
    ├── Row
    │     ├── Text(sectorCode)
    │     │     style: Orbitron, 14px, Bold, #00ff41
    │     ├── Text " // "
    │     │     style: 14px, #555555
    │     ├── Text(sectorName)
    │     │     style: Orbitron, 14px, #e0e0e0
    │     ├── Spacer()
    │     └── IconButton(close)
    │           onTap: → deseleziona settore
    │
    ├── SizedBox(8)
    │
    ├── Row
    │     ├── QuickStat("POP", formatNumber(population))
    │     ├── QuickStat("INCOME", formatCurrency(medianIncome))
    │     └── QuickStat("DENSITY", "${density}/km²")
    │
    ├── SizedBox(8)
    │
    ├── Row
    │     ├── Text "SOVEREIGNTY: ${sovereignty}%"
    │     │     style: Courier New, 12px, [colore]
    │     ├── SizedBox(8)
    │     └── StatusBadge(getSeverity(sovereignty))
    │
    ├── SizedBox(12)
    │
    └── Row
          ├── OutlinedButton "FULL ANALYSIS"
          │     style: cyberpunk button (vedi color-palette.md)
          │     onTap: → Navigate to NeighborhoodAnalysisPage(sectorId)
          ├── SizedBox(8)
          └── OutlinedButton "PREDICT"
                style: cyberpunk button, colore cyan
                onTap: → Navigate to PredictionEnginePage(sectorId)
```

### Null Zone Overlay

Quando attivato, mostra aree non coperte dai dati Census.

```
Logica:
1. Prendi il bounding box della citta
2. Sottrai le aree coperte dai Census Tracts
3. Le aree rimanenti sono "Null Zones"
4. Disegnale con pattern tratteggiato rosso

Stile Null Zone:
  fillColor: #ff004008
  strokeColor: #ff0040
  strokeWidth: 1
  pattern: dashed (se supportato, altrimenti puntini)
```

## Page State

```
SectorMapPageState:
  mapController: GoogleMapController?
  selectedOverlay: String = 'sovereignty'
  selectedSectorId: String?
  showNullZones: bool = false
  isSearching: bool = false
  searchQuery: String = ''
  calculatedPolygons: List<Polygon>
  calculatedMarkers: List<Marker>
```

## Azioni

### On Page Load
```
1. Fetch sectors da Firestore: cities/{cityId}/sectors
2. Custom Action: generateSectorPolygons(sectors, 'sovereignty')
3. Custom Action: generateSectorMarkers(sectors)
4. Aggiorna Page State con poligoni e marker
5. Log: "[INFO] Sector map loaded. {n} sectors rendered."
```

### On Overlay Change
```
1. Aggiorna selectedOverlay
2. Custom Action: generateSectorPolygons(sectors, newOverlay)
3. Aggiorna poligoni sulla mappa
4. Aggiorna legenda
```

### On Sector Tap
```
1. Identifica settore dal punto toccato
2. Aggiorna selectedSectorId
3. Zoom mappa sul settore (animato)
4. Mostra Active Sector Card (slide up)
5. Evidenzia bordo settore (strokeWidth: 3)
```

### Search
```
1. Utente digita nome citta/quartiere
2. API Call: placesAutocomplete(query)
3. Mostra suggerimenti
4. On select: geocodeAddress → muovi mappa
```
