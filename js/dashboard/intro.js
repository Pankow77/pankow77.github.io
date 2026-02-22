/**
 * IntroSequence — CNS Node Assignment.
 * ═══════════════════════════════════════
 * Overlay that runs ONCE before the dashboard activates.
 * Not a Router module. Sits above the shell.
 *
 * Flow:
 *   1. Black screen → CNS designation fades in
 *   2. Mandate text types in, line by line
 *   3. Operational note from GHOST_6
 *   4. [ ACCETTA MANDATO ] / [ RIFIUTA ]
 *   5. RIFIUTA → reassignment message, app does not boot
 *   6. ACCETTA → fade out → dashboard activates at cycle 1
 *
 * Persistence: sessionStorage tracks acceptance.
 *   Refresh within same session = skip intro.
 *   New session = intro plays again.
 */

const MANDATE_LINES = [
  { text: 'Osservare. Interpretare. Decidere.', delay: 500 },
  { text: 'Ogni ciclo riceverai informazioni.', delay: 400 },
  { text: 'Alcune saranno vere.', delay: 600 },
  { text: '', delay: 500 },
  { text: 'La stabilità non equivale alla verità.', delay: 700 },
  { text: 'La verità senza stabilità produce collasso.', delay: 900 },
  { text: '', delay: 500 },
  { text: 'Chi ti ha preceduto ha completato il turno.', delay: 500 },
  { text: 'Chi verrà dopo erediterà il tuo archivio.', delay: 600 },
  { text: '', delay: 400 },
  { text: 'Durata incarico: 40 cicli.', delay: 800 }
];

const GHOST6_NOTE = [
  'Quando qualcosa sembra troppo chiaro, dubita.',
  'La certezza è il primo segnale di pericolo.',
  '',
  'Non provare a controllare tutto.',
  'Prova a capire cosa stai guardando.',
  '',
  'Chi viene dopo di te non giudicherà le tue scelte.',
  'Giudicherà la tua coerenza.'
];

/**
 * Run the intro sequence.
 * Resolves when player accepts mandate.
 * Rejects if player refuses (app will not boot).
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
    const overlay = document.createElement('div');
    overlay.className = 'intro-overlay';
    overlay.innerHTML = `
      <div class="intro-container">
        <div class="intro-header">
          <div class="intro-org">CONSORTIUM FOR NARRATIVE STABILITY</div>
          <div class="intro-designation">
            <span class="intro-label">NODE:</span> GHOST_7
          </div>
          <div class="intro-designation">
            <span class="intro-label">CYCLE WINDOW:</span> 40
          </div>
        </div>

        <div class="intro-section" data-role="mandate">
          <div class="intro-section-title">MANDATO</div>
          <div class="intro-body" data-role="body"></div>
        </div>

        <div class="intro-section" data-role="ghost6-section" style="display:none;">
          <div class="intro-section-title">NOTA DAL PREDECESSORE</div>
          <div class="intro-ghost6-body" data-role="ghost6-body"></div>
        </div>

        <div class="intro-prompt" data-role="prompt" style="display:none;">
          <div class="intro-prompt-text">Accetti il mandato?</div>
          <div class="intro-actions">
            <button class="intro-btn intro-btn-accept" data-action="accept">ACCETTA MANDATO</button>
            <button class="intro-btn intro-btn-refuse" data-action="refuse">RIFIUTA</button>
          </div>
        </div>

        <div class="intro-farewell" data-role="farewell" style="display:none;">
          <div class="intro-farewell-text">
            Nodo assegnato a operatore alternativo.<br>
            Sessione terminata.
          </div>
        </div>
      </div>
    `;

    appEl.appendChild(overlay);

    // Force reflow, then fade in
    overlay.offsetHeight;
    overlay.classList.add('visible');

    const body = overlay.querySelector('[data-role="body"]');
    const ghost6Section = overlay.querySelector('[data-role="ghost6-section"]');
    const ghost6Body = overlay.querySelector('[data-role="ghost6-body"]');
    const prompt = overlay.querySelector('[data-role="prompt"]');
    const farewell = overlay.querySelector('[data-role="farewell"]');
    const mandateSection = overlay.querySelector('[data-role="mandate"]');

    // ── Phase 1: Type mandate lines ──
    let lineIndex = 0;

    function typeLine() {
      if (lineIndex >= MANDATE_LINES.length) {
        // Phase 2: GHOST_6 note
        setTimeout(showGhost6Note, 600);
        return;
      }

      const line = MANDATE_LINES[lineIndex];
      const el = document.createElement('div');
      el.className = 'intro-line';

      if (line.text === '') {
        el.classList.add('intro-spacer');
      } else {
        el.textContent = line.text;
      }

      body.appendChild(el);
      requestAnimationFrame(() => el.classList.add('visible'));

      lineIndex++;
      setTimeout(typeLine, line.delay);
    }

    // Start after header fade-in
    setTimeout(typeLine, 1400);

    // ── Phase 2: GHOST_6 note ──
    function showGhost6Note() {
      ghost6Section.style.display = '';
      ghost6Section.classList.add('visible');

      let noteIndex = 0;

      function typeNote() {
        if (noteIndex >= GHOST6_NOTE.length) {
          // Phase 3: prompt
          setTimeout(showPrompt, 800);
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

      setTimeout(typeNote, 400);
    }

    // ── Phase 3: Prompt ──
    function showPrompt() {
      prompt.style.display = '';
      requestAnimationFrame(() => prompt.classList.add('visible'));
    }

    // ── Button handlers ──
    overlay.addEventListener('click', (e) => {
      const action = e.target.dataset.action;
      if (!action) return;

      if (action === 'refuse') {
        handleRefuse();
      } else if (action === 'accept') {
        handleAccept();
      }
    });

    function handleRefuse() {
      prompt.style.display = 'none';
      mandateSection.style.display = 'none';
      ghost6Section.style.display = 'none';
      farewell.style.display = '';
      farewell.classList.add('visible');

      setTimeout(() => {
        overlay.classList.remove('visible');
        setTimeout(() => {
          overlay.remove();
          reject(new Error('Operator refused mandate'));
        }, 800);
      }, 3500);
    }

    function handleAccept() {
      sessionStorage.setItem('sigil_accepted', '1');

      overlay.classList.add('fade-out');
      setTimeout(() => {
        overlay.remove();
        resolve();
      }, 1000);
    }
  });
}
