// ═══════════════════════════════════════════════════════════════
// ENTROPIC_PROCESS_LOCK v1.0 — Proof-of-Process Engine
// Hybrid Syndicate / Ethic Software Foundation
// ═══════════════════════════════════════════════════════════════
// "Don't anchor integrity to storage. Anchor it to the
//  irreversible temporal sequence of computation."
//
// PARADIGM: Proof-of-Process, not Proof-of-Data
//
// The problem isn't proving data hasn't been altered.
// The problem is proving the PROCESS that generated it
// was constrained and irreversible.
//
// Each cycle generates:
//   - A state hash
//   - Non-deterministic entropy (crypto.getRandomValues)
//   - Real variable delay (performance.now jitter)
//
// State(n+1) = H(State(n) + Entropy(n) + Δt(n))
//
// This creates an IRREVERSIBLE PROCESS CHAIN.
// You cannot retroactively reconstruct:
//   - True kernel entropy
//   - True real-time deltas
//   - True execution jitter
//
// Verification: coherence of trajectory, not immutability of data.
// ═══════════════════════════════════════════════════════════════

const EntropicProcessLock = (() => {

    // ══════════════════════════════════════════════
    // CONFIGURATION
    // ══════════════════════════════════════════════

    const CONFIG = {
        storageKey: 'hs_epl_chain',
        signatureKey: 'hs_epl_signatures',
        maxChainLength: 500,
        maxSignatures: 100,
        cycleIntervalMs: 5000,       // base interval between cycles
        jitterRangeMs: 2000,         // random jitter added to interval
        entropyBytes: 32,            // bytes of kernel entropy per cycle
        minDeltaMs: 1,               // minimum expected delta
        maxDriftMs: 500,             // max acceptable clock drift
        signatureWindow: 50,         // cycles included in a process signature
        version: '1.0',
    };

    // ══════════════════════════════════════════════
    // STATE
    // ══════════════════════════════════════════════

    let chain = [];                  // the entropic chain
    let running = false;
    let cycleTimer = null;
    let cycleCount = 0;
    let genesisTime = 0;
    let lastPerfTime = 0;
    let listeners = [];              // event listeners

    // ══════════════════════════════════════════════
    // CRYPTOGRAPHIC PRIMITIVES
    // ══════════════════════════════════════════════

    // Generate kernel entropy (non-deterministic)
    function generateEntropy() {
        const buffer = new Uint8Array(CONFIG.entropyBytes);
        crypto.getRandomValues(buffer);
        return Array.from(buffer).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // Measure real timing with sub-millisecond precision
    function measureDelta() {
        const now = performance.now();
        const delta = lastPerfTime > 0 ? now - lastPerfTime : 0;
        lastPerfTime = now;
        return {
            perfNow: now,
            deltaMs: delta,
            wallClock: Date.now(),
            // Execution jitter: the difference between expected and actual timing
            jitter: cycleCount > 0 ? Math.abs(delta - CONFIG.cycleIntervalMs) : 0,
        };
    }

    // SHA-256 hash via Web Crypto API
    async function hash(input) {
        const encoder = new TextEncoder();
        const data = encoder.encode(input);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // ══════════════════════════════════════════════
    // CORE: ENTROPIC CYCLE
    // ══════════════════════════════════════════════
    // State(n+1) = H(State(n) + Entropy(n) + Δt(n))

    async function executeCycle() {
        const timing = measureDelta();
        const entropy = generateEntropy();
        const previousHash = chain.length > 0 ? chain[chain.length - 1].hash : '0'.repeat(64);

        // Build the pre-image: previous state + entropy + timing
        const preImage = [
            previousHash,
            entropy,
            timing.deltaMs.toFixed(6),
            timing.perfNow.toFixed(6),
            timing.wallClock.toString(),
            timing.jitter.toFixed(6),
            cycleCount.toString(),
        ].join('|');

        // Compute the irreversible hash
        const stateHash = await hash(preImage);

        // Compute entropy quality metric (chi-squared approximation)
        const entropyQuality = assessEntropyQuality(entropy);

        // Compute timing coherence (is the delta plausible?)
        const timingCoherence = assessTimingCoherence(timing);

        // Build the chain link
        const link = {
            n: cycleCount,
            hash: stateHash,
            previousHash,
            entropy: entropy.substring(0, 16) + '...',  // truncated for storage
            entropyFull: entropy,                         // full entropy (not persisted)
            deltaMs: parseFloat(timing.deltaMs.toFixed(3)),
            perfNow: parseFloat(timing.perfNow.toFixed(3)),
            wallClock: timing.wallClock,
            jitter: parseFloat(timing.jitter.toFixed(3)),
            entropyQuality,
            timingCoherence,
            timestamp: Date.now(),
        };

        // Strip full entropy before storage
        const storageLink = { ...link };
        delete storageLink.entropyFull;

        chain.push(storageLink);
        cycleCount++;

        // Trim chain if too long
        if (chain.length > CONFIG.maxChainLength) {
            chain = chain.slice(-CONFIG.maxChainLength);
        }

        // Persist
        persistChain();

        // Notify listeners
        emit('cycle', link);

        // Check chain coherence
        const coherence = verifyChainCoherence();
        if (!coherence.valid) {
            emit('coherence-break', coherence);
        }

        return link;
    }

    // ══════════════════════════════════════════════
    // ENTROPY QUALITY ASSESSMENT
    // ══════════════════════════════════════════════

    function assessEntropyQuality(entropyHex) {
        // Simple chi-squared test on byte distribution
        const bytes = [];
        for (let i = 0; i < entropyHex.length; i += 2) {
            bytes.push(parseInt(entropyHex.substring(i, i + 2), 16));
        }

        // Count nibble frequencies (0-15)
        const freq = new Array(16).fill(0);
        for (const b of bytes) {
            freq[b >> 4]++;
            freq[b & 0x0f]++;
        }

        const total = bytes.length * 2;
        const expected = total / 16;
        let chiSq = 0;
        for (const f of freq) {
            chiSq += Math.pow(f - expected, 2) / expected;
        }

        // Chi-squared with 15 df: critical value at 0.05 = 25.0
        // Lower is better (more uniform distribution)
        const quality = Math.max(0, Math.min(100, Math.round(100 * (1 - chiSq / 50))));

        return {
            chiSquared: parseFloat(chiSq.toFixed(2)),
            quality,
            verdict: quality > 60 ? 'GOOD' : quality > 30 ? 'DEGRADED' : 'SUSPECT',
        };
    }

    // ══════════════════════════════════════════════
    // TIMING COHERENCE ASSESSMENT
    // ══════════════════════════════════════════════

    function assessTimingCoherence(timing) {
        if (cycleCount === 0) {
            return { coherent: true, score: 100, reason: 'GENESIS' };
        }

        const issues = [];
        let score = 100;

        // 1. Delta too small (instant replay?)
        if (timing.deltaMs < CONFIG.minDeltaMs) {
            issues.push('DELTA_TOO_SMALL');
            score -= 40;
        }

        // 2. Delta wildly off expected (time manipulation?)
        const expectedDelta = CONFIG.cycleIntervalMs;
        const deviation = Math.abs(timing.deltaMs - expectedDelta) / expectedDelta;
        if (deviation > 2.0) {
            issues.push('DELTA_DEVIATION_HIGH');
            score -= 30;
        }

        // 3. Wall clock vs performance.now drift
        // performance.now is monotonic; Date.now can be manipulated
        if (chain.length > 1) {
            const prev = chain[chain.length - 1];
            const wallDelta = timing.wallClock - prev.wallClock;
            const perfDelta = timing.deltaMs;
            const drift = Math.abs(wallDelta - perfDelta);
            if (drift > CONFIG.maxDriftMs) {
                issues.push('CLOCK_DRIFT');
                score -= 30;
            }
        }

        return {
            coherent: issues.length === 0,
            score: Math.max(0, score),
            issues,
            reason: issues.length === 0 ? 'NOMINAL' : issues.join(', '),
        };
    }

    // ══════════════════════════════════════════════
    // CHAIN COHERENCE VERIFICATION
    // ══════════════════════════════════════════════

    function verifyChainCoherence() {
        if (chain.length < 2) return { valid: true, checks: 0, failures: [] };

        const failures = [];
        let checks = 0;

        for (let i = 1; i < chain.length; i++) {
            checks++;

            // 1. Hash linkage: each link must reference the previous hash
            if (chain[i].previousHash !== chain[i - 1].hash) {
                failures.push({
                    type: 'HASH_BREAK',
                    at: i,
                    expected: chain[i - 1].hash.substring(0, 16),
                    got: chain[i].previousHash.substring(0, 16),
                });
            }

            // 2. Monotonic timing: perfNow must always increase
            if (chain[i].perfNow <= chain[i - 1].perfNow) {
                failures.push({
                    type: 'TIME_REVERSAL',
                    at: i,
                    prev: chain[i - 1].perfNow,
                    curr: chain[i].perfNow,
                });
            }

            // 3. Sequence monotonicity: cycle number must increment by 1
            if (chain[i].n !== chain[i - 1].n + 1) {
                failures.push({
                    type: 'SEQUENCE_GAP',
                    at: i,
                    expected: chain[i - 1].n + 1,
                    got: chain[i].n,
                });
            }

            // 4. Entropy uniqueness: no two links should share entropy
            if (chain[i].entropy === chain[i - 1].entropy) {
                failures.push({
                    type: 'ENTROPY_COLLISION',
                    at: i,
                    entropy: chain[i].entropy,
                });
            }

            // 5. Wall clock monotonicity
            if (chain[i].wallClock < chain[i - 1].wallClock) {
                failures.push({
                    type: 'WALLCLOCK_REVERSAL',
                    at: i,
                });
            }
        }

        return {
            valid: failures.length === 0,
            checks,
            failures,
            chainLength: chain.length,
            firstCycle: chain[0]?.n || 0,
            lastCycle: chain[chain.length - 1]?.n || 0,
        };
    }

    // ══════════════════════════════════════════════
    // PROCESS SIGNATURE GENERATION
    // ══════════════════════════════════════════════
    // A process signature is a compact proof that a specific
    // computational trajectory was followed. It includes:
    //   - Hash of the chain segment
    //   - Statistical fingerprint of entropy quality
    //   - Timing jitter profile
    //   - NOT the actual data (privacy preserving)

    async function generateProcessSignature() {
        if (chain.length < 3) {
            return null;
        }

        const window = chain.slice(-CONFIG.signatureWindow);

        // 1. Chain hash: hash of all hashes in window
        const chainDigest = await hash(window.map(l => l.hash).join(''));

        // 2. Entropy fingerprint: statistical profile
        const entropyScores = window.map(l => l.entropyQuality.quality);
        const entropyMean = entropyScores.reduce((a, b) => a + b, 0) / entropyScores.length;
        const entropyStdDev = Math.sqrt(
            entropyScores.reduce((sum, s) => sum + Math.pow(s - entropyMean, 2), 0) / entropyScores.length
        );

        // 3. Timing fingerprint: jitter profile
        const jitters = window.map(l => l.jitter);
        const jitterMean = jitters.reduce((a, b) => a + b, 0) / jitters.length;
        const jitterStdDev = Math.sqrt(
            jitters.reduce((sum, j) => sum + Math.pow(j - jitterMean, 2), 0) / jitters.length
        );

        // 4. Delta fingerprint: timing consistency
        const deltas = window.map(l => l.deltaMs);
        const deltaMean = deltas.reduce((a, b) => a + b, 0) / deltas.length;
        const deltaStdDev = Math.sqrt(
            deltas.reduce((sum, d) => sum + Math.pow(d - deltaMean, 2), 0) / deltas.length
        );

        // 5. Coherence score: aggregate quality
        const coherenceScores = window.map(l => l.timingCoherence.score);
        const coherenceMean = coherenceScores.reduce((a, b) => a + b, 0) / coherenceScores.length;

        // Build signature
        const signature = {
            id: 'SIG-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase(),
            chainDigest,
            windowSize: window.length,
            cycleRange: { from: window[0].n, to: window[window.length - 1].n },
            timeRange: { from: window[0].wallClock, to: window[window.length - 1].wallClock },
            entropy: {
                mean: parseFloat(entropyMean.toFixed(2)),
                stdDev: parseFloat(entropyStdDev.toFixed(2)),
                verdict: entropyMean > 60 ? 'STRONG' : entropyMean > 30 ? 'WEAK' : 'COMPROMISED',
            },
            timing: {
                jitterMean: parseFloat(jitterMean.toFixed(3)),
                jitterStdDev: parseFloat(jitterStdDev.toFixed(3)),
                deltaMean: parseFloat(deltaMean.toFixed(3)),
                deltaStdDev: parseFloat(deltaStdDev.toFixed(3)),
            },
            coherence: parseFloat(coherenceMean.toFixed(2)),
            chainCoherence: verifyChainCoherence().valid,
            generatedAt: Date.now(),
            version: CONFIG.version,
        };

        // Compute signature hash (the signature's own integrity proof)
        const sigContent = JSON.stringify({
            chainDigest: signature.chainDigest,
            cycleRange: signature.cycleRange,
            entropy: signature.entropy,
            timing: signature.timing,
            coherence: signature.coherence,
        });
        signature.signatureHash = await hash(sigContent);

        // Store
        storeSignature(signature);
        emit('signature', signature);

        return signature;
    }

    // ══════════════════════════════════════════════
    // PROCESS SIGNATURE VERIFICATION
    // ══════════════════════════════════════════════
    // Verify that a signature is consistent with a plausible
    // computational trajectory. We can't verify the exact data
    // (it's gone), but we can verify the STATISTICAL PLAUSIBILITY
    // of the claimed process.

    function verifySignature(signature) {
        const issues = [];

        // 1. Entropy quality plausible?
        if (signature.entropy.mean < 20) {
            issues.push('ENTROPY_TOO_LOW');
        }
        if (signature.entropy.stdDev > 40) {
            issues.push('ENTROPY_UNSTABLE');
        }

        // 2. Timing plausible?
        if (signature.timing.deltaMean < CONFIG.minDeltaMs) {
            issues.push('TIMING_IMPOSSIBLE');
        }
        if (signature.timing.jitterStdDev < 0.001 && signature.windowSize > 5) {
            issues.push('JITTER_SUSPICIOUSLY_UNIFORM');
        }

        // 3. Coherence check
        if (signature.coherence < 50) {
            issues.push('LOW_COHERENCE');
        }

        // 4. Chain integrity
        if (!signature.chainCoherence) {
            issues.push('CHAIN_BROKEN');
        }

        // 5. Window size plausible?
        if (signature.windowSize < 3) {
            issues.push('WINDOW_TOO_SMALL');
        }

        // 6. Time range plausible?
        const expectedDuration = signature.windowSize * CONFIG.cycleIntervalMs;
        const actualDuration = signature.timeRange.to - signature.timeRange.from;
        if (actualDuration < expectedDuration * 0.1) {
            issues.push('DURATION_COMPRESSED');
        }

        return {
            valid: issues.length === 0,
            issues,
            confidence: Math.max(0, 100 - issues.length * 20),
            verdict: issues.length === 0 ? 'AUTHENTIC' :
                     issues.length <= 2 ? 'SUSPICIOUS' : 'FORGED',
        };
    }

    // ══════════════════════════════════════════════
    // SIGNATURE CONVERGENCE (Multi-Instance)
    // ══════════════════════════════════════════════
    // When multiple browser instances run the same code on similar
    // datasets, their signatures should converge STATISTICALLY.
    // This enables consensus without a network.

    function compareSignatures(sigA, sigB) {
        // Compare statistical profiles
        const entropyDiff = Math.abs(sigA.entropy.mean - sigB.entropy.mean);
        const jitterDiff = Math.abs(sigA.timing.jitterMean - sigB.timing.jitterMean);
        const deltaDiff = Math.abs(sigA.timing.deltaMean - sigB.timing.deltaMean);
        const coherenceDiff = Math.abs(sigA.coherence - sigB.coherence);

        // Normalized similarity (0-100)
        const entropySim = Math.max(0, 100 - entropyDiff);
        const jitterSim = Math.max(0, 100 - jitterDiff * 10);
        const deltaSim = Math.max(0, 100 - deltaDiff / 100 * 100);
        const coherenceSim = Math.max(0, 100 - coherenceDiff);

        const overall = (entropySim * 0.3 + jitterSim * 0.2 + deltaSim * 0.2 + coherenceSim * 0.3);

        return {
            entropySimilarity: parseFloat(entropySim.toFixed(2)),
            jitterSimilarity: parseFloat(jitterSim.toFixed(2)),
            deltaSimilarity: parseFloat(deltaSim.toFixed(2)),
            coherenceSimilarity: parseFloat(coherenceSim.toFixed(2)),
            overall: parseFloat(overall.toFixed(2)),
            convergent: overall > 70,
            verdict: overall > 85 ? 'STRONG_CONVERGENCE' :
                     overall > 70 ? 'MODERATE_CONVERGENCE' :
                     overall > 50 ? 'WEAK_CONVERGENCE' : 'DIVERGENT',
        };
    }

    // ══════════════════════════════════════════════
    // CHAIN STATISTICS
    // ══════════════════════════════════════════════

    function getChainStats() {
        if (chain.length === 0) {
            return { empty: true, cycleCount: 0 };
        }

        const entropyScores = chain.map(l => l.entropyQuality.quality);
        const jitters = chain.map(l => l.jitter);
        const deltas = chain.map(l => l.deltaMs);
        const coherenceScores = chain.map(l => l.timingCoherence.score);

        return {
            empty: false,
            cycleCount: chain.length,
            firstCycle: chain[0].n,
            lastCycle: chain[chain.length - 1].n,
            genesisTime: chain[0].wallClock,
            lastCycleTime: chain[chain.length - 1].wallClock,
            uptime: chain[chain.length - 1].wallClock - chain[0].wallClock,
            entropy: {
                mean: parseFloat((entropyScores.reduce((a, b) => a + b, 0) / entropyScores.length).toFixed(2)),
                min: Math.min(...entropyScores),
                max: Math.max(...entropyScores),
            },
            jitter: {
                mean: parseFloat((jitters.reduce((a, b) => a + b, 0) / jitters.length).toFixed(3)),
                min: parseFloat(Math.min(...jitters).toFixed(3)),
                max: parseFloat(Math.max(...jitters).toFixed(3)),
            },
            delta: {
                mean: parseFloat((deltas.reduce((a, b) => a + b, 0) / deltas.length).toFixed(3)),
                min: parseFloat(Math.min(...deltas).toFixed(3)),
                max: parseFloat(Math.max(...deltas).toFixed(3)),
            },
            coherence: {
                mean: parseFloat((coherenceScores.reduce((a, b) => a + b, 0) / coherenceScores.length).toFixed(2)),
                min: Math.min(...coherenceScores),
            },
            chainIntegrity: verifyChainCoherence(),
        };
    }

    // ══════════════════════════════════════════════
    // PERSISTENCE
    // ══════════════════════════════════════════════

    function persistChain() {
        try {
            const data = chain.map(l => {
                const { entropyFull, ...rest } = l;
                return rest;
            });
            localStorage.setItem(CONFIG.storageKey, JSON.stringify(data));
        } catch (e) {
            // Storage full — trim harder
            chain = chain.slice(-Math.floor(CONFIG.maxChainLength / 2));
            try {
                localStorage.setItem(CONFIG.storageKey, JSON.stringify(chain));
            } catch (e2) { /* give up */ }
        }
    }

    function loadChain() {
        try {
            const raw = localStorage.getItem(CONFIG.storageKey);
            if (raw) {
                chain = JSON.parse(raw);
                if (chain.length > 0) {
                    cycleCount = chain[chain.length - 1].n + 1;
                }
            }
        } catch (e) {
            chain = [];
            cycleCount = 0;
        }
    }

    function storeSignature(signature) {
        try {
            let sigs = JSON.parse(localStorage.getItem(CONFIG.signatureKey) || '[]');
            sigs.push(signature);
            if (sigs.length > CONFIG.maxSignatures) {
                sigs = sigs.slice(-CONFIG.maxSignatures);
            }
            localStorage.setItem(CONFIG.signatureKey, JSON.stringify(sigs));
        } catch (e) { /* ignore */ }
    }

    function getSignatures() {
        try {
            return JSON.parse(localStorage.getItem(CONFIG.signatureKey) || '[]');
        } catch (e) {
            return [];
        }
    }

    // ══════════════════════════════════════════════
    // LIFECYCLE
    // ══════════════════════════════════════════════

    async function start() {
        if (running) return;
        running = true;
        genesisTime = Date.now();
        lastPerfTime = performance.now();

        loadChain();

        // Execute genesis cycle
        await executeCycle();
        emit('start', { genesisTime, chainLength: chain.length });

        // Schedule cycles with jitter
        scheduleCycle();
    }

    function scheduleCycle() {
        if (!running) return;

        // Add random jitter to prevent predictable timing
        const jitter = Math.random() * CONFIG.jitterRangeMs;
        const interval = CONFIG.cycleIntervalMs + jitter;

        cycleTimer = setTimeout(async () => {
            if (!running) return;
            await executeCycle();

            // Generate signature every signatureWindow cycles
            if (cycleCount % CONFIG.signatureWindow === 0) {
                await generateProcessSignature();
            }

            scheduleCycle();
        }, interval);
    }

    function stop() {
        running = false;
        if (cycleTimer) {
            clearTimeout(cycleTimer);
            cycleTimer = null;
        }
        emit('stop', { cycleCount, chainLength: chain.length });
    }

    // ══════════════════════════════════════════════
    // EVENT SYSTEM
    // ══════════════════════════════════════════════

    function on(event, callback) {
        listeners.push({ event, callback });
    }

    function off(event, callback) {
        listeners = listeners.filter(l => !(l.event === event && l.callback === callback));
    }

    function emit(event, data) {
        listeners.forEach(l => {
            if (l.event === event) {
                try { l.callback(data); } catch (e) { /* ignore */ }
            }
        });
    }

    // ══════════════════════════════════════════════
    // EXPORT CHAIN (for external verification)
    // ══════════════════════════════════════════════

    function exportChain() {
        return {
            chain: chain.map(l => {
                const { entropyFull, ...rest } = l;
                return rest;
            }),
            stats: getChainStats(),
            signatures: getSignatures(),
            exportedAt: Date.now(),
            version: CONFIG.version,
        };
    }

    // ══════════════════════════════════════════════
    // IMPORT & VERIFY (external chain)
    // ══════════════════════════════════════════════

    async function verifyExportedChain(exported) {
        if (!exported || !exported.chain || exported.chain.length === 0) {
            return { valid: false, reason: 'EMPTY_CHAIN' };
        }

        const failures = [];

        for (let i = 1; i < exported.chain.length; i++) {
            if (exported.chain[i].previousHash !== exported.chain[i - 1].hash) {
                failures.push({ type: 'HASH_BREAK', at: i });
            }
            if (exported.chain[i].perfNow <= exported.chain[i - 1].perfNow) {
                failures.push({ type: 'TIME_REVERSAL', at: i });
            }
            if (exported.chain[i].n !== exported.chain[i - 1].n + 1) {
                failures.push({ type: 'SEQUENCE_GAP', at: i });
            }
        }

        // Verify signatures
        const sigResults = (exported.signatures || []).map(sig => verifySignature(sig));

        return {
            valid: failures.length === 0,
            chainLength: exported.chain.length,
            failures,
            signatureResults: sigResults,
            verdict: failures.length === 0 ? 'CHAIN_INTACT' :
                     failures.length <= 2 ? 'MINOR_CORRUPTION' : 'CHAIN_COMPROMISED',
        };
    }

    // ══════════════════════════════════════════════
    // PUBLIC API
    // ══════════════════════════════════════════════

    console.log('[ENTROPIC_PROCESS_LOCK] v1.0 — Proof-of-Process Engine initialized');

    return {
        start,
        stop,
        executeCycle,
        generateProcessSignature,
        verifySignature,
        compareSignatures,
        verifyChainCoherence,
        getChainStats,
        getChain: () => [...chain],
        getSignatures,
        exportChain,
        verifyExportedChain,
        on,
        off,
        isRunning: () => running,
        getCycleCount: () => cycleCount,
        CONFIG,
    };

})();
