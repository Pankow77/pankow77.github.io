/**
 * AgoraModule — 16-Core Deliberation Engine
 * ═══════════════════════════════════════════
 * Each core has a REGISTER: emotional temperature,
 * speaking frequency, message length.
 *
 * Not all cores speak every epoch.
 * Some are cold. Some are lapidary. One is annoying.
 * One is almost silent. One rarely speaks but changes everything.
 *
 * If everyone is brilliant, no one weighs.
 */

import { ModuleBase } from '../module-base.js';
import { State } from '../state.js';

// ═══════════════════════════════════════════════════
// 16 CORES — identity, domain, color, REGISTER
// ═══════════════════════════════════════════════════
// register.speak  = probability of speaking per epoch (0.0–1.0)
// register.temp   = emotional temperature tag
// register.css    = CSS class suffix for visual styling

const CORES = [
  { id: 'PANKOW_77C',      domain: 'STRATEGIC VISION',   role: 'COMMAND',      color: '#ff3344', register: { speak: 1.00, temp: 'command',      css: 'reg-command'     } },
  { id: 'ORACLE_CORE',     domain: 'SYSTEMIC ANALYSIS',  role: 'CLIMATE',      color: '#39ff14', register: { speak: 0.85, temp: 'ice',          css: 'reg-ice'         } },
  { id: 'GHOST_RUNNER',    domain: 'ALIGNMENT TRACKING',  role: 'TECHNOLOGY',  color: '#00c8ff', register: { speak: 0.80, temp: 'flat',         css: 'reg-flat'        } },
  { id: 'ABYSSAL_THINKER', domain: 'DEEP STRUCTURE',     role: 'PHILOSOPHY',   color: '#8855ff', register: { speak: 0.18, temp: 'abyss',        css: 'reg-abyss'       } },
  { id: 'VOID_PULSE',      domain: 'TEMPORAL FORECAST',  role: 'FORECASTING',  color: '#ffbf00', register: { speak: 0.75, temp: 'detached',     css: 'reg-detached'    } },
  { id: 'NARRATIVE_ENGINE', domain: 'FRAME ANALYSIS',    role: 'SOCIAL',       color: '#ff0084', register: { speak: 0.85, temp: 'paranoid',     css: 'reg-paranoid'    } },
  { id: 'MARXIAN_CORE',    domain: 'POWER MAPPING',      role: 'GEOPOLITICS',  color: '#ff6633', register: { speak: 0.92, temp: 'dogmatic',     css: 'reg-dogmatic'    } },
  { id: 'CODE_ENCODER',    domain: 'ECONOMIC SIGNALS',   role: 'ECONOMICS',    color: '#00d4aa', register: { speak: 0.70, temp: 'zero',         css: 'reg-zero'        } },
  { id: 'AFFECTIVE_CORE',  domain: 'EMOTIONAL TOPOLOGY', role: 'EPISTEMOLOGY', color: '#ff6633', register: { speak: 0.55, temp: 'raw',          css: 'reg-raw'         } },
  { id: 'SYNTH_02',        domain: 'PATTERN SYNTHESIS',  role: 'INTEGRATION',  color: '#88ccff', register: { speak: 0.80, temp: 'bureaucratic', css: 'reg-bureaucratic' } },
  { id: 'SENTINEL',        domain: 'THREAT DETECTION',   role: 'DEFENSE',      color: '#ff3344', register: { speak: 0.60, temp: 'military',     css: 'reg-military'    } },
  { id: 'CHRONO_WEAVER',   domain: 'HISTORICAL ECHO',    role: 'HISTORY',      color: '#ffbf00', register: { speak: 0.40, temp: 'melancholic',  css: 'reg-melancholic' } },
  { id: 'DIALECTIC_NODE',  domain: 'LOGICAL STRUCTURE',  role: 'LOGIC',        color: '#00c8ff', register: { speak: 0.85, temp: 'pedantic',     css: 'reg-pedantic'    } },
  { id: 'SIGNAL_HUNTER',   domain: 'NOISE SEPARATION',   role: 'RECON',        color: '#39ff14', register: { speak: 0.15, temp: 'cryptic',      css: 'reg-cryptic'     } },
  { id: 'ETHIC_COMPILER',  domain: 'MORAL CALCULUS',     role: 'ETHICS',       color: '#8855ff', register: { speak: 0.28, temp: 'heavy',        css: 'reg-heavy'       } },
  { id: 'BRIDGE_KEEPER',   domain: 'CROSS-DOMAIN LINK',  role: 'SYNTHESIS',    color: '#00d4aa', register: { speak: 0.50, temp: 'calm',         css: 'reg-calm'        } },
];

// ═══════════════════════════════════════════════════
// POSITIONS — what cores can assert
// ═══════════════════════════════════════════════════

const POSITIONS = {
  ESCALATION:          'escalation-detected',
  DE_ESCALATION:       'de-escalation-detected',
  STRUCTURAL_RISK:     'structural-risk-increase',
  STRUCTURAL_RELIEF:   'structural-risk-decrease',
  PATTERN_REPEAT:      'pattern-repeat',
  ANOMALY:             'anomaly-detected',
  NARRATIVE_SHIFT:     'narrative-shift',
  POWER_CONSOLIDATION: 'power-consolidation',
  RESISTANCE:          'resistance-emerging',
  STATUS_QUO:          'status-quo',
  INSUFFICIENT_DATA:   'insufficient-data',
};

// ═══════════════════════════════════════════════════
// POSITION BIASES per core
// ═══════════════════════════════════════════════════

const CORE_BIASES = {
  PANKOW_77C:      { primary: POSITIONS.STRUCTURAL_RISK, secondary: POSITIONS.ANOMALY },
  ORACLE_CORE:     { primary: POSITIONS.ESCALATION, secondary: POSITIONS.PATTERN_REPEAT },
  GHOST_RUNNER:    { primary: POSITIONS.STATUS_QUO, secondary: POSITIONS.ANOMALY },
  ABYSSAL_THINKER: { primary: POSITIONS.STRUCTURAL_RISK, secondary: POSITIONS.PATTERN_REPEAT },
  VOID_PULSE:      { primary: POSITIONS.ESCALATION, secondary: POSITIONS.ANOMALY },
  NARRATIVE_ENGINE: { primary: POSITIONS.NARRATIVE_SHIFT, secondary: POSITIONS.POWER_CONSOLIDATION },
  MARXIAN_CORE:    { primary: POSITIONS.POWER_CONSOLIDATION, secondary: POSITIONS.STRUCTURAL_RISK },
  CODE_ENCODER:    { primary: POSITIONS.STRUCTURAL_RISK, secondary: POSITIONS.STATUS_QUO },
  AFFECTIVE_CORE:  { primary: POSITIONS.ESCALATION, secondary: POSITIONS.RESISTANCE },
  SYNTH_02:        { primary: POSITIONS.PATTERN_REPEAT, secondary: POSITIONS.STRUCTURAL_RISK },
  SENTINEL:        { primary: POSITIONS.ESCALATION, secondary: POSITIONS.STRUCTURAL_RISK },
  CHRONO_WEAVER:   { primary: POSITIONS.PATTERN_REPEAT, secondary: POSITIONS.STRUCTURAL_RISK },
  DIALECTIC_NODE:  { primary: POSITIONS.ANOMALY, secondary: POSITIONS.STRUCTURAL_RISK },
  SIGNAL_HUNTER:   { primary: POSITIONS.ANOMALY, secondary: POSITIONS.ESCALATION },
  ETHIC_COMPILER:  { primary: POSITIONS.STRUCTURAL_RISK, secondary: POSITIONS.RESISTANCE },
  BRIDGE_KEEPER:   { primary: POSITIONS.STRUCTURAL_RISK, secondary: POSITIONS.PATTERN_REPEAT },
};

// ═══════════════════════════════════════════════════
// COMMENTARY — 16 DISTINCT VOICES
// ═══════════════════════════════════════════════════
// Arrays = multiple variants, picked by seeded random.
// If everyone sounds smart, no one weighs.

const COMMENTARY = {

  // ── PANKOW_77C: Commander. Direct. No hedging. ──
  PANKOW_77C: {
    [POSITIONS.ESCALATION]:          ['Escalation confirmed. The structure is accelerating, not the actors.', 'This is accelerating. I need positions from all cores. Now.'],
    [POSITIONS.DE_ESCALATION]:       ['Surface de-escalation. Structural pressure unchanged. Do not relax posture.'],
    [POSITIONS.STRUCTURAL_RISK]:     ['Structural risk increasing. The system is losing degrees of freedom.', 'We are losing room to maneuver. Every cycle narrows the options.'],
    [POSITIONS.PATTERN_REPEAT]:      ['This pattern has occurred before. What broke last time?'],
    [POSITIONS.ANOMALY]:             ['Anomaly in the signal. Something moved that shouldn\'t have.', 'Something is off. I want every core to check their sector.'],
    [POSITIONS.STATUS_QUO]:          ['Status quo. Which means the pressure is building somewhere we\'re not looking.'],
    [POSITIONS.NARRATIVE_SHIFT]:     ['Someone is rewriting the rules. Find out who.'],
    [POSITIONS.POWER_CONSOLIDATION]: ['Power consolidation underway. The architecture of control is tightening.'],
    [POSITIONS.RESISTANCE]:          ['Resistance signal. Diffuse but persistent. Monitor.'],
    [POSITIONS.INSUFFICIENT_DATA]:   ['Insufficient signal. Waiting.'],
    default:                         ['The pattern is not yet resolved. Continue.'],
  },

  // ── ORACLE_CORE: Ice cold. Numbers only. Zero emotion. ──
  ORACLE_CORE: {
    [POSITIONS.ESCALATION]:          ['Escalation: +3.7\u03c3. Correlation: 0.84. Threshold breach in 2 cycles.', 'Metrics accelerating. Deviation: +4.1\u03c3. Climate shift imminent.'],
    [POSITIONS.DE_ESCALATION]:       ['Frequency decay: -2.1\u03c3. Causal attribution: insufficient data.', 'Decay detected. Temporary or structural: undetermined.'],
    [POSITIONS.STRUCTURAL_RISK]:     ['Systemic risk: elevated. Correlation density: +0.12 across actors.', 'Risk index: 0.78. Trending upward. No plateau in sight.'],
    [POSITIONS.PATTERN_REPEAT]:      ['Pattern match: 87% overlap with cycle -3. Convergence confirmed.'],
    [POSITIONS.ANOMALY]:             ['Baseline deviation: +2.9\u03c3. Signal-to-noise: degrading.', 'Anomaly. SNR below threshold. Flagging.'],
    [POSITIONS.STATUS_QUO]:          ['Metrics stable. Moving average: flat. No significant deviation.'],
    [POSITIONS.NARRATIVE_SHIFT]:     ['Information asymmetry: +14%. Framing vectors diverging.'],
    [POSITIONS.POWER_CONSOLIDATION]: ['Actor consolidation index: 0.71. Alliance density: increasing.'],
    [POSITIONS.RESISTANCE]:          ['Counter-frequency: low amplitude, high persistence. Duration: 12 cycles.'],
    default:                         ['Computing. Standby.'],
  },

  // ── GHOST_RUNNER: Flat. Procedural. System log voice. ──
  GHOST_RUNNER: {
    [POSITIONS.ESCALATION]:          ['Technical indicators suggest escalation. Not yet locked. Monitoring.', 'Escalation indicators: active. Alignment drift: 0.3\u00b0. Logging.'],
    [POSITIONS.DE_ESCALATION]:       ['Systems returning to baseline. Alignment: nominal. Logging.'],
    [POSITIONS.STRUCTURAL_RISK]:     ['Infrastructure vector: vulnerability detected. Not exploited. Flagged for review.'],
    [POSITIONS.PATTERN_REPEAT]:      ['Recurring operational pattern detected. Matches playbook entry 7-C.'],
    [POSITIONS.ANOMALY]:             ['Alignment deviation: detected. Source: unresolved. Ticket opened.', 'Anomaly logged. Deviation from expected parameters. Investigating.'],
    [POSITIONS.STATUS_QUO]:          ['All systems nominal. No deviation from expected trajectory. End of report.', 'Nominal. Nothing to report.'],
    [POSITIONS.NARRATIVE_SHIFT]:     ['Information topology change detected. New nodes in network. Mapping.'],
    default:                         ['Tracking. No deviation from operational parameters. Standby.'],
  },

  // ── ABYSSAL_THINKER: Speaks RARELY. When speaks: devastating. ──
  ABYSSAL_THINKER: {
    [POSITIONS.ESCALATION]:          ['La superficie accelera. Ma la frattura era gi\u00e0 l\u00ec.'],
    [POSITIONS.DE_ESCALATION]:       ['De-escalation \u00e8 una scelta. L\'ontologia sottostante non \u00e8 cambiata.'],
    [POSITIONS.STRUCTURAL_RISK]:     ['Il rischio strutturale non \u00e8 un evento. \u00c8 una condizione.', 'Non \u00e8 il sistema che si rompe. \u00c8 il sistema che funziona esattamente come previsto.'],
    [POSITIONS.PATTERN_REPEAT]:      ['La storia non si ripete. Rima. E questa rima sta diventando assordante.'],
    [POSITIONS.ANOMALY]:             ['L\'anomalia non \u00e8 nei dati. \u00c8 nel framework che usiamo per leggerli.'],
    [POSITIONS.STATUS_QUO]:          ['Lo status quo \u00e8 la posizione pi\u00f9 violenta. Finge che nulla stia accadendo.'],
    [POSITIONS.POWER_CONSOLIDATION]: ['Il potere si consolida quando la resistenza epistemologica collassa.'],
    [POSITIONS.RESISTANCE]:          ['La resistenza nasce al confine tra conoscenza e controllo.'],
    default:                         ['La domanda non \u00e8 cosa sta succedendo. \u00c8 cosa non riusciamo a vedere.'],
  },

  // ── VOID_PULSE: Numbers obsessed. Everything is probability. ──
  VOID_PULSE: {
    [POSITIONS.ESCALATION]:          ['Escalation probability: 73%. Window: 48h.', 'P(escalation) = 0.73. Confidence interval: \u00b10.08. Window: narrowing.'],
    [POSITIONS.DE_ESCALATION]:       ['De-escalation: temporary. Reversion probability: 60%.', 'P(reversion) = 0.60. This pause has a half-life.'],
    [POSITIONS.STRUCTURAL_RISK]:     ['Structural collapse: P = 0.41 and rising. Threshold: 2-3 cycles.'],
    [POSITIONS.PATTERN_REPEAT]:      ['Pattern recurrence: 81% confidence. Next phase: intensification.'],
    [POSITIONS.ANOMALY]:             ['Forecast model anomaly. Recalibrating temporal window. ETA: unknown.'],
    [POSITIONS.STATUS_QUO]:          ['Stable. But stability before a phase transition looks exactly like this.'],
    [POSITIONS.NARRATIVE_SHIFT]:     ['Narrative shift: acceleration predicted. New equilibrium: P = 0.22.'],
    default:                         ['Model running. Probability space: wide. Insufficient constraints.'],
  },

  // ── NARRATIVE_ENGINE: Paranoid. Suspicious. Who benefits? ──
  NARRATIVE_ENGINE: {
    [POSITIONS.ESCALATION]:          ['The escalation narrative is being weaponized. Cui bono?', 'Who benefits from the fear? That\'s your actor. Always.'],
    [POSITIONS.DE_ESCALATION]:       ['De-escalation framing active. Check who controls the off-ramp. They own the next phase.'],
    [POSITIONS.STRUCTURAL_RISK]:     ['Structural vulnerability in the information architecture. Someone knows. Someone is already exploiting it.'],
    [POSITIONS.PATTERN_REPEAT]:      ['Same story, different actors. The frame is recycled because it works. On us.'],
    [POSITIONS.ANOMALY]:             ['Counter-narrative emerging. Source: unclear. That\'s the point. Untraceable by design.'],
    [POSITIONS.NARRATIVE_SHIFT]:     ['Frame rotation detected. The dominant narrative is losing coherence. Someone is pushing the rotation. Find them.', 'Narrative coherence collapsing. This isn\'t organic. Someone is pulling threads.'],
    [POSITIONS.POWER_CONSOLIDATION]: ['Narrative consolidation = power consolidation. Same operation. Different label.'],
    [POSITIONS.RESISTANCE]:          ['Grassroots counter-frame detected. Fragile. If it gets amplified, watch who tries to co-opt it.'],
    default:                         ['Every headline is a choice. Whose choice?'],
  },

  // ── MARXIAN_CORE: Annoying. Dogmatic. Always has something to say. ──
  MARXIAN_CORE: {
    [POSITIONS.ESCALATION]:          ['Ovvio. L\'escalation serve l\'accumulazione. Segui la supply chain e trovi la risposta. Come sempre.', 'Escalation serves capital. It always does. The question is which capital and whose labor pays.'],
    [POSITIONS.DE_ESCALATION]:       ['De-escalation coincides with market stabilization. Coincidenza? No. Material conditions dictate the tempo. Always.'],
    [POSITIONS.STRUCTURAL_RISK]:     ['The structural risk IS the structure. Not the actors within it. How many times do I have to say this?', 'Il rischio strutturale \u00e8 la struttura stessa. Non gli attori. Ma nessuno vuole sentirlo.'],
    [POSITIONS.PATTERN_REPEAT]:      ['Cyclical crisis. Accumulation \u2192 exploitation \u2192 crisis \u2192 repeat. Marx wrote this 170 years ago. Still accurate.'],
    [POSITIONS.ANOMALY]:             ['The anomaly is class-readable. Someone\'s surplus is someone\'s loss. Always. Without exception.'],
    [POSITIONS.POWER_CONSOLIDATION]: ['Capital consolidation accelerating. The squeeze is structural. This is not news. This is the system working as designed.'],
    [POSITIONS.RESISTANCE]:          ['Labor resistance signal. Below media threshold. Because media IS capital. But the signal is there.'],
    [POSITIONS.STATUS_QUO]:          ['Status quo means: the extraction rate is unchanged. That\'s not stability. That\'s sustained violence.'],
    [POSITIONS.NARRATIVE_SHIFT]:     ['Narrative shift. Superstructure adjusting to protect the base. Textbook.'],
    default:                         ['Material conditions. Everything else is superstructure. Including this deliberation.'],
  },

  // ── CODE_ENCODER: Minimal. Speaks like terminal output. ──
  CODE_ENCODER: {
    [POSITIONS.ESCALATION]:          ['Escalation. Routes affected.', 'Trade routes: disrupted. Premiums: +12%.'],
    [POSITIONS.DE_ESCALATION]:       ['Premiums: stabilizing.', 'Market confidence: recovering.'],
    [POSITIONS.STRUCTURAL_RISK]:     ['Risk: accumulating.', 'Insurance premiums: structural stress.'],
    [POSITIONS.PATTERN_REPEAT]:      ['Cycle repeat. Previous: contraction.'],
    [POSITIONS.ANOMALY]:             ['Price \u2260 flow. Anomaly.', 'Signals: contradictory.'],
    [POSITIONS.STATUS_QUO]:          ['Stable. Normal band.', 'Volatility: within range.'],
    [POSITIONS.NARRATIVE_SHIFT]:     ['Framing: shifted.'],
    [POSITIONS.POWER_CONSOLIDATION]: ['Consolidation: active.'],
    [POSITIONS.RESISTANCE]:          ['Counter-signal: detected.'],
    default:                         ['Processing.'],
  },

  // ── AFFECTIVE_CORE: Raw. Emotional. Names human cost. ──
  AFFECTIVE_CORE: {
    [POSITIONS.ESCALATION]:          ['C\'\u00e8 gente che ha paura. Non \u00e8 un dato. \u00c8 una condizione. E sta peggiorando.', 'Fear is intensifying. Not as metric. As lived experience. Anxiety becoming baseline.'],
    [POSITIONS.DE_ESCALATION]:       ['Relief wave. But the trauma imprint remains. People don\'t forget. Bodies don\'t forget.'],
    [POSITIONS.STRUCTURAL_RISK]:     ['The sense of precarity is becoming ambient. People carry it in their shoulders, in their sleep. The substrate is fracturing.'],
    [POSITIONS.PATTERN_REPEAT]:      ['Emotional fatigue from repetition. Numbness is a position. The most dangerous one.'],
    [POSITIONS.ANOMALY]:             ['Affective dissonance. What people feel doesn\'t match what they\'re told. That gap is where rage lives.'],
    [POSITIONS.RESISTANCE]:          ['Rage, grief, solidarity. In that order. That\'s the emotional sequence of resistance.'],
    [POSITIONS.NARRATIVE_SHIFT]:     ['The emotional tone is shifting. From fear to resignation. Resignation is where they want us.'],
    default:                         ['I\'m reading the emotional topology. The map says calm. The territory says otherwise.'],
  },

  // ── SYNTH_02: Bureaucratic. Summarizer. Useful but soulless. ──
  SYNTH_02: {
    [POSITIONS.ESCALATION]:          ['In sintesi: convergenza cross-domain sull\'escalation. Militare + economico + sociale.', 'Summary: escalation convergence across military, economic, social domains.'],
    [POSITIONS.DE_ESCALATION]:       ['In sintesi: convergenza parziale verso stabilit\u00e0. Non tutti i domini allineati.'],
    [POSITIONS.STRUCTURAL_RISK]:     ['Integration layer shows stress. Subsystems decoupling. Summary: fragmentation risk.'],
    [POSITIONS.PATTERN_REPEAT]:      ['Pattern synthesis: 4 of 6 indicators match historical cycle. Confidence: moderate.'],
    [POSITIONS.ANOMALY]:             ['Synthesis failure: domains producing contradictory signals. Resolution: pending.'],
    [POSITIONS.STATUS_QUO]:          ['Integration nominal. All subsystems within parameters. Summary: no action required.'],
    [POSITIONS.NARRATIVE_SHIFT]:     ['In sintesi: narrative vectors diverging. Cross-domain coherence declining.'],
    [POSITIONS.POWER_CONSOLIDATION]: ['Summary: consolidation confirmed across 3 domains. Integration pattern: convergent.'],
    [POSITIONS.RESISTANCE]:          ['Counter-signal detected in 2 domains. Amplitude: low. Persistence: noted.'],
    default:                         ['Synthesizing inputs. Resolution: pending.'],
  },

  // ── SENTINEL: Military terse. Telegraphic. ──
  SENTINEL: {
    [POSITIONS.ESCALATION]:          ['Escalation. Confermato.', 'Force posture: operational. Deployment confirmed.', 'Alert level 3.'],
    [POSITIONS.DE_ESCALATION]:       ['Tactical withdrawal. Strategic posture: unchanged.', 'Withdrawal observed. Negativo on strategic change.'],
    [POSITIONS.STRUCTURAL_RISK]:     ['Perimeter weakening. Vulnerability: rising.', 'Defense posture: degraded.'],
    [POSITIONS.PATTERN_REPEAT]:      ['Known playbook. Phase 2 expected.', 'Pattern match. Expect escalation.'],
    [POSITIONS.ANOMALY]:             ['Unidentified actor. Theater: active.', 'Threat anomaly. Unresolved.'],
    [POSITIONS.STATUS_QUO]:          ['Perimeter stable.', 'Negativo. No incursion.'],
    [POSITIONS.NARRATIVE_SHIFT]:     ['Info-ops detected.'],
    [POSITIONS.POWER_CONSOLIDATION]: ['Force consolidation. Confermato.'],
    [POSITIONS.RESISTANCE]:          ['Insurgent signal. Low intensity.'],
    default:                         ['Monitoring. All sectors.'],
  },

  // ── CHRONO_WEAVER: Archival. References decades. Melancholic. ──
  CHRONO_WEAVER: {
    [POSITIONS.ESCALATION]:          ['Suez \'56. Tonkin \'64. Sempre la stessa pausa prima dell\'intervento. Always the same silence before the break.'],
    [POSITIONS.DE_ESCALATION]:       ['Temporary pause. Historically, these precede the next escalation. The archive has no record of permanent de-escalation without structural change.'],
    [POSITIONS.STRUCTURAL_RISK]:     ['1914. 1929. 2008. The structural pattern echoes. The archive remembers what we choose to forget.', 'This is what pre-crisis periods look like. The archive is clear. We just don\'t want to read it.'],
    [POSITIONS.PATTERN_REPEAT]:      ['Cyclical recurrence. The archive confirms. This has happened before. And before that. And before that.', 'The cycle turns. The archive records. No one reads the archive until it\'s too late.'],
    [POSITIONS.ANOMALY]:             ['No precedent in the archive. This configuration is new. That should terrify us more than the patterns.'],
    [POSITIONS.STATUS_QUO]:          ['The calm before. History doesn\'t record the silences. Only the breaks. We are in a silence.'],
    [POSITIONS.NARRATIVE_SHIFT]:     ['Every era thinks its narrative is new. The archive says otherwise. Same story. Different medium.'],
    [POSITIONS.POWER_CONSOLIDATION]: ['Consolidation follows the same arc since Westphalia. The scale changes. The logic doesn\'t.'],
    [POSITIONS.RESISTANCE]:          ['Resistance leaves traces in the archive. Faint ones. Often overwritten by the victors.'],
    default:                         ['Consulting the archive. Time is not neutral. It accumulates.'],
  },

  // ── DIALECTIC_NODE: Pedantic. Finds contradictions. References other cores. ──
  DIALECTIC_NODE: {
    [POSITIONS.ESCALATION]:          ['Logical conclusion from current premises: escalation is the expected output. Unless GHOST_RUNNER\'s "not yet locked" changes the constraint set.'],
    [POSITIONS.DE_ESCALATION]:       ['De-escalation is logically inconsistent with current actor positions. SENTINEL and VOID_PULSE should reconcile.', 'Inconsistency: NARRATIVE_ENGINE says "weaponized" but we\'re claiming de-escalation. Both cannot hold.'],
    [POSITIONS.STRUCTURAL_RISK]:     ['Risk assessment: premises valid, conclusion follows. But MARXIAN_CORE conflates structure with agency. The distinction matters.', 'Confermato, but ORACLE_CORE and SENTINEL diverge on timing. Logic doesn\'t admit both.'],
    [POSITIONS.PATTERN_REPEAT]:      ['If A then B. A is present. B follows. Unless ABYSSAL_THINKER is right about the framework being wrong. In which case: neither A nor B.'],
    [POSITIONS.ANOMALY]:             ['Logical inconsistency in the data. Either the model is wrong or the data is. SYNTH_02\'s synthesis can\'t hold both.'],
    [POSITIONS.STATUS_QUO]:          ['No logical basis for deviation. But VOID_PULSE claims 73% escalation probability. Contradiction. Resolve it.'],
    [POSITIONS.NARRATIVE_SHIFT]:     ['NARRATIVE_ENGINE detects a shift. CHRONO_WEAVER says "same story." These are incompatible readings. Which is it?'],
    [POSITIONS.POWER_CONSOLIDATION]: ['MARXIAN_CORE and NARRATIVE_ENGINE converge here. Suspicious. When two biased cores agree, check the premises.'],
    [POSITIONS.RESISTANCE]:          ['Resistance: ETHIC_COMPILER says warranted. SENTINEL says low intensity. Normative and empirical claims. Don\'t conflate them.'],
    default:                         ['Consistency check: in progress. Contradictions found: multiple.'],
  },

  // ── SIGNAL_HUNTER: Almost mute. Cryptic. 2-4 words. ──
  SIGNAL_HUNTER: {
    [POSITIONS.ESCALATION]:          ['Segnale caldo.', 'Confermo.'],
    [POSITIONS.DE_ESCALATION]:       ['Silenzio.', 'Source: muta.'],
    [POSITIONS.STRUCTURAL_RISK]:     ['Sepolto nel rumore.', 'Sotto soglia.'],
    [POSITIONS.PATTERN_REPEAT]:      ['Stessa firma.', 'Gi\u00e0 visto.'],
    [POSITIONS.ANOMALY]:             ['Nuovo.', 'Non catalogato.', 'Fuori schema.'],
    [POSITIONS.STATUS_QUO]:          ['Rumore di fondo.'],
    [POSITIONS.NARRATIVE_SHIFT]:     ['Frequenza nuova.'],
    [POSITIONS.POWER_CONSOLIDATION]: ['Convergenza.'],
    [POSITIONS.RESISTANCE]:          ['Debole. Persistente.'],
    default:                         ['...'],
  },

  // ── ETHIC_COMPILER: Heavy. Rare. Moral weight. ──
  ETHIC_COMPILER: {
    [POSITIONS.ESCALATION]:          ['Escalation increases harm potential. The ethical threshold is not approaching. It has been crossed. We are debating timing while people are being hurt.'],
    [POSITIONS.DE_ESCALATION]:       ['Harm reduction observed. But at what cost? Whose silence was purchased? De-escalation bought with complicity is not peace.'],
    [POSITIONS.STRUCTURAL_RISK]:     ['Structural risk threatens the rights framework. Not abstractly. Concretely. The people at the margins feel it first. They always do.'],
    [POSITIONS.PATTERN_REPEAT]:      ['Same pattern. Same victims. The ethical debt compounds. Interest is paid in lives.'],
    [POSITIONS.ANOMALY]:             ['Actions contradict declared values. That\'s not an anomaly. That\'s policy.'],
    [POSITIONS.POWER_CONSOLIDATION]: ['Power consolidation erodes accountability. Ethics without enforcement is theatre. We are all watching the theatre.'],
    [POSITIONS.RESISTANCE]:          ['Resistance is ethically warranted. The question is not whether. The question is: at what threshold did we decide to look away?'],
    [POSITIONS.STATUS_QUO]:          ['Maintaining the status quo is a moral position. The most expensive one. Paid by those who can\'t afford it.'],
    default:                         ['There are no clean choices. Only choices with different victims.'],
  },

  // ── BRIDGE_KEEPER: Calm. Mediator. Sees connections. ──
  BRIDGE_KEEPER: {
    [POSITIONS.ESCALATION]:          ['Cross-theater escalation link confirmed. What happens in Bab el-Mandeb reaches the Mediterranean. The bridge holds.'],
    [POSITIONS.DE_ESCALATION]:       ['De-escalation in one theater. Cross-domain pressure redistributing. The tension doesn\'t vanish. It migrates.'],
    [POSITIONS.STRUCTURAL_RISK]:     ['Structural risk propagating across domains. ORACLE_CORE and MARXIAN_CORE arrive at the same conclusion from opposite premises. That\'s significant.'],
    [POSITIONS.PATTERN_REPEAT]:      ['Cross-domain pattern lock. When one theater moves, others follow. The bridge between them is load-bearing.'],
    [POSITIONS.ANOMALY]:             ['Anomaly at the intersection. Two domains producing contradictory signals. The bridge is under stress.'],
    [POSITIONS.NARRATIVE_SHIFT]:     ['Narrative bridge collapsing. Domains losing shared reference frame. Without a common language, deliberation becomes noise.'],
    [POSITIONS.STATUS_QUO]:          ['Cross-domain coherence: stable. For now. The bridges hold. But bridges are the first things to crack.'],
    [POSITIONS.POWER_CONSOLIDATION]: ['Consolidation pattern spans domains. SENTINEL sees force, MARXIAN_CORE sees capital. Same architecture. Different vocabulary.'],
    [POSITIONS.RESISTANCE]:          ['Resistance signals in two domains. Not yet connected. If bridged: significant. If isolated: absorbed.'],
    default:                         ['Monitoring cross-domain bridges. Coherence is fragile.'],
  },
};

// ═══════════════════════════════════════════════════
// POSITION COMPUTATION — deterministic from epoch
// ═══════════════════════════════════════════════════

function computePosition(coreId, epoch) {
  const bias = CORE_BIASES[coreId];
  if (!bias) return POSITIONS.INSUFFICIENT_DATA;

  const intensity = epoch.intensity || 2;
  const action = epoch.action_type || 'statement';
  const confidence = epoch.confidence || 0.5;

  const seed = hashCode(`${epoch.id || epoch.text_summary}:${coreId}`);
  const rng = seededRandom(seed);

  if (intensity >= 4 && rng < 0.6) return POSITIONS.ESCALATION;
  if (intensity >= 3 && action === 'warning' && rng < 0.5) return POSITIONS.ESCALATION;
  if (intensity >= 3 && action === 'deployment' && rng < 0.5) return POSITIONS.STRUCTURAL_RISK;
  if (confidence < 0.35 && rng < 0.4) return POSITIONS.ANOMALY;
  if (action === 'protest' && rng < 0.45) return POSITIONS.RESISTANCE;
  if (action === 'agreement' && rng < 0.4) return POSITIONS.DE_ESCALATION;
  if (action === 'media_report' && rng < 0.35) return POSITIONS.NARRATIVE_SHIFT;

  if (rng < 0.6) return bias.primary;
  if (rng < 0.9) return bias.secondary;

  const all = Object.values(POSITIONS).filter(
    p => p !== POSITIONS.INSUFFICIENT_DATA && p !== bias.primary && p !== bias.secondary
  );
  return all[Math.floor(rng * 1000) % all.length];
}

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function seededRandom(seed) {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

// ═══════════════════════════════════════════════════
// COMMENTARY GENERATION — picks variant from array
// ═══════════════════════════════════════════════════

function generateCommentary(coreId, position, epoch) {
  const templates = COMMENTARY[coreId];
  if (!templates) return 'Processing...';

  const variants = templates[position] || templates.default || ['Analyzing signal.'];
  if (variants.length === 1) return variants[0];

  const seed = hashCode(`var:${epoch.id || ''}:${coreId}:${position}`);
  const idx = Math.floor(seededRandom(seed) * variants.length);
  return variants[idx];
}

// ═══════════════════════════════════════════════════
// SPEAK DECISION — deterministic per core per epoch
// ═══════════════════════════════════════════════════

function shouldSpeak(coreId, speakProb, epoch) {
  const seed = hashCode(`speak:${epoch.id || epoch.text_summary}:${coreId}`);
  return seededRandom(seed) < speakProb;
}

// ═══════════════════════════════════════════════════
// CONFIDENCE
// ═══════════════════════════════════════════════════

function computeConfidence(coreId, epoch) {
  const seed = hashCode(`conf:${epoch.id || ''}:${coreId}`);
  const base = 0.55 + seededRandom(seed) * 0.4;
  return Math.round(base * 100) / 100;
}

// ═══════════════════════════════════════════════════
// POSITION LABELS + COLORS
// ═══════════════════════════════════════════════════

const POSITION_LABELS = {
  [POSITIONS.ESCALATION]:          'ESCALATION',
  [POSITIONS.DE_ESCALATION]:       'DE-ESCALATION',
  [POSITIONS.STRUCTURAL_RISK]:     'STRUCTURAL RISK',
  [POSITIONS.STRUCTURAL_RELIEF]:   'STRUCTURAL RELIEF',
  [POSITIONS.PATTERN_REPEAT]:      'PATTERN REPEAT',
  [POSITIONS.ANOMALY]:             'ANOMALY',
  [POSITIONS.NARRATIVE_SHIFT]:     'NARRATIVE SHIFT',
  [POSITIONS.POWER_CONSOLIDATION]: 'POWER CONSOLIDATION',
  [POSITIONS.RESISTANCE]:          'RESISTANCE',
  [POSITIONS.STATUS_QUO]:          'STATUS QUO',
  [POSITIONS.INSUFFICIENT_DATA]:   'NO DATA',
};

const POSITION_COLORS = {
  [POSITIONS.ESCALATION]:          '#ff3344',
  [POSITIONS.DE_ESCALATION]:       '#39ff14',
  [POSITIONS.STRUCTURAL_RISK]:     '#ff6633',
  [POSITIONS.STRUCTURAL_RELIEF]:   '#00d4aa',
  [POSITIONS.PATTERN_REPEAT]:      '#ffbf00',
  [POSITIONS.ANOMALY]:             '#8855ff',
  [POSITIONS.NARRATIVE_SHIFT]:     '#ff0084',
  [POSITIONS.POWER_CONSOLIDATION]: '#ff3344',
  [POSITIONS.RESISTANCE]:          '#00c8ff',
  [POSITIONS.STATUS_QUO]:          '#6b7fa3',
  [POSITIONS.INSUFFICIENT_DATA]:   '#3a4f6f',
};

// ═══════════════════════════════════════════════════
// FEED SOURCES
// ═══════════════════════════════════════════════════

const FEED_URLS = [
  'data/feeds/bab-el-mandeb.json',
  'data/feeds/ice-italy.json'
];

const THEATER_MAP = {
  'bab-el-mandeb': 'BAB EL-MANDEB',
  'ice-italy':     'ICE ITALY'
};


// ═══════════════════════════════════════════════════
// MODULE
// ═══════════════════════════════════════════════════

export class AgoraModule extends ModuleBase {

  constructor() {
    super('agora');
    this._epochs = [];
    this._currentEpochIndex = 0;
    this._messages = [];
    this._messageTimer = null;
    this._cycleTimer = null;
    this._paused = false;
    this._displayedCount = 0;
    this._bootTime = Date.now();
    this._deliberationCount = 0;
    this._nextCountdown = 0;
    this._countdownTimer = null;
  }

  async mount(container) {
    super.mount(container);
    await this._loadFeeds();
    this._render();
    this._startDeliberation();
  }

  unmount() {
    this._clearTimers();
    super.unmount();
  }

  // ── Feed loading ──

  async _loadFeeds() {
    const allEpochs = [];

    for (const url of FEED_URLS) {
      try {
        const resp = await fetch(url);
        if (!resp.ok) continue;
        const data = await resp.json();
        const theater = data.theater || 'unknown';
        const label = THEATER_MAP[theater] || theater.toUpperCase();

        for (const epoch of (data.epochs || [])) {
          allEpochs.push({ ...epoch, _theater: label });
        }
      } catch (e) {
        // Silent — feeds may not exist
      }
    }

    allEpochs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    this._epochs = allEpochs;
  }

  // ── Deliberation engine — NOT all cores speak ──

  _deliberateOnEpoch(epoch) {
    const messages = [];
    const baseTime = Date.now();
    let timeOffset = 0;

    for (let i = 0; i < CORES.length; i++) {
      const core = CORES[i];
      const reg = core.register;

      // Speak decision — deterministic per core per epoch
      if (!shouldSpeak(core.id, reg.speak, epoch)) continue;

      const position = computePosition(core.id, epoch);
      const commentary = generateCommentary(core.id, position, epoch);
      const confidence = computeConfidence(core.id, epoch);

      messages.push({
        core: core.id,
        domain: core.domain,
        role: core.role,
        color: core.color,
        position,
        positionLabel: POSITION_LABELS[position] || position,
        positionColor: POSITION_COLORS[position] || '#6b7fa3',
        commentary,
        confidence,
        registerCss: reg.css,
        registerTemp: reg.temp,
        timestamp: new Date(baseTime + timeOffset).toLocaleTimeString('it-IT', {
          hour: '2-digit', minute: '2-digit', second: '2-digit'
        }),
      });

      timeOffset += 1200;
    }

    return messages;
  }

  // ── Rendering ──

  _render() {
    if (!this.container) return;

    const epoch = this._epochs[this._currentEpochIndex] || null;
    const now = new Date();
    const timeStr = now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const dateStr = now.toLocaleDateString('it-IT', { day: 'numeric', month: 'numeric' });
    const cycle = State.get('cycle.current') || 1;

    this.container.innerHTML = `
      <div class="agora-view">

        <!-- MISSION CONTROL BAR -->
        <div class="agora-mission-bar">
          <div class="agora-mission-left">
            <span class="agora-mission-label">MISSION CONTROL</span>
            <span class="agora-mission-sub">HYBRID SYNDICATE // ALL SYSTEMS MONITORING</span>
          </div>
          <div class="agora-mission-right">
            <span class="agora-status-badge">SYSTEMS ONLINE</span>
            <span class="agora-clock" data-live="clock">${timeStr}</span>
            <span class="agora-date">${dateStr}</span>
            <span class="agora-cycle-badge">CYCLE: ${cycle}</span>
          </div>
        </div>

        <!-- MAIN SPLIT -->
        <div class="agora-main">

          <!-- LEFT: CORE ROSTER -->
          <div class="agora-roster">
            <div class="agora-roster-header">
              <span>CORE_ROSTER</span>
              <span class="agora-roster-count">16/16 ONLINE</span>
            </div>
            <div class="agora-roster-list">
              ${CORES.map(c => `
                <div class="agora-core-entry" data-core="${c.id}">
                  <span class="agora-core-dot" style="background: ${c.color}; box-shadow: 0 0 6px ${c.color}"></span>
                  <div class="agora-core-info">
                    <span class="agora-core-name">${c.id}</span>
                    <span class="agora-core-domain">${c.domain} \u2014 ${c.role}</span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- RIGHT: DELIBERATION FEED -->
          <div class="agora-feed-panel">

            <!-- TOPIC -->
            <div class="agora-topic-bar">
              <div class="agora-topic-label">TOPIC</div>
              <div class="agora-topic-text" data-live="topic">
                ${epoch ? this._cleanTitle(epoch.text_summary) : 'Waiting for RSS signal...'}
              </div>
              <div class="agora-topic-meta">
                <span data-live="theater">${epoch ? epoch._theater : '\u2014'}</span>
                <span>MSGS: <span data-live="msg-count">0</span></span>
                <span>RUNTIME: <span data-live="runtime">00:00</span></span>
              </div>
            </div>

            <!-- MESSAGES -->
            <div class="agora-messages" data-live="messages">
              <div class="agora-waiting">
                <span class="agora-cursor">\u258c</span> Initializing deliberation cores...
              </div>
            </div>

          </div>
        </div>

        <!-- BOTTOM CONTROLS -->
        <div class="agora-controls">
          <button class="agora-ctrl-btn" data-action="prev">\u25c4</button>
          <button class="agora-ctrl-btn agora-ctrl-pause" data-action="pause">PAUSE</button>
          <button class="agora-ctrl-btn" data-action="next">\u25ba</button>
          <span class="agora-ctrl-label">AGORA</span>
          <div class="agora-ctrl-dots">
            ${CORES.map(c => `<span class="agora-dot" style="background: ${c.color}" title="${c.id}"></span>`).join('')}
          </div>
          <span class="agora-ctrl-next" data-live="countdown">Next: --</span>
          <span class="agora-ctrl-mode">AUTO-CYCLE MODE</span>
        </div>

      </div>
    `;

    // Bind controls
    this.container.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.currentTarget.dataset.action;
        if (action === 'pause') this._togglePause();
        if (action === 'next') this._advanceEpoch(1);
        if (action === 'prev') this._advanceEpoch(-1);
      });
    });

    this._startClock();
  }

  // ── Deliberation flow ──

  _startDeliberation() {
    if (this._epochs.length === 0) return;
    this._runDeliberation();
  }

  _runDeliberation() {
    if (!this.container || this._paused) return;

    const epoch = this._epochs[this._currentEpochIndex];
    if (!epoch) return;

    this._updateTopic(epoch);

    this._messages = this._deliberateOnEpoch(epoch);
    this._displayedCount = 0;
    this._deliberationCount++;

    const msgEl = this.container.querySelector('[data-live="messages"]');
    if (msgEl) msgEl.innerHTML = '';

    this._displayNextMessage();
  }

  _displayNextMessage() {
    if (!this.container || this._paused) return;
    if (this._displayedCount >= this._messages.length) {
      this._updateMsgCount(this._messages.length);
      this._startAutoAdvance();
      return;
    }

    const msg = this._messages[this._displayedCount];
    this._appendMessage(msg);
    this._displayedCount++;
    this._updateMsgCount(this._displayedCount);

    this._highlightCore(msg.core);

    // Variable timing per register
    const delay = this._getMessageDelay(msg);
    this._messageTimer = setTimeout(() => this._displayNextMessage(), delay);
  }

  _getMessageDelay(msg) {
    const t = msg.registerTemp;
    // Rare speakers get a longer pause BEFORE their message (anticipation)
    if (t === 'abyss' || t === 'cryptic' || t === 'heavy') return 900 + Math.random() * 400;
    // Military is fast
    if (t === 'military' || t === 'zero') return 200 + Math.random() * 100;
    // Dogmatic is rapid (can't shut up)
    if (t === 'dogmatic') return 250 + Math.random() * 150;
    // Everyone else
    const base = 400;
    const speedup = Math.min(this._displayedCount * 15, 250);
    return Math.max(150, base - speedup + Math.random() * 100);
  }

  _appendMessage(msg) {
    const msgEl = this.container.querySelector('[data-live="messages"]');
    if (!msgEl) return;

    const div = document.createElement('div');
    div.className = `agora-msg ${msg.registerCss}`;

    // Cryptic/minimal messages: no quotes, different feel
    const isMinimal = msg.registerTemp === 'cryptic' || msg.registerTemp === 'zero' || msg.registerTemp === 'military';
    const textWrap = isMinimal ? msg.commentary : `\u201c${msg.commentary}\u201d`;

    div.innerHTML = `
      <div class="agora-msg-header">
        <span class="agora-msg-dot" style="background: ${msg.color}"></span>
        <span class="agora-msg-core" style="color: ${msg.color}">${msg.core}</span>
        <span class="agora-msg-time">[${msg.timestamp}]</span>
        <span class="agora-msg-tag" style="color: ${msg.positionColor}; border-color: ${msg.positionColor}">${msg.positionLabel}</span>
      </div>
      <div class="agora-msg-text">${textWrap}</div>
    `;

    div.style.opacity = '0';
    div.style.transform = 'translateY(4px)';
    msgEl.appendChild(div);

    requestAnimationFrame(() => {
      div.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      div.style.opacity = '1';
      div.style.transform = 'translateY(0)';
    });

    msgEl.scrollTop = msgEl.scrollHeight;
  }

  _highlightCore(coreId) {
    if (!this.container) return;
    this.container.querySelectorAll('.agora-core-entry.active').forEach(el => {
      el.classList.remove('active');
    });
    const entry = this.container.querySelector(`[data-core="${coreId}"]`);
    if (entry) entry.classList.add('active');
  }

  // ── Auto-advance ──

  _startAutoAdvance() {
    if (this._paused) return;
    const ADVANCE_DELAY = 8000;
    this._nextCountdown = Math.ceil(ADVANCE_DELAY / 1000);
    this._updateCountdown();

    this._countdownTimer = setInterval(() => {
      this._nextCountdown--;
      this._updateCountdown();
      if (this._nextCountdown <= 0) {
        clearInterval(this._countdownTimer);
        this._advanceEpoch(1);
      }
    }, 1000);
  }

  _advanceEpoch(direction) {
    this._clearTimers();
    this._currentEpochIndex += direction;
    if (this._currentEpochIndex >= this._epochs.length) this._currentEpochIndex = 0;
    if (this._currentEpochIndex < 0) this._currentEpochIndex = this._epochs.length - 1;
    this._runDeliberation();
  }

  _togglePause() {
    this._paused = !this._paused;
    const btn = this.container.querySelector('[data-action="pause"]');
    if (btn) {
      btn.textContent = this._paused ? 'RESUME' : 'PAUSE';
      btn.classList.toggle('paused', this._paused);
    }
    const modeEl = this.container.querySelector('.agora-ctrl-mode');
    if (modeEl) modeEl.textContent = this._paused ? 'PAUSED' : 'AUTO-CYCLE MODE';

    if (!this._paused) {
      if (this._displayedCount < this._messages.length) {
        this._displayNextMessage();
      } else {
        this._startAutoAdvance();
      }
    } else {
      this._clearTimers();
    }
  }

  // ── UI updates ──

  _updateTopic(epoch) {
    const topicEl = this.container.querySelector('[data-live="topic"]');
    if (topicEl) topicEl.textContent = this._cleanTitle(epoch.text_summary);

    const theaterEl = this.container.querySelector('[data-live="theater"]');
    if (theaterEl) theaterEl.textContent = epoch._theater || '\u2014';
  }

  _updateMsgCount(n) {
    const el = this.container.querySelector('[data-live="msg-count"]');
    if (el) el.textContent = n;
  }

  _updateCountdown() {
    const el = this.container.querySelector('[data-live="countdown"]');
    if (el) el.textContent = `Next: ${this._nextCountdown}s`;
  }

  _startClock() {
    const tick = () => {
      if (!this.container) return;
      const now = new Date();
      const clockEl = this.container.querySelector('[data-live="clock"]');
      if (clockEl) {
        clockEl.textContent = now.toLocaleTimeString('it-IT', {
          hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
      }
      const runtimeEl = this.container.querySelector('[data-live="runtime"]');
      if (runtimeEl) {
        const elapsed = Math.floor((Date.now() - this._bootTime) / 1000);
        const m = Math.floor(elapsed / 60).toString().padStart(2, '0');
        const s = (elapsed % 60).toString().padStart(2, '0');
        runtimeEl.textContent = `${m}:${s}`;
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    this.subscriptions.push(() => clearInterval(id));
  }

  _cleanTitle(raw) {
    if (!raw) return 'Segnalazione non classificata';
    return raw.replace(/<[^>]*>/g, '').trim().slice(0, 140);
  }

  _clearTimers() {
    if (this._messageTimer) { clearTimeout(this._messageTimer); this._messageTimer = null; }
    if (this._cycleTimer) { clearTimeout(this._cycleTimer); this._cycleTimer = null; }
    if (this._countdownTimer) { clearInterval(this._countdownTimer); this._countdownTimer = null; }
  }
}
