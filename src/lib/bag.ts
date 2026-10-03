// Bolsa sin repetición: cada elemento sale una sola vez hasta agotar el montón, y entonces se
// vuelve a barajar. Se guarda en el dispositivo, así que tampoco se repite entre partidas.

export interface BagStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const memory = new Map<string, string>();
const memoryStorage: BagStorage = {
  getItem: (k) => memory.get(k) ?? null,
  setItem: (k, v) => void memory.set(k, v),
};

function defaultStorage(): BagStorage {
  try {
    if (typeof localStorage !== 'undefined') return localStorage;
  } catch {
    /* almacenamiento bloqueado */
  }
  return memoryStorage;
}

function readSeen(storage: BagStorage, key: string): Set<string> {
  try {
    const raw = JSON.parse(storage.getItem(key) ?? '[]');
    return new Set(Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string') : []);
  } catch {
    return new Set();
  }
}

function writeSeen(storage: BagStorage, key: string, seen: Set<string>) {
  try {
    storage.setItem(key, JSON.stringify([...seen]));
  } catch {
    /* sin espacio o bloqueado: la bolsa sigue funcionando en memoria durante la sesión */
  }
}

export interface DrawOptions {
  rand?: () => number;
  /** Ids que no deben salir ahora (p. ej. los últimos jugados), aunque no estén en la bolsa. */
  exclude?: readonly string[];
  storage?: BagStorage;
}

/**
 * Saca un elemento al azar de los que aún no han salido en la bolsa `name`.
 * Cuando ya han salido todos, la bolsa se rellena (evitando `exclude` para que no se repita justo el último).
 */
export function drawFromBag<T extends { id: string }>(name: string, items: readonly T[], opts: DrawOptions = {}): T {
  if (!items.length) throw new Error(`Bolsa vacía: ${name}`);
  const rand = opts.rand ?? Math.random;
  const storage = opts.storage ?? defaultStorage();
  const key = `horator.bag.${name}`;
  const exclude = new Set(opts.exclude ?? []);
  let seen = readSeen(storage, key);
  // Ignora ids antiguos que ya no existen (contenido actualizado).
  const ids = new Set(items.map((i) => i.id));
  seen = new Set([...seen].filter((id) => ids.has(id)));

  let pool = items.filter((i) => !seen.has(i.id) && !exclude.has(i.id));
  if (!pool.length) {
    seen = new Set();
    pool = items.filter((i) => !exclude.has(i.id));
    if (!pool.length) pool = [...items];
  }
  const pick = pool[Math.floor(rand() * pool.length)];
  seen.add(pick.id);
  writeSeen(storage, key, seen);
  return pick;
}

/** Cuántos elementos quedan por salir antes de que la bolsa se rellene. */
export function bagRemaining(name: string, items: readonly { id: string }[], storage: BagStorage = defaultStorage()): number {
  const seen = readSeen(storage, `horator.bag.${name}`);
  return items.filter((i) => !seen.has(i.id)).length;
}
