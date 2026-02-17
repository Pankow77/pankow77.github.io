// ====================================================================
// ORACLE SIMULATOR v4.0 — Synthetic Earth
// Monte Carlo Perturbation Engine for Structural Instability Detection
// Runs as Web Worker: zero UI blocking, pure computation
// ====================================================================
// Input: current system state + coupling matrix + perturbation config
// Output: N simulated trajectories + DSI + bifurcation analysis
// ====================================================================

'use strict';

// ============================================================
// CONSTANTS
// ============================================================

const DOMAINS = ['geopolitics', 'economics', 'technology', 'climate', 'social', 'epistemology'];

// Cross-domain coupling matrix: how instability in domain X amplifies instability in domain Y
// Each value: 0 = no influence, 1 = maximum amplification
// Calibrated from geopolitical/economic interdependence literature
const COUPLING_MATRIX = {
    geopolitics: {
        economics:    0.55,    // Geopolitical tension → market volatility, trade disruption
        technology:   0.20,    // Geopolitical tension → tech decoupling (mild)
        climate:      0.10,    // Geopolitical tension → environmental policy neglect
        social:       0.50,    // Geopolitical tension → domestic unrest, migration
        epistemology: 0.35     // Geopolitical tension → propaganda, information warfare
    },
    economics: {
        geopolitics:  0.40,    // Economic crisis → protectionism, resource competition
        technology:   0.30,    // Economic crisis → R&D cuts, tech bubble risk
        climate:      0.15,    // Economic crisis → deprioritize climate policy
        social:       0.65,    // Economic crisis → inequality, social fracture (STRONG)
        epistemology: 0.20     // Economic crisis → scapegoating narratives
    },
    technology: {
        geopolitics:  0.30,    // Tech disruption → power shift, cyber conflict
        economics:    0.45,    // Tech disruption → market disruption, job displacement
        climate:      0.10,    // Tech disruption → energy consumption shift
        social:       0.40,    // Tech disruption → alienation, AI anxiety
        epistemology: 0.55     // Tech disruption → deepfakes, epistemic chaos (STRONG)
    },
    climate: {
        geopolitics:  0.45,    // Climate crisis → resource wars, border conflicts
        economics:    0.55,    // Climate crisis → agricultural collapse, insurance crisis
        technology:   0.10,    // Climate crisis → adaptation tech pressure
        social:       0.50,    // Climate crisis → displacement, climate refugees
        epistemology: 0.25     // Climate crisis → denial narratives, doom fatigue
    },
    social: {
        geopolitics:  0.35,    // Social unrest → political destabilization
        economics:    0.30,    // Social unrest → consumer confidence collapse
        technology:   0.10,    // Social unrest → tech backlash
        climate:      0.05,    // Social unrest → minimal direct climate impact
        epistemology: 0.45     // Social unrest → narrative fragmentation, extremism
    },
    epistemology: {
        geopolitics:  0.40,    // Info warfare → geopolitical manipulation, fake crises
        economics:    0.25,    // Disinformation → market manipulation, panic
        technology:   0.30,    // Epistemic crisis → tech regulation chaos
        climate:      0.30,    // Climate denial → policy paralysis
        social:       0.50     // Info warfare → tribal polarization (STRONG)
    }
};

// Dynamic parameters
const PARAMS = {
    ALPHA: 0.08,            // Mean-reversion strength (restoring force toward equilibrium)
    BETA: 0.12,             // Coupling amplification above tipping threshold
    TIPPING_LOAD: 0.55,     // System load above which positive feedback dominates
    NOISE_BASE: 0.015,      // Base stochastic noise per step
    DT: 1.0,                // Time step
    CRITICAL_STABILITY: 0.35 // Below this = structural failure
};


// ============================================================
// GAUSSIAN RANDOM (Box-Muller Transform)
// ============================================================

function gaussianRandom() {
    let u1 = Math.random();
    let u2 = Math.random();
    // Avoid log(0)
    while (u1 === 0) u1 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}


// ============================================================
// STATE EVOLUTION
// ============================================================

function evolveState(state, perturbation, noiseScale) {
    const newState = {};
    const domainValues = DOMAINS.map(d => state[d] || 0);
    const systemLoad = domainValues.reduce((s, v) => s + v, 0) / DOMAINS.length;

    // Above tipping threshold, coupling amplifies
    const couplingMultiplier = systemLoad > PARAMS.TIPPING_LOAD
        ? 1.0 + PARAMS.BETA * (systemLoad - PARAMS.TIPPING_LOAD) / (1 - PARAMS.TIPPING_LOAD)
        : 1.0;

    for (const domain of DOMAINS) {
        const x = state[domain] || 0;

        // 1. Mean-reversion (restoring force toward equilibrium ~0.3)
        const equilibrium = 0.3;
        const restoration = -PARAMS.ALPHA * (x - equilibrium);

        // 2. Cross-domain coupling
        let coupling = 0;
        for (const other of DOMAINS) {
            if (other !== domain && COUPLING_MATRIX[other]) {
                const coeff = COUPLING_MATRIX[other][domain] || 0;
                const otherVal = state[other] || 0;
                // Coupling only amplifies when the source domain is elevated
                if (otherVal > 0.4) {
                    coupling += coeff * (otherVal - 0.4) * couplingMultiplier;
                }
            }
        }

        // 3. External perturbation (scenario-specific)
        const externalPert = (perturbation && perturbation[domain]) || 0;

        // 4. Stochastic noise
        const noise = noiseScale * gaussianRandom();

        // 5. Integrate
        let newVal = x + (restoration + coupling + externalPert + noise) * PARAMS.DT;

        // Clamp to [0, 1]
        newVal = Math.max(0, Math.min(1, newVal));
        newState[domain] = newVal;
    }

    return newState;
}

// Calculate composite stability from domain states
function calculateStability(state) {
    const vals = DOMAINS.map(d => state[d] || 0);
    const meanInstability = vals.reduce((s, v) => s + v, 0) / vals.length;
    return Math.max(0, Math.min(1, 1 - meanInstability));
}


// ============================================================
// MONTE CARLO SIMULATION
// ============================================================

function runMonteCarlo(currentState, config) {
    const {
        nSims = 1000,
        steps = 72,
        noiseScale = PARAMS.NOISE_BASE,
        perturbation = null,         // One-time perturbation at t=0
        sustainedPerturbation = null  // Ongoing perturbation each step
    } = config;

    const trajectories = [];
    const finalStabilities = [];

    for (let sim = 0; sim < nSims; sim++) {
        let state = {};
        // Copy current state + apply initial perturbation
        for (const d of DOMAINS) {
            state[d] = (currentState[d] || 0.3);
            if (perturbation && perturbation[d]) {
                state[d] = Math.max(0, Math.min(1, state[d] + perturbation[d]));
            }
        }

        const trajectory = [calculateStability(state)];

        for (let t = 0; t < steps; t++) {
            state = evolveState(state, sustainedPerturbation, noiseScale);
            trajectory.push(calculateStability(state));
        }

        trajectories.push(trajectory);
        finalStabilities.push(trajectory[trajectory.length - 1]);
    }

    return { trajectories, finalStabilities };
}


// ============================================================
// DSI CALCULATION (Distance to Structural Instability)
// ============================================================

function calculateDSI(finalStabilities) {
    const n = finalStabilities.length;
    if (n === 0) return { dsi: 1.0, catastrophicFraction: 0, bimodality: 0 };

    // 1. Catastrophic fraction: how many simulations end below critical threshold
    const catastrophic = finalStabilities.filter(s => s < PARAMS.CRITICAL_STABILITY).length;
    const catastrophicFraction = catastrophic / n;

    // 2. Bimodality coefficient (Sarle's)
    // Measures whether the distribution has two modes (near bifurcation)
    const mean = finalStabilities.reduce((s, v) => s + v, 0) / n;
    const m2 = finalStabilities.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
    const m3 = finalStabilities.reduce((s, v) => s + (v - mean) ** 3, 0) / n;
    const m4 = finalStabilities.reduce((s, v) => s + (v - mean) ** 4, 0) / n;

    const skewness = m2 > 0 ? m3 / (m2 ** 1.5) : 0;
    const kurtosis = m2 > 0 ? m4 / (m2 ** 2) : 0;
    // Sarle's bimodality coefficient: b = (skewness^2 + 1) / kurtosis
    // b > 5/9 suggests bimodality
    const bimodality = kurtosis > 0 ? (skewness ** 2 + 1) / kurtosis : 0;

    // 3. DSI composite: weighted combination
    // High when few catastrophic outcomes AND low bimodality
    const dsi = Math.max(0, Math.min(1,
        (1 - catastrophicFraction) * 0.6 +
        Math.max(0, 1 - bimodality * 1.8) * 0.4
    ));

    return {
        dsi: Math.round(dsi * 1000) / 1000,
        catastrophicFraction: Math.round(catastrophicFraction * 1000) / 1000,
        bimodality: Math.round(bimodality * 1000) / 1000,
        mean: Math.round(mean * 1000) / 1000,
        std: Math.round(Math.sqrt(m2) * 1000) / 1000
    };
}


// ============================================================
// TRAJECTORY STATISTICS (for cloud rendering)
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

// Select sample trajectories for thin-line rendering
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

        // Run Monte Carlo
        const { trajectories, finalStabilities } = runMonteCarlo(currentState, config);

        // Calculate DSI
        const dsi = calculateDSI(finalStabilities);

        // Compute trajectory statistics for cloud rendering
        const stats = computeTrajectoryStats(trajectories);

        // Sample trajectories for thin-line rendering
        const samples = sampleTrajectories(trajectories, config.sampleCount || 30);

        // Send results back
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
