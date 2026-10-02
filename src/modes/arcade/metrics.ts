// Métricas en vivo del Arcade (puras, para poder probarlas sin navegador).

import { analyze, paceZone } from '../../lib/lexicon';

export interface Sample {
  t: number; // ms desde el inicio
  words: number;
}

/** Palabras por minuto en una ventana deslizante. */
export function windowWpm(samples: Sample[], now: number, windowMs = 8000): number {
  if (!samples.length) return 0;
  const from = Math.max(0, now - windowMs);
  const last = samples[samples.length - 1];
  let base: Sample = { t: 0, words: 0 };
  for (const s of samples) {
    if (s.t <= from) base = s;
    else break;
  }
  const span = Math.max(2000, now - base.t);
  return ((last.words - base.words) / span) * 60000;
}

export interface ArcadeResult {
  words: number;
  expert: string[];
  fillers: number;
  blankSeconds: number;
  wpm: number;
  paceIdealRatio: number;
  silences: number;
  grade: 'S' | 'A' | 'B' | 'C' | 'D';
  score: number;
}

export function summarize(
  text: string,
  durationMs: number,
  blankSeconds: number,
  paceTicks: { ideal: number; total: number },
  silences: number,
): ArcadeResult {
  const r = analyze(text);
  const speakingMin = Math.max(0.1, (durationMs / 1000 - blankSeconds) / 60);
  const wpm = r.words / speakingMin;
  const paceIdealRatio = paceTicks.total ? paceTicks.ideal / paceTicks.total : paceZone(wpm) === 'ideal' ? 1 : 0;
  const lengthF = Math.min(1, r.words / 120);
  const score = Math.round(
    Math.max(
      0,
      Math.min(
        100,
        35 * lengthF + 25 * Math.min(1, r.expert.length / 5) + 25 * paceIdealRatio + 15 - r.fillers.length * 4 - silences * 5,
      ),
    ),
  );
  const grade = r.words < 10 ? 'D' : score >= 85 ? 'S' : score >= 70 ? 'A' : score >= 50 ? 'B' : score >= 30 ? 'C' : 'D';
  return { words: r.words, expert: r.expert, fillers: r.fillers.length, blankSeconds, wpm, paceIdealRatio, silences, grade, score };
}
