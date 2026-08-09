/**
 * Align Supplier Memory when Learning context truth changes.
 * Kept separate to avoid Learning ↔ Memory import cycles.
 */

import {
  FIRST_CONFIRM_CONFIDENCE,
  CONFIRM_STEP,
  MAX_CONFIDENCE,
  CONTRADICTION_CONFIDENCE,
} from '../learning/confidence.js';
import { MEMORY_TYPES, createSupplierMemory, memoryId, normalizeMemoryKey } from './memory-objects.js';
import { getMemoryRecord, putMemoryRecord } from './memory-store.js';

function strengthenProfile(record, at) {
  const count = (record.confirmationCount || 0) + 1;
  const confidence =
    count === 1
      ? FIRST_CONFIRM_CONFIDENCE
      : Math.min(
          MAX_CONFIDENCE,
          Math.round(((Number(record.confidence) || FIRST_CONFIRM_CONFIDENCE) + CONFIRM_STEP) * 100) / 100,
        );
  return {
    ...record,
    confidence,
    confirmationCount: count,
    lastConfirmed: at,
  };
}

export function alignSupplierMemoryContext(supplier, context, { contradicted = false, at = new Date().toISOString() } = {}) {
  const key = normalizeMemoryKey(supplier);
  if (!key || key === 'unknown' || key === 'unknown supplier') return null;
  if (context !== 'business' && context !== 'personal') return null;

  const id = memoryId(MEMORY_TYPES.SUPPLIER, key);
  const record = getMemoryRecord(id) || createSupplierMemory({ key, displayName: supplier, at });
  const attributes = { ...record.attributes, businessContext: context };

  let next = {
    ...record,
    attributes,
    lastChanged: at,
    lastConfirmed: at,
  };

  if (contradicted) {
    next.confidence = CONTRADICTION_CONFIDENCE;
    next.confirmationCount = 1;
  } else {
    next = strengthenProfile(next, at);
  }

  return putMemoryRecord(next);
}
