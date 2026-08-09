/**
 * Evidence bridge for Fiken attachments.
 * Bytes come from injected ports — adapter never owns Engine evidence store.
 */

export function dataUrlToBytes(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  const comma = dataUrl.indexOf(',');
  if (comma < 0) return null;
  const header = dataUrl.slice(0, comma);
  const b64 = dataUrl.slice(comma + 1);
  const mimeMatch = /data:([^;]+)/.exec(header);
  const mimeType = mimeMatch?.[1] || 'application/octet-stream';

  if (typeof Buffer !== 'undefined') {
    return { bytes: Buffer.from(b64, 'base64'), mimeType };
  }
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return { bytes, mimeType };
}

/**
 * @param {object} intent
 * @param {{ getEvidence?: (id: string) => object|null }} ports
 */
export function resolveEvidencePayload(intent, ports = {}) {
  const evidenceId = intent.evidenceReference?.evidenceId;
  if (!evidenceId) return null;
  if (typeof ports.getEvidence !== 'function') {
    return { missing: true, reason: 'getEvidence_port_missing', evidenceId };
  }
  const record = ports.getEvidence(evidenceId);
  if (!record?.dataUrl) {
    return { missing: true, reason: 'evidence_bytes_missing', evidenceId };
  }
  const decoded = dataUrlToBytes(record.dataUrl);
  if (!decoded) return { missing: true, reason: 'evidence_decode_failed', evidenceId };
  return {
    evidenceId,
    filename: record.name || intent.evidenceReference?.documentName || 'evidence.pdf',
    mimeType: record.mimeType || decoded.mimeType,
    bytes: decoded.bytes,
    contentHash: record.contentHash || intent.evidenceReference?.contentHash || null,
  };
}
