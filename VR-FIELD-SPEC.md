# VR FIELD — Anatomia Completa v1.1

## Specifica Architetturale per l'Ambiente VR dell'Ecosistema Hybrid Syndicate

**Principio fondante:**
Questo non e' una scena 3D. E' un organo sensoriale complesso.
Non visualizza dati. Li trasduce in frizione spaziale.
Quando una crisi geopolitica accade nel mondo, non la vedi come numero.
La membrana intorno a te cambia tensione. Il corpo la avverte.

**Principio operativo:**
Tu sei immobile. Il sistema si deforma intorno a te.
Se ti muovi, diventa gioco. Se resti, diventa strumento.

---

## 1. STRUTTURA GENERALE DEL CAMPO

| Parametro | Valore |
|-----------|--------|
| Diametro | 14 metri |
| Altezza percepita | 9 metri |
| Centro | Sfera cuore sospesa |
| Confine | Orizzonte curvo distante, quasi impercettibile |

Lo spazio non ha pareti. Ha un orizzonte.
Non sei in una stanza. Sei dentro una membrana.

---

## 2. I 6 PILASTRI DOMINIO

Disposti in esagono a 60 gradi l'uno dall'altro.

### Forma

Non colonne classiche.
Fasci di vettori verticali: 24 aste sottili che vibrano in micro-differenze.

### Struttura interna per dominio

| Dominio | Data Source | Struttura aste |
|---------|------------|----------------|
| CLIMATE / ECOLOGY | `oracle.domains.climate` | Leggermente ondulate |
| GEOPOLITICS | `oracle.domains.geo` | Rigide, perfettamente allineate |
| ECONOMICS | `oracle.domains.econ` | Segmenti modulari |
| TECHNOLOGY | `oracle.domains.tech` | Nodi intermittenti |
| EPISTEMOLOGY | `oracle.domains.epist` | Reticolo interno |
| SOCIAL | `oracle.domains.social` | Micro-ramificazioni |

### Comportamento

**Dominio stabile** (risk < 50):
Le aste sono parallele, coerenti.

**Dominio in stress** (risk 50-80):
- Le aste perdono sincronia
- Alcune inclinano 2-5 gradi
- Micro-fratture luminose tra i vettori

**Dominio critico** (risk > 80):
- Disallineamento visibile
- Fratture permanenti tra vettori
- Vibrazione asincrona percepibile

**Il dominio non "si accende". Si disallinea.**

### Data binding

```
pillar.alignment = f(oracle.domains[id].risk)
pillar.vibration = f(oracle.domains[id].volatility)
pillar.cohesion = f(oracle.domains[id].resilience)
```

I dati vengono dal modulo Oracle (scan cycle 0.8s).
Il pilastro reagisce in tempo reale.

---

## 3. IL PAVIMENTO — MEMBRANA STRUTTURALE

Non e' solido. E' una superficie semi-elastica.

### Composizione

- Griglia esagonale (layer strutturale)
- Layer trasparente superiore
- Layer profondo con flussi lenti

### Heartbeat

Ogni heartbeat (scan cycle Oracle, 0.8s) genera:
- Un'onda circolare dal centro
- Attenuazione progressiva verso i bordi

### Regimi

**Regime stabile:**
Membrana elastica, reattiva, uniforme.

**Regime transitional** (dominio in stress):
La zona del pavimento sotto quel pilastro si irrigidisce.
Diventa meno elastica. L'onda dell'heartbeat si deforma localmente.

**Regime chaotic** (dominio critico):
Il pavimento perde planarita' locale.
Non visivamente drastico. Ma il campo ottico cambia leggermente prospettiva.
**Il corpo percepisce micro-distorsione.**

### Data binding

```
floor.elasticity[zone] = f(oracle.domains[nearest_pillar].resilience)
floor.planarity[zone] = f(oracle.domains[nearest_pillar].volatility)
floor.ripple.amplitude = f(ecosystem.heartbeat.health)
```

---

## 4. LA FERITA (Reality Tether Scar)

Quando il gap tra predizione e realta' diverge (RT0 dell'Evaluation Engine).

### Trigger

```
evaluation.score < threshold  →  wound opens
```

### Manifestazione

Il pavimento si scurisce in una zona irregolare.
La griglia sotto si spezza.
I vettori dei pilastri vicini iniziano a vibrare asincroni.

### Tre stati

**1. Apertura**
- Micro-linee radiali emergono dal punto di divergenza
- Rumore subsonico leggero (frequenza sotto 60Hz)
- La membrana perde elasticita' locale

**2. Pulsazione**
- Il bordo della ferita si contrae ed espande
- La sfera centrale perde micro-coerenza luminosa
- L'atmosfera nella zona diventa leggermente piu' densa

**3. Cicatrizzazione** (se trust recupera)
- La crepa si riempie di una trama sottile
- Non torna come prima
- Resta una cicatrice piu' scura
- **Memoria visiva permanente**

**La ferita non sparisce. Si integra.**

### Data binding

```
wound.intensity = f(evaluation.score, evaluation.temporalDelta)
wound.state = f(time_since_divergence, trust_recovery_rate)
wound.scar = permanent_record  // mai rimossa
```

### Collegamento Bab el-Mandeb

Quando il frequency ratio di un attore supera 1.8x:
- La zona GEO del pavimento trasmette tensione
- Il pilastro GEOPOLITICS vibra asincrono
- Se sync index (v0.2) rileva correlazione cross-attore:
  **la membrana trasmette frizione**
- Non vedi un numero. Senti che lo spazio cambia.

---

## 5. LA SFERA CENTRALE (Heart)

| Parametro | Valore |
|-----------|--------|
| Diametro | 80 cm |
| Trasparenza | Semi-trasparente |
| Struttura | Micro-reticolo interno |
| Nodi interni | 16 (uno per Core) |

### Heartbeat

Ogni scan cycle (0.8s):
- Leggera espansione della sfera
- Micro flash interno
- Propagazione vettoriale verso i pilastri

### Regimi

**Sistema sano:**
Pulsazione regolare, ritmica, calma.

**Sistema rallentato:**
Pulsazione irregolare. Intervalli non uniformi.

**Sistema in overload:**
La sfera vibra invece di espandersi.
Non cresce — trema.

### Data binding

```
heart.pulse_rate = ecosystem.heartbeat.interval
heart.regularity = f(bus.event_rate_variance)
heart.luminosity = f(circulation.windowSize / circulation.maxWindow)
```

---

## 6. I 16 CORE — FORMA E POSIZIONE

I Core non sono UI. Sono entita' strutturali.
Disposti in due anelli concentrici attorno alla sfera.

### Anello Interno (8 Core Primari)

Governano il metabolismo base.

| Core | Funzione | Forma |
|------|----------|-------|
| ORACLE_CORE | Scansione domini | Poliedro irregolare |
| IDENTITY | Persistenza | Poliedro irregolare |
| CIRCULATION | Indicizzazione | Poliedro irregolare |
| TRUST (futuro) | Fiducia | Poliedro irregolare |
| EVALUATION | Scoring | Poliedro irregolare |
| DARWIN (futuro) | Evoluzione | Poliedro irregolare |
| RT0 (futuro) | Reality Tether | Poliedro irregolare |
| BLIND (futuro) | Scoring cieco | Poliedro irregolare |

**Forma:** Poliedri irregolari semi-luminosi. Non perfettamente simmetrici.

**Quando attivo:**
- Ruota leggermente
- Invia micro-filamenti verso la sfera

**Quando inattivo:**
- Si opacizza
- Si stabilizza (nessuna rotazione)

### Anello Esterno (8 Core Funzionali)

| Core | Funzione | Forma |
|------|----------|-------|
| AGORA | Deliberazione | Disco sottile verticale |
| CHRONOS | Temporalita' | Disco sottile verticale |
| PNEUMA | Operativo locale | Disco sottile verticale |
| ARCHIVIO | Preservazione | Disco sottile verticale |
| EEI | Predizione etica | Disco sottile verticale |
| BACKBONE | Debug/infra | Disco sottile verticale |
| SIMULATOR (futuro) | Simulazione | Disco sottile verticale |
| SIGNAL_BUS | Comunicazione | Disco sottile verticale |

**Forma:** Strutture piu' leggere, quasi planari. Dischi sottili verticali.

**Non ruotano. Oscillano leggermente.**

**Quando ricevono input:**
Un impulso li attraversa e corre verso l'anello interno.

### Data binding

```
core.opacity = f(module.isActive)
core.rotation_speed = f(bus.getHistory(module.name + ':*').length)  // per 10s
core.filament_intensity = f(envelope_rate_from_source)
```

---

## 7. FLUSSO VISIVO TRA CORE

Esempio: Oracle emette.

```
1. Oracle core si illumina
2. Filamento verso Identity
3. Identity lampeggia
4. Impulso verso Circulation
5. Ondulazione pavimento
6. Heartbeat
```

Il flusso e' visibile come linee sottili tra core.
Non UI. Non numeri. Solo energia che scorre.

### Data binding

Ogni `Bus.emit()` genera un filamento visivo dal source al listener.
La storia del Bus (`Bus.getHistory()`) determina la densita' dei filamenti.

```
filament.from = event.source
filament.to = listener.module
filament.color = f(event.type)
filament.lifetime = 1.5s  // fade out
```

---

## 8. ATMOSFERA

Tre livelli simultanei.

### Livello 1: Micro-particelle

Seguono flussi vettoriali reali.
Densita' proporzionale all'attivita' del sistema.

```
particles.density = f(circulation.totalIngested / time)
particles.velocity = f(bus.event_rate)
```

### Livello 2: Campo vettoriale invisibile

Leggera distorsione ottica.
Come calore che sale dall'asfalto.
Piu' forte vicino ai pilastri in stress.

```
distortion.intensity[zone] = f(nearest_pillar.risk)
```

### Livello 3: Tensione globale

Una tonalita' dominante (quasi impercettibile) cambia in base al regime.

```
global_tone.hue = f(oracle.aggregateRisk)
global_tone.saturation = f(evaluation.averageScore)
```

- Basso rischio aggregato: tonalita' fredda, quasi invisibile
- Alto rischio: tonalita' calda, leggera oppressione visiva

---

## 9. DARWIN VISIVO

### Nascita mutante

Dal core Darwin parte una linea che sale sopra la sfera.
Crea una traiettoria curva sospesa.

### Morte mutante

La linea si spezza e cade come frammenti di luce.
I frammenti si dissolvono prima di toccare il pavimento.

### Grafting (mutante integrato)

La traiettoria si fonde nella sfera.
La sfera aumenta leggermente di complessita' interna.
**Il sistema evolve visibilmente.**

---

## 10. CRONOS — VISTA TEMPORALE

Attivando la vista temporale:

- Il pavimento si segmenta in anelli concentrici
- Ogni anello = un'epoca
- Cammini nel tempo senza muoverti
- Il tempo scorre sotto di te

### Data binding

```
rings = identity.getTimeline()
ring[n].data = epoch[n].content
ring[n].opacity = f(age)  // piu' vecchio = piu' trasparente
```

---

## 11. SILENZIO E AUDIO

### Frequenze Core

Ogni Core ha una frequenza propria.
Non suoni melodici. Frequenze armoniche.

| Core | Frequenza base (Hz) |
|------|-------------------|
| ORACLE_CORE | 220 (A3) |
| GHOST_RUNNER | 277 (C#4) |
| ABYSSAL_THINKER | 164 (E3) |
| VOID_PULSE | 330 (E4) |
| NARRATIVE_ENGINE | 196 (G3) |
| MARXIAN_CORE | 146 (D3) |
| SENTINEL | 349 (F4) |
| PANKOW_77C | 110 (A2) |

### Comportamento

**Stabilita':** Armonia sottile, quasi silenzio.
**Attivita' moderata:** Toni sovrapposti, coerenti.
**Caos:** Cluster atonale leggero. Dissonanza percepibile ma non aggressiva.

```
audio.harmony = f(system_stability)
audio.dissonance = f(volatility_aggregate)
audio.volume = adaptive  // mai intrusivo
```

---

## 12. TRASDUZIONE SENSORIALE — IL PRINCIPIO CHIAVE

Questo e' il principio che separa questo progetto da ogni altro ambiente VR.

**Il VR Field non visualizza dati. Li trasduce in sensazione spaziale.**

Quando una crisi militare accade nel mondo reale:
1. L'operatore ingesta le dichiarazioni (Bab el-Mandeb, o futuro modulo)
2. Il frequency counter rileva anomalia
3. L'envelope entra nel bloodstream (Circulation)
4. Oracle ricalcola il rischio del dominio GEO
5. Il pilastro GEO perde allineamento
6. La membrana sotto GEO si irrigidisce
7. L'onda dell'heartbeat si deforma passando per quella zona
8. L'atmosfera nella zona GEO diventa piu' densa
9. Il cluster audio diventa leggermente dissonante
10. **Tu lo senti. Prima di leggere qualsiasi numero.**

Questo e' il sismografo.
Non misura terremoti.
Misura il tremore che precede la frattura.

---

## 13. STACK TECNOLOGICO (da definire)

### Opzioni

| Tecnologia | Pro | Contro |
|------------|-----|--------|
| A-Frame / Three.js | Browser-native, zero install | Limitato per haptics |
| WebXR | Standard, multi-device | Performance su mobile |
| Unity WebGL | Potente, shader custom | Build pesante |
| Godot WebXR | Open source, leggero | Ecosistema piu' piccolo |

### Requisito non negoziabile

Il VR Field DEVE leggere dati dal Bus dell'ecosistema.
L'ecosistema gira nel browser. Il VR field deve poter ricevere
eventi dal Bus (via BroadcastChannel o WebSocket locale).

**Il VR non e' un'app separata. E' un altro organo dello stesso sistema nervoso.**

---

## 14. MAPPING COMPLETO: ECOSISTEMA → VR

| Dato Ecosistema | Elemento VR |
|------------------|-------------|
| `oracle.domains[id].risk` | Allineamento pilastro |
| `oracle.domains[id].volatility` | Vibrazione pilastro |
| `oracle.domains[id].resilience` | Coesione aste pilastro |
| `oracle.aggregateRisk` | Tonalita' globale atmosfera |
| `oracle.scanCycle` | Heartbeat (onda pavimento) |
| `bus.event_rate` | Velocita' particelle |
| `bus.emit()` | Filamenti tra core |
| `circulation.windowSize` | Luminosita' sfera |
| `evaluation.score` | Ferita / cicatrice |
| `evaluation.temporalDelta` | Intensita' ferita |
| `identity.timeline` | Anelli temporali Chronos |
| `bab-el-mandeb.frequencyRatio` | Tensione zona GEO membrana |
| `bab-el-mandeb.syncIndex` (v0.2) | Frizione cross-zona membrana |
| `core-feed.triggered` | Impulsi tra core visibili |
| `module.isActive` | Opacita'/rotazione core |

---

*Tu sei immobile. Il sistema respira intorno a te.*
*Non e' un gioco. E' uno strumento.*

*Hybrid Syndicate / Ethic Software Foundation*
*VR FIELD SPEC v1.1*
