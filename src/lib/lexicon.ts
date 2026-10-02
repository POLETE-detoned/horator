// Motor léxico: todo lo que convierte una transcripción en números jugables.
// Se ejecuta en el cliente para que la recompensa sea instantánea (sin esperar a la red).

export const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ñ/g, 'n');

export function tokenize(text: string): string[] {
  return text.toLowerCase().match(/[a-záéíóúüñ]+/g) ?? [];
}

// Palabras funcionales y vocabulario muy frecuente: no suman riqueza léxica.
const STOP = new Set(
  `a al algo alguien alguno algunos ante antes aqui asi aun bien cada casi como con contra cual cuando
  de del desde donde dos e el ella ellas ello ellos en entre era eran eres es esa esas ese eso esos esta
  estaba estado estamos estan estar estas este esto estos estoy fue fueron fui ha habia han has hasta hay
  he hemos hoy la las le les lo los mas me mi mis mucho muchos muy nada ni no nos nosotros o os otra
  otras otro otros para pero poco por porque que quien se sea ser si sido siempre sin sobre solo son su
  sus tambien tan tanto te tengo tiene tienen todo todos tu tus un una unas uno unos usted ustedes va van
  vamos y ya yo cosa cosas hacer hago hace hacemos hacen decir digo dice dicen creo cree pienso puede
  puedo pueden quiero quiere vez veces ahora luego entonces gente mismo misma tiempo dia dias ano anos
  bueno buena malo mala grande pequeno mejor peor tener ver voy vas ir sabe se saber claro vale pues
  tipo bastante igual verdad mira oye gracias hola favor nunca otro aqui alli ahi cual cuales parte
  forma manera mucha muchas poca pocos todas toda dar doy da dan estoy estas esta estan`.split(/\s+/),
);

// Vocabulario de nivel experto: palabras que hacen sonar a alguien preciso y persuasivo.
export const EXPERT = new Set(
  `abordar acotar afianzar agilizar ahondar alentador aludir ambicioso amenizar apremiante argumentar
  articular asequible atenuar auge axioma balance categorico certero clave coherente colosal
  conciso concluyente consolidar constatar contundente convincente crucial cuantificar decisivo
  deliberar demostrar desglosar determinante diferencial dilucidar dinamizar discrepar eficaz
  eficiente elocuente enfatizar enriquecedor esencial estrategico evidenciar exhaustivo excepcional
  exponer fehaciente fidedigno fomentar fundamental garantizar idoneo imprescindible impulsar
  inapelable incuestionable indispensable inequivoco ineludible inestimable inigualable innegable
  inherente inminente integro irrefutable irrenunciable legitimo magnifico matizar meticuloso
  minucioso notable notorio optimizar palpable paradigma pertinente plantear plausible ponderar
  potenciar pragmatico precisar preponderante primordial prioritario proactivo propicio propuesta
  rentable relevante resolutivo riguroso robusto salvedad senalar significativo singular solido
  solvente sostenible subrayar sublime sustancial tangible trascendental trascendente valioso
  versatil viable vital sintetizar recalcar replantear ecuanime sensato juicioso impecable
  exquisito excelso suculento sabroso emblematico autentico genuino tradicional irresistible
  incomparable insuperable apasionante fascinante deslumbrante memorable rotundo indiscutible
  resiliente empatico asertivo diligente perspicaz sagaz meridiano lucido`.split(/\s+/),
);

export interface FillerHit {
  word: string;
  index: number;
}

// Muletillas. Se evalúan sobre texto normalizado (sin tildes).
const FILLER_PATTERNS: [RegExp, string][] = [
  [/\b(e+h+|e+m+|eh+m+|m{2,}|u+h+m*)\b/g, 'eh'],
  [/\bo sea\b/g, 'o sea'],
  [/\ben plan\b/g, 'en plan'],
  [/\bbueno\b/g, 'bueno'],
  [/\bpues (nada|eso)\b/g, 'pues'],
  [/\bdigamos\b/g, 'digamos'],
  [/\b(sabes|me entiendes)\b/g, '¿sabes?'],
  [/\by tal\b/g, 'y tal'],
  [/\btipo\b(?! de\b)/g, 'tipo'],
  [/\ba ver\b/g, 'a ver'],
];

export function findFillers(text: string): FillerHit[] {
  const t = normalize(text);
  const hits: FillerHit[] = [];
  for (const [re, word] of FILLER_PATTERNS) {
    for (const m of t.matchAll(re)) hits.push({ word, index: m.index ?? 0 });
  }
  return hits.sort((a, b) => a.index - b.index);
}

const isRich = (w: string) => {
  const n = normalize(w);
  if (STOP.has(n)) return false;
  if (EXPERT.has(n)) return true;
  // Palabras largas y derivadas (-mente, -ción, -ble...) suelen indicar un registro más elaborado.
  return n.length >= 9 || (n.length >= 7 && /(mente|cion|ble|ivo|iva|ismo|encia|ancia)$/.test(n));
};

/** Palabras expertas (únicas, en su forma original) presentes en el texto. */
export function expertWords(text: string): string[] {
  const seen = new Map<string, string>();
  for (const w of tokenize(text)) {
    const n = normalize(w);
    if (EXPERT.has(n) || (n.length >= 10 && !STOP.has(n))) seen.set(n, w);
  }
  return [...seen.values()];
}

export interface LexicalReport {
  words: number;
  uniqueContent: number;
  richWords: string[];
  expert: string[];
  fillers: FillerHit[];
  /** 0–100 */
  score: number;
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

export function analyze(text: string): LexicalReport {
  const words = tokenize(text);
  const content = words.filter((w) => !STOP.has(normalize(w)));
  const unique = new Set(content.map(normalize));
  const rich = [...new Set(content.filter(isRich).map((w) => w))];
  const expert = expertWords(text);
  const fillers = findFillers(text);

  if (words.length === 0) {
    return { words: 0, uniqueContent: 0, richWords: [], expert: [], fillers, score: 0 };
  }

  const lengthF = clamp01(words.length / 25);
  const ttr = content.length ? unique.size / content.length : 0;
  const richRatio = content.length ? rich.length / content.length : 0;
  const raw =
    0.25 * lengthF +
    0.2 * ttr * lengthF + // la variedad solo cuenta si hay algo de discurso
    0.35 * clamp01(richRatio / 0.35) +
    0.2 * clamp01(expert.length / 3);
  const score = Math.round(Math.max(0, Math.min(100, raw * 100 - fillers.length * 6)));
  return { words: words.length, uniqueContent: unique.size, richWords: rich, expert, fillers, score };
}

/** Tiempo de reacción → 0..1. Menos de 1,5 s es perfecto; a partir de 8 s no puntúa. */
export const reactionScore = (ms: number) => clamp01(1 - (ms - 1500) / 6500);

export type Stars = 0 | 1 | 2 | 3;

export function starsFor(lexScore: number, reactionMs: number, words: number): Stars {
  if (words === 0) return 0;
  const total = 0.7 * lexScore + 30 * reactionScore(reactionMs);
  if (total >= 72) return 3;
  if (total >= 45) return 2;
  return 1;
}

/** Ritmo: zona ideal para hablar en público en español. */
export const PACE = { min: 110, max: 170 } as const;

export type PaceZone = 'lento' | 'ideal' | 'rapido';
export const paceZone = (wpm: number): PaceZone =>
  wpm < PACE.min ? 'lento' : wpm > PACE.max ? 'rapido' : 'ideal';
