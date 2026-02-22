/**
 * Selectors — Derived view-models from raw State.
 * ═══════════════════════════════════════════════════
 * Modules NEVER read raw State for rendering.
 * They call a selector that returns a view-model.
 *
 * State is normalized (flat keys, primitive values).
 * View-models are denormalized (structured, ready for DOM).
 *
 * createSelector(keys, deriveFn):
 *   - Reads N state keys
 *   - Passes values to deriveFn
 *   - deriveFn returns a view-model object
 *   - Memoized: same inputs → same output reference (no re-render)
 *
 * Usage:
 *   const selectAgora = createSelector(
 *     ['agora.intensity', 'agora.polarization'],
 *     (intensity, polarization) => ({
 *       intensity,
 *       polarizationBars: polarization.map(v => v / 100),
 *       status: intensity > 80 ? 'CRITICAL' : 'NOMINAL'
 *     })
 *   );
 *
 *   // In module:
 *   const vm = selectAgora();  // cached if inputs unchanged
 */

import { State } from './state.js';

/**
 * Create a memoized selector.
 * @param {string[]}  keys     — State keys to read
 * @param {Function}  deriveFn — (...values) => viewModel
 * @returns {Function} selector() → viewModel
 */
export function createSelector(keys, deriveFn) {
  let cachedInputs = null;
  let cachedResult = null;

  return function select() {
    const inputs = keys.map(k => State.get(k));

    // Shallow compare: if all inputs identical, return cached
    if (cachedInputs !== null) {
      let same = true;
      for (let i = 0; i < inputs.length; i++) {
        if (inputs[i] !== cachedInputs[i]) {
          same = false;
          break;
        }
      }
      if (same) return cachedResult;
    }

    cachedInputs = inputs;
    cachedResult = deriveFn(...inputs);
    return cachedResult;
  };
}
