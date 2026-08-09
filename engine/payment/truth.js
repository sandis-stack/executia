/**
 * Engine · Payment truth
 * Bank proves settlement. Scheduling is not settlement.
 */

export const PAYMENT_TRUTH = {
  NONE: 'none',
  SCHEDULED: 'scheduled',
  PENDING: 'pending',
  BOOKED: 'booked',
  REVERSED: 'reversed',
};

export function createPaymentTruth(partial = {}) {
  return {
    status: partial.status || PAYMENT_TRUTH.NONE,
    provider: partial.provider || null,
    transactionId: partial.transactionId || null,
    accountId: partial.accountId || null,
    bookedAt: partial.bookedAt || null,
    amount: partial.amount != null ? Number(partial.amount) : null,
    currency: partial.currency || null,
    counterparty: partial.counterparty || null,
    reference: partial.reference || null,
    matchedAt: partial.matchedAt || null,
    history: Array.isArray(partial.history) ? partial.history : [],
  };
}

export function appendPaymentHistory(truth, event) {
  const history = [...(truth?.history || []), { ...event, at: event.at || new Date().toISOString() }];
  return { ...truth, history };
}

/** Settlement proven only when bank booked (not scheduled/pending). */
export function isPaymentBooked(invoice) {
  return invoice?.paymentTruth?.status === PAYMENT_TRUTH.BOOKED || invoice?.paymentSettled === true;
}

export function isPaymentReversed(invoice) {
  return invoice?.paymentTruth?.status === PAYMENT_TRUTH.REVERSED;
}
