// Lógica del servidor para el modo Roleplay: el personaje responde en coherencia con lo dicho.
// Se ejecuta en una función serverless (api/roleplay.ts) y, en desarrollo, como middleware de Vite.
// La clave ANTHROPIC_API_KEY nunca llega al cliente.

import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { MAX_TURNS } from '../src/data/characters';
import { buildSystemPrompt, buildTranscript, MOODS, parseReply, type Mood } from '../src/lib/rolePrompt';

export const RoleplayRequest = z.object({
  characterId: z.enum(['lucia', 'marta', 'ramiro']),
  scenarioId: z.string().max(40),
  meter: z.number().min(0).max(100),
  history: z
    .array(z.object({ from: z.enum(['npc', 'user']), text: z.string().max(800) }))
    .min(2)
    .max(MAX_TURNS * 2 + 1),
});
export type RoleplayRequest = z.infer<typeof RoleplayRequest>;

export interface RoleplayReply {
  reply: string;
  persuasion_delta: number;
  mood: Mood;
}

// Esquema de salida estructurada: garantiza JSON válido sin tener que "pedirlo por favor".
const OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['reply', 'persuasion_delta', 'mood'],
  properties: {
    reply: { type: 'string', description: 'Lo que dice el personaje en su siguiente nota de voz.' },
    persuasion_delta: {
      type: 'integer',
      description: 'Cuánto cambia el convencimiento del personaje tras la última respuesta, entre -20 y 35.',
    },
    mood: { type: 'string', enum: [...MOODS] },
  },
} as const;

export const MODEL = 'claude-opus-5-5';

let client: Anthropic | null = null;

export async function generateReply(req: RoleplayRequest, signal?: AbortSignal): Promise<RoleplayReply> {
  client ??= new Anthropic({ maxRetries: 1, timeout: 15_000 });
  const res = await client.beta.messages.create(
    {
      model: MODEL,
      max_tokens: 2048,
      system: buildSystemPrompt(req) + '\n\nLatency-sensitive; begin your visible answer immediately.',
      messages: [{ role: 'user', content: buildTranscript(req) }],
      // Respuesta en tiempo real: esfuerzo bajo para minimizar la latencia.
      output_config: { effort: 'low', format: { type: 'json_schema', schema: OUTPUT_SCHEMA } },
      // Si el modelo declina, el servidor reintenta con el modelo de reserva recomendado.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
    },
    { signal },
  );
  if (res.stop_reason === 'refusal') throw new Error('refusal');
  const text = res.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('');
  const parsed = parseReply(text);
  if (!parsed) throw new Error('empty_reply');
  return { reply: parsed.reply, persuasion_delta: parsed.delta ?? 0, mood: parsed.mood ?? 'neutral' };
}

/** Manejador HTTP estándar (Request → Response), común a la función serverless y al servidor de desarrollo. */
export async function handleRoleplay(request: Request): Promise<Response> {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  if (!process.env.ANTHROPIC_API_KEY) return json({ error: 'not_configured' }, 503);

  let body: RoleplayRequest;
  try {
    body = RoleplayRequest.parse(await request.json());
  } catch {
    return json({ error: 'bad_request' }, 400);
  }

  try {
    return json(await generateReply(body, request.signal));
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return json({ error: 'rate_limited' }, 429);
    if (err instanceof Anthropic.APIError) {
      console.error('roleplay: API error', err.status, err.message);
      return json({ error: 'upstream' }, 502);
    }
    console.error('roleplay: error', err);
    return json({ error: 'failed' }, 500);
  }
}
