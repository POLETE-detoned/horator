import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import type { Route } from '../App';
import { Confetti } from '../components/Confetti';
import { TabBar } from '../components/TabBar';
import { BRANCHES, NODES, TIER_XP, nodesOf, type Branch, type PerkId } from '../data/powers';
import { haptic, sfx } from '../lib/feedback';
import { useGame } from '../store/game';
import { branchTier, readyNodes } from '../store/progress';

const ORDER: Branch[] = ['persuasion', 'claridad', 'lexico'];

export function Powers({ go }: { go: (r: Route) => void }) {
  const progress = useGame((s) => s.progress);
  const claim = useGame((s) => s.claim);
  const ready = new Set(readyNodes(progress).map((n) => n.id));
  const [selected, setSelected] = useState<PerkId | null>(
    () => [...ready][0] ?? NODES.find((n) => !progress.perks.includes(n.id))?.id ?? null,
  );
  const [burst, setBurst] = useState(0);
  const sel = NODES.find((n) => n.id === selected);

  const onNode = (id: PerkId) => {
    haptic.tap();
    setSelected(id);
    if (ready.has(id)) {
      claim(id);
      sfx.levelUp();
      haptic.levelUp();
      setBurst((b) => b + 1);
    }
  };

  return (
    <>
      <header style={{ marginBottom: 12 }}>
        <h1 className="h1">Poderes</h1>
        <div className="muted">Juega para cargar cada poder y desbloquear ventajas.</div>
      </header>

      <div className="scroll" style={{ position: 'relative' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {ORDER.map((b) => {
            const info = BRANCHES[b];
            const bxp = progress.branchXp[b];
            const tier = branchTier(bxp);
            const nextT = TIER_XP[Math.min(tier + 1, 4)];
            const prevT = TIER_XP[tier];
            const ratio = tier >= 4 ? 1 : (bxp - prevT) / (nextT - prevT);
            return (
              <div key={b} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 26 }}>{info.icon}</div>
                <div style={{ fontWeight: 900, color: info.color, fontSize: 15 }}>{info.name}</div>
                <div className="muted" style={{ fontSize: 11, marginBottom: 6 }}>
                  {info.fedBy}
                </div>
                <div className="bar" style={{ height: 6, margin: '0 6px 12px' }}>
                  <motion.div initial={false} animate={{ width: `${ratio * 100}%` }} style={{ ['--c' as string]: info.color }} />
                </div>
                <div style={{ display: 'grid', gap: 14, justifyItems: 'center', position: 'relative' }}>
                  {/* Rama que conecta los nodos */}
                  <div
                    aria-hidden
                    style={{ position: 'absolute', top: 30, bottom: 30, width: 4, borderRadius: 2, background: 'rgba(255,255,255,.08)' }}
                  />
                  {nodesOf(b).map((n) => {
                    const owned = progress.perks.includes(n.id);
                    const isReady = ready.has(n.id);
                    return (
                      <motion.button
                        key={n.id}
                        onClick={() => onNode(n.id)}
                        whileTap={{ scale: 0.9 }}
                        animate={isReady ? { scale: [1, 1.1, 1], boxShadow: [`0 0 0 0 ${info.color}`, `0 0 0 10px transparent`] } : { scale: 1 }}
                        transition={isReady ? { repeat: Infinity, duration: 1.3 } : { type: 'spring' }}
                        aria-label={`${n.name}${owned ? ' (activo)' : isReady ? ' (listo para reclamar)' : ' (bloqueado)'}`}
                        style={{
                          position: 'relative',
                          width: 64,
                          height: 64,
                          borderRadius: 22,
                          fontSize: 28,
                          display: 'grid',
                          placeItems: 'center',
                          background: owned ? info.color : isReady ? 'var(--card-2)' : 'var(--bg-2)',
                          border: `3px solid ${owned || isReady ? info.color : 'var(--line)'}`,
                          outline: selected === n.id ? '3px solid #fff' : 'none',
                          outlineOffset: 2,
                          filter: owned || isReady ? 'none' : 'grayscale(1) opacity(.5)',
                        }}
                      >
                        {n.icon}
                        {!owned && !isReady && (
                          <span style={{ position: 'absolute', right: -6, bottom: -6, fontSize: 16, filter: 'none' }}>🔒</span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {sel && (
            <motion.div
              key={sel.id + progress.perks.includes(sel.id)}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              style={{
                marginTop: 20,
                padding: 16,
                borderRadius: 22,
                background: 'var(--card)',
                border: `2px solid ${BRANCHES[sel.branch].color}`,
              }}
            >
              <div className="row">
                <span style={{ fontSize: 34 }}>{sel.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 900, fontSize: 18 }}>{sel.name}</div>
                  <div className="muted" style={{ fontSize: 14 }}>
                    {sel.desc}
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 10, fontWeight: 900, color: BRANCHES[sel.branch].color }}>
                {progress.perks.includes(sel.id)
                  ? '✓ Activo'
                  : ready.has(sel.id)
                    ? 'Toca el poder para reclamarlo'
                    : `Necesitas ${TIER_XP[sel.tier]} XP de ${BRANCHES[sel.branch].name} (tienes ${progress.branchXp[sel.branch]})`}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {burst > 0 && <Confetti key={burst} originY="30%" />}
      </div>

      <TabBar current="powers" go={go} />
    </>
  );
}
