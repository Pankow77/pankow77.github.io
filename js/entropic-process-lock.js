// ═══════════════════════════════════════════════════════════
// ENTROPIC PROCESS LOCK v1.0
// Proof-of-Process Integrity System
// Hybrid Syndicate / Ethic Software Foundation
//
// State(n+1) = H(State(n) + Entropy(n) + Δt(n))
//
// Not Proof-of-Data. Proof-of-Process.
// Truth = coherence of trajectory, not immutability of data.
// ═══════════════════════════════════════════════════════════

const EntropicProcessLock = (() => {
    'use strict';

    // ── CONFIGURATION ──
    const CONFIG = {
        CHAIN_STORAGE_KEY: 'epl_chain',
        SIGNATURE_STORAGE_KEY: 'epl_signature',
        META_STORAGE_KEY: 'epl_meta',
        CYCLE_INTERVAL_MS: 3000,
        MAX_CHAIN_LENGTH: 512,
        JITTER_SAMPLES: 5,
        VERSION: '1.0.0'
    };

    // ── STATE ──
    let chain = [];
    let running = false;
    let cycleTimer = null;
    let genesisTimestamp = null;
    let lastCycleTime = null;

    // ── CRYPTO HELPERS ──

    /**
     * Generate cryptographic entropy from kernel source.
     * Returns hex string of 32 random bytes.
     */
    function generateEntropy() {
        const buffer = new Uint8Array(32);
        crypto.getRandomValues(buffer);
        return arrayToHex(buffer);
    }

    /**
     * Measure real timing jitter by sampling performance.now() deltas.
     * Returns an object with measured deltas and aggregate jitter value.
     */
    function measureJitter(samples) {
        const deltas = [];
        for (let i = 0; i < samples; i++) {
            const t0 = performance.now();
            // Minimal work to create measurable timing variation
            let v = 0;
            for (let j = 0; j < 100; j++) v += Math.random();
            const t1 = performance.now();
            deltas.push(t1 - t0);
        }
        // Combine deltas into a single jitter fingerprint
        const jitterValue = deltas.reduce((a, b) => a + b, 0);
        return { deltas, jitterValue };
    }

    /**
     * Hash an input string using SHA-256 via Web Crypto API.
     * Returns hex-encoded hash string.
     */
    async function sha256(input) {
        const encoder = new TextEncoder();
        const data = encoder.encode(input);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        return arrayToHex(new Uint8Array(hashBuffer));
    }

    /**
     * Convert a Uint8Array to a hex string.
     */
    function arrayToHex(arr) {
        return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // ── CHAIN OPERATIONS ──

    /**
     * Compute the next link in the entropic chain.
     * State(n+1) = H(State(n) + Entropy(n) + Δt(n))
     */
    async function computeNextLink(previousHash, entropy, deltaTime, jitter) {
        const input = [
            previousHash,
            entropy,
            deltaTime.toFixed(6),
            jitter.toFixed(6)
        ].join('|');
        return await sha256(input);
    }

    /**
     * Create the genesis (first) link of the chain.
     */
    async function createGenesisLink() {
        const now = performance.now();
        const entropy = generateEntropy();
        const jitterData = measureJitter(CONFIG.JITTER_SAMPLES);
        const timestamp = Date.now();

        genesisTimestamp = timestamp;
        lastCycleTime = now;

        // Genesis hash: H(entropy + timestamp + jitter)
        const genesisInput = [
            'GENESIS',
            entropy,
            timestamp.toString(),
            jitterData.jitterValue.toFixed(6),
            CONFIG.VERSION
        ].join('|');
        const hash = await sha256(genesisInput);

        return {
            index: 0,
            hash,
            entropy,
            deltaTime: 0,
            jitter: jitterData.jitterValue,
            timestamp,
            perfTime: now
        };
    }

    /**
     * Advance the chain by one cycle.
     * This is the core entropic process step.
     */
    async function advanceCycle() {
        const now = performance.now();
        const timestamp = Date.now();
        const entropy = generateEntropy();
        const jitterData = measureJitter(CONFIG.JITTER_SAMPLES);

        const previousLink = chain[chain.length - 1];
        const deltaTime = now - lastCycleTime;
        lastCycleTime = now;

        const hash = await computeNextLink(
            previousLink.hash,
            entropy,
            deltaTime,
            jitterData.jitterValue
        );

        const link = {
            index: previousLink.index + 1,
            hash,
            previousHash: previousLink.hash,
            entropy,
            deltaTime,
            jitter: jitterData.jitterValue,
            timestamp,
            perfTime: now
        };

        chain.push(link);

        // Trim chain to max length (keep genesis + most recent links)
        if (chain.length > CONFIG.MAX_CHAIN_LENGTH) {
            const genesis = chain[0];
            chain = [genesis].concat(chain.slice(-(CONFIG.MAX_CHAIN_LENGTH - 1)));
        }

        persistChain();
        return link;
    }

    // ── INTEGRITY VERIFICATION ──

    /**
     * Verify the integrity of the entire chain.
     * Checks that each link's hash is consistent with its predecessor.
     * Returns { valid, brokenAt, totalLinks }.
     */
    async function verifyChain() {
        if (chain.length === 0) {
            return { valid: false, brokenAt: -1, totalLinks: 0, reason: 'empty_chain' };
        }

        // Verify genesis
        const genesis = chain[0];
        const genesisInput = [
            'GENESIS',
            genesis.entropy,
            genesis.timestamp.toString(),
            genesis.jitter.toFixed(6),
            CONFIG.VERSION
        ].join('|');
        const expectedGenesisHash = await sha256(genesisInput);

        if (genesis.hash !== expectedGenesisHash) {
            return { valid: false, brokenAt: 0, totalLinks: chain.length, reason: 'genesis_tampered' };
        }

        // Verify each subsequent link
        for (let i = 1; i < chain.length; i++) {
            const link = chain[i];
            const prev = chain[i - 1];

            // Check previousHash reference
            if (link.previousHash !== prev.hash) {
                return { valid: false, brokenAt: i, totalLinks: chain.length, reason: 'hash_reference_broken' };
            }

            // Recompute and verify hash
            const expectedHash = await computeNextLink(
                link.previousHash,
                link.entropy,
                link.deltaTime,
                link.jitter
            );

            if (link.hash !== expectedHash) {
                return { valid: false, brokenAt: i, totalLinks: chain.length, reason: 'hash_mismatch' };
            }

            // Verify temporal monotonicity
            if (link.timestamp < prev.timestamp) {
                return { valid: false, brokenAt: i, totalLinks: chain.length, reason: 'temporal_anomaly' };
            }
        }

        return { valid: true, brokenAt: -1, totalLinks: chain.length, reason: null };
    }

    // ── PROCESS SIGNATURE ──

    /**
     * Generate a Process Signature — a compact, exportable fingerprint
     * of the entire computational trajectory.
     *
     * The signature encodes:
     * - Genesis hash (origin identity)
     * - Latest hash (current state)
     * - Chain length (depth of process)
     * - Cumulative jitter profile (hardware fingerprint)
     * - Temporal span (duration of process)
     */
    async function generateProcessSignature() {
        if (chain.length === 0) return null;

        const genesis = chain[0];
        const latest = chain[chain.length - 1];

        // Cumulative jitter: sum of all jitter values
        const cumulativeJitter = chain.reduce((sum, link) => sum + link.jitter, 0);

        // Temporal span
        const temporalSpan = latest.timestamp - genesis.timestamp;

        // Build signature input
        const signatureInput = [
            genesis.hash,
            latest.hash,
            chain.length.toString(),
            cumulativeJitter.toFixed(6),
            temporalSpan.toString(),
            CONFIG.VERSION
        ].join('|');

        const signatureHash = await sha256(signatureInput);

        const signature = {
            signatureHash,
            genesisHash: genesis.hash,
            latestHash: latest.hash,
            chainLength: chain.length,
            cumulativeJitter,
            temporalSpan,
            generatedAt: Date.now(),
            version: CONFIG.VERSION
        };

        // Persist signature
        try {
            localStorage.setItem(CONFIG.SIGNATURE_STORAGE_KEY, JSON.stringify(signature));
        } catch (_) { /* storage may be unavailable */ }

        return signature;
    }

    // ── PERSISTENCE ──

    /**
     * Persist chain to localStorage.
     * Only stores essential fields to minimize storage.
     */
    function persistChain() {
        try {
            const compact = chain.map(link => ({
                i: link.index,
                h: link.hash,
                p: link.previousHash || null,
                e: link.entropy,
                d: link.deltaTime,
                j: link.jitter,
                t: link.timestamp
            }));
            localStorage.setItem(CONFIG.CHAIN_STORAGE_KEY, JSON.stringify(compact));
            localStorage.setItem(CONFIG.META_STORAGE_KEY, JSON.stringify({
                genesisTimestamp,
                chainLength: chain.length,
                lastUpdate: Date.now(),
                version: CONFIG.VERSION
            }));
        } catch (_) { /* storage may be unavailable */ }
    }

    /**
     * Attempt to restore chain from localStorage.
     * Returns true if chain was restored and verified.
     */
    async function restoreChain() {
        try {
            const stored = localStorage.getItem(CONFIG.CHAIN_STORAGE_KEY);
            if (!stored) return false;

            const compact = JSON.parse(stored);
            if (!Array.isArray(compact) || compact.length === 0) return false;

            chain = compact.map(c => ({
                index: c.i,
                hash: c.h,
                previousHash: c.p,
                entropy: c.e,
                deltaTime: c.d,
                jitter: c.j,
                timestamp: c.t,
                perfTime: 0 // Cannot restore performance.now() values
            }));

            genesisTimestamp = chain[0].timestamp;
            lastCycleTime = performance.now();

            // Verify restored chain
            const result = await verifyChain();
            if (!result.valid) {
                notifyCoreFeed('SENTINEL', 'ALLERTA: Catena entropica compromessa al link #' + result.brokenAt + '. Motivo: ' + result.reason + '. Reset necessario.');
                chain = [];
                return false;
            }

            return true;
        } catch (_) {
            chain = [];
            return false;
        }
    }

    // ── CORE FEED INTEGRATION ──

    /**
     * Send a message to CoreFeed if available.
     */
    function notifyCoreFeed(coreId, message) {
        if (typeof CoreFeed !== 'undefined' && CoreFeed.addMessage) {
            CoreFeed.addMessage(coreId, message);
        }
    }

    // ── LIFECYCLE ──

    /**
     * Initialize the Entropic Process Lock.
     * Attempts to restore existing chain or creates a new genesis.
     */
    async function start() {
        if (running) return;

        const restored = await restoreChain();

        if (restored) {
            notifyCoreFeed('GHOST_RUNNER', 'EPL: Catena entropica ripristinata. ' + chain.length + ' link verificati.');
        } else {
            const genesis = await createGenesisLink();
            chain = [genesis];
            persistChain();
            notifyCoreFeed('GHOST_RUNNER', 'EPL: Genesi entropica creata. Proof-of-Process attivo.');
        }

        running = true;

        // Start periodic cycle advancement
        cycleTimer = setInterval(async () => {
            try {
                const link = await advanceCycle();
                // Periodic integrity check every 10 cycles
                if (link.index % 10 === 0) {
                    const result = await verifyChain();
                    if (!result.valid) {
                        notifyCoreFeed('SENTINEL', 'VIOLAZIONE: Coerenza processuale rotta al link #' + result.brokenAt + '. Traiettoria computazionale alterata.');
                    } else {
                        notifyCoreFeed('ETHIC_COMPILER', 'EPL: Verifica integrità superata. ' + result.totalLinks + ' link coerenti. Traiettoria temporale intatta.');
                    }
                }
            } catch (_) { /* cycle error, will retry */ }
        }, CONFIG.CYCLE_INTERVAL_MS);

        return { restored, chainLength: chain.length };
    }

    /**
     * Stop the entropic process cycle.
     */
    function stop() {
        if (cycleTimer) {
            clearInterval(cycleTimer);
            cycleTimer = null;
        }
        running = false;
    }

    /**
     * Get the current chain status without exposing internals.
     */
    function getStatus() {
        if (chain.length === 0) {
            return { active: false, chainLength: 0 };
        }
        const genesis = chain[0];
        const latest = chain[chain.length - 1];
        return {
            active: running,
            chainLength: chain.length,
            genesisHash: genesis.hash,
            latestHash: latest.hash,
            temporalSpan: latest.timestamp - genesis.timestamp,
            genesisTimestamp: genesis.timestamp
        };
    }

    /**
     * Run self-test: creates a temporary chain, verifies it,
     * then tampers with it and confirms detection.
     * Returns { passed, details }.
     */
    async function selfTest() {
        const results = [];

        // Test 1: Genesis creation
        const entropy = generateEntropy();
        const jitterData = measureJitter(CONFIG.JITTER_SAMPLES);
        results.push({
            test: 'entropy_generation',
            passed: typeof entropy === 'string' && entropy.length === 64,
            detail: 'Entropy: ' + entropy.substring(0, 16) + '...'
        });
        results.push({
            test: 'jitter_measurement',
            passed: jitterData.jitterValue > 0 && jitterData.deltas.length === CONFIG.JITTER_SAMPLES,
            detail: 'Jitter: ' + jitterData.jitterValue.toFixed(6)
        });

        // Test 2: Hash computation
        const hash = await sha256('test_input');
        results.push({
            test: 'sha256_computation',
            passed: typeof hash === 'string' && hash.length === 64,
            detail: 'Hash: ' + hash.substring(0, 16) + '...'
        });

        // Test 3: Chain building (3 links)
        const testChain = [];
        const genesisInput = ['GENESIS', entropy, Date.now().toString(), jitterData.jitterValue.toFixed(6), CONFIG.VERSION].join('|');
        const genesisHash = await sha256(genesisInput);
        testChain.push({ index: 0, hash: genesisHash, entropy, deltaTime: 0, jitter: jitterData.jitterValue, timestamp: Date.now() });

        for (let i = 1; i <= 2; i++) {
            const e = generateEntropy();
            const j = measureJitter(CONFIG.JITTER_SAMPLES);
            const prev = testChain[testChain.length - 1];
            const h = await computeNextLink(prev.hash, e, 10.5 * i, j.jitterValue);
            testChain.push({
                index: i,
                hash: h,
                previousHash: prev.hash,
                entropy: e,
                deltaTime: 10.5 * i,
                jitter: j.jitterValue,
                timestamp: Date.now()
            });
        }

        // Verify test chain
        const savedChain = chain;
        chain = testChain;
        const verifyResult = await verifyChain();
        results.push({
            test: 'chain_integrity_valid',
            passed: verifyResult.valid,
            detail: 'Valid chain of ' + verifyResult.totalLinks + ' links'
        });

        // Test 4: Tamper detection — modify a link's entropy
        const tamperedChain = JSON.parse(JSON.stringify(testChain));
        tamperedChain[1].entropy = generateEntropy(); // tamper
        chain = tamperedChain;
        const tamperResult = await verifyChain();
        results.push({
            test: 'tamper_detection',
            passed: !tamperResult.valid && tamperResult.brokenAt === 1,
            detail: 'Tamper detected at link #' + tamperResult.brokenAt + ' (' + tamperResult.reason + ')'
        });

        // Test 5: Temporal anomaly detection
        const timeChain = JSON.parse(JSON.stringify(testChain));
        timeChain[2].timestamp = testChain[0].timestamp - 1000; // time travel
        // Recompute hash so only temporal check catches it
        timeChain[2].hash = await computeNextLink(timeChain[2].previousHash, timeChain[2].entropy, timeChain[2].deltaTime, timeChain[2].jitter);
        chain = timeChain;
        const timeResult = await verifyChain();
        results.push({
            test: 'temporal_anomaly_detection',
            passed: !timeResult.valid && timeResult.reason === 'temporal_anomaly',
            detail: 'Temporal anomaly caught (' + timeResult.reason + ')'
        });

        // Test 6: Process Signature generation
        chain = testChain;
        const sig = await generateProcessSignature();
        results.push({
            test: 'process_signature',
            passed: sig !== null && typeof sig.signatureHash === 'string' && sig.signatureHash.length === 64,
            detail: 'Signature: ' + (sig ? sig.signatureHash.substring(0, 16) + '...' : 'null')
        });

        // Restore original chain
        chain = savedChain;

        const allPassed = results.every(r => r.passed);
        return { passed: allPassed, results };
    }

    // ── AUTO-INIT ──
    function init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => start());
        } else {
            start();
        }
    }

    init();

    // ── PUBLIC API ──
    return {
        start,
        stop,
        getStatus,
        verifyChain,
        generateProcessSignature,
        selfTest,
        VERSION: CONFIG.VERSION
    };

})();
