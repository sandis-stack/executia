/**
 * Engine · Normalized accounting synchronization states
 * Provider-specific errors stay in adapter metadata.
 */

export const ACCOUNTING_SYNC_STATUS = {
  NOT_REQUESTED: 'not_requested',
  QUEUED: 'queued',
  SYNCING: 'syncing',
  SYNCHRONIZED: 'synchronized',
  FAILED: 'failed',
  REQUIRES_ATTENTION: 'requires_attention',
};

/** Map any adapter/legacy label into the Engine contract. */
export function normalizeAccountingSyncStatus(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'not_requested' || s === 'not_required') return ACCOUNTING_SYNC_STATUS.NOT_REQUESTED;
  if (s === 'queued' || s === 'pending' || s === 'stubbed') return ACCOUNTING_SYNC_STATUS.QUEUED;
  if (s === 'syncing') return ACCOUNTING_SYNC_STATUS.SYNCING;
  if (s === 'synchronized' || s === 'synced' || s === 'ok') return ACCOUNTING_SYNC_STATUS.SYNCHRONIZED;
  if (s === 'requires_attention' || s === 'exception') return ACCOUNTING_SYNC_STATUS.REQUIRES_ATTENTION;
  if (s === 'failed' || s === 'error' || s === 'blocked') return ACCOUNTING_SYNC_STATUS.FAILED;
  return ACCOUNTING_SYNC_STATUS.FAILED;
}

export function isAccountingSynchronized(status) {
  return normalizeAccountingSyncStatus(status) === ACCOUNTING_SYNC_STATUS.SYNCHRONIZED;
}

export function isAccountingSyncWaiting(status) {
  const n = normalizeAccountingSyncStatus(status);
  return (
    n === ACCOUNTING_SYNC_STATUS.QUEUED ||
    n === ACCOUNTING_SYNC_STATUS.SYNCING ||
    n === ACCOUNTING_SYNC_STATUS.FAILED
  );
}
