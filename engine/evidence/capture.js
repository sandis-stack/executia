/**
 * Engine · Evidence capture
 * Binds evidence to an execution object. Storage I/O goes through documents adapter.
 */

import { EVIDENCE_STATUS, touch, INVOICE_STATES } from '../objects/invoice.js';

/**
 * @param {object} invoice
 * @param {{ id: string, name: string, mimeType: string, size: number }} evidenceRef
 */
export function attachEvidence(invoice, evidenceRef) {
  return touch(invoice, {
    document: evidenceRef,
    evidenceStatus: EVIDENCE_STATUS.CAPTURED,
    state: INVOICE_STATES.EVIDENCE_CAPTURED,
  });
}

export function verifyEvidence(invoice) {
  if (!invoice.document) return invoice;
  return touch(invoice, {
    evidenceStatus: EVIDENCE_STATUS.VERIFIED,
  });
}
