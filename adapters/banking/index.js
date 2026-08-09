/**
 * Banking capability entry — selects provider at the adapter edge.
 * Default: local-bank fixtures. Open Banking blocked without credentials.
 */

import * as localBank from './local-bank/adapter.js';
import * as openBanking from './open-banking/adapter.js';
import { BANK_RECEIVE_STATUS } from './contract.js';

export { createNormalizedBankTransaction, BANK_TX_STATUS, BANK_RECEIVE_STATUS } from './contract.js';
export { resetLocalBank, enqueueBankTransaction } from './local-bank/adapter.js';

export function getBankAdapter(provider = 'local-bank') {
  if (provider === 'open-banking') return openBanking;
  return localBank;
}

export const adapterInfo = localBank.adapterInfo;

export async function receiveTransactions(opts) {
  return localBank.receiveTransactions(opts);
}

export async function synchronizePayment(payload) {
  return localBank.synchronizePayment(payload);
}

export async function probeOpenBanking() {
  return openBanking.receiveTransactions();
}

export { BANK_RECEIVE_STATUS as status };
