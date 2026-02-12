# URBAN_CHRONOS v2.0 — Google Maps Integration

## Panoramica

Google Maps e il layer visivo principale dell'applicazione.
Mostra i settori urbani, heatmap demografiche, overlay predittivi,
e le Null Zones.

## API Necessarie (Google Cloud Console)

Attiva queste API nel progetto Google Cloud:

1. **Maps SDK for Android** (per build mobile)
2. **Maps SDK for iOS** (per build iOS)
3. **Maps JavaScript API** (per build web)
4. **Geocoding API** (coordinate ↔ indirizzi)
5. **Places API** (ricerca luoghi, POI)

## Configurazione FlutterFlow

### 1. Aggiungi Google Maps al Progetto

In FlutterFlow:
1. Vai a **Settings > Integrations > Google Maps**
2. Inserisci la API Key del progetto GCP
3. Abilita Google Maps per le piattaforme target (Web, Android, iOS)

### 2. Widget GoogleMap nella pagina SectorMapPage

```
GoogleMap Widget:
  initialLocation: AppState.selectedCity.coordinates
  initialZoom: 12.0
  mapType: MapType.normal
  mapStyle: [cyberpunk JSON style — vedi color-palette.md]
  myLocationEnabled: false
  zoomControlsEnabled: true
  compassEnabled: false
  mapToolbarEnabled: false
  markers: dynamicMarkersList
  polygons: sectorBoundariesList
```

## Marker Personalizzati

### Tipi di Marker

| Tipo          | Icona                    | Colore      | Uso                        |
|---------------|--------------------------|-------------|----------------------------|
| sectorCenter  | Quadrato pieno 20x20     | #00ff41     | Centro settore nominale    |
| sectorWarn    | Quadrato pieno 20x20     | #ffaa00     | Centro settore warning     |
| sectorCrit    | Quadrato pieno 20x20     | #ff0040     | Centro settore critico     |
| nullZone      | X 16x16                  | #ff0040     | Null zone                  |
| userPin       | Cerchio 12x12            | #00ffff     | Posizione utente           |

### Implementazione Marker (Custom Action)

```dart
// Custom Action: generateSectorMarkers
// Input: List<SectorDocument> sectors
// Output: List<MarkerData>

Future<List<FFMarker>> generateSectorMarkers(
  List<SectorsRecord> sectors,
) async {
  return sectors.map((sector) {
    final sovereignty = calculateSovereignty(
      sector.currentMetrics.efficiency,
      sector.currentMetrics.entropy,
    );

    String color;
    if (sovereignty > 60) {
      color = '#00ff41'; // nominal
    } else if (sovereignty > 30) {
      color = '#ffaa00'; // warning
    } else {
      color = '#ff0040'; // critical
    }

    return FFMarker(
      position: LatLng(
        sector.centerPoint.lat,
        sector.centerPoint.lng,
      ),
      title: sector.sectorCode,
      snippet: 'Sovereignty: ${sovereignty.toStringAsFixed(0)}%',
      color: color,
    );
  }).toList();
}
```

## Poligoni Settore (Sector Boundaries)

Ogni settore ha un poligono che ne definisce i confini sulla mappa.

### Stile Poligono per Stato

```
Nominale:
  fillColor: #00ff4115 (green, 8% opacity)
  strokeColor: #00ff41
  strokeWidth: 1

Warning:
  fillColor: #ffaa0015 (amber, 8% opacity)
  strokeColor: #ffaa00
  strokeWidth: 1

Critico:
  fillColor: #ff004015 (red, 8% opacity)
  strokeColor: #ff0040
  strokeWidth: 2

Null Zone:
  fillColor: #ff004008 (red, 3% opacity)
  strokeColor: #ff0040
  strokeWidth: 1
  strokePattern: dashed (se supportato)
```

### Implementazione Poligoni (Custom Action)

```dart
// Custom Action: generateSectorPolygons
// Input: List<SectorDocument> sectors
// Output: List<PolygonData>

Future<List<FFPolygon>> generateSectorPolygons(
  List<SectorsRecord> sectors,
  String selectedOverlay, // 'sovereignty'|'population'|'income'
) async {
  return sectors.map((sector) {
    final points = sector.boundaries
        .map((b) => LatLng(b.lat, b.lng))
        .toList();

    double metricValue;
    switch (selectedOverlay) {
      case 'sovereignty':
        metricValue = calculateSovereignty(
          sector.currentMetrics.efficiency,
          sector.currentMetrics.entropy,
        );
        break;
      case 'population':
        metricValue = sector.currentMetrics.populationDensity;
        break;
      case 'income':
        metricValue = sector.currentMetrics.medianIncome;
        break;
    }

    final color = getHeatmapColor(metricValue);

    return FFPolygon(
      points: points,
      fillColor: color.withOpacity(0.15),
      strokeColor: color,
      strokeWidth: 1,
    );
  }).toList();
}
```

## Heatmap Layer

Per visualizzare densita di dati, usa un overlay heatmap.

### Overlay Disponibili

| Overlay            | Variabile Census      | Scala Colore              |
|--------------------|-----------------------|---------------------------|
| Popolazione        | B01001_001E           | Cyan → Green → Red        |
| Reddito            | B19013_001E           | Red → Amber → Green       |
| Valore Immobili    | B25077_001E           | Green → Amber → Red       |
| Disoccupazione     | B23025_005E           | Green → Amber → Red       |
| Eta Media          | B01002_001E           | Cyan → Green → Amber      |
| Densita            | calcolata             | Cyan → Green → Red        |

### Scala Colore Heatmap

```dart
// Custom Action: getHeatmapColor
// Mappa un valore normalizzato (0-1) a un colore cyberpunk

Color getHeatmapColor(double normalizedValue) {
  if (normalizedValue < 0.25) {
    return Color(0xFF00FFFF); // cyber-cyan (basso)
  } else if (normalizedValue < 0.50) {
    return Color(0xFF00FF41); // neon-green (medio-basso)
  } else if (normalizedValue < 0.75) {
    return Color(0xFFFFAA00); // neon-amber (medio-alto)
  } else {
    return Color(0xFFFF0040); // neon-red (alto)
  }
}
```

## Geocoding

Per convertire nomi di citta/indirizzi in coordinate.

### Uso in FlutterFlow

```
API Call: Google Geocoding
  Endpoint: https://maps.googleapis.com/maps/api/geocode/json
  Method: GET
  Parameters:
    address: [input utente]
    key: [API_KEY da Firebase Remote Config]
  Response:
    lat: results[0].geometry.location.lat
    lng: results[0].geometry.location.lng
    formattedAddress: results[0].formatted_address
```

### Configurazione API Call in FlutterFlow

1. Vai a **API Calls** nel pannello sinistro
2. Crea nuova API Call: `geocodeAddress`
3. URL: `https://maps.googleapis.com/maps/api/geocode/json`
4. Method: GET
5. Query Parameters:
   - `address` = variabile (input utente)
   - `key` = costante (API key)
6. Response parsing:
   - JSON Path `$.results[0].geometry.location.lat` → `latitude`
   - JSON Path `$.results[0].geometry.location.lng` → `longitude`

## Places Autocomplete

Per la barra di ricerca citta/quartieri.

### Configurazione

```
API Call: placesAutocomplete
  Endpoint: https://maps.googleapis.com/maps/api/place/autocomplete/json
  Method: GET
  Parameters:
    input: [testo digitato dall'utente]
    types: (cities)
    key: [API_KEY]
  Response parsing:
    JSON Path: $.predictions[*].description → List<String>
    JSON Path: $.predictions[*].place_id → List<String>
```

## Interazione Mappa

### Tap su Settore
```
Azione: Quando l'utente tocca un poligono settore
1. Identifica il settore toccato (dal poligono)
2. Aggiorna AppState.selectedSectorId
3. Mostra Bottom Sheet con metriche rapide del settore
4. Opzione: "Analisi Completa" → naviga a NeighborhoodAnalysisPage
```

### Bottom Sheet Settore Rapido

```
Layout:
┌──────────────────────────────────┐
│ SECTOR_7G // WEST DISTRICT       │
│ ────────────────────────────────  │
│ POP: 45,230    INCOME: $52,400   │
│ DENSITY: 3,200/km²               │
│ SOVEREIGNTY: 31% [■■■░░░░░░░]   │
│                                   │
│ [FULL ANALYSIS]  [PREDICT]       │
└──────────────────────────────────┘

Font: Orbitron / Courier New
Colors: --neon-green per valori, --text-secondary per label
```

## Limiti e Costi

| API                  | Free Tier              | Costo oltre                |
|----------------------|------------------------|----------------------------|
| Maps SDK             | $200 credito/mese      | $7/1000 loads              |
| Geocoding            | $200 credito/mese      | $5/1000 richieste          |
| Places Autocomplete  | $200 credito/mese      | $2.83/1000 richieste       |

**Nota:** $200/mese di credito gratuito GCP sono sufficienti per
~28,000 map loads + geocoding. Per un'app in sviluppo/demo e piu che sufficiente.
