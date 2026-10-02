import { animate, motion, useMotionValue, useTransform, type PanInfo } from 'motion/react';
import { useEffect, useRef, type CSSProperties } from 'react';

export type Dir = 'left' | 'right';

const THRESHOLD = 90;
const FLICK = 450;

/**
 * Tarjeta con física: arrastre con inercia, rotación proporcional al desplazamiento,
 * rebote elástico si no supera el umbral y salida con la velocidad del gesto.
 */
export function SwipeCard({
  word,
  onDecide,
  forced,
  feedback,
}: {
  word: string;
  onDecide: (dir: Dir) => void;
  /** Decisión disparada por los botones inferiores (tap en vez de swipe). */
  forced: Dir | null;
  /** Feedback tras decidir: colorea la tarjeta mientras sale. */
  feedback: 'good' | 'bad' | null;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-220, 220], [-16, 16]);
  const pickOpacity = useTransform(x, [20, THRESHOLD], [0, 1]);
  const dropOpacity = useTransform(x, [-THRESHOLD, -20], [1, 0]);
  const decided = useRef(false);

  const fly = (dir: Dir, velocity = 0) => {
    if (decided.current) return;
    decided.current = true;
    onDecide(dir);
    const target = dir === 'right' ? 520 : -520;
    animate(x, target, { type: 'spring', stiffness: 220, damping: 30, velocity: velocity || (dir === 'right' ? 900 : -900) });
    animate(y, y.get() + 60, { duration: 0.4 });
  };

  useEffect(() => {
    if (forced) fly(forced);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forced]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const { offset, velocity } = info;
    if (offset.x > THRESHOLD || velocity.x > FLICK) fly('right', velocity.x);
    else if (offset.x < -THRESHOLD || velocity.x < -FLICK) fly('left', velocity.x);
    else {
      // Rebote: vuelve al centro con un muelle.
      animate(x, 0, { type: 'spring', stiffness: 600, damping: 22 });
      animate(y, 0, { type: 'spring', stiffness: 600, damping: 22 });
    }
  };

  const tint = feedback === 'good' ? 'var(--good)' : feedback === 'bad' ? 'var(--bad)' : 'rgba(255,255,255,.12)';

  return (
    <motion.div
      drag
      dragMomentum={false}
      dragElastic={0.9}
      onDragEnd={onDragEnd}
      style={{
        x,
        y,
        rotate,
        position: 'absolute',
        inset: 0,
        touchAction: 'none',
        cursor: 'grab',
        borderRadius: 28,
        background: 'linear-gradient(160deg, #fff, #ece6ff)',
        color: '#1d1440',
        display: 'grid',
        placeItems: 'center',
        boxShadow: `0 0 0 4px ${tint}, 0 18px 40px rgba(0,0,0,.35)`,
      }}
      // "Caen tarjetas": la nueva tarjeta cae desde arriba con un muelle.
      initial={{ y: -260, scale: 0.9, opacity: 0 }}
      animate={{ y: 0, scale: 1, opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', stiffness: 520, damping: 26 }}
      whileDrag={{ scale: 1.04, cursor: 'grabbing' }}
    >
      <span style={{ fontSize: 'clamp(30px, 10vw, 42px)', fontWeight: 900, padding: '0 16px', textAlign: 'center' }}>{word}</span>
      <motion.span style={{ ...stamp, left: 18, color: 'var(--good)', borderColor: 'var(--good)', rotate: -14, opacity: pickOpacity }}>
        ELEGIR
      </motion.span>
      <motion.span style={{ ...stamp, right: 18, color: 'var(--bad)', borderColor: 'var(--bad)', rotate: 14, opacity: dropOpacity }}>
        DESCARTAR
      </motion.span>
    </motion.div>
  );
}

const stamp: CSSProperties = {
  position: 'absolute',
  top: 22,
  padding: '4px 10px',
  border: '4px solid',
  borderRadius: 10,
  fontWeight: 900,
  fontSize: 20,
  letterSpacing: 1,
};
