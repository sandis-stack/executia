/**
 * Engine · Learning rules store
 * Engine-owned confirmed truth. No adapter coupling.
 */

const STORAGE_KEY = 'executia.engine.learning.rules.v1';

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

export function createLocalStorageStore(key = STORAGE_KEY) {
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

export function setActiveStore(store) {
  activeStore = store;
}

export function getActiveStore() {
  if (activeStore) return activeStore;
  if (typeof localStorage !== 'undefined') {
    activeStore = createLocalStorageStore();
    return activeStore;
  }
  activeStore = createMemoryStore();
  return activeStore;
}

export function resetActiveStore(store) {
  activeStore = store || createMemoryStore();
  return activeStore;
}

function ruleId(kind, key) {
  return `${kind}::${key}`;
}

export function getRule(kind, key) {
  const map = getActiveStore().getAll();
  return map[ruleId(kind, key)] || null;
}

export function putRule(rule) {
  const map = getActiveStore().getAll();
  map[ruleId(rule.kind, rule.key)] = rule;
  getActiveStore().setAll(map);
  return rule;
}

export function listRules(kind = null) {
  const map = getActiveStore().getAll();
  const all = Object.values(map);
  return kind ? all.filter((r) => r.kind === kind) : all;
}

export function clearRules() {
  getActiveStore().setAll({});
}
