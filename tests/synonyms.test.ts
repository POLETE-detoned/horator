import { describe, expect, it } from 'vitest';
import { MAX_LEVEL, splitSentence } from '../src/data/synonyms';
import { ROUNDS } from '../src/data/synonymRounds';
import { buildDeck, multiplier, pickRound } from '../src/modes/synonyms/engine';
import type { BagStorage } from '../src/lib/bag';

function memoryStorage(): BagStorage {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
}

describe('contenido', () => {
  it('cada ronda tiene fragmento marcado, buenas y trampas explicadas', () => {
    for (const r of ROUNDS) {
      expect(splitSentence(r.sentence)[1], r.sentence).not.toBe('');
      expect(r.good.length).toBeGreaterThanOrEqual(2);
      expect(r.bad.length).toBeGreaterThanOrEqual(2);
      for (const b of r.bad) expect(b.why.length).toBeGreaterThan(5);
    }
  });
  it('hay al menos 550 frases distintas en cada nivel', () => {
    for (let l = 1; l <= MAX_LEVEL; l++) expect(ROUNDS.filter((r) => r.level === l).length).toBeGreaterThanOrEqual(550);
    const sentences = ROUNDS.map((r) => r.sentence.toLowerCase().replace(/[^\p{L}]/gu, ''));
    expect(new Set(sentences).size).toBe(sentences.length);
  });
  it('ninguna palabra es a la vez buena y trampa en la misma ronda', () => {
    for (const r of ROUNDS) {
      const words = [...r.good, ...r.bad.map((b) => b.word)].map((w) => w.toLowerCase());
      expect(new Set(words).size, r.sentence).toBe(words.length);
    }
  });
});

describe('motor', () => {
  it('el mazo empieza por una tarjeta buena', () => {
    for (let i = 0; i < 50; i++) expect(buildDeck(ROUNDS[i % ROUNDS.length])[0].good).toBe(true);
  });
  it('el multiplicador sube cada 3 aciertos y respeta el tope', () => {
    expect(multiplier(0, 4)).toBe(1);
    expect(multiplier(3, 4)).toBe(2);
    expect(multiplier(30, 4)).toBe(4);
    expect(multiplier(30, 5)).toBe(5);
  });
  it('no repite ninguna frase del nivel hasta haberlas jugado todas', () => {
    const storage = memoryStorage();
    const level1 = ROUNDS.filter((r) => r.level === 1);
    const seen = new Set<string>();
    for (let i = 0; i < level1.length; i++) seen.add(pickRound(1, [], Math.random, storage).id);
    expect(seen.size).toBe(level1.length);
  });
  it('no repite rondas recientes y no supera el nivel', () => {
    const recent = ROUNDS.filter((r) => r.level === 1).slice(0, 7).map((r) => r.id);
    for (let i = 0; i < 30; i++) {
      const r = pickRound(1, recent);
      expect(r.level).toBe(1);
      expect(recent).not.toContain(r.id);
    }
    for (let i = 0; i < 30; i++) expect(pickRound(3, []).level).toBeLessThanOrEqual(3);
  });
});
