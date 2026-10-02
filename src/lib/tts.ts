// Voz de los personajes con speechSynthesis. Cada personaje tiene un perfil (tono, velocidad,
// voz preferida) para que suene distinto aunque el dispositivo solo tenga una o dos voces en español.

export interface VoiceProfile {
  pitch: number;
  rate: number;
  /** Preferencia de género para escoger entre las voces es-* disponibles. */
  prefer: 'f' | 'm';
}

let voices: SpeechSynthesisVoice[] = [];

const FEMALE = /(monica|paulina|helena|laura|lucia|elvira|sabina|marisol|female|mujer|google español$)/i;
const MALE = /(jorge|diego|juan|pablo|alvaro|carlos|enrique|male|hombre)/i;

export function warmVoices() {
  if (typeof speechSynthesis === 'undefined') return;
  const load = () => {
    voices = speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('es'));
  };
  load();
  speechSynthesis.addEventListener?.('voiceschanged', load);
}

function pickVoice(p: VoiceProfile) {
  if (!voices.length) return undefined;
  const es = voices.filter((v) => /es[-_]es/i.test(v.lang));
  const pool = es.length ? es : voices;
  const re = p.prefer === 'f' ? FEMALE : MALE;
  return pool.find((v) => re.test(v.name)) ?? pool[p.prefer === 'f' ? 0 : pool.length - 1];
}

/** Duración estimada de una nota de voz (ms) para animar la onda aunque no haya audio. */
export const estimateDuration = (text: string, rate = 1) =>
  Math.max(1800, Math.round((text.split(/\s+/).length / (2.6 * rate)) * 1000));

export interface Playback {
  done: Promise<void>;
  stop: () => void;
}

export function speak(text: string, profile: VoiceProfile, muted: boolean): Playback {
  const fallback = (): Playback => {
    let timer: ReturnType<typeof setTimeout>;
    let resolve!: () => void;
    const done = new Promise<void>((r) => {
      resolve = r;
      timer = setTimeout(r, estimateDuration(text, profile.rate));
    });
    return {
      done,
      stop: () => {
        clearTimeout(timer);
        resolve();
      },
    };
  };
  if (muted || typeof speechSynthesis === 'undefined') return fallback();

  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'es-ES';
  u.pitch = profile.pitch;
  u.rate = profile.rate;
  const v = pickVoice(profile);
  if (v) u.voice = v;

  let resolve!: () => void;
  const done = new Promise<void>((r) => (resolve = r));
  u.onend = () => resolve();
  u.onerror = () => resolve();
  // Salvavidas: algunos navegadores nunca disparan onend.
  const guard = setTimeout(resolve, estimateDuration(text, profile.rate) * 2 + 2000);
  void done.then(() => clearTimeout(guard));
  speechSynthesis.speak(u);
  return {
    done,
    stop: () => {
      speechSynthesis.cancel();
      resolve();
    },
  };
}
