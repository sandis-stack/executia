/**
 * Engine · Bank transaction idempotency
 * provider + accountId + transactionId (+ status for reversal updates)
 */

const KEY = 'executia.engine.bank.idempotency.v1';

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
  return globalThis.__executiaBankIdempotency || {};
}

function writeMap(map) {
  if (canUseLocalStorage()) {
    localStorage.setItem(KEY, JSON.stringify(map));
    return;
  }
  globalThis.__executiaBankIdempotency = map;
}

export function bankEventKey({ provider, accountId, transactionId, status }) {
  return `${provider || 'unknown'}::${accountId || 'unknown'}::${transactionId || 'unknown'}::${status || 'booked'}`;
}

export function findBankEvent(key) {
  return readMap()[key] || null;
}

export function rememberBankEvent(key, payload) {
  const map = readMap();
  map[key] = { ...payload, key, at: new Date().toISOString() };
  writeMap(map);
  return map[key];
}

export function clearBankIdempotency() {
  writeMap({});
  globalThis.__executiaBankIdempotency = {};
}
