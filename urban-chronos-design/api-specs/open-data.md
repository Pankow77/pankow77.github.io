# URBAN_CHRONOS v2.0 — Open Data & API Supplementari

## Panoramica

Oltre a Google Maps e Census Bureau, URBAN_CHRONOS integra diverse
sorgenti dati per costruire un quadro completo dello sviluppo urbano.

---

## 1. Bureau of Labor Statistics (BLS) API

**Base URL:** `https://api.bls.gov/publicAPI/v2/timeseries/data/`
**Registrazione:** https://data.bls.gov/registrationEngine/
**Rate Limit:** 500 req/giorno (v2, con registrazione)
**Formato:** JSON

### Serie Utilizzate

| Serie ID Pattern       | Descrizione                              |
|-----------------------|------------------------------------------|
| LAUST{FIPS}00000003   | Tasso disoccupazione per area            |
| LAUST{FIPS}00000005   | Occupati per area                        |
| LAUST{FIPS}00000006   | Forza lavoro per area                    |
| CUUR0000SA0           | CPI (Consumer Price Index) nazionale     |
| CUURS{area}SA0        | CPI per area metropolitana               |

### Configurazione API Call FlutterFlow

```
Nome: fetchBLSTimeSeries
URL: https://api.bls.gov/publicAPI/v2/timeseries/data/
Method: POST
Headers:
  Content-Type: application/json
Body (JSON):
  {
    "seriesid": ["LAUST060000000000003", "LAUST060000000000005"],
    "startyear": "2015",
    "endyear": "2024",
    "registrationkey": "[BLS_API_KEY]"
  }
```

### Parsing Risposta BLS

```json
{
  "status": "REQUEST_SUCCEEDED",
  "Results": {
    "series": [
      {
        "seriesID": "LAUST060000000000003",
        "data": [
          { "year": "2024", "period": "M06", "value": "5.2" },
          { "year": "2024", "period": "M05", "value": "5.1" }
        ]
      }
    ]
  }
}
```

```dart
// Custom Action: parseBLSResponse
Future<List<Map<String, dynamic>>> parseBLSResponse(dynamic response) async {
  final series = response['Results']['series'] as List;
  return series.expand((s) {
    final seriesId = s['seriesID'];
    final data = s['data'] as List;
    return data.map((d) => {
      return {
        'seriesId': seriesId,
        'year': int.parse(d['year']),
        'period': d['period'],
        'value': double.parse(d['value']),
      };
    });
  }).toList();
}
```

---

## 2. EPA (Environmental Protection Agency) API

**Base URL:** `https://aqs.epa.gov/data/api/`
**Registrazione:** https://aqs.epa.gov/data/api/signup?email=YOUR_EMAIL
**Rate Limit:** Ragionevole, non documentato
**Formato:** JSON

### Endpoint Utilizzati

| Endpoint                              | Descrizione                    |
|---------------------------------------|--------------------------------|
| `dailyData/byCounty`                  | Dati qualita aria giornalieri |
| `annualData/byCounty`                 | Dati annuali per contea       |
| `monitors/byCounty`                   | Stazioni di monitoraggio      |

### Parametri Qualita Aria

| Codice Parametro | Descrizione            |
|-----------------|------------------------|
| 44201           | Ozono                  |
| 88101           | PM2.5                  |
| 88502           | PM10                   |
| 42401           | SO2                    |
| 42101           | CO                     |
| 42602           | NO2                    |

### Configurazione API Call FlutterFlow

```
Nome: fetchAirQuality
URL: https://aqs.epa.gov/data/api/annualData/byCounty
Method: GET
Query Parameters:
  email: [registrata]
  key: [EPA_API_KEY]
  param: 88101 (PM2.5)
  bdate: 20230101
  edate: 20231231
  state: [stateCode]
  county: [countyCode]
```

---

## 3. OpenWeatherMap API

**Base URL:** `https://api.openweathermap.org/data/2.5/`
**Registrazione:** https://openweathermap.org/api (Free tier)
**Rate Limit:** 60 calls/minuto (Free), 3000/minuto (Pro)
**Formato:** JSON

### Endpoint Utilizzati

| Endpoint              | Descrizione                       |
|----------------------|-----------------------------------|
| `weather`            | Meteo corrente                    |
| `air_pollution`      | Indice qualita aria corrente      |
| `air_pollution/history` | Storico qualita aria           |

### Configurazione API Call FlutterFlow

```
Nome: fetchAirPollution
URL: https://api.openweathermap.org/data/2.5/air_pollution
Method: GET
Query Parameters:
  lat: [latitude]
  lon: [longitude]
  appid: [OPENWEATHER_API_KEY]

Response:
  AQI: list[0].main.aqi (1-5)
  PM2.5: list[0].components.pm2_5
  PM10: list[0].components.pm10
  NO2: list[0].components.no2
  O3: list[0].components.o3
```

```
Nome: fetchAirPollutionHistory
URL: https://api.openweathermap.org/data/2.5/air_pollution/history
Method: GET
Query Parameters:
  lat: [latitude]
  lon: [longitude]
  start: [unix timestamp inizio]
  end: [unix timestamp fine]
  appid: [OPENWEATHER_API_KEY]
```

---

## 4. Socrata Open Data API (SODA)

Molte citta USA pubblicano dati aperti tramite Socrata.

**Formato:** JSON / CSV
**Autenticazione:** App Token (opzionale ma raccomandato)
**Rate Limit:** 1000 req/ora senza token

### Portali Open Data per Citta

| Citta         | URL Portale                                | Dataset Chiave        |
|---------------|--------------------------------------------|-----------------------|
| New York      | data.cityofnewyork.us                      | Crimini, edilizia, 311|
| Chicago       | data.cityofchicago.org                     | Crimini, ispezioni    |
| Los Angeles   | data.lacity.org                            | Permessi, crimini     |
| San Francisco | data.sfgov.org                             | Crimini, trasporti    |
| Philadelphia  | opendataphilly.org                         | Crimini, proprieta    |

### Esempio Query SODA

```
Nome: fetchCityOpenData
URL: https://data.cityofnewyork.us/resource/[dataset-id].json
Method: GET
Query Parameters:
  $where: date > '2023-01-01'
  $limit: 1000
  $offset: 0
  $$app_token: [SOCRATA_APP_TOKEN]
```

### Dataset Utili per Urbanistica

| Dataset             | Citta      | ID                  | Uso                        |
|---------------------|-----------|---------------------|----------------------------|
| Building Permits    | NYC       | ipu4-2vj7           | Nuove costruzioni          |
| 311 Complaints      | NYC       | erm2-nwe9           | Qualita della vita         |
| Crime Data          | Chicago   | ijzp-q8t2           | Sicurezza quartiere        |
| Property Values     | Philly    | (varie)             | Andamento immobiliare      |
| Transit Ridership   | NYC       | (MTA datasets)      | Uso trasporto pubblico     |

---

## 5. Walk Score API

**Base URL:** `https://api.walkscore.com/score`
**Registrazione:** https://www.walkscore.com/professional/api.php
**Rate Limit:** 5000 req/giorno (Free)
**Formato:** JSON/XML

### Configurazione API Call FlutterFlow

```
Nome: fetchWalkScore
URL: https://api.walkscore.com/score
Method: GET
Query Parameters:
  format: json
  address: [indirizzo]
  lat: [latitude]
  lon: [longitude]
  transit: 1
  bike: 1
  wsapikey: [WALKSCORE_API_KEY]

Response:
  walkscore: int (0-100)
  transit: { score: int (0-100) }
  bike: { score: int (0-100) }
```

---

## 6. data.gov (Federal Open Data)

**Base URL:** `https://catalog.data.gov/api/3/`
**Autenticazione:** Non richiesta
**Rate Limit:** Ragionevole
**Formato:** JSON / CSV

### Dataset Federali Utili

| Dataset                            | Agenzia | Uso                         |
|------------------------------------|---------|-----------------------------|
| TIGER/Line Shapefiles              | Census  | Confini geografici          |
| National Flood Hazard Layer        | FEMA    | Rischio alluvione           |
| Superfund Sites                    | EPA     | Siti contaminati            |
| National Transit Database          | FTA     | Dati trasporto pubblico     |
| USPS ZIP Code Business Patterns    | Census  | Attivita economiche per ZIP |

---

## 7. Per Citta Europee — Open Data EU

Per estendere URBAN_CHRONOS a citta europee:

### Italia

| Fonte                    | URL                                  | Dati                    |
|--------------------------|--------------------------------------|-------------------------|
| ISTAT                    | dati.istat.it                        | Censimento, demografia  |
| Open Data Roma           | dati.comune.roma.it                  | Servizi, mobilita       |
| Open Data Milano         | dati.comune.milano.it                | Urbanistica, servizi    |

### Germania

| Fonte                    | URL                                  | Dati                    |
|--------------------------|--------------------------------------|-------------------------|
| Destatis                 | www-genesis.destatis.de              | Censimento federale     |
| Berlin Open Data         | daten.berlin.de                      | Dati urbani Berlino     |

### API Eurostat

```
Base URL: https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/
Formato: JSON
Autenticazione: Non richiesta

Esempio:
https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/
  demo_r_pjangrp3?
  geo=DE30&            (Berlino NUTS code)
  time=2020&
  age=TOTAL&
  sex=T
```

---

## Configurazione Chiavi API in FlutterFlow

### Metodo Raccomandato: Firebase Remote Config

NON hardcodare le chiavi API nel codice FlutterFlow.

1. Vai su **Firebase Console > Remote Config**
2. Aggiungi i parametri:

| Parametro               | Valore                         |
|-------------------------|--------------------------------|
| census_api_key          | [tua chiave Census]            |
| bls_api_key             | [tua chiave BLS]               |
| epa_api_key             | [tua chiave EPA]               |
| openweather_api_key     | [tua chiave OpenWeather]       |
| walkscore_api_key       | [tua chiave WalkScore]         |
| socrata_app_token       | [tuo token Socrata]            |
| google_maps_api_key     | [tua chiave Google Maps]       |

3. In FlutterFlow, usa Firebase Remote Config per leggere le chiavi
   oppure usa le Cloud Functions come proxy (metodo piu sicuro)

### Metodo Alternativo: Cloud Functions come Proxy

Le API calls passano attraverso Cloud Functions che aggiungono
le chiavi lato server. Il client non vede mai le chiavi API.

```
Client (FlutterFlow)
  → Cloud Function (aggiunge API key)
    → External API (Census, BLS, etc.)
      → risposta torna al client
```

Questo e il metodo **raccomandato per produzione**.
