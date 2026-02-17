// ====================================================================
// ORACLE SIMULATOR v4.1 — Synthetic Earth (Red Team Response)
// Monte Carlo + Lyapunov Proxy + Emergent Tipping + Adaptive Coupling
// Runs as Web Worker: zero UI blocking, pure computation
// ====================================================================
// Fixes applied:
// 1. Tipping: smooth sigmoid, no hard threshold. Bifurcation EMERGES.
// 2. Coupling: quadratic response. No discrete activation.
// 3. DSI: Sarle + Lyapunov proxy (trajectory divergence with seeded RNG)
// 4. Coupling matrix: configurable from real-field covariance.
// 5. State: vectorial (6 domains). Always.
// ====================================================================

'use strict';

const DOMAINS = ['geopolitics', 'economics', 'technology', 'climate', 'social', 'epistemology'];

// Default coupling matrix (used when no adaptive coupling is provided)
const DEFAULT_COUPLING = {
    geopolitics: { economics: 0.55, technology: 0.20, climate: 0.10, social: 0.50, epistemology: 0.35 },
    economics:   { geopolitics: 0.40, technology: 0.30, climate: 0.15, social: 0.65, epistemology: 0.20 },
    technology:  { geopolitics: 0.30, economics: 0.45, climate: 0.10, social: 0.40, epistemology: 0.55 },
    climate:     { geopolitics: 0.45, economics: 0.55, technology: 0.10, social: 0.50, epistemology: 0.25 },
    social:      { geopolitics: 0.35, economics: 0.30, technology: 0.10, climate: 0.05, epistemology: 0.45 },
    epistemology:{ geopolitics: 0.40, economics: 0.25, technology: 0.30, climate: 0.30, social: 0.50 }
};

// Dynamic parameters
const PARAMS = {
    ALPHA: 0.08,              // Mean-reversion strength
    BETA: 0.25,               // Max coupling amplification at saturation
    SIGMOID_STEEPNESS: 8.0,   // How sharp the smooth transition is
    SIGMOID_CENTER: 0.5,      // Center of the sigmoid (not a hard cutoff)
    EQUILIBRIUM: 0.3,         // Resting instability level
    ACTIVATION_FLOOR: 0.25,   // Below this, coupling contribution is near zero
    NOISE_BASE: 0.015,
    DT: 1.0,
    CRITICAL_STABILITY: 0.35,
    LYAPUNOV_PAIRS: 50,       // Number of paired simulations for Lyapunov
    LYAPUNOV_EPSILON: 0.002,  // Initial perturbation for Lyapunov pairs
    LYAPUNOV_STEPS: 36        // Steps for Lyapunov measurement (half of full sim)
};


// ============================================================
// MATH UTILITIES
// ============================================================

// Smooth sigmoid: continuous transition, no hard threshold
function sigmoid(x) {
    return 1.0 / (1.0 + Math.exp(-x));
}

// Gaussian random (Box-Muller, unseeded — for Monte Carlo)
function gaussianRandom() {
    let u1 = Math.random();
    while (u1 === 0) u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// Seeded PRNG (Mulberry32) — for Lyapunov paired simulations
function createRNG(seed) {
    let s = seed | 0;
    return function() {
        s = (s + 0x6D2B79F5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// Seeded Gaussian (uses seeded uniform PRNG)
function seededGaussian(rng) {
    let u1 = rng();
    while (u1 === 0) u1 = rng();
    const u2 = rng();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}


// ============================================================
// STATE EVOLUTION — Emergent Tipping
// ============================================================
// The bifurcation is NOT imposed by an if/else.
// It EMERGES from:
//   1. Smooth sigmoid amplification of coupling (continuous)
//   2. Quadratic coupling response (nonlinear exceedance)
// When system load is low → coupling is weak → restoration wins.
// When system load is high → coupling amplifies quadratically →
//   positive feedback dominates → bifurcation.
// The transition is smooth. The precipice is real.
// ============================================================

function evolveState(state, coupling, perturbation, noiseScale, rng) {
    const newState = {};
    const domainValues = DOMAINS.map(d => state[d] || 0);
    const systemLoad = domainValues.reduce((s, v) => s + v, 0) / DOMAINS.length;

    // Smooth coupling amplification via sigmoid
    // At systemLoad = 0.3 → multiplier ≈ 1.0 (no amplification)
    // At systemLoad = 0.5 → multiplier ≈ 1.0 + β*0.5 (moderate)
    // At systemLoad = 0.7 → multiplier ≈ 1.0 + β*0.95 (strong)
    // No hard cutoff. The transition is continuous.
    const loadArg = PARAMS.SIGMOID_STEEPNESS * (systemLoad - PARAMS.SIGMOID_CENTER);
    const couplingMultiplier = 1.0 + PARAMS.BETA * sigmoid(loadArg);

    for (const domain of DOMAINS) {
        const x = state[domain] || 0;

        // 1. Mean-reversion (restoring force)
        const restoration = -PARAMS.ALPHA * (x - PARAMS.EQUILIBRIUM);

        // 2. Cross-domain coupling: QUADRATIC response
        //    No hard activation threshold. Coupling strength grows as
        //    the square of the source domain's exceedance above floor.
        //    This creates emergent nonlinearity: small perturbations
        //    couple weakly, large perturbations couple strongly.
        let couplingForce = 0;
        for (const other of DOMAINS) {
            if (other !== domain && coupling[other]) {
                const coeff = coupling[other][domain] || 0;
                const otherVal = state[other] || 0;
                const exceedance = Math.max(0, otherVal - PARAMS.ACTIVATION_FLOOR);
                const range = 1.0 - PARAMS.ACTIVATION_FLOOR;
                // Quadratic: coupling grows with square of normalized exceedance
                const normalizedExceedance = exceedance / range;
                couplingForce += coeff * normalizedExceedance * normalizedExceedance * couplingMultiplier;
            }
        }

        // 3. External perturbation
        const externalPert = (perturbation && perturbation[domain]) || 0;

        // 4. Stochastic noise (seeded or unseeded)
        const noise = noiseScale * (rng ? seededGaussian(rng) : gaussianRandom());

        // 5. Integrate
        let newVal = x + (restoration + couplingForce + externalPert + noise) * PARAMS.DT;
        newState[domain] = Math.max(0, Math.min(1, newVal));
    }

    return newState;
}

function calculateStability(state) {
    const vals = DOMAINS.map(d => state[d] || 0);
    const meanInstability = vals.reduce((s, v) => s + v, 0) / vals.length;
    return Math.max(0, Math.min(1, 1 - meanInstability));
}

// Euclidean distance between two state vectors
function stateDistance(s1, s2) {
    let sum = 0;
    for (const d of DOMAINS) {
        sum += ((s1[d] || 0) - (s2[d] || 0)) ** 2;
    }
    return Math.sqrt(sum);
}


// ============================================================
// MONTE CARLO SIMULATION
// ============================================================

function runMonteCarlo(currentState, config) {
    const {
        nSims = 1000,
        steps = 72,
        noiseScale = PARAMS.NOISE_BASE,
        perturbation = null,
        sustainedPerturbation = null,
        coupling = DEFAULT_COUPLING
    } = config;

    const trajectories = [];
    const finalStabilities = [];

    for (let sim = 0; sim < nSims; sim++) {
        let state = {};
        for (const d of DOMAINS) {
            state[d] = (currentState[d] || 0.3);
            if (perturbation && perturbation[d]) {
                state[d] = Math.max(0, Math.min(1, state[d] + perturbation[d]));
            }
        }

        const trajectory = [calculateStability(state)];

        for (let t = 0; t < steps; t++) {
            state = evolveState(state, coupling, sustainedPerturbation, noiseScale, null);
            trajectory.push(calculateStability(state));
        }

        trajectories.push(trajectory);
        finalStabilities.push(trajectory[trajectory.length - 1]);
    }

    return { trajectories, finalStabilities };
}


// ============================================================
// LYAPUNOV PROXY — Trajectory Divergence
// ============================================================
// Measures sensitivity to initial conditions:
// - Run PAIRS of simulations with same seeded noise
// - Initial states differ by epsilon
// - Measure divergence rate over time
// - Positive Lyapunov → trajectories diverge → instability
// - Negative Lyapunov → trajectories converge → stability
// - Near zero → marginal → near bifurcation
//
// This is a SECOND independent indicator of instability,
// complementing Sarle's bimodality coefficient.
// ============================================================

function computeLyapunovProxy(currentState, coupling, noiseScale) {
    const nPairs = PARAMS.LYAPUNOV_PAIRS;
    const steps = PARAMS.LYAPUNOV_STEPS;
    const epsilon = PARAMS.LYAPUNOV_EPSILON;

    let totalLambda = 0;
    let validPairs = 0;

    for (let pair = 0; pair < nPairs; pair++) {
        const seed = 1000000 + pair * 7919; // Deterministic seeds

        // State 1: unperturbed
        const rng1 = createRNG(seed);
        let state1 = {};
        for (const d of DOMAINS) {
            state1[d] = currentState[d] || 0.3;
        }

        // State 2: perturbed by epsilon in random direction
        const rng2 = createRNG(seed); // SAME seed → same noise sequence
        let state2 = {};
        const pertRng = createRNG(seed + 13);
        for (const d of DOMAINS) {
            state2[d] = state1[d] + epsilon * (pertRng() - 0.5) * 2;
            state2[d] = Math.max(0, Math.min(1, state2[d]));
        }

        const initialDist = stateDistance(state1, state2);
        if (initialDist < 1e-10) continue;

        // Evolve both with IDENTICAL noise (same seeded RNG)
        for (let t = 0; t < steps; t++) {
            state1 = evolveState(state1, coupling, null, noiseScale, rng1);
            state2 = evolveState(state2, coupling, null, noiseScale, rng2);
        }

        const finalDist = stateDistance(state1, state2);
        if (finalDist < 1e-10) {
            // Trajectories converged perfectly → strong negative Lyapunov
            totalLambda += -2.0;
        } else {
            // Lyapunov exponent proxy: log(final_dist / initial_dist) / time
            totalLambda += Math.log(finalDist / initialDist) / steps;
        }
        validPairs++;
    }

    if (validPairs === 0) return { lambda: 0, regime: 'unknown' };

    const lambda = totalLambda / validPairs;

    // Classify regime
    let regime;
    if (lambda > 0.05) regime = 'chaotic';         // Trajectories diverge rapidly
    else if (lambda > 0.01) regime = 'sensitive';   // Near bifurcation
    else if (lambda > -0.01) regime = 'marginal';   // On the edge
    else regime = 'stable';                         // Trajectories converge

    return {
        lambda: Math.round(lambda * 10000) / 10000,
        regime
    };
}


// ============================================================
// DSI CALCULATION — Enhanced with Lyapunov
// ============================================================

function calculateDSI(finalStabilities, lyapunov) {
    const n = finalStabilities.length;
    if (n === 0) return { dsi: 1.0, catastrophicFraction: 0, bimodality: 0, lyapunov: { lambda: 0, regime: 'unknown' } };

    // 1. Catastrophic fraction
    const catastrophic = finalStabilities.filter(s => s < PARAMS.CRITICAL_STABILITY).length;
    const catastrophicFraction = catastrophic / n;

    // 2. Sarle's bimodality coefficient
    const mean = finalStabilities.reduce((s, v) => s + v, 0) / n;
    const m2 = finalStabilities.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
    const m3 = finalStabilities.reduce((s, v) => s + (v - mean) ** 3, 0) / n;
    const m4 = finalStabilities.reduce((s, v) => s + (v - mean) ** 4, 0) / n;

    const skewness = m2 > 0 ? m3 / (m2 ** 1.5) : 0;
    const kurtosis = m2 > 0 ? m4 / (m2 ** 2) : 0;
    const bimodality = kurtosis > 0 ? (skewness ** 2 + 1) / kurtosis : 0;

    // 3. Lyapunov component: convert lambda to [0, 1] instability score
    // lambda < 0 → stable → score near 0
    // lambda ≈ 0 → marginal → score ≈ 0.5
    // lambda > 0 → chaotic → score near 1
    const lyapunovScore = sigmoid(lyapunov.lambda * 20); // Map to [0, 1]

    // 4. DSI composite: THREE independent indicators
    // - Catastrophic fraction (Monte Carlo)
    // - Bimodality (distributional shape)
    // - Lyapunov (dynamical sensitivity)
    const dsi = Math.max(0, Math.min(1,
        (1 - catastrophicFraction) * 0.40 +
        Math.max(0, 1 - bimodality * 1.5) * 0.25 +
        (1 - lyapunovScore) * 0.35
    ));

    return {
        dsi: Math.round(dsi * 1000) / 1000,
        catastrophicFraction: Math.round(catastrophicFraction * 1000) / 1000,
        bimodality: Math.round(bimodality * 1000) / 1000,
        lyapunov,
        mean: Math.round(mean * 1000) / 1000,
        std: Math.round(Math.sqrt(m2) * 1000) / 1000
    };
}


// ============================================================
// TRAJECTORY STATISTICS
// ============================================================

function computeTrajectoryStats(trajectories) {
    if (trajectories.length === 0) return null;
    const steps = trajectories[0].length;
    const stats = [];

    for (let t = 0; t < steps; t++) {
        const values = trajectories.map(traj => traj[t]).sort((a, b) => a - b);
        const n = values.length;
        stats.push({
            t,
            mean: values.reduce((s, v) => s + v, 0) / n,
            median: values[Math.floor(n / 2)],
            p10: values[Math.floor(n * 0.1)],
            p25: values[Math.floor(n * 0.25)],
            p75: values[Math.floor(n * 0.75)],
            p90: values[Math.floor(n * 0.9)],
            min: values[0],
            max: values[n - 1]
        });
    }
    return stats;
}

function sampleTrajectories(trajectories, count) {
    if (trajectories.length <= count) return trajectories;
    const step = Math.floor(trajectories.length / count);
    const samples = [];
    for (let i = 0; i < count; i++) {
        samples.push(trajectories[i * step]);
    }
    return samples;
}


// ============================================================
// WEB WORKER MESSAGE HANDLER
// ============================================================

self.onmessage = function(event) {
    const { type, payload } = event.data;

    if (type === 'simulate') {
        const { currentState, config } = payload;
        const coupling = config.coupling || DEFAULT_COUPLING;

        // 1. Run Monte Carlo simulation
        const { trajectories, finalStabilities } = runMonteCarlo(currentState, { ...config, coupling });

        // 2. Compute Lyapunov proxy (independent from Monte Carlo)
        const lyapunov = computeLyapunovProxy(currentState, coupling, config.noiseScale || PARAMS.NOISE_BASE);

        // 3. Calculate DSI (enhanced with Lyapunov)
        const dsi = calculateDSI(finalStabilities, lyapunov);

        // 4. Trajectory statistics for cloud rendering
        const stats = computeTrajectoryStats(trajectories);
        const samples = sampleTrajectories(trajectories, config.sampleCount || 30);

        self.postMessage({
            type: 'simulation-complete',
            payload: {
                dsi,
                stats,
                samples,
                nSims: trajectories.length,
                steps: trajectories[0] ? trajectories[0].length : 0,
                timestamp: Date.now()
            }
        });
    }

    if (type === 'ping') {
        self.postMessage({ type: 'pong' });
    }
};
