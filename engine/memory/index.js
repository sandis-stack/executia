/**
 * Engine · Execution Memory v0.1
 *
 * Learning remembers confirmed decisions.
 * Memory remembers execution context.
 *
 * Built only from confirmed execution. Adapters never own Memory.
 */

export { MEMORY_TYPES, normalizeMemoryKey, memoryId } from './memory-objects.js';
export {
  createMemoryStore as createExecutionMemoryStore,
  createLocalStorageMemoryStore,
  setActiveMemoryStore,
  getActiveMemoryStore,
  resetActiveMemoryStore,
  getMemoryRecord,
  putMemoryRecord,
  listMemoryRecords,
  clearMemory,
} from './memory-store.js';
export { restoreExecutionMemory, memoryHasHighContext } from './restore.js';
export {
  enrichFromConfirmedDecision,
  enrichFromCompletedExecution,
  extractConfirmedContext,
} from './enrich.js';
export { alignSupplierMemoryContext } from './align-context.js';

import { restoreExecutionMemory } from './restore.js';
import { enrichFromConfirmedDecision, enrichFromCompletedExecution } from './enrich.js';

/**
 * Apply Memory restore then return invoice ready for Learning / decisions.
 */
export function applyExecutionMemory(invoice) {
  return restoreExecutionMemory(invoice);
}

/**
 * Confirm path: enrich Memory when a decision carries confirmed context.
 */
export function rememberFromDecision(invoice, decisionType, optionId, extras = {}) {
  return enrichFromConfirmedDecision(invoice, decisionType, optionId, extras);
}

/**
 * Completion path: every completed execution enriches Memory.
 */
export function rememberFromCompletedExecution(invoice) {
  return enrichFromCompletedExecution(invoice);
}
