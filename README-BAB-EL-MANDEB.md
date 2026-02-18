# BAB EL-MANDEB v0.1 — Theater Monitor

## Sismografo Narrativo per lo Stretto di Bab el-Mandeb

Misura sincronizzazione tra attori, non intenzioni.
Ingesta dichiarazioni ufficiali (CENTCOM, Houthi, EUNAVFOR).
Traccia frequenza per attore su finestre rolling.
Rileva anomalie di sincronizzazione cross-attore.

---

## Come funziona

### Tu sei il classificatore semantico.

Il sistema non fa NLP. Non fa AI. Non interpreta.
Tu leggi la dichiarazione, la classifichi, e il sistema traccia i pattern che il singolo cervello non vede perche' non ha memoria rolling.

### Flusso operativo

1. Leggi la dichiarazione (CENTCOM press release, Houthi claim, EUNAVFOR report)
2. Apri `bab-el-mandeb.html`
3. Compila il form nella sidebar destra:
   - **SOURCE**: Chi ha emesso la dichiarazione
   - **ACTOR**: Chi e' il soggetto dell'azione
   - **ACTION TYPE**: Tipo di azione dichiarata
   - **INTENSITY**: Gravita' da 1 a 5
   - **SUMMARY**: Breve descrizione (opzionale)
   - **TAGS**: Etichette per classificazione
4. Clicca **INGEST EPOCH**
5. Il sistema aggiorna automaticamente:
   - Contatore frequenza rolling 24h per attore
   - Timeline degli epoch
   - Grafico frequenza 72h
   - Envelope nel bloodstream dell'ecosistema
   - Epoch nella Identity timeline (IndexedDB)

---

## Interfaccia

### Pannello sinistro (Main Content)

**ROLLING FREQUENCY // 24H**
- Una card per ogni attore (CENTCOM, HOUTHI, EUNAVFOR, IRAN, OTHER)
- Mostra: conteggio 24h, rapporto vs baseline
- Colori: verde = normale, giallo = elevato, arancione = alto, rosso = critico
- Soglia di allarme: rapporto > 1.8x baseline

**FREQUENCY TIMELINE // 72H**
- Grafico a linee con bin orari per 72h
- Una linea per attore (codice colore)
- Si aggiorna automaticamente ogni 30 secondi

**EPOCH TIMELINE**
- Lista cronologica degli epoch ingesti
- Mostra: data/ora, attore, tipo azione, intensita'
- Massimo 30 epoch visibili

### Pannello destro (Sidebar)

**INGEST EPOCH**
- Form di ingestion manuale
- Source e Actor sono auto-linkati (selezionando CENTCOM come source, actor diventa centcom)
- Intensity con bottoni 1-5 (colore indica gravita')
- Tags selezionabili con toggle

**SYSTEM STATUS**
- Stato dei moduli dell'ecosistema
- Conteggio epoch, listener del Bus, uptime

**OPERATOR GUIDE**
- Guida rapida di 6 passi

---

## Fonte dati: dove trovarle

### CENTCOM
- Sito ufficiale: centcom.mil (sezione Press Releases)
- Cerca: "Houthi", "Yemen", "Red Sea", "Bab el-Mandeb"
- Frequenza tipica: 1-3 comunicati/giorno

### HOUTHI (Ansar Allah)
- Canali Telegram di media affiliati
- Riportati da: Al Jazeera, Reuters, AP
- Cerca: "Ansar Allah claim", "Houthi attack"

### EU NAVFOR ASPIDES
- Sito ufficiale e account social
- Report operativi periodici
- Cerca: "EUNAVFOR Aspides", "Operation Aspides"

### IRAN
- Dichiarazioni ufficiali IRNA, Fars News
- Portavoce del Ministero degli Esteri
- Cerca: "Iran Red Sea", "Iran Yemen"

---

## Metriche

### Rolling Frequency (24h)
Conteggio dichiarazioni per attore nelle ultime 24 ore.

### Baseline (72h)
Media giornaliera calcolata sulle ultime 72 ore.
`baseline = count_72h / 3`

### Frequency Ratio
`ratio = frequency_24h / baseline`

Interpretazione:
- `< 1.2`: Normale
- `1.2 - 1.8`: Elevato
- `1.8 - 2.5`: Alto (allarme emesso)
- `> 2.5`: Critico

### Prossima metrica (v0.2): Sync Index
Correlazione tra serie di frequenza di due attori su finestra 72h.
Se due attori aumentano ritmo e si muovono in fase, il sistema rileva anomalia di sincronizzazione.

---

## Architettura

```
OPERATORE (tu)
    |
    v
[INGEST FORM] ---> BabElMandebModule.ingest()
    |
    +---> epochs[] (in-memory, max 2000)
    |
    +---> ECOSYSTEM.emitEnvelope() ---> Bus ---> Circulation
    |
    +---> Identity.addEpoch() ---> IndexedDB
    |
    +---> Bus.emit('bab-el-mandeb:epoch-ingested')
    |
    +---> CoreFeed.trigger('bab-el-mandeb-ingest')
    |
    +---> Frequency ratio check
          |
          +---> if ratio > 1.8: emit frequency-alert envelope
```

### File

| File | Ruolo |
|------|-------|
| `js/modules/bab-el-mandeb.js` | Modulo ecosistema: epoch, frequenze, ingestion |
| `bab-el-mandeb.html` | Interfaccia operatore |
| `README-BAB-EL-MANDEB.md` | Questo file |

### Integrazione ecosistema

Il modulo si registra come `bab-el-mandeb` nell'ECOSYSTEM.
Emette envelope con domain `signal` (per dichiarazioni) e `metric` (per frequenze).
Scrive epoch nella Identity timeline con type `theater-event`.
Il CoreFeed reagisce agli eventi con messaggi dei 16 Core.

---

## Tablet / Device sempre acceso

Per lasciare il device acceso col browser collegato all'ecosistema:

1. Apri `bab-el-mandeb.html` nel browser
2. Disattiva il risparmio energetico / sleep automatico del tablet
3. Tieni la tab in primo piano (evita che il browser la sospenda)
4. Il modulo emette metriche di frequenza ogni 60 secondi
5. Lo stato si aggiorna ogni 30 secondi
6. I dati persistono in IndexedDB — sopravvivono al refresh

**Nota**: Se il browser va in background, le tab possono essere sospese.
Mantieni la tab attiva e il display acceso.

---

## Prossimi passi (v0.2)

- [ ] Cross-actor sync index (correlazione frequenze)
- [ ] Pattern composito: "synchronization anomaly"
- [ ] AIS data layer (secondo source)
- [ ] War risk premium tracking
- [ ] Pannello mobile compatto per ingestion rapida

---

*SYNCHRONIZATION IS THE SIGNAL*
*Hybrid Syndicate / Ethic Software Foundation*
