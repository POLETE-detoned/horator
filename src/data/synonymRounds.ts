// Todas las rondas de Caza-sinónimos. Solo lo importa el modo, para no engordar la carga inicial.

import { MAX_LEVEL, parseRounds, type SynonymRound } from './synonyms';

const files = import.meta.glob<string>('./content/sinonimos/n*.ts', { eager: true, import: 'default' });

function load(): SynonymRound[] {
  const all: SynonymRound[] = [];
  for (let level = 1; level <= MAX_LEVEL; level++) {
    const text = Object.keys(files)
      .filter((f) => f.includes(`/n${level}-`))
      .sort()
      .map((f) => files[f])
      .join('\n');
    all.push(...parseRounds(level, text));
  }
  return all;
}

export const ROUNDS: SynonymRound[] = load();

export const roundsOfLevel = (level: number) => ROUNDS.filter((r) => r.level === level);
