// ═══════════════════════════════════════════════════════════
// BAYESIAN-ENGINE v1.0 — Conjugate Inference Core
// Hybrid Syndicate / Ethic Software Foundation
// ═══════════════════════════════════════════════════════════
// Replaces heuristic severity scoring with proper Bayesian
// posterior updating. Browser-native. No cloud. No libraries.
//
// Target variable: P(cascade | signal_pattern, time_window)
// Given observed signals in last 6h, what is the probability
// of a cross-domain cascade in the next 6-12 hours?
//
// Models:
//   Beta-Binomial  — cascade occurrence (binary outcome)
//   Normal-Normal  — severity estimation (continuous)
//   Dirichlet-Cat  — domain classification confidence
//
// All computation is local. All priors are transparent.
// All posteriors are auditable. No black boxes.
// ═══════════════════════════════════════════════════════════

const BayesianEngine = (() => {
    'use strict';

    // ══════════════════════════════════════════════════════
    // OBSERVATION SCHEMA — Rigid. No feature creep.
    // ══════════════════════════════════════════════════════
    //
    // Every observation stored must conform to this schema.
    // Fields:
    //   observation_type : 'cascade_window' | 'intervention' | 'severity_reading'
    //   intervention_type: string | null — what happened (e.g., 'sanctions', 'policy_change')
    //   magnitude        : number 0-100  — how strong was the intervention/signal
    //   timestamp        : number        — when observed (ms epoch)
    //   observed_outcome : boolean|number — did cascade occur? (binary) or severity value (continuous)
    //   noise_context    : string        — environmental noise description
    //   domain           : string|null   — primary domain affected
    //   pattern_id       : string|null   — cascade pattern ID if applicable
    //   window_start     : number        — observation window start (ms epoch)
    //   window_end       : number        — observation window end (ms epoch)
    //
    const SCHEMA_FIELDS = [
        'observation_type', 'intervention_type', 'magnitude',
        'timestamp', 'observed_outcome', 'noise_context',
        'domain', 'pattern_id', 'window_start', 'window_end'
    ];

    const VALID_OBSERVATION_TYPES = ['cascade_window', 'intervention', 'severity_reading'];

    // ══════════════════════════════════════════════════════
    // PRIOR CONFIGURATION — Transparent & Auditable
    // ══════════════════════════════════════════════════════

    // Beta priors for cascade occurrence per pattern
    // Beta(alpha, beta) — alpha = pseudo-successes, beta = pseudo-failures
    // Weakly informative: centered on low probability, wide uncertainty
    const DEFAULT_PRIORS = {
        // Global cascade prior — P(any cascade in 6h window)
        // Beta(2, 8) → mean=0.20, mode=0.125, wide uncertainty
        // Reflects: cascades are relatively rare events
        global_cascade: { alpha: 2, beta: 8 },

        // Per-pattern priors — calibrated by historical frequency intuition
        'economic-geopolitical-shock':   { alpha: 3, beta: 7 },  // More common
        'climate-economic-cascade':      { alpha: 2, beta: 8 },
        'tech-epistemic-erosion':        { alpha: 2, beta: 10 }, // Rarer
        'social-geopolitical-instability': { alpha: 3, beta: 7 },
        'full-spectrum-crisis':          { alpha: 1, beta: 15 }, // Very rare
        'climate-social-displacement':   { alpha: 2, beta: 8 },
        'tech-economic-disruption':      { alpha: 2, beta: 8 },
        'epistemic-geopolitical-warfare': { alpha: 2, beta: 8 },
        'novel-cascade':                 { alpha: 1, beta: 12 }, // Unknown patterns, conservative

        // Normal prior for domain severity — N(mu, sigma^2)
        // Centered on moderate severity, wide uncertainty
        severity: { mu: 45, sigma: 20 },

        // Known observation noise (measurement error in severity scoring)
        // This is the sigma of the likelihood function
        severity_noise: 15,
    };

    // ══════════════════════════════════════════════════════
    // STORAGE — Observations persisted via StateManager
    // ══════════════════════════════════════════════════════
    const STORAGE_KEY = 'bayesian_observations';
    const POSTERIOR_KEY = 'bayesian_posteriors';
    const MAX_OBSERVATIONS = 500;

    // ══════════════════════════════════════════════════════
    // MATH UTILITIES — No external dependencies
    // ══════════════════════════════════════════════════════

    const Math2 = {
        // Log-gamma function (Lanczos approximation)
        // Needed for Beta function, marginal likelihoods
        lgamma(x) {
            if (x <= 0) return Infinity;
            const g = 7;
            const c = [
                0.99999999999980993, 676.5203681218851, -1259.1392167224028,
                771.32342877765313, -176.61502916214059, 12.507343278686905,
                -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7
            ];
            let sum = c[0];
            for (let i = 1; i < g + 2; i++) {
                sum += c[i] / (x + i - 1);
            }
            const t = x + g - 0.5;
            return 0.5 * Math.log(2 * Math.PI) + (x - 0.5) * Math.log(t) - t + Math.log(sum);
        },

        // Log of Beta function: B(a,b) = Gamma(a)*Gamma(b)/Gamma(a+b)
        lbeta(a, b) {
            return this.lgamma(a) + this.lgamma(b) - this.lgamma(a + b);
        },

        // Beta function
        beta(a, b) {
            return Math.exp(this.lbeta(a, b));
        },

        // Beta distribution PDF
        betaPdf(x, alpha, beta_param) {
            if (x <= 0 || x >= 1) return 0;
            const logPdf = (alpha - 1) * Math.log(x) + (beta_param - 1) * Math.log(1 - x) - this.lbeta(alpha, beta_param);
            return Math.exp(logPdf);
        },

        // Beta distribution CDF (numerical integration, Simpson's rule)
        betaCdf(x, alpha, beta_param, steps = 200) {
            if (x <= 0) return 0;
            if (x >= 1) return 1;
            const h = x / steps;
            let sum = this.betaPdf(0.001, alpha, beta_param) + this.betaPdf(x, alpha, beta_param);
            for (let i = 1; i < steps; i++) {
                const xi = i * h;
                sum += (i % 2 === 0 ? 2 : 4) * this.betaPdf(xi, alpha, beta_param);
            }
            return (h / 3) * sum / this.beta(alpha, beta_param);
        },

        // Beta distribution quantile (bisection method)
        betaQuantile(p, alpha, beta_param, tol = 1e-6) {
            let lo = 0, hi = 1;
            for (let i = 0; i < 100; i++) {
                const mid = (lo + hi) / 2;
                const cdf = this.betaCdf(mid, alpha, beta_param);
                if (Math.abs(cdf - p) < tol) return mid;
                if (cdf < p) lo = mid;
                else hi = mid;
            }
            return (lo + hi) / 2;
        },

        // Normal PDF
        normalPdf(x, mu, sigma) {
            const z = (x - mu) / sigma;
            return Math.exp(-0.5 * z * z) / (sigma * Math.sqrt(2 * Math.PI));
        },

        // Normal CDF (approximation)
        normalCdf(x, mu, sigma) {
            const z = (x - mu) / sigma;
            const t = 1 / (1 + 0.2316419 * Math.abs(z));
            const d = 0.3989422804014327;
            const p = d * Math.exp(-z * z / 2) *
                (t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.8212560 + t * 1.330274)))));
            return z > 0 ? 1 - p : p;
        },

        // Sample from Beta distribution (Joehnk's algorithm for small params)
        sampleBeta(alpha, beta_param) {
            // Use gamma sampling: Beta(a,b) = Ga(a)/(Ga(a)+Ga(b))
            const ga = this.sampleGamma(alpha, 1);
            const gb = this.sampleGamma(beta_param, 1);
            return ga / (ga + gb);
        },

        // Sample from Gamma distribution (Marsaglia & Tsang)
        sampleGamma(shape, scale) {
            if (shape < 1) {
                return this.sampleGamma(shape + 1, scale) * Math.pow(Math.random(), 1 / shape);
            }
            const d = shape - 1 / 3;
            const c = 1 / Math.sqrt(9 * d);
            while (true) {
                let x, v;
                do {
                    x = this._sampleNormal();
                    v = 1 + c * x;
                } while (v <= 0);
                v = v * v * v;
                const u = Math.random();
                if (u < 1 - 0.0331 * (x * x) * (x * x)) return d * v * scale;
                if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v * scale;
            }
        },

        // Standard normal sample (Box-Muller)
        _sampleNormal() {
            const u1 = Math.random();
            const u2 = Math.random();
            return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        },

        // Sample from Normal distribution
        sampleNormal(mu, sigma) {
            return mu + sigma * this._sampleNormal();
        },
    };

    // ══════════════════════════════════════════════════════
    // BETA-BINOMIAL MODEL — Cascade Occurrence
    // ══════════════════════════════════════════════════════
    // Prior: Beta(alpha_0, beta_0)
    // Data: k successes (cascade occurred) in n windows
    // Posterior: Beta(alpha_0 + k, beta_0 + n - k)

    const BetaBinomial = {
        // Update posterior with new observation
        update(prior, observed) {
            // observed: boolean — did cascade occur in this window?
            return {
                alpha: prior.alpha + (observed ? 1 : 0),
                beta: prior.beta + (observed ? 0 : 1),
            };
        },

        // Update with batch of observations
        updateBatch(prior, observations) {
            const k = observations.filter(o => o).length;
            const n = observations.length;
            return {
                alpha: prior.alpha + k,
                beta: prior.beta + (n - k),
            };
        },

        // Posterior mean: E[theta | data]
        mean(posterior) {
            return posterior.alpha / (posterior.alpha + posterior.beta);
        },

        // Posterior mode: MAP estimate
        mode(posterior) {
            if (posterior.alpha <= 1 && posterior.beta <= 1) return this.mean(posterior);
            if (posterior.alpha <= 1) return 0;
            if (posterior.beta <= 1) return 1;
            return (posterior.alpha - 1) / (posterior.alpha + posterior.beta - 2);
        },

        // Posterior variance
        variance(posterior) {
            const a = posterior.alpha;
            const b = posterior.beta;
            return (a * b) / ((a + b) * (a + b) * (a + b + 1));
        },

        // Credible interval [lo, hi] at given level (e.g., 0.95)
        credibleInterval(posterior, level = 0.95) {
            const tail = (1 - level) / 2;
            return {
                lower: Math2.betaQuantile(tail, posterior.alpha, posterior.beta),
                upper: Math2.betaQuantile(1 - tail, posterior.alpha, posterior.beta),
                level,
            };
        },

        // Posterior predictive: P(next cascade | data)
        // For Beta-Binomial, this equals the posterior mean
        predictive(posterior) {
            return this.mean(posterior);
        },

        // Effective sample size: how much data has the posterior seen?
        effectiveSampleSize(prior, posterior) {
            return (posterior.alpha + posterior.beta) - (prior.alpha + prior.beta);
        },

        // Posterior concentration: how confident are we?
        // Higher = more concentrated = more confident
        concentration(posterior) {
            return posterior.alpha + posterior.beta;
        },

        // Sample from posterior (for Monte Carlo)
        sample(posterior, n = 1000) {
            const samples = [];
            for (let i = 0; i < n; i++) {
                samples.push(Math2.sampleBeta(posterior.alpha, posterior.beta));
            }
            return samples;
        },

        // Log marginal likelihood: P(data | model)
        // For Beta-Binomial: log[ B(alpha+k, beta+n-k) / B(alpha, beta) * C(n,k) ]
        logMarginalLikelihood(prior, k, n) {
            return Math2.lbeta(prior.alpha + k, prior.beta + n - k) -
                   Math2.lbeta(prior.alpha, prior.beta) +
                   this._logChoose(n, k);
        },

        _logChoose(n, k) {
            return Math2.lgamma(n + 1) - Math2.lgamma(k + 1) - Math2.lgamma(n - k + 1);
        },
    };

    // ══════════════════════════════════════════════════════
    // NORMAL-NORMAL MODEL — Severity Estimation
    // ══════════════════════════════════════════════════════
    // Prior: N(mu_0, sigma_0^2)
    // Likelihood: N(x | theta, sigma_noise^2) [known noise]
    // Posterior: N(mu_n, sigma_n^2)

    const NormalNormal = {
        // Update posterior with single observation
        update(prior, observed, noiseVariance) {
            const priorPrec = 1 / (prior.sigma * prior.sigma);
            const likePrec = 1 / noiseVariance;
            const postPrec = priorPrec + likePrec;
            const postVar = 1 / postPrec;
            const postMu = postVar * (priorPrec * prior.mu + likePrec * observed);
            return {
                mu: postMu,
                sigma: Math.sqrt(postVar),
            };
        },

        // Update with batch
        updateBatch(prior, observations, noiseVariance) {
            let current = { ...prior };
            for (const obs of observations) {
                current = this.update(current, obs, noiseVariance);
            }
            return current;
        },

        // Posterior predictive: includes both posterior uncertainty and observation noise
        predictiveMean(posterior) {
            return posterior.mu;
        },

        predictiveStd(posterior, noiseVariance) {
            return Math.sqrt(posterior.sigma * posterior.sigma + noiseVariance);
        },

        // Credible interval
        credibleInterval(posterior, level = 0.95) {
            const z = level === 0.95 ? 1.96 : level === 0.99 ? 2.576 : 1.645;
            return {
                lower: posterior.mu - z * posterior.sigma,
                upper: posterior.mu + z * posterior.sigma,
                level,
            };
        },

        // Sample from posterior
        sample(posterior, n = 1000) {
            const samples = [];
            for (let i = 0; i < n; i++) {
                samples.push(Math2.sampleNormal(posterior.mu, posterior.sigma));
            }
            return samples;
        },
    };

    // ══════════════════════════════════════════════════════
    // BAYES FACTOR — Model Comparison
    // ══════════════════════════════════════════════════════
    // BF_{10} = P(data | M1) / P(data | M0)
    // M0: null model (no intervention effect) — uses global prior
    // M1: intervention model — uses shifted prior

    const BayesFactor = {
        // Compute Bayes Factor for cascade occurrence
        // M0: cascade rate = global base rate
        // M1: cascade rate shifted by intervention
        compute(observations, prior_null, prior_alt) {
            const k = observations.filter(o => o.observed_outcome === true).length;
            const n = observations.length;

            const logML_null = BetaBinomial.logMarginalLikelihood(prior_null, k, n);
            const logML_alt = BetaBinomial.logMarginalLikelihood(prior_alt, k, n);

            const logBF = logML_alt - logML_null;
            const bf = Math.exp(logBF);

            return {
                log_bf: logBF,
                bf_10: bf,
                bf_01: 1 / bf,
                interpretation: this.interpret(bf),
                n_observations: n,
                n_cascades: k,
            };
        },

        // Jeffreys' scale for Bayes Factor interpretation
        interpret(bf) {
            if (bf > 100) return 'DECISIVE for M1';
            if (bf > 30) return 'VERY_STRONG for M1';
            if (bf > 10) return 'STRONG for M1';
            if (bf > 3) return 'SUBSTANTIAL for M1';
            if (bf > 1) return 'WEAK for M1';
            if (bf > 1/3) return 'INCONCLUSIVE';
            if (bf > 1/10) return 'SUBSTANTIAL for M0';
            if (bf > 1/30) return 'STRONG for M0';
            if (bf > 1/100) return 'VERY_STRONG for M0';
            return 'DECISIVE for M0';
        },

        // Compute BF for intervention effect on specific pattern
        forIntervention(observations, interventionType, patternId) {
            const relevant = observations.filter(o =>
                o.pattern_id === patternId || patternId === 'global'
            );

            // Split by intervention presence
            const withIntervention = relevant.filter(o => o.intervention_type === interventionType);
            const withoutIntervention = relevant.filter(o => o.intervention_type !== interventionType);

            if (withIntervention.length < 3 || withoutIntervention.length < 3) {
                return {
                    bf_10: null,
                    interpretation: 'INSUFFICIENT_DATA',
                    n_with: withIntervention.length,
                    n_without: withoutIntervention.length,
                    minimum_needed: 3,
                };
            }

            const prior = DEFAULT_PRIORS[patternId] || DEFAULT_PRIORS.global_cascade;
            // M0: same rate for both groups
            // M1: different rates (separate posteriors)
            const k_all = relevant.filter(o => o.observed_outcome === true).length;
            const n_all = relevant.length;
            const k_with = withIntervention.filter(o => o.observed_outcome === true).length;
            const k_without = withoutIntervention.filter(o => o.observed_outcome === true).length;

            // M0: single rate for all data
            const logML_0 = BetaBinomial.logMarginalLikelihood(prior, k_all, n_all);

            // M1: separate rates for each group
            const logML_1 = BetaBinomial.logMarginalLikelihood(prior, k_with, withIntervention.length) +
                            BetaBinomial.logMarginalLikelihood(prior, k_without, withoutIntervention.length);

            const logBF = logML_1 - logML_0;
            const bf = Math.exp(logBF);

            return {
                log_bf: logBF,
                bf_10: bf,
                interpretation: this.interpret(bf),
                rate_with: k_with / withIntervention.length,
                rate_without: k_without / withoutIntervention.length,
                n_with: withIntervention.length,
                n_without: withoutIntervention.length,
            };
        },
    };

    // ══════════════════════════════════════════════════════
    // POSTERIOR PREDICTIVE CHECK
    // ══════════════════════════════════════════════════════
    // Generate data from the posterior predictive distribution
    // and compare with observed data. If model is well-calibrated,
    // observed data should look like it could have come from
    // the posterior predictive.

    const PosteriorPredictiveCheck = {
        // For Beta-Binomial: simulate cascade counts from posterior predictive
        // Returns calibration metrics
        cascadeCheck(posterior, observedK, observedN, nSim = 2000) {
            const simulated = [];
            for (let i = 0; i < nSim; i++) {
                // 1. Sample theta from posterior
                const theta = Math2.sampleBeta(posterior.alpha, posterior.beta);
                // 2. Sample k from Binomial(n, theta)
                let k = 0;
                for (let j = 0; j < observedN; j++) {
                    if (Math.random() < theta) k++;
                }
                simulated.push(k);
            }

            // Bayesian p-value: P(simulated >= observed)
            const pValue = simulated.filter(s => s >= observedK).length / nSim;

            // Summary statistics
            simulated.sort((a, b) => a - b);
            const mean = simulated.reduce((a, b) => a + b, 0) / nSim;
            const median = simulated[Math.floor(nSim / 2)];
            const lower = simulated[Math.floor(nSim * 0.025)];
            const upper = simulated[Math.floor(nSim * 0.975)];

            return {
                bayesian_p_value: pValue,
                calibrated: pValue > 0.05 && pValue < 0.95,
                observed_k: observedK,
                observed_n: observedN,
                simulated_mean: mean,
                simulated_median: median,
                simulated_95_ci: { lower, upper },
                observed_in_ci: observedK >= lower && observedK <= upper,
                diagnosis: this._diagnose(pValue, observedK, mean),
            };
        },

        // For Normal-Normal: check severity predictions
        severityCheck(posterior, observations, noiseVariance, nSim = 2000) {
            const nObs = observations.length;
            if (nObs === 0) return { calibrated: false, diagnosis: 'NO_DATA' };

            const observedMean = observations.reduce((a, b) => a + b, 0) / nObs;

            const simMeans = [];
            for (let i = 0; i < nSim; i++) {
                const theta = Math2.sampleNormal(posterior.mu, posterior.sigma);
                let sum = 0;
                for (let j = 0; j < nObs; j++) {
                    sum += Math2.sampleNormal(theta, Math.sqrt(noiseVariance));
                }
                simMeans.push(sum / nObs);
            }

            simMeans.sort((a, b) => a - b);
            const pValue = simMeans.filter(s => s >= observedMean).length / nSim;
            const lower = simMeans[Math.floor(nSim * 0.025)];
            const upper = simMeans[Math.floor(nSim * 0.975)];

            return {
                bayesian_p_value: pValue,
                calibrated: pValue > 0.05 && pValue < 0.95,
                observed_mean: observedMean,
                simulated_95_ci: { lower, upper },
                observed_in_ci: observedMean >= lower && observedMean <= upper,
                n_observations: nObs,
            };
        },

        _diagnose(pValue, observedK, simMean) {
            if (pValue < 0.05) return 'MODEL_UNDERPREDICTS — observed cascades exceed model expectation. Prior too conservative?';
            if (pValue > 0.95) return 'MODEL_OVERPREDICTS — fewer cascades than model expects. Prior too aggressive?';
            if (Math.abs(observedK - simMean) < 1) return 'WELL_CALIBRATED — model matches data closely.';
            return 'ACCEPTABLE — observed within posterior predictive range.';
        },
    };

    // ══════════════════════════════════════════════════════
    // OBSERVATION MANAGEMENT — Schema Enforcement
    // ══════════════════════════════════════════════════════

    function validateObservation(obs) {
        const errors = [];

        if (!VALID_OBSERVATION_TYPES.includes(obs.observation_type)) {
            errors.push(`Invalid observation_type: ${obs.observation_type}. Must be one of: ${VALID_OBSERVATION_TYPES.join(', ')}`);
        }
        if (typeof obs.magnitude !== 'number' || obs.magnitude < 0 || obs.magnitude > 100) {
            errors.push(`magnitude must be a number 0-100, got: ${obs.magnitude}`);
        }
        if (typeof obs.timestamp !== 'number' || obs.timestamp <= 0) {
            errors.push(`timestamp must be a positive number (ms epoch), got: ${obs.timestamp}`);
        }
        if (obs.observed_outcome === undefined || obs.observed_outcome === null) {
            errors.push('observed_outcome is required');
        }
        if (typeof obs.noise_context !== 'string') {
            errors.push('noise_context must be a string describing measurement conditions');
        }
        if (typeof obs.window_start !== 'number' || typeof obs.window_end !== 'number') {
            errors.push('window_start and window_end must be numbers (ms epoch)');
        }
        if (obs.window_end <= obs.window_start) {
            errors.push('window_end must be after window_start');
        }

        return {
            valid: errors.length === 0,
            errors,
        };
    }

    function createObservation(data) {
        const obs = {
            observation_type: data.observation_type,
            intervention_type: data.intervention_type || null,
            magnitude: data.magnitude,
            timestamp: data.timestamp || Date.now(),
            observed_outcome: data.observed_outcome,
            noise_context: data.noise_context || 'unspecified',
            domain: data.domain || null,
            pattern_id: data.pattern_id || null,
            window_start: data.window_start,
            window_end: data.window_end,
        };

        const validation = validateObservation(obs);
        if (!validation.valid) {
            console.error('[BayesianEngine] Schema violation:', validation.errors);
            return { observation: null, errors: validation.errors };
        }

        return { observation: obs, errors: [] };
    }

    // ══════════════════════════════════════════════════════
    // PERSISTENCE — StateManager integration
    // ══════════════════════════════════════════════════════

    function loadObservations() {
        if (typeof StateManager === 'undefined') return [];
        return StateManager.get(STORAGE_KEY, []);
    }

    function saveObservations(observations) {
        if (typeof StateManager === 'undefined') return;
        // Enforce max
        if (observations.length > MAX_OBSERVATIONS) {
            observations = observations.slice(-MAX_OBSERVATIONS);
        }
        StateManager.set(STORAGE_KEY, observations);
    }

    function loadPosteriors() {
        if (typeof StateManager === 'undefined') return {};
        return StateManager.get(POSTERIOR_KEY, {});
    }

    function savePosteriors(posteriors) {
        if (typeof StateManager === 'undefined') return;
        StateManager.set(POSTERIOR_KEY, posteriors);
    }

    // ══════════════════════════════════════════════════════
    // CORE ENGINE — Record, Update, Predict
    // ══════════════════════════════════════════════════════

    // Record a new observation and update posteriors
    function recordObservation(data) {
        const { observation, errors } = createObservation(data);
        if (!observation) return { success: false, errors };

        // Persist observation
        const observations = loadObservations();
        observations.push(observation);
        saveObservations(observations);

        // Update posteriors
        const posteriors = loadPosteriors();

        if (observation.observation_type === 'cascade_window') {
            const patternKey = observation.pattern_id || 'global_cascade';
            const prior = posteriors[patternKey] || DEFAULT_PRIORS[patternKey] || DEFAULT_PRIORS.global_cascade;
            posteriors[patternKey] = BetaBinomial.update(prior, observation.observed_outcome === true);
        }

        if (observation.observation_type === 'severity_reading' && typeof observation.observed_outcome === 'number') {
            const domainKey = 'severity_' + (observation.domain || 'global');
            const prior = posteriors[domainKey] || { ...DEFAULT_PRIORS.severity };
            const noiseVar = DEFAULT_PRIORS.severity_noise * DEFAULT_PRIORS.severity_noise;
            posteriors[domainKey] = NormalNormal.update(prior, observation.observed_outcome, noiseVar);
        }

        savePosteriors(posteriors);

        // Broadcast update
        if (typeof StateManager !== 'undefined') {
            StateManager.broadcast('bayesian:update', {
                observation_type: observation.observation_type,
                pattern_id: observation.pattern_id,
                domain: observation.domain,
                n_total: observations.length,
            });
        }

        return { success: true, observation, posteriors };
    }

    // Auto-record a cascade window observation from CascadeDetector results
    function recordCascadeScan(scanResult) {
        if (!scanResult) return [];
        const results = [];
        const now = Date.now();
        const windowMs = 6 * 60 * 60 * 1000;

        if (scanResult.cascades && scanResult.cascades.length > 0) {
            // Cascades detected — record positive observations
            for (const cascade of scanResult.cascades) {
                results.push(recordObservation({
                    observation_type: 'cascade_window',
                    intervention_type: null,
                    magnitude: cascade.severity,
                    timestamp: now,
                    observed_outcome: true,
                    noise_context: `auto_scan|confidence:${cascade.confidence}|signals:${cascade.signalCount}`,
                    domain: cascade.matchedDomains[0],
                    pattern_id: cascade.patternId,
                    window_start: now - windowMs,
                    window_end: now,
                }));
            }
        } else {
            // No cascades — record negative observation for global
            results.push(recordObservation({
                observation_type: 'cascade_window',
                intervention_type: null,
                magnitude: 0,
                timestamp: now,
                observed_outcome: false,
                noise_context: `auto_scan|status:${scanResult.status}|elevated_domains:${Object.keys(scanResult.elevatedDomains || {}).length}`,
                domain: null,
                pattern_id: 'global_cascade',
                window_start: now - windowMs,
                window_end: now,
            }));
        }

        return results;
    }

    // Get current posterior for a pattern or domain
    function getPosterior(key) {
        const posteriors = loadPosteriors();
        if (posteriors[key]) return posteriors[key];
        if (DEFAULT_PRIORS[key]) return { ...DEFAULT_PRIORS[key] };
        return null;
    }

    // Get cascade probability estimate for a pattern
    function getCascadeProbability(patternId) {
        const key = patternId || 'global_cascade';
        const posterior = getPosterior(key);
        if (!posterior || !posterior.alpha) return null;

        const prior = DEFAULT_PRIORS[key] || DEFAULT_PRIORS.global_cascade;
        const ci = BetaBinomial.credibleInterval(posterior);
        const n = BetaBinomial.effectiveSampleSize(prior, posterior);

        return {
            pattern_id: key,
            probability: BetaBinomial.mean(posterior),
            mode: BetaBinomial.mode(posterior),
            credible_interval: ci,
            variance: BetaBinomial.variance(posterior),
            concentration: BetaBinomial.concentration(posterior),
            effective_n: n,
            prior: prior,
            posterior: posterior,
            data_driven: n >= 10,
            sufficient_data: n >= 30,
        };
    }

    // Get severity estimate for a domain
    function getSeverityEstimate(domain) {
        const key = 'severity_' + (domain || 'global');
        const posterior = getPosterior(key);
        if (!posterior || posterior.mu === undefined) return null;

        const noiseVar = DEFAULT_PRIORS.severity_noise * DEFAULT_PRIORS.severity_noise;
        const ci = NormalNormal.credibleInterval(posterior);

        return {
            domain,
            estimated_severity: posterior.mu,
            uncertainty: posterior.sigma,
            credible_interval: ci,
            predictive_std: NormalNormal.predictiveStd(posterior, noiseVar),
            posterior: posterior,
        };
    }

    // Run posterior predictive check for a pattern
    function checkCalibration(patternId) {
        const key = patternId || 'global_cascade';
        const posterior = getPosterior(key);
        if (!posterior || !posterior.alpha) return { calibrated: false, diagnosis: 'NO_POSTERIOR' };

        const observations = loadObservations().filter(o =>
            o.observation_type === 'cascade_window' &&
            (o.pattern_id === key || key === 'global_cascade')
        );

        if (observations.length < 5) {
            return {
                calibrated: false,
                diagnosis: `INSUFFICIENT_DATA — need at least 5 observations, have ${observations.length}`,
                n: observations.length,
            };
        }

        const k = observations.filter(o => o.observed_outcome === true).length;
        const n = observations.length;

        return PosteriorPredictiveCheck.cascadeCheck(posterior, k, n);
    }

    // Compute Bayes Factor for an intervention type
    function testIntervention(interventionType, patternId) {
        const observations = loadObservations().filter(o => o.observation_type === 'cascade_window');
        return BayesFactor.forIntervention(observations, interventionType, patternId || 'global');
    }

    // ══════════════════════════════════════════════════════
    // FULL STATUS REPORT — Audit-ready
    // ══════════════════════════════════════════════════════

    function getStatus() {
        const observations = loadObservations();
        const posteriors = loadPosteriors();

        const cascadeObs = observations.filter(o => o.observation_type === 'cascade_window');
        const severityObs = observations.filter(o => o.observation_type === 'severity_reading');
        const interventionObs = observations.filter(o => o.observation_type === 'intervention');

        // Cascade probabilities for all patterns
        const cascadeEstimates = {};
        const patternIds = ['global_cascade', ...Object.keys(DEFAULT_PRIORS).filter(k =>
            k !== 'global_cascade' && k !== 'severity' && k !== 'severity_noise'
        )];
        for (const pid of patternIds) {
            cascadeEstimates[pid] = getCascadeProbability(pid);
        }

        // Unique intervention types observed
        const interventionTypes = [...new Set(observations
            .filter(o => o.intervention_type)
            .map(o => o.intervention_type)
        )];

        return {
            engine_version: '1.0',
            total_observations: observations.length,
            breakdown: {
                cascade_windows: cascadeObs.length,
                severity_readings: severityObs.length,
                interventions: interventionObs.length,
            },
            cascade_estimates: cascadeEstimates,
            intervention_types_observed: interventionTypes,
            posteriors_stored: Object.keys(posteriors).length,
            priors: DEFAULT_PRIORS,
            data_sufficient_for: {
                posterior_predictive_check: cascadeObs.length >= 5,
                hierarchical_model: cascadeObs.length >= 30,
                bayes_factor: interventionTypes.length > 0 && cascadeObs.length >= 10,
                matrix_R_estimation: cascadeObs.length >= 40,
            },
            timestamp: Date.now(),
        };
    }

    // ══════════════════════════════════════════════════════
    // INIT
    // ══════════════════════════════════════════════════════

    function init() {
        const obs = loadObservations();
        const post = loadPosteriors();
        console.log(
            `%c[BayesianEngine] Online. Observations: ${obs.length} | Posteriors: ${Object.keys(post).length} | Target: P(cascade|signals,window)`,
            'color: #ff9500; font-weight: bold; font-size: 11px;'
        );
    }

    // Auto-init if StateManager available
    if (typeof StateManager !== 'undefined') {
        init();
    }

    // ══════════════════════════════════════════════════════
    // PUBLIC API
    // ══════════════════════════════════════════════════════

    return {
        // Core operations
        recordObservation,
        recordCascadeScan,
        getCascadeProbability,
        getSeverityEstimate,

        // Model checking
        checkCalibration,
        testIntervention,

        // Status & audit
        getStatus,
        getPosterior,

        // Direct model access (for advanced use)
        models: {
            BetaBinomial,
            NormalNormal,
            BayesFactor,
            PosteriorPredictiveCheck,
        },

        // Math utilities (exposed for testing)
        math: Math2,

        // Schema
        SCHEMA_FIELDS,
        VALID_OBSERVATION_TYPES,
        DEFAULT_PRIORS,

        // Re-init (e.g., after StateManager loads)
        init,
    };
})();
