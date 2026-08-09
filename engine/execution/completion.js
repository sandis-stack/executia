/**
 * Engine · Execution completion policy
 *
 * Engine truth established ≠ Execution Complete.
 * Complete only when every required consequence satisfies policy.
 */

import {
  ACCOUNTING_SYNC_STATUS,
  normalizeAccountingSyncStatus,
  accountingSyncRequested,
} from '../accounting/index.js';

/** Government filing is not required until a real filing adapter is bound by policy. */
export function governmentSyncRequested(_invoice) {
  return false;
}

/**
 * Bank settlement required once payment truth is in flight (pending/scheduled),
 * or when consequences explicitly demand bank proof.
 * Approve-only scheduled payment without paymentTruth does not require bank yet.
 */
export function paymentSettlementRequired(invoice) {
  if (invoice?.consequences?.payment?.requireBankSettlement) return true;
  const truth = invoice?.paymentTruth?.status;
  return truth === 'pending' || truth === 'scheduled';
}

export function evidenceSatisfied(invoice) {
  if (invoice?.awaitingEvidence && !invoice?.document) return false;
  if (!invoice?.document) return true;
  return (
    invoice.evidenceStatus === 'verified' ||
    invoice.evidenceStatus === 'captured' ||
    Boolean(invoice.document?.id)
  );
}

export function accountingSyncSatisfied(invoice) {
  if (!accountingSyncRequested(invoice)) return true;
  const status = normalizeAccountingSyncStatus(
    invoice?.sync?.accounting?.status || invoice?.synchronizationStatus,
  );
  return status === ACCOUNTING_SYNC_STATUS.SYNCHRONIZED;
}

export function governmentSyncSatisfied(invoice) {
  if (!governmentSyncRequested(invoice)) return true;
  const status = normalizeAccountingSyncStatus(invoice?.sync?.government?.status);
  return status === ACCOUNTING_SYNC_STATUS.SYNCHRONIZED;
}

export function paymentSettlementSatisfied(invoice) {
  if (!paymentSettlementRequired(invoice)) return true;
  if (invoice?.paymentSettled) return true;
  return invoice?.paymentTruth?.status === 'booked';
}

/**
 * Auth/config/immutable divergence — human intervention required.
 * Temporary transport failures stay in Executing for automatic retry.
 */
export function accountingSyncNeedsHuman(syncResult) {
  if (!syncResult) return false;
  const status = normalizeAccountingSyncStatus(syncResult.status);
  if (status === ACCOUNTING_SYNC_STATUS.REQUIRES_ATTENTION) return true;
  const reason = syncResult.metadata?.reason;
  if (
    reason === 'credentials_missing' ||
    reason === 'external_record_immutable' ||
    reason === 'provider_auth'
  ) {
    return true;
  }
  const http = syncResult.metadata?.httpStatus;
  return http === 401 || http === 403;
}

export function getCompletionRequirements(invoice) {
  return {
    evidence: true,
    accountingSync: accountingSyncRequested(invoice),
    governmentSync: governmentSyncRequested(invoice),
    paymentSettlement: paymentSettlementRequired(invoice),
  };
}

/**
 * @returns {{
 *   complete: boolean,
 *   truthEstablished: boolean,
 *   unmet: string[],
 *   requirements: object,
 *   reason: string|null
 * }}
 */
export function evaluateExecutionCompletion(invoice) {
  const requirements = getCompletionRequirements(invoice);
  const unmet = [];

  const truthEstablished = Boolean(
    invoice?.truthEstablished ||
      (invoice?.consequences?.vat &&
        invoice?.consequences?.accounting &&
        invoice?.accountingIntent?.executionObjectId),
  );

  if (!evidenceSatisfied(invoice)) unmet.push('evidence');
  if (requirements.accountingSync && !accountingSyncSatisfied(invoice)) {
    unmet.push('accounting_sync');
  }
  if (requirements.governmentSync && !governmentSyncSatisfied(invoice)) {
    unmet.push('government_sync');
  }
  if (requirements.paymentSettlement && !paymentSettlementSatisfied(invoice)) {
    unmet.push('payment_settlement');
  }

  // Must have established Engine truth before Complete
  if (!truthEstablished) unmet.push('engine_truth');

  const complete = unmet.length === 0;
  return {
    complete,
    truthEstablished,
    unmet,
    requirements,
    reason: complete ? null : `unmet:${unmet.join(',')}`,
  };
}
