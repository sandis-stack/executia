/**
 * Map Engine executionObjectId → Fiken external identities.
 * Retry must update / re-sync the same purchase — never create a duplicate.
 */

const KEY = 'executia.fiken.idempotency.v1';

function canUseLocalStorage() {
  return (
    typeof localStorage !== 'undefined' &&
    localStorage &&
    typeof localStorage.getItem === 'function' &&
    typeof localStorage.setItem === 'function'
  );
}

function readMap() {
  try {
    if (canUseLocalStorage()) return JSON.parse(localStorage.getItem(KEY) || '{}');
  } catch {
    /* fall through */
  }
  return globalThis.__executiaFikenIdempotency || {};
}

function writeMap(map) {
  if (canUseLocalStorage()) {
    localStorage.setItem(KEY, JSON.stringify(map));
    return;
  }
  globalThis.__executiaFikenIdempotency = map;
}

export function findFikenMapping(executionObjectId) {
  if (!executionObjectId) return null;
  return readMap()[executionObjectId] || null;
}

export function rememberFikenMapping(executionObjectId, payload) {
  const map = readMap();
  map[executionObjectId] = {
    ...payload,
    executionObjectId,
    updatedAt: new Date().toISOString(),
  };
  writeMap(map);
  return map[executionObjectId];
}

export function clearFikenIdempotency() {
  writeMap({});
  globalThis.__executiaFikenIdempotency = {};
}

export function intentFingerprint(intent) {
  return JSON.stringify({
    counterparty: intent.counterparty,
    documentDate: intent.documentDate,
    dueDate: intent.dueDate,
    grossAmount: intent.grossAmount,
    netAmount: intent.netAmount,
    vatAmount: intent.vatAmount,
    vatRate: intent.vatTreatment?.rate,
    currency: intent.currency,
    evidenceId: intent.evidenceReference?.evidenceId,
    paymentStatus: intent.paymentTruth?.status,
  });
}
