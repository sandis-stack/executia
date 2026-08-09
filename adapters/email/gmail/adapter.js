/**
 * Email adapter · Gmail
 *
 * Real provider boundary. Authentication/API credentials are not configured
 * in this environment — do NOT fake a live connection.
 *
 * Provider-specific Gmail fields stay here. Only NormalizedEmailEvent leaves.
 */

import { EMAIL_RECEIVE_STATUS } from '../contract.js';

export const adapterInfo = {
  capability: 'email',
  vendor: 'gmail',
  mode: 'blocked',
  detail: 'Gmail OAuth / API credentials not configured',
};

/**
 * @returns {Promise<{ status: string, events: object[], detail: string }>}
 */
export async function receiveEvents() {
  return {
    status: EMAIL_RECEIVE_STATUS.BLOCKED,
    events: [],
    detail:
      'Gmail adapter boundary ready. Blocked: no OAuth client ID/secret or mailbox token. Configure credentials to enable live intake.',
  };
}

export async function acknowledgeEvent() {
  return { status: EMAIL_RECEIVE_STATUS.BLOCKED, detail: 'Gmail not authenticated' };
}
