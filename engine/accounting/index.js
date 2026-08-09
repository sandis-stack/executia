/**
 * Engine · Accounting domain (provider-independent)
 */

export { createAccountingIntent, accountingSyncRequested } from './intent.js';
export {
  ACCOUNTING_SYNC_STATUS,
  normalizeAccountingSyncStatus,
  isAccountingSynchronized,
  isAccountingSyncWaiting,
} from './sync-status.js';
