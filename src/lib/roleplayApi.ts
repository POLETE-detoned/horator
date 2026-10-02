import type { Character, Scenario } from '../data/characters';
import type { Stars } from './lexicon';

export type Mood = 'enfadado' | 'escéptico' | 'neutral' | 'interesado' | 'convencido';

export interface NpcTurn {
  reply: string;
  delta: number;
  mood: Mood;
  /** true si la respuesta viene del motor local (sin IA). */
  offline: boolean;
}

export interface HistoryItem {
  from: 'npc' | 'user';
  text: string;
}

const moodFromMeter = (m: number): Mood =>
  m < 20 ? 'enfadado' : m < 40 ? 'escéptico' : m < 60 ? 'neutral' : m < 85 ? 'interesado' : 'convencido';

/** Motor local: el personaje reacciona según la calidad de la respuesta (estrellas). */
export function offlineTurn(c: Character, s: Scenario, stars: Stars, meter: number, turn: number): NpcTurn {
  const base = [-12, 6, 18, 30][stars];
  const delta = Math.round(base > 0 ? base / c.toughness : base * c.toughness);
  const tier = stars >= 3 ? 'high' : stars === 2 ? 'mid' : 'low';
  const pool = s.offline[tier];
  return {
    reply: pool[turn % pool.length],
    delta,
    mood: moodFromMeter(Math.max(0, Math.min(100, meter + delta))),
    offline: true,
  };
}

let aiAvailable: boolean | null = null;

/** Pide la respuesta al personaje IA; si no hay red o servidor, devuelve null (se usa el motor local). */
export async function aiTurn(
  characterId: string,
  scenarioId: string,
  meter: number,
  history: HistoryItem[],
  timeoutMs = 9000,
): Promise<NpcTurn | null> {
  if (aiAvailable === false || !navigator.onLine) return null;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch('./api/roleplay', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ characterId, scenarioId, meter, history }),
      signal: ctrl.signal,
    });
    if (res.status === 503 || res.status === 404) {
      aiAvailable = false; // sin clave o sin backend desplegado: no lo volvemos a intentar en esta sesión
      return null;
    }
    if (!res.ok) return null;
    const data = (await res.json()) as { reply: string; persuasion_delta: number; mood: Mood };
    aiAvailable = true;
    return { reply: data.reply, delta: data.persuasion_delta, mood: data.mood, offline: false };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}
