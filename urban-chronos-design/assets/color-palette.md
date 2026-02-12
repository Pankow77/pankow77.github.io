# URBAN_CHRONOS v2.0 — Design Tokens & Color Palette

## Palette Principale (Cyberpunk / HYBRID SYNDICATE)

### Colori Primari

| Token                  | Hex       | Uso                                    |
|------------------------|-----------|----------------------------------------|
| `--bg-primary`         | `#0a0a0a` | Sfondo principale                      |
| `--bg-secondary`       | `#111111` | Sfondo pannelli/card                   |
| `--bg-tertiary`        | `#1a1a1a` | Sfondo elementi interattivi            |
| `--bg-elevated`        | `#0d1117` | Sfondo modale/dialog                   |

### Colori Accento

| Token                  | Hex       | Uso                                    |
|------------------------|-----------|----------------------------------------|
| `--neon-green`         | `#00ff41` | Stato OK / Percorso ottimizzato        |
| `--neon-green-dim`     | `#00cc33` | Green secondario                       |
| `--neon-green-glow`    | `#00ff4120` | Glow effect (con alpha)              |
| `--neon-amber`         | `#ffaa00` | Warning / Percorso divergente          |
| `--neon-amber-dim`     | `#cc8800` | Amber secondario                       |
| `--neon-red`           | `#ff0040` | Errore / Critico / Null Zone           |
| `--neon-red-glow`      | `#ff004020` | Red glow (con alpha)                 |
| `--cyber-cyan`         | `#00ffff` | Info / Dati / Link                     |
| `--vhs-purple`         | `#9d00ff` | Effetti speciali / Easter egg          |

### Testo

| Token                  | Hex       | Uso                                    |
|------------------------|-----------|----------------------------------------|
| `--text-primary`       | `#e0e0e0` | Testo principale                       |
| `--text-secondary`     | `#888888` | Testo secondario / Label               |
| `--text-muted`         | `#555555` | Testo disabilitato                     |
| `--text-green`         | `#00ff41` | Testo evidenziato (terminale)          |
| `--text-amber`         | `#ffaa00` | Testo warning                          |
| `--text-red`           | `#ff0040` | Testo errore                           |

### Bordi e Separatori

| Token                  | Hex       | Uso                                    |
|------------------------|-----------|----------------------------------------|
| `--border-default`     | `#222222` | Bordo card/pannelli                    |
| `--border-active`      | `#00ff41` | Bordo elemento attivo                  |
| `--border-warning`     | `#ffaa00` | Bordo warning                          |
| `--border-critical`    | `#ff0040` | Bordo stato critico                    |

## Tipografia

### Font Principale
- **Font:** `Orbitron` (Google Fonts)
- **Fallback:** `'Courier New', monospace`
- **Import FlutterFlow:** Aggiungi Orbitron da Google Fonts nelle impostazioni tema

### Scala Tipografica

| Stile              | Size  | Weight    | Uso                         |
|--------------------|-------|-----------|----------------------------|
| `displayLarge`     | 32px  | Bold 700  | Titolo pagina               |
| `displayMedium`    | 24px  | Bold 700  | Titolo sezione              |
| `headlineMedium`   | 20px  | Semi 600  | Titolo card                 |
| `titleMedium`      | 16px  | Semi 600  | Titolo elemento             |
| `bodyLarge`        | 14px  | Regular   | Testo corpo                 |
| `bodyMedium`       | 13px  | Regular   | Testo secondario            |
| `labelLarge`       | 12px  | Bold 700  | Label / Badge               |
| `labelSmall`       | 10px  | Bold 700  | Micro-label / Stat          |

### Stile Terminale (per System Log)

```
Font: 'Courier New', monospace
Size: 12px
Weight: Regular 400
Line-height: 1.6
Color: --neon-green
Background: --bg-primary
```

## Componenti UI — Stili FlutterFlow

### Card Pannello

```
Container:
  Background: --bg-secondary (#111111)
  Border: 1px solid --border-default (#222222)
  Border Radius: 0px (angoli netti, stile terminale)
  Padding: 16px
  Shadow: none

  Header:
    Border-bottom: 1px solid --border-default
    Padding-bottom: 12px
    Label style: labelLarge, --text-secondary, uppercase
    Letter-spacing: 2px
```

### Bottone Primario

```
ElevatedButton:
  Background: transparent
  Border: 1px solid --neon-green
  Border Radius: 0px
  Text: Orbitron, labelLarge, --neon-green, uppercase
  Letter-spacing: 2px
  Padding: 12px 24px

  Hover:
    Background: --neon-green-glow
    Border: 1px solid --neon-green

  Pressed:
    Background: --neon-green
    Text color: --bg-primary (inversione)
```

### Slider

```
Slider:
  Active track: --neon-green
  Inactive track: --bg-tertiary
  Thumb: --neon-green, 16x16, square (border-radius: 0)
  Label: sopra il thumb, labelSmall, --neon-green

  Warning variant:
    Active track: --neon-amber
    Thumb: --neon-amber
```

### Toggle Switch

```
Switch:
  Active: --neon-green background
  Inactive: --bg-tertiary background
  Thumb: white, square
  Border: 1px solid --border-default
```

### Radar Chart (metriche vitali)

```
RadarChart (fl_chart):
  Axes: 4 (Efficiency, Sovereignty, Resilience, Predictability)
  Fill color: --neon-green con alpha 20%
  Border color: --neon-green
  Grid color: --border-default
  Label color: --text-secondary
  Dot color: --neon-green (punti sui vertici)
  Background: transparent
```

### Badge di Stato

```
Nominal:
  Background: --neon-green con alpha 15%
  Border: 1px solid --neon-green
  Text: --neon-green, labelSmall

Warning:
  Background: --neon-amber con alpha 15%
  Border: 1px solid --neon-amber
  Text: --neon-amber, labelSmall

Critical:
  Background: --neon-red con alpha 15%
  Border: 1px solid --neon-red
  Text: --neon-red, labelSmall
```

### Grid Cell (Mappa Settore)

```
Optimized Path (Algoritmo):
  Background: --neon-green
  Size: 12x12px
  Border: none

Divergent Path (Umano):
  Background: --neon-amber
  Size: 8x8, border-radius: 50% (cerchio)
  Border: none

Null Zone:
  Background: diagonale pattern (--neon-red + --bg-primary)
  Size: 12x12px
  Pattern: 45deg stripes, 2px wide
```

## Animazioni

### Boot Sequence (Splash)
- Typing effect: carattere per carattere, 50ms delay
- Cursor lampeggiante: `|` con opacity 0/1 ogni 500ms
- Fade-in progressivo dei blocchi: 200ms stagger

### Transizioni Pagina
- Tipo: Fade + leggero slide up
- Durata: 300ms
- Curva: `easeOutCubic`

### Glitch Effect (per stati critici)
- Tipo: Horizontal shift + color split
- Durata: 150ms
- Trigger: quando Sovereignty < 30%
- Frequenza: random, ogni 3-8 secondi

### Pulse Effect (dati live)
- Tipo: Scale 1.0 → 1.05 → 1.0
- Durata: 1000ms
- Trigger: quando arrivano nuovi dati
- Applicato a: badge, indicatori numerici

## Google Maps Custom Style

Stile mappa personalizzato per mantenere l'estetica cyberpunk:

```json
[
  { "elementType": "geometry", "stylers": [{ "color": "#0a0a0a" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#00ff41" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#0a0a0a" }] },
  {
    "featureType": "road",
    "elementType": "geometry",
    "stylers": [{ "color": "#1a1a1a" }]
  },
  {
    "featureType": "road",
    "elementType": "geometry.stroke",
    "stylers": [{ "color": "#222222" }]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [{ "color": "#001a33" }]
  },
  {
    "featureType": "poi",
    "elementType": "geometry",
    "stylers": [{ "color": "#111111" }]
  },
  {
    "featureType": "transit",
    "elementType": "geometry",
    "stylers": [{ "color": "#0d1117" }]
  },
  {
    "featureType": "administrative",
    "elementType": "geometry.stroke",
    "stylers": [{ "color": "#00ff4140" }]
  }
]
```
