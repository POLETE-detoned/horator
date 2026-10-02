// Feedback sensorial: hápticos y efectos de sonido sintetizados (sin ficheros que descargar).
// Ambos respetan los ajustes del jugador; el sonido se apaga en modo silencioso.

import { getTg } from './telegram';

let soundOn = true;
let hapticsOn = true;

export function configureFeedback(opts: { sound: boolean; haptics: boolean }) {
  soundOn = opts.sound;
  hapticsOn = opts.haptics;
}

type HapticKind = 'tap' | 'success' | 'error' | 'filler' | 'levelUp';

/** Háptico nativo de Telegram si estamos dentro; si no, navigator.vibrate (Android). */
function buzz(kind: HapticKind, pattern: number | number[]) {
  if (!hapticsOn) return;
  const h = getTg()?.HapticFeedback;
  if (h) {
    try {
      if (kind === 'tap') h.impactOccurred('light');
      else if (kind === 'success' || kind === 'levelUp') h.notificationOccurred('success');
      else if (kind === 'error') h.notificationOccurred('error');
      else h.impactOccurred('rigid');
    } catch {
      /* cliente sin háptica */
    }
    return;
  }
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* iOS Safari no soporta vibrate: se ignora */
  }
}

export const haptic = {
  tap: () => buzz('tap', 8),
  success: () => buzz('success', [12, 40, 18]),
  error: () => buzz('error', [30, 30, 30]),
  filler: () => buzz('filler', 45),
  levelUp: () => buzz('levelUp', [20, 50, 20, 50, 60]),
};

let ctx: AudioContext | null = null;
const audio = () => {
  if (!ctx) {
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
};

function tone(freq: number, dur: number, type: OscillatorType = 'sine', gain = 0.08, delay = 0) {
  if (!soundOn) return;
  const a = audio();
  if (!a) return;
  const t = a.currentTime + delay;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export const sfx = {
  tap: () => tone(660, 0.06, 'triangle', 0.05),
  good: (combo = 0) => {
    const base = 520 * Math.pow(1.06, Math.min(combo, 12));
    tone(base, 0.09, 'triangle');
    tone(base * 1.5, 0.12, 'triangle', 0.06, 0.06);
  },
  bad: () => tone(160, 0.18, 'sawtooth', 0.05),
  star: (i: number) => tone(700 + i * 180, 0.16, 'triangle', 0.08),
  filler: () => tone(220, 0.08, 'square', 0.03),
  levelUp: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.18, 'triangle', 0.08, i * 0.09)),
  send: () => tone(880, 0.07, 'sine', 0.06),
  start: () => [440, 880].forEach((f, i) => tone(f, 0.1, 'triangle', 0.07, i * 0.08)),
};

/** Desbloquea el AudioContext en iOS: debe llamarse desde un gesto del usuario. */
export const unlockAudio = () => void audio();
