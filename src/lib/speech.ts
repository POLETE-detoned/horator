// Envoltorio de la Web Speech API (reconocimiento de voz en es-ES).
// Chrome/Android y Safari lo exponen con prefijo; donde no existe, el juego cae a modo "solo voz" o texto.

interface SRResult {
  isFinal: boolean;
  0: { transcript: string };
}
interface SREvent {
  resultIndex: number;
  results: ArrayLike<SRResult>;
}
interface SR {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: SREvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type SRCtor = new () => SR;

const getCtor = (): SRCtor | undefined => {
  const w = window as unknown as { SpeechRecognition?: SRCtor; webkitSpeechRecognition?: SRCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
};

export const speechSupported = () => typeof window !== 'undefined' && !!getCtor();

export interface SpeechUpdate {
  /** Texto consolidado + parcial actual. */
  text: string;
  finalText: string;
  interim: string;
  /** Momento (performance.now) del último cambio de texto: sirve para detectar silencios. */
  lastChange: number;
}

/**
 * Sesión de dictado continua. Chrome corta el reconocimiento tras unos segundos sin voz,
 * así que se reinicia sola mientras la sesión siga activa.
 */
export class SpeechSession {
  private rec: SR | null = null;
  private active = false;
  private finals: string[] = [];
  private interim = '';
  lastChange = 0;

  constructor(
    private onUpdate: (u: SpeechUpdate) => void,
    private onFatal?: (error: string) => void,
  ) {}

  start() {
    const Ctor = getCtor();
    if (!Ctor) {
      this.onFatal?.('unsupported');
      return;
    }
    this.active = true;
    this.finals = [];
    this.interim = '';
    this.lastChange = performance.now();
    this.spawn(Ctor);
  }

  private spawn(Ctor: SRCtor) {
    const rec = new Ctor();
    rec.lang = 'es-ES';
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    const base = this.finals.length;
    const local: string[] = [];
    rec.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) local[i] = r[0].transcript.trim();
        else interim += r[0].transcript;
      }
      this.finals.length = base;
      this.finals.push(...local.filter(Boolean));
      this.interim = interim.trim();
      this.lastChange = performance.now();
      this.emit();
    };
    rec.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed' || e.error === 'audio-capture') {
        this.active = false;
        this.onFatal?.(e.error);
      }
    };
    rec.onend = () => {
      if (this.active) {
        // Consolida lo parcial y vuelve a escuchar.
        if (this.interim) {
          this.finals.push(this.interim);
          this.interim = '';
        }
        try {
          this.spawn(Ctor);
        } catch {
          this.active = false;
        }
      }
    };
    this.rec = rec;
    try {
      rec.start();
    } catch {
      /* ya arrancado */
    }
  }

  private emit() {
    const finalText = this.finals.join(' ');
    this.onUpdate({
      text: [finalText, this.interim].filter(Boolean).join(' '),
      finalText,
      interim: this.interim,
      lastChange: this.lastChange,
    });
  }

  /**
   * Detiene y devuelve el texto final. Espera brevemente (máx. `graceMs`) a que el motor
   * entregue el último resultado definitivo, para no perder las palabras dichas justo al soltar.
   */
  stop(graceMs = 450): Promise<string> {
    this.active = false;
    const rec = this.rec;
    this.rec = null;
    const collect = () => [...this.finals, this.interim].filter(Boolean).join(' ');
    if (!rec) return Promise.resolve(collect());
    return new Promise((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        resolve(collect());
      };
      rec.onend = finish;
      setTimeout(finish, graceMs);
      try {
        rec.stop();
      } catch {
        finish();
      }
    });
  }

  abort() {
    this.active = false;
    try {
      this.rec?.abort();
    } catch {
      /* noop */
    }
    this.rec = null;
  }
}
