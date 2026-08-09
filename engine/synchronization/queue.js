/**
 * Engine · Synchronization policy
 * Truth stays in the Engine. Adapters perform sync when available.
 */

export function syncIsHealthy(syncResult) {
  if (!syncResult) return false;
  const s = syncResult.status;
  return s === 'synchronized' || s === 'synced' || s === 'not_requested' || s === 'not_required';
}
