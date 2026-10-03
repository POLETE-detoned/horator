import { roundsOfLevel } from '../../data/synonymRounds';
import type { SynonymRound } from '../../data/synonyms';
import { drawFromBag, type BagStorage } from '../../lib/bag';

export interface Card {
  id: string;
  word: string;
  good: boolean;
  why?: string;
}

export function shuffle<T>(arr: T[], rand: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function buildDeck(round: SynonymRound, rand: () => number = Math.random): Card[] {
  const cards: Card[] = [
    ...round.good.map((word) => ({ id: `${round.id}-${word}`, word, good: true })),
    ...round.bad.map((t) => ({ id: `${round.id}-${t.word}`, word: t.word, good: false, why: t.why })),
  ];
  // Nunca empezar con una trampa: la primera tarjeta enseña el tono de la frase.
  const deck = shuffle(cards, rand);
  const firstGood = deck.findIndex((c) => c.good);
  if (firstGood > 0) [deck[0], deck[firstGood]] = [deck[firstGood], deck[0]];
  return deck;
}

/**
 * Elige la siguiente frase: sobre todo del nivel actual y a veces (30 %) de un nivel inferior.
 * Cada nivel es una bolsa sin repetición: no vuelve a salir una frase hasta haber jugado todas las de ese nivel.
 */
export function pickRound(level: number, recent: readonly string[] = [], rand: () => number = Math.random, storage?: BagStorage): SynonymRound {
  const target = level > 1 && rand() < 0.3 ? 1 + Math.floor(rand() * (level - 1)) : level;
  return drawFromBag(`syn${target}`, roundsOfLevel(target), { rand, exclude: recent, storage });
}

export const multiplier = (combo: number, cap: number) => Math.min(cap, 1 + Math.floor(combo / 3));

export const POINTS_PER_CARD = 10;
export const SYN_SECONDS = 60;
