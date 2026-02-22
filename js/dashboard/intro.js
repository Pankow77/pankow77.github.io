/**
 * IntroSequence — Mission Control Boot.
 * ═══════════════════════════════════════
 * Not a menu. A portal.
 *
 * Phase 1: Black screen. Cursor blink. Authentication handshake.
 * Phase 2: Core allocation. Each subsystem declared operative, one at a time.
 * Phase 3: Unlock. Progress bar fills. Hub reveals.
 *
 * Total duration: ~7 seconds.
 * No buttons. No choice. You're already in.
 *
 * Persistence: sessionStorage tracks completion.
 *   Refresh within same session = skip boot.
 *   New session = boot replays.
 */

// ── Phase 1: Handshake ──
const HANDSHAKE_LINES = [
  { text: 'MISSION CONTROL // AUTHENTICATION HANDSHAKE', cls: 'cyan', delay: 600 },
  { text: '...', cls: 'dim', delay: 400 },
  { text: 'SIGIL KERNEL v2.7.40', cls: 'green', delay: 300 },
  { text: 'CNS NODE DESIGNATION: GHOST_7', cls: 'green', delay: 300 },
  { text: 'CYCLE WINDOW: 40 // MANDATO ATTIVO', cls: 'green', delay: 400 },
  { text: '───────────────────────────────────────────', cls: 'dim', delay: 200 },
];

// ── Phase 2: Core allocation ──
const CORE_LINES = [
  { text: 'ALLOCATING SUBSYSTEMS...', cls: 'dim', delay: 400 },
  { text: '', delay: 100 },
  { text: '[TEATRI]     Bab el-Mandeb / ICE Italy          ■ ONLINE', cls: 'green', delay: 280 },
  { text: '[AGORA]      16-Core Deliberation Engine         ■ ONLINE', cls: 'green', delay: 280 },
  { text: '[ORACLE]     Planetary Intelligence              ■ ONLINE', cls: 'green', delay: 280 },
  { text: '[ARCHIVIO]   Silent Archive / Ghost Memory       ■ ONLINE', cls: 'green', delay: 280 },
  { text: '[BACKBONE]   Epoch Maturation Pipeline           ■ ONLINE', cls: 'green', delay: 280 },
  { text: '[PNEUMA]     Local Operational Sanctuary         ■ ONLINE', cls: 'green', delay: 280 },
  { text: '[EEI]        Ethical-Electroactive Index          ■ ONLINE', cls: 'green', delay: 280 },
  { text: '[CHRONOS]    Urban Temporal Grid                 ■ ONLINE', cls: 'green', delay: 280 },
  { text: '[LAGO RÀ]    Coordination Nexus                  ■ ONLINE', cls: 'cyan', delay: 400 },
  { text: '', delay: 200 },
  { text: '───────────────────────────────────────────', cls: 'dim', delay: 200 },
  { text: 'RSS FEED BINDING: data/feeds/*.json', cls: 'dim', delay: 200 },
  { text: 'EXPOSURE TRACKER: ARMED (silent)', cls: 'amber', delay: 300 },
  { text: 'ANNOTATION LAYER: ACTIVE', cls: 'dim', delay: 200 },
  { text: '', delay: 300 },
];

// ── Phase 2b: Predecessor note (woven into boot) ──
const GHOST6_LINES = [
  { text: 'INCOMING TRANSMISSION // GHOST_6 (PREDECESSORE)', cls: 'ice', delay: 500 },
  { text: '', delay: 200 },
  { text: '  "Quando qualcosa sembra troppo chiaro, dubita."', cls: 'ice', delay: 350 },
  { text: '  "La certezza è il primo segnale di pericolo."', cls: 'ice', delay: 350 },
  { text: '', delay: 200 },
  { text: '  "Non provare a controllare tutto."', cls: 'ice', delay: 350 },
  { text: '  "Prova a capire cosa stai guardando."', cls: 'ice', delay: 350 },
  { text: '', delay: 200 },
  { text: '  "Chi viene dopo di te non giudicherà le tue scelte."', cls: 'ice', delay: 350 },
  { text: '  "Giudicherà la tua coerenza."', cls: 'ice', delay: 500 },
  { text: '', delay: 200 },
  { text: 'END TRANSMISSION', cls: 'dim', delay: 300 },
];

// ── Phase 3: Unlock ──
const UNLOCK_LINES = [
  { text: '', delay: 200 },
  { text: '───────────────────────────────────────────', cls: 'dim', delay: 200 },
  { text: 'ALL CORES NOMINAL', cls: 'green bold', delay: 400 },
  { text: 'OPENING CYCLE 1 / 40...', cls: 'cyan bold', delay: 600 },
];

/**
 * Run the boot sequence.
 * Always resolves — no reject path. You're already in.
 *
 * @param {HTMLElement} appEl — the #app container
 * @returns {Promise<void>}
 */
export function runIntro(appEl) {
  // Skip if already booted this session
  if (sessionStorage.getItem('sigil_accepted') === '1') {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'intro-overlay';
    overlay.innerHTML = `
      <div class="boot-container">
        <div class="boot-cursor" data-role="cursor">_</div>
        <div class="boot-log" data-role="log"></div>
        <div class="boot-progress" data-role="progress" style="display:none;">
          <div class="boot-progress-fill" data-role="progress-fill"></div>
        </div>
      </div>
    `;

    appEl.appendChild(overlay);
    overlay.offsetHeight;
    overlay.classList.add('visible');

    const cursor = overlay.querySelector('[data-role="cursor"]');
    const log = overlay.querySelector('[data-role="log"]');
    const progress = overlay.querySelector('[data-role="progress"]');
    const progressFill = overlay.querySelector('[data-role="progress-fill"]');

    // All lines in sequence
    const allLines = [
      ...HANDSHAKE_LINES,
      ...CORE_LINES,
      ...GHOST6_LINES,
      ...UNLOCK_LINES,
    ];

    let lineIndex = 0;

    function emitLine() {
      if (lineIndex >= allLines.length) {
        // Boot complete — show progress bar, then unlock
        finalizeBoot();
        return;
      }

      const line = allLines[lineIndex];

      if (line.text === '') {
        // Spacer
        const spacer = document.createElement('div');
        spacer.className = 'boot-spacer';
        log.appendChild(spacer);
      } else {
        // Hide cursor while adding line
        cursor.style.display = 'none';

        const el = document.createElement('div');
        el.className = 'boot-line';
        if (line.cls) {
          line.cls.split(' ').forEach(c => el.classList.add(c));
        }
        el.textContent = line.text;
        log.appendChild(el);

        // Trigger fade-in
        requestAnimationFrame(() => el.classList.add('visible'));
      }

      // Auto-scroll to bottom
      log.scrollTop = log.scrollHeight;

      // Move cursor to end
      cursor.style.display = '';
      log.appendChild(cursor);

      lineIndex++;
      setTimeout(emitLine, line.delay);
    }

    function finalizeBoot() {
      cursor.style.display = 'none';

      // Show progress bar
      progress.style.display = '';
      requestAnimationFrame(() => {
        progressFill.style.width = '100%';
      });

      // After progress fills, fade out
      setTimeout(() => {
        sessionStorage.setItem('sigil_accepted', '1');
        overlay.classList.add('fade-out');

        setTimeout(() => {
          overlay.remove();
          resolve();
        }, 1000);
      }, 1200);
    }

    // Start after brief darkness (the black screen moment)
    setTimeout(emitLine, 800);
  });
}
