/**
 * Engine · Synchronization policy
 * Truth stays in the Engine. Adapters perform sync when available.
 */

export function syncIsHealthy(syncResult) {
  if (!syncResult) return false;
  return syncResult.status === 'synced' || syncResult.status === 'stubbed' || syncResult.status === 'not_required';
}
