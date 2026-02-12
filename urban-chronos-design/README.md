# URBAN_CHRONOS v2.0 — FlutterFlow Project Blueprint

## Predictive Sovereignty Engine | Urbanistica Predittiva

### Progetto

Applicazione di urbanistica predittiva che combina dati reali (Google Maps,
US Census Bureau, Open Data) con un motore analitico per prevedere lo
sviluppo dei quartieri nel tempo. Estetica cyberpunk coerente con
l'universo HYBRID SYNDICATE.

### Struttura del Blueprint

```
urban-chronos-design/
├── README.md                          # Questo file
├── architecture/
│   └── system-architecture.md         # Architettura generale del sistema
├── data-models/
│   ├── schemas.md                     # Modelli dati e schemi Firestore
│   └── app-state.md                   # Stato globale dell'app (FlutterFlow)
├── api-specs/
│   ├── google-maps.md                 # Integrazione Google Maps
│   ├── census-bureau.md               # US Census Bureau API
│   ├── open-data.md                   # Open Data e API supplementari
│   └── api-config.md                  # Configurazione e chiavi API
├── screens/
│   ├── 00-navigation-flow.md          # Flusso di navigazione completo
│   ├── 01-splash-boot.md              # Splash / Boot Sequence
│   ├── 02-dashboard.md                # Dashboard principale
│   ├── 03-sector-map.md               # Mappa settori (Google Maps)
│   ├── 04-neighborhood-analysis.md    # Analisi quartiere
│   ├── 05-prediction-engine.md        # Motore predittivo
│   ├── 06-intervention-layer.md       # Layer di intervento
│   ├── 07-data-sources.md             # Gestione sorgenti dati
│   └── 08-system-log.md              # Log di sistema live
├── custom-actions/
│   ├── prediction-algorithms.md       # Algoritmi predittivi (Dart)
│   ├── census-data-parser.md          # Parser dati Census Bureau
│   ├── urban-metrics-calculator.md    # Calcolatore metriche urbane
│   └── entropy-engine.md             # Motore entropia e noise
└── assets/
    └── color-palette.md               # Palette colori e design tokens
```

### Stack Tecnologico per FlutterFlow

| Componente        | Tecnologia                          |
|-------------------|-------------------------------------|
| Frontend          | FlutterFlow (Flutter Web/Mobile)    |
| Backend           | Firebase (Firestore + Functions)    |
| Mappe             | Google Maps Flutter SDK             |
| Dati demografici  | US Census Bureau API (REST)         |
| Dati economici    | Bureau of Labor Statistics API      |
| Dati ambientali   | EPA + OpenWeatherMap API            |
| Grafici           | fl_chart (FlutterFlow compatible)   |
| Autenticazione    | Firebase Auth                       |
| Hosting           | Firebase Hosting / GitHub Pages     |

### Come Usare Questo Blueprint

1. Leggi `architecture/system-architecture.md` per capire il sistema
2. Configura Firebase seguendo `data-models/schemas.md`
3. Segui `screens/00-navigation-flow.md` per creare le pagine in FlutterFlow
4. Implementa ogni schermata seguendo i file numerati in `screens/`
5. Aggiungi le Custom Actions da `custom-actions/`
6. Configura le API seguendo `api-specs/`
