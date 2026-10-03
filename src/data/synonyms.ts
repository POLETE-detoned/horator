// Tipos y utilidades de Caza-sinónimos. Cada ronda: frase plana con un fragmento {marcado},
// alternativas buenas (deslizar a la derecha) y trampas (a la izquierda) con su porqué.
// El contenido vive en src/data/content/sinonimos y se carga solo al abrir el modo (synonymRounds.ts).

export interface Trap {
  word: string;
  why: string;
}
export interface SynonymRound {
  id: string;
  level: number;
  sentence: string;
  good: string[];
  bad: Trap[];
}

export const LEVEL_NAMES = ['', 'Básico', 'Profesional', 'Preciso', 'Culto', 'Maestro'];
export const MAX_LEVEL = 5;

/**
 * Formato de las líneas de contenido (src/data/content/sinonimos/nN-*.ts), una ronda por línea:
 *   Frase con el {fragmento} marcado. | buena 1, buena 2, buena 3 | trampa 1 = Por qué no vale. | trampa 2 = Por qué no vale.
 */
export function parseRounds(level: number, text: string, prefix = `s${level}`): SynonymRound[] {
  const out: SynonymRound[] = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const [sentence, good, ...bad] = line.split('|').map((p) => p.trim());
    out.push({
      id: `${prefix}-${out.length}`,
      level,
      sentence,
      good: (good ?? '').split(',').map((g) => g.trim()).filter(Boolean),
      bad: bad.map((b) => {
        const i = b.indexOf('=');
        return { word: b.slice(0, i).trim(), why: b.slice(i + 1).trim() };
      }),
    });
  }
  return out;
}

/** Separa la frase en [antes, fragmento marcado, después]. */
export function splitSentence(sentence: string): [string, string, string] {
  const m = sentence.match(/^(.*)\{(.+)\}(.*)$/);
  return m ? [m[1], m[2], m[3]] : [sentence, '', ''];
}
