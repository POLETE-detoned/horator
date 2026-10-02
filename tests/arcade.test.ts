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
