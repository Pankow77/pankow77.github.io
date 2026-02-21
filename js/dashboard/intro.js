/**
 * IntroSequence — Succession Protocol boot screen.
 * ═══════════════════════════════════════════════════
 * Overlay that runs ONCE before the dashboard activates.
 * Not a Router module. Sits above the shell.
 *
 * Flow:
 *   1. Black screen → ARCHIVIO SILENTE title fades in
 *   2. Protocol text types in, line by line
 *   3. Player sees [ ACCETTA TURNO ] / [ RIFIUTA ]
 *   4. RIFIUTA → farewell message, closes
 *   5. ACCETTA → GHOST_6 note types in → fade out → dashboard activates
 *
 * Persistence: sessionStorage tracks acceptance.
 *   Refresh within same session = skip intro.
 *   New session = intro plays again.
 */

const GHOST6_NOTE = [
  'Non fidarti delle fonti con confidence >0.95.',
  'Sono sempre parziali.',
  '',
  'Scrivi ai tuoi successori non come se fossi un eroe.',
  'Scrivi come se fossi un testimone.',
  '',
  'E ricorda: GHOST_8 ti giudicherà.',
  'Non per le tue scelte.',
  'Ma per la tua onestà.'
];

const PROTOCOL_LINES = [
  { text: 'Sei GHOST_7.', delay: 600 },
  { text: '', delay: 300 },
  { text: 'Il tuo predecessore, GHOST_6, ha completato il suo turno.', delay: 500 },
  { text: 'Ora tocca a te.', delay: 800 },
  { text: '', delay: 400 },
  { text: 'Il tuo compito: monitorare 4 teatri geopolitici.', delay: 400 },
  { text: 'Riceverai envelope da fonti multiple.', delay: 300 },
  { text: 'Dovrai decidere quali narrative amplificare.', delay: 300 },
  { text: 'Le tue scelte avranno conseguenze.', delay: 600 },
  { text: '', delay: 300 },
  { text: 'Ogni turno, scriverai un\'annotazione privata.', delay: 400 },
  { text: 'Alla fine del tuo turno, GHOST_8 erediterà il tuo lavoro.', delay: 500 },
  { text: 'E leggerà tutte le tue annotazioni.', delay: 800 }
];

/**
 * Run the intro sequence.
 * Returns a Promise that resolves when the player accepts,
 * or rejects if the player refuses.
 *
 * @param {HTMLElement} appEl — the #app container
 * @returns {Promise<void>}
 */
export function runIntro(appEl) {
  // Skip if already accepted this session
  if (sessionStorage.getItem('sigil_accepted') === '1') {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    // ── Create overlay ──
    const overlay = document.createElement('div');
    overlay.className = 'intro-overlay';
    overlay.innerHTML = `
      <div class="intro-container">
        <div class="intro-header">
          <div class="intro-title">ARCHIVIO SILENTE</div>
          <div class="intro-subtitle">HYBRID SYNDICATE NETWORK</div>
          <div class="intro-protocol">PROTOCOLLO DI SUCCESSIONE</div>
        </div>

        <div class="intro-body" data-role="body"></div>

        <div class="intro-actions" data-role="actions" style="display:none;">
          <button class="intro-btn intro-btn-accept" data-action="accept">ACCETTA TURNO</button>
          <button class="intro-btn intro-btn-refuse" data-action="refuse">RIFIUTA</button>
        </div>

        <div class="intro-ghost6" data-role="ghost6" style="display:none;">
          <div class="intro-ghost6-header">GHOST_6 ha lasciato una nota per te:</div>
          <div class="intro-ghost6-body" data-role="ghost6-body"></div>
          <div class="intro-ghost6-start" data-role="start" style="display:none;">
            <button class="intro-btn intro-btn-accept" data-action="start">AVVIA TURNO 1</button>
          </div>
        </div>

        <div class="intro-farewell" data-role="farewell" style="display:none;">
          <div class="intro-farewell-text">
            Comprendiamo.<br><br>
            Non tutti sono pronti per questo lavoro.<br><br>
            GHOST_8 prenderà il tuo posto.
          </div>
        </div>
      </div>
    `;

    appEl.appendChild(overlay);

    // Force reflow, then fade in
    overlay.offsetHeight;
    overlay.classList.add('visible');

    const body = overlay.querySelector('[data-role="body"]');
    const actions = overlay.querySelector('[data-role="actions"]');
    const ghost6 = overlay.querySelector('[data-role="ghost6"]');
    const ghost6Body = overlay.querySelector('[data-role="ghost6-body"]');
    const startBtn = overlay.querySelector('[data-role="start"]');
    const farewell = overlay.querySelector('[data-role="farewell"]');

    // ── Type protocol lines ──
    let lineIndex = 0;

    function typeLine() {
      if (lineIndex >= PROTOCOL_LINES.length) {
        // Show action buttons
        actions.style.display = '';
        actions.classList.add('visible');
        return;
      }

      const line = PROTOCOL_LINES[lineIndex];
      const el = document.createElement('div');
      el.className = 'intro-line';

      if (line.text === '') {
        el.classList.add('intro-spacer');
      } else {
        el.textContent = line.text;
      }

      body.appendChild(el);

      // Trigger fade-in
      requestAnimationFrame(() => el.classList.add('visible'));

      lineIndex++;
      setTimeout(typeLine, line.delay);
    }

    // Start typing after header fade-in
    setTimeout(typeLine, 1200);

    // ── Button handlers ──
    overlay.addEventListener('click', (e) => {
      const action = e.target.dataset.action;
      if (!action) return;

      if (action === 'refuse') {
        handleRefuse();
      } else if (action === 'accept') {
        handleAccept();
      } else if (action === 'start') {
        handleStart();
      }
    });

    function handleRefuse() {
      actions.style.display = 'none';
      body.style.display = 'none';
      farewell.style.display = '';
      farewell.classList.add('visible');

      // Close after reading
      setTimeout(() => {
        overlay.classList.remove('visible');
        setTimeout(() => {
          overlay.remove();
          reject(new Error('Player refused'));
        }, 800);
      }, 4000);
    }

    function handleAccept() {
      actions.style.display = 'none';
      body.style.display = 'none';
      ghost6.style.display = '';
      ghost6.classList.add('visible');

      // Type GHOST_6 note
      let noteIndex = 0;

      function typeNote() {
        if (noteIndex >= GHOST6_NOTE.length) {
          startBtn.style.display = '';
          startBtn.classList.add('visible');
          return;
        }

        const line = GHOST6_NOTE[noteIndex];
        const el = document.createElement('div');
        el.className = 'intro-ghost6-line';

        if (line === '') {
          el.classList.add('intro-spacer');
        } else {
          el.textContent = line;
        }

        ghost6Body.appendChild(el);
        requestAnimationFrame(() => el.classList.add('visible'));

        noteIndex++;
        setTimeout(typeNote, 400);
      }

      setTimeout(typeNote, 600);
    }

    function handleStart() {
      sessionStorage.setItem('sigil_accepted', '1');

      overlay.classList.add('fade-out');
      setTimeout(() => {
        overlay.remove();
        resolve();
      }, 1000);
    }
  });
}
