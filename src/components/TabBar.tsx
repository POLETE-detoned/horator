import { motion } from 'motion/react';
import type { Route } from '../App';
import { haptic } from '../lib/feedback';
import { useGame } from '../store/game';
import { readyNodes } from '../store/progress';

export function TabBar({ current, go }: { current: Route; go: (r: Route) => void }) {
  const ready = useGame((s) => readyNodes(s.progress).length);
  const tabs: { r: Route; icon: string; label: string; badge?: number }[] = [
    { r: 'lobby', icon: '🎮', label: 'Jugar' },
    { r: 'powers', icon: '🌳', label: 'Poderes', badge: ready },
  ];
  return (
    <nav
      className="row"
      style={{ gap: 8, padding: 6, background: 'var(--bg-2)', borderRadius: 22, border: '1px solid var(--line)', marginTop: 10 }}
    >
      {tabs.map((t) => {
        const on = t.r === current;
        return (
          <button
            key={t.r}
            onClick={() => {
              haptic.tap();
              go(t.r);
            }}
            style={{ position: 'relative', flex: 1, height: 52, borderRadius: 16, fontWeight: 900 }}
            aria-current={on ? 'page' : undefined}
          >
            {on && (
              <motion.span
                layoutId="tab-pill"
                style={{ position: 'absolute', inset: 0, borderRadius: 16, background: 'var(--card-2)' }}
                transition={{ type: 'spring', stiffness: 500, damping: 36 }}
              />
            )}
            <span style={{ position: 'relative' }}>
              {t.icon} {t.label}
            </span>
            {!!t.badge && (
              <motion.span
                animate={{ scale: [1, 1.25, 1] }}
                transition={{ repeat: Infinity, duration: 1.2 }}
                style={{
                  position: 'absolute',
                  top: 6,
                  right: 18,
                  minWidth: 20,
                  height: 20,
                  borderRadius: 10,
                  background: 'var(--bad)',
                  fontSize: 12,
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                {t.badge}
              </motion.span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
