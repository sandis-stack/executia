/**
 * Engine · Payment truth domain
 */

export {
  PAYMENT_TRUTH,
  createPaymentTruth,
  appendPaymentHistory,
  isPaymentBooked,
  isPaymentReversed,
} from './truth.js';
export { matchBankTransaction, matchReceiptToAwaiting, scoreMatch } from './matching.js';
export {
  processBankTransaction,
  ingestFromBankAdapter,
  applyBankPaymentTruth,
  applyReversal,
  tryMatchInvoiceToBankAwaiting,
  resolveAmbiguousPaymentMatch,
} from './from-bank-event.js';
export {
  bankEventKey,
  findBankEvent,
  rememberBankEvent,
  clearBankIdempotency,
} from './idempotency.js';
export {
  createBankMetrics,
  getBankMetrics,
  resetBankMetrics,
  bumpBankMetric,
} from './metrics.js';
