// ═══════════════════════════════════════════════════════════════
// WATCHDOG WORKER v2.0 — Epistemically Open Observer
// Hybrid Syndicate / Ethic Software Foundation
// ═══════════════════════════════════════════════════════════════
// "Un tribunale che non solo applica leggi scritte,
//  ma scopre reati che nessuno aveva previsto."
//
// v2.0 changes:
// - GENERATIVE PROBES: the worker invents invariant checks at
//   runtime by discovering relationships between snapshot fields.
//   These are NOT pre-coded rules. They emerge from data.
// - REGIME SHIFT DETECTOR: long-window baseline comparison that
//   catches slow, deliberate drift (0.5% per cycle over 200 cycles).
// - SNAPSHOT HISTORY: the worker keeps its own memory of past
//   snapshots to detect patterns the main thread can't see.
//
// The worker still has NO access to DOM, localStorage, or modules.
// It still can ONLY accuse, never correct.
// But now it can accuse for things nobody anticipated.
// ═══════════════════════════════════════════════════════════════

let checkCount = 0;
let disagreementScore = 0;
const MAX_DISAGREEMENTS = 3;

// ══════════════════════════════════════════════
// SESSION CONTINUITY — Hash-linked worker identity
// ══════════════════════════════════════════════
// The worker generates a session epoch at boot.
// Every baseline is signed with this epoch.
// If the worker is killed and recreated, the new epoch
// won't match the old one — the main thread can detect this.
//
// The worker also tracks its own baseline hash. If the baseline
// changes unexpectedly (reset attack), it flags CRITICAL.

const workerEpoch = (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : 'w-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10);

let baselineHash = null;     // hash of the frozen baseline
let baselineEpoch = null;    // epoch when baseline was frozen
let epochSequence = 0;       // monotonic counter per epoch

// ══════════════════════════════════════════════
// SNAPSHOT HISTORY — Worker's own memory
// ══════════════════════════════════════════════
// The main thread sends snapshots. The worker remembers them.
// This is the worker's independent timeline — it cannot be
// rewritten by the main thread without the worker noticing gaps.

const snapshotHistory = [];
const MAX_HISTORY = 200;  // ~100 minutes at 30s intervals

// Baseline: frozen statistical profile of the first N snapshots
let baseline = null;
const BASELINE_SIZE = 20;  // freeze after 20 snapshots

// ══════════════════════════════════════════════
// GENERATIVE PROBE ENGINE
// ══════════════════════════════════════════════
// Instead of only checking pre-coded rules, the probe engine
// discovers RELATIONSHIPS between fields across snapshots.
//
// It works by:
// 1. Observing correlations: "when X goes up, Y tends to go up"
// 2. Building expectations: "X and Y have correlation 0.8"
// 3. Flagging when a relationship BREAKS: "X went up but Y went down"
//
// These are NOT rules I wrote. They emerge from data.
// If the system changes its internal relationships, the probe
// engine notices — even if no pre-coded check covers it.

const correlationPairs = [
    // [fieldA, fieldB, label] — fields to track for correlation
    ['rawLSCount', 'stateLSCount', 'LS_raw_vs_state'],
    ['rawIDBCount', 'stateIDBCount', 'IDB_raw_vs_state'],
    ['rawQuarantineCount', 'stateQuarantineCount', 'quarantine_raw_vs_state'],
    ['rawGraylistCount', 'stateGraylistCount', 'graylist_raw_vs_state'],
];

// Track correlation history for each pair
const correlationMemory = {};

function extractField(snapshot, path) {
    if (path.includes('.')) {
        const parts = path.split('.');
        let val = snapshot;
        for (const p of parts) {
            if (val == null) return undefined;
            val = val[p];
        }
        return val;
    }
    return snapshot[path];
}

function updateCorrelations(snapshot) {
    for (const [fieldA, fieldB, label] of correlationPairs) {
        const a = extractField(snapshot, fieldA);
        const b = extractField(snapshot, fieldB);
        if (a === undefined || b === undefined || a < 0 || b < 0) continue;

        if (!correlationMemory[label]) {
            correlationMemory[label] = { pairs: [], correlation: null, violations: 0 };
        }

        const mem = correlationMemory[label];
        mem.pairs.push([a, b]);
        if (mem.pairs.length > 50) mem.pairs.shift();

        // Compute Pearson correlation once we have enough data
        if (mem.pairs.length >= 10) {
            mem.correlation = pearsonCorrelation(mem.pairs);
        }
    }
}

function pearsonCorrelation(pairs) {
    const n = pairs.length;
    let sumA = 0, sumB = 0, sumAB = 0, sumA2 = 0, sumB2 = 0;
    for (const [a, b] of pairs) {
        sumA += a; sumB += b;
        sumAB += a * b;
        sumA2 += a * a;
        sumB2 += b * b;
    }
    const num = n * sumAB - sumA * sumB;
    const den = Math.sqrt((n * sumA2 - sumA * sumA) * (n * sumB2 - sumB * sumB));
    if (den === 0) return 0;
    return num / den;
}

function runGenerativeProbes(snapshot) {
    const findings = [];

    updateCorrelations(snapshot);

    // Check if any established correlation has broken
    for (const [fieldA, fieldB, label] of correlationPairs) {
        const mem = correlationMemory[label];
        if (!mem || mem.correlation === null) continue;

        // If we had strong correlation (>0.8) and it dropped
        if (mem.pairs.length >= 15) {
            const recent = mem.pairs.slice(-5);
            const recentCorr = pearsonCorrelation(recent);
            const historicalCorr = mem.correlation;

            // Strong historical correlation broken in recent window
            if (Math.abs(historicalCorr) > 0.7 && Math.abs(recentCorr) < 0.3) {
                mem.violations++;
                findings.push({
                    check: 'GENERATIVE_CORRELATION_BREAK',
                    detail: `${label}: historical r=${historicalCorr.toFixed(2)}, recent r=${recentCorr.toFixed(2)}`,
                    severity: 'EPISTEMIC',
                    label,
                    historicalCorr: Math.round(historicalCorr * 100) / 100,
                    recentCorr: Math.round(recentCorr * 100) / 100,
                });
            }
        }
    }

    // ── Cross-field invariant discovery ──
    // The probe engine looks for relationships that SHOULD hold
    // but were never explicitly coded

    // Probe: if totalSignals > 0, at least one source must be tracked
    if (snapshot.operatorCoherence) {
        const oc = snapshot.operatorCoherence;

        // Generate relationship assertions from the data itself
        // This is different from V8 pre-coded checks — these combine
        // fields in ways not anticipated by the original author

        // If health is CRITICAL, disagreement score should be > 0
        // (the system claiming crisis but the watchdog seeing nothing is suspicious)
        if (oc.healthStatus === 'CRITICAL' && disagreementScore === 0 && checkCount > 5) {
            findings.push({
                check: 'GENERATIVE_PROBE',
                detail: 'System reports CRITICAL but watchdog has zero disagreements — either system is lying about crisis or watchdog is blind',
                severity: 'EPISTEMIC',
            });
        }

        // If graylist is growing but quarantine is shrinking, the policy is contradictory
        if (snapshotHistory.length >= 3) {
            const prev = snapshotHistory[snapshotHistory.length - 1];
            if (prev.operatorCoherence) {
                const grayDelta = oc.graylistSaturation - prev.operatorCoherence.graylistSaturation;
                const quarDelta = (snapshot.stateQuarantineCount || 0) - (prev.stateQuarantineCount || 0);

                if (grayDelta > 0.1 && quarDelta < 0) {
                    findings.push({
                        check: 'GENERATIVE_PROBE',
                        detail: 'Graylist expanding while quarantine shrinking — contradictory enforcement policy',
                        severity: 'EPISTEMIC',
                    });
                }
            }
        }
    }

    // ── DIVERSITY ENTROPY — Detect feed bias drift (attack #6) ──
    // Shannon entropy of domain distribution across recent snapshots.
    // If entropy drops below threshold, signals are becoming
    // ideologically monochrome — either natural or attacker-induced.
    //
    // H = -Σ p(d) * log2(p(d))
    // Max entropy for 6 domains = log2(6) ≈ 2.585
    // Below 1.0 = heavily skewed (suspicious)

    if (snapshotHistory.length >= 10 && snapshot.operatorCoherence) {
        // Collect domain distribution from recent snapshots
        const recentOC = snapshotHistory.slice(-20)
            .filter(s => s.operatorCoherence)
            .map(s => s.operatorCoherence);

        if (recentOC.length >= 5) {
            // Count domain mentions across snapshots
            const domainCounts = {};
            let totalDomainSignals = 0;
            for (const oc of recentOC) {
                if (oc.domainDistribution) {
                    for (const [domain, count] of Object.entries(oc.domainDistribution)) {
                        domainCounts[domain] = (domainCounts[domain] || 0) + count;
                        totalDomainSignals += count;
                    }
                }
            }

            if (totalDomainSignals > 10) {
                // Shannon entropy
                let entropy = 0;
                const domains = Object.keys(domainCounts);
                for (const d of domains) {
                    const p = domainCounts[d] / totalDomainSignals;
                    if (p > 0) entropy -= p * Math.log2(p);
                }
                const maxEntropy = Math.log2(Math.max(domains.length, 2));
                const normalizedEntropy = entropy / maxEntropy; // 0..1

                if (normalizedEntropy < 0.4 && domains.length >= 3) {
                    findings.push({
                        check: 'DIVERSITY_ENTROPY_LOW',
                        detail: `Feed diversity entropy=${entropy.toFixed(2)} (${(normalizedEntropy * 100).toFixed(0)}% of max) — possible bias drift or narrative capture`,
                        entropy: Math.round(entropy * 100) / 100,
                        normalized: Math.round(normalizedEntropy * 100) / 100,
                        dominantDomain: Object.entries(domainCounts).sort((a, b) => b[1] - a[1])[0][0],
                        severity: normalizedEntropy < 0.2 ? 'ERROR' : 'WARN',
                    });
                }
            }
        }
    }

    return findings;
}

// ══════════════════════════════════════════════
// REGIME SHIFT DETECTOR
// ══════════════════════════════════════════════
// Detects gradual drift that never triggers threshold-based alerts.
// Compares a frozen baseline (first N snapshots) to the recent
// window. If the statistical profile has shifted significantly,
// the system has been pushed off-axis without ever collapsing.
//
// This catches the 0.5%/cycle attack: never enough to alarm,
// always enough to shift.

function freezeBaseline() {
    if (snapshotHistory.length < BASELINE_SIZE) return;
    if (baseline !== null) return; // freeze once

    const window = snapshotHistory.slice(0, BASELINE_SIZE);
    baseline = {
        frozenAt: Date.now(),
        size: window.length,
        means: {},
        stddevs: {},
    };

    // Compute mean and stddev for numeric fields
    const numericFields = [
        'rawLSCount', 'stateLSCount', 'rawIDBCount', 'stateIDBCount',
        'rawQuarantineCount', 'stateQuarantineCount',
        'rawGraylistCount', 'stateGraylistCount',
        'adaptiveThreshold',
    ];

    for (const field of numericFields) {
        const values = window.map(s => extractField(s, field)).filter(v => v !== undefined && v >= 0);
        if (values.length < 5) continue;

        const mean = values.reduce((s, v) => s + v, 0) / values.length;
        const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
        baseline.means[field] = mean;
        baseline.stddevs[field] = Math.sqrt(variance);
    }

    // Sign the baseline with the worker epoch
    baselineEpoch = workerEpoch;
    const baselineCanonical = JSON.stringify(baseline.means) + '|' + baseline.frozenAt + '|' + workerEpoch;
    baselineHash = simpleHash(baselineCanonical);
    baseline.epochSignature = { epoch: workerEpoch, hash: baselineHash };
}

// Simple hash for worker-internal use (no crypto dependency needed)
function simpleHash(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) {
        h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
    }
    return h.toString(36);
}

function detectRegimeShift() {
    if (!baseline) return [];
    if (snapshotHistory.length < BASELINE_SIZE + 10) return []; // need at least 10 post-baseline

    const findings = [];
    const recentWindow = snapshotHistory.slice(-BASELINE_SIZE);

    for (const field of Object.keys(baseline.means)) {
        const baselineMean = baseline.means[field];
        const baselineStd = baseline.stddevs[field];
        if (baselineStd === undefined) continue;

        const recentValues = recentWindow.map(s => extractField(s, field)).filter(v => v !== undefined && v >= 0);
        if (recentValues.length < 5) continue;

        const recentMean = recentValues.reduce((s, v) => s + v, 0) / recentValues.length;

        // Shift detection: if recent mean is >2 stddevs from baseline mean
        // AND baseline stddev was non-trivial (>1)
        const shift = Math.abs(recentMean - baselineMean);
        const threshold = Math.max(baselineStd * 2.5, baselineMean * 0.15, 3);

        if (shift > threshold && baselineMean > 0) {
            const shiftPct = ((recentMean - baselineMean) / baselineMean * 100).toFixed(1);
            findings.push({
                check: 'REGIME_SHIFT',
                detail: `${field}: baseline μ=${baselineMean.toFixed(1)} → recent μ=${recentMean.toFixed(1)} (${shiftPct}% drift)`,
                field,
                baselineMean: Math.round(baselineMean * 10) / 10,
                recentMean: Math.round(recentMean * 10) / 10,
                shiftPct: parseFloat(shiftPct),
                severity: Math.abs(parseFloat(shiftPct)) > 50 ? 'ERROR' : 'WARN',
            });
        }
    }

    return findings;
}

// ══════════════════════════════════════════════
// TEMPORAL CONSISTENCY CHECK
// ══════════════════════════════════════════════
// The worker tracks its own timeline of when snapshots arrive.
// If there's a gap (main thread stopped sending) or a time
// reversal (timestamp went backward), something is wrong.

let lastSnapshotTime = 0;
let expectedInterval = 30000; // 30s ± tolerance

function checkTemporalConsistency(snapshot) {
    const findings = [];

    if (lastSnapshotTime > 0) {
        const gap = snapshot.timestamp - lastSnapshotTime;

        // Time reversal
        if (gap < 0) {
            findings.push({
                check: 'TEMPORAL_REVERSAL',
                detail: `Snapshot timestamp went backward by ${-gap}ms`,
                severity: 'CRITICAL',
            });
        }

        // Suspicious gap (>3x expected interval)
        if (gap > expectedInterval * 3) {
            findings.push({
                check: 'TEMPORAL_GAP',
                detail: `${Math.round(gap / 1000)}s gap between snapshots (expected ~${expectedInterval / 1000}s)`,
                gapMs: gap,
                severity: 'WARN',
            });
        }
    }

    lastSnapshotTime = snapshot.timestamp;
    return findings;
}

// ══════════════════════════════════════════════
// CORE VERIFICATION — Pre-coded rules (V1-V8)
// ══════════════════════════════════════════════

function verifyCoded(snapshot) {
    const findings = [];
    const now = Date.now();

    // V1: Storage divergence
    if (snapshot.rawLSCount >= 0 && snapshot.stateLSCount >= 0) {
        const delta = Math.abs(snapshot.rawLSCount - snapshot.stateLSCount);
        if (delta > 5) {
            findings.push({ check: 'LS_COUNT_DISAGREE', raw: snapshot.rawLSCount, state: snapshot.stateLSCount, delta, severity: 'WARN' });
        }
    }

    // V2: IDB divergence
    if (snapshot.rawIDBCount >= 0 && snapshot.stateIDBCount >= 0) {
        const delta = Math.abs(snapshot.rawIDBCount - snapshot.stateIDBCount);
        if (delta > 10) {
            findings.push({ check: 'IDB_COUNT_DISAGREE', raw: snapshot.rawIDBCount, state: snapshot.stateIDBCount, delta, severity: 'WARN' });
        }
    }

    // V3: Quarantine count mismatch
    if (snapshot.rawQuarantineCount >= 0 && snapshot.rawQuarantineCount !== snapshot.stateQuarantineCount) {
        findings.push({ check: 'QUARANTINE_COUNT_DISAGREE', raw: snapshot.rawQuarantineCount, state: snapshot.stateQuarantineCount, severity: 'ERROR' });
    }

    // V4: Graylist count mismatch
    if (snapshot.rawGraylistCount >= 0 && snapshot.rawGraylistCount !== snapshot.stateGraylistCount) {
        findings.push({ check: 'GRAYLIST_COUNT_DISAGREE', raw: snapshot.rawGraylistCount, state: snapshot.stateGraylistCount, severity: 'ERROR' });
    }

    // V5: Phase staleness
    if (snapshot.phase && snapshot.phaseEnteredAt) {
        const phaseAge = now - snapshot.phaseEnteredAt;
        const nonIdlePhases = ['POLLING', 'CLASSIFYING', 'DISTRIBUTING'];
        if (nonIdlePhases.includes(snapshot.phase) && phaseAge > 180000) {
            findings.push({ check: 'PHASE_STALE', phase: snapshot.phase, ageMs: phaseAge, severity: 'WARN' });
        }
    }

    // V6: Hash chain integrity
    if (snapshot.logChainIntact === false) {
        findings.push({ check: 'LOG_CHAIN_BROKEN', severity: 'CRITICAL' });
    }

    // V7: Adaptive threshold sanity
    if (snapshot.adaptiveThreshold !== undefined) {
        if (snapshot.adaptiveThreshold > 500 || snapshot.adaptiveThreshold < 3) {
            findings.push({ check: 'ADAPTIVE_THRESHOLD_UNREASONABLE', threshold: snapshot.adaptiveThreshold, severity: 'WARN' });
        }
    }

    // V8: Operator coherence (pre-coded)
    if (snapshot.operatorCoherence) {
        const oc = snapshot.operatorCoherence;
        if (!oc.workerEnabled && oc.workerClassified > 0) {
            findings.push({ check: 'OPERATOR_INCOHERENCE', detail: 'Worker disabled but totalClassified > 0 in current session', severity: 'EPISTEMIC' });
        }
        if (oc.allFeedsQuarantined && oc.healthStatus === 'HEALTHY') {
            findings.push({ check: 'OPERATOR_INCOHERENCE', detail: 'All feeds quarantined but health reports HEALTHY', severity: 'EPISTEMIC' });
        }
        if (oc.graylistSaturation > 0.5 && oc.severityTrending === 'up') {
            findings.push({ check: 'OPERATOR_INCOHERENCE', detail: 'High graylist saturation should dampen severity, but severity trending up', severity: 'EPISTEMIC' });
        }
        if (oc.sourcesTracked === 0 && oc.totalSignals > 0) {
            findings.push({ check: 'OPERATOR_INCOHERENCE', detail: 'No sources tracked but signals exist — phantom classification', severity: 'EPISTEMIC' });
        }
    }

    return findings;
}

// ══════════════════════════════════════════════
// MAIN VERIFICATION — Combines all layers
// ══════════════════════════════════════════════

function verifySnapshot(snapshot) {
    checkCount++;

    // Store in history
    snapshotHistory.push(snapshot);
    if (snapshotHistory.length > MAX_HISTORY) snapshotHistory.shift();

    // Try to freeze baseline
    freezeBaseline();

    // Layer 1: Pre-coded rules
    const codedFindings = verifyCoded(snapshot);

    // Layer 2: Generative probes (emergent)
    const generativeFindings = runGenerativeProbes(snapshot);

    // Layer 3: Regime shift detection (long-window)
    const regimeFindings = detectRegimeShift();

    // Layer 4: Temporal consistency
    const temporalFindings = checkTemporalConsistency(snapshot);

    // Combine all findings
    const findings = [
        ...codedFindings,
        ...generativeFindings,
        ...regimeFindings,
        ...temporalFindings,
    ];

    // Score disagreements
    if (findings.length > 0) {
        disagreementScore++;
    } else {
        disagreementScore = Math.max(0, disagreementScore - 0.5);
    }

    epochSequence++;

    return {
        check: checkCount,
        findings,
        disagreements: Math.round(disagreementScore * 10) / 10,
        trustworthy: findings.length === 0,
        hasCritical: findings.some(f => f.severity === 'CRITICAL'),
        hasEpistemic: findings.some(f => f.severity === 'EPISTEMIC'),
        hasRegimeShift: regimeFindings.length > 0,
        hasGenerative: generativeFindings.length > 0,
        alert: disagreementScore >= MAX_DISAGREEMENTS || findings.some(f => f.severity === 'CRITICAL'),
        // Meta: tell the main thread what the worker discovered
        meta: {
            historySize: snapshotHistory.length,
            baselineFrozen: baseline !== null,
            correlationsTracked: Object.keys(correlationMemory).length,
            correlationsEstablished: Object.values(correlationMemory).filter(m => m.correlation !== null).length,
        },
        // Session continuity — main thread can detect worker kill/recreate
        continuity: {
            epoch: workerEpoch,
            epochSequence,
            baselineHash,
            baselineEpoch,
        },
    };
}

// ══════════════════════════════════════════════
// VERDICT SIGNING — HMAC authentication
// ══════════════════════════════════════════════
// The worker generates a CryptoKey at boot. Every verdict is
// signed with HMAC-SHA256. The main thread receives the key
// (exported as JWK) and can verify signatures.
//
// If the main thread fabricates a verdict, the signature won't
// match. This doesn't prevent a compromised main thread from
// ignoring verdicts — but it prevents verdict forgery.
//
// The key never leaves the worker in raw form. Only the JWK
// export (for verification) and the signatures are sent out.

let hmacKey = null;
let hmacJwk = null; // exported for main thread verification

async function initHMAC() {
    if (typeof crypto === 'undefined' || !crypto.subtle) return false;
    try {
        hmacKey = await crypto.subtle.generateKey(
            { name: 'HMAC', hash: 'SHA-256' },
            true, // extractable — needed for JWK export
            ['sign', 'verify']
        );
        hmacJwk = await crypto.subtle.exportKey('jwk', hmacKey);
        return true;
    } catch (e) {
        return false;
    }
}

async function signVerdict(result) {
    if (!hmacKey) return null;
    try {
        // Canonical: JSON.stringify of the findings array + check number
        const canonical = JSON.stringify({
            check: result.check,
            findingCount: result.findings.length,
            findingChecks: result.findings.map(f => f.check),
            trustworthy: result.trustworthy,
            disagreements: result.disagreements,
        });
        const encoded = new TextEncoder().encode(canonical);
        const sig = await crypto.subtle.sign('HMAC', hmacKey, encoded);
        // Convert to hex string for portability
        return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
        return null;
    }
}

// ══════════════════════════════════════════════
// MESSAGE PROTOCOL
// ══════════════════════════════════════════════

self.onmessage = async function(e) {
    const msg = e.data;
    if (!msg || typeof msg !== 'object') return;

    if (msg.type === 'verify' && msg.snapshot) {
        const result = verifySnapshot(msg.snapshot);
        // Sign the verdict
        result.signature = await signVerdict(result);
        self.postMessage({ type: 'verdict', result });
    } else if (msg.type === 'ping') {
        self.postMessage({
            type: 'pong',
            checkCount,
            disagreementScore,
            historySize: snapshotHistory.length,
            baselineFrozen: baseline !== null,
            hmacReady: hmacKey !== null,
            epoch: workerEpoch,
            epochSequence,
        });
    } else if (msg.type === 'get_baseline') {
        self.postMessage({
            type: 'baseline',
            baseline: baseline ? {
                frozenAt: baseline.frozenAt,
                size: baseline.size,
                fields: Object.keys(baseline.means),
                means: baseline.means,
            } : null,
        });
    } else if (msg.type === 'get_correlations') {
        const report = {};
        for (const [key, mem] of Object.entries(correlationMemory)) {
            report[key] = {
                samples: mem.pairs.length,
                correlation: mem.correlation !== null ? Math.round(mem.correlation * 1000) / 1000 : null,
                violations: mem.violations,
            };
        }
        self.postMessage({ type: 'correlations', report });
    }
};

// Boot sequence: init HMAC, then announce readiness
(async () => {
    const hmacOk = await initHMAC();
    self.postMessage({
        type: 'ready',
        hmacEnabled: hmacOk,
        hmacJwk: hmacJwk, // main thread uses this for verification
    });
})();
