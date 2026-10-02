import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CHARACTERS } from '../src/data/characters';
import { aiTurn, customEndpoint, DEFAULT_AI, offlineTurn, resetAiState, type AiConfig } from '../src/lib/roleplayApi';
import { parseReply } from '../src/lib/rolePrompt';

const ok = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const chat = (content: string) => ok({ choices: [{ message: { content } }] });

const lucia = CHARACTERS[0];
const fallback = offlineTurn(lucia, lucia.scenarios[0], 2, 30, 1);
const req = {
  characterId: 'lucia',
  scenarioId: 'lisboa',
  meter: 30,
  history: [
    { from: 'npc' as const, text: 'Hola' },
    { from: 'user' as const, text: 'Es una oportunidad trascendental' },
  ],
};
const cfg = (patch: Partial<AiConfig> = {}): AiConfig => ({ ...DEFAULT_AI, ...patch });

describe('parseReply', () => {
  it('lee JSON limpio, con vallas de código o con texto alrededor', () => {
    const j = '{"reply":"Me has convencido","persuasion_delta":22,"mood":"interesado"}';
    expect(parseReply(j)).toEqual({ reply: 'Me has convencido', delta: 22, mood: 'interesado' });
    expect(parseReply('```json\n' + j + '\n```')?.delta).toBe(22);
    expect(parseReply('Claro, aquí tienes: ' + j + ' ¡Suerte!')?.reply).toBe('Me has convencido');
  });
  it('acota el delta y descarta estados inválidos', () => {
    expect(parseReply('{"reply":"x","persuasion_delta":999,"mood":"loco"}')).toEqual({ reply: 'x', delta: 35, mood: undefined });
    expect(parseReply('{"reply":"x","persuasion_delta":-999}')?.delta).toBe(-20);
  });
  it('sin JSON usa el texto plano; con JSON roto o vacío, null', () => {
    expect(parseReply('  "Vaya, qué interesante"  ')).toEqual({ reply: 'Vaya, qué interesante' });
    expect(parseReply('{"reply": ')).toBeNull();
    expect(parseReply('{"foo":1}')).toBeNull();
    expect(parseReply('   ')).toBeNull();
    expect(parseReply('x'.repeat(700))).toBeNull();
  });
});

describe('customEndpoint', () => {
  it('exige HTTPS (o localhost) y modelo, y añade /chat/completions', () => {
    expect(customEndpoint({ url: 'https://api.groq.com/openai/v1/', model: 'm', key: '' })).toBe('https://api.groq.com/openai/v1/chat/completions');
    expect(customEndpoint({ url: 'https://x.dev/v1/chat/completions', model: 'm', key: '' })).toBe('https://x.dev/v1/chat/completions');
    expect(customEndpoint({ url: 'http://evil.com/v1', model: 'm', key: '' })).toBeNull();
    expect(customEndpoint({ url: 'http://localhost:11434/v1', model: 'm', key: '' })).toBe('http://localhost:11434/v1/chat/completions');
    expect(customEndpoint({ url: 'https://x.dev/v1', model: '', key: '' })).toBeNull();
  });
});

describe('aiTurn', () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    resetAiState();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('sin consentimiento no llama a la IA gratuita', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 404 })); // backend inexistente
    expect(await aiTurn(req, cfg({ freeAi: 'unset' }), fallback)).toBeNull();
    expect(fetchMock.mock.calls.map((c) => String(c[0]))).toEqual(['./api/roleplay']);
  });

  it('con consentimiento, cae del backend inexistente a la IA gratuita y la recuerda', async () => {
    fetchMock.mockImplementation(async (url: string) =>
      String(url).includes('api/roleplay') ? new Response('', { status: 404 }) : chat('```json\n{"reply":"Vale, me gusta","persuasion_delta":18,"mood":"interesado"}\n```'),
    );
    const t = await aiTurn(req, cfg({ freeAi: 'on' }), fallback);
    expect(t).toMatchObject({ reply: 'Vale, me gusta', delta: 18, mood: 'interesado', source: 'free', offline: false });
    // Segunda vez: ya no se prueba el backend.
    await aiTurn(req, cfg({ freeAi: 'on' }), fallback);
    expect(fetchMock.mock.calls.filter((c) => String(c[0]).includes('api/roleplay'))).toHaveLength(1);
  });

  it('si el modelo devuelve texto sin JSON, usa delta y estado locales', async () => {
    fetchMock.mockImplementation(async (url: string) => (String(url).includes('api/roleplay') ? new Response('', { status: 404 }) : chat('Mmm, sigue.')));
    const t = await aiTurn(req, cfg({ freeAi: 'on' }), fallback);
    expect(t).toMatchObject({ reply: 'Mmm, sigue.', delta: fallback.delta, mood: fallback.mood, source: 'free' });
  });

  it('el proveedor propio va primero, con su clave y modelo', async () => {
    fetchMock.mockResolvedValue(chat('{"reply":"Hola desde mi proveedor","persuasion_delta":5,"mood":"neutral"}'));
    const t = await aiTurn(req, cfg({ custom: { url: 'https://api.groq.com/openai/v1', model: 'llama', key: 'k-123' } }), fallback);
    expect(t?.source).toBe('custom');
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.groq.com/openai/v1/chat/completions');
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer k-123');
    expect(JSON.parse(init.body as string).model).toBe('llama');
  });

  it('la clave propia nunca se envía a otro servidor', async () => {
    fetchMock.mockImplementation(async (url: string) => (String(url).startsWith('https://api.groq.com') ? new Response('', { status: 500 }) : new Response('', { status: 404 })));
    await aiTurn(req, cfg({ freeAi: 'on', custom: { url: 'https://api.groq.com/openai/v1', model: 'm', key: 'secreta' } }), fallback);
    for (const [url, init] of fetchMock.mock.calls as [string, RequestInit][]) {
      const auth = (init?.headers as Record<string, string> | undefined)?.authorization;
      if (!String(url).startsWith('https://api.groq.com')) expect(auth).toBeUndefined();
    }
  });

  it('usa la respuesta del servidor propio (Claude) cuando existe', async () => {
    fetchMock.mockResolvedValue(ok({ reply: 'Desde Claude', persuasion_delta: 12, mood: 'interesado' }));
    expect(await aiTurn(req, cfg(), fallback)).toMatchObject({ reply: 'Desde Claude', source: 'backend', delta: 12 });
  });

  it('un hosting estático que devuelve HTML con 200 se trata como backend inexistente', async () => {
    fetchMock.mockResolvedValue(new Response('<html></html>', { status: 200, headers: { 'content-type': 'text/html' } }));
    expect(await aiTurn(req, cfg(), fallback)).toBeNull();
  });

  it('tras dos fallos seguidos deja de intentar la IA gratuita en la sesión', async () => {
    fetchMock.mockImplementation(async (url: string) => (String(url).includes('api/roleplay') ? new Response('', { status: 404 }) : new Response('', { status: 500 })));
    for (let i = 0; i < 4; i++) await aiTurn(req, cfg({ freeAi: 'on' }), fallback);
    expect(fetchMock.mock.calls.filter((c) => String(c[0]).includes('pollinations'))).toHaveLength(2);
  });

  it('sin conexión no hace peticiones', async () => {
    vi.stubGlobal('navigator', { onLine: false });
    expect(await aiTurn(req, cfg({ freeAi: 'on' }), fallback)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
