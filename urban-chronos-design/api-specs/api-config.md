# URBAN_CHRONOS v2.0 — API Configuration Guide

## Checklist Registrazione API

Prima di iniziare lo sviluppo, registrati a tutte le API:

### Obbligatorie

- [ ] **Google Cloud Platform**
  - URL: https://console.cloud.google.com
  - Crea progetto "urban-chronos"
  - Abilita: Maps SDK, Geocoding, Places
  - Crea API Key con restrizioni (HTTP referrer per web, app per mobile)
  - Costo: $200/mese credito gratuito

- [ ] **US Census Bureau**
  - URL: https://api.census.gov/data/key_signup.html
  - Ricevi chiave via email (immediato)
  - Costo: Gratuito, illimitato

- [ ] **Firebase**
  - URL: https://console.firebase.google.com
  - Crea progetto (collega a progetto GCP)
  - Abilita: Firestore, Authentication, Cloud Functions, Remote Config
  - Costo: Spark plan gratuito sufficiente per sviluppo

### Raccomandate

- [ ] **Bureau of Labor Statistics**
  - URL: https://data.bls.gov/registrationEngine/
  - Registrazione gratuita, chiave via email
  - Costo: Gratuito, 500 req/giorno

- [ ] **OpenWeatherMap**
  - URL: https://openweathermap.org/api
  - Free tier: 60 calls/min
  - Costo: Gratuito per uso base

- [ ] **Walk Score**
  - URL: https://www.walkscore.com/professional/api.php
  - Free tier: 5000 req/giorno
  - Costo: Gratuito per uso non commerciale

### Opzionali

- [ ] **EPA Air Quality**
  - URL: https://aqs.epa.gov/data/api/signup
  - Richiedi via email
  - Costo: Gratuito

- [ ] **Socrata (Open Data)**
  - URL: https://dev.socrata.com/register
  - App token per rate limit piu alto
  - Costo: Gratuito

## Struttura Firebase Remote Config

```json
{
  "api_keys": {
    "google_maps": "AIza...",
    "census_bureau": "abc123...",
    "bls": "xyz789...",
    "openweather": "owm...",
    "walkscore": "ws...",
    "epa": "epa...",
    "socrata": "soc..."
  },
  "api_endpoints": {
    "census_base": "https://api.census.gov/data",
    "bls_base": "https://api.bls.gov/publicAPI/v2",
    "epa_base": "https://aqs.epa.gov/data/api",
    "openweather_base": "https://api.openweathermap.org/data/2.5",
    "walkscore_base": "https://api.walkscore.com"
  },
  "cache_settings": {
    "census_cache_hours": 24,
    "bls_cache_hours": 12,
    "weather_cache_hours": 1,
    "walkscore_cache_hours": 168
  }
}
```

## Riepilogo API Calls da Creare in FlutterFlow

| # | Nome API Call             | Metodo | Priorita  |
|---|---------------------------|--------|-----------|
| 1 | geocodeAddress            | GET    | Alta      |
| 2 | placesAutocomplete        | GET    | Alta      |
| 3 | fetchCensusTracts         | GET    | Alta      |
| 4 | fetchCensusYear           | GET    | Alta      |
| 5 | fetchPopEstimates         | GET    | Media     |
| 6 | fetchBLSTimeSeries        | POST   | Media     |
| 7 | fetchAirQuality           | GET    | Bassa     |
| 8 | fetchAirPollution         | GET    | Bassa     |
| 9 | fetchAirPollutionHistory  | GET    | Bassa     |
| 10| fetchCityOpenData         | GET    | Bassa     |
| 11| fetchWalkScore            | GET    | Media     |

Implementa prima le chiamate 1-4 (core), poi aggiungi le altre
progressivamente.
