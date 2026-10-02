import { motion } from 'motion/react';
import { useEffect } from 'react';
import { haptic, sfx } from '../lib/feedback';

/** Estrellas que aparecen de una en una: cada "pop" es el resultado, no decoración. */
export function Stars({ value, size = 34, animate = true }: { value: number; size?: number; animate?: boolean }) {
  useEffect(() => {
    if (!animate) return;
    const timers = Array.from({ length: value }, (_, i) =>
      setTimeout(() => {
        sfx.star(i);
        haptic.tap();
      }, 180 + i * 220),
    );
    return () => timers.forEach(clearTimeout);
  }, [value, animate]);

  return (
    <div className="row" style={{ gap: 4 }} aria-label={`${value} de 3 estrellas`}>
      {[0, 1, 2].map((i) => {
        const on = i < value;
        return (
          <motion.span
            key={i}
            initial={animate ? { scale: 0, rotate: -40 } : false}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: animate ? 0.15 + i * 0.22 : 0, type: 'spring', stiffness: 500, damping: 14 }}
            style={{
              fontSize: size,
              lineHeight: 1,
              filter: on ? 'drop-shadow(0 0 8px rgba(255,210,63,.7))' : 'grayscale(1) opacity(.25)',
            }}
          >
            ⭐
          </motion.span>
        );
      })}
    </div>
  );
}
