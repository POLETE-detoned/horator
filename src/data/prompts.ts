// Generador de retos para el modo Arcade: tema (por nivel) × tono × formato.
// Los temas vienen de src/data/content/arcade (uno por línea, como oración que sigue a "que") y
// salen de una bolsa sin repetición por nivel: no se repite un tema hasta haber visto todos.

import { drawFromBag, type BagStorage } from '../lib/bag';

const files = import.meta.glob<string>('./content/arcade/n*.ts', { eager: true, import: 'default' });

export const ARCADE_LEVELS = [
  { level: 1, name: 'Básico', desc: 'Temas cotidianos y con humor' },
  { level: 2, name: 'Medio', desc: 'Trabajo, sociedad y debate' },
  { level: 3, name: 'Avanzado', desc: 'Ideas complejas y abstractas' },
] as const;
export type ArcadeLevel = 1 | 2 | 3;

export interface ArcadeTopic {
  id: string;
  level: ArcadeLevel;
  text: string;
}

function load(): ArcadeTopic[] {
  const out: ArcadeTopic[] = [];
  for (const { level } of ARCADE_LEVELS) {
    let n = 0;
    const text = Object.keys(files)
      .filter((f) => f.includes(`/n${level}-`))
      .sort()
      .map((f) => files[f])
      .join('\n');
    for (const raw of text.split('\n')) {
      const t = raw.trim();
      if (t && !t.startsWith('#')) out.push({ id: `a${level}-${n++}`, level, text: t });
    }
  }
  return out;
}

export const TOPICS: ArcadeTopic[] = load();
export const topicsOfLevel = (level: ArcadeLevel) => TOPICS.filter((t) => t.level === level);

export const TONES = [
  'con tono corporativo',
  'como un narrador de documentales de naturaleza',
  'como un comentarista deportivo en la final',
  'como si dieras una charla TED',
  'como un abogado en su alegato final',
  'como en un anuncio de perfume',
  'como un político en campaña',
  'como un chef con estrella Michelin',
  'como un profesor de universidad muy apasionado',
  'como el presentador de un concurso de televisión',
  'como un locutor de radio de madrugada',
  'como un guía turístico entusiasta',
  'como un entrenador en el descanso de un partido',
  'como un vendedor de teletienda',
  'como un poeta romántico',
  'como un detective que resuelve el caso',
  'como el capitán de un barco antes de la tormenta',
  'como un youtuber presentando su vídeo',
  'como un científico que anuncia un descubrimiento',
  'como un abuelo contando batallitas',
  'como un presentador del telediario',
  'como un crítico gastronómico exigente',
  'como un general arengando a sus tropas',
  'como un mago antes de su mejor truco',
  'como un monologuista de comedia',
  'como un rey en su discurso de Nochebuena',
  'como un agente inmobiliario enseñando un piso',
  'como el portavoz de una empresa en plena crisis',
  'como un coach motivacional',
  'como un profesor de yoga muy zen',
  'como un pregonero en la plaza del pueblo',
  'como un narrador de cuentos para niños',
  'como un comentarista de Fórmula 1',
  'como un sumiller describiendo un vino',
  'como un director de cine en la gala de los Goya',
  'como un astronauta desde la estación espacial',
  'como un subastador en la última puja',
  'como un fiscal implacable',
  'como un filósofo griego en el ágora',
  'como si fuera el último discurso de tu vida',
] as const;

const FORMATS: Record<ArcadeLevel, string[]> = {
  1: ['Convénceme en 60 segundos de que', 'Defiende en 60 segundos que', 'Véndeme en 60 segundos la idea de que'],
  2: [
    'Argumenta en 60 segundos que',
    'Defiende ante un público escéptico que',
    'Con dos razones y un ejemplo, defiende que',
  ],
  3: [
    'Construye en 60 segundos un argumento sólido de que',
    'Rebate a quien piense lo contrario y demuestra que',
    'Con ejemplos concretos y sin muletillas, sostén que',
  ],
};

export interface ArcadePrompt {
  text: string;
  topic: string;
  tone: string;
  level: ArcadeLevel;
}

const pick = <T,>(arr: readonly T[], r: () => number) => arr[Math.floor(r() * arr.length)];

/** Reto nuevo del nivel indicado; el tema sale de la bolsa del nivel y nunca repite el reto anterior. */
export function randomPrompt(
  level: ArcadeLevel = 1,
  rand: () => number = Math.random,
  avoidTopic?: string,
  storage?: BagStorage,
): ArcadePrompt {
  const pool = topicsOfLevel(level);
  const exclude = pool.filter((t) => t.text === avoidTopic).map((t) => t.id);
  const topic = drawFromBag(`arcade${level}`, pool, { rand, exclude, storage }).text;
  const tone = pick(TONES, rand);
  return { text: `${pick(FORMATS[level], rand)} ${topic} ${tone}.`, topic, tone, level };
}

export const ARCADE_SECONDS = 60;
/** Segundos sin voz a partir de los cuales se avisa de un silencio largo. */
export const LONG_SILENCE_S = 2.5;
