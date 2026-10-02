// Generador de retos para el modo Arcade: tema × tono × formato → miles de combinaciones.

const TOPICS = [
  'la tortilla de patatas es el mejor plato del mundo',
  'la siesta debería ser obligatoria por ley',
  'las reuniones de los lunes deberían prohibirse',
  'el metro es el mejor sitio para pensar',
  'los calcetines con sandalias son la tendencia del año',
  'deberíamos trabajar solo cuatro días a la semana',
  'los gatos serían mejores jefes que los humanos',
  'el café de máquina de la oficina es una obra de arte',
  'hay que volver a escribir cartas a mano',
  'el ascensor es el mejor lugar para hacer contactos',
  'las cebollas en la tortilla son innegociables',
  'el lunes es el mejor día de la semana',
  'la paella merece ser Patrimonio de la Humanidad',
  'los audios de WhatsApp de más de un minuto deberían prohibirse',
  'madrugar está sobrevalorado',
  'el churro es superior a la porra',
  'deberíamos aplaudir cuando aterriza el avión',
  'el mejor plan de domingo es no tener plan',
  'las plantas de interior merecen un sueldo',
  'el karaoke debería ser deporte olímpico',
];

const TONES = [
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
];

const FORMATS = ['Convénceme en 60 segundos de que', 'Defiende en 60 segundos que', 'Véndeme en 60 segundos la idea de que'];

export interface ArcadePrompt {
  text: string;
  topic: string;
  tone: string;
}

const pick = <T,>(arr: T[], r: () => number) => arr[Math.floor(r() * arr.length)];

export function randomPrompt(rand: () => number = Math.random, avoid?: string): ArcadePrompt {
  for (let i = 0; i < 5; i++) {
    const topic = pick(TOPICS, rand);
    const tone = pick(TONES, rand);
    const text = `${pick(FORMATS, rand)} ${topic} ${tone}.`;
    if (text !== avoid) return { text, topic, tone };
  }
  const topic = TOPICS[0];
  const tone = TONES[0];
  return { text: `${FORMATS[0]} ${topic} ${tone}.`, topic, tone };
}

export const ARCADE_SECONDS = 60;
/** Segundos sin voz a partir de los cuales se avisa de un silencio largo. */
export const LONG_SILENCE_S = 2.5;
