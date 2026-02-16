# HYBRID SYNDICATE — Cognitive Weapons Platform

**Ethic Software Foundation | Zero extraction. Zero cloud. Zero masters.**

---

## Cos'e' questo

Una piattaforma di strumenti cognitivi che gira interamente nel tuo browser. Nessun server, nessun account, nessun abbonamento. Compri una volta (10 euro), usi per sempre. I tuoi dati restano nella tua macchina.

Ogni strumento risolve un problema reale che normalmente richiede software costoso, team di specialisti, o entrambi.

---

## Come iniziare

### 1. Apri il sito

Vai su `index.html`. Questa e' la base operativa (HQ). Da qui accedi a tutto.

La barra di navigazione in alto ti porta a ogni strumento. Il feed in basso a destra (CORE_FEED) mostra l'attivita' di sistema in tempo reale — 16 nuclei AI che commentano quello che succede.

### 2. Scegli il tuo strumento

| Strumento | Cosa fa | Per chi |
|-----------|---------|---------|
| **ORACLE** | Intelligence in tempo reale. Raccoglie notizie da 12 fonti (Reuters, NYT, Guardian...), classifica per dominio, rileva cascate cross-dominio, genera briefing automatici. | Analisti, decisori, chiunque voglia capire cosa sta succedendo nel mondo senza 50 tab aperte |
| **EEI PREDICTOR** | Calcola l'Indice di Estinzione Etica su 6 domini (Economico, Ambientale, Tecnologico, Sociale, Geopolitico, Cognitivo). Scoring 0-100 in tempo reale. | Ricercatori, attivisti, think tank |
| **EEI ANALYSIS** | Forecast strategico 2026-2033. Analisi approfondita dei 6 domini con scenari probabilistici e timeline. | Pianificazione strategica a medio-lungo termine |
| **URBAN CHRONOS** | Analisi urbanistica predittiva. Mappa interattiva con dati catastali, piani regolatori, censimento, Google Maps. Fa in minuti il lavoro di mesi di un'equipe di ingegneri e architetti. | Professionisti dell'urbanistica, ingegneri, architetti, amministratori pubblici |
| **PNEUMA** | Diario cognitivo strutturato. Cattura pensieri, li organizza, li correla nel tempo. | Chiunque pensi seriamente |
| **AGORA** | Forum decentralizzato. Discussione strutturata senza moderazione centralizzata. | Comunita', gruppi di lavoro |
| **ARCHIVIO SILENTE** | Archivio documenti con ricerca semantica locale. | Ricercatori, archivisti |
| **GEDP** | Protocollo di Governance Etica Digitale. Framework Carbonio/Silicio per la cooperazione uomo-macchina. | Governance, etica tech |

---

## Come funziona ogni strumento

### ORACLE — Intelligence Dashboard

1. Apri `oracle.html`
2. Il sistema inizia automaticamente a raccogliere notizie da 12 feed RSS
3. Ogni notizia viene classificata in uno dei 6 domini (Economico, Ambientale, Tecnologico, Sociale, Geopolitico, Cognitivo)
4. Il **Cascade Detector** cerca correlazioni tra domini — quando eventi in un settore influenzano altri settori
5. Quando rileva una cascata di severita' MEDIUM o superiore, il **Briefing Engine** genera automaticamente un report con:
   - Executive summary
   - Key findings basati sui dati
   - Timeframe probabilistico (breve/medio/lungo termine)
   - Raccomandazioni operative

**Per ottenere risultati**: aspetta 10-15 minuti dopo l'apertura. Il sistema ha bisogno di accumulare dati prima di rilevare pattern. Piu' tempo resta aperto, migliori sono le correlazioni.

**Trucco**: apri ORACLE su un dispositivo dedicato (vecchio tablet, telefono) e lascialo girare 24/7. Costa circa 6 centesimi di elettricita' al giorno e lavora come 4 analisti OSINT.

### EEI PREDICTOR

1. Apri `eei-predictor.html`
2. I 6 indici si calcolano in tempo reale basandosi sui dati raccolti da ORACLE
3. Ogni dominio ha un punteggio 0-100:
   - **0-30**: Situazione stabile
   - **30-60**: Deterioramento in corso
   - **60-80**: Soglia critica
   - **80-100**: Punto di non ritorno
4. Il punteggio composito (media pesata) da' una visione d'insieme

### EEI ANALYSIS — Forecast Strategico

1. Apri `eei-analysis.html`
2. Leggi l'analisi dei 6 domini con proiezioni 2026-2033
3. Ogni dominio include:
   - Stato attuale con dati
   - Tendenze a breve termine (6 mesi)
   - Proiezioni a medio termine (1-3 anni)
   - Scenari a lungo termine (3-7 anni)

### URBAN CHRONOS — Analisi Urbanistica

1. Apri `urban-chronos.html`
2. Inserisci un indirizzo o coordinate nel campo di ricerca
3. Il sistema carica automaticamente:
   - **Mappa satellitare** (Google Maps)
   - **Dati catastali** (particelle, proprieta', superfici)
   - **Piano regolatore** (destinazione d'uso, indici edificabilita', altezze massime)
   - **Dati censimento** (popolazione, densita', servizi)
4. Usa i controlli a sinistra per simulare scenari urbanistici nel tempo
5. Genera report PDF con tutti i dati aggregati

**Risultato**: quello che un'equipe di ingegneri e architetti fa in settimane di sopralluoghi, ricerche catastali, analisi normative — tu lo ottieni in minuti.

### PNEUMA — Diario Cognitivo

1. Apri `pneuma.html`
2. Scrivi un pensiero nel campo di input
3. Il sistema lo salva localmente con timestamp e contesto
4. Nel tempo, PNEUMA correla i tuoi pensieri e trova pattern
5. Tutto resta nel tuo browser — nessuno legge i tuoi pensieri

### AGORA — Forum

1. Apri `agora.html`
2. Leggi le discussioni o crea un nuovo thread
3. Le discussioni sono strutturate per argomento e qualita'
4. Nessuna moderazione centralizzata — la comunita' si autoregola

### ARCHIVIO SILENTE

1. Apri `archivio-silente.html`
2. Carica documenti o incolla testo
3. Cerca per contenuto — la ricerca e' semantica, non solo per parole chiave
4. I documenti restano nel tuo browser

---

## Architettura tecnica (per chi vuole capire)

```
Browser (la tua macchina)
  |
  +-- StateManager (state-manager.js)
  |   Sistema nervoso centrale. Gestisce tutti i dati con:
  |   - localStorage (dati rapidi, < 5MB)
  |   - IndexedDB (dati relazionali, < 50MB)
  |   - BroadcastChannel (sincronizzazione tra tab)
  |   - EPL (Entropic Process Lock — anti-manomissione)
  |
  +-- Constitutional (constitutional.js)
  |   Framework di governance. Garantisce 6 invarianti:
  |   1. Zero telemetria
  |   2. Solo storage locale
  |   3. Zero estrazione dati
  |   4. Nessun login richiesto
  |   5. Integrita' EPL attiva
  |   6. Nessun abbonamento
  |   Audit automatico ogni 5 minuti.
  |
  +-- Watchdog (watchdog.js + watchdog-worker.js)
  |   Monitor di sistema indipendente. Gira come Web Worker
  |   (thread separato). Controlla la salute di tutti i moduli
  |   ogni 30 secondi. Se qualcosa si blocca, lo riavvia.
  |
  +-- RSS Pipeline (rss-pipeline.js) — solo ORACLE
  |   Raccoglie notizie da 12 fonti. Fetch ogni 10 minuti.
  |   Classifica per dominio. Calcola severity 0-100.
  |
  +-- Cascade Detector (cascade-detector.js) — solo ORACLE
  |   Cerca correlazioni tra domini. Scan ogni 3 minuti.
  |   36 coppie di domini analizzate. Pattern noti + emergenti.
  |
  +-- Briefing Engine (briefing-engine.js) — solo ORACLE
  |   Genera report intelligence automatici quando rileva
  |   cascate di severita' MEDIUM o superiore.
  |
  +-- CoreFeed (core-feed.js)
  |   16 nuclei AI che commentano in tempo reale.
  |   Priority Queue: messaggi CRITICAL appaiono subito,
  |   LOW vengono scartati se la coda e' piena.
  |
  +-- HS-Nav (hs-nav.js)
      Navigazione unificata tra le 9 pagine.
```

---

## Setup dispositivo dedicato (opzionale ma consigliato)

Per ottenere il massimo da ORACLE, puoi dedicare un vecchio dispositivo:

### Cosa serve
- Un qualsiasi dispositivo con browser moderno (tablet, telefono, Raspberry Pi, vecchio laptop)
- Connessione internet

### Come fare
1. Apri il browser sul dispositivo
2. Vai al sito
3. Apri `oracle.html`
4. Disattiva lo standby del display (o usa un'app che lo impedisce)
5. Lascia girare

### Costi
- Elettricita': circa 0.06 euro/giorno (1.80 euro/mese)
- Dispositivo: quello che hai gia'
- Software: 10 euro una tantum

### Cosa ottieni
- 1728 articoli processati al giorno
- 480 scan di correlazione al giorno
- Briefing automatici su ogni evento critico
- Equivalente di 4-5 analisti OSINT che lavorano 24/7

---

## Quanto costa

| Cosa | Quanto |
|------|--------|
| Software | 10 euro. Una volta. Per sempre. |
| Abbonamento | Non esiste. |
| I tuoi dati | Restano tuoi. Per sempre. |
| Aggiornamenti | Inclusi. |

### Confronto

| Servizio | Costo annuo |
|----------|-------------|
| Bloomberg Terminal | 24,000 euro |
| Reuters Eikon | 14,400 euro |
| Palantir | 100,000+ euro |
| **Hybrid Syndicate** | **10 euro (totale)** |

---

## Principi (non negoziabili)

1. **Non semplifichiamo. Non nascondiamo la complessita'.** Tutti i dati grezzi sono visibili. Le correlazioni sono esplicite. I pattern sono documentati.

2. **Non ottimizziamo per l'engagement. Ottimizziamo per la comprensione.** Intelligence densa, niente feed infinito, briefing operativi.

3. **Non estraiamo valore. Preserviamo la dignita'.** Zero telemetria (enforced by Constitutional), zero tracking, zero "dati anonimi". 10 euro una tantum.

4. **Non costruiamo per la scala. Costruiamo per la sovranita'.** Gira nel browser. Dati in localStorage. Zero vendor lock-in. Se il sito sparisce domani, i tuoi dati restano.

---

## Contatti

Hybrid Syndicate / Ethic Software Foundation
Progetto Pankow77

---

*"Non costruiamo app. Costruiamo armi cognitive."*
