/**
 * Execution Intelligence — Decision Engine (reserved)
 * Authority: EXECUTIA_EXECUTION_INTELLIGENCE_MODEL.md §10
 *
 * Not yet implemented — canonical placeholder only.
 */

import { INSUFFICIENT_BASIS } from './constants.js';

/**
 * @param {object} _reasoning
 * @param {object} _validation
 * @param {object} _evidence
 * @param {object} _outlook
 * @returns {object}
 */
export function runDecision(_reasoning, _validation, _evidence, _outlook) {
  return {
    outcome: INSUFFICIENT_BASIS,
    reason: 'Decision Engine is not yet implemented.',
  };
}
