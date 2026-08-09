/**
 * Engine · Conservative document candidate detection
 * PDF / image attachments only. Not an AI mail assistant.
 */

const CANDIDATE_MIME = /^(application\/pdf|image\/(png|jpe?g|webp|gif))$/i;
const CANDIDATE_EXT = /\.(pdf|png|jpe?g|webp|gif)$/i;

export function isCandidateAttachment(attachment) {
  if (!attachment) return false;
  const mime = String(attachment.mimeType || '');
  const name = String(attachment.filename || attachment.name || '');
  if (CANDIDATE_MIME.test(mime)) return true;
  if (CANDIDATE_EXT.test(name)) return true;
  return false;
}

/**
 * @param {object} event Normalized source event (email or other)
 * @returns {object[]} candidate attachments
 */
export function detectCandidateDocuments(event) {
  const attachments = event?.attachments || [];
  return attachments.filter(isCandidateAttachment);
}

/**
 * Heuristic: payment already settled (receipt) — from normalized metadata/subject only.
 * Never invents amounts; only flags settled consent skip.
 */
export function detectPaymentSettled(event) {
  if (event?.metadata?.paymentSettled === true) return true;
  const subject = String(event?.subject || '');
  return /\b(receipt|already\s+paid|payment\s+confirmation|paid\s+in\s+full)\b/i.test(subject);
}
