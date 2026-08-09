/**
 * Email adapter contract — provider-independent.
 * Gmail/Outlook fields must never leak to the Engine.
 */

/**
 * @typedef {object} NormalizedEmailAttachment
 * @property {string} attachmentId
 * @property {string} filename
 * @property {string} mimeType
 * @property {number} [size]
 * @property {string} [contentHash]
 * @property {string} [contentBase64] — fixture/local only; live providers may stream differently
 */

/**
 * @typedef {object} NormalizedEmailEvent
 * @property {"email"} source
 * @property {string} provider
 * @property {string} messageId
 * @property {string} receivedAt
 * @property {string} sender
 * @property {string} subject
 * @property {NormalizedEmailAttachment[]} attachments
 * @property {string|null} bodyReference
 * @property {object} metadata
 */

export function createNormalizedEmailEvent(partial = {}) {
  return {
    source: 'email',
    provider: partial.provider || 'unknown',
    messageId: String(partial.messageId || ''),
    receivedAt: partial.receivedAt || new Date().toISOString(),
    sender: String(partial.sender || ''),
    subject: String(partial.subject || ''),
    attachments: Array.isArray(partial.attachments) ? partial.attachments : [],
    bodyReference: partial.bodyReference ?? null,
    metadata: { ...(partial.metadata || {}) },
  };
}

/**
 * Adapter must implement:
 * - adapterInfo
 * - receiveEvents() → { status, events, detail? }
 * Optional: acknowledgeEvent(messageId)
 */
export const EMAIL_RECEIVE_STATUS = {
  OK: 'ok',
  STUBBED: 'stubbed',
  BLOCKED: 'blocked',
  ERROR: 'error',
};
