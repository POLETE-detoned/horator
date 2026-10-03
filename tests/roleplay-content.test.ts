import { describe, expect, it } from 'vitest';
import { CHARACTERS, closingLine } from '../src/data/characters';
import { offlineTurn } from '../src/lib/roleplayApi';
import { buildSystemPrompt } from '../src/lib/rolePrompt';

describe('situaciones de Notas de voz', () => {
  it('cada personaje tiene al menos 550 situaciones distintas y completas', () => {
    for (const c of CHARACTERS) {
      expect(c.scenarios.length, c.name).toBeGreaterThanOrEqual(550);
      expect(new Set(c.scenarios.map((s) => s.id)).size).toBe(c.scenarios.length);
      expect(new Set(c.scenarios.map((s) => s.title.toLowerCase())).size).toBe(c.scenarios.length);
      for (const s of c.scenarios) {
        expect(s.opener.length, s.title).toBeGreaterThan(30);
        expect(s.goal.length, s.title).toBeGreaterThan(5);
        expect(s.powerWords.length, s.title).toBeGreaterThanOrEqual(3);
      }
    }
  });
  it('los niveles van de Básico a Avanzado según el personaje', () => {
    expect(CHARACTERS.map((c) => c.level)).toEqual(['Básico', 'Medio', 'Avanzado']);
  });
  it('las situaciones nuevas usan las respuestas sin conexión y los cierres del personaje', () => {
    for (const c of CHARACTERS) {
      const s = c.scenarios[c.scenarios.length - 1];
      expect(s.offline).toBeUndefined();
      const turn = offlineTurn(c, s, 3, 50, 1);
      expect(c.offline.high).toContain(turn.reply);
      expect(c.win).toContain(closingLine(c, s, true));
      expect(c.lose).toContain(closingLine(c, s, false));
    }
  });
  it('el prompt de la IA incluye la situación elegida', () => {
    const c = CHARACTERS[2];
    const s = c.scenarios[200];
    const prompt = buildSystemPrompt({ characterId: c.id, scenarioId: s.id, meter: 30, history: [] });
    expect(prompt).toContain(s.title);
    expect(prompt).toContain(s.goal);
  });
});
