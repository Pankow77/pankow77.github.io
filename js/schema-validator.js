/**
 * schema-validator.js — Central Schema Validation
 * ═══════════════════════════════════════════════════
 * Hybrid Syndicate / Ethic Software Foundation
 *
 * Lightweight validator for canonical schemas.
 * Import and use in any module to validate data before emission.
 *
 * Design:
 *   - Returns { valid, errors[] } — never throws
 *   - Checks structural compliance, enum membership, range constraints
 *   - Does NOT modify data — read-only validation
 *   - In dev mode: logs warnings. In production: silent, returns result.
 *
 * Usage:
 *   import { validate } from './schema-validator.js';
 *   const result = validate('epoch', data);
 *   if (!result.valid) console.warn(result.errors);
 *
 * ═══════════════════════════════════════════════════
 */

import {
    ACTORS, ACTION_TYPES, DOMAINS, STANCES,
    CORRELATION_PATTERNS, CHRONOS_PHASES, PNEUMA_STATES,
    MUTATION_TYPES, PREDICTION_STATUS, SEVERITY, SOURCE_TYPES,
    THEATERS
} from '../specs/ecosystem-schemas.js';

const SCHEMA_VERSION = '1.0';

// ── Helpers ──

function enumValues(obj) {
    return Object.values(obj);
}

function flatEnumValues(nestedObj) {
    const all = [];
    for (const sub of Object.values(nestedObj)) {
        all.push(...Object.values(sub));
    }
    return all;
}

function err(field, msg) {
    return `${field}: ${msg}`;
}

// ── Core checks ──

function checkRequired(data, field, errors) {
    if (data[field] === undefined || data[field] === null) {
        errors.push(err(field, 'required'));
        return false;
    }
    return true;
}

function checkType(data, field, type, errors) {
    if (data[field] === undefined || data[field] === null) return true; // skip if absent
    const val = data[field];
    if (type === 'string' && typeof val !== 'string') { errors.push(err(field, `expected string, got ${typeof val}`)); return false; }
    if (type === 'number' && typeof val !== 'number') { errors.push(err(field, `expected number, got ${typeof val}`)); return false; }
    if (type === 'boolean' && typeof val !== 'boolean') { errors.push(err(field, `expected boolean, got ${typeof val}`)); return false; }
    if (type === 'object' && (typeof val !== 'object' || Array.isArray(val))) { errors.push(err(field, `expected object, got ${typeof val}`)); return false; }
    if (type === 'array' && !Array.isArray(val)) { errors.push(err(field, `expected array, got ${typeof val}`)); return false; }
    return true;
}

function checkRange(data, field, min, max, errors) {
    const val = data[field];
    if (typeof val !== 'number') return;
    if (val < min || val > max) {
        errors.push(err(field, `out of range [${min}, ${max}]: ${val}`));
    }
}

function checkEnum(data, field, allowed, errors) {
    const val = data[field];
    if (val === undefined || val === null) return;
    if (!allowed.includes(val)) {
        errors.push(err(field, `invalid enum value "${val}". Allowed: ${allowed.join(', ')}`));
    }
}

function checkProvenance(data, errors) {
    if (!data.provenance || typeof data.provenance !== 'object') {
        errors.push(err('provenance', 'required object'));
    }
}

function checkBase(data, errors) {
    checkRequired(data, 'schemaVersion', errors);
    checkRequired(data, 'id', errors);
    checkRequired(data, 'type', errors);
    checkRequired(data, 'ts', errors);
    checkType(data, 'ts', 'number', errors);
    checkProvenance(data, errors);
}

// ═══════════════════════════════════════════════════
// SCHEMA VALIDATORS
// ═══════════════════════════════════════════════════

const validators = {

    epoch(data) {
        const errors = [];
        checkBase(data, errors);
        checkRequired(data, 'theater', errors);
        checkRequired(data, 'actor', errors);
        checkRequired(data, 'actionType', errors);

        // Validate actor against theater enum
        if (data.theater && data.actor && ACTORS[data.theater]) {
            checkEnum(data, 'actor', enumValues(ACTORS[data.theater]), errors);
        }
        // Validate actionType against theater enum
        if (data.theater && data.actionType && ACTION_TYPES[data.theater]) {
            checkEnum(data, 'actionType', enumValues(ACTION_TYPES[data.theater]), errors);
        }

        checkRange(data, 'intensity', 1, 5, errors);
        checkRange(data, 'confidence', 0, 1, errors);

        // Validate domains
        if (Array.isArray(data.domains)) {
            const validDomains = enumValues(DOMAINS);
            for (const d of data.domains) {
                if (!validDomains.includes(d)) {
                    errors.push(err('domains', `invalid domain "${d}"`));
                }
            }
        }

        // Provenance specifics
        if (data.provenance) {
            if (data.provenance.sourceType) {
                checkEnum(data.provenance, 'sourceType', enumValues(SOURCE_TYPES), errors);
            }
            checkRange(data.provenance, 'sourceWeight', 0, 1, errors);
        }

        return { valid: errors.length === 0, errors };
    },

    correlation(data) {
        const errors = [];
        checkBase(data, errors);
        checkRequired(data, 'theater', errors);
        checkRequired(data, 'pattern', errors);
        checkRequired(data, 'actors', errors);
        checkRequired(data, 'confidence', errors);

        checkEnum(data, 'pattern', enumValues(CORRELATION_PATTERNS), errors);
        checkRange(data, 'confidence', 0, 1, errors);

        if (data.severity) {
            checkEnum(data, 'severity', enumValues(SEVERITY), errors);
        }

        return { valid: errors.length === 0, errors };
    },

    'commentary-unit'(data) {
        const errors = [];
        checkBase(data, errors);
        checkRequired(data, 'theater', errors);
        checkRequired(data, 'core', errors);
        checkRequired(data, 'stance', errors);
        checkRequired(data, 'confidence', errors);
        checkRequired(data, 'weight', errors);

        checkEnum(data, 'stance', enumValues(STANCES), errors);
        checkRange(data, 'confidence', 0, 1, errors);

        return { valid: errors.length === 0, errors };
    },

    'cognitive-state'(data) {
        const errors = [];
        checkBase(data, errors);
        checkRequired(data, 'theater', errors);
        checkRequired(data, 'consensus', errors);
        checkRequired(data, 'divergence', errors);
        checkRequired(data, 'polarization', errors);
        checkRequired(data, 'riskVector', errors);
        checkRequired(data, 'dominantNarrative', errors);

        checkRange(data, 'consensus', 0, 1, errors);
        checkRange(data, 'divergence', 0, 1, errors);
        checkRange(data, 'polarization', 0, 1, errors);
        checkEnum(data, 'dominantNarrative', enumValues(STANCES), errors);

        if (data.riskVector && typeof data.riskVector === 'object') {
            checkRange(data.riskVector, 'military', 0, 1, errors);
            checkRange(data.riskVector, 'political', 0, 1, errors);
            checkRange(data.riskVector, 'social', 0, 1, errors);
        }

        return { valid: errors.length === 0, errors };
    },

    'oracle-mutation'(data) {
        const errors = [];
        checkBase(data, errors);
        checkRequired(data, 'theater', errors);
        checkRequired(data, 'mutationType', errors);
        checkRequired(data, 'parametersChanged', errors);
        checkRequired(data, 'reason', errors);

        checkEnum(data, 'mutationType', enumValues(MUTATION_TYPES), errors);
        checkEnum(data, 'status', ['proposed', 'applied', 'rejected', 'rolled-back'], errors);
        checkRange(data, 'confidence', 0, 1, errors);

        return { valid: errors.length === 0, errors };
    },

    prediction(data) {
        const errors = [];
        checkBase(data, errors);
        checkRequired(data, 'theater', errors);
        checkRequired(data, 'predictedEvent', errors);
        checkRequired(data, 'confidence', errors);
        checkRequired(data, 'expiresAt', errors);

        checkRange(data, 'confidence', 0, 1, errors);
        checkEnum(data, 'status', enumValues(PREDICTION_STATUS), errors);
        if (data.score !== null && data.score !== undefined) {
            checkRange(data, 'score', 0, 1, errors);
        }

        return { valid: errors.length === 0, errors };
    },

    'archive-snapshot'(data) {
        const errors = [];
        checkBase(data, errors);
        checkRequired(data, 'sequence', errors);
        checkRequired(data, 'hash', errors);
        checkType(data, 'sequence', 'number', errors);
        checkType(data, 'hash', 'string', errors);
        checkType(data, 'epochIds', 'array', errors);
        checkType(data, 'correlationIds', 'array', errors);
        checkType(data, 'predictionIds', 'array', errors);

        if (data.sealed !== true) {
            errors.push(err('sealed', 'archive snapshots must be sealed (true)'));
        }

        return { valid: errors.length === 0, errors };
    },

    'pneuma-state'(data) {
        const errors = [];
        checkBase(data, errors);
        checkRequired(data, 'homeostasis', errors);

        checkEnum(data, 'homeostasis', enumValues(PNEUMA_STATES), errors);
        checkRange(data, 'entropy', 0, 1, errors);
        checkRange(data, 'load', 0, 1, errors);
        checkRange(data, 'coherence', 0, 1, errors);
        checkRange(data, 'trustScore', 0, 1, errors);

        if (data.gating) {
            checkRange(data.gating, 'confidenceFloor', 0, 1, errors);
            checkRange(data.gating, 'maxRssIntensity', 1, 5, errors);
            checkRange(data.gating, 'correlationSensitivity', 0, 2, errors);
        }

        return { valid: errors.length === 0, errors };
    },

    'chronos-phase'(data) {
        const errors = [];
        checkBase(data, errors);
        checkRequired(data, 'theater', errors);
        checkRequired(data, 'phase', errors);

        checkEnum(data, 'phase', enumValues(CHRONOS_PHASES), errors);
        if (data.previousPhase) {
            checkEnum(data, 'previousPhase', enumValues(CHRONOS_PHASES), errors);
        }
        checkRange(data, 'phaseConfidence', 0, 1, errors);

        return { valid: errors.length === 0, errors };
    },
};

// ═══════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════

/**
 * Validate data against a canonical schema.
 * @param {string} schemaType - One of: 'epoch', 'correlation', 'commentary-unit',
 *   'cognitive-state', 'oracle-mutation', 'prediction', 'archive-snapshot',
 *   'pneuma-state', 'chronos-phase'
 * @param {object} data - The data to validate
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validate(schemaType, data) {
    const validator = validators[schemaType];
    if (!validator) {
        return { valid: false, errors: [`Unknown schema type: "${schemaType}"`] };
    }
    if (!data || typeof data !== 'object') {
        return { valid: false, errors: ['Data must be a non-null object'] };
    }
    return validator(data);
}

/**
 * Validate and log warnings in dev mode.
 * @param {string} schemaType
 * @param {object} data
 * @param {string} callerModule - Name of the calling module (for logging)
 * @returns {boolean} True if valid
 */
export function assertValid(schemaType, data, callerModule = 'unknown') {
    const result = validate(schemaType, data);
    if (!result.valid) {
        console.warn(
            `%c[SCHEMA] %c${callerModule} %cemitted invalid ${schemaType}:`,
            'color: #ff3344; font-weight: bold;',
            'color: #ffd700;',
            'color: #ff8833;',
            result.errors
        );
    }
    return result.valid;
}

/**
 * Get list of all supported schema types.
 * @returns {string[]}
 */
export function getSchemaTypes() {
    return Object.keys(validators);
}

/**
 * Get the current schema version.
 * @returns {string}
 */
export function getSchemaVersion() {
    return SCHEMA_VERSION;
}

export default { validate, assertValid, getSchemaTypes, getSchemaVersion };
