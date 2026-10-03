import { describe, expect, it } from 'vitest';
import { bagRemaining, drawFromBag, type BagStorage } from '../src/lib/bag';

function memoryStorage(): BagStorage {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
}

const items = Array.from({ length: 20 }, (_, i) => ({ id: `x${i}` }));

describe('bolsa sin repetición', () => {
  it('saca todos los elementos antes de repetir uno', () => {
    const storage = memoryStorage();
    const seen = new Set(Array.from({ length: 20 }, () => drawFromBag('t', items, { storage }).id));
    expect(seen.size).toBe(20);
    expect(bagRemaining('t', items, storage)).toBe(0);
  });
  it('al rellenarse no repite justo el último', () => {
    const storage = memoryStorage();
    let last = '';
    for (let i = 0; i < 20; i++) last = drawFromBag('t', items, { storage }).id;
    for (let i = 0; i < 30; i++) {
      const s2 = memoryStorage();
      for (let j = 0; j < 20; j++) drawFromBag('u', items, { storage: s2 });
      expect(drawFromBag('u', items, { storage: s2, exclude: [last] }).id).not.toBe(last);
    }
  });
  it('recuerda lo jugado entre sesiones (mismo almacenamiento)', () => {
    const storage = memoryStorage();
    const first = drawFromBag('s', items, { storage }).id;
    expect(bagRemaining('s', items, storage)).toBe(19);
    for (let i = 0; i < 18; i++) expect(drawFromBag('s', items, { storage }).id).not.toBe(first);
  });
  it('ignora ids antiguos que ya no existen', () => {
    const storage = memoryStorage();
    storage.setItem('horator.bag.v', JSON.stringify(['viejo', 'x1']));
    expect(bagRemaining('v', items, storage)).toBe(19);
  });
});
