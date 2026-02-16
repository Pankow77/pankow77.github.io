// ═══════════════════════════════════════════════════════════
// BAYESIAN-ENGINE v2.0 — Conjugate Inference Core
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
        'domain', 'pattern_id', 'window_start', 'window_end',
        'predicted_probability' // What the model predicted at time of observation (for Brier score)
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
        'equity-geopolitical-shock':      { alpha: 2, beta: 8 },  // Separate from energy
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
    const PENDING_KEY = 'bayesian_pending';
    const CALIBRATION_KEY = 'bayesian_calibration';
    const MAX_OBSERVATIONS = 500;

    // ══════════════════════════════════════════════════════
    // TEMPORAL DISCIPLINE — Anti-leakage, anti-autocorrelation
    // ══════════════════════════════════════════════════════
    // Feature window: [t - FEATURE_WINDOW_MS, t]
    // Target window:  [t, t + PREDICTION_HORIZON_MS]
    // No overlap. No leakage.
    // Minimum gap between independent observations: PREDICTION_HORIZON_MS
    const FEATURE_WINDOW_MS = 6 * 60 * 60 * 1000;     // 6 hours
    const PREDICTION_HORIZON_MS = 6 * 60 * 60 * 1000;  // 6 hours forward
    const MIN_OBSERVATION_GAP_MS = PREDICTION_HORIZON_MS; // Non-overlapping → independent
    const EMPIRICAL_BAYES_THRESHOLD = 20; // Recalibrate priors at n≥20

    // ══════════════════════════════════════════════════════
    // GROUND TRUTH LABELS — Quantitative. No ambiguity.
    // ══════════════════════════════════════════════════════
    // "Disruption" is not a feeling. It's a number crossing a threshold.
    // Each vertical has ONE metric and ONE cutoff.
    // If you can't look it up in public data with a timestamp, it's not ground truth.

    const LABEL_DEFINITIONS = {
        // ── ENERGY VERTICAL ──
        // One instrument. One cutoff. No fallback.
        'economic-geopolitical-shock': {
            metric: 'brent_crude_pct_move_6h',
            description: 'Brent Crude Oil absolute % change within 6h window',
            cutoff: 5.0,          // >= 5% absolute move = disruption = true
            unit: 'percent',
            direction: 'absolute', // Both up and down count
            source: 'ICE Brent Crude front-month contract',
            source_url: 'https://www.theice.com/products/219/Brent-Crude-Futures',
            // NOTE: cutoff 5.0% is PROVISIONAL — must be validated against
            // historical 6h return distribution before building training set.
            // If empirical analysis shows 5% happens <5 times in 5 years → too rare.
            // If >50 times per year → too noisy. Adjust cutoff to target ~15-25 events/year.
            // Ground truth protocol:
            // 1. At window close (t + 6h), check Brent Crude front-month
            // 2. Compute abs(price_at_t+6h - price_at_t) / price_at_t * 100
            // 3. If >= cutoff → observed_outcome = true
            // 4. Log price_start, price_end, pct_change in noise_context
        },

        // ── EQUITY VERTICAL ── (separate process, separate posterior)
        'equity-geopolitical-shock': {
            metric: 'eurostoxx50_pct_move_6h',
            description: 'EuroStoxx 50 absolute % change within 6h window',
            cutoff: 3.0,          // >= 3% absolute move
            unit: 'percent',
            direction: 'absolute',
            source: 'STOXX Ltd / Eurex',
            // Different instrument = different distribution = different vertical.
            // Never mix with Brent under same posterior.
        },

        'climate-economic-cascade': {
            metric: 'commodity_basket_pct_move_24h',
            description: 'Agricultural commodity basket (wheat+corn+soy) avg absolute % change',
            cutoff: 4.0,
            unit: 'percent',
            direction: 'absolute',
            source: 'CME Group agricultural futures',
        },

        'tech-epistemic-erosion': {
            metric: 'disinfo_signal_density_per_6h',
            description: 'Cross-domain disinformation signal count exceeding severity 70',
            cutoff: 5,            // >= 5 high-severity disinfo signals in 6h
            unit: 'count',
            direction: 'above',
            source: 'Internal RSS pipeline + severity scoring',
        },

        'social-geopolitical-instability': {
            metric: 'unhcr_displacement_event',
            description: 'UNHCR registered displacement event affecting >10k people',
            cutoff: 10000,
            unit: 'persons',
            direction: 'above',
            source: 'UNHCR Operational Data Portal',
        },

        'full-spectrum-crisis': {
            metric: 'domains_above_severity_60',
            description: 'Number of domains simultaneously above avg severity 60',
            cutoff: 4,            // >= 4 out of 6 domains critical
            unit: 'count',
            direction: 'above',
            source: 'Internal domain severity calculation',
        },

        'global_cascade': {
            metric: 'vix_level',
            description: 'CBOE VIX index level at window close',
            cutoff: 30,           // VIX >= 30 = market stress = cascade confirmed
            unit: 'index_points',
            direction: 'above',
            source: 'CBOE VIX Index',
            // VIX < 20 = calm, 20-30 = elevated, >= 30 = stress/fear
        },
    };

    // Apply a label definition to determine ground truth
    function applyLabel(labelDef, metricValue) {
        if (labelDef.direction === 'absolute') {
            return Math.abs(metricValue) >= labelDef.cutoff;
        }
        return metricValue >= labelDef.cutoff;
    }

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
    // CALIBRATION METRICS — Brier Score + Calibration Curve
    // ══════════════════════════════════════════════════════
    // These tell you if your probabilities MEAN something.
    // If you predict 30% and cascades happen 30% of the time → calibrated.
    // If your calibration curve deviates from diagonal → fix priors.

    const CalibrationMetrics = {
        // Brier score: (1/n) Σ (p_i - o_i)²
        // Perfect = 0, worst = 1
        // Decomposition: Brier = Reliability - Resolution + Uncertainty
        brierScore(predictions) {
            // predictions: [{ predicted: 0.3, actual: 0 or 1 }, ...]
            if (predictions.length === 0) return { score: null, n: 0 };
            let sum = 0;
            for (const p of predictions) {
                const diff = p.predicted - p.actual;
                sum += diff * diff;
            }
            const score = sum / predictions.length;

            // Decompose: reliability (calibration error), resolution, uncertainty
            const bins = this.calibrationBins(predictions);
            let reliability = 0;
            let resolution = 0;
            const baseRate = predictions.reduce((s, p) => s + p.actual, 0) / predictions.length;
            const uncertainty = baseRate * (1 - baseRate);

            for (const bin of bins) {
                if (bin.count === 0) continue;
                const weight = bin.count / predictions.length;
                reliability += weight * Math.pow(bin.mean_predicted - bin.observed_rate, 2);
                resolution += weight * Math.pow(bin.observed_rate - baseRate, 2);
            }

            return {
                score: Math.round(score * 10000) / 10000,
                reliability: Math.round(reliability * 10000) / 10000,
                resolution: Math.round(resolution * 10000) / 10000,
                uncertainty: Math.round(uncertainty * 10000) / 10000,
                n: predictions.length,
                interpretation: score < 0.1 ? 'EXCELLENT' :
                                score < 0.2 ? 'GOOD' :
                                score < 0.3 ? 'FAIR' :
                                'POOR',
            };
        },

        // Calibration bins: group predictions by probability range
        // Returns: [{ bin: '0.0-0.2', mean_predicted, observed_rate, count, deviation }]
        calibrationBins(predictions, nBins = 5) {
            const edges = [];
            for (let i = 0; i <= nBins; i++) edges.push(i / nBins);

            const bins = [];
            for (let i = 0; i < nBins; i++) {
                const lo = edges[i];
                const hi = edges[i + 1];
                const inBin = predictions.filter(p => p.predicted >= lo && (i === nBins - 1 ? p.predicted <= hi : p.predicted < hi));
                const count = inBin.length;
                const meanPred = count > 0 ? inBin.reduce((s, p) => s + p.predicted, 0) / count : (lo + hi) / 2;
                const obsRate = count > 0 ? inBin.reduce((s, p) => s + p.actual, 0) / count : 0;

                bins.push({
                    bin: `${lo.toFixed(1)}-${hi.toFixed(1)}`,
                    lower: lo,
                    upper: hi,
                    mean_predicted: Math.round(meanPred * 1000) / 1000,
                    observed_rate: Math.round(obsRate * 1000) / 1000,
                    count,
                    deviation: Math.round(Math.abs(meanPred - obsRate) * 1000) / 1000,
                    calibrated: count >= 3 && Math.abs(meanPred - obsRate) < 0.15,
                });
            }
            return bins;
        },

        // Full calibration report from observations
        fromObservations(observations) {
            const predictions = observations
                .filter(o => o.predicted_probability !== undefined && o.predicted_probability !== null)
                .map(o => ({
                    predicted: o.predicted_probability,
                    actual: o.observed_outcome === true ? 1 : 0,
                }));

            if (predictions.length < 5) {
                return {
                    status: 'INSUFFICIENT_DATA',
                    n: predictions.length,
                    minimum_needed: 5,
                };
            }

            return {
                status: 'COMPLETE',
                brier: this.brierScore(predictions),
                calibration_curve: this.calibrationBins(predictions),
                n: predictions.length,
            };
        },
    };

    // ══════════════════════════════════════════════════════
    // EMPIRICAL BAYES — Prior Recalibration at n≥20
    // ══════════════════════════════════════════════════════
    // Method of moments: estimate α, β from observed cascade rate
    // Preserves prior strength (α+β) but shifts location to match data.
    // Only recalibrates when crossing threshold (20, 50, 100).

    const EmpiricalBayes = {
        // Compute data-driven concentration from observed variance.
        // NOT a magic number. Derived from: Var(θ) = μ(1-μ)/(α+β+1)
        // So: concentration = α+β = μ(1-μ)/Var(θ) - 1
        // If observed variance is tiny → high concentration (data is consistent)
        // If observed variance is large → low concentration (data is noisy)
        // Floor: original prior concentration. Ceiling: n (can't be more confident than data allows).
        _computeConcentration(observations, observedRate) {
            const n = observations.length;
            if (n < 5) return 10; // Fallback for tiny samples

            // Compute observed variance using sliding windows
            // Split observations into blocks of 5 to estimate rate variance
            const blockSize = Math.max(3, Math.floor(n / 5));
            const blocks = [];
            for (let i = 0; i <= n - blockSize; i += blockSize) {
                const block = observations.slice(i, i + blockSize);
                const blockRate = block.filter(o => o.observed_outcome === true).length / block.length;
                blocks.push(blockRate);
            }

            if (blocks.length < 4) {
                // Not enough blocks for reliable variance estimate.
                // With 2-3 blocks, inter-block variance is noise, not signal.
                // Fall back to original prior concentration — don't pretend to know.
                return 10;
            }

            const blockMean = blocks.reduce((s, b) => s + b, 0) / blocks.length;
            const blockVar = blocks.reduce((s, b) => s + (b - blockMean) ** 2, 0) / (blocks.length - 1);

            // From Var(θ) = μ(1-μ)/(c+1), solve for c:
            // c = μ(1-μ)/Var(θ) - 1
            const mu = Math.max(0.01, Math.min(0.99, observedRate)); // Clamp to avoid 0/0
            const theoreticalMax = mu * (1 - mu);

            if (blockVar <= 0 || blockVar >= theoreticalMax) {
                // Variance is 0 (all same) or exceeds Bernoulli variance (impossible under model)
                // Use conservative concentration
                return Math.min(n, 10);
            }

            const rawConcentration = theoreticalMax / blockVar - 1;

            // Floor: 2 (very weak). Ceiling: n (can't exceed data).
            const concentration = Math.max(2, Math.min(n, rawConcentration));

            return concentration;
        },

        // Check if recalibration is needed and apply if so
        maybeRecalibrate(patternId, observations, currentPosterior) {
            const n = observations.length;
            const thresholds = [20, 50, 100, 200];
            const calibrated = loadCalibrationState();
            const lastN = calibrated[patternId] || 0;

            // Only recalibrate at threshold crossings
            const crossed = thresholds.find(t => n >= t && lastN < t);
            if (!crossed) return null;

            // Method of moments with DATA-DRIVEN concentration
            const k = observations.filter(o => o.observed_outcome === true).length;
            const observedRate = k / n;
            const concentration = this._computeConcentration(observations, observedRate);

            const originalPrior = DEFAULT_PRIORS[patternId] || DEFAULT_PRIORS.global_cascade;
            const originalConcentration = originalPrior.alpha + originalPrior.beta;

            // Blend: 70% data, 30% original (shrinkage toward prior)
            const blendedRate = 0.7 * observedRate + 0.3 * (originalPrior.alpha / originalConcentration);
            const newAlpha = Math.max(0.5, blendedRate * concentration);
            const newBeta = Math.max(0.5, (1 - blendedRate) * concentration);

            // Record recalibration
            calibrated[patternId] = n;
            saveCalibrationState(calibrated);

            // Full audit log — no hidden magic
            console.log(
                `%c[BayesianEngine] Empirical Bayes recalibration at n=${n} for ${patternId}:\n` +
                `  Prior:         Beta(${originalPrior.alpha}, ${originalPrior.beta}) | concentration=${originalConcentration}\n` +
                `  Observed:      rate=${observedRate.toFixed(4)} (${k}/${n})\n` +
                `  Data concentration: ${concentration.toFixed(2)} (from block variance)\n` +
                `  Blended rate:  ${blendedRate.toFixed(4)} (70% data / 30% prior)\n` +
                `  New prior:     Beta(${newAlpha.toFixed(2)}, ${newBeta.toFixed(2)})`,
                'color: #ff9500; font-size: 10px;'
            );

            return {
                pattern_id: patternId,
                n_at_recalibration: n,
                observed_rate: observedRate,
                old_prior: originalPrior,
                old_concentration: originalConcentration,
                new_prior: { alpha: newAlpha, beta: newBeta },
                new_concentration: concentration,
                concentration_source: 'block_variance',
                blend_ratio: '70% data / 30% original',
            };
        },

        // Force recalibration (manual trigger)
        forceRecalibrate(patternId) {
            const observations = loadObservations().filter(o =>
                o.observation_type === 'cascade_window' &&
                (o.pattern_id === patternId || patternId === 'global_cascade')
            );
            if (observations.length < 5) return null;

            const k = observations.filter(o => o.observed_outcome === true).length;
            const observedRate = k / observations.length;
            const concentration = this._computeConcentration(observations, observedRate);

            return {
                alpha: Math.max(0.5, observedRate * concentration),
                beta: Math.max(0.5, (1 - observedRate) * concentration),
                observed_rate: observedRate,
                concentration,
                concentration_source: 'block_variance',
                n: observations.length,
            };
        },
    };

    function loadCalibrationState() {
        if (typeof StateManager === 'undefined') return {};
        return StateManager.get(CALIBRATION_KEY, {});
    }

    function saveCalibrationState(state) {
        if (typeof StateManager === 'undefined') return;
        StateManager.set(CALIBRATION_KEY, state);
    }

    // ══════════════════════════════════════════════════════
    // PENDING PREDICTIONS — Deferred Evaluation (Anti-Leakage)
    // ══════════════════════════════════════════════════════
    // At scan time t:
    //   1. Record feature snapshot from [t - 6h, t]
    //   2. Record predicted probability (from current posterior)
    //   3. Set target window: [t, t + 6h]
    //   4. Do NOT record outcome yet
    //
    // At scan time t + 6h+:
    //   1. Resolve: did cascade occur in [t, t + 6h]?
    //   2. NOW record the finalized observation
    //   3. Update posterior with true outcome
    //
    // This ensures: features from X never overlap with target Y.

    function buildWindow(t) {
        return {
            feature: { start: t - FEATURE_WINDOW_MS, end: t },
            target: { start: t, end: t + PREDICTION_HORIZON_MS },
        };
    }

    function loadPending() {
        if (typeof StateManager === 'undefined') return [];
        return StateManager.get(PENDING_KEY, []);
    }

    function savePending(pending) {
        if (typeof StateManager === 'undefined') return;
        StateManager.set(PENDING_KEY, pending);
    }

    // Check if we can create a new pending prediction (anti-autocorrelation)
    function canCreatePending(pending, now) {
        if (pending.length === 0) return true;
        // Sort by creation time, get most recent
        const sorted = pending.slice().sort((a, b) => b.created_at - a.created_at);
        const last = sorted[0];
        // Minimum gap: 6h between pending predictions → non-overlapping → independent
        return (now - last.created_at) >= MIN_OBSERVATION_GAP_MS;
    }

    // Resolve pending predictions whose target window has elapsed
    function resolvePendingPredictions() {
        const pending = loadPending();
        if (pending.length === 0) return [];

        const now = Date.now();
        const resolved = [];
        const stillPending = [];

        for (const pred of pending) {
            if (now >= pred.target_window_end) {
                // Target window has elapsed — check if cascade occurred
                const cascadeOccurred = didCascadeOccurInWindow(
                    pred.target_window_start,
                    pred.target_window_end
                );

                // Record finalized observation with TRUE outcome
                const result = recordObservation({
                    observation_type: 'cascade_window',
                    intervention_type: pred.intervention_type,
                    magnitude: pred.magnitude,
                    timestamp: pred.created_at,
                    observed_outcome: cascadeOccurred,
                    noise_context: pred.noise_context + `|resolved_at:${now}|deferred:true`,
                    domain: pred.domain,
                    pattern_id: pred.pattern_id,
                    window_start: pred.feature_window_start,
                    window_end: pred.feature_window_end,
                    predicted_probability: pred.predicted_probability,
                });

                // Empirical Bayes check after recording
                if (result.success) {
                    const patternObs = loadObservations().filter(o =>
                        o.observation_type === 'cascade_window' &&
                        o.pattern_id === pred.pattern_id
                    );
                    const recal = EmpiricalBayes.maybeRecalibrate(
                        pred.pattern_id,
                        patternObs,
                        result.posteriors[pred.pattern_id]
                    );
                    if (recal) {
                        // Update the stored prior with recalibrated values
                        const posteriors = loadPosteriors();
                        posteriors[pred.pattern_id + '_recalibrated_prior'] = recal.new_prior;
                        savePosteriors(posteriors);
                    }
                }

                resolved.push({ prediction: pred, outcome: cascadeOccurred, result });
            } else {
                stillPending.push(pred);
            }
        }

        savePending(stillPending);

        if (resolved.length > 0) {
            console.log(
                `%c[BayesianEngine] Resolved ${resolved.length} pending prediction(s). ` +
                `${resolved.filter(r => r.outcome).length} cascades confirmed. ` +
                `${stillPending.length} still pending.`,
                'color: #00ff88; font-size: 10px;'
            );
        }

        return resolved;
    }

    // Check if any cascade was detected in a specific HISTORICAL time window.
    // CRITICAL: Only queries cascades whose timestamp falls WITHIN [windowStart, windowEnd].
    // Does NOT use current state or "last 6h from now".
    // This is what prevents temporal leakage on deferred resolution.
    function didCascadeOccurInWindow(windowStart, windowEnd) {
        if (typeof StateManager === 'undefined') return false;

        // Use ONLY history — active cascades are current state, not historical fact.
        // History is the permanent record. Active is the live feed.
        const history = StateManager.get('cascades_history', []);

        // Strict boundary: cascade.timestamp must be INSIDE [windowStart, windowEnd]
        const matches = history.filter(c =>
            c.timestamp >= windowStart && c.timestamp <= windowEnd
        );

        if (matches.length > 0) {
            console.log(
                `%c[BayesianEngine] Outcome resolved: ${matches.length} cascade(s) found in ` +
                `[${new Date(windowStart).toISOString().slice(0, 16)}, ${new Date(windowEnd).toISOString().slice(0, 16)}]`,
                'color: #ff6600; font-size: 10px;'
            );
        }

        return matches.length > 0;
    }

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
            predicted_probability: typeof data.predicted_probability === 'number'
                ? data.predicted_probability : null,
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

    // ══════════════════════════════════════════════════════
    // recordCascadeScan — DEFERRED EVALUATION
    // ══════════════════════════════════════════════════════
    // Does NOT immediately record outcome. Instead:
    //   1. Resolves any expired pending predictions (real outcomes)
    //   2. Creates a NEW pending prediction for the current window
    //   3. Returns resolved results (if any)
    //
    // This eliminates temporal leakage:
    //   Features from [t-6h, t] → Predict → Wait → Outcome in [t, t+6h]
    //   Feature window and target window NEVER overlap.

    function recordCascadeScan(scanResult) {
        if (!scanResult) return { resolved: [], pending_created: false };

        const now = Date.now();
        const windows = buildWindow(now);

        // STEP 1: Resolve any pending predictions whose target window has elapsed
        const resolved = resolvePendingPredictions();

        // STEP 2: Check anti-autocorrelation — minimum 6h between predictions
        const pending = loadPending();
        if (!canCreatePending(pending, now)) {
            return {
                resolved,
                pending_created: false,
                reason: 'anti_autocorrelation',
                next_eligible_at: pending.length > 0
                    ? pending.slice().sort((a, b) => b.created_at - a.created_at)[0].created_at + MIN_OBSERVATION_GAP_MS
                    : now,
            };
        }

        // STEP 3: Snapshot current signal state and create pending prediction
        const elevatedDomains = Object.keys(scanResult.elevatedDomains || {});
        let totalSeverity = 0;
        let totalSignals = 0;
        elevatedDomains.forEach(d => {
            const data = (scanResult.elevatedDomains || {})[d];
            if (data) {
                totalSeverity += data.avgSeverity || 0;
                totalSignals += data.count || 0;
            }
        });
        const avgSeverity = elevatedDomains.length > 0
            ? totalSeverity / elevatedDomains.length : 0;

        // Determine which pattern to track for this prediction
        const hasCascadesNow = (scanResult.cascades || []).length > 0;
        const patternId = hasCascadesNow
            ? scanResult.cascades[0].patternId
            : 'global_cascade';

        // Get current model prediction BEFORE seeing future outcome
        const currentProb = getCascadeProbability(patternId);
        const predictedProbability = currentProb ? currentProb.probability : null;

        // Create pending prediction
        const newPending = {
            id: now.toString(36) + '-' + Math.random().toString(36).slice(2, 8),
            created_at: now,
            pattern_id: patternId,
            intervention_type: null,
            magnitude: avgSeverity,
            domain: elevatedDomains[0] || null,
            feature_window_start: windows.feature.start,
            feature_window_end: windows.feature.end,
            target_window_start: windows.target.start,
            target_window_end: windows.target.end,
            predicted_probability: predictedProbability,
            noise_context: `auto_scan|status:${scanResult.status}|elevated:${elevatedDomains.length}|signals:${totalSignals}`,
            feature_snapshot: {
                elevated_domains: elevatedDomains,
                avg_severity: avgSeverity,
                signal_count: totalSignals,
                cascades_detected_now: hasCascadesNow,
                cascade_count: (scanResult.cascades || []).length,
            },
        };

        pending.push(newPending);
        savePending(pending);

        console.log(
            `%c[BayesianEngine] Pending prediction created. ` +
            `Pattern: ${patternId} | P(cascade): ${predictedProbability !== null ? predictedProbability.toFixed(3) : 'prior'} | ` +
            `Target window closes: ${new Date(windows.target.end).toISOString().slice(11, 16)} | ` +
            `Queue: ${pending.length} pending`,
            'color: #00d4ff; font-size: 10px;'
        );

        return {
            resolved,
            pending_created: true,
            prediction: {
                id: newPending.id,
                pattern_id: patternId,
                predicted_probability: predictedProbability,
                target_closes_at: windows.target.end,
            },
        };
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
        const pending = loadPending();

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

        // Calibration metrics (Brier score + calibration curve)
        const calibration = CalibrationMetrics.fromObservations(cascadeObs);

        // Effective n (independent observations only — not autocorrelated)
        const effectiveN = cascadeObs.length; // Already enforced by MIN_OBSERVATION_GAP_MS

        return {
            engine_version: '2.0',
            total_observations: observations.length,
            effective_n: effectiveN,
            pending_predictions: pending.length,
            breakdown: {
                cascade_windows: cascadeObs.length,
                severity_readings: severityObs.length,
                interventions: interventionObs.length,
            },
            cascade_estimates: cascadeEstimates,
            calibration,
            intervention_types_observed: interventionTypes,
            posteriors_stored: Object.keys(posteriors).length,
            priors: DEFAULT_PRIORS,
            temporal_discipline: {
                feature_window_hours: FEATURE_WINDOW_MS / 3600000,
                prediction_horizon_hours: PREDICTION_HORIZON_MS / 3600000,
                min_observation_gap_hours: MIN_OBSERVATION_GAP_MS / 3600000,
                deferred_evaluation: true,
                anti_autocorrelation: true,
                empirical_bayes_threshold: EMPIRICAL_BAYES_THRESHOLD,
            },
            data_sufficient_for: {
                brier_score: cascadeObs.length >= 5,
                posterior_predictive_check: cascadeObs.length >= 5,
                empirical_bayes: cascadeObs.length >= EMPIRICAL_BAYES_THRESHOLD,
                hierarchical_model: cascadeObs.length >= 30,
                bayes_factor: interventionTypes.length > 0 && cascadeObs.length >= 10,
                matrix_R_estimation: cascadeObs.length >= 40,
            },
            timestamp: Date.now(),
        };
    }

    // ══════════════════════════════════════════════════════
    // SEED DATASET — Offline Historical Data Loader
    // ══════════════════════════════════════════════════════
    // Load a pre-built JSON dataset to bootstrap the engine
    // with n=30+ observations WITHOUT waiting for live scans.
    //
    // Expected JSON schema per record:
    // {
    //   date:        "2022-02-24",           // ISO date string
    //   timestamp:   1645660800000,           // ms epoch (auto-computed from date if missing)
    //   event:       "Russia invades Ukraine",// Human-readable event description
    //   return_pct:  8.7,                     // Brent abs % change (or metric value)
    //   label:       1,                       // 1 = cascade, 0 = no cascade
    //   source:      "ICE Brent",             // Data source
    //   pattern_id:  "economic-geopolitical-shock",
    //   notes:       "Crude spiked on invasion" // Optional context
    // }
    //
    // The loader validates every record against LABEL_DEFINITIONS,
    // applies the cutoff, and flags any label/metric inconsistencies.

    const SEED_KEY = 'bayesian_seed_loaded';

    const SeedDataset = {
        // Validate a single seed record
        validateRecord(record, index) {
            const errors = [];
            if (!record.date && !record.timestamp) {
                errors.push(`Record ${index}: needs date or timestamp`);
            }
            if (typeof record.return_pct !== 'number') {
                errors.push(`Record ${index}: return_pct must be a number`);
            }
            if (record.label !== 0 && record.label !== 1) {
                errors.push(`Record ${index}: label must be 0 or 1`);
            }
            if (!record.pattern_id) {
                errors.push(`Record ${index}: pattern_id is required`);
            }
            return errors;
        },

        // Cross-check label against metric and cutoff
        checkLabelConsistency(record) {
            const labelDef = LABEL_DEFINITIONS[record.pattern_id];
            if (!labelDef) return { consistent: true, note: 'no label definition for pattern' };

            const computedLabel = applyLabel(labelDef, record.return_pct) ? 1 : 0;
            return {
                consistent: computedLabel === record.label,
                computed: computedLabel,
                provided: record.label,
                metric_value: record.return_pct,
                cutoff: labelDef.cutoff,
                note: computedLabel !== record.label
                    ? `MISMATCH: metric ${record.return_pct} vs cutoff ${labelDef.cutoff} → computed ${computedLabel}, provided ${record.label}`
                    : 'ok',
            };
        },

        // Load a seed dataset JSON array and convert to observations
        // Returns: { loaded, skipped, errors, inconsistencies, threshold_analysis }
        load(seedRecords, options = {}) {
            const {
                patternId = 'economic-geopolitical-shock',
                clearExisting = false,
                dryRun = false,
            } = options;

            if (!Array.isArray(seedRecords) || seedRecords.length === 0) {
                return { loaded: 0, error: 'seedRecords must be a non-empty array' };
            }

            const allErrors = [];
            const inconsistencies = [];
            const valid = [];

            // Validate all records first
            for (let i = 0; i < seedRecords.length; i++) {
                const record = seedRecords[i];
                const errs = this.validateRecord(record, i);
                if (errs.length > 0) {
                    allErrors.push(...errs);
                    continue;
                }

                // Check label consistency
                const consistency = this.checkLabelConsistency(record);
                if (!consistency.consistent) {
                    inconsistencies.push({ index: i, record, ...consistency });
                }

                valid.push(record);
            }

            // Threshold analysis: count events above/below cutoff
            const labelDef = LABEL_DEFINITIONS[patternId];
            const thresholdAnalysis = this._analyzeThreshold(valid, labelDef);

            if (dryRun) {
                return {
                    loaded: 0,
                    would_load: valid.length,
                    skipped: seedRecords.length - valid.length,
                    errors: allErrors,
                    inconsistencies,
                    threshold_analysis: thresholdAnalysis,
                    dry_run: true,
                };
            }

            // Clear existing if requested
            if (clearExisting) {
                saveObservations([]);
                savePosteriors({});
            }

            // Convert to observations and load sequentially (temporal order)
            const sorted = valid.slice().sort((a, b) => {
                const tA = a.timestamp || new Date(a.date).getTime();
                const tB = b.timestamp || new Date(b.date).getTime();
                return tA - tB;
            });

            let loaded = 0;
            for (const record of sorted) {
                const ts = record.timestamp || new Date(record.date).getTime();
                if (isNaN(ts)) continue;

                const result = recordObservation({
                    observation_type: 'cascade_window',
                    intervention_type: record.event || null,
                    magnitude: Math.abs(record.return_pct),
                    timestamp: ts,
                    observed_outcome: record.label === 1,
                    noise_context: `seed|source:${record.source || 'unknown'}|notes:${record.notes || ''}`,
                    domain: 'economy',
                    pattern_id: record.pattern_id || patternId,
                    window_start: ts - FEATURE_WINDOW_MS,
                    window_end: ts,
                    predicted_probability: null, // No prediction for seed data — this is training
                });

                if (result.success) loaded++;
            }

            // Mark seed as loaded
            if (typeof StateManager !== 'undefined') {
                StateManager.set(SEED_KEY, {
                    loaded_at: Date.now(),
                    n_records: loaded,
                    pattern_id: patternId,
                    source: 'seed_dataset',
                });
            }

            console.log(
                `%c[BayesianEngine] Seed dataset loaded: ${loaded}/${seedRecords.length} records. ` +
                `${inconsistencies.length} label inconsistencies. ` +
                `Threshold analysis: ${thresholdAnalysis.events_above_cutoff} events above cutoff.`,
                'color: #00ff88; font-weight: bold; font-size: 11px;'
            );

            return {
                loaded,
                skipped: seedRecords.length - loaded,
                errors: allErrors,
                inconsistencies,
                threshold_analysis: thresholdAnalysis,
            };
        },

        // Analyze threshold distribution
        _analyzeThreshold(records, labelDef) {
            if (!labelDef || records.length === 0) {
                return { status: 'no_label_definition' };
            }

            const values = records
                .map(r => Math.abs(r.return_pct))
                .sort((a, b) => a - b);

            const n = values.length;
            const aboveCutoff = values.filter(v => v >= labelDef.cutoff).length;
            const belowCutoff = n - aboveCutoff;
            const rate = aboveCutoff / n;

            // Percentiles
            const p25 = values[Math.floor(n * 0.25)];
            const p50 = values[Math.floor(n * 0.50)];
            const p75 = values[Math.floor(n * 0.75)];
            const p90 = values[Math.floor(n * 0.90)];
            const p95 = values[Math.floor(n * 0.95)];
            const p99 = values[Math.floor(n * 0.99)];
            const max = values[n - 1];
            const mean = values.reduce((s, v) => s + v, 0) / n;

            // Verdict on cutoff
            let verdict;
            if (rate < 0.02) verdict = 'TOO_RARE — cutoff too high, <2% of data. Lower it.';
            else if (rate < 0.05) verdict = 'RARE — works for tail-event detection, small n per year.';
            else if (rate <= 0.15) verdict = 'GOOD — 5-15% base rate. Enough events to learn from.';
            else if (rate <= 0.30) verdict = 'MODERATE — 15-30% base rate. Decent signal.';
            else verdict = 'TOO_COMMON — cutoff too low, >30% of data. Raise it.';

            return {
                metric: labelDef.metric,
                cutoff: labelDef.cutoff,
                n_total: n,
                events_above_cutoff: aboveCutoff,
                events_below_cutoff: belowCutoff,
                base_rate: Math.round(rate * 10000) / 10000,
                percentiles: { p25, p50, p75, p90, p95, p99, max },
                mean: Math.round(mean * 1000) / 1000,
                verdict,
            };
        },

        // Check if seed data has been loaded
        isLoaded() {
            if (typeof StateManager === 'undefined') return false;
            return !!StateManager.get(SEED_KEY, null);
        },
    };

    // ══════════════════════════════════════════════════════
    // WALK-FORWARD VALIDATION — No Retrospective Illusion
    // ══════════════════════════════════════════════════════
    // Simulates expanding-window temporal validation:
    //   1. Start with initial training set (e.g., 2010-2015)
    //   2. Train model (update posteriors)
    //   3. Predict next period (e.g., 2016)
    //   4. Score predictions against actual outcomes
    //   5. Expand window, repeat
    //
    // This is the ONLY honest way to evaluate the model.
    // Full-sample Brier scores are self-deception.

    const WalkForward = {
        // Run walk-forward validation on a seed dataset
        // splitYear: first test year (e.g., 2016)
        // stepYears: how many years per test fold (e.g., 1)
        run(observations, options = {}) {
            const {
                splitYear = 2016,
                stepMonths = 12,
                patternId = 'economic-geopolitical-shock',
            } = options;

            // Sort by timestamp
            const sorted = observations
                .filter(o => o.observation_type === 'cascade_window')
                .slice()
                .sort((a, b) => a.timestamp - b.timestamp);

            if (sorted.length < 10) {
                return { error: 'Need at least 10 observations for walk-forward', n: sorted.length };
            }

            const splitTs = new Date(`${splitYear}-01-01`).getTime();
            const stepMs = stepMonths * 30.44 * 24 * 60 * 60 * 1000;

            const folds = [];
            let currentSplit = splitTs;

            while (true) {
                const train = sorted.filter(o => o.timestamp < currentSplit);
                const test = sorted.filter(o =>
                    o.timestamp >= currentSplit && o.timestamp < currentSplit + stepMs
                );

                if (train.length < 5 || test.length === 0) {
                    if (folds.length === 0) {
                        currentSplit += stepMs;
                        if (currentSplit > sorted[sorted.length - 1].timestamp) break;
                        continue;
                    }
                    break;
                }

                // Train: compute posterior from training data
                const prior = DEFAULT_PRIORS[patternId] || DEFAULT_PRIORS.global_cascade;
                const trainK = train.filter(o => o.observed_outcome === true).length;
                const trainN = train.length;
                const posterior = BetaBinomial.updateBatch(
                    { ...prior },
                    train.map(o => o.observed_outcome === true)
                );
                const predictedProb = BetaBinomial.mean(posterior);

                // Test: evaluate on test data
                const testK = test.filter(o => o.observed_outcome === true).length;
                const testN = test.length;
                const actualRate = testK / testN;

                // Brier score for this fold
                let brierSum = 0;
                for (const obs of test) {
                    const actual = obs.observed_outcome === true ? 1 : 0;
                    brierSum += (predictedProb - actual) ** 2;
                }
                const foldBrier = brierSum / testN;

                // Baseline: predict historical rate (frequency-based)
                const baselineProb = trainK / trainN;
                let baselineBrierSum = 0;
                for (const obs of test) {
                    const actual = obs.observed_outcome === true ? 1 : 0;
                    baselineBrierSum += (baselineProb - actual) ** 2;
                }
                const baselineBrier = baselineBrierSum / testN;

                const foldDate = new Date(currentSplit);
                folds.push({
                    fold: folds.length + 1,
                    period: `${foldDate.getFullYear()}-${String(foldDate.getMonth() + 1).padStart(2, '0')}`,
                    train_n: trainN,
                    train_k: trainK,
                    train_rate: Math.round(trainK / trainN * 10000) / 10000,
                    test_n: testN,
                    test_k: testK,
                    test_rate: Math.round(actualRate * 10000) / 10000,
                    predicted_prob: Math.round(predictedProb * 10000) / 10000,
                    posterior: { alpha: posterior.alpha, beta: posterior.beta },
                    brier_bayesian: Math.round(foldBrier * 10000) / 10000,
                    brier_baseline: Math.round(baselineBrier * 10000) / 10000,
                    lift: baselineBrier > 0
                        ? Math.round((1 - foldBrier / baselineBrier) * 10000) / 10000
                        : 0,
                });

                currentSplit += stepMs;
            }

            if (folds.length === 0) {
                return { error: 'No valid folds generated. Check splitYear and data range.' };
            }

            // Aggregate metrics across folds
            const avgBayesian = folds.reduce((s, f) => s + f.brier_bayesian, 0) / folds.length;
            const avgBaseline = folds.reduce((s, f) => s + f.brier_baseline, 0) / folds.length;
            const avgLift = avgBaseline > 0 ? (1 - avgBayesian / avgBaseline) : 0;

            // Weighted by test set size
            const totalTestN = folds.reduce((s, f) => s + f.test_n, 0);
            const wBayesian = folds.reduce((s, f) => s + f.brier_bayesian * f.test_n, 0) / totalTestN;
            const wBaseline = folds.reduce((s, f) => s + f.brier_baseline * f.test_n, 0) / totalTestN;
            const wLift = wBaseline > 0 ? (1 - wBayesian / wBaseline) : 0;

            return {
                n_folds: folds.length,
                total_train: sorted.filter(o => o.timestamp < folds[folds.length - 1].period).length,
                total_test: totalTestN,
                folds,
                aggregate: {
                    mean_brier_bayesian: Math.round(avgBayesian * 10000) / 10000,
                    mean_brier_baseline: Math.round(avgBaseline * 10000) / 10000,
                    mean_lift: Math.round(avgLift * 10000) / 10000,
                    weighted_brier_bayesian: Math.round(wBayesian * 10000) / 10000,
                    weighted_brier_baseline: Math.round(wBaseline * 10000) / 10000,
                    weighted_lift: Math.round(wLift * 10000) / 10000,
                },
                verdict: this._verdict(avgLift, folds.length),
            };
        },

        _verdict(avgLift, nFolds) {
            if (nFolds < 3) return 'INSUFFICIENT_FOLDS — need at least 3 folds for meaningful evaluation.';
            if (avgLift > 0.15) return 'STRONG_IMPROVEMENT — Bayesian model materially outperforms baseline.';
            if (avgLift > 0.05) return 'MODEST_IMPROVEMENT — Bayesian model slightly better than baseline.';
            if (avgLift > -0.05) return 'NO_DIFFERENCE — Bayesian model performs similarly to baseline.';
            return 'WORSE — Bayesian model underperforms baseline. Check priors and data quality.';
        },
    };

    // ══════════════════════════════════════════════════════
    // BASELINE COMPARISON — Heuristic vs Bayesian
    // ══════════════════════════════════════════════════════
    // The baseline is the current CascadeDetector heuristic:
    //   - Fixed severity thresholds (keyword-based)
    //   - Fixed pattern weights (baseWeight)
    //   - No posterior updating
    //
    // To prove the BayesianEngine adds value, it must beat
    // this baseline on out-of-sample Brier score.

    const BaselineComparison = {
        // Compute baseline predictions from cascade pattern weights
        // The heuristic "probability" is: baseWeight-derived fixed estimate
        baselinePrediction(patternId) {
            const weights = {
                'economic-geopolitical-shock': 1.4,
                'climate-economic-cascade': 1.3,
                'tech-epistemic-erosion': 1.2,
                'social-geopolitical-instability': 1.3,
                'full-spectrum-crisis': 2.0,
                'climate-social-displacement': 1.2,
                'tech-economic-disruption': 1.1,
                'epistemic-geopolitical-warfare': 1.5,
                'equity-geopolitical-shock': 1.3,
                'novel-cascade': 1.5,
                'global_cascade': 1.3,
            };
            // Normalize baseWeight to [0, 1] range
            // baseWeight range is [1.0, 2.0], map to probability [0.05, 0.50]
            const w = weights[patternId] || 1.3;
            return 0.05 + (w - 1.0) * 0.45; // Linear map: 1.0→0.05, 2.0→0.50
        },

        // Full comparison: baseline vs Bayesian on all observations
        compare(patternId) {
            const observations = loadObservations().filter(o =>
                o.observation_type === 'cascade_window' &&
                (o.pattern_id === patternId || patternId === 'global')
            );

            if (observations.length < 5) {
                return { error: 'Need at least 5 observations', n: observations.length };
            }

            const baselineProb = this.baselinePrediction(patternId || 'global_cascade');
            const bayesianProb = getCascadeProbability(patternId || 'global_cascade');

            let brierBaseline = 0;
            let brierBayesian = 0;
            const n = observations.length;

            for (const obs of observations) {
                const actual = obs.observed_outcome === true ? 1 : 0;
                brierBaseline += (baselineProb - actual) ** 2;
                const predP = obs.predicted_probability !== null
                    ? obs.predicted_probability
                    : (bayesianProb ? bayesianProb.probability : baselineProb);
                brierBayesian += (predP - actual) ** 2;
            }

            brierBaseline /= n;
            brierBayesian /= n;

            const lift = brierBaseline > 0 ? (1 - brierBayesian / brierBaseline) : 0;

            return {
                pattern_id: patternId,
                n_observations: n,
                baseline: {
                    method: 'fixed_weight_heuristic',
                    probability: baselineProb,
                    brier: Math.round(brierBaseline * 10000) / 10000,
                },
                bayesian: {
                    method: 'beta_binomial_conjugate',
                    probability: bayesianProb ? bayesianProb.probability : null,
                    brier: Math.round(brierBayesian * 10000) / 10000,
                    effective_n: bayesianProb ? bayesianProb.effective_n : 0,
                },
                lift: Math.round(lift * 10000) / 10000,
                lift_pct: Math.round(lift * 100 * 100) / 100,
                verdict: lift > 0.15 ? 'BAYESIAN_WINS'
                       : lift > 0.05 ? 'BAYESIAN_SLIGHT_EDGE'
                       : lift > -0.05 ? 'TIE'
                       : 'BASELINE_WINS',
            };
        },
    };

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
        recordCascadeScan,         // Deferred evaluation — no temporal leakage
        resolvePendingPredictions, // Manual trigger for pending resolution
        getCascadeProbability,
        getSeverityEstimate,

        // Model checking & calibration
        checkCalibration,
        testIntervention,
        getCalibrationReport: () => CalibrationMetrics.fromObservations(loadObservations()),
        getBrierScore: () => {
            const obs = loadObservations().filter(o => o.observation_type === 'cascade_window');
            return CalibrationMetrics.fromObservations(obs);
        },

        // Empirical Bayes
        recalibratePrior: (patternId) => EmpiricalBayes.forceRecalibrate(patternId),

        // Seed dataset
        loadSeedDataset: (records, opts) => SeedDataset.load(records, opts),
        validateSeedRecord: (record, i) => SeedDataset.validateRecord(record, i),
        isSeedLoaded: () => SeedDataset.isLoaded(),

        // Walk-forward validation
        walkForward: (opts) => WalkForward.run(loadObservations(), opts),

        // Baseline comparison
        compareBaseline: (patternId) => BaselineComparison.compare(patternId),
        baselinePrediction: (patternId) => BaselineComparison.baselinePrediction(patternId),

        // Status & audit
        getStatus,
        getPosterior,
        getPendingCount: () => loadPending().length,
        getPending: () => loadPending(),

        // Window construction (exposed for testing/debugging)
        buildWindow,

        // Direct model access (for advanced use)
        models: {
            BetaBinomial,
            NormalNormal,
            BayesFactor,
            PosteriorPredictiveCheck,
            CalibrationMetrics,
            EmpiricalBayes,
            SeedDataset,
            WalkForward,
            BaselineComparison,
        },

        // Math utilities (exposed for testing)
        math: Math2,

        // Schema & Labels
        SCHEMA_FIELDS,
        VALID_OBSERVATION_TYPES,
        DEFAULT_PRIORS,
        LABEL_DEFINITIONS,
        applyLabel,

        // Re-init (e.g., after StateManager loads)
        init,
    };
})();
