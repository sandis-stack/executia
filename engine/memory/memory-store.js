/**
 * Engine · Execution Memory store
 * Engine-owned. Adapters never own Memory.
 */

const STORAGE_KEY = 'executia.engine.memory.v1';

/** @type {{ getAll(): object, setAll(map: object): void } | null} */
let activeStore = null;

export function createMemoryStore(seed = {}) {
  let map = { ...seed };
  return {
    getAll() {
      return { ...map };
    },
    setAll(next) {
      map = { ...next };
    },
  };
}

export function createLocalStorageMemoryStore(key = STORAGE_KEY) {
  return {
    getAll() {
      try {
        return JSON.parse(localStorage.getItem(key) || '{}');
      } catch {
        return {};
      }
    },
    setAll(next) {
      localStorage.setItem(key, JSON.stringify(next));
    },
  };
}

export function setActiveMemoryStore(store) {
  activeStore = store;
}

function canUseLocalStorage() {
  return (
    typeof localStorage !== 'undefined' &&
    localStorage &&
    typeof localStorage.getItem === 'function' &&
    typeof localStorage.setItem === 'function'
  );
}

export function getActiveMemoryStore() {
  if (activeStore) return activeStore;
  if (canUseLocalStorage()) {
    activeStore = createLocalStorageMemoryStore();
    return activeStore;
  }
  activeStore = createMemoryStore();
  return activeStore;
}

export function resetActiveMemoryStore(store) {
  activeStore = store || createMemoryStore();
  return activeStore;
}

export function getMemoryRecord(id) {
  return getActiveMemoryStore().getAll()[id] || null;
}

export function putMemoryRecord(record) {
  const map = getActiveMemoryStore().getAll();
  map[record.id] = record;
  getActiveMemoryStore().setAll(map);
  return record;
}

export function listMemoryRecords(type = null) {
  const all = Object.values(getActiveMemoryStore().getAll());
  return type ? all.filter((r) => r.type === type) : all;
}

export function clearMemory() {
  getActiveMemoryStore().setAll({});
}
