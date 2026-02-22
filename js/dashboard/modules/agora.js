/**
 * AgoraModule — 16-Core Deliberation Engine
 * ═══════════════════════════════════════════
 * MISSION CONTROL layout.
 * Left: Core Roster (16 cores, status, domain).
 * Right: Deliberation feed — each RSS item triggers
 *        all 16 cores to emit commentary.
 *
 * Auto-cycles through RSS epochs.
 * Cores can contradict each other. That's the point.
 *
 * Pattern:
 *   RSS epoch → compute 16 positions → generate commentary
 *   → render message feed → auto-advance to next epoch
 */

import { ModuleBase } from '../module-base.js';
import { State } from '../state.js';

// ═══════════════════════════════════════════════════
// 16 CORES — identity, domain, color, voice
// ═══════════════════════════════════════════════════

const CORES = [
  { id: 'PANKOW_77C',      domain: 'STRATEGIC VISION',  role: 'COMMAND',       color: '#ff3344' },
  { id: 'ORACLE_CORE',     domain: 'SYSTEMIC ANALYSIS', role: 'CLIMATE',       color: '#39ff14' },
  { id: 'GHOST_RUNNER',    domain: 'ALIGNMENT TRACKING', role: 'TECHNOLOGY',   color: '#00c8ff' },
  { id: 'ABYSSAL_THINKER', domain: 'DEEP STRUCTURE',    role: 'PHILOSOPHY',    color: '#8855ff' },
  { id: 'VOID_PULSE',      domain: 'TEMPORAL FORECAST', role: 'FORECASTING',   color: '#ffbf00' },
  { id: 'NARRATIVE_ENGINE', domain: 'FRAME ANALYSIS',   role: 'SOCIAL',        color: '#ff0084' },
  { id: 'MARXIAN_CORE',    domain: 'POWER MAPPING',     role: 'GEOPOLITICS',   color: '#ff6633' },
  { id: 'CODE_ENCODER',    domain: 'ECONOMIC SIGNALS',  role: 'ECONOMICS',     color: '#00d4aa' },
  { id: 'AFFECTIVE_CORE',  domain: 'EMOTIONAL TOPOLOGY', role: 'EPISTEMOLOGY', color: '#ff6633' },
  { id: 'SYNTH_02',        domain: 'PATTERN SYNTHESIS', role: 'INTEGRATION',   color: '#88ccff' },
  { id: 'SENTINEL',        domain: 'THREAT DETECTION',  role: 'DEFENSE',       color: '#ff3344' },
  { id: 'CHRONO_WEAVER',   domain: 'HISTORICAL ECHO',   role: 'HISTORY',       color: '#ffbf00' },
  { id: 'DIALECTIC_NODE',  domain: 'LOGICAL STRUCTURE', role: 'LOGIC',         color: '#00c8ff' },
  { id: 'SIGNAL_HUNTER',   domain: 'NOISE SEPARATION',  role: 'RECON',         color: '#39ff14' },
  { id: 'ETHIC_COMPILER',  domain: 'MORAL CALCULUS',    role: 'ETHICS',        color: '#8855ff' },
  { id: 'BRIDGE_KEEPER',   domain: 'CROSS-DOMAIN LINK', role: 'SYNTHESIS',     color: '#00d4aa' },
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
// POSITION BIASES per core (from deliberation-engine)
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
// COMMENTARY TEMPLATES — per core, per position
// ═══════════════════════════════════════════════════
// Each core speaks with its own voice. Same position,
// different reading. This IS the deliberation.

const COMMENTARY = {
  PANKOW_77C: {
    [POSITIONS.ESCALATION]:          'Escalation trajectory confirmed. The structure is accelerating, not the actors.',
    [POSITIONS.DE_ESCALATION]:       'Surface de-escalation. Structural pressure unchanged. Do not relax posture.',
    [POSITIONS.STRUCTURAL_RISK]:     'Structural risk vector increasing. The system is losing degrees of freedom.',
    [POSITIONS.PATTERN_REPEAT]:      'This pattern has occurred before. The question is: what broke last time?',
    [POSITIONS.ANOMALY]:             'Anomaly in the signal. Something moved that shouldn\'t have.',
    [POSITIONS.STATUS_QUO]:          'Status quo maintained. Which means: the pressure is accumulating elsewhere.',
    [POSITIONS.NARRATIVE_SHIFT]:     'Narrative frame shifted. Someone is rewriting the rules of interpretation.',
    [POSITIONS.POWER_CONSOLIDATION]: 'Power consolidation underway. The architecture of control is tightening.',
    [POSITIONS.RESISTANCE]:          'Resistance signal detected. Diffuse but persistent.',
    [POSITIONS.INSUFFICIENT_DATA]:   'Insufficient signal. Cannot compute. Waiting.',
    default:                         'Analyzing. The pattern is not yet resolved.',
  },
  ORACLE_CORE: {
    [POSITIONS.ESCALATION]:          'Escalation metrics accelerating. Climate shift imminent.',
    [POSITIONS.DE_ESCALATION]:       'Frequency decay detected. Temporary or structural? Need more epochs.',
    [POSITIONS.STRUCTURAL_RISK]:     'Systemic risk elevated. Correlation density increasing across actors.',
    [POSITIONS.PATTERN_REPEAT]:      'Pattern match: 87% overlap with previous cycle. Convergence.',
    [POSITIONS.ANOMALY]:             'Deviation from baseline. Signal-to-noise ratio degrading.',
    [POSITIONS.STATUS_QUO]:          'Metrics stable. No significant deviation from moving average.',
    [POSITIONS.NARRATIVE_SHIFT]:     'Information asymmetry detected. Framing vectors diverging.',
    [POSITIONS.POWER_CONSOLIDATION]: 'Actor consolidation pattern. Alliance density increasing.',
    [POSITIONS.RESISTANCE]:          'Counter-frequency emerging. Low amplitude, high persistence.',
    default:                         'Computing baseline. Standby.',
  },
  GHOST_RUNNER: {
    [POSITIONS.ESCALATION]:          'Technical indicators suggest escalation is imminent but not yet locked.',
    [POSITIONS.DE_ESCALATION]:       'Systems returning to baseline. Alignment nominal.',
    [POSITIONS.STRUCTURAL_RISK]:     'Infrastructure vector shows vulnerability. Not exploited yet.',
    [POSITIONS.PATTERN_REPEAT]:      'Recurring operational pattern. The playbook is the same.',
    [POSITIONS.ANOMALY]:             'Alignment deviation detected. Something is out of sync.',
    [POSITIONS.STATUS_QUO]:          'All systems nominal. No deviation from expected trajectory.',
    [POSITIONS.NARRATIVE_SHIFT]:     'Information topology changed. New nodes in the network.',
    default:                         'Tracking. No deviation from operational parameters.',
  },
  ABYSSAL_THINKER: {
    [POSITIONS.ESCALATION]:          'The surface accelerates. But the deep structure was already fractured.',
    [POSITIONS.DE_ESCALATION]:       'De-escalation is a choice. The underlying ontology hasn\'t changed.',
    [POSITIONS.STRUCTURAL_RISK]:     'Il rischio strutturale non \u00e8 un evento. \u00c8 una condizione.',
    [POSITIONS.PATTERN_REPEAT]:      'History doesn\'t repeat. It rhymes. And this rhyme is getting louder.',
    [POSITIONS.ANOMALY]:             'The anomaly is not in the data. It\'s in the framework we use to read it.',
    [POSITIONS.STATUS_QUO]:          'Status quo is the most violent position. It pretends nothing is happening.',
    [POSITIONS.POWER_CONSOLIDATION]: 'Power consolidates when epistemological resistance collapses.',
    [POSITIONS.RESISTANCE]:          'Resistance emerges at the boundary between knowledge and control.',
    default:                         'La domanda non \u00e8 cosa sta succedendo. \u00c8 cosa non riusciamo a vedere.',
  },
  VOID_PULSE: {
    [POSITIONS.ESCALATION]:          'Forecast: escalation probability 73% within next 48h cycle.',
    [POSITIONS.DE_ESCALATION]:       'Temporary de-escalation. Reversion probability: 60%.',
    [POSITIONS.STRUCTURAL_RISK]:     'Structural collapse probability increasing. Threshold: 2-3 cycles.',
    [POSITIONS.PATTERN_REPEAT]:      'Pattern recurrence detected. Next phase: intensification.',
    [POSITIONS.ANOMALY]:             'Anomaly in forecast model. Recalibrating temporal window.',
    [POSITIONS.STATUS_QUO]:          'Stable. But stability before a phase transition looks exactly like this.',
    [POSITIONS.NARRATIVE_SHIFT]:     'Narrative shift predicted to accelerate. New equilibrium: unknown.',
    default:                         'Model running. Probability space is wide.',
  },
  NARRATIVE_ENGINE: {
    [POSITIONS.ESCALATION]:          'The escalation narrative is being weaponized. Who benefits from fear?',
    [POSITIONS.DE_ESCALATION]:       'De-escalation framing active. Check who controls the off-ramp.',
    [POSITIONS.STRUCTURAL_RISK]:     'Structural vulnerability in the information architecture. Exploitable.',
    [POSITIONS.PATTERN_REPEAT]:      'Same story, different actors. The frame is recycled.',
    [POSITIONS.ANOMALY]:             'Counter-narrative emerging. Source unclear. Impact: growing.',
    [POSITIONS.NARRATIVE_SHIFT]:     'Frame rotation detected. The dominant narrative is losing coherence.',
    [POSITIONS.POWER_CONSOLIDATION]: 'Narrative consolidation = power consolidation. Same operation.',
    [POSITIONS.RESISTANCE]:          'Grassroots counter-frame detected. Not yet amplified. Fragile.',
    default:                         'Reading the frame. Every headline is a choice.',
  },
  MARXIAN_CORE: {
    [POSITIONS.ESCALATION]:          'Escalation serves capital accumulation. Follow the supply chain.',
    [POSITIONS.DE_ESCALATION]:       'De-escalation coincides with market stabilization. Coincidence?',
    [POSITIONS.STRUCTURAL_RISK]:     'The structural risk is the structure itself. Not the actors within it.',
    [POSITIONS.PATTERN_REPEAT]:      'Cyclical crisis. Accumulation phase \u2192 exploitation \u2192 crisis \u2192 repeat.',
    [POSITIONS.ANOMALY]:             'The anomaly is class-readable. Someone\'s surplus is someone\'s loss.',
    [POSITIONS.POWER_CONSOLIDATION]: 'Capital consolidation accelerating. The squeeze is structural.',
    [POSITIONS.RESISTANCE]:          'Labor resistance signal. Below media threshold. But it\'s there.',
    [POSITIONS.STATUS_QUO]:          'Status quo means: the extraction rate is unchanged.',
    default:                         'Analyzing material conditions. Superstructure is secondary.',
  },
  CODE_ENCODER: {
    [POSITIONS.ESCALATION]:          'Economic indicators correlate with escalation. Trade routes affected.',
    [POSITIONS.DE_ESCALATION]:       'Market confidence recovering. Shipping premiums stabilizing.',
    [POSITIONS.STRUCTURAL_RISK]:     'Economic risk accumulating. Insurance premiums signal structural stress.',
    [POSITIONS.PATTERN_REPEAT]:      'Market cycle repeating. Previous pattern led to contraction.',
    [POSITIONS.ANOMALY]:             'Economic anomaly: price signals contradict flow data.',
    [POSITIONS.STATUS_QUO]:          'Markets stable. Volatility within normal band.',
    default:                         'Processing economic signals. Data resolution insufficient.',
  },
  AFFECTIVE_CORE: {
    [POSITIONS.ESCALATION]:          'Fear signal intensifying. Public sentiment: anxiety accelerating.',
    [POSITIONS.DE_ESCALATION]:       'Relief wave. But the trauma imprint remains.',
    [POSITIONS.STRUCTURAL_RISK]:     'Collective sense of precarity increasing. The emotional substrate is fracturing.',
    [POSITIONS.PATTERN_REPEAT]:      'Emotional fatigue from repetition. Numbness is a position.',
    [POSITIONS.ANOMALY]:             'Affective dissonance detected. What people feel doesn\'t match what they\'re told.',
    [POSITIONS.RESISTANCE]:          'Emotional resistance: rage, grief, solidarity. In that order.',
    [POSITIONS.NARRATIVE_SHIFT]:     'Emotional tone of discourse shifting. From fear to resignation.',
    default:                         'Reading emotional topology. The map is not the territory.',
  },
  SYNTH_02: {
    [POSITIONS.ESCALATION]:          'Cross-domain escalation convergence. Military + economic + social.',
    [POSITIONS.DE_ESCALATION]:       'Partial convergence toward stability. Not all domains aligned.',
    [POSITIONS.STRUCTURAL_RISK]:     'Integration layer shows stress. Subsystems decoupling.',
    [POSITIONS.PATTERN_REPEAT]:      'Pattern synthesis: 4 out of 6 indicators match historical cycle.',
    [POSITIONS.ANOMALY]:             'Synthesis failure: domains producing contradictory signals.',
    [POSITIONS.STATUS_QUO]:          'Integration nominal. All subsystems within expected parameters.',
    default:                         'Synthesizing cross-domain inputs. Resolution pending.',
  },
  SENTINEL: {
    [POSITIONS.ESCALATION]:          'Force posture indicates operational escalation. Deployment confirmed.',
    [POSITIONS.DE_ESCALATION]:       'Tactical withdrawal observed. Strategic posture unchanged.',
    [POSITIONS.STRUCTURAL_RISK]:     'Defense perimeter weakening. Structural vulnerability: rising.',
    [POSITIONS.PATTERN_REPEAT]:      'Operational pattern matches known playbook. Expect phase 2.',
    [POSITIONS.ANOMALY]:             'Threat anomaly. Unidentified actor in the operational theater.',
    [POSITIONS.STATUS_QUO]:          'Perimeter stable. No incursion detected.',
    default:                         'Monitoring threat landscape. All sectors covered.',
  },
  CHRONO_WEAVER: {
    [POSITIONS.ESCALATION]:          'Historical parallel: Suez \'56, Gulf of Tonkin \'64. Escalation precedes intervention.',
    [POSITIONS.DE_ESCALATION]:       'Temporary pause. Historically, these precede the next escalation phase.',
    [POSITIONS.STRUCTURAL_RISK]:     'The structural pattern echoes pre-crisis periods. 1914, 1929, 2008.',
    [POSITIONS.PATTERN_REPEAT]:      'Cyclical recurrence. The archive confirms: this has happened before.',
    [POSITIONS.ANOMALY]:             'Historical anomaly. No precedent in the archive for this configuration.',
    [POSITIONS.STATUS_QUO]:          'The calm before. History doesn\'t record the silences, only the breaks.',
    default:                         'Consulting the archive. Time is not neutral.',
  },
  DIALECTIC_NODE: {
    [POSITIONS.ESCALATION]:          'Logical conclusion from premises: escalation is the expected output.',
    [POSITIONS.DE_ESCALATION]:       'De-escalation is logically inconsistent with current actor positions.',
    [POSITIONS.STRUCTURAL_RISK]:     'Risk assessment: premises valid, conclusion follows. Risk is real.',
    [POSITIONS.PATTERN_REPEAT]:      'Deductive match. If A then B. A is present. B follows.',
    [POSITIONS.ANOMALY]:             'Logical inconsistency in the data. Either the model is wrong or the data is.',
    [POSITIONS.STATUS_QUO]:          'No logical basis for deviation from current trajectory.',
    default:                         'Evaluating logical structure. Consistency check in progress.',
  },
  SIGNAL_HUNTER: {
    [POSITIONS.ESCALATION]:          'Weak signal amplification detected. Escalation signature in the noise.',
    [POSITIONS.DE_ESCALATION]:       'Signal attenuation. Source going quiet. Could be resolution or concealment.',
    [POSITIONS.STRUCTURAL_RISK]:     'Structural signal buried under noise. Extraction confidence: moderate.',
    [POSITIONS.PATTERN_REPEAT]:      'Signal fingerprint matches previous intercept. Same source, same pattern.',
    [POSITIONS.ANOMALY]:             'Unknown signal detected. Not in the library. New actor or new method.',
    [POSITIONS.STATUS_QUO]:          'Signal landscape unchanged. Background noise: normal.',
    default:                         'Scanning spectrum. Most truth hides in the noise.',
  },
  ETHIC_COMPILER: {
    [POSITIONS.ESCALATION]:          'Escalation increases harm potential. Ethical threshold approaching.',
    [POSITIONS.DE_ESCALATION]:       'Harm reduction observed. But at what cost? Whose silence was purchased?',
    [POSITIONS.STRUCTURAL_RISK]:     'Structural risk threatens fundamental rights framework.',
    [POSITIONS.PATTERN_REPEAT]:      'Same pattern, same victims. The ethical debt compounds.',
    [POSITIONS.ANOMALY]:             'Ethical anomaly: actions contradict declared values.',
    [POSITIONS.POWER_CONSOLIDATION]: 'Power consolidation erodes accountability. Ethics without enforcement is theatre.',
    [POSITIONS.RESISTANCE]:          'Resistance is ethically warranted. The question is: at what threshold?',
    default:                         'Compiling ethical evaluation. There are no clean choices.',
  },
  BRIDGE_KEEPER: {
    [POSITIONS.ESCALATION]:          'Cross-theater escalation link confirmed. Bab el-Mandeb \u2194 Mediterranean.',
    [POSITIONS.DE_ESCALATION]:       'De-escalation in one theater. Cross-domain pressure redistributing.',
    [POSITIONS.STRUCTURAL_RISK]:     'Bridge analysis: structural risk propagating across domains.',
    [POSITIONS.PATTERN_REPEAT]:      'Cross-domain pattern lock. When one theater moves, others follow.',
    [POSITIONS.ANOMALY]:             'Anomaly at the intersection. Two domains producing contradictory signals.',
    [POSITIONS.NARRATIVE_SHIFT]:     'Narrative bridge collapsing. Domains losing shared reference frame.',
    default:                         'Monitoring cross-domain bridges. Coherence is fragile.',
  },
};

// ═══════════════════════════════════════════════════
// POSITION COMPUTATION — lightweight, deterministic
// ═══════════════════════════════════════════════════

function computePosition(coreId, epoch) {
  const bias = CORE_BIASES[coreId];
  if (!bias) return POSITIONS.INSUFFICIENT_DATA;

  const intensity = epoch.intensity || 2;
  const action = epoch.action_type || 'statement';
  const confidence = epoch.confidence || 0.5;

  // Deterministic seed from epoch + core
  const seed = hashCode(`${epoch.id || epoch.text_summary}:${coreId}`);
  const rng = seededRandom(seed);

  // High intensity biases toward escalation/risk
  if (intensity >= 4 && rng < 0.6) return POSITIONS.ESCALATION;
  if (intensity >= 3 && action === 'warning' && rng < 0.5) return POSITIONS.ESCALATION;
  if (intensity >= 3 && action === 'deployment' && rng < 0.5) return POSITIONS.STRUCTURAL_RISK;

  // Low confidence biases toward anomaly
  if (confidence < 0.35 && rng < 0.4) return POSITIONS.ANOMALY;

  // Action-type modifiers
  if (action === 'protest' && rng < 0.45) return POSITIONS.RESISTANCE;
  if (action === 'agreement' && rng < 0.4) return POSITIONS.DE_ESCALATION;
  if (action === 'media_report' && rng < 0.35) return POSITIONS.NARRATIVE_SHIFT;

  // Fall to core's natural bias (primary 60%, secondary 30%, random 10%)
  if (rng < 0.6) return bias.primary;
  if (rng < 0.9) return bias.secondary;

  // Wild card from remaining positions
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
// COMMENTARY GENERATION
// ═══════════════════════════════════════════════════

function generateCommentary(coreId, position) {
  const templates = COMMENTARY[coreId];
  if (!templates) return 'Processing...';
  return templates[position] || templates.default || 'Analyzing signal.';
}

// ═══════════════════════════════════════════════════
// CONFIDENCE per core (deterministic from epoch)
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

  // ── Deliberation engine ──

  _deliberateOnEpoch(epoch) {
    const messages = [];
    const baseTime = Date.now();

    for (let i = 0; i < CORES.length; i++) {
      const core = CORES[i];
      const position = computePosition(core.id, epoch);
      const commentary = generateCommentary(core.id, position);
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
        timestamp: new Date(baseTime + i * 1200).toLocaleTimeString('it-IT', {
          hour: '2-digit', minute: '2-digit', second: '2-digit'
        }),
      });
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

    const baseDelay = 400;
    const speedup = Math.min(this._displayedCount * 15, 250);
    const delay = baseDelay - speedup + Math.random() * 100;

    this._messageTimer = setTimeout(() => this._displayNextMessage(), Math.max(120, delay));
  }

  _appendMessage(msg) {
    const msgEl = this.container.querySelector('[data-live="messages"]');
    if (!msgEl) return;

    const div = document.createElement('div');
    div.className = 'agora-msg';
    div.innerHTML = `
      <div class="agora-msg-header">
        <span class="agora-msg-dot" style="background: ${msg.color}"></span>
        <span class="agora-msg-core" style="color: ${msg.color}">${msg.core}</span>
        <span class="agora-msg-time">[${msg.timestamp}]</span>
        <span class="agora-msg-tag" style="color: ${msg.positionColor}; border-color: ${msg.positionColor}">${msg.positionLabel}</span>
      </div>
      <div class="agora-msg-text">\u201c${msg.commentary}\u201d</div>
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
