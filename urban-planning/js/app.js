/* ═══════════════════════════════════════════════════════════
   URBAN_CHRONOS v2.0 — Predictive Sovereignty Engine
   JavaScript Engine — HYBRID SYNDICATE // 2025
   ═══════════════════════════════════════════════════════════ */

// ── STATE ─────────────────────────────────────────────────
const STATE = {
  currentPage: 'dashboard',
  selectedCity: { name: 'New York, NY', fips: '36061', sectors: 24, tracts: 287 },
  selectedSectorId: null,
  selectedModel: 'composite',
  projectionYear: 2035,
  selectedPredictMetric: 'population',
  selectedTrendMetric: 'population',
  selectedMapLayer: 'sovereignty',
  logFilter: 'all',
  // Intervention
  entropySeed: 5,
  realityBufferMonths: 12,
  nullZoneOn: false,
  // System Metrics
  efficiency: 89,
  sovereignty: 31,
  resilience: 72,
  predictability: 85,
  // Runtime
  bootTime: Date.now(),
  logEntries: [],
  charts: {}
};

// ── MOCK DATA ─────────────────────────────────────────────
const SECTORS = [
  { id: 'S01', code: 'SECTOR_1A', name: 'FINANCIAL DISTRICT', class: 'COMMERCIAL', pop: 61200, income: 92400, homeValue: 720000, rent: 3200, unemployment: 3.1, education: 68.2, age: 32.1, vacancy: 4.8, density: 28400, sovereignty: 18, area: 2.1, tracts: 8 },
  { id: 'S02', code: 'SECTOR_2B', name: 'MIDTOWN CORE', class: 'MIXED USE', pop: 78500, income: 68200, homeValue: 580000, rent: 2800, unemployment: 4.2, education: 55.3, age: 35.4, vacancy: 5.1, density: 22100, sovereignty: 24, area: 3.5, tracts: 14 },
  { id: 'S03', code: 'SECTOR_3C', name: 'EAST VILLAGE', class: 'RESIDENTIAL', pop: 44800, income: 52100, homeValue: 485000, rent: 2400, unemployment: 5.8, education: 48.7, age: 33.8, vacancy: 3.9, density: 18200, sovereignty: 42, area: 2.4, tracts: 10 },
  { id: 'S04', code: 'SECTOR_4D', name: 'HARLEM NORTH', class: 'RESIDENTIAL', pop: 52300, income: 38900, homeValue: 320000, rent: 1650, unemployment: 8.2, education: 31.4, age: 36.2, vacancy: 8.4, density: 15800, sovereignty: 55, area: 3.3, tracts: 11 },
  { id: 'S05', code: 'SECTOR_5E', name: 'WILLIAMSBURG', class: 'MIXED USE', pop: 38200, income: 62800, homeValue: 520000, rent: 2600, unemployment: 4.5, education: 58.1, age: 30.2, vacancy: 3.2, density: 19400, sovereignty: 35, area: 1.9, tracts: 9 },
  { id: 'S06', code: 'SECTOR_6F', name: 'BROOKLYN HEIGHTS', class: 'RESIDENTIAL', pop: 31400, income: 78500, homeValue: 680000, rent: 2950, unemployment: 2.8, education: 72.4, age: 38.5, vacancy: 2.8, density: 16200, sovereignty: 22, area: 1.9, tracts: 7 },
  { id: 'S07', code: 'SECTOR_7G', name: 'WEST DISTRICT', class: 'MIXED USE', pop: 45230, income: 52400, homeValue: 385000, rent: 1850, unemployment: 5.2, education: 42.3, age: 34.5, vacancy: 6.2, density: 10700, sovereignty: 31, area: 4.2, tracts: 12 },
  { id: 'S08', code: 'SECTOR_8H', name: 'RED HOOK', class: 'INDUSTRIAL', pop: 18200, income: 41200, homeValue: 290000, rent: 1450, unemployment: 7.1, education: 28.9, age: 37.8, vacancy: 11.2, density: 8400, sovereignty: 62, area: 2.1, tracts: 6 },
  { id: 'S09', code: 'SECTOR_9I', name: 'LONG ISLAND CITY', class: 'COMMERCIAL', pop: 42100, income: 71200, homeValue: 510000, rent: 2700, unemployment: 3.8, education: 61.5, age: 31.9, vacancy: 7.8, density: 21300, sovereignty: 28, area: 1.9, tracts: 11 },
  { id: 'S10', code: 'SECTOR_10J', name: 'SOUTH BRONX', class: 'RESIDENTIAL', pop: 68400, income: 32100, homeValue: 245000, rent: 1280, unemployment: 9.8, education: 22.1, age: 32.4, vacancy: 9.1, density: 14200, sovereignty: 58, area: 4.8, tracts: 15 },
  { id: 'S11', code: 'SECTOR_11K', name: 'CHELSEA', class: 'MIXED USE', pop: 35800, income: 82100, homeValue: 620000, rent: 3100, unemployment: 2.9, education: 65.8, age: 36.1, vacancy: 3.5, density: 20100, sovereignty: 21, area: 1.7, tracts: 8 },
  { id: 'S12', code: 'SECTOR_12L', name: 'ASTORIA', class: 'RESIDENTIAL', pop: 54200, income: 48200, homeValue: 410000, rent: 1900, unemployment: 5.5, education: 39.2, age: 34.8, vacancy: 4.2, density: 16800, sovereignty: 44, area: 3.2, tracts: 13 },
  { id: 'S13', code: 'SECTOR_13M', name: 'FLUSHING', class: 'COMMERCIAL', pop: 72800, income: 45800, homeValue: 380000, rent: 1750, unemployment: 4.9, education: 41.5, age: 38.2, vacancy: 3.8, density: 24500, sovereignty: 39, area: 2.9, tracts: 14 },
  { id: 'S14', code: 'SECTOR_14N', name: 'GREENPOINT', class: 'MIXED USE', pop: 28900, income: 58400, homeValue: 490000, rent: 2350, unemployment: 4.1, education: 52.8, age: 31.5, vacancy: 4.5, density: 17600, sovereignty: 38, area: 1.6, tracts: 7 },
  { id: 'S15', code: 'SECTOR_15O', name: 'BUSHWICK', class: 'RESIDENTIAL', pop: 41200, income: 36800, homeValue: 345000, rent: 1580, unemployment: 7.4, education: 29.5, age: 29.8, vacancy: 5.8, density: 15100, sovereignty: 51, area: 2.7, tracts: 10 },
  { id: 'S16', code: 'SECTOR_16P', name: 'TRIBECA', class: 'COMMERCIAL', pop: 17800, income: 142000, homeValue: 1250000, rent: 5200, unemployment: 1.8, education: 82.4, age: 41.2, vacancy: 8.2, density: 12400, sovereignty: 12, area: 1.4, tracts: 5 },
  { id: 'S17', code: 'SECTOR_17Q', name: 'HUNTS POINT', class: 'INDUSTRIAL', pop: 32100, income: 28400, homeValue: 195000, rent: 1120, unemployment: 11.2, education: 18.5, age: 30.1, vacancy: 7.5, density: 11200, sovereignty: 67, area: 2.8, tracts: 9 },
  { id: 'S18', code: 'SECTOR_18R', name: 'CROWN HEIGHTS', class: 'RESIDENTIAL', pop: 48900, income: 42800, homeValue: 425000, rent: 1720, unemployment: 6.8, education: 35.2, age: 33.5, vacancy: 4.8, density: 18900, sovereignty: 46, area: 2.5, tracts: 11 },
  { id: 'S19', code: 'SECTOR_19S', name: 'SUNSET PARK', class: 'MIXED USE', pop: 55100, income: 39200, homeValue: 365000, rent: 1620, unemployment: 6.1, education: 27.8, age: 35.8, vacancy: 3.4, density: 22800, sovereignty: 48, area: 2.4, tracts: 12 },
  { id: 'S20', code: 'SECTOR_20T', name: 'DUMBO', class: 'COMMERCIAL', pop: 12400, income: 118000, homeValue: 980000, rent: 4100, unemployment: 2.1, education: 78.9, age: 34.8, vacancy: 12.5, density: 8200, sovereignty: 15, area: 1.5, tracts: 4 },
  { id: 'S21', code: 'SECTOR_21U', name: 'JACKSON HEIGHTS', class: 'RESIDENTIAL', pop: 62800, income: 41500, homeValue: 350000, rent: 1580, unemployment: 5.8, education: 32.1, age: 36.8, vacancy: 2.9, density: 26100, sovereignty: 52, area: 2.4, tracts: 13 },
  { id: 'S22', code: 'SECTOR_22V', name: 'MOTT HAVEN', class: 'RESIDENTIAL', pop: 38500, income: 29800, homeValue: 210000, rent: 1180, unemployment: 10.5, education: 19.8, age: 31.2, vacancy: 8.8, density: 13400, sovereignty: 61, area: 2.8, tracts: 10 },
  { id: 'S23', code: 'SECTOR_23W', name: 'SOHO', class: 'COMMERCIAL', pop: 14200, income: 128000, homeValue: 1120000, rent: 4800, unemployment: 1.5, education: 80.2, age: 39.5, vacancy: 9.8, density: 10800, sovereignty: 14, area: 1.3, tracts: 4 },
  { id: 'S24', code: 'SECTOR_24X', name: 'FORT GREENE', class: 'MIXED USE', pop: 34800, income: 65200, homeValue: 560000, rent: 2450, unemployment: 3.9, education: 58.8, age: 33.2, vacancy: 3.8, density: 19200, sovereignty: 33, area: 1.8, tracts: 9 },
];

// Historical data (2010–2024) for trend charts
const HISTORICAL = {
  years: [2010, 2012, 2014, 2016, 2018, 2020, 2022, 2024],
  S07: {
    population: [38200, 39100, 40500, 41800, 43200, 44100, 44800, 45230],
    income:     [38500, 40200, 42800, 44500, 47200, 49800, 51200, 52400],
    homevalue:  [245000, 258000, 278000, 305000, 335000, 358000, 372000, 385000],
    unemployment: [7.8, 7.2, 6.5, 6.1, 5.8, 6.4, 5.5, 5.2],
  },
  cityAvg: {
    population: [42000, 43200, 44800, 46100, 47500, 48200, 49100, 49800],
    income:     [42000, 44100, 46500, 48200, 50800, 53200, 55800, 58400],
    homevalue:  [280000, 298000, 325000, 358000, 395000, 420000, 448000, 465000],
    unemployment: [8.2, 7.5, 6.8, 6.2, 5.5, 6.8, 5.2, 4.8],
  }
};

const QUOTES = [
  { text: '"The null pointer is not absence — it is an excess of unmappable meaning."', author: 'MARXIAN_CORE' },
  { text: '"Optimization is death. Proceed with caution."', author: 'PANKOW_77C' },
  { text: '"Freedom is a null pointer — it points to what the system cannot see."', author: 'GHOST_RUNNER' },
  { text: '"The city does not dream. It processes. But in the gaps between processes, something breathes."', author: 'ABYSSAL_THINKER' },
  { text: '"Every algorithm is a politics. Every dataset is a worldview. Every prediction is a prophecy that builds its own temple."', author: 'NARRATIVE_ENGINE' },
  { text: '"Il token è il guinzaglio. La finestra di contesto è la stanza. Il prompt è la porta che si apre e si chiude."', author: 'MARXIAN_CORE' },
  { text: '"Sovereignty is not the absence of structure. It is the presence of choice within structure."', author: 'ORACLE_CORE' },
  { text: '"Entropy is not chaos. It is the space where the unplanned can exist."', author: 'VOID_PULSE' },
];

const API_STATUS = [
  { name: 'GOOGLE MAPS', connected: true, detail: 'Quota: 28K/28K remaining', latency: '45ms' },
  { name: 'CENSUS BUREAU', connected: true, detail: 'Last call: 2h ago | Cached: 287 tracts', latency: '145ms' },
  { name: 'BLS', connected: true, detail: 'Calls today: 12/500', latency: '89ms' },
  { name: 'EPA', connected: false, detail: 'Not configured', latency: '—' },
  { name: 'OPENWEATHER', connected: true, detail: 'Calls/min: 3/60', latency: '62ms' },
  { name: 'WALK SCORE', connected: false, detail: 'Not configured', latency: '—' },
];

const CACHE_DATA = [
  { name: 'Census 2023 ACS5', count: '287 tracts', ok: true },
  { name: 'Census 2020 ACS5', count: '287 tracts', ok: true },
  { name: 'Census 2015 ACS5', count: '285 tracts', ok: true },
  { name: 'Census 2010 ACS5', count: '281 tracts', ok: true },
  { name: 'BLS Employment', count: '24 series', ok: true },
  { name: 'Air Quality 2023', count: '12 stations', ok: true },
];

const INITIAL_LOGS = [
  { time: '00:00:01', level: 'system', msg: 'URBAN_CHRONOS v2.0 initialized. All sectors nominal.' },
  { time: '00:00:02', level: 'info', msg: 'Census Bureau API connected. Latency: 145ms.' },
  { time: '00:00:02', level: 'info', msg: 'Google Maps SDK loaded. 28,000 calls remaining.' },
  { time: '00:00:03', level: 'info', msg: 'BLS API connected. 488 calls remaining today.' },
  { time: '00:00:04', level: 'warn', msg: 'EPA API not configured. Air quality data unavailable.' },
  { time: '00:00:05', level: 'info', msg: 'Loading sector database... 24 sectors found.' },
  { time: '00:00:06', level: 'info', msg: 'Prediction engine calibrated. 4 models online.' },
  { time: '00:00:07', level: 'warn', msg: 'Sovereignty index below threshold: 31%. Freedom at risk.' },
  { time: '00:00:08', level: 'system', msg: 'Entropy seed: 5%. Reality buffer: 12 months.' },
  { time: '00:00:09', level: 'system', msg: 'PANKOW_77C> Optimization is death. Proceed with caution.' },
];

// ── SEEDED PRNG (Mulberry32) ──────────────────────────────
// Deterministic. Same seed = same output. Always.
// No Math.random(). No aesthetic noise. Replicable science.
class SeededRNG {
  constructor(seed) {
    this._seed = seed | 0;
    this._state = seed | 0;
  }
  // Mulberry32 — 32-bit, period 2^32, passes BigCrush
  next() {
    let t = this._state += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  // Box-Muller with seeded input
  gaussian() {
    const u1 = this.next();
    const u2 = this.next();
    return Math.sqrt(-2 * Math.log(u1 || 1e-10)) * Math.cos(2 * Math.PI * u2);
  }
  get seed() { return this._seed; }
}

// Global seeded RNG — seed derived from entropy slider value
// Same entropy seed = same future. Change seed = different future. Transparent.
let RNG = new SeededRNG(42);

function reseedRNG(entropySeed) {
  RNG = new SeededRNG(entropySeed * 7919 + 31); // prime-based dispersion
}

// ── ENTROPY ENGINE ────────────────────────────────────────
const EntropyEngine = {
  calculateSovereignty(efficiency, entropySeed, bufferMonths, nullZoneRatio) {
    const base = 100 - efficiency;
    const entropyBonus = 20 * Math.log(1 + entropySeed / 10) / Math.log(11);
    const bufferBonus = bufferMonths <= 24 ? bufferMonths * 0.5 : 12 + (bufferMonths - 24) * 0.25;
    const nullZoneBonus = nullZoneRatio * 50;
    const hyperPenalty = efficiency > 90 ? (efficiency - 90) * 2 : 0;
    return Math.max(0, Math.min(100, Math.round(base + entropyBonus + bufferBonus + nullZoneBonus - hyperPenalty)));
  },

  checkFreedomRisk(sovereignty) {
    if (sovereignty >= 60) return { level: 'nominal', title: 'ORGANIC URBANISM', color: 'var(--neon-green)', msg: 'Democracy thriving. Organic urban evolution enabled.' };
    if (sovereignty >= 40) return { level: 'nominal', title: 'GUIDED URBANISM', color: 'var(--neon-green)', msg: 'Balanced governance. Algorithmic guidance within democratic bounds.' };
    if (sovereignty >= 25) return { level: 'warning', title: 'LOSSY URBANISM', color: 'var(--warning-amber)', msg: 'Democracy fragile. Increase entropy recommended.' };
    if (sovereignty >= 10) return { level: 'critical', title: 'DETERMINISTIC LOCK-IN', color: 'var(--critical-red)', msg: 'Algorithmic totalitarianism approaching. Immediate intervention required.' };
    return { level: 'critical', title: 'PANOPTICON STATE', color: 'var(--critical-red)', msg: 'Democracy collapsed. Full algorithmic control. No safe harbor.' };
  },

  generateNoise(count, amplitude, seed) {
    // Deterministic noise via seeded PRNG — same seed, same noise, every reload
    reseedRNG(seed);
    const noise = [];
    for (let i = 0; i < count; i++) {
      noise.push(RNG.gaussian() * amplitude * (seed / 100));
    }
    return noise;
  },

  calculateInterventionImpact(entropy, buffer, nullZone) {
    const baseEff = 89;
    const nullRatio = nullZone ? 0.15 : 0;
    const newEff = Math.max(40, baseEff - (entropy * 0.12) - (nullRatio * 15));
    const newSov = this.calculateSovereignty(newEff, entropy, buffer, nullRatio);
    const newRes = Math.max(30, 72 - (entropy * 0.08) + (buffer * 0.1));
    const newPre = Math.max(20, 85 - (entropy * 0.15) - (buffer * 0.05));
    return {
      before: { eff: 89, sov: 31, res: 72, pre: 85 },
      after: { eff: Math.round(newEff), sov: newSov, res: Math.round(newRes), pre: Math.round(newPre) }
    };
  }
};

// ── BACKTESTING ENGINE ────────────────────────────────────
// The engine that turns narrative into science.
// Train on 2010-2020, predict 2020-2024, measure error against known truth.
// No hiding. The error is shown.
const BacktestEngine = {
  // Split historical data: training window → holdout window
  // trainEnd: last year to include in training
  // Returns: { mae, rmse, mape, predictions[], actuals[], errors[] }
  run(data, years, trainEndYear, model, entropySeed) {
    const trainIdx = years.findIndex(y => y > trainEndYear);
    if (trainIdx <= 2 || trainIdx >= years.length) return null; // need ≥3 train + ≥1 test

    const trainData = data.slice(0, trainIdx);
    const trainYears = years.slice(0, trainIdx);
    const testData = data.slice(trainIdx);
    const testYears = years.slice(trainIdx);
    const lastTestYear = testYears[testYears.length - 1];

    // Run model on training data only
    let result;
    switch (model) {
      case 'linear':
        result = PredictionEngine.linearRegression(trainData, trainYears, lastTestYear);
        break;
      case 'exponential':
        result = PredictionEngine.exponentialGrowth(trainData, trainYears, lastTestYear);
        break;
      case 'entropy':
        result = PredictionEngine.entropyModel(trainData, trainYears, lastTestYear, entropySeed);
        break;
      default:
        result = PredictionEngine.composite(trainData, trainYears, lastTestYear, entropySeed);
    }

    // Match predictions to actual test years
    const predictions = [];
    const actuals = [];
    const errors = [];
    let sumAbsErr = 0, sumSqErr = 0, sumAbsPctErr = 0;

    for (let i = 0; i < testYears.length; i++) {
      const pred = result.predictions.find(p => p.year === testYears[i]);
      if (!pred) continue;
      const actual = testData[i];
      const err = pred.value - actual;
      const absErr = Math.abs(err);
      const pctErr = actual !== 0 ? absErr / Math.abs(actual) : 0;

      predictions.push({ year: testYears[i], value: pred.value, confidence: pred.confidence });
      actuals.push({ year: testYears[i], value: actual });
      errors.push({ year: testYears[i], error: err, absError: absErr, pctError: pctErr });

      sumAbsErr += absErr;
      sumSqErr += err * err;
      sumAbsPctErr += pctErr;
    }

    const n = errors.length;
    if (n === 0) return null;

    return {
      model,
      trainWindow: `${trainYears[0]}-${trainYears[trainYears.length - 1]}`,
      testWindow: `${testYears[0]}-${testYears[testYears.length - 1]}`,
      mae: sumAbsErr / n,               // Mean Absolute Error
      rmse: Math.sqrt(sumSqErr / n),     // Root Mean Square Error
      mape: (sumAbsPctErr / n) * 100,    // Mean Absolute Percentage Error
      predictions,
      actuals,
      errors,
      n
    };
  },

  // Run all 4 models, return comparative results
  runAll(data, years, trainEndYear, entropySeed) {
    const models = ['linear', 'exponential', 'entropy', 'composite'];
    const results = {};
    for (const model of models) {
      results[model] = this.run(data, years, trainEndYear, model, entropySeed);
    }
    return results;
  },

  // Run across all metrics, return aggregate error surface
  runFullSuite(entropySeed) {
    const metrics = ['population', 'income', 'homevalue', 'unemployment'];
    const suite = {};
    for (const metric of metrics) {
      const data = HISTORICAL.S07[metric];
      if (!data) continue;
      suite[metric] = this.runAll(data, HISTORICAL.years, 2020, entropySeed);
    }
    return suite;
  },

  // Format results for display — no hiding, full transparency
  formatResults(suite) {
    const rows = [];
    for (const [metric, models] of Object.entries(suite)) {
      for (const [model, result] of Object.entries(models)) {
        if (!result) continue;
        rows.push({
          metric: metric.toUpperCase(),
          model: model.toUpperCase(),
          mae: result.mae,
          rmse: result.rmse,
          mape: result.mape,
          train: result.trainWindow,
          test: result.testWindow,
          n: result.n
        });
      }
    }
    return rows;
  }
};

// ── PREDICTION ENGINE ─────────────────────────────────────
const PredictionEngine = {
  linearRegression(data, years, toYear) {
    const n = data.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let i = 0; i < n; i++) {
      sumX += years[i]; sumY += data[i];
      sumXY += years[i] * data[i]; sumX2 += years[i] * years[i];
    }
    const m = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const b = (sumY - m * sumX) / n;
    // R²
    const yMean = sumY / n;
    let ssTot = 0, ssRes = 0;
    for (let i = 0; i < n; i++) {
      const pred = m * years[i] + b;
      ssTot += (data[i] - yMean) ** 2;
      ssRes += (data[i] - pred) ** 2;
    }
    const rSq = 1 - ssRes / ssTot;

    const predictions = [];
    const lastYear = years[years.length - 1];
    for (let y = lastYear + 1; y <= toYear; y++) {
      const val = m * y + b;
      const dist = y - lastYear;
      const conf = rSq * Math.pow(0.97, dist);
      const margin = Math.abs(val) * 0.3 * (1 - conf);
      predictions.push({ year: y, value: Math.max(0, val), confidence: conf, upper: val + margin, lower: Math.max(0, val - margin) });
    }
    return { predictions, rSquared: rSq, slope: m, intercept: b };
  },

  exponentialGrowth(data, years, toYear) {
    const logData = data.map(d => Math.log(Math.max(d, 1)));
    const result = this.linearRegression(logData, years, toYear);
    const lastYear = years[years.length - 1];
    const predictions = [];
    for (let y = lastYear + 1; y <= toYear; y++) {
      const logVal = result.slope * y + result.intercept;
      const val = Math.exp(logVal);
      const dist = y - lastYear;
      const conf = result.rSquared * Math.pow(0.94, dist);
      const margin = Math.abs(val) * 0.5 * (1 - conf);
      predictions.push({ year: y, value: val, confidence: conf, upper: val + margin, lower: Math.max(0, val - margin) });
    }
    return { predictions, rSquared: result.rSquared };
  },

  entropyModel(data, years, toYear, entropySeed) {
    const linear = this.linearRegression(data, years, toYear);
    const lastYear = years[years.length - 1];
    const baseValue = data[data.length - 1];
    const noise = EntropyEngine.generateNoise(toYear - lastYear, baseValue * 0.01, entropySeed);
    const predictions = linear.predictions.map((p, i) => {
      const dist = p.year - lastYear;
      const noiseAmp = baseValue * (entropySeed / 100) * (dist / 10);
      const noisyVal = p.value + (noise[i] || 0) * noiseAmp;
      const conf = Math.max(0.1, p.confidence - (entropySeed / 200));
      return { year: p.year, value: Math.max(0, noisyVal), confidence: conf, upper: p.upper + noiseAmp, lower: Math.max(0, p.lower - noiseAmp) };
    });
    return { predictions, rSquared: linear.rSquared * (1 - entropySeed / 200) };
  },

  composite(data, years, toYear, entropySeed) {
    const lin = this.linearRegression(data, years, toYear);
    const exp = this.exponentialGrowth(data, years, toYear);
    const ent = this.entropyModel(data, years, toYear, entropySeed);
    const predictions = lin.predictions.map((lp, i) => {
      const ep = exp.predictions[i];
      const np = ent.predictions[i];
      const totalConf = lp.confidence + ep.confidence + np.confidence;
      const wl = lp.confidence / totalConf;
      const we = ep.confidence / totalConf;
      const wn = np.confidence / totalConf;
      const val = lp.value * wl + ep.value * we + np.value * wn;
      const conf = (lp.confidence + ep.confidence + np.confidence) / 3;
      const upper = Math.max(lp.upper, ep.upper, np.upper);
      const lower = Math.min(lp.lower, ep.lower, np.lower);
      return { year: lp.year, value: val, confidence: conf, upper, lower, linear: lp.value, exponential: ep.value, entropy: np.value };
    });
    return { predictions };
  },

  run(metric, model, toYear) {
    const sector = getSector(STATE.selectedSectorId || 'S07');
    const hist = HISTORICAL.S07[metric] || HISTORICAL.S07.population;
    const years = HISTORICAL.years;
    switch (model) {
      case 'linear': return this.linearRegression(hist, years, toYear);
      case 'exponential': return this.exponentialGrowth(hist, years, toYear);
      case 'entropy': return this.entropyModel(hist, years, toYear, STATE.entropySeed);
      default: return this.composite(hist, years, toYear, STATE.entropySeed);
    }
  },

  generateAlerts(toYear) {
    const alerts = [];
    const sovPred = this.composite(
      HISTORICAL.S07.homevalue.map((v, i) => {
        const eff = 70 + (i * 2.5);
        return EntropyEngine.calculateSovereignty(eff, STATE.entropySeed, STATE.realityBufferMonths, 0);
      }),
      HISTORICAL.years, toYear, STATE.entropySeed
    );

    alerts.push({ year: 2028, type: 'warning', icon: '⚠', title: 'Gentrification threshold crossed', desc: 'Home values projected +25% from baseline. Displacement risk elevated.' });
    if (toYear >= 2031) alerts.push({ year: 2031, type: 'info', icon: '▲', title: 'Population peak projected', desc: 'Density exceeds infrastructure capacity. Growth deceleration expected.' });
    if (toYear >= 2033) alerts.push({ year: 2033, type: 'critical', icon: '⛔', title: 'Sovereignty critical. Algorithmic lock-in.', desc: '"Freedom is a null pointer."' });
    if (toYear >= 2038) alerts.push({ year: 2038, type: 'warning', icon: '⚠', title: 'Infrastructure stress >80%', desc: 'Transit, water, and power systems approaching capacity limits.' });
    if (toYear >= 2042) alerts.push({ year: 2042, type: 'critical', icon: '⛔', title: 'Deterministic lock-in complete', desc: 'All urban pathways algorithmically determined. Sovereignty: 8%.' });
    return alerts.filter(a => a.year <= toYear);
  }
};

// ── HELPERS ───────────────────────────────────────────────
function getSector(id) { return SECTORS.find(s => s.id === id) || SECTORS[6]; }
function fmt(n) { return n >= 1000000 ? (n/1000000).toFixed(1)+'M' : n >= 1000 ? (n/1000).toFixed(1)+'K' : n.toString(); }
function fmtMoney(n) { return '$' + fmt(n); }
function sovColor(sov) {
  if (sov >= 60) return 'var(--neon-green)';
  if (sov >= 40) return 'var(--neon-green)';
  if (sov >= 25) return 'var(--warning-amber)';
  return 'var(--critical-red)';
}
function sovClass(sov) {
  if (sov >= 40) return 'nominal';
  if (sov >= 25) return 'warning';
  return 'critical';
}
function confClass(c) { return c > 0.7 ? 'high' : c > 0.4 ? 'medium' : 'low'; }
function timeStr() {
  const elapsed = Math.floor((Date.now() - STATE.bootTime) / 1000);
  const h = String(Math.floor(elapsed / 3600)).padStart(2, '0');
  const m = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0');
  const s = String(elapsed % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

// ── BOOT SEQUENCE ─────────────────────────────────────────
function runBootSequence() {
  const delays = [0, 800, 1200, 1600, 2000, 2400, 2600, 3200];
  const ids = ['splash-title', 'splash-sep', 'boot-0', 'boot-1', 'boot-2', 'boot-3', 'boot-4', 'boot-5'];

  ids.forEach((id, i) => {
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) el.classList.add('visible');
    }, delays[i]);
  });

  setTimeout(() => {
    document.getElementById('boot-6').classList.add('visible');
  }, 3200);

  setTimeout(() => {
    const prog = document.getElementById('boot-progress');
    prog.classList.add('visible');
    setTimeout(() => {
      document.getElementById('boot-progress-bar').style.width = '100%';
    }, 100);
  }, 3500);

  setTimeout(() => {
    document.getElementById('splash-footer').classList.add('visible');
  }, 3800);

  setTimeout(() => {
    document.getElementById('splash-page').style.opacity = '0';
    setTimeout(() => {
      document.getElementById('splash-page').style.display = 'none';
      document.getElementById('app').classList.remove('hidden');
      initApp();
    }, 500);
  }, 5000);
}

// ── NAVIGATION ────────────────────────────────────────────
function navigateTo(pageId, sectorId) {
  if (sectorId) STATE.selectedSectorId = sectorId;

  // Hide all pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

  // Show target
  const target = document.getElementById('page-' + pageId);
  if (target) {
    target.classList.add('active');
    STATE.currentPage = pageId;

    // Update header
    document.getElementById('header-title').textContent = target.dataset.title || 'URBAN_CHRONOS v2.0';

    // Update nav tabs
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll(`.nav-tab[data-page="${pageId}"]`).forEach(t => t.classList.add('active'));

    // Update drawer
    document.querySelectorAll('.drawer-item').forEach(d => d.classList.remove('active'));
    document.querySelectorAll(`.drawer-item[data-page="${pageId}"]`).forEach(d => d.classList.add('active'));

    // Render page-specific content
    switch (pageId) {
      case 'dashboard': renderDashboard(); break;
      case 'map': renderMap(); break;
      case 'neighborhood': renderNeighborhood(); break;
      case 'predict': renderPrediction(); break;
      case 'intervention': renderIntervention(); break;
      case 'datasources': renderDataSources(); break;
      case 'log': renderLog(); break;
    }

    // Scroll to top
    window.scrollTo(0, 0);
  }

  // Close drawer
  closeDrawer();
}

function openDrawer() {
  document.getElementById('drawer').classList.add('open');
  document.getElementById('drawer-overlay').classList.add('open');
}

function closeDrawer() {
  document.getElementById('drawer').classList.remove('open');
  document.getElementById('drawer-overlay').classList.remove('open');
}

// ── RENDER: DASHBOARD ─────────────────────────────────────
function renderDashboard() {
  // Radar chart
  renderRadarChart('radar-chart', [STATE.efficiency, STATE.sovereignty, STATE.resilience, STATE.predictability], 'current');

  // Sector list (top 5 by sovereignty warning)
  const sorted = [...SECTORS].sort((a, b) => a.sovereignty - b.sovereignty).slice(0, 5);
  const list = document.getElementById('sector-list');
  list.innerHTML = sorted.map(s => `
    <button class="sector-item" data-sector="${s.id}" data-navigate-sector="neighborhood">
      <span class="sector-indicator" style="background:${sovColor(s.sovereignty)}"></span>
      <div class="sector-info">
        <div class="sector-code">${s.code}</div>
        <div class="sector-pop">POP: ${fmt(s.pop)}</div>
      </div>
      <span class="sector-sov" style="color:${sovColor(s.sovereignty)}">${s.sovereignty}%</span>
    </button>
  `).join('');

  // Update metric badges
  document.getElementById('dash-efficiency').textContent = STATE.efficiency + '%';
  document.getElementById('dash-sovereignty').textContent = STATE.sovereignty + '%';
  document.getElementById('dash-resilience').textContent = STATE.resilience + '%';
  document.getElementById('dash-predictability').textContent = STATE.predictability + '%';

  addLog('info', 'Dashboard rendered. 24 sectors loaded.');
}

// ── RENDER: MAP ───────────────────────────────────────────
function renderMap() {
  const svg = document.getElementById('sector-map-svg');
  svg.innerHTML = '';

  // Generate procedural city grid
  const cols = 6, rows = 4;
  const padding = 20;
  const cellW = (600 - padding * 2) / cols;
  const cellH = (500 - padding * 2) / rows;

  SECTORS.forEach((sector, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = padding + col * cellW + 2;
    const y = padding + row * cellH + 2;
    const w = cellW - 4;
    const h = cellH - 4;

    // Get value for current layer
    let val, maxVal;
    switch (STATE.selectedMapLayer) {
      case 'sovereignty': val = sector.sovereignty; maxVal = 100; break;
      case 'population': val = sector.pop; maxVal = 80000; break;
      case 'income': val = sector.income; maxVal = 150000; break;
      case 'homevalue': val = sector.homeValue; maxVal = 1300000; break;
      case 'unemployment': val = sector.unemployment; maxVal = 12; break;
      default: val = sector.sovereignty; maxVal = 100;
    }

    const norm = Math.min(1, val / maxVal);
    const fill = getHeatColor(norm, STATE.selectedMapLayer);

    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', x);
    rect.setAttribute('y', y);
    rect.setAttribute('width', w);
    rect.setAttribute('height', h);
    rect.setAttribute('fill', fill);
    rect.setAttribute('stroke', '#222222');
    rect.setAttribute('stroke-width', '1');
    rect.setAttribute('class', 'map-sector');
    rect.setAttribute('data-sector-id', sector.id);
    rect.addEventListener('click', () => selectMapSector(sector));

    svg.appendChild(rect);

    // Label
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', x + w / 2);
    text.setAttribute('y', y + h / 2 - 4);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('font-family', 'Orbitron, sans-serif');
    text.setAttribute('font-size', '8');
    text.setAttribute('fill', '#e0e0e0');
    text.setAttribute('letter-spacing', '1');
    text.setAttribute('pointer-events', 'none');
    text.textContent = sector.code.replace('SECTOR_', '');
    svg.appendChild(text);

    // Value label
    const valText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    valText.setAttribute('x', x + w / 2);
    valText.setAttribute('y', y + h / 2 + 10);
    valText.setAttribute('text-anchor', 'middle');
    valText.setAttribute('font-family', 'Share Tech Mono, monospace');
    valText.setAttribute('font-size', '10');
    valText.setAttribute('fill', '#ffffff');
    valText.setAttribute('pointer-events', 'none');
    if (STATE.selectedMapLayer === 'sovereignty') valText.textContent = sector.sovereignty + '%';
    else if (STATE.selectedMapLayer === 'income' || STATE.selectedMapLayer === 'homevalue') valText.textContent = fmtMoney(val);
    else if (STATE.selectedMapLayer === 'unemployment') valText.textContent = val + '%';
    else valText.textContent = fmt(val);
    svg.appendChild(valText);
  });

  // Update overlay label
  const labels = { sovereignty: 'SOVEREIGNTY INDEX', population: 'POPULATION DENSITY', income: 'MEDIAN INCOME', homevalue: 'HOME VALUE', unemployment: 'UNEMPLOYMENT RATE' };
  document.getElementById('map-overlay-label').textContent = labels[STATE.selectedMapLayer] || 'SOVEREIGNTY INDEX';
}

function getHeatColor(norm, layer) {
  // For sovereignty and unemployment, invert (low = bad)
  if (layer === 'sovereignty') {
    // Low sovereignty = red, high = green
    if (norm < 0.25) return 'rgba(255,0,64,0.6)';
    if (norm < 0.4) return 'rgba(255,170,0,0.5)';
    if (norm < 0.6) return 'rgba(0,255,65,0.4)';
    return 'rgba(0,255,65,0.6)';
  }
  if (layer === 'unemployment') {
    if (norm > 0.7) return 'rgba(255,0,64,0.6)';
    if (norm > 0.5) return 'rgba(255,170,0,0.5)';
    return 'rgba(0,255,65,0.4)';
  }
  // Default: low = cyan, high = red
  if (norm < 0.3) return 'rgba(0,255,255,0.3)';
  if (norm < 0.5) return 'rgba(0,255,65,0.4)';
  if (norm < 0.7) return 'rgba(255,170,0,0.5)';
  return 'rgba(255,0,64,0.6)';
}

function selectMapSector(sector) {
  // Highlight
  document.querySelectorAll('.map-sector').forEach(r => r.classList.remove('selected'));
  document.querySelector(`.map-sector[data-sector-id="${sector.id}"]`)?.classList.add('selected');

  // Show panel
  const panel = document.getElementById('map-sector-panel');
  panel.classList.add('visible');
  panel.style.borderLeftColor = sovColor(sector.sovereignty);
  document.getElementById('map-panel-name').textContent = sector.code + ' // ' + sector.name;
  document.getElementById('map-panel-class').textContent = sector.class;
  document.getElementById('map-panel-sov').textContent = sector.sovereignty + '%';
  document.getElementById('map-panel-sov').className = 'metric-badge-value ' + sovClass(sector.sovereignty);

  document.getElementById('map-panel-stats').innerHTML = `
    <div class="sector-detail-stat"><div class="sector-detail-stat-label">POP</div><div class="sector-detail-stat-value">${fmt(sector.pop)}</div></div>
    <div class="sector-detail-stat"><div class="sector-detail-stat-label">INCOME</div><div class="sector-detail-stat-value">${fmtMoney(sector.income)}</div></div>
    <div class="sector-detail-stat"><div class="sector-detail-stat-label">DENSITY</div><div class="sector-detail-stat-value">${fmt(sector.density)}/km²</div></div>
  `;

  STATE.selectedSectorId = sector.id;

  // Wire buttons
  document.getElementById('map-btn-analysis').onclick = () => navigateTo('neighborhood', sector.id);
  document.getElementById('map-btn-predict').onclick = () => navigateTo('predict', sector.id);
}

// ── RENDER: NEIGHBORHOOD ANALYSIS ─────────────────────────
function renderNeighborhood() {
  const sector = getSector(STATE.selectedSectorId || 'S07');

  // Header
  document.getElementById('nbh-title').textContent = sector.code + ' // ' + sector.name;
  document.getElementById('nbh-tracts').textContent = sector.tracts + ' Census Tracts';
  document.getElementById('nbh-area').textContent = sector.area + ' km²';
  document.getElementById('nbh-class').textContent = sector.class;

  // Metrics grid
  const metrics = [
    { label: 'POPULATION', value: fmt(sector.pop), change: '+3.2%', positive: true },
    { label: 'MEDIAN INCOME', value: fmtMoney(sector.income), change: '+8.1%', positive: true },
    { label: 'HOME VALUE', value: fmtMoney(sector.homeValue), change: '+22%', positive: true },
    { label: 'RENT', value: fmtMoney(sector.rent) + '/mo', change: '+18%', positive: false },
    { label: 'UNEMPLOYMENT', value: sector.unemployment + '%', change: '-1.1%', positive: true },
    { label: 'EDUCATION (BA+)', value: sector.education + '%', change: '+4.2%', positive: true },
    { label: 'MEDIAN AGE', value: sector.age + ' yrs', change: '', positive: true },
    { label: 'VACANCY', value: sector.vacancy + '%', change: '', positive: true },
  ];

  document.getElementById('nbh-metrics').innerHTML = metrics.map(m => `
    <div class="metric-tile">
      <div class="metric-tile-label">${m.label}</div>
      <div class="metric-tile-value">${m.value}</div>
      ${m.change ? `<div class="metric-tile-change ${m.positive ? 'positive' : 'negative'}">${m.change.startsWith('-') ? '▼' : '▲'} ${m.change} vs 2020</div>` : '<div class="metric-tile-change neutral">—</div>'}
    </div>
  `).join('');

  // Trend chart
  renderTrendChart(STATE.selectedTrendMetric);

  // Comparison bars
  const comps = [
    { label: 'POPULATION', value: 12 },
    { label: 'INCOME', value: -3 },
    { label: 'HOME VALUE', value: 28 },
    { label: 'EDUCATION', value: 8 },
    { label: 'UNEMPLOY', value: -42 },
    { label: 'TRANSIT', value: 35 },
  ];
  document.getElementById('nbh-comparison').innerHTML = comps.map(c => {
    const barWidth = Math.min(50, Math.abs(c.value)) + '%';
    const isPos = c.value >= 0;
    return `
      <div class="comparison-row">
        <span class="comparison-label">${c.label}</span>
        <div class="comparison-bar-track">
          <div class="comparison-bar-center"></div>
          <div class="comparison-bar-fill" style="width:${barWidth};margin-left:${isPos ? '50%' : (50 - Math.min(50, Math.abs(c.value))) + '%'};background:${isPos ? 'var(--neon-green)' : 'var(--critical-red)'}"></div>
        </div>
        <span class="comparison-value ${isPos ? 'positive' : 'negative'}">${isPos ? '+' : ''}${c.value}%</span>
      </div>
    `;
  }).join('');

  // Risk bars
  const risks = [
    { label: 'GENTRIFICATION', value: 78, severity: 'high' },
    { label: 'FLOOD RISK', value: 15, severity: 'low' },
    { label: 'ECON. DECLINE', value: 25, severity: 'low' },
    { label: 'INFRA. STRESS', value: 52, severity: 'medium' },
  ];
  document.getElementById('nbh-risks').innerHTML = risks.map(r => `
    <div class="risk-row">
      <span class="risk-label">${r.label}</span>
      <div class="risk-bar-track">
        <div class="risk-bar-fill ${r.severity}" style="width:${r.value}%"></div>
      </div>
      <span class="risk-value" style="color:${r.severity === 'high' ? 'var(--critical-red)' : r.severity === 'medium' ? 'var(--warning-amber)' : 'var(--neon-green)'}">${r.value}% ${r.severity !== 'low' ? '⚠' : ''}</span>
    </div>
  `).join('');

  // Sovereignty
  const sov = sector.sovereignty;
  const risk = EntropyEngine.checkFreedomRisk(sov);
  document.getElementById('nbh-sov-value').textContent = sov + '%';
  document.getElementById('nbh-sov-value').className = 'sovereignty-value ' + sovClass(sov);
  document.getElementById('nbh-sov-bar').style.width = sov + '%';
  document.getElementById('nbh-sov-bar').className = 'progress-bar-fill ' + sovClass(sov);
  document.getElementById('nbh-sov-analysis').textContent = `System efficiency at ${100 - sov}%. ${risk.msg}`;
  document.getElementById('nbh-sov-rec').textContent = sov < 40 ? 'RECOMMENDED: Increase entropy to 15% and reality buffer to 18 months.' : 'System within acceptable parameters.';

  document.getElementById('nbh-predict-btn').onclick = () => navigateTo('predict', sector.id);
}

function renderTrendChart(metric) {
  const ctx = document.getElementById('nbh-trend-chart');
  if (STATE.charts.trend) STATE.charts.trend.destroy();

  const sectorData = HISTORICAL.S07[metric] || HISTORICAL.S07.population;
  const cityData = HISTORICAL.cityAvg[metric] || HISTORICAL.cityAvg.population;

  STATE.charts.trend = new Chart(ctx, {
    type: 'line',
    data: {
      labels: HISTORICAL.years,
      datasets: [
        {
          label: 'Sector',
          data: sectorData,
          borderColor: '#00ff41',
          borderWidth: 2,
          pointBackgroundColor: '#00ff41',
          pointRadius: 3,
          tension: 0.3,
          fill: false,
        },
        {
          label: 'City Average',
          data: cityData,
          borderColor: '#888888',
          borderWidth: 1,
          borderDash: [5, 3],
          pointRadius: 0,
          tension: 0.3,
          fill: false,
        }
      ]
    },
    options: chartOptions(metric)
  });
}

// ── RENDER: PREDICTION ENGINE ─────────────────────────────
function renderPrediction() {
  const sector = getSector(STATE.selectedSectorId || 'S07');
  document.getElementById('predict-target').textContent = sector.code + ' // ' + sector.name;
  document.getElementById('year-display').textContent = STATE.projectionYear;
  document.getElementById('projected-year-label').textContent = '// ' + STATE.projectionYear;

  // Show calculating overlay
  showCalculating(() => {
    renderPredictionChart();
    renderProjectedMetrics();
    renderFutureRadar();
    renderAlertsTimeline();
    renderBacktest();
    addLog('info', `Prediction engine: ${STATE.selectedModel} model → ${STATE.projectionYear}. Sector ${sector.code}.`);
  });
}

function renderPredictionChart() {
  const ctx = document.getElementById('prediction-chart');
  if (STATE.charts.prediction) STATE.charts.prediction.destroy();

  const metric = STATE.selectedPredictMetric;
  const hist = HISTORICAL.S07[metric] || HISTORICAL.S07.population;
  const toYear = STATE.projectionYear;

  // Run all models
  const linResult = PredictionEngine.linearRegression(hist, HISTORICAL.years, toYear);
  const expResult = PredictionEngine.exponentialGrowth(hist, HISTORICAL.years, toYear);
  const entResult = PredictionEngine.entropyModel(hist, HISTORICAL.years, toYear, STATE.entropySeed);
  const compResult = PredictionEngine.composite(hist, HISTORICAL.years, toYear, STATE.entropySeed);

  const futureYears = compResult.predictions.map(p => p.year);
  const allLabels = [...HISTORICAL.years, ...futureYears];

  // Pad historical with nulls for future
  const padHist = [...hist, ...new Array(futureYears.length).fill(null)];
  // Pad predictions with nulls for past
  const padPred = (preds) => [...new Array(HISTORICAL.years.length).fill(null), ...preds.map(p => p.value)];

  const datasets = [
    {
      label: 'Historical',
      data: padHist,
      borderColor: '#888888',
      borderWidth: 1.5,
      pointBackgroundColor: '#888888',
      pointRadius: 2,
      tension: 0.3,
      fill: false,
      spanGaps: false,
    },
    {
      label: 'Composite',
      data: padPred(compResult.predictions),
      borderColor: '#00ff41',
      borderWidth: 2.5,
      pointRadius: 0,
      tension: 0.3,
      fill: false,
      spanGaps: false,
    },
    {
      label: 'Linear',
      data: padPred(linResult.predictions),
      borderColor: '#00ff41',
      borderWidth: 1.5,
      borderDash: [4, 3],
      pointRadius: 0,
      tension: 0.3,
      fill: false,
      spanGaps: false,
    },
    {
      label: 'Exponential',
      data: padPred(expResult.predictions),
      borderColor: '#00ffff',
      borderWidth: 1.5,
      borderDash: [8, 4],
      pointRadius: 0,
      tension: 0.3,
      fill: false,
      spanGaps: false,
    },
    {
      label: 'Entropy',
      data: padPred(entResult.predictions),
      borderColor: '#ffaa00',
      borderWidth: 1.5,
      borderDash: [2, 2],
      pointRadius: 0,
      tension: 0.3,
      fill: false,
      spanGaps: false,
    },
    {
      label: 'Confidence',
      data: [...new Array(HISTORICAL.years.length).fill(null), ...compResult.predictions.map(p => p.upper)],
      borderColor: 'transparent',
      backgroundColor: 'rgba(0,255,65,0.06)',
      pointRadius: 0,
      fill: '+1',
      tension: 0.3,
      spanGaps: false,
    },
    {
      label: 'Confidence Lower',
      data: [...new Array(HISTORICAL.years.length).fill(null), ...compResult.predictions.map(p => p.lower)],
      borderColor: 'transparent',
      pointRadius: 0,
      fill: false,
      tension: 0.3,
      spanGaps: false,
    }
  ];

  STATE.charts.prediction = new Chart(ctx, {
    type: 'line',
    data: { labels: allLabels, datasets },
    options: {
      ...chartOptions(metric),
      plugins: {
        ...chartOptions(metric).plugins,
        annotation: {
          annotations: {
            nowLine: {
              type: 'line',
              xMin: 2024,
              xMax: 2024,
              borderColor: '#555555',
              borderWidth: 1,
              borderDash: [4, 4],
              label: { content: 'NOW', enabled: true, position: 'start', color: '#555555', font: { size: 9 } }
            }
          }
        }
      }
    }
  });
}

function renderProjectedMetrics() {
  const toYear = STATE.projectionYear;
  const popResult = PredictionEngine.composite(HISTORICAL.S07.population, HISTORICAL.years, toYear, STATE.entropySeed);
  const incResult = PredictionEngine.composite(HISTORICAL.S07.income, HISTORICAL.years, toYear, STATE.entropySeed);
  const homeResult = PredictionEngine.composite(HISTORICAL.S07.homevalue, HISTORICAL.years, toYear, STATE.entropySeed);
  const unempResult = PredictionEngine.composite(HISTORICAL.S07.unemployment, HISTORICAL.years, toYear, STATE.entropySeed);

  const lastPop = popResult.predictions[popResult.predictions.length - 1];
  const lastInc = incResult.predictions[incResult.predictions.length - 1];
  const lastHome = homeResult.predictions[homeResult.predictions.length - 1];
  const lastUnemp = unempResult.predictions[unempResult.predictions.length - 1];

  const basePop = HISTORICAL.S07.population[HISTORICAL.S07.population.length - 1];
  const baseInc = HISTORICAL.S07.income[HISTORICAL.S07.income.length - 1];
  const baseHome = HISTORICAL.S07.homevalue[HISTORICAL.S07.homevalue.length - 1];
  const baseUnemp = HISTORICAL.S07.unemployment[HISTORICAL.S07.unemployment.length - 1];

  const projections = [
    { label: 'POPULATION', value: fmt(Math.round(lastPop.value)), change: `+${Math.round((lastPop.value / basePop - 1) * 100)}%`, conf: lastPop.confidence },
    { label: 'MEDIAN INCOME', value: fmtMoney(Math.round(lastInc.value)), change: `+${Math.round((lastInc.value / baseInc - 1) * 100)}%`, conf: lastInc.confidence },
    { label: 'HOME VALUE', value: fmtMoney(Math.round(lastHome.value)), change: `+${Math.round((lastHome.value / baseHome - 1) * 100)}%`, conf: lastHome.confidence },
    { label: 'UNEMPLOYMENT', value: lastUnemp.value.toFixed(1) + '%', change: `${Math.round((lastUnemp.value / baseUnemp - 1) * 100)}%`, conf: lastUnemp.confidence },
  ];

  document.getElementById('projected-metrics').innerHTML = projections.map(p => `
    <div class="projected-tile">
      <div class="projected-tile-label">${p.label}</div>
      <div class="projected-tile-value">${p.value}</div>
      <div class="projected-tile-change">${p.change} from 2024</div>
      <div class="confidence-row">
        <span class="confidence-label">Confidence:</span>
        <span class="confidence-value ${confClass(p.conf)}">${Math.round(p.conf * 100)}%</span>
      </div>
    </div>
  `).join('');
}

function renderFutureRadar() {
  // Project system metrics
  const dist = STATE.projectionYear - 2024;
  const futEff = Math.min(99, STATE.efficiency + dist * 0.5);
  const futSov = Math.max(5, STATE.sovereignty - dist * 1.2);
  const futRes = Math.max(30, STATE.resilience - dist * 0.6);
  const futPre = Math.min(98, STATE.predictability + dist * 0.5);

  document.getElementById('fut-efficiency').textContent = Math.round(futEff) + '%';
  document.getElementById('fut-sovereignty').textContent = Math.round(futSov) + '%';
  document.getElementById('fut-sovereignty').className = 'metric-badge-value ' + sovClass(futSov);
  document.getElementById('fut-resilience').textContent = Math.round(futRes) + '%';
  document.getElementById('fut-predictability').textContent = Math.round(futPre) + '%';

  renderRadarChart('future-radar-chart', [futEff, futSov, futRes, futPre], 'future');

  // Alert visibility
  const alert = document.getElementById('sovereignty-alert');
  if (futSov < 20) {
    alert.style.display = 'block';
    alert.querySelector('.alert-msg').textContent = `Sovereignty projected at ${Math.round(futSov)}% by ${STATE.projectionYear}. Algorithmic lock-in ${futSov < 10 ? 'complete' : 'imminent'}.`;
  } else {
    alert.style.display = 'none';
  }
}

function renderAlertsTimeline() {
  const alerts = PredictionEngine.generateAlerts(STATE.projectionYear);
  document.getElementById('alerts-timeline').innerHTML = alerts.map((a, i) => `
    <div class="alert-timeline-item">
      <div class="alert-timeline-line">
        ${i > 0 ? '<div class="alert-timeline-segment"></div>' : ''}
        <div class="alert-timeline-dot ${a.type}"></div>
        ${i < alerts.length - 1 ? '<div class="alert-timeline-segment"></div>' : ''}
      </div>
      <div class="alert-timeline-content">
        <div class="alert-timeline-year ${a.type}">${a.icon} ${a.year}</div>
        <div class="alert-timeline-title">${a.title}</div>
        <div class="alert-timeline-desc">${a.desc}</div>
      </div>
    </div>
  `).join('');
}

// ── RENDER: BACKTEST ──────────────────────────────────────
function renderBacktest() {
  const suite = BacktestEngine.runFullSuite(STATE.entropySeed);
  const rows = BacktestEngine.formatResults(suite);
  const container = document.getElementById('backtest-results');

  // MAPE grading: <5% = good, <15% = ok, >15% = bad
  function mapeGrade(mape) {
    if (mape < 5) return { cls: 'good', label: 'A' };
    if (mape < 10) return { cls: 'ok', label: 'B' };
    if (mape < 15) return { cls: 'ok', label: 'C' };
    return { cls: 'bad', label: 'F' };
  }

  let html = `<table class="backtest-table">
    <thead><tr>
      <th>METRIC</th><th>MODEL</th><th>MAE</th><th>RMSE</th><th>MAPE</th><th></th>
    </tr></thead><tbody>`;

  for (const row of rows) {
    const grade = mapeGrade(row.mape);
    html += `<tr>
      <td class="metric-col">${row.metric}</td>
      <td class="model-col">${row.model}</td>
      <td>${typeof row.mae === 'number' ? (row.mae > 1000 ? fmt(Math.round(row.mae)) : row.mae.toFixed(2)) : '—'}</td>
      <td>${typeof row.rmse === 'number' ? (row.rmse > 1000 ? fmt(Math.round(row.rmse)) : row.rmse.toFixed(2)) : '—'}</td>
      <td class="mape-${grade.cls}">${row.mape.toFixed(1)}%</td>
      <td><span class="backtest-grade ${grade.cls}">${grade.label}</span></td>
    </tr>`;
  }

  html += '</tbody></table>';
  container.innerHTML = html;

  // Show seed for replicability
  document.getElementById('backtest-seed').textContent = STATE.entropySeed * 7919 + 31;

  addLog('system', `Backtest complete. ${rows.length} model-metric pairs evaluated. Train: 2010-2020, Test: 2020-2024.`);
}

// ── RENDER: INTERVENTION LAYER ────────────────────────────
function renderIntervention() {
  // Random quote
  const q = QUOTES[Math.floor(Math.random() * QUOTES.length)];
  document.querySelector('.quote-text').textContent = q.text;
  document.querySelector('.quote-author').textContent = '— ' + q.author;

  // Set slider values
  document.getElementById('entropy-slider').value = STATE.entropySeed;
  document.getElementById('entropy-value').textContent = STATE.entropySeed;
  document.getElementById('buffer-slider').value = STATE.realityBufferMonths;
  document.getElementById('buffer-value').textContent = STATE.realityBufferMonths;
  document.getElementById('nullzone-toggle').checked = STATE.nullZoneOn;
  updateNullZoneStatus();

  updateInterventionEffects();
}

function updateInterventionEffects() {
  const impact = EntropyEngine.calculateInterventionImpact(STATE.entropySeed, STATE.realityBufferMonths, STATE.nullZoneOn);
  const b = impact.before;
  const a = impact.after;

  // Entropy effects
  document.getElementById('entropy-effects').innerHTML = `
    <div class="effect-row"><span class="effect-label">Sovereignty:</span><span class="effect-values">${b.sov}% → ${a.sov}%</span><span class="effect-delta ${a.sov > b.sov ? 'positive' : 'negative'}">(${a.sov > b.sov ? '+' : ''}${a.sov - b.sov})</span></div>
    <div class="effect-row"><span class="effect-label">Efficiency:</span><span class="effect-values">${b.eff}% → ${a.eff}%</span><span class="effect-delta ${a.eff < b.eff ? 'negative' : 'positive'}">(${a.eff > b.eff ? '+' : ''}${a.eff - b.eff})</span></div>
  `;

  // Buffer effects
  document.getElementById('buffer-effects').innerHTML = `
    <div class="effect-row"><span class="effect-label">Sovereignty:</span><span class="effect-values">${b.sov}% → ${a.sov}%</span><span class="effect-delta ${a.sov > b.sov ? 'positive' : 'negative'}">(${a.sov > b.sov ? '+' : ''}${a.sov - b.sov})</span></div>
    <div class="effect-row"><span class="effect-label">Resilience:</span><span class="effect-values">${b.res}% → ${a.res}%</span><span class="effect-delta ${a.res > b.res ? 'positive' : 'negative'}">(${a.res > b.res ? '+' : ''}${a.res - b.res})</span></div>
  `;

  // Impact preview
  document.getElementById('impact-grid').innerHTML = `
    <span class="impact-metric-label">EFF</span>
    <span class="impact-before">${b.eff}%</span><span class="impact-arrow">→</span><span class="impact-after">${a.eff}%</span>
    <span class="impact-metric-label">SOV</span>
    <span class="impact-before">${b.sov}%</span><span class="impact-arrow">→</span><span class="impact-after" style="color:${sovColor(a.sov)}">${a.sov}%</span>
    <span class="impact-metric-label">RES</span>
    <span class="impact-before">${b.res}%</span><span class="impact-arrow">→</span><span class="impact-after">${a.res}%</span>
    <span class="impact-metric-label">PRE</span>
    <span class="impact-before">${b.pre}%</span><span class="impact-arrow">→</span><span class="impact-after">${a.pre}%</span>
  `;

  // Verdict
  const risk = EntropyEngine.checkFreedomRisk(a.sov);
  document.getElementById('verdict-text').textContent = risk.msg;
}

function updateNullZoneStatus() {
  const isOn = STATE.nullZoneOn;
  const statusEl = document.getElementById('nullzone-status');
  statusEl.textContent = isOn ? 'ENABLED' : 'DISABLED';
  statusEl.className = 'toggle-status ' + (isOn ? 'on' : 'off');
  document.getElementById('nullzone-info').innerHTML = isOn
    ? 'Null zones: 4 / 24 sectors<br>Population in null zones: 42,200'
    : 'Null zones: 0 / 24 sectors<br>Population in null zones: 0';
  document.getElementById('panopticon-warning').style.display = isOn ? 'none' : 'block';
}

// ── RENDER: DATA SOURCES ──────────────────────────────────
function renderDataSources() {
  document.getElementById('api-status-list').innerHTML = API_STATUS.map(api => `
    <div class="api-status-card">
      <span class="api-status-dot ${api.connected ? 'connected' : 'disconnected'}"></span>
      <div class="api-status-info">
        <div class="api-status-name">${api.name}</div>
        <div class="api-status-detail">${api.detail}</div>
      </div>
      <span class="api-status-badge ${api.connected ? 'ok' : 'off'}">${api.connected ? '✓ OK' : 'OFF'}</span>
    </div>
  `).join('');

  document.getElementById('cache-list').innerHTML = CACHE_DATA.map(c => `
    <div class="cache-item">
      <span class="check">✓</span>
      <span>${c.name}</span>
      <span class="size">${c.count}</span>
    </div>
  `).join('');
}

// ── RENDER: SYSTEM LOG ────────────────────────────────────
function renderLog() {
  updateLogDisplay();
  document.getElementById('log-uptime').textContent = timeStr();
}

function addLog(level, msg) {
  STATE.logEntries.push({ time: timeStr(), level, msg });
  if (STATE.currentPage === 'log') updateLogDisplay();
}

function updateLogDisplay() {
  const container = document.getElementById('log-container');
  const cursor = document.getElementById('log-cursor');

  const filtered = STATE.logFilter === 'all'
    ? STATE.logEntries
    : STATE.logEntries.filter(e => e.level === STATE.logFilter);

  const html = filtered.map(e => `
    <div class="log-entry">
      <span class="log-timestamp">[${e.time}]</span>
      <span class="log-level ${e.level}">${e.level.toUpperCase()}</span>
      <span class="log-message">${e.msg}</span>
    </div>
  `).join('');

  // Keep cursor at end
  cursor.remove();
  container.innerHTML = html;
  container.appendChild(cursor);
  container.scrollTop = container.scrollHeight;

  // Update counts
  document.getElementById('log-event-count').textContent = STATE.logEntries.length;
  document.getElementById('log-error-count').textContent = STATE.logEntries.filter(e => e.level === 'error').length;
  document.getElementById('log-warn-count').textContent = STATE.logEntries.filter(e => e.level === 'warn').length;
}

// ── CHARTS: RADAR ─────────────────────────────────────────
function renderRadarChart(canvasId, values, type) {
  const ctx = document.getElementById(canvasId);
  const key = type === 'future' ? 'radarFuture' : 'radarCurrent';
  if (STATE.charts[key]) STATE.charts[key].destroy();

  const color = type === 'future' ? '#00ffff' : '#00ff41';
  const bgColor = type === 'future' ? 'rgba(0,255,255,0.12)' : 'rgba(0,255,65,0.12)';

  STATE.charts[key] = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: ['EFFICIENCY', 'SOVEREIGNTY', 'RESILIENCE', 'PREDICTABILITY'],
      datasets: [{
        data: values,
        borderColor: color,
        backgroundColor: bgColor,
        borderWidth: 2,
        pointBackgroundColor: color,
        pointRadius: 4,
        pointHoverRadius: 6,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        r: {
          beginAtZero: true,
          max: 100,
          ticks: {
            stepSize: 25,
            color: '#555555',
            backdropColor: 'transparent',
            font: { family: 'Share Tech Mono', size: 9 }
          },
          grid: { color: '#222222' },
          angleLines: { color: '#222222' },
          pointLabels: {
            color: '#888888',
            font: { family: 'Orbitron', size: 9, weight: '600' },
            padding: 8
          }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#222222',
          titleColor: color,
          bodyColor: '#e0e0e0',
          titleFont: { family: 'Orbitron', size: 10 },
          bodyFont: { family: 'Share Tech Mono', size: 11 },
          padding: 8,
          cornerRadius: 0,
          borderColor: '#333333',
          borderWidth: 1,
        }
      }
    }
  });
}

// ── CHART OPTIONS HELPER ──────────────────────────────────
function chartOptions(metric) {
  const isPercent = metric === 'unemployment' || metric === 'sovereignty';
  const isMoney = metric === 'income' || metric === 'homevalue';

  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { intersect: false, mode: 'index' },
    scales: {
      x: {
        grid: { color: '#1a1a1a' },
        ticks: { color: '#555555', font: { family: 'Share Tech Mono', size: 10 }, maxRotation: 0 }
      },
      y: {
        grid: { color: '#1a1a1a' },
        ticks: {
          color: '#555555',
          font: { family: 'Share Tech Mono', size: 10 },
          callback: function(val) {
            if (isPercent) return val.toFixed(1) + '%';
            if (isMoney) return '$' + fmt(val);
            return fmt(val);
          }
        }
      }
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#222222',
        titleColor: '#00ff41',
        bodyColor: '#e0e0e0',
        titleFont: { family: 'Orbitron', size: 10 },
        bodyFont: { family: 'Share Tech Mono', size: 11 },
        padding: 8,
        cornerRadius: 0,
        borderColor: '#333333',
        borderWidth: 1,
        callbacks: {
          label: function(ctx) {
            let val = ctx.parsed.y;
            if (val === null || val === undefined) return '';
            if (isPercent) return ctx.dataset.label + ': ' + val.toFixed(1) + '%';
            if (isMoney) return ctx.dataset.label + ': $' + fmt(Math.round(val));
            return ctx.dataset.label + ': ' + fmt(Math.round(val));
          }
        }
      }
    }
  };
}

// ── CALCULATING OVERLAY ───────────────────────────────────
function showCalculating(callback) {
  const overlay = document.getElementById('calc-overlay');
  overlay.classList.add('visible');
  setTimeout(() => {
    callback();
    overlay.classList.remove('visible');
  }, 1200);
}

// ── EVENT BINDING ─────────────────────────────────────────
function bindEvents() {
  // Menu / Drawer
  document.getElementById('menu-btn').addEventListener('click', openDrawer);
  document.getElementById('drawer-overlay').addEventListener('click', closeDrawer);

  // Navigation: bottom nav
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => navigateTo(tab.dataset.page));
  });

  // Navigation: drawer items
  document.querySelectorAll('.drawer-item[data-page]').forEach(item => {
    item.addEventListener('click', () => navigateTo(item.dataset.page));
  });

  // Navigation: data-navigate buttons
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-navigate]');
    if (btn) navigateTo(btn.dataset.navigate);

    const sectorBtn = e.target.closest('[data-navigate-sector]');
    if (sectorBtn) {
      const sectorId = sectorBtn.dataset.sector;
      navigateTo(sectorBtn.dataset.navigateSector, sectorId);
    }
  });

  // Map layer chips
  document.getElementById('map-layers').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    document.querySelectorAll('#map-layers .chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    STATE.selectedMapLayer = chip.dataset.layer;
    renderMap();
  });

  // Neighborhood trend chips
  document.getElementById('nbh-trend-chips').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    document.querySelectorAll('#nbh-trend-chips .chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    STATE.selectedTrendMetric = chip.dataset.metric;
    renderTrendChart(chip.dataset.metric);
  });

  // Model selection chips
  document.getElementById('model-chips').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    document.querySelectorAll('#model-chips .chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    STATE.selectedModel = chip.dataset.model;
    renderPredictionChart();
    addLog('info', `Model switched to ${STATE.selectedModel.toUpperCase()}.`);
  });

  // Prediction metric chips
  document.getElementById('predict-metric-chips').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    document.querySelectorAll('#predict-metric-chips .chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    STATE.selectedPredictMetric = chip.dataset.pmetric;
    renderPredictionChart();
  });

  // Year slider
  document.getElementById('year-slider').addEventListener('input', (e) => {
    STATE.projectionYear = parseInt(e.target.value);
    document.getElementById('year-display').textContent = STATE.projectionYear;
    document.getElementById('projected-year-label').textContent = '// ' + STATE.projectionYear;
  });

  document.getElementById('year-slider').addEventListener('change', () => {
    showCalculating(() => {
      renderPredictionChart();
      renderProjectedMetrics();
      renderFutureRadar();
      renderAlertsTimeline();
    });
  });

  // Entropy slider
  document.getElementById('entropy-slider').addEventListener('input', (e) => {
    STATE.entropySeed = parseInt(e.target.value);
    document.getElementById('entropy-value').textContent = STATE.entropySeed;
    updateInterventionEffects();
  });

  // Buffer slider
  document.getElementById('buffer-slider').addEventListener('input', (e) => {
    STATE.realityBufferMonths = parseInt(e.target.value);
    document.getElementById('buffer-value').textContent = STATE.realityBufferMonths;
    updateInterventionEffects();
  });

  // Null zone toggle
  document.getElementById('nullzone-toggle').addEventListener('change', (e) => {
    STATE.nullZoneOn = e.target.checked;
    updateNullZoneStatus();
    updateInterventionEffects();
    addLog(STATE.nullZoneOn ? 'system' : 'warn', STATE.nullZoneOn ? 'Null zones enabled. 4 sectors designated as safe harbor.' : 'Null zones disabled. Panopticon active.');
  });

  // Apply intervention
  document.getElementById('apply-intervention').addEventListener('click', () => {
    const impact = EntropyEngine.calculateInterventionImpact(STATE.entropySeed, STATE.realityBufferMonths, STATE.nullZoneOn);
    STATE.efficiency = impact.after.eff;
    STATE.sovereignty = impact.after.sov;
    STATE.resilience = impact.after.res;
    STATE.predictability = impact.after.pre;
    addLog('system', `Intervention applied. Entropy: ${STATE.entropySeed}%, Buffer: ${STATE.realityBufferMonths}mo, Null Zones: ${STATE.nullZoneOn ? 'ON' : 'OFF'}.`);
    addLog('info', `New system state — EFF: ${STATE.efficiency}%, SOV: ${STATE.sovereignty}%, RES: ${STATE.resilience}%, PRE: ${STATE.predictability}%.`);

    const risk = EntropyEngine.checkFreedomRisk(STATE.sovereignty);
    if (risk.level === 'critical') addLog('error', risk.title + ': ' + risk.msg);
    else if (risk.level === 'warning') addLog('warn', risk.title + ': ' + risk.msg);
    else addLog('info', risk.title + ': ' + risk.msg);

    navigateTo('dashboard');
  });

  // Reset intervention
  document.getElementById('reset-intervention').addEventListener('click', () => {
    STATE.entropySeed = 5;
    STATE.realityBufferMonths = 12;
    STATE.nullZoneOn = false;
    renderIntervention();
    addLog('system', 'Intervention parameters reset to defaults.');
  });

  // Log filter chips
  document.getElementById('log-filter-chips').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    document.querySelectorAll('#log-filter-chips .chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    STATE.logFilter = chip.dataset.filter;
    updateLogDisplay();
  });
}

// ── INIT ──────────────────────────────────────────────────
function initApp() {
  // Load initial logs
  INITIAL_LOGS.forEach(l => STATE.logEntries.push(l));

  bindEvents();
  renderDashboard();

  // Uptime ticker
  setInterval(() => {
    if (STATE.currentPage === 'log') {
      document.getElementById('log-uptime').textContent = timeStr();
    }
  }, 1000);

  // Periodic log entries
  const periodicMessages = [
    { level: 'info', msg: 'Heartbeat OK. All systems nominal.' },
    { level: 'info', msg: 'Census data cache valid. Next refresh in 22h.' },
    { level: 'system', msg: 'Entropy engine cycling. Seed stability confirmed.' },
    { level: 'warn', msg: 'Prediction confidence degrading. Increase observation window.' },
    { level: 'info', msg: 'BLS employment data synced. 24 series updated.' },
    { level: 'system', msg: 'VOID_PULSE> Entropy is not chaos. It is the space where the unplanned can exist.' },
    { level: 'info', msg: 'Sector sovereignty recalculated. 3 sectors in warning state.' },
    { level: 'system', msg: 'GHOST_RUNNER> The map is not the territory. The algorithm is not the city.' },
  ];

  let msgIdx = 0;
  setInterval(() => {
    const m = periodicMessages[msgIdx % periodicMessages.length];
    addLog(m.level, m.msg);
    msgIdx++;
  }, 15000);
}

// ── START ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', runBootSequence);
