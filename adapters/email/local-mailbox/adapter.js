/**
 * Email adapter · local-mailbox
 *
 * Fixture / test provider for production-path intake without live credentials.
 * Clearly not a fake Gmail connection — local events only.
 */

import { createNormalizedEmailEvent, EMAIL_RECEIVE_STATUS } from '../contract.js';
import { FIXTURE_EVENTS } from './fixtures.js';

export const adapterInfo = {
  capability: 'email',
  vendor: 'local-mailbox',
  mode: 'fixture',
  detail: 'Local mailbox fixtures — live provider credentials not required',
};

const CURSOR_KEY = 'executia.email.local-mailbox.cursor.v1';

function readCursor() {
  try {
    if (typeof localStorage !== 'undefined' && localStorage?.getItem) {
      return JSON.parse(localStorage.getItem(CURSOR_KEY) || '{"delivered":[]}');
    }
  } catch {
    /* fall through */
  }
  return globalThis.__executiaLocalMailboxCursor || { delivered: [] };
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
  globalThis.__executiaLocalMailboxCursor = cursor;
}

/**
 * Reset fixture delivery cursor (tests / demos).
 */
export function resetLocalMailbox() {
  writeCursor({ delivered: [] });
}

/**
 * Inject additional fixture events (tests).
 */
export function enqueueFixtureEvent(event, id = event.messageId) {
  const cursor = readCursor();
  cursor.queue = cursor.queue || [];
  cursor.queue.push({ id, event: createNormalizedEmailEvent(event) });
  writeCursor(cursor);
}

/**
 * @returns {Promise<{ status: string, events: object[], detail: string }>}
 */
export async function receiveEvents() {
  const cursor = readCursor();
  const delivered = new Set(cursor.delivered || []);
  const events = [];

  for (const item of FIXTURE_EVENTS) {
    if (delivered.has(item.id)) continue;
    events.push(createNormalizedEmailEvent(item.event));
    delivered.add(item.id);
  }

  for (const item of cursor.queue || []) {
    if (delivered.has(item.id)) continue;
    events.push(createNormalizedEmailEvent(item.event));
    delivered.add(item.id);
  }

  writeCursor({ ...cursor, delivered: [...delivered], queue: [] });

  return {
    status: EMAIL_RECEIVE_STATUS.OK,
    events,
    detail: `local-mailbox delivered ${events.length} event(s)`,
  };
}

export async function acknowledgeEvent(messageId) {
  return { status: EMAIL_RECEIVE_STATUS.OK, messageId };
}
