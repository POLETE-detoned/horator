import { describe, expect, it } from 'vitest';
import { MAX_LEVEL, ROUNDS, splitSentence } from '../src/data/synonyms';
import { buildDeck, multiplier, pickRound } from '../src/modes/synonyms/engine';

describe('contenido', () => {
  it('cada ronda tiene fragmento marcado, buenas y trampas explicadas', () => {
    for (const r of ROUNDS) {
      expect(splitSentence(r.sentence)[1], r.sentence).not.toBe('');
      expect(r.good.length).toBeGreaterThanOrEqual(2);
      expect(r.bad.length).toBeGreaterThanOrEqual(2);
      for (const b of r.bad) expect(b.why.length).toBeGreaterThan(5);
    }
  });
  it('hay rondas en todos los niveles', () => {
    for (let l = 1; l <= MAX_LEVEL; l++) expect(ROUNDS.filter((r) => r.level === l).length).toBeGreaterThanOrEqual(6);
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
