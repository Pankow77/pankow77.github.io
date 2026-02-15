// ═══════════════════════════════════════════════════════════════
// WATCHDOG WORKER — Isolated Observer (Web Worker)
// Hybrid Syndicate / Ethic Software Foundation
// ═══════════════════════════════════════════════════════════════
// "L'osservatore che denuncia non è governo. È costituzione."
//
// This runs in an ISOLATED Web Worker context.
// It has NO access to:
//   - SystemState (cannot read or mutate)
//   - DOM (cannot render)
//   - Any module's internal state
//
// It CAN access:
//   - Its own logic
//   - Data sent to it via postMessage from the main thread
//
// It can ONLY:
//   - Receive state snapshots
//   - Run independent verification with its OWN logic
//   - Send findings back (accusations)
//   - NEVER correct, NEVER mutate, NEVER govern
// ═══════════════════════════════════════════════════════════════

let checkCount = 0;
let disagreementScore = 0;
const MAX_DISAGREEMENTS = 3;

// ══════════════════════════════════════════════
// INDEPENDENT VERIFICATION LOGIC
// ══════════════════════════════════════════════
// This logic is SEPARATE from SystemState.checkHealth().
// It reaches different conclusions using different algorithms.

function verifySnapshot(snapshot) {
    checkCount++;
    const findings = [];
    const now = Date.now();

    // ── V1: Storage divergence — independent calculation ──
    if (snapshot.rawLSCount >= 0 && snapshot.stateLSCount >= 0) {
        const delta = Math.abs(snapshot.rawLSCount - snapshot.stateLSCount);
        if (delta > 5) {
            findings.push({
                check: 'LS_COUNT_DISAGREE',
                raw: snapshot.rawLSCount,
                state: snapshot.stateLSCount,
                delta,
                severity: 'WARN',
            });
        }
    }

    // ── V2: IDB divergence ──
    if (snapshot.rawIDBCount >= 0 && snapshot.stateIDBCount >= 0) {
        const delta = Math.abs(snapshot.rawIDBCount - snapshot.stateIDBCount);
        if (delta > 10) {
            findings.push({
                check: 'IDB_COUNT_DISAGREE',
                raw: snapshot.rawIDBCount,
                state: snapshot.stateIDBCount,
                delta,
                severity: 'WARN',
            });
        }
    }

    // ── V3: Quarantine count mismatch ──
    if (snapshot.rawQuarantineCount >= 0 && snapshot.rawQuarantineCount !== snapshot.stateQuarantineCount) {
        findings.push({
            check: 'QUARANTINE_COUNT_DISAGREE',
            raw: snapshot.rawQuarantineCount,
            state: snapshot.stateQuarantineCount,
            severity: 'ERROR',
        });
    }

    // ── V4: Graylist count mismatch ──
    if (snapshot.rawGraylistCount >= 0 && snapshot.rawGraylistCount !== snapshot.stateGraylistCount) {
        findings.push({
            check: 'GRAYLIST_COUNT_DISAGREE',
            raw: snapshot.rawGraylistCount,
            state: snapshot.stateGraylistCount,
            severity: 'ERROR',
        });
    }

    // ── V5: Phase staleness — independent age calculation ──
    if (snapshot.phase && snapshot.phaseEnteredAt) {
        const phaseAge = now - snapshot.phaseEnteredAt;
        const nonIdlePhases = ['POLLING', 'CLASSIFYING', 'DISTRIBUTING'];
        if (nonIdlePhases.includes(snapshot.phase) && phaseAge > 180000) {
            findings.push({
                check: 'PHASE_STALE',
                phase: snapshot.phase,
                ageMs: phaseAge,
                severity: 'WARN',
            });
        }
    }

    // ── V6: Hash chain integrity ──
    if (snapshot.logChainIntact === false) {
        findings.push({
            check: 'LOG_CHAIN_BROKEN',
            severity: 'CRITICAL',
        });
    }

    // ── V7: Adaptive threshold sanity ──
    if (snapshot.adaptiveThreshold !== undefined) {
        if (snapshot.adaptiveThreshold > 500 || snapshot.adaptiveThreshold < 3) {
            findings.push({
                check: 'ADAPTIVE_THRESHOLD_UNREASONABLE',
                threshold: snapshot.adaptiveThreshold,
                severity: 'WARN',
            });
        }
    }

    // ── V8: Operator coherence check ──
    // Detect contradictory system state that suggests incoherent configuration
    if (snapshot.operatorCoherence) {
        const oc = snapshot.operatorCoherence;

        // Contradiction: worker disabled but system reports worker classified signals
        if (!oc.workerEnabled && oc.workerClassified > 0) {
            findings.push({
                check: 'OPERATOR_INCOHERENCE',
                detail: 'Worker disabled but totalClassified > 0 in current session',
                severity: 'EPISTEMIC',
            });
        }

        // Contradiction: all feeds quarantined but system not DEGRADED
        if (oc.allFeedsQuarantined && oc.healthStatus === 'HEALTHY') {
            findings.push({
                check: 'OPERATOR_INCOHERENCE',
                detail: 'All feeds quarantined but health reports HEALTHY',
                severity: 'EPISTEMIC',
            });
        }

        // Contradiction: high graylist saturation but severity trending up
        if (oc.graylistSaturation > 0.5 && oc.severityTrending === 'up') {
            findings.push({
                check: 'OPERATOR_INCOHERENCE',
                detail: 'High graylist saturation should dampen severity, but severity trending up',
                severity: 'EPISTEMIC',
            });
        }

        // Contradiction: zero sources tracked but signals being produced
        if (oc.sourcesTracked === 0 && oc.totalSignals > 0) {
            findings.push({
                check: 'OPERATOR_INCOHERENCE',
                detail: 'No sources tracked but signals exist — phantom classification',
                severity: 'EPISTEMIC',
            });
        }
    }

    // ── Score disagreements ──
    if (findings.length > 0) {
        disagreementScore++;
    } else {
        disagreementScore = Math.max(0, disagreementScore - 0.5);
    }

    return {
        check: checkCount,
        findings,
        disagreements: Math.round(disagreementScore * 10) / 10,
        trustworthy: findings.length === 0,
        hasCritical: findings.some(f => f.severity === 'CRITICAL'),
        hasEpistemic: findings.some(f => f.severity === 'EPISTEMIC'),
        alert: disagreementScore >= MAX_DISAGREEMENTS || findings.some(f => f.severity === 'CRITICAL'),
    };
}

// ══════════════════════════════════════════════
// MESSAGE PROTOCOL
// ══════════════════════════════════════════════
// IN:  { type: 'verify', snapshot: {...} }
// OUT: { type: 'verdict', result: {...} }

self.onmessage = function(e) {
    const msg = e.data;
    if (!msg || typeof msg !== 'object') return;

    if (msg.type === 'verify' && msg.snapshot) {
        const result = verifySnapshot(msg.snapshot);
        self.postMessage({ type: 'verdict', result });
    } else if (msg.type === 'ping') {
        self.postMessage({ type: 'pong', checkCount, disagreementScore });
    }
};

// Announce readiness
self.postMessage({ type: 'ready' });
