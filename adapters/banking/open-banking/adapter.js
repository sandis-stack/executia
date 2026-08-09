/**
 * Banking adapter · Open Banking boundary
 *
 * Real provider boundary. Credentials/API not configured — do NOT fake live access.
 */

import { BANK_RECEIVE_STATUS } from '../contract.js';

export const adapterInfo = {
  capability: 'banking',
  vendor: 'open-banking',
  mode: 'blocked',
  detail: 'Open Banking credentials / bank API not configured',
};

export async function receiveTransactions() {
  return {
    status: BANK_RECEIVE_STATUS.BLOCKED,
    transactions: [],
    detail:
      'Open Banking adapter boundary ready. Blocked: no client credentials or consent token. Configure to enable live payment truth.',
  };
}

export async function receiveEvents() {
  const r = await receiveTransactions();
  return { status: r.status, events: r.transactions, detail: r.detail };
}

export async function synchronizePayment(payload) {
  return {
    status: BANK_RECEIVE_STATUS.BLOCKED,
    detail: 'Open Banking not authenticated',
    payload,
    at: new Date().toISOString(),
  };
}
