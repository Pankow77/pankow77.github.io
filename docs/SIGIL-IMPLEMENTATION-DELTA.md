# SIGIL — Implementation Delta

## What exists vs what's needed for a playable game

**Generated**: 2026-02-21
**Source**: Dramaturgy v1.0 cross-referenced with codebase

---

## BUILT (operational)

| System | Files | Status |
|--------|-------|--------|
| State manager | `state.js` | 40 keys, 8 hidden, batch updates, watchers |
| Event bus | `bus.js` | Namespaced, wildcard, history replay |
| Module lifecycle | `module-base.js`, `router.js` | Mount/unmount, ESC guard, URL state |
| Intro sequence | `intro.js` | Mandate, GHOST_6 note, accept/refuse |
| Header strip | `header.js` | State, fragility, clock, cycle, phase |
| Footer log | `footer.js` | EVT, FRM, CSQ live feeds |
| Hub grid | `modules/hub.js` | 9 tiles, state-reactive, responsive |
| Exposure tracker | `exposure.js` | Hidden 0-1.0, isolation, termination trigger |
| Termination sequence | `termination.js` | Notice → terminated → succession |
| Selectors | `selectors.js` | Memoized view-model factory |
| CSS narrative | `dashboard.css` | Isolation flicker, state themes, scanlines |
| Module stubs | `agora.js`, `oracle.js`, `archivio.js` | Render from state, selector pattern |

**Summary**: The shell is complete. State flows. Events propagate.
Modules mount and unmount. Hidden systems track and terminate.
The dashboard looks and feels like the game.

---

## NOT BUILT (required for playable game)

### Priority 1 — The game loop (no game without these)

#### 1A. Cycle engine
**What**: Advances cycle 1→40, triggers phase transitions, drives the clock
**Why first**: Everything depends on cycle progression. Without it, static dashboard.
**State keys ready**: `cycle.current`, `cycle.total`, `cycle.phase`, `system.phase`
**Needs**:
- Timer or action-based cycle advancement
- Phase transition logic (ELASTICITY→ACCUMULATION→RIGIDITY→FRACTURE_RISK)
- State batch update per cycle (fragility erosion, drift accumulation)
- Bus events: `cycle:advance`, `cycle:phase-change`

#### 1B. Envelope system
**What**: RSS → classify by archetype → present dilemma → player decides
**Why first**: This IS the gameplay. Player reads, decides, consequences propagate.
**The 7 archetypes** (filters on real RSS):
1. TIMING — Right info, wrong moment
2. FONTE — Protect messenger or message
3. FRAME — Who controls the narrative
4. SCALA — Save one or save many
5. ALLEATO TOSSICO — Enemy of my enemy
6. INFORMAZIONE SPORCA — Truth from liars
7. PROTOCOLLO — Rules protect everyone, including the guilty

**Needs**:
- RSS feed fetcher (Oracle, ICE-Italy, etc.)
- Archetype classifier (can be rule-based initially, LLM later)
- Envelope renderer (the decision UI)
- Choice handler → state consequences
- Consequence propagation (delayed effects on metrics)
- Integration with cycle engine (1 envelope per cycle minimum)

#### 1C. Annotation system (Archivio Silente)
**What**: After each decision, player can write. System stores everything.
**Why first**: The emotional core. PADC and Profile both depend on annotations existing.
**State keys ready**: `operator.annotations`, `archivio.annotations`
**Needs**:
- Text input UI in archivio module
- Storage (localStorage or IndexedDB for persistence)
- Metadata tracking per annotation: timestamp, length, time_spent
- Silent tracking: sentiment proxy (length + time patterns)
- Display of inherited GHOST annotations (predecessor's words)

### Priority 2 — The twists (no emotional payload without these)

#### 2A. PADC / Protocol revelation (Twist 1)
**What**: "Your annotations were never private."
**Trigger**: Cycle 8-22, probability escalating. Modifiable by guilt/fatigue.
**Needs**:
- Probability engine (per-cycle roll with modifiers)
- Full-screen overlay sequence (black screen, timed reveals)
- Annotation statistics display (count, chars, sentiment)
- "Testament" input (the one annotation written knowing you're read)
- Choice: CONTINUA or PASSA IL TESTIMONE
- Post-PADC: performativity tracking on future annotations
- Behavioral metrics only (time, length, variance) — no keyword matching

#### 2B. Profile reveal (Twist 2)
**What**: "You're not a person. You're a vector."
**Trigger**: Cycle 26-28
**Needs**:
- Special envelope from Oracle (internal, not RSS)
- Feature vector display (code-formatted, not human-readable)
- State keys: predictability_index, bias_classification
- Post-Profile: paranoia mechanic (is this envelope real or calibrated?)

### Priority 3 — Atmospheric systems (depth, not core)

#### 3A. Fatigue / guilt mechanics
**What**: Decision fatigue reduces options. Guilt opens destructive paths.
**Needs**:
- `decision_fatigue` state key (0-150)
- `personal_guilt` state key (0-100)
- Option reduction at fatigue thresholds (60/80/95)
- Auto-play at guilt>90 + fatigue>110
- Integration with envelope choice rendering

#### 3B. Agora deliberation (full)
**What**: 16 cores that deliberate on player decisions
**Currently**: Stub showing intensity + polarization bars
**Needs**:
- Core opinion generation (per-envelope reactions)
- Dissent injection during isolation phase
- Visual: deliberation timeline, core positions

#### 3C. Oracle intelligence (full)
**What**: Cross-theatre pattern analysis, confidence scoring
**Currently**: Stub showing confidence + stability
**Needs**:
- RSS correlation engine
- Confidence degradation during isolation
- Signal quality warnings during phase 3

---

## METRICS — Simplified from 12 to 6

The dramaturgy lists 12+ hidden metrics. For implementation, 6 core
metrics drive all mechanics. Others are derivable or cosmetic.

| Metric | Range | Drives |
|--------|-------|--------|
| `exposure` | 0.0-1.0 | Isolation, termination (BACKBONE) |
| `predictability` | 0.0-1.0 | Profile reveal content (BACKBONE) |
| `fatigue` | 0-150 | Option reduction |
| `guilt` | 0-100 | PADC trigger modifier, destructive options |
| `performativity` | 0.0-1.0 | Post-PADC annotation quality |
| `coherence` | 0.0-1.0 | Visible to player, frame consistency |

**Already in state.js**: exposure (as `_exposure.index`), coherence (as `operator.coherence`)
**Need to add**: predictability, fatigue, guilt, performativity

---

## LANGUAGE ALIGNMENT

The dramaturgy doc uses pre-calibration strings in several places.
Current codebase uses the Plague Inc calibrated versions:

| Dramaturgy says | Code says | Status |
|-----------------|-----------|--------|
| "CNS INTERNAL NOTICE" | "AVVISO DI SISTEMA" | Code updated |
| "NODE RISK PROFILE: ELEVATED" | removed | Code updated |
| "eccessiva correlazione cross-theatre" | "Hai visto troppo." | Code updated |
| "PROFILO OPERATIVO — GHOST_7" | "GHOST_7 — RIEPILOGO" | Code updated |
| frame_consistency | consistency | Code updated |
| cross_theatre_depth | pattern_depth | Code updated |
| annotation_density | output_density | Code updated |
| exposure_index | visibility | Code updated |
| "NOTA OPERATIVA — GHOST_6" | "NOTA DAL PREDECESSORE" | Code updated |
| "Monitorare teatri critici..." | "Osservare. Interpretare. Decidere." | Code updated |
| "confidence >0.95" | "Quando qualcosa sembra troppo chiaro, dubita." | Code updated |

---

## BUILD ORDER (recommended)

```
Phase A — Make it tick
  1. Cycle engine (cycles advance, phases transition)
  2. Envelope system (RSS → dilemma → decision → consequence)
  3. Annotation system (write, store, inherit)
  → Result: playable 40-cycle loop

Phase B — Make it hurt
  4. PADC revelation (Twist 1)
  5. Profile reveal (Twist 2)
  6. Fatigue + guilt mechanics
  → Result: complete emotional arc

Phase C — Make it breathe
  7. Full Agora deliberation
  8. Full Oracle intelligence
  9. Performativity tracking
  → Result: atmospheric depth
```

Phase A is the game. Phase B is the art. Phase C is the polish.
