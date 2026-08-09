/**
 * Banking adapter contract — provider-independent.
 * Bank-specific fields never leave the adapter.
 */

export const BANK_TX_STATUS = {
  PENDING: 'pending',
  BOOKED: 'booked',
  REVERSED: 'reversed',
};

/**
 * @typedef {object} NormalizedBankTransaction
 * @property {"bank"} source
 * @property {string} provider
 * @property {string} transactionId
 * @property {string} accountId
 * @property {string} bookedAt
 * @property {number} amount — signed; outflow typically negative or absolute per metadata.direction
 * @property {string} currency
 * @property {string} counterparty
 * @property {string} reference
 * @property {"pending"|"booked"|"reversed"} status
 * @property {object} metadata
 */

export function createNormalizedBankTransaction(partial = {}) {
  return {
    source: 'bank',
    provider: partial.provider || 'unknown',
    transactionId: String(partial.transactionId || ''),
    accountId: String(partial.accountId || ''),
    bookedAt: partial.bookedAt || new Date().toISOString(),
    amount: partial.amount != null ? Number(partial.amount) : null,
    currency: String(partial.currency || 'NOK'),
    counterparty: String(partial.counterparty || ''),
    reference: String(partial.reference || ''),
    status: partial.status || BANK_TX_STATUS.BOOKED,
    metadata: { ...(partial.metadata || {}) },
  };
}

export const BANK_RECEIVE_STATUS = {
  OK: 'ok',
  STUBBED: 'stubbed',
  BLOCKED: 'blocked',
  ERROR: 'error',
};
