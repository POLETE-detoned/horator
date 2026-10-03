import type { Scenario } from '../../characters';

/**
 * Una situación por línea:
 *   Título | Primera nota de voz del personaje | Objetivo del jugador | palabra, palabra, palabra, palabra
 * Las respuestas sin conexión y los cierres salen de las del personaje.
 */
export function parseScenarios(prefix: string, text: string): Scenario[] {
  const out: Scenario[] = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const [title, opener, goal, words] = line.split('|').map((p) => p.trim());
    out.push({
      id: `${prefix}-${out.length}`,
      title,
      opener,
      goal,
      powerWords: (words ?? '').split(',').map((w) => w.trim()).filter(Boolean),
    });
  }
  return out;
}
