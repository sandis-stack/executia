/**
 * Engine · Intake
 * Normalized source events → evidence (via ports) → execution objects.
 */

export {
  processSourceEvent,
  ingestFromEmailAdapter,
} from './from-source-event.js';
export {
  detectCandidateDocuments,
  detectPaymentSettled,
  isCandidateAttachment,
} from './detect-candidate.js';
export {
  sourceIdentityKey,
  findBySourceIdentity,
  rememberSourceIdentity,
  clearIdempotency,
} from './idempotency.js';
export {
  createIntakeMetrics,
  getIntakeMetrics,
  resetIntakeMetrics,
  bumpIntakeMetric,
} from './metrics.js';
