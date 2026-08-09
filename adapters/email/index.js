/**
 * Email capability entry — selects provider at the adapter edge.
 * Default: local-mailbox (fixture). Gmail is available but blocked without credentials.
 */

import * as localMailbox from './local-mailbox/adapter.js';
import * as gmail from './gmail/adapter.js';
import { EMAIL_RECEIVE_STATUS } from './contract.js';

export { createNormalizedEmailEvent, EMAIL_RECEIVE_STATUS } from './contract.js';
export { resetLocalMailbox, enqueueFixtureEvent } from './local-mailbox/adapter.js';

/**
 * @param {"local-mailbox"|"gmail"} [provider]
 */
export function getEmailAdapter(provider = 'local-mailbox') {
  if (provider === 'gmail') return gmail;
  return localMailbox;
}

export const adapterInfo = localMailbox.adapterInfo;

export async function receiveEvents() {
  return localMailbox.receiveEvents();
}

export async function probeGmail() {
  return gmail.receiveEvents();
}

export { EMAIL_RECEIVE_STATUS as status };
