import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { haptic } from '../../lib/feedback';

/**
 * Botón "mantén pulsado para hablar". Al soltar se envía; si el dedo se desliza
 * hacia arriba más de 90 px, se cancela (como en WhatsApp).
 */
export function HoldToRecord({
  disabled,
  recording,
  onStart,
  onRelease,
  onCancel,
  color,
}: {
  disabled: boolean;
  recording: boolean;
  onStart: () => void;
  onRelease: () => void;
  onCancel: () => void;
  color: string;
}) {
  const startY = useRef(0);
  const [cancelArmed, setCancelArmed] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!recording) {
      setElapsed(0);
      return;
    }
    const t0 = performance.now();
    const id = setInterval(() => setElapsed(performance.now() - t0), 100);
    return () => clearInterval(id);
  }, [recording]);

  return (
    <div style={{ position: 'relative', display: 'grid', placeItems: 'center', height: 104 }}>
      <AnimatePresence>
        {recording && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{ position: 'absolute', top: -30, fontWeight: 900, color: cancelArmed ? 'var(--bad)' : 'var(--text)' }}
          >
            {cancelArmed ? '✕ Suelta para cancelar' : `● ${(elapsed / 1000).toFixed(1)} s · ↑ desliza para cancelar`}
          </motion.div>
        )}
      </AnimatePresence>
      {recording &&
        [0, 1, 2].map((i) => (
          <motion.span
            key={i}
            aria-hidden
            initial={{ scale: 1, opacity: 0.5 }}
            animate={{ scale: 2.1, opacity: 0 }}
            transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.5, ease: 'easeOut' }}
            style={{ position: 'absolute', width: 84, height: 84, borderRadius: 42, background: color }}
          />
        ))}
      <motion.button
        disabled={disabled}
        aria-label="Mantén pulsado para responder"
        onPointerDown={(e) => {
          if (disabled) return;
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          startY.current = e.clientY;
          setCancelArmed(false);
          haptic.tap();
          onStart();
        }}
        onPointerMove={(e) => {
          if (recording) setCancelArmed(startY.current - e.clientY > 90);
        }}
        onPointerUp={() => {
          if (!recording) return;
          if (cancelArmed) onCancel();
          else onRelease();
          setCancelArmed(false);
        }}
        onPointerCancel={() => recording && onCancel()}
        onContextMenu={(e) => e.preventDefault()}
        animate={{ scale: recording ? 1.25 : 1, backgroundColor: cancelArmed ? '#ff4d6d' : color }}
        transition={{ type: 'spring', stiffness: 500, damping: 20 }}
        style={{
          position: 'relative',
          width: 84,
          height: 84,
          borderRadius: 42,
          fontSize: 34,
          boxShadow: '0 6px 0 rgba(0,0,0,.35)',
          opacity: disabled ? 0.4 : 1,
          touchAction: 'none',
          WebkitTouchCallout: 'none',
        }}
      >
        🎙️
      </motion.button>
    </div>
  );
}
