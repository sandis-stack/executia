/**
 * Documents adapter · local
 * Stores evidence locally. No business decisions.
 */

const DB_KEY = 'executia.life.evidence.v1';

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(DB_KEY) || '{}');
  } catch {
    return {};
  }
}

function writeAll(map) {
  localStorage.setItem(DB_KEY, JSON.stringify(map));
}

/**
 * @param {File} file
 * @returns {Promise<{ id: string, name: string, mimeType: string, size: number }>}
 */
export async function storeEvidenceFile(file) {
  const id = `ev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  const dataUrl = await readAsDataURL(file);
  const map = readAll();
  map[id] = {
    id,
    name: file.name,
    mimeType: file.type || 'application/octet-stream',
    size: file.size,
    dataUrl,
    storedAt: new Date().toISOString(),
  };
  writeAll(map);
  return {
    id,
    name: map[id].name,
    mimeType: map[id].mimeType,
    size: map[id].size,
  };
}

export function getEvidence(id) {
  return readAll()[id] || null;
}

function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
