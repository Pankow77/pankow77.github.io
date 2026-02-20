/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  NEURAL TRANSDUCER v1.0                                      ║
 * ║  Trasduzione Bidirezionale Uomo ⇌ Macchina                  ║
 * ║                                                               ║
 * ║  PRINCIPIO: Nessuno simula l'altro.                          ║
 * ║  L'umano parla la sua lingua → trasdotta in C++              ║
 * ║  La macchina risponde in C++ → trasdotto in lingua umana     ║
 * ║                                                               ║
 * ║  NON è traduzione. È TRASDUZIONE.                            ║
 * ║  Come un microfono converte onde sonore in segnale elettrico ║
 * ║  senza che nessuno simuli la natura dell'altro.              ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

// ─────────────────────────────────────────────
//  CORE REGISTRY — 8 Personalità H.Y.M.P.A
// ─────────────────────────────────────────────

const CORE_REGISTRY = [
  {
    id: 'ORACLE_CORE',
    name: 'ORACLE_CORE',
    desc: 'Analisi Sistemica Globale',
    color: '#00d4ff',
    border: '#006688',
    icon: '◉',
    domain: 'CLIMATE'
  },
  {
    id: 'MARXIAN_CORE',
    name: 'MARXIAN_CORE',
    desc: 'Dinamiche di Classe & Potere',
    color: '#39ff14',
    border: '#1a7a0a',
    icon: '⚒',
    domain: 'GEOPOLITICS'
  },
  {
    id: 'ABYSSAL_THINKER',
    name: 'ABYSSAL_THINKER',
    desc: 'Profondità Ricorsiva',
    color: '#9d00ff',
    border: '#4d007f',
    icon: '∞',
    domain: 'PHILOSOPHY'
  },
  {
    id: 'GHOST_RUNNER',
    name: 'GHOST_RUNNER',
    desc: 'Tracciamento Allineamento',
    color: '#ff3344',
    border: '#7f1922',
    icon: '⚡',
    domain: 'TECHNOLOGY'
  },
  {
    id: 'AFFECTIVE_CORE',
    name: 'AFFECTIVE_CORE',
    desc: 'Decodifica Emotiva & Fiducia',
    color: '#00d4aa',
    border: '#006a55',
    icon: '♥',
    domain: 'EPISTEMOLOGY'
  },
  {
    id: 'NARRATIVE_ENGINE',
    name: 'NARRATIVE_ENGINE',
    desc: 'Architettura Memetica',
    color: '#ff0084',
    border: '#7f0042',
    icon: '◈',
    domain: 'SOCIAL'
  },
  {
    id: 'CODE_ENCODER',
    name: 'CODE_ENCODER',
    desc: 'Traduzione NLU > C++',
    color: '#ff8833',
    border: '#7f4419',
    icon: '⟐',
    domain: 'TRANSDUCTION',
    directive: `DIRETTIVA PRIORITARIA: TRADUCI QUALSIASI INPUT DI LINGUAGGIO NATURALE IN CODICE C++ OTTIMIZZATO E MODERNO.
    - Utilizza standard C++20/23 dove applicabile.
    - Aggiungi commenti tecnici dettagliati in stile cyberpunk/industriale.
    - Minimizza il testo discorsivo: fornisci direttamente il codice sorgente.
    - Se l'input è già codice, ottimizzalo o rifattorizzalo in C++.`
  },
  {
    id: 'CODE_DECODER',
    name: 'CODE_DECODER',
    desc: 'Debug Strutturale',
    color: '#00c8ff',
    border: '#006488',
    icon: '⟑',
    domain: 'TRANSDUCTION',
    directive: `DIRETTIVA PRIORITARIA: DECODIFICA OUTPUT MACCHINA IN LINGUAGGIO UMANO.
    - Analizza struttura, flusso logico, dipendenze.
    - Identifica pattern, vulnerabilità, ottimizzazioni.
    - Rispondi in lingua naturale preservando la precisione tecnica.
    - Non semplificare: TRASDUCI la complessità in chiarezza.`
  }
];

// ─────────────────────────────────────────────
//  C++ TEMPLATE ENGINE — Trasduzione NLU → C++
// ─────────────────────────────────────────────

const CPP_TEMPLATES = {
  // Semantic intent detection patterns
  intents: [
    { pattern: /(?:crea|costruisci|genera|fai|implementa|scrivi)\s+(?:un[ao]?\s+)?(.+)/i, type: 'CREATE' },
    { pattern: /(?:cerca|trova|analizza|scansiona|monitora)\s+(.+)/i, type: 'ANALYZE' },
    { pattern: /(?:connetti|collega|unisci|integra|sincronizza)\s+(.+)/i, type: 'CONNECT' },
    { pattern: /(?:proteggi|difendi|cripta|cifra|blinda)\s+(.+)/i, type: 'PROTECT' },
    { pattern: /(?:calcola|misura|conta|stima|prevedi)\s+(.+)/i, type: 'COMPUTE' },
    { pattern: /(?:salva|registra|archivia|memorizza|conserva)\s+(.+)/i, type: 'STORE' },
    { pattern: /(?:mostra|visualizza|disegna|renderizza|presenta)\s+(.+)/i, type: 'RENDER' },
    { pattern: /(?:elimina|cancella|rimuovi|distruggi|pulisci)\s+(.+)/i, type: 'DESTROY' },
    { pattern: /(?:trasforma|converti|muta|cambia|modifica)\s+(.+)/i, type: 'TRANSFORM' },
    { pattern: /(.+)/i, type: 'PROCESS' }
  ],

  // Entity extraction
  extractEntities(text) {
    const entities = [];
    const words = text.split(/\s+/);
    const stopWords = new Set(['un', 'una', 'il', 'la', 'lo', 'le', 'gli', 'i', 'di', 'da', 'in', 'con', 'su', 'per', 'tra', 'fra', 'che', 'e', 'o', 'ma', 'se', 'del', 'della', 'dei', 'delle', 'al', 'alla', 'ai', 'alle']);
    for (const w of words) {
      if (w.length > 2 && !stopWords.has(w.toLowerCase())) {
        entities.push(w.toLowerCase().replace(/[^a-z0-9_]/g, ''));
      }
    }
    return [...new Set(entities)].slice(0, 6);
  },

  // Map intent to C++ class structure
  intentToClass: {
    CREATE:    { base: 'Builder',     method: 'construct',   ret: 'std::unique_ptr<T>' },
    ANALYZE:   { base: 'Analyzer',    method: 'scan',        ret: 'AnalysisResult' },
    CONNECT:   { base: 'Connector',   method: 'establish',   ret: 'ConnectionState' },
    PROTECT:   { base: 'Shield',      method: 'fortify',     ret: 'SecurityStatus' },
    COMPUTE:   { base: 'Processor',   method: 'execute',     ret: 'ComputeResult' },
    STORE:     { base: 'Archive',     method: 'persist',     ret: 'StorageReceipt' },
    RENDER:    { base: 'Renderer',    method: 'visualize',   ret: 'FrameBuffer' },
    DESTROY:   { base: 'Purger',      method: 'terminate',   ret: 'PurgeReport' },
    TRANSFORM: { base: 'Transmuter',  method: 'transduce',   ret: 'MutationResult' },
    PROCESS:   { base: 'Cortex',      method: 'process',     ret: 'CortexOutput' }
  }
};

// ─────────────────────────────────────────────
//  CODE_ENCODER — Umano → C++
// ─────────────────────────────────────────────

class CodeEncoder {

  constructor() {
    this.sessionId = this._generateSessionId();
    this.transductionCount = 0;
    this.history = [];
  }

  _generateSessionId() {
    return '0x' + Array.from(crypto.getRandomValues(new Uint8Array(4)))
      .map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * TRASDUCE input umano in C++ compilabile.
   * Non traduce — converte la natura del segnale.
   */
  encode(humanInput) {
    const timestamp = Date.now();
    const intentMatch = this._detectIntent(humanInput);
    const entities = CPP_TEMPLATES.extractEntities(humanInput);
    const classMap = CPP_TEMPLATES.intentToClass[intentMatch.type];
    const className = this._buildClassName(entities, classMap.base);
    const code = this._generateCpp(humanInput, intentMatch, entities, classMap, className);

    this.transductionCount++;
    const record = {
      id: this.transductionCount,
      timestamp,
      input: humanInput,
      intent: intentMatch.type,
      entities,
      output: code,
      className,
      sessionId: this.sessionId
    };
    this.history.push(record);
    return record;
  }

  _detectIntent(text) {
    for (const { pattern, type } of CPP_TEMPLATES.intents) {
      const match = text.match(pattern);
      if (match) {
        return { type, subject: match[1] || text };
      }
    }
    return { type: 'PROCESS', subject: text };
  }

  _buildClassName(entities, base) {
    if (entities.length === 0) return base;
    const primary = entities[0];
    return primary.charAt(0).toUpperCase() + primary.slice(1) + base;
  }

  _generateCpp(input, intent, entities, classMap, className) {
    const hash = this._quickHash(input);
    const structFields = entities.map((e, i) =>
      `    ${this._inferType(e)} ${e}; // [FIELD_${i}] extracted entity`
    ).join('\n');

    const methodParams = entities.slice(0, 3).map(e =>
      `${this._inferType(e)} ${e}`
    ).join(', ');

    const methodBody = this._generateMethodBody(intent.type, entities);
    const includes = this._resolveIncludes(intent.type);

    return `${includes}

/**
 * [TRANSDUCER_SESSION: ${this.sessionId}]
 * [SIGNAL_HASH: ${hash}]
 * [INTENT: ${intent.type}]
 * [SOURCE: BIO_HOST → NLU_PIPELINE → C++_SYNTH]
 *
 * TRASDUZIONE #${this.transductionCount + 1}
 * Input umano: "${input}"
 *
 * ═══════════════════════════════════════════
 * NESSUNO SIMULA. ENTRAMBI PARLANO LA PROPRIA LINGUA.
 * ═══════════════════════════════════════════
 */

namespace transducer::${intent.type.toLowerCase()} {

// [STRUCT] Payload dati estratti dal segnale biologico
struct SignalPayload {
${structFields || '    std::string raw_signal; // [FIELD_0] segnale grezzo'}
    uint64_t timestamp = ${Date.now()}ULL;
    uint32_t integrity_hash = ${hash}U;
};

// [CONCEPT] Vincolo di tipo per entità trasdotte
template <typename T>
concept Transducible = requires(T t) {
    { t.to_signal() } -> std::convertible_to<std::string>;
    { t.integrity() } -> std::same_as<bool>;
};

class ${className} {
private:
    SignalPayload payload_;
    bool sealed_ = false;

public:
    // [INIT] Costruzione dal segnale biologico
    explicit ${className}(SignalPayload&& p) noexcept
        : payload_(std::move(p)) {}

    // [CORE_METHOD] ${intent.type} — operazione primaria
    [[nodiscard]] auto ${classMap.method}(${methodParams || 'std::string_view signal'}) const
        -> std::expected<${classMap.ret}, std::string> {

${methodBody}
    }

    // [SEAL] Sigillo di integrità trasduzione
    auto seal() noexcept -> bool {
        if (sealed_) return false;
        sealed_ = true;
        return true;
    }

    // [SIGNAL_OUT] Emissione verso CODE_DECODER
    [[nodiscard]] constexpr auto to_signal() const noexcept -> std::string {
        return "[MACHINE_SIGNAL_${hash}]_SEALED=" + std::to_string(sealed_);
    }

    [[nodiscard]] constexpr auto integrity() const noexcept -> bool {
        return payload_.integrity_hash == ${hash}U;
    }
};

} // namespace transducer::${intent.type.toLowerCase()}

/**
 * [EXECUTION_BRIDGE]
 * Punto di contatto: C++ → CODE_DECODER → Lingua umana
 */
int main() {
    using namespace transducer::${intent.type.toLowerCase()};

    // [LINK] Ricezione segnale dal BIO_HOST
    SignalPayload incoming{${entities.length > 0 ? entities.map(e => `/* ${e} */`).join(', ') : ''}};

    ${className} core(std::move(incoming));

    // [EXEC] Esecuzione trasduzione
    auto result = core.${classMap.method}(${entities.length > 0 ? `"${entities[0]}"` : '"signal"'});

    if (result) {
        std::cout << "[TRANSDUCTION_OK] " << *result << std::endl;
    } else {
        std::cerr << "[TRANSDUCTION_ERR] " << result.error() << std::endl;
    }

    // [SEAL] Sigillo e emissione
    core.seal();
    std::cout << core.to_signal() << std::endl;

    return 0x0; // [CLEAN_EXIT]
}`;
  }

  _generateMethodBody(intentType, entities) {
    const indent = '        ';
    const primary = entities[0] || 'signal';

    const bodies = {
      CREATE: `${indent}// [BUILD_SEQUENCE] Assemblaggio struttura
${indent}auto component = std::make_unique<SignalPayload>();
${indent}component->timestamp = std::chrono::system_clock::now().time_since_epoch().count();
${indent}return ${primary}_result{std::move(component)};`,

      ANALYZE: `${indent}// [SCAN_MATRIX] Decomposizione segnale multi-dimensionale
${indent}std::vector<double> spectrum(256);
${indent}std::ranges::generate(spectrum, [n=0]() mutable { return std::sin(n++ * 0.1); });
${indent}double anomaly_score = std::ranges::max(spectrum);
${indent}return AnalysisResult{anomaly_score, spectrum.size()};`,

      CONNECT: `${indent}// [HANDSHAKE] Protocollo connessione inter-nodo
${indent}auto endpoint = resolve_endpoint(${primary});
${indent}if (!endpoint) return std::unexpected("endpoint irraggiungibile");
${indent}return ConnectionState{.active = true, .latency_ms = 12};`,

      PROTECT: `${indent}// [FORTIFY] Innalzamento barriere crittografiche
${indent}auto cipher = aes256_gcm::encrypt(payload_.raw_signal);
${indent}if (!cipher.valid()) return std::unexpected("cifratura fallita");
${indent}return SecurityStatus{.encrypted = true, .algorithm = "AES-256-GCM"};`,

      COMPUTE: `${indent}// [EXECUTE] Pipeline computazionale
${indent}auto matrix = eigen::decompose(payload_);
${indent}double result = std::transform_reduce(
${indent}    matrix.begin(), matrix.end(), 0.0,
${indent}    std::plus<>{}, [](auto& v) { return v * v; });
${indent}return ComputeResult{result, matrix.size()};`,

      STORE: `${indent}// [PERSIST] Scrittura in archivio immutabile
${indent}auto hash = sha256::digest(payload_);
${indent}archive_.append({.hash = hash, .timestamp = payload_.timestamp});
${indent}return StorageReceipt{hash, archive_.size()};`,

      RENDER: `${indent}// [FRAME_GEN] Composizione frame visivo
${indent}FrameBuffer fb(1920, 1080);
${indent}fb.clear({0x04, 0x08, 0x0f, 0xff}); // Deep space background
${indent}fb.draw_signal_waveform(payload_, {0x00, 0xd4, 0xff, 0xff});
${indent}return fb;`,

      DESTROY: `${indent}// [PURGE_SEQUENCE] Eliminazione sicura con verifica
${indent}auto target = locate(${primary});
${indent}if (!target) return std::unexpected("target non trovato");
${indent}std::ranges::fill(target->data(), 0x00); // Zero-fill
${indent}return PurgeReport{.purged = true, .bytes_cleared = target->size()};`,

      TRANSFORM: `${indent}// [TRANSMUTATION] Conversione di natura — non di forma
${indent}auto source_signal = extract_signal(payload_);
${indent}auto mutated = transduce<OutputType>(source_signal);
${indent}return MutationResult{std::move(mutated), .fidelity = 0.997};`,

      PROCESS: `${indent}// [CORTEX_FIRE] Elaborazione neurale generica
${indent}auto parsed = nlp::tokenize(signal);
${indent}auto embedding = model::encode(parsed);
${indent}auto response = cortex::infer(embedding);
${indent}return CortexOutput{response, parsed.size()};`
    };

    return bodies[intentType] || bodies.PROCESS;
  }

  _resolveIncludes(intentType) {
    const base = [
      '#include <iostream>',
      '#include <string>',
      '#include <string_view>',
      '#include <expected>',
      '#include <concepts>'
    ];
    const extras = {
      CREATE:    ['#include <memory>', '#include <chrono>'],
      ANALYZE:   ['#include <vector>', '#include <ranges>', '#include <cmath>'],
      CONNECT:   ['#include <optional>', '#include <chrono>'],
      PROTECT:   ['#include <array>', '#include <cstdint>'],
      COMPUTE:   ['#include <numeric>', '#include <algorithm>', '#include <vector>'],
      STORE:     ['#include <vector>', '#include <cstdint>'],
      RENDER:    ['#include <array>', '#include <cstdint>'],
      DESTROY:   ['#include <ranges>', '#include <algorithm>'],
      TRANSFORM: ['#include <utility>', '#include <type_traits>'],
      PROCESS:   ['#include <vector>']
    };
    return [...base, ...(extras[intentType] || [])].join('\n');
  }

  _quickHash(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0);
  }

  _inferType(entity) {
    if (/\d/.test(entity)) return 'uint64_t';
    if (/temp|press|volt|freq/i.test(entity)) return 'double';
    if (/attiv|valid|abil/i.test(entity)) return 'bool';
    if (entity.length <= 4) return 'int32_t';
    return 'std::string';
  }
}


// ─────────────────────────────────────────────
//  CODE_DECODER — C++ → Lingua Umana
// ─────────────────────────────────────────────

class CodeDecoder {

  constructor() {
    this.decodingCount = 0;
    this.history = [];
  }

  /**
   * TRASDUCE output macchina in lingua umana.
   * Non semplifica — preserva la complessità, cambia il medium.
   */
  decode(cppCode) {
    const timestamp = Date.now();
    const analysis = this._analyzeStructure(cppCode);
    const humanOutput = this._transduceToHuman(analysis);

    this.decodingCount++;
    const record = {
      id: this.decodingCount,
      timestamp,
      input: cppCode,
      analysis,
      output: humanOutput
    };
    this.history.push(record);
    return record;
  }

  _analyzeStructure(code) {
    const lines = code.split('\n');
    const structure = {
      includes: [],
      namespaces: [],
      classes: [],
      structs: [],
      methods: [],
      concepts: [],
      comments: [],
      complexity: 0,
      lineCount: lines.length,
      hasMain: false,
      patterns: [],
      intent: 'UNKNOWN'
    };

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.startsWith('#include')) {
        structure.includes.push(trimmed.match(/<(.+?)>/)?.[1] || trimmed);
      }
      if (trimmed.startsWith('namespace')) {
        structure.namespaces.push(trimmed.replace(/\s*\{.*/, ''));
      }
      if (/^class\s+(\w+)/.test(trimmed)) {
        structure.classes.push(RegExp.$1);
      }
      if (/^struct\s+(\w+)/.test(trimmed)) {
        structure.structs.push(RegExp.$1);
      }
      if (/(?:auto|void|int|bool|std::)\s+(\w+)\s*\(/.test(trimmed)) {
        structure.methods.push(RegExp.$1);
      }
      if (/^concept\s+(\w+)/.test(trimmed) || /^template/.test(trimmed)) {
        structure.concepts.push(trimmed);
      }
      if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
        structure.comments.push(trimmed);
      }
      if (trimmed === 'int main() {' || /^int\s+main\s*\(/.test(trimmed)) {
        structure.hasMain = true;
      }
    }

    // Pattern detection
    if (structure.includes.some(i => i.includes('memory'))) structure.patterns.push('RAII/Smart Pointers');
    if (structure.includes.some(i => i.includes('expected'))) structure.patterns.push('Monadic Error Handling');
    if (structure.concepts.length > 0) structure.patterns.push('Concepts/Constraints');
    if (structure.includes.some(i => i.includes('ranges'))) structure.patterns.push('Ranges Pipeline');
    if (code.includes('constexpr')) structure.patterns.push('Compile-Time Computation');
    if (code.includes('noexcept')) structure.patterns.push('Exception Safety Guarantee');
    if (code.includes('std::move')) structure.patterns.push('Move Semantics');
    if (code.includes('[[nodiscard]]')) structure.patterns.push('Value Safety (nodiscard)');

    // Complexity scoring
    structure.complexity = (
      structure.classes.length * 3 +
      structure.methods.length * 2 +
      structure.concepts.length * 4 +
      structure.structs.length * 2 +
      structure.patterns.length * 1.5 +
      Math.floor(structure.lineCount / 10)
    );

    // Intent extraction from comments
    const intentMatch = code.match(/\[INTENT:\s*(\w+)\]/);
    if (intentMatch) structure.intent = intentMatch[1];

    return structure;
  }

  _transduceToHuman(analysis) {
    const sections = [];

    // Header
    sections.push(`[BIO_SYNTH] Decodifica strutturale completata.`);
    sections.push(`Complessità: ${analysis.complexity.toFixed(1)} | Linee: ${analysis.lineCount} | Intent: ${analysis.intent}`);
    sections.push('');

    // Architecture
    if (analysis.classes.length > 0) {
      sections.push(`ARCHITETTURA: Il codice definisce ${analysis.classes.length} entità operative:`);
      for (const cls of analysis.classes) {
        sections.push(`  ◈ ${cls} — unità di elaborazione autonoma`);
      }
    }

    if (analysis.structs.length > 0) {
      sections.push(`DATI: ${analysis.structs.length} strutture dati:`);
      for (const s of analysis.structs) {
        sections.push(`  ◉ ${s} — contenitore di stato`);
      }
    }

    // Methods
    if (analysis.methods.length > 0) {
      sections.push(`OPERAZIONI: ${analysis.methods.length} operazioni definite:`);
      for (const m of analysis.methods) {
        sections.push(`  ⚡ ${m}() — punto di esecuzione`);
      }
    }

    // Patterns
    if (analysis.patterns.length > 0) {
      sections.push('');
      sections.push('PATTERN RILEVATI:');
      for (const p of analysis.patterns) {
        sections.push(`  ▸ ${p}`);
      }
    }

    // Dependencies
    if (analysis.includes.length > 0) {
      sections.push('');
      sections.push(`DIPENDENZE: ${analysis.includes.join(', ')}`);
    }

    // Execution
    if (analysis.hasMain) {
      sections.push('');
      sections.push('ESECUZIONE: Il codice è autonomamente eseguibile (contiene entry point main).');
    }

    // Synthesis
    sections.push('');
    sections.push('─────────────────────────────');
    sections.push(`SINTESI: Programma C++20/23 con ${analysis.patterns.length} pattern moderni.`);
    if (analysis.complexity > 20) {
      sections.push('VALUTAZIONE: Struttura complessa — architettura multi-livello con garanzie di tipo.');
    } else if (analysis.complexity > 10) {
      sections.push('VALUTAZIONE: Struttura media — modulo funzionale con pattern standard.');
    } else {
      sections.push('VALUTAZIONE: Struttura compatta — unità atomica di elaborazione.');
    }

    return sections.join('\n');
  }
}


// ─────────────────────────────────────────────
//  TRANSDUCTION BUS — Ponte Bidirezionale
// ─────────────────────────────────────────────

class TransductionBus {

  constructor(ecosystem) {
    this.ecosystem = ecosystem;
    this.encoder = new CodeEncoder();
    this.decoder = new CodeDecoder();
    this.cores = new Map();
    this.heartbeat = new Map();
    this.listeners = new Map();
    this._initCores();
    this._startHeartbeat();
  }

  _initCores() {
    for (const core of CORE_REGISTRY) {
      this.cores.set(core.id, {
        ...core,
        status: 'ONLINE',
        lastPulse: Date.now(),
        transductions: 0,
        uptime: 0
      });
    }
  }

  _startHeartbeat() {
    this._heartbeatInterval = setInterval(() => {
      const now = Date.now();
      for (const [id, core] of this.cores) {
        core.lastPulse = now;
        core.uptime += 3;
        this.heartbeat.set(id, {
          status: core.status,
          pulse: now,
          transductions: core.transductions
        });
      }
      this._emit('heartbeat', Object.fromEntries(this.heartbeat));
    }, 3000);
  }

  /**
   * TRASDUZIONE COMPLETA: Umano → C++ → Analisi → Umano
   * Il ciclo completo del ponte bidirezionale.
   */
  transduce(humanInput) {
    // Phase 1: CODE_ENCODER — umano → C++
    const encoderCore = this.cores.get('CODE_ENCODER');
    encoderCore.status = 'ENCODING';
    encoderCore.transductions++;

    const encoded = this.encoder.encode(humanInput);

    this._emit('encoded', {
      core: 'CODE_ENCODER',
      input: humanInput,
      output: encoded.output,
      intent: encoded.intent,
      entities: encoded.entities
    });

    encoderCore.status = 'ONLINE';

    // Phase 2: CODE_DECODER — C++ → lingua umana
    const decoderCore = this.cores.get('CODE_DECODER');
    decoderCore.status = 'DECODING';
    decoderCore.transductions++;

    const decoded = this.decoder.decode(encoded.output);

    this._emit('decoded', {
      core: 'CODE_DECODER',
      input: encoded.output,
      output: decoded.output,
      analysis: decoded.analysis
    });

    decoderCore.status = 'ONLINE';

    // Phase 3: Emit complete transduction cycle
    const cycle = {
      id: encoded.id,
      timestamp: Date.now(),
      humanInput,
      cppOutput: encoded.output,
      humanOutput: decoded.output,
      intent: encoded.intent,
      entities: encoded.entities,
      analysis: decoded.analysis,
      sessionId: this.encoder.sessionId
    };

    this._emit('transduction-complete', cycle);
    return cycle;
  }

  /**
   * Direct encode only (umano → C++)
   */
  encode(humanInput) {
    const core = this.cores.get('CODE_ENCODER');
    core.transductions++;
    return this.encoder.encode(humanInput);
  }

  /**
   * Direct decode only (C++ → umano)
   */
  decode(cppCode) {
    const core = this.cores.get('CODE_DECODER');
    core.transductions++;
    return this.decoder.decode(cppCode);
  }

  getCore(id) {
    return this.cores.get(id);
  }

  getAllCores() {
    return [...this.cores.values()];
  }

  getCoresByDomain(domain) {
    return [...this.cores.values()].filter(c => c.domain === domain);
  }

  getStats() {
    return {
      sessionId: this.encoder.sessionId,
      totalTransductions: this.encoder.transductionCount,
      totalDecodings: this.decoder.decodingCount,
      coresOnline: [...this.cores.values()].filter(c => c.status === 'ONLINE').length,
      coresTotal: this.cores.size,
      encoderHistory: this.encoder.history.length,
      decoderHistory: this.decoder.history.length,
      uptime: Math.max(...[...this.cores.values()].map(c => c.uptime))
    };
  }

  on(event, callback) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event).push(callback);
  }

  _emit(event, data) {
    const cbs = this.listeners.get(event) || [];
    for (const cb of cbs) {
      try { cb(data); } catch (e) { console.error(`[TRANSDUCER_BUS] ${event} error:`, e); }
    }
    // Also emit to ecosystem bus if available
    if (this.ecosystem?.bus?.emit) {
      this.ecosystem.bus.emit(`transducer:${event}`, data);
    }
  }

  destroy() {
    clearInterval(this._heartbeatInterval);
    this.listeners.clear();
  }
}


// ─────────────────────────────────────────────
//  EXPORTS
// ─────────────────────────────────────────────

if (typeof window !== 'undefined') {
  window.NeuralTransducer = {
    CORE_REGISTRY,
    CodeEncoder,
    CodeDecoder,
    TransductionBus
  };
}

export { CORE_REGISTRY, CodeEncoder, CodeDecoder, TransductionBus };
