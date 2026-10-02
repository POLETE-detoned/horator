import { describe, expect, it } from 'vitest';
import { analyze, expertWords, findFillers, paceZone, reactionScore, starsFor } from '../src/lib/lexicon';

describe('muletillas', () => {
  it('detecta las muletillas típicas', () => {
    const hits = findFillers('Bueno, eh, o sea, es que en plan me parece bien, ¿sabes?');
    expect(hits.map((h) => h.word)).toEqual(['bueno', 'eh', 'o sea', 'en plan', '¿sabes?']);
  });
  it('no confunde "tipo de" con la muletilla', () => {
    expect(findFillers('Es un tipo de contrato')).toHaveLength(0);
    expect(findFillers('Y era, tipo, enorme')).toHaveLength(1);
  });
  it('ignora tildes y mayúsculas', () => {
    expect(findFillers('EHHH, Ó SEA').map((h) => h.word)).toEqual(['eh', 'o sea']);
  });
});

describe('riqueza léxica', () => {
  it('puntúa más un discurso preciso que uno plano', () => {
    const flat = analyze('Es muy bueno, es muy bueno y es muy grande, de verdad que sí, muy bueno');
    const rich = analyze(
      'Es una propuesta contundente y rentable: optimiza los procesos, garantiza resultados tangibles y consolida nuestra posición estratégica.',
    );
    expect(rich.score).toBeGreaterThan(flat.score + 30);
    expect(rich.expert).toEqual(expect.arrayContaining(['contundente', 'rentable']));
  });
  it('las muletillas restan', () => {
    const clean = analyze('Es una propuesta sólida y rentable que garantiza resultados');
    const dirty = analyze('Eh, o sea, es una propuesta sólida y rentable que, bueno, garantiza resultados');
    expect(dirty.score).toBeLessThan(clean.score);
  });
  it('texto vacío = 0 estrellas', () => {
    expect(starsFor(analyze('').score, 500, 0)).toBe(0);
  });
  it('expertWords devuelve formas únicas', () => {
    expect(expertWords('Crucial, crucial y CRUCIAL')).toHaveLength(1);
  });
});

describe('reacción y estrellas', () => {
  it('reaccionar rápido puntúa al máximo', () => {
    expect(reactionScore(800)).toBe(1);
    expect(reactionScore(9000)).toBe(0);
  });
  it('tres estrellas exigen calidad y rapidez', () => {
    expect(starsFor(95, 1000, 30)).toBe(3);
    expect(starsFor(95, 12000, 30)).toBe(2);
    expect(starsFor(20, 12000, 5)).toBe(1);
  });
  it('zonas de ritmo', () => {
    expect(paceZone(90)).toBe('lento');
    expect(paceZone(140)).toBe('ideal');
    expect(paceZone(200)).toBe('rapido');
  });
});
