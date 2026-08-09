/**
 * Banking adapter · local-bank
 * Fixture provider for payment-truth intake without live credentials.
 */

import { createNormalizedBankTransaction, BANK_RECEIVE_STATUS } from '../contract.js';
import { FIXTURE_TRANSACTIONS } from './fixtures.js';

export const adapterInfo = {
  capability: 'banking',
  vendor: 'local-bank',
  mode: 'fixture',
  detail: 'Local bank fixtures — live Open Banking credentials not required',
};

const CURSOR_KEY = 'executia.bank.local-bank.cursor.v1';

function readCursor() {
  try {
    if (typeof localStorage !== 'undefined' && localStorage?.getItem) {
      return JSON.parse(localStorage.getItem(CURSOR_KEY) || '{"delivered":[]}');
    }
  } catch {
    /* fall through */
  }
  return globalThis.__executiaLocalBankCursor || { delivered: [] };
}

function writeCursor(cursor) {
  try {
    if (typeof localStorage !== 'undefined' && localStorage?.setItem) {
      localStorage.setItem(CURSOR_KEY, JSON.stringify(cursor));
      return;
    }
  } catch {
    /* fall through */
  }
  globalThis.__executiaLocalBankCursor = cursor;
}

export function resetLocalBank() {
  writeCursor({ delivered: [] });
  globalThis.__executiaLocalBankCursor = { delivered: [] };
}

export function enqueueBankTransaction(tx, id = tx.transactionId) {
  const cursor = readCursor();
  cursor.queue = cursor.queue || [];
  cursor.queue.push({ id, tx: createNormalizedBankTransaction(tx) });
  writeCursor(cursor);
}

/**
 * Optionally deliver a subset of fixture IDs (tests).
 */
export async function receiveTransactions({ onlyIds = null } = {}) {
  const cursor = readCursor();
  const delivered = new Set(cursor.delivered || []);
  const events = [];

  const pool = onlyIds
    ? FIXTURE_TRANSACTIONS.filter((f) => onlyIds.includes(f.id))
    : FIXTURE_TRANSACTIONS;

  for (const item of pool) {
    if (delivered.has(item.id)) continue;
    events.push(createNormalizedBankTransaction(item.tx));
    delivered.add(item.id);
  }

  for (const item of cursor.queue || []) {
    if (delivered.has(item.id)) continue;
    events.push(createNormalizedBankTransaction(item.tx));
    delivered.add(item.id);
  }

  writeCursor({ ...cursor, delivered: [...delivered], queue: [] });

  return {
    status: BANK_RECEIVE_STATUS.OK,
    transactions: events,
    detail: `local-bank delivered ${events.length} transaction(s)`,
  };
}

/** Alias for capability symmetry with email receiveEvents */
export async function receiveEvents(opts) {
  const r = await receiveTransactions(opts);
  return { status: r.status, events: r.transactions, detail: r.detail };
}

export async function synchronizePayment(payload) {
  return {
    status: 'stubbed',
    detail: 'local-bank fixture — outbound payment sync not live',
    payload,
    at: new Date().toISOString(),
  };
}
