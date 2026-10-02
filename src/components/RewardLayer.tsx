import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { NODES } from '../data/powers';
import { LEVEL_NAMES } from '../data/synonyms';
import { haptic, sfx } from '../lib/feedback';
import { useGame } from '../store/game';
import type { Reward } from '../store/progress';
import { Confetti } from './Confetti';

type Beat =
  | { kind: 'xp'; xp: number }
  | { kind: 'banner'; icon: string; title: string; sub?: string; color: string }
  | { kind: 'level'; level: number };

function beatsOf(r: Reward): Beat[] {
  const out: Beat[] = [];
  if (r.xp > 0) out.push({ kind: 'xp', xp: r.xp });
  if (r.streakUp && r.streakUp > 1)
    out.push({ kind: 'banner', icon: '🔥', title: `¡Racha de ${r.streakUp} días!`, sub: 'Vuelve mañana para no perderla', color: '#ff8a3d' });
  for (const m of r.missions) out.push({ kind: 'banner', icon: '✅', title: 'Misión completada', sub: m, color: 'var(--good)' });
  if (r.chest) out.push({ kind: 'banner', icon: '🎁', title: '¡Cofre diario!', sub: 'Todas las misiones de hoy: +60 XP', color: 'var(--gold)' });
  if (r.synLevelUp)
    out.push({ kind: 'banner', icon: '🔓', title: `Nivel léxico ${r.synLevelUp}`, sub: `Desbloqueado: ${LEVEL_NAMES[r.synLevelUp]}`, color: 'var(--lexico)' });
  for (const id of r.newNodes) {
    const n = NODES.find((x) => x.id === id)!;
    out.push({ kind: 'banner', icon: n.icon, title: '¡Nuevo poder disponible!', sub: `${n.name} · reclámalo en Poderes`, color: 'var(--accent)' });
  }
  if (r.levelUp) out.push({ kind: 'level', level: r.levelUp });
  return out;
}

/** Capa global de celebraciones: consume la cola de recompensas del store, beat a beat. */
export function RewardLayer() {
  const head = useGame((s) => s.rewards[0]);
  const shift = useGame((s) => s.shiftReward);
  const beats = useMemo(() => (head ? beatsOf(head) : []), [head]);
  const [i, setI] = useState(0);

  useEffect(() => setI(0), [head?.key]);

  const beat = beats[i];
  useEffect(() => {
    if (!head) return;
    if (!beat) {
      shift();
      return;
    }
    if (beat.kind === 'level') {
      sfx.levelUp();
      haptic.levelUp();
    } else if (beat.kind === 'banner') {
      sfx.good(4);
      haptic.success();
    }
    const t = setTimeout(() => setI((x) => x + 1), beat.kind === 'xp' ? 1100 : beat.kind === 'level' ? 2600 : 1900);
    return () => clearTimeout(t);
  }, [beat, head, shift]);

  const next = () => setI((x) => x + 1);

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 100 }}>
      <AnimatePresence>
        {beat?.kind === 'xp' && (
          <motion.div
            key={`xp-${head?.key}`}
            initial={{ y: -40, opacity: 0, scale: 0.6 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -30, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 22 }}
            style={{ position: 'absolute', top: 'calc(var(--safe-t) + 14px)', left: 0, right: 0, display: 'grid', placeItems: 'center' }}
          >
            <span className="chip" style={{ background: 'var(--gold)', color: '#3a2a00', fontSize: 18, padding: '8px 16px' }}>
              +{beat.xp} XP
            </span>
          </motion.div>
        )}
        {beat?.kind === 'banner' && (
          // Sin capturar toques: nunca debe tapar los controles de juego que hay debajo.
          <motion.div
            key={`b-${head?.key}-${i}`}
            initial={{ y: -90, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -90, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 26 }}
            style={{
              position: 'absolute',
              top: 'calc(var(--safe-t) + 10px)',
              left: 12,
              right: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 16px',
              borderRadius: 18,
              background: 'var(--card-2)',
              border: `2px solid ${beat.color}`,
              boxShadow: '0 12px 30px rgba(0,0,0,.4)',
              textAlign: 'left',
            }}
          >
            <motion.span
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 600, damping: 12 }}
              style={{ fontSize: 30 }}
            >
              {beat.icon}
            </motion.span>
            <span>
              <div style={{ fontWeight: 900, color: beat.color }}>{beat.title}</div>
              {beat.sub && <div className="muted" style={{ fontSize: 14 }}>{beat.sub}</div>}
            </span>
          </motion.div>
        )}
        {beat?.kind === 'level' && (
          <motion.button
            key={`lvl-${head?.key}`}
            onClick={next}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              pointerEvents: 'auto',
              position: 'absolute',
              inset: 0,
              background: 'rgba(10,6,24,.82)',
              display: 'grid',
              placeItems: 'center',
              backdropFilter: 'blur(4px)',
            }}
          >
            <Confetti />
            <motion.div
              initial={{ scale: 0.2, rotate: -12 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 12 }}
              style={{ textAlign: 'center' }}
            >
              <div className="muted" style={{ fontWeight: 900, letterSpacing: 2 }}>¡SUBES DE NIVEL!</div>
              <div
                style={{
                  fontSize: 120,
                  fontWeight: 900,
                  lineHeight: 1,
                  background: 'linear-gradient(180deg,#fff, var(--gold))',
                  WebkitBackgroundClip: 'text',
                  color: 'transparent',
                }}
              >
                {beat.level}
              </div>
              <div className="muted" style={{ marginTop: 8 }}>Toca para seguir</div>
            </motion.div>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
