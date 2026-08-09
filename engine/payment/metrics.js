/**
 * Engine · Bank intake metrics (developer mode only in products)
 */

export function createBankMetrics() {
  return {
    transactionsIngested: 0,
    automaticMatches: 0,
    ambiguousMatches: 0,
    unmatchedTransactions: 0,
    duplicatesPrevented: 0,
    reversals: 0,
    executionsCompletedFromBankTruth: 0,
    awaitingEvidenceCreated: 0,
    receiptMatches: 0,
  };
}

let session = createBankMetrics();

export function getBankMetrics() {
  return { ...session };
}

export function resetBankMetrics() {
  session = createBankMetrics();
  return getBankMetrics();
}

export function bumpBankMetric(key, n = 1) {
  if (!(key in session)) return getBankMetrics();
  session[key] += n;
  return getBankMetrics();
}
