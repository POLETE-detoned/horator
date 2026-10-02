import { afterEach, describe, expect, it } from 'vitest';
import { handleRoleplay, RoleplayRequest } from '../server/roleplay';

const post = (body: unknown) =>
  new Request('http://x/api/roleplay', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

const valid = {
  characterId: 'lucia',
  scenarioId: 'lisboa',
  meter: 30,
  history: [
    { from: 'npc', text: 'Hola' },
    { from: 'user', text: 'Hola, Lucía' },
  ],
};

describe('API roleplay', () => {
  const saved = process.env.ANTHROPIC_API_KEY;
  afterEach(() => {
    if (saved === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = saved;
  });

  it('sin clave responde 503 para que el cliente use el motor local', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    expect((await handleRoleplay(post(valid))).status).toBe(503);
  });
  it('rechaza métodos y cuerpos inválidos', async () => {
    process.env.ANTHROPIC_API_KEY = 'test';
    expect((await handleRoleplay(new Request('http://x', { method: 'GET' }))).status).toBe(405);
    expect((await handleRoleplay(post({ ...valid, characterId: 'hacker' }))).status).toBe(400);
    expect((await handleRoleplay(post({ ...valid, history: [{ from: 'user', text: 'x'.repeat(5000) }] }))).status).toBe(400);
  });
  it('acepta una conversación completa de 4 turnos', () => {
    const history = [{ from: 'npc', text: 'a' }];
    for (let i = 0; i < 4; i++) history.push({ from: 'user', text: 'b' }, { from: 'npc', text: 'c' });
    history.pop();
    expect(RoleplayRequest.safeParse({ ...valid, history }).success).toBe(true);
  });
});
