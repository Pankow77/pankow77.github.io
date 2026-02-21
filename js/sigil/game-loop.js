/**
 * game-loop.js — SIGIL Core Turn Engine
 * ═══════════════════════════════════════════════════════════
 * The heartbeat. One turn at a time.
 *
 * Turn structure:
 *   1. Classify rhythm (calm/turbulent/opaque/inertial)
 *   2. Load scenario
 *   3. Show envelopes (intelligence briefing)
 *   4. Present decision
 *   5. CINEMATIC CHOICE: freeze → stamp → propagation → world → numbers
 *   6. Show feedback
 *   7. Show inherited annotation (from previous GHOST)
 *   8. Prompt player annotation
 *   9. Check delayed consequences
 *  10. Check PROTOCOLLO trigger
 *  11. Save state
 *  12. Next turn
 *
 * Browser-native ES Module. Zero dependencies.
 * ═══════════════════════════════════════════════════════════
 */

export class GameLoop {
    constructor({ bus, state, ui, consequenceEngine, annotationTracker, successionProtocol, scenarioLoader, causalGraph, telemetry, vfx, audio, rhythm, fatigue }) {
        this.bus = bus;
        this.state = state;
        this.ui = ui;
        this.consequences = consequenceEngine;
        this.tracker = annotationTracker;
        this.succession = successionProtocol;
        this.loader = scenarioLoader;
        this.graph = causalGraph || null;
        this.telemetry = telemetry || null;
        this.vfx = vfx || null;
        this.audio = audio || null;
        this.rhythm = rhythm || null;
        this.fatigue = fatigue || null;

        this.sequence = [];
        this.sequenceIndex = 0;
        this.running = false;
    }

    /**
     * Initialize the game loop with a scenario sequence.
     */
    async init(sequence) {
        this.sequence = sequence || this.loader.getMVPSequence();
        this.sequenceIndex = 0;

        // Initialize succession protocol (load inherited annotations)
        await this.succession.init();

        // Try to resume from saved state
        const resumed = await this.state.load();
        if (resumed && this.state.turn_current > 0) {
            // Find where we left off
            const lastTurn = this.state.turn_current;
            const idx = this.sequence.findIndex(s => s.turn === lastTurn + 1);
            if (idx >= 0) {
                this.sequenceIndex = idx;
            } else {
                // Completed all turns — show end screen
                this.sequenceIndex = this.sequence.length;
            }

            // Restore scar state into CausalGraph
            if (this.graph && this.state.event_log.length > 0) {
                const lastEvent = this.state.event_log[this.state.event_log.length - 1];
                if (lastEvent.scars) {
                    this.graph.importScars(lastEvent.scars);
                }
            }
        }
    }

    /**
     * Start the game loop.
     */
    async run() {
        this.running = true;

        this.bus.emit('sigil:game-started', {
            ghost_id: this.state.run_id,
            total_scenarios: this.sequence.length
        }, 'game-loop');

        // Opening sequence (only on fresh start)
        if (this.state.turn_current === 0) {
            await this._showOpening();
        }

        // Main loop
        while (this.running && this.sequenceIndex < this.sequence.length) {
            const entry = this.sequence[this.sequenceIndex];

            if (entry.isProtocol) {
                // PROTOCOLLO_PADC activation
                await this._runProtocol();
            } else {
                // Standard turn
                await this._runTurn(entry);
            }

            this.sequenceIndex++;
        }

        // Game complete
        if (this.running) {
            await this._showEnding();
        }
    }

    /**
     * Stop the game loop.
     */
    stop() {
        this.running = false;
    }

    // ═══════════════════════════════════════
    // OPENING
    // ═══════════════════════════════════════

    async _showOpening() {
        await this.ui.typeLines([
            '═══════════════════════════════════════',
            'SIGIL',
            '═══════════════════════════════════════',
            '',
            `Operatore: ${this.state.run_id}`,
            'Livello di accesso: STANDARD',
            '',
        ], { speed: 30, cssClass: 'system-text', pauseBetween: 300 });

        // Show inherited annotations count if any
        if (this.state.inherited_annotations.length > 0) {
            const prevGhost = this.state.inherited_annotations[0].ghost_id;
            await this.ui.typewriter(
                `Archivio ereditato: ${this.state.inherited_annotations.length} annotazioni da ${prevGhost}`,
                { speed: 25, cssClass: 'system-text inherited-notice' }
            );
            await this.ui._delay(1500);
        }

        await this.ui.typeLines([
            'Inizializzazione terminale...',
            'Connessione ai feed attiva.',
            '',
            'Buona fortuna.',
        ], { speed: 25, cssClass: 'system-text', pauseBetween: 500 });

        await this.ui._delay(2000);
        this.ui.clear();
    }

    // ═══════════════════════════════════════
    // STANDARD TURN
    // ═══════════════════════════════════════

    async _runTurn(entry) {
        const scenario = await this.loader.load(entry.id);
        if (!scenario) {
            console.error(`[LOOP] Scenario not found: ${entry.id}`);
            return;
        }

        // Advance turn
        this.state.turn_current = entry.turn;
        if (entry.act) this.state.act_current = entry.act;
        this.ui.setTurn(entry.turn);

        // ── RHYTHM: classify this turn ──
        let rhythmData = null;
        if (this.rhythm) {
            const pendingDelayed = this.consequences.delayedQueue.length;
            const scars = this.graph ? this.graph.getScars() : {};
            rhythmData = this.rhythm.classify(this.state, pendingDelayed, scars);

            // Get fatigue-aware intensity for VFX gating
            const turnIntensity = this.fatigue ? this.fatigue.cognitiveLoad : 0;

            // Apply rhythm to VFX and audio (pass intensity for hue gating)
            if (this.vfx) this.vfx.setRhythm(rhythmData.type, turnIntensity);
            if (this.audio) this.audio.setRhythm(rhythmData.type);

            // Update rhythm indicator in header
            const indicator = document.getElementById('rhythm-indicator');
            if (indicator) indicator.textContent = this.rhythm.getLabel();
        }

        this.bus.emit('sigil:turn-started', {
            turn: entry.turn,
            scenario_id: entry.id,
            act: entry.act,
            rhythm: rhythmData?.type || 'calm'
        }, 'game-loop');

        // Separator between turns
        if (entry.turn > 1) {
            this.ui.addSeparator();
            await this.ui._delay(800);
        }

        // Resolve scenario (filter by state conditions)
        const resolved = this.loader.resolve(scenario, this.state);

        // ── THEATER: set audio timbral signature ──
        const theater = resolved.theater || null;
        if (theater && this.audio) {
            this.audio.setTheater(theater);
        }

        // Step 1: Process delayed consequences from previous turns
        const delayedFeedbacks = this.consequences.processDue(entry.turn);
        if (delayedFeedbacks.length > 0) {
            await this.ui.showDelayedFeedback(delayedFeedbacks);
        }

        // Step 2: Show briefing text
        if (resolved.briefing) {
            await this.ui.typeLines(
                Array.isArray(resolved.briefing) ? resolved.briefing : [resolved.briefing],
                { speed: rhythmData?.params?.typewriterSpeed || 20, cssClass: 'briefing-text', pauseBetween: 400 }
            );
        }

        // Step 3: Show envelopes
        if (resolved.envelopes && resolved.envelopes.length > 0) {
            await this.ui.showEnvelopes(resolved.envelopes);
        }

        // Step 4: Decision
        const decision = await this.ui.showDecision(resolved.decision);
        const optionId = decision.option_id;

        // Record decision
        this.state.decisions.push({
            turn: entry.turn,
            scenario_id: entry.id,
            option_id: optionId,
            timestamp: Date.now()
        });

        // ════════════════════════════════════
        // CINEMATIC CHOICE SEQUENCE
        // Emotion first. Numbers second.
        // ════════════════════════════════════

        // ── FATIGUE: compute dampening before cinematic ──
        if (this.fatigue) {
            const compositeDamp = this.fatigue.getCompositeDampening(optionId, theater);
            if (this.vfx) this.vfx.setDampening(compositeDamp);
            if (this.audio) this.audio.setDampening(compositeDamp);
        }

        // Step 5a: Apply immediate consequences (silent — no display yet)
        this.consequences.apply(resolved, optionId);

        // Step 5b: Propagate causal graph (silent — calculate but don't show)
        const option = resolved.decision?.options?.find(o => o.id === optionId);
        const frameAction = option?.frame_action || null;
        let causalArcs = [];
        let causalResult = null;

        if (this.graph) {
            causalResult = this.graph.propagate(optionId, frameAction, this.state);
            causalArcs = causalResult.arcs;
        }

        // Step 5c: PRE-ECHO CLICK — subcortical anticipation before the freeze
        if (this.audio) {
            this.audio.preEchoClick();
        }

        // Step 5d: SUB-BASS HIT — context-sensitive, theater-tinted, never the same twice
        if (this.audio) {
            this.audio.subBassHit(this.state, theater);
        }

        // Step 5e: CINEMATIC SEQUENCE — freeze → stamp → propagation wave
        if (this.vfx) {
            await this.vfx.cinematicChoice(optionId, causalArcs);
        }

        // Step 5f: NOW apply state changes (numbers arrive AFTER perception)
        if (this.graph && causalResult) {
            this.graph.apply(this.state, causalResult);

            // Emit scar events (VFX listens to these)
            if (causalResult.scars_formed.length > 0) {
                this.bus.emit('sigil:scars-formed', {
                    turn: entry.turn,
                    scars: causalResult.scars_formed
                }, 'game-loop');

                // Audio: add permanent scar tones
                if (this.audio) {
                    for (const scar of causalResult.scars_formed) {
                        this.audio.addScarTone(scar);
                    }
                }

                // Audio: crisis sound
                if (this.audio) {
                    this.audio.crisisSound();
                }
            }

            if (causalResult.collapse_active) {
                this.bus.emit('sigil:credibility-collapse', {
                    turn: entry.turn,
                    credibility: this.state.metrics.scientific_credibility
                }, 'game-loop');
            }
        }

        // Step 5g: POST-CONSEQUENCE COMPRESSION — the world contracts
        if (this.audio) {
            this.audio.postConsequenceCompress();
        }

        // Step 5h: UPDATE METRIC HUD — numbers arrive after world reacted
        if (this.vfx) {
            this.vfx.updateMetrics(this.state);
            this.vfx.updateScars(this.graph ? this.graph.getScars() : null);
        }

        // Step 5i: Update audio soundscape for new state
        if (this.audio) {
            this.audio.update(this.state);
        }

        // Step 5j: FATIGUE — record this turn's intensity, trigger afterimage
        if (this.fatigue) {
            this.fatigue.recordTurn({
                arcCount: causalArcs.length,
                scarsFormed: causalResult?.scars_formed?.length || 0,
                collapseActive: causalResult?.collapse_active || false,
                crisisTriggered: (causalResult?.scars_formed?.length || 0) > 0,
                rhythm: rhythmData?.type || 'calm',
                actionId: optionId,
                theater: theater
            });

            // Afterimage silence — the void after intensity
            const afterimageDuration = this.fatigue.getAfterImageDuration();
            if (afterimageDuration > 0 && this.audio) {
                this.audio.afterimageSilence(afterimageDuration);
                // Hold the visual space too — brief pause before numbers
                await this.ui._delay(afterimageDuration);
            }
        }

        // Step 5k: Log event (append-only)
        this.state.logEvent({
            turn: entry.turn,
            theater: resolved.theater || null,
            action_id: optionId,
            frame_action: frameAction,
            causal_arcs: causalArcs,
            scars: this.graph ? this.graph.exportScars() : {},
            rhythm: rhythmData?.type || 'calm',
            timestamp: Date.now()
        });

        // Step 5l: Telemetry snapshot
        if (this.telemetry) {
            this.telemetry.snapshot(
                entry.turn, this.state, causalArcs, optionId, frameAction,
                this.graph ? this.graph.getScars() : null
            );
        }

        // Step 6: Show feedback
        const feedback = this.consequences.getLastFeedback();
        await this.ui.showFeedback(feedback);

        // Step 7: Schedule delayed consequences
        this.consequences.schedule(resolved, optionId);

        // Step 8: Show inherited annotation (AFTER decision, not before)
        const inherited = await this.succession.getInheritedForTurn(entry.turn);
        if (inherited) {
            await this.ui.showInherited(inherited);
        }

        // Step 9: Prompt annotation
        const isPostRevelation = entry.postRevelation || this.state.flags.post_revelation_mode;
        const annotationPrompt = resolved.annotation_prompt || null;

        const annotationText = await this.ui.promptAnnotation(annotationPrompt, {
            optional: false,
            postRevelation: isPostRevelation
        });

        if (annotationText) {
            const annotation = this.tracker.finalize(
                annotationText,
                entry.turn,
                entry.id,
                isPostRevelation
            );
            this.state.annotations.push(annotation);
            this.tracker.updateSentimentAvg(this.state);

            this.bus.emit('sigil:annotation-written', {
                turn: entry.turn,
                length: annotationText.length,
                sentiment: annotation.sentiment,
                drafts: annotation.revision_count,
                post_revelation: isPostRevelation
            }, 'game-loop');
        }

        // Step 10: Apply decision fatigue
        this.state.applyMetric('decision_fatigue',
            '+' + Math.max(1, Math.floor(this.state.turn_current / 3))
        );

        // Step 11: Save state
        await this.state.save();

        this.bus.emit('sigil:turn-completed', {
            turn: entry.turn,
            scenario_id: entry.id,
            option_id: optionId,
            rhythm: rhythmData?.type || 'calm'
        }, 'game-loop');
    }

    // ═══════════════════════════════════════
    // PROTOCOLLO
    // ═══════════════════════════════════════

    async _runProtocol() {
        this.bus.emit('sigil:protocol-starting', {
            turn: this.state.turn_current,
            annotation_count: this.state.annotations.length
        }, 'game-loop');

        const choice = await this.succession.execute();

        if (choice === 'PASS') {
            // Player chose to exit — seal annotations and end
            await this.succession.sealAnnotations();
            await this.ui.protocolClose();

            this.ui.clear();
            await this.ui.typeLines([
                '',
                'Hai scelto di uscire.',
                '',
                'Le tue annotazioni sono sigillate.',
                'Il prossimo operatore le erediterà.',
                '',
                `${this.state.run_id} — disconnesso.`,
            ], { speed: 30, cssClass: 'system-text', pauseBetween: 600 });

            this.running = false;
            await this.state.save();
            return;
        }

        // Player continues — awareness changes everything
        this.state.flags.post_revelation_mode = true;
        await this.state.save();

        // Brief transition
        this.ui.clear();
        await this.ui.typeLines([
            '',
            'Hai scelto di continuare.',
            '',
            'D\'ora in poi, ogni parola che scrivi ha un destinatario.',
            '',
        ], { speed: 30, cssClass: 'system-text', pauseBetween: 600 });

        await this.ui._delay(2000);
        this.ui.clear();
    }

    // ═══════════════════════════════════════
    // ENDING
    // ═══════════════════════════════════════

    async _showEnding() {
        // Seal annotations for next GHOST
        await this.succession.sealAnnotations();

        // Show end screen
        await this.ui.showEndScreen(this.state);

        this.bus.emit('sigil:game-completed', {
            ghost_id: this.state.run_id,
            turns: this.state.turn_current,
            annotations: this.state.annotations.length,
            post_revelation: this.state.flags.post_revelation_mode
        }, 'game-loop');
    }
}
