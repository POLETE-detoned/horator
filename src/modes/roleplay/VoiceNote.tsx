import { motion } from 'motion/react';
import { useMemo } from 'react';

function bars(seed: string, n = 28) {
  let h = 7;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return Array.from({ length: n }, (_, i) => {
    h = (h * 1103515245 + 12345) >>> 0;
    const env = Math.sin((i / n) * Math.PI) * 0.6 + 0.4;
    return 0.2 + ((h >>> 16) / 65535) * 0.8 * env;
  });
}

const fmt = (ms: number) => {
  const s = Math.max(1, Math.round(ms / 1000));
  return `0:${String(s).padStart(2, '0')}`;
};

/** Burbuja de nota de voz: la onda se "rellena" mientras suena, como en WhatsApp. */
export function VoiceNote({
  text,
  color,
  playing,
  durationMs,
  onPlay,
}: {
  text: string;
  color: string;
  playing: boolean;
  durationMs: number;
  onPlay?: () => void;
}) {
  const b = useMemo(() => bars(text), [text]);
  return (
    <div className="row" style={{ gap: 10, minWidth: 210 }}>
      <button
        onClick={onPlay}
        aria-label={playing ? 'Reproduciendo' : 'Reproducir nota de voz'}
        style={{ width: 36, height: 36, borderRadius: 18, background: color, display: 'grid', placeItems: 'center', fontSize: 14, flex: 'none' }}
      >
        {playing ? '❚❚' : '▶'}
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, height: 30, flex: 1 }}>
        {b.map((v, i) => (
          <motion.span
            key={`${i}-${playing}`}
            initial={playing ? { backgroundColor: 'rgba(255,255,255,.35)' } : false}
            animate={
              playing
                ? { backgroundColor: color, scaleY: [1, 1.35, 1] }
                : { backgroundColor: 'rgba(255,255,255,.55)', scaleY: 1 }
            }
            transition={
              playing
                ? {
                    backgroundColor: { delay: (i / b.length) * (durationMs / 1000), duration: 0.05 },
                    scaleY: { repeat: Infinity, duration: 0.5, delay: (i % 5) * 0.08 },
                  }
                : { duration: 0.2 }
            }
            style={{ width: 3, height: `${v * 100}%`, borderRadius: 2, display: 'block' }}
          />
        ))}
      </div>
      <span className="muted" style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
        {fmt(durationMs)}
      </span>
    </div>
  );
}
