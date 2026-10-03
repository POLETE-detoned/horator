import { describe, expect, it } from 'vitest';
import { summarize, windowWpm } from '../src/modes/arcade/metrics';

describe('arcade', () => {
  it('calcula ppm en ventana deslizante', () => {
    const samples = Array.from({ length: 20 }, (_, i) => ({ t: i * 1000, words: i * 2.5 }));
    expect(Math.round(windowWpm(samples, 19000))).toBe(150);
  });
  it('un discurso limpio y rico saca buena nota', () => {
    const text = Array.from({ length: 12 }, () => 'la tortilla es un plato emblemático, auténtico e irresistible que garantiza momentos memorables').join(' ');
    const r = summarize(text, 60000, 2, { ideal: 50, total: 55 }, 0);
    expect(['S', 'A']).toContain(r.grade);
    const bad = summarize('eh bueno o sea', 60000, 40, { ideal: 0, total: 10 }, 5);
    expect(bad.grade).toBe('D');
  });
});

describe('retos', () => {
  it('hay al menos 550 temas distintos en cada nivel', async () => {
    const { ARCADE_LEVELS, topicsOfLevel, TOPICS } = await import('../src/data/prompts');
    for (const { level } of ARCADE_LEVELS) expect(topicsOfLevel(level).length).toBeGreaterThanOrEqual(550);
    expect(new Set(TOPICS.map((t) => t.text)).size).toBe(TOPICS.length);
  });
  it('no repite tema hasta haberlos visto todos y respeta el nivel', async () => {
    const { randomPrompt, topicsOfLevel } = await import('../src/data/prompts');
    const m = new Map<string, string>();
    const storage = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
    const total = topicsOfLevel(2).length;
    const seen = new Set<string>();
    for (let i = 0; i < total; i++) {
      const p = randomPrompt(2, Math.random, undefined, storage);
      expect(p.level).toBe(2);
      expect(p.text.endsWith('.')).toBe(true);
      seen.add(p.topic);
    }
    expect(seen.size).toBe(total);
  });
});
