import { motion } from 'motion/react';
import { useMemo } from 'react';

const COLORS = ['#ffd23f', '#ff6b5a', '#45d6ff', '#c58bff', '#3ddc84'];

/** Explosión de confeti ligera (DOM + motion), sin librerías extra. */
export function Confetti({ count = 36, originY = '40%' }: { count?: number; originY?: string }) {
  const parts = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        i,
        x: (Math.random() - 0.5) * 360,
        y: -120 - Math.random() * 260,
        r: Math.random() * 720 - 360,
        c: COLORS[i % COLORS.length],
        w: 6 + Math.random() * 6,
        d: 0.9 + Math.random() * 0.6,
      })),
    [count],
  );
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 50 }}>
      {parts.map((p) => (
        <motion.span
          key={p.i}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
          animate={{ x: p.x, y: [0, p.y, p.y + 520], opacity: [1, 1, 0], rotate: p.r }}
          transition={{ duration: p.d * 1.6, ease: 'easeOut', times: [0, 0.35, 1] }}
          style={{
            position: 'absolute',
            left: '50%',
            top: originY,
            width: p.w,
            height: p.w * 1.6,
            borderRadius: 2,
            background: p.c,
          }}
        />
      ))}
    </div>
  );
}
