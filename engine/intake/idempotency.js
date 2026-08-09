/**
 * Engine · Intake idempotency
 * Same source identity → same execution object.
 */

const KEY = 'executia.engine.intake.idempotency.v1';

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
    if (canUseLocalStorage()) {
      return JSON.parse(localStorage.getItem(KEY) || '{}');
    }
  } catch {
    /* fall through */
  }
  return globalThis.__executiaIntakeIdempotency || {};
}

function writeMap(map) {
  if (canUseLocalStorage()) {
    localStorage.setItem(KEY, JSON.stringify(map));
    return;
  }
  globalThis.__executiaIntakeIdempotency = map;
}

/**
 * Deterministic key: provider + messageId + attachmentId|hash
 */
export function sourceIdentityKey({ provider, messageId, attachmentId, contentHash }) {
  const att = attachmentId || contentHash || 'no-attachment';
  return `${provider || 'unknown'}::${messageId || 'unknown'}::${att}`;
}

export function findBySourceIdentity(identity) {
  const key = typeof identity === 'string' ? identity : sourceIdentityKey(identity);
  const entry = readMap()[key];
  return entry || null;
}

export function rememberSourceIdentity(identity, invoiceId) {
  const key = typeof identity === 'string' ? identity : sourceIdentityKey(identity);
  const map = readMap();
  map[key] = { invoiceId, key, at: new Date().toISOString() };
  writeMap(map);
  return map[key];
}

export function clearIdempotency() {
  writeMap({});
}
