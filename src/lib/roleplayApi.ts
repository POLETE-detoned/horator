import type { Character, Scenario } from '../data/characters';
import { customEndpoint, FREE_PRESET, type AiConfig } from './aiConfig';
import type { Stars } from './lexicon';
import { buildSystemPrompt, buildTranscript, JSON_INSTRUCTION, parseReply, type Mood, type ParsedReply, type RoleplayInput } from './rolePrompt';

export type { Mood, RoleplayInput };
export type HistoryItem = RoleplayInput['history'][number];

export type TurnSource = 'custom' | 'backend' | 'free' | 'local';

export interface NpcTurn {
  reply: string;
  delta: number;
  mood: Mood;
  /** true si la respuesta viene del motor local (sin IA). */
  offline: boolean;
  source: TurnSource;
}

// Configuración en aiConfig.ts (ligera: la usa el lobby sin cargar los personajes).
export { customEndpoint, DEFAULT_AI, FREE_PRESET, type AiConfig, type CustomAi } from './aiConfig';

// ---------- Motor local ----------

const moodFromMeter = (m: number): Mood =>
  m < 20 ? 'enfadado' : m < 40 ? 'escéptico' : m < 60 ? 'neutral' : m < 85 ? 'interesado' : 'convencido';

/** Motor local: el personaje reacciona según la calidad de la respuesta (estrellas). */
export function offlineTurn(c: Character, s: Scenario, stars: Stars, meter: number, turn: number): NpcTurn {
  const base = [-12, 6, 18, 30][stars];
  const delta = Math.round(base > 0 ? base / c.toughness : base * c.toughness);
  const tier = stars >= 3 ? 'high' : stars === 2 ? 'mid' : 'low';
  const pool = (s.offline ?? c.offline)[tier];
  return {
    reply: pool[turn % pool.length],
    delta,
    mood: moodFromMeter(Math.max(0, Math.min(100, meter + delta))),
    offline: true,
    source: 'local',
  };
}

// ---------- Proveedores ----------

interface Endpoint {
  url: string;
  model: string;
  key?: string;
}

/** Llamada a cualquier API compatible con OpenAI (Chat Completions). */
async function callCompat(ep: Endpoint, req: RoleplayInput, deadline: number): Promise<ParsedReply | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), Math.max(1500, deadline - Date.now()));
  try {
    const res = await fetch(ep.url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(ep.key ? { authorization: `Bearer ${ep.key}` } : {}) },
      body: JSON.stringify({
        model: ep.model,
        messages: [
          { role: 'system', content: buildSystemPrompt(req) + JSON_INSTRUCTION },
          { role: 'user', content: buildTranscript(req) },
        ],
        max_tokens: 300,
        temperature: 0.8,
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { choices?: { message?: { content?: unknown } }[] };
    const text = data.choices?.[0]?.message?.content;
    return typeof text === 'string' ? parseReply(text) : null;
  } finally {
    clearTimeout(timer);
  }
}

const state = { backend: null as boolean | null, freeFails: 0 };
export const resetAiState = () => {
  state.backend = null;
  state.freeFails = 0;
};

/** Servidor propio (/api/roleplay con Claude). Solo existe si se despliega la función serverless. */
async function callBackend(req: RoleplayInput, deadline: number): Promise<ParsedReply | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), Math.max(1500, deadline - Date.now()));
  try {
    const res = await fetch('./api/roleplay', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(req),
      signal: ctrl.signal,
    });
    if (res.status === 503 || res.status === 404 || res.status === 405) {
      state.backend = false; // sin clave o sin backend desplegado: no se vuelve a intentar en esta sesión
      return null;
    }
    if (!res.ok) return null;
    const data = (await res.json()) as { reply?: string; persuasion_delta?: number; mood?: Mood };
    if (typeof data.reply !== 'string') {
      state.backend = false; // un hosting estático puede devolver index.html con 200
      return null;
    }
    state.backend = true;
    return { reply: data.reply, delta: data.persuasion_delta, mood: data.mood };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Respuesta del personaje con IA. Orden: proveedor propio → servidor propio (Claude) → IA gratuita → null.
 * Si devuelve null, el llamante usa el motor local. Todo el intento comparte un presupuesto de tiempo.
 */
export async function aiTurn(req: RoleplayInput, cfg: AiConfig, fallback: NpcTurn, budgetMs = 10_000): Promise<NpcTurn | null> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return null;
  const deadline = Date.now() + budgetMs;

  const attempts: [TurnSource, () => Promise<ParsedReply | null>][] = [];
  const custom = customEndpoint(cfg.custom);
  if (custom) attempts.push(['custom', () => callCompat({ url: custom, model: cfg.custom.model.trim(), key: cfg.custom.key.trim() || undefined }, req, deadline)]);
  if (state.backend !== false) attempts.push(['backend', () => callBackend(req, deadline)]);
  if (cfg.freeAi === 'on' && state.freeFails < 2) attempts.push(['free', () => callCompat({ url: FREE_PRESET.url, model: FREE_PRESET.model }, req, deadline)]);

  for (const [source, run] of attempts) {
    if (Date.now() >= deadline) break;
    let out: ParsedReply | null = null;
    try {
      out = await run();
    } catch {
      out = null;
    }
    if (out) {
      if (source === 'free') state.freeFails = 0;
      return { reply: out.reply, delta: out.delta ?? fallback.delta, mood: out.mood ?? fallback.mood, offline: false, source };
    }
    if (source === 'free') state.freeFails++;
  }
  return null;
}
