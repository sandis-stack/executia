/**
 * Documents adapter · local
 * Stores evidence locally. No business decisions.
 */

const DB_KEY = 'executia.life.evidence.v1';

function canUseLocalStorage() {
  return (
    typeof localStorage !== 'undefined' &&
    localStorage &&
    typeof localStorage.getItem === 'function' &&
    typeof localStorage.setItem === 'function'
  );
}

function readAll() {
  try {
    if (canUseLocalStorage()) {
      return JSON.parse(localStorage.getItem(DB_KEY) || '{}');
    }
  } catch {
    /* fall through */
  }
  return globalThis.__executiaEvidenceStore || {};
}

function writeAll(map) {
  if (canUseLocalStorage()) {
    localStorage.setItem(DB_KEY, JSON.stringify(map));
    return;
  }
  globalThis.__executiaEvidenceStore = map;
}

/**
 * @param {File} file
 * @param {object} [provenance]
 */
export async function storeEvidenceFile(file, provenance = null) {
  const dataUrl = await readAsDataURL(file);
  return storeEvidenceRecord({
    name: file.name,
    mimeType: file.type || 'application/octet-stream',
    size: file.size,
    dataUrl,
    provenance,
  });
}

/**
 * Store evidence from bytes / base64 (email attachments, fixtures).
 * @param {{ name: string, mimeType: string, contentBase64?: string, dataUrl?: string, size?: number, contentHash?: string, provenance?: object }} input
 */
export async function storeEvidenceBytes(input) {
  if (!input?.name) throw new Error('EVIDENCE_MISSING_NAME');
  const mimeType = input.mimeType || 'application/octet-stream';
  let dataUrl = input.dataUrl;
  if (!dataUrl && input.contentBase64) {
    dataUrl = `data:${mimeType};base64,${input.contentBase64}`;
  }
  if (!dataUrl) throw new Error('EVIDENCE_UNREADABLE');

  return storeEvidenceRecord({
    name: input.name,
    mimeType,
    size: input.size != null ? input.size : Math.floor((input.contentBase64 || '').length * 0.75),
    dataUrl,
    contentHash: input.contentHash || null,
    provenance: input.provenance || null,
  });
}

function storeEvidenceRecord({ name, mimeType, size, dataUrl, contentHash = null, provenance = null }) {
  const id = `ev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  const map = readAll();
  map[id] = {
    id,
    name,
    mimeType,
    size,
    dataUrl,
    contentHash,
    provenance,
    storedAt: new Date().toISOString(),
  };
  writeAll(map);
  return {
    id,
    name: map[id].name,
    mimeType: map[id].mimeType,
    size: map[id].size,
    contentHash: map[id].contentHash,
    provenance: map[id].provenance,
  };
}

export function getEvidence(id) {
  return readAll()[id] || null;
}

export function clearEvidenceStore() {
  writeAll({});
}

function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
