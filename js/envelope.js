/**
 * envelope.js — Hybrid Syndicate Data Contract
 * ═══════════════════════════════════════════════════════════
 * Universal envelope format for all structured data flowing
 * through the ecosystem. If it doesn't pass this schema,
 * it doesn't enter the bloodstream.
 *
 * This is NOT an event format. The Bus carries nerve signals.
 * Envelopes are blood cells — structured, typed, validated.
 *
 * Browser-native ES Module. Zero dependencies.
 * ═══════════════════════════════════════════════════════════
 */

// ── Valid domains ──
const DOMAINS = Object.freeze({
    SIGNAL:     'signal',      // raw observations, detections
    ANALYSIS:   'analysis',    // processed insights, scores
    PREDICTION: 'prediction',  // forecasts, projections
    MUTATION:   'mutation',    // state changes, deltas
    METRIC:     'metric',      // measurements, KPIs
    SYSTEM:     'system'       // internal lifecycle events
});

// ── Valid priorities ──
const PRIORITY = Object.freeze({
    LOW:      'low',
    NORMAL:   'normal',
    HIGH:     'high',
    CRITICAL: 'critical'
});

// ── Priority weights for sorting/filtering ──
const PRIORITY_WEIGHT = Object.freeze({
    low:      0,
    normal:   1,
    high:     2,
    critical: 3
});

// ── Fast lookup sets ──
const VALID_DOMAINS    = new Set(Object.values(DOMAINS));
const VALID_PRIORITIES = new Set(Object.values(PRIORITY));

/**
 * Create a validated, frozen Envelope.
 * This is the ONLY sanctioned way to produce data for the bloodstream.
 *
 * @param {object}   spec
 * @param {string}   spec.source     - Who produced this (module name)
 * @param {string}   spec.domain     - Data domain (signal | analysis | prediction | mutation | metric | system)
 * @param {string}   spec.type       - Specific type within domain (scan, score, sentiment, forecast…)
 * @param {*}        spec.payload    - The actual data
 * @param {object}   [spec.meta]     - Optional metadata
 * @param {number}   [spec.meta.confidence] - 0–1 confidence score
 * @param {number}   [spec.meta.weight]     - Numeric weight / importance
 * @param {string[]} [spec.meta.tags]       - Searchable tags
 * @param {string}   [spec.priority] - Event priority (low | normal | high | critical)
 * @returns {object} Frozen Envelope — immutable once created
 * @throws {Error} If required fields are missing or invalid
 */
function createEnvelope({ source, domain, type, payload, meta = {}, priority = 'normal' }) {
    // ── Validate required fields ──
    if (!source || typeof source !== 'string') {
        throw new Error(`[ENVELOPE] Invalid source: "${source}" — must be a non-empty string.`);
    }
    if (!VALID_DOMAINS.has(domain)) {
        throw new Error(
            `[ENVELOPE] Invalid domain: "${domain}" — must be one of: ${[...VALID_DOMAINS].join(', ')}`
        );
    }
    if (!type || typeof type !== 'string') {
        throw new Error(`[ENVELOPE] Invalid type: "${type}" — must be a non-empty string.`);
    }
    if (payload === undefined) {
        throw new Error('[ENVELOPE] Payload is required — cannot be undefined.');
    }
    if (!VALID_PRIORITIES.has(priority)) {
        throw new Error(
            `[ENVELOPE] Invalid priority: "${priority}" — must be one of: ${[...VALID_PRIORITIES].join(', ')}`
        );
    }

    // ── Normalize confidence to [0, 1] ──
    let confidence = null;
    if (meta.confidence !== undefined && meta.confidence !== null) {
        if (typeof meta.confidence !== 'number') {
            throw new Error(`[ENVELOPE] meta.confidence must be a number — received: ${typeof meta.confidence}`);
        }
        confidence = Math.max(0, Math.min(1, meta.confidence));
        if (confidence !== meta.confidence) {
            console.warn(`[ENVELOPE] confidence clamped to [0,1] — received: ${meta.confidence}, stored: ${confidence}`);
        }
    }

    // ── Normalize meta ──
    const normalizedMeta = Object.freeze({
        confidence,
        weight: typeof meta.weight === 'number' ? meta.weight : null,
        tags:   Array.isArray(meta.tags) ? Object.freeze([...meta.tags]) : Object.freeze([])
    });

    // ── Freeze payload if it's a plain object ──
    const frozenPayload =
        (typeof payload === 'object' && payload !== null && !Array.isArray(payload))
            ? Object.freeze({ ...payload })
            : payload;

    // ── Build & freeze ──
    return Object.freeze({
        id:             crypto.randomUUID(),
        ts:             Date.now(),
        source,
        domain,
        type,
        priority,
        priorityWeight: PRIORITY_WEIGHT[priority],
        payload:        frozenPayload,
        meta:           normalizedMeta
    });
}

/**
 * Validate an existing object against the Envelope schema.
 * Non-throwing — returns a result object.
 *
 * @param {*} obj - Object to validate
 * @returns {{ valid: boolean, errors?: string[] }}
 */
function validateEnvelope(obj) {
    const errors = [];

    if (!obj || typeof obj !== 'object') {
        return { valid: false, errors: ['Not an object'] };
    }

    if (!obj.id   || typeof obj.id   !== 'string')  errors.push('Missing or invalid id');
    if (!obj.ts   || typeof obj.ts   !== 'number')  errors.push('Missing or invalid ts');
    if (!obj.source || typeof obj.source !== 'string') errors.push('Missing or invalid source');
    if (!obj.type || typeof obj.type !== 'string')  errors.push('Missing or invalid type');
    if (obj.payload === undefined)                   errors.push('Missing payload');
    if (!VALID_DOMAINS.has(obj.domain))              errors.push(`Invalid domain: "${obj.domain}"`);
    if (!VALID_PRIORITIES.has(obj.priority))          errors.push(`Invalid priority: "${obj.priority}"`);

    if (obj.meta) {
        if (obj.meta.confidence !== null && obj.meta.confidence !== undefined) {
            if (typeof obj.meta.confidence !== 'number' || obj.meta.confidence < 0 || obj.meta.confidence > 1) {
                errors.push('meta.confidence must be a number in [0, 1]');
            }
        }
        if (obj.meta.tags !== undefined && !Array.isArray(obj.meta.tags)) {
            errors.push('meta.tags must be an array');
        }
    }

    return errors.length === 0
        ? { valid: true }
        : { valid: false, errors };
}

/**
 * Quick type check — is this object shaped like an Envelope?
 * Cheaper than validateEnvelope() for hot paths.
 *
 * @param {*} obj
 * @returns {boolean}
 */
function isEnvelope(obj) {
    return !!(
        obj
        && typeof obj === 'object'
        && typeof obj.id     === 'string'
        && typeof obj.ts     === 'number'
        && typeof obj.source === 'string'
        && typeof obj.type   === 'string'
        && obj.payload !== undefined
        && VALID_DOMAINS.has(obj.domain)
        && VALID_PRIORITIES.has(obj.priority)
    );
}

// ── Console signature ──
console.log(
    '%c[ENVELOPE] %cData Contract loaded %c— domains: ' +
    Object.values(DOMAINS).join(', '),
    'color: #ff6633; font-weight: bold;',
    'color: #39ff14;',
    'color: #6b7fa3;'
);

export { createEnvelope, validateEnvelope, isEnvelope, DOMAINS, PRIORITY, PRIORITY_WEIGHT };
