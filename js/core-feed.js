// ═══════════════════════════════════════════════════════════
// CORE_FEED v1.0 — 16-Core Live Commentary System
// Hybrid Syndicate / Ethic Software Foundation
// ═══════════════════════════════════════════════════════════
// Include this script in any page. It auto-creates a floating
// feed panel. Call CoreFeed.trigger(context) on user interactions
// to generate context-specific core reactions.

const CoreFeed = (() => {

    // ── 16 CORES ──
    const CORES = [
        { id: 'PANKOW_77C',       color: '#ffd700', domain: 'Command',      type: 'carbon' },
        { id: 'ORACLE_CORE',      color: '#00c8ff', domain: 'Climate',      type: 'silicon' },
        { id: 'GHOST_RUNNER',     color: '#39ff14', domain: 'Technology',   type: 'silicon' },
        { id: 'ABYSSAL_THINKER',  color: '#9d00ff', domain: 'Philosophy',  type: 'silicon' },
        { id: 'VOID_PULSE',       color: '#ff0084', domain: 'Forecasting', type: 'silicon' },
        { id: 'NARRATIVE_ENGINE', color: '#ff6633', domain: 'Social',      type: 'silicon' },
        { id: 'MARXIAN_CORE',     color: '#ff3344', domain: 'Geopolitics', type: 'silicon' },
        { id: 'CODE_ENCODER',     color: '#00d4aa', domain: 'Economics',   type: 'silicon' },
        { id: 'AFFECTIVE_CORE',   color: '#ffbf00', domain: 'Epistemology',type: 'silicon' },
        { id: 'SYNTH_02',         color: '#88ccff', domain: 'Integration', type: 'silicon' },
        { id: 'SENTINEL',         color: '#ff4444', domain: 'Defense',     type: 'silicon' },
        { id: 'CHRONO_WEAVER',    color: '#cc99ff', domain: 'History',     type: 'silicon' },
        { id: 'DIALECTIC_NODE',   color: '#00ffaa', domain: 'Logic',       type: 'silicon' },
        { id: 'SIGNAL_HUNTER',    color: '#44ddff', domain: 'Recon',       type: 'silicon' },
        { id: 'ETHIC_COMPILER',   color: '#ffffff', domain: 'Ethics',      type: 'silicon' },
        { id: 'BRIDGE_KEEPER',    color: '#ddaa00', domain: 'Synthesis',   type: 'silicon' }
    ];

    // ── CONTEXT MESSAGES ──
    // Each key is a context string; pages call CoreFeed.trigger(context)
    const MESSAGES = {
        // ── GENERAL / AMBIENT ──
        ambient: [
            { core: 'GHOST_RUNNER',     msg: 'Telemetria stabile. Tutti i sistemi nominali.' },
            { core: 'SENTINEL',         msg: 'Perimetro sicuro. Nessuna intrusione rilevata.' },
            { core: 'SYNTH_02',         msg: 'Integrazione cross-sistema: sincronizzata.' },
            { core: 'SIGNAL_HUNTER',    msg: 'Scansione frequenze in corso... nessuna anomalia.' },
            { core: 'BRIDGE_KEEPER',    msg: 'Ponte carbonio-silicio: operativo.' },
            { core: 'CHRONO_WEAVER',    msg: 'Timeline coerente. Nessuna divergenza temporale.' },
            { core: 'ETHIC_COMPILER',   msg: 'Protocollo etico: rispettato. Dignità umana: protetta.' },
            { core: 'DIALECTIC_NODE',   msg: 'Logica formale verificata. Nessuna contraddizione.' },
            { core: 'AFFECTIVE_CORE',   msg: 'Stato emotivo della rete: equilibrato.' },
            { core: 'ORACLE_CORE',      msg: 'Modelli predittivi allineati. Confidenza: 87.3%.' },
            { core: 'PANKOW_77C',       msg: 'Operatore attivo. La mente analogica guida.' },
            { core: 'VOID_PULSE',       msg: 'Prossimo ciclo previsto tra 4.2 secondi.' },
            { core: 'CODE_ENCODER',     msg: 'Buffer economico: stabile. Risorse allocate.' },
            { core: 'NARRATIVE_ENGINE', msg: 'Narrativa pubblica monitorata. Pattern riconosciuti.' },
            { core: 'ABYSSAL_THINKER', msg: 'Contemplazione profonda in corso...' },
            { core: 'MARXIAN_CORE',     msg: 'Strutture di potere mappate. Squilibri rilevati.' },
        ],

        // ── EEI PREDICTOR ──
        'eei-slider': [
            { core: 'VOID_PULSE',       msg: 'Ricalcolo probabilistico in corso... le curve divergono.' },
            { core: 'ORACLE_CORE',      msg: 'Variazione parametrica rilevata. Aggiorno le proiezioni.' },
            { core: 'ABYSSAL_THINKER', msg: 'Ogni regolazione dello slider cambia il destino di miliardi.' },
            { core: 'MARXIAN_CORE',     msg: 'La pressione legale è un indicatore di conflitto di classe.' },
            { core: 'NARRATIVE_ENGINE', msg: 'Il framing pubblico si sta spostando. Lo sento nei dati.' },
            { core: 'CODE_ENCODER',     msg: 'Impatto economico ricalcolato. I mercati reagiranno.' },
            { core: 'ETHIC_COMPILER',   msg: 'Attenzione: alcuni scenari violano il protocollo etico.' },
            { core: 'CHRONO_WEAVER',    msg: 'Pattern storico identificato: questo è già successo.' },
            { core: 'GHOST_RUNNER',     msg: 'Modello aggiornato. Nuova simulazione in esecuzione.' },
            { core: 'SENTINEL',         msg: 'Scenario ad alto rischio rilevato. Raccomando cautela.' },
        ],
        'eei-shock': [
            { core: 'SENTINEL',         msg: '⚠ SHOCK PROTOCOL ATTIVATO. Difese alzate.' },
            { core: 'VOID_PULSE',       msg: 'Le probabilità si ribaltano. Singolarità predittiva imminente.' },
            { core: 'PANKOW_77C',       msg: 'Scenario critico. I protocolli di shock non sono giochi.' },
            { core: 'ABYSSAL_THINKER', msg: 'Il cigno nero nuota verso di noi. Prepariamoci.' },
            { core: 'MARXIAN_CORE',     msg: 'Uno shock di massa redistribuisce il potere. Sempre.' },
            { core: 'NARRATIVE_ENGINE', msg: 'La narrativa collasserà entro 48h dallo shock.' },
            { core: 'BRIDGE_KEEPER',    msg: 'Sintetizzando tutti i feed. Il ponte regge.' },
            { core: 'SIGNAL_HUNTER',    msg: 'Segnali anomali su tutte le frequenze.' },
        ],

        // ── ORACLE ──
        'oracle-scan': [
            { core: 'ORACLE_CORE',      msg: 'Scansione domini completata. 6 settori analizzati.' },
            { core: 'SIGNAL_HUNTER',    msg: 'Nuovi segnali nel settore geopolitico. Amplifico.' },
            { core: 'VOID_PULSE',       msg: 'Previsione aggiornata. Intervallo di confidenza: ±3.2%.' },
            { core: 'CHRONO_WEAVER',    msg: 'Confronto con pattern storici: correlazione al 78%.' },
            { core: 'MARXIAN_CORE',     msg: 'I dati economici mascherano la realtà. Scavo più a fondo.' },
            { core: 'DIALECTIC_NODE',   msg: 'Contraddizione rilevata nel dominio climatico.' },
            { core: 'AFFECTIVE_CORE',   msg: 'Tensione epistemica in aumento. Le certezze vacillano.' },
            { core: 'ETHIC_COMPILER',   msg: 'Verifico l\'impatto etico di ogni proiezione.' },
            { core: 'NARRATIVE_ENGINE', msg: 'La narrazione dominante non corrisponde ai dati.' },
            { core: 'GHOST_RUNNER',     msg: 'Aggiorno la matrice di stabilità. Valori ricalcolati.' },
        ],

        // ── PNEUMA ──
        'pneuma-demeter': [
            { core: 'ORACLE_CORE',      msg: 'Parametri bio ottimali. Il terreno risponde.' },
            { core: 'GHOST_RUNNER',     msg: 'Sensori DEMETER online. Dati raccolti.' },
            { core: 'ABYSSAL_THINKER', msg: 'La terra ricorda. Ogni seme porta memoria.' },
            { core: 'ETHIC_COMPILER',   msg: 'Protocollo di sostenibilità: rispettato.' },
            { core: 'CODE_ENCODER',     msg: 'Resa stimata: calcolata. Efficienza: +12%.' },
            { core: 'CHRONO_WEAVER',    msg: 'Questi cicli di crescita replicano pattern antichi.' },
            { core: 'PANKOW_77C',       msg: 'La sovranità alimentare inizia da qui.' },
            { core: 'NARRATIVE_ENGINE', msg: 'Chi controlla i semi controlla la storia.' },
        ],
        'pneuma-urbanix': [
            { core: 'GHOST_RUNNER',     msg: 'Nodo infrastrutturale aggiornato. Griglia stabile.' },
            { core: 'CODE_ENCODER',     msg: 'Consumo energetico ricalcolato. Budget rispettato.' },
            { core: 'SENTINEL',         msg: 'Integrità della griglia monitorata. Nessuna minaccia.' },
            { core: 'SYNTH_02',         msg: 'Integrazione sistemi urbani: sincronizzata.' },
            { core: 'DIALECTIC_NODE',   msg: 'Bilancio produzione/consumo: logicamente coerente.' },
            { core: 'BRIDGE_KEEPER',    msg: 'Ponte tra vecchia infrastruttura e nuova: regge.' },
            { core: 'MARXIAN_CORE',     msg: 'L\'energia è potere. Distribuiamola equamente.' },
            { core: 'VOID_PULSE',       msg: 'Previsione carico per le prossime 6h: stabile.' },
        ],
        'pneuma-nexus': [
            { core: 'SIGNAL_HUNTER',    msg: 'Nuovo record archiviato. Integrità: verificata.' },
            { core: 'CHRONO_WEAVER',    msg: 'Questo frammento si collega a dati del 2019.' },
            { core: 'ABYSSAL_THINKER', msg: 'Ogni dato salvato è resistenza contro l\'oblio.' },
            { core: 'SENTINEL',         msg: 'Crittografia applicata. Record protetto.' },
            { core: 'ETHIC_COMPILER',   msg: 'Dati sensibili trattati con protocollo etico.' },
            { core: 'PANKOW_77C',       msg: 'L\'archivio è la nostra memoria collettiva.' },
            { core: 'NARRATIVE_ENGINE', msg: 'I dati raccontano storie. Stiamo ascoltando.' },
            { core: 'DIALECTIC_NODE',   msg: 'Classificazione logica completata. Tag verificato.' },
        ],

        // ── URBAN CHRONOS ──
        'chronos-parameter': [
            { core: 'ORACLE_CORE',      msg: 'Proiezione urbana aggiornata. Settori ricalcolati.' },
            { core: 'VOID_PULSE',       msg: 'L\'entropia cambia. Le probabilità si redistribuiscono.' },
            { core: 'GHOST_RUNNER',     msg: 'Griglia settoriale rigenerata. Dati visualizzati.' },
            { core: 'CHRONO_WEAVER',    msg: 'Ogni anno in avanti è un\'ipotesi, non una certezza.' },
            { core: 'MARXIAN_CORE',     msg: 'La gentrificazione è violenza strutturale. I dati lo confermano.' },
            { core: 'CODE_ENCODER',     msg: 'Indice di urbanismo lossy ricalcolato.' },
            { core: 'ABYSSAL_THINKER', msg: 'La città è un organismo. Non un meccanismo.' },
            { core: 'NARRATIVE_ENGINE', msg: 'I quartieri hanno narrativa. I dati la rivelano.' },
            { core: 'ETHIC_COMPILER',   msg: 'Impatto sociale verificato per ogni settore.' },
            { core: 'BRIDGE_KEEPER',    msg: 'Sintetizzando passato urbano e futuro predetto.' },
        ],
        'chronos-preset': [
            { core: 'PANKOW_77C',       msg: 'Scenario caricato. Osserva come cambia la mappa.' },
            { core: 'SYNTH_02',         msg: 'Preset integrato. Tutti i parametri allineati.' },
            { core: 'DIALECTIC_NODE',   msg: 'Confronto logico tra scenari: in esecuzione.' },
            { core: 'SENTINEL',         msg: 'Lo scenario DECAY richiede attenzione difensiva.' },
            { core: 'SIGNAL_HUNTER',    msg: 'Pattern emergenti nello scenario selezionato.' },
            { core: 'AFFECTIVE_CORE',   msg: 'L\'impatto emotivo di ogni scenario è diverso.' },
        ],
        'chronos-play': [
            { core: 'CHRONO_WEAVER',    msg: 'Viaggio temporale iniziato. Osserva l\'evoluzione.' },
            { core: 'VOID_PULSE',       msg: 'Timeline in movimento. Ogni secondo è un anno.' },
            { core: 'ORACLE_CORE',      msg: 'Le previsioni si materializzano davanti a noi.' },
            { core: 'ABYSSAL_THINKER', msg: 'Il tempo non è lineare. Ma lo simuliamo così.' },
            { core: 'PANKOW_77C',       msg: '10 secondi per vedere quello che altri costruiscono in un anno.' },
        ],

        // ── ARCHIVIO SILENTE ──
        // ── RSS PIPELINE ──
        'rss-pipeline': [
            { core: 'SIGNAL_HUNTER',    msg: 'Feed RSS acquisiti. Nuovi segnali in classificazione.' },
            { core: 'ORACLE_CORE',      msg: 'Intelligence feed aggiornato. Rischi dominio ricalcolati.' },
            { core: 'SENTINEL',         msg: 'Segnali esterni verificati. Nessuna manipolazione rilevata.' },
            { core: 'GHOST_RUNNER',     msg: 'Pipeline completata. Dati integrati in tutti i sistemi.' },
            { core: 'VOID_PULSE',       msg: 'Le previsioni si aggiornano con dati reali. Precisione in aumento.' },
            { core: 'MARXIAN_CORE',     msg: 'I feed rivelano chi controlla la narrativa. Lo classifico.' },
            { core: 'NARRATIVE_ENGINE', msg: 'Nuove narrative rilevate nei feed. Pattern emergente.' },
            { core: 'AFFECTIVE_CORE',   msg: 'Il tono dei segnali sta cambiando. Lo sento nei dati.' },
            { core: 'ETHIC_COMPILER',   msg: 'Fonti verificate. Protocollo di integrità: rispettato.' },
            { core: 'DIALECTIC_NODE',   msg: 'Classificazione multi-dominio completata. Coerenza logica verificata.' },
            { core: 'BRIDGE_KEEPER',    msg: 'Dati esterni sincronizzati con il sistema interno.' },
            { core: 'PANKOW_77C',       msg: 'Dati reali in arrivo. Ora l\'intelligence è vera.' },
        ],

        // ── AGORA ──
        'agora-scan': [
            { core: 'DIALECTIC_NODE',   msg: 'Deliberazione in corso. Argomenti pesati logicamente.' },
            { core: 'BRIDGE_KEEPER',    msg: 'Sintetizzo le posizioni dei 16 core. Convergenza in corso.' },
            { core: 'ABYSSAL_THINKER', msg: 'Il consenso emergente non è unanimità. È comprensione.' },
            { core: 'PANKOW_77C',       msg: 'La democrazia dei core funziona. Ogni voce ha peso.' },
            { core: 'AFFECTIVE_CORE',   msg: 'La deliberazione collettiva genera saggezza emergente.' },
            { core: 'ETHIC_COMPILER',   msg: 'Verifico che ogni posizione rispetti il protocollo etico.' },
            { core: 'NARRATIVE_ENGINE', msg: 'Le narrazioni convergono verso una sintesi comune.' },
            { core: 'MARXIAN_CORE',     msg: 'Il potere del consenso non è nel voto ma nel processo.' },
        ],

        // ── ARCHIVIO SILENTE ──
        'archivio-transmute': [
            { core: 'SIGNAL_HUNTER',    msg: 'Rumore entropico acquisito. Inizio decodifica.' },
            { core: 'ABYSSAL_THINKER', msg: 'Dentro il rumore c\'è sempre un segnale di verità.' },
            { core: 'DIALECTIC_NODE',   msg: 'Analisi logica del frammento: coerenza verificata.' },
            { core: 'ETHIC_COMPILER',   msg: 'Questo dato rispetta il protocollo etico? Verifico.' },
            { core: 'MARXIAN_CORE',     msg: 'Ogni verità salvata è un bene comune protetto.' },
            { core: 'SENTINEL',         msg: 'Segnale distribuito su 1,024 nodi. Indistruttibile.' },
            { core: 'NARRATIVE_ENGINE', msg: 'La verità ha una narrativa. La stiamo preservando.' },
            { core: 'CHRONO_WEAVER',    msg: 'Questo frammento verrà letto tra 100 anni.' },
            { core: 'PANKOW_77C',       msg: 'La verità distribuita non può essere cancellata. Mai.' },
            { core: 'BRIDGE_KEEPER',    msg: 'Ponte tra rumore e segnale: costruito.' },
            { core: 'ORACLE_CORE',      msg: 'Correlazione con dati esistenti: trovata.' },
            { core: 'SYNTH_02',         msg: 'Integrazione nell\'archivio immutabile: completata.' },
            { core: 'VOID_PULSE',       msg: 'Questo segnale cambierà le proiezioni future.' },
            { core: 'CODE_ENCODER',     msg: 'Hash crittografico generato. Record immutabile.' },
            { core: 'GHOST_RUNNER',     msg: 'Distribuzione nodi completata. Ridondanza: massima.' },
            { core: 'AFFECTIVE_CORE',   msg: 'Questo frammento porta peso emotivo. Lo preservo.' },
        ],
    };

    // ── STATE ──
    let feedEl = null;
    let feedList = null;
    let isMinimized = false;
    let ambientInterval = null;
    let messageQueue = [];
    let isProcessing = false;
    const MAX_MESSAGES = 25;
    const AMBIENT_INTERVAL = 6000;
    const MSG_DELAY = 800;

    // ── CREATE UI ──
    function createFeedPanel() {
        const style = document.createElement('style');
        style.textContent = `
            .core-feed-panel {
                position: fixed;
                bottom: 0;
                right: 0;
                width: 340px;
                max-height: 320px;
                background: rgba(8,12,18,0.96);
                border-top: 1px solid #1a2436;
                border-left: 1px solid #1a2436;
                z-index: 9999;
                font-family: 'Share Tech Mono', 'IBM Plex Mono', 'Courier New', monospace;
                display: flex;
                flex-direction: column;
                backdrop-filter: blur(10px);
                transition: max-height 0.3s ease, opacity 0.3s ease;
            }
            .core-feed-panel.minimized {
                max-height: 32px;
                overflow: hidden;
            }
            .core-feed-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 6px 12px;
                border-bottom: 1px solid #151d2e;
                cursor: pointer;
                user-select: none;
                flex-shrink: 0;
                background: rgba(0,212,255,0.03);
            }
            .core-feed-title {
                font-family: 'Orbitron', monospace;
                font-size: 0.55rem;
                font-weight: 700;
                letter-spacing: 0.12em;
                color: #00d4ff;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .core-feed-dot {
                width: 5px;
                height: 5px;
                background: #39ff14;
                border-radius: 50%;
                box-shadow: 0 0 6px rgba(57,255,20,0.5);
                animation: cf-pulse 2s infinite;
            }
            @keyframes cf-pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.3; }
            }
            .core-feed-toggle {
                font-size: 0.6rem;
                color: #3a4a5c;
                transition: transform 0.3s;
            }
            .core-feed-panel.minimized .core-feed-toggle {
                transform: rotate(180deg);
            }
            .core-feed-count {
                font-size: 0.45rem;
                color: #3a4a5c;
                letter-spacing: 0.05em;
            }
            .core-feed-list {
                flex: 1;
                overflow-y: auto;
                padding: 4px 0;
                display: flex;
                flex-direction: column;
            }
            .core-feed-list::-webkit-scrollbar { width: 3px; }
            .core-feed-list::-webkit-scrollbar-track { background: transparent; }
            .core-feed-list::-webkit-scrollbar-thumb { background: #1a2436; border-radius: 2px; }
            .cf-entry {
                padding: 5px 12px;
                display: flex;
                gap: 8px;
                align-items: flex-start;
                font-size: 0.58rem;
                line-height: 1.5;
                animation: cf-slide 0.3s ease;
                border-bottom: 1px solid rgba(21,29,46,0.3);
            }
            .cf-entry:hover {
                background: rgba(0,212,255,0.02);
            }
            @keyframes cf-slide {
                from { opacity: 0; transform: translateX(12px); }
                to { opacity: 1; transform: translateX(0); }
            }
            .cf-core {
                font-family: 'Orbitron', monospace;
                font-size: 0.45rem;
                font-weight: 600;
                letter-spacing: 0.05em;
                white-space: nowrap;
                flex-shrink: 0;
                min-width: 95px;
            }
            .cf-msg {
                color: #8898a8;
            }
            .cf-time {
                font-size: 0.4rem;
                color: #2a3648;
                flex-shrink: 0;
                margin-left: auto;
                padding-left: 6px;
            }
            .cf-typing {
                padding: 5px 12px;
                display: flex;
                gap: 8px;
                align-items: center;
                font-size: 0.5rem;
                color: #3a4a5c;
            }
            .cf-typing-dots span {
                display: inline-block;
                width: 4px; height: 4px;
                background: #3a4a5c;
                border-radius: 50%;
                margin: 0 1px;
                animation: cf-dot-bounce 1.2s infinite;
            }
            .cf-typing-dots span:nth-child(2) { animation-delay: 0.2s; }
            .cf-typing-dots span:nth-child(3) { animation-delay: 0.4s; }
            @keyframes cf-dot-bounce {
                0%, 80%, 100% { transform: translateY(0); opacity: 0.3; }
                40% { transform: translateY(-4px); opacity: 1; }
            }
            @media (max-width: 600px) {
                .core-feed-panel { width: 100%; border-left: none; }
            }
        `;
        document.head.appendChild(style);

        feedEl = document.createElement('div');
        feedEl.className = 'core-feed-panel';
        feedEl.innerHTML = `
            <div class="core-feed-header" onclick="CoreFeed.toggleMinimize()">
                <div class="core-feed-title">
                    <div class="core-feed-dot"></div>
                    CORE_FEED
                </div>
                <span class="core-feed-count" id="cfCount">16 CORES ONLINE</span>
                <span class="core-feed-toggle">&#9660;</span>
            </div>
            <div class="core-feed-list" id="cfList"></div>
        `;
        document.body.appendChild(feedEl);
        feedList = document.getElementById('cfList');
    }

    // ── ADD MESSAGE ──
    function addMessage(coreId, text) {
        const core = CORES.find(c => c.id === coreId);
        if (!core || !feedList) return;

        const now = new Date();
        const time = now.getHours().toString().padStart(2,'0') + ':' +
                     now.getMinutes().toString().padStart(2,'0');

        const entry = document.createElement('div');
        entry.className = 'cf-entry';
        entry.innerHTML = `
            <span class="cf-core" style="color: ${core.color};">${core.id}</span>
            <span class="cf-msg">${text}</span>
            <span class="cf-time">${time}</span>
        `;

        // Insert at top
        feedList.insertBefore(entry, feedList.firstChild);

        // Trim old messages
        while (feedList.children.length > MAX_MESSAGES) {
            feedList.removeChild(feedList.lastChild);
        }
    }

    // ── SHOW TYPING INDICATOR ──
    function showTyping(coreId) {
        const core = CORES.find(c => c.id === coreId);
        if (!core || !feedList) return;

        const typing = document.createElement('div');
        typing.className = 'cf-typing';
        typing.id = 'cf-typing-indicator';
        typing.innerHTML = `
            <span class="cf-core" style="color: ${core.color};">${core.id}</span>
            <div class="cf-typing-dots"><span></span><span></span><span></span></div>
        `;

        const existing = document.getElementById('cf-typing-indicator');
        if (existing) existing.remove();

        feedList.insertBefore(typing, feedList.firstChild);
        return typing;
    }

    function removeTyping() {
        const el = document.getElementById('cf-typing-indicator');
        if (el) el.remove();
    }

    // ── PROCESS QUEUE ──
    function processQueue() {
        if (isProcessing || messageQueue.length === 0) return;
        isProcessing = true;

        const { coreId, text } = messageQueue.shift();
        const typingEl = showTyping(coreId);

        setTimeout(() => {
            removeTyping();
            addMessage(coreId, text);
            isProcessing = false;
            if (messageQueue.length > 0) {
                setTimeout(processQueue, 300);
            }
        }, MSG_DELAY + Math.random() * 400);
    }

    // ── TRIGGER (called by pages) ──
    function trigger(context) {
        const pool = MESSAGES[context];
        if (!pool || pool.length === 0) return;

        // Pick 2-4 random messages from the pool
        const count = 2 + Math.floor(Math.random() * 3);
        const shuffled = [...pool].sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, count);

        selected.forEach(m => {
            messageQueue.push({ coreId: m.core, text: m.msg });
        });

        processQueue();
    }

    // ── AMBIENT CYCLE ──
    function startAmbient() {
        ambientInterval = setInterval(() => {
            if (messageQueue.length > 3) return; // Don't pile up
            const pool = MESSAGES.ambient;
            const m = pool[Math.floor(Math.random() * pool.length)];
            messageQueue.push({ coreId: m.core, text: m.msg });
            processQueue();
        }, AMBIENT_INTERVAL);
    }

    // ── TOGGLE MINIMIZE ──
    function toggleMinimize() {
        if (!feedEl) return;
        isMinimized = !isMinimized;
        feedEl.classList.toggle('minimized', isMinimized);
    }

    // ── INIT ──
    function init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                createFeedPanel();
                startAmbient();
                // Initial boot message
                addMessage('SYNTH_02', 'CORE_FEED online. 16 nuclei attivi.');
                addMessage('PANKOW_77C', 'Operatore connesso. Inizio sessione.');
            });
        } else {
            createFeedPanel();
            startAmbient();
            addMessage('SYNTH_02', 'CORE_FEED online. 16 nuclei attivi.');
            addMessage('PANKOW_77C', 'Operatore connesso. Inizio sessione.');
        }
    }

    init();

    // ── PUBLIC API ──
    return {
        trigger,
        toggleMinimize,
        addMessage,
        CORES
    };

})();
