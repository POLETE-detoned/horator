import { motion } from 'motion/react';
import type { Route } from '../App';
import { ProgressRing } from '../components/ProgressRing';
import { TabBar } from '../components/TabBar';
import { MISSION_XP, missionsFor } from '../data/missions';
import { haptic, sfx } from '../lib/feedback';
import { useGame } from '../store/game';
import { dayKey, levelProgress, visibleStreak } from '../store/progress';

interface ModeCard {
  r: Route;
  title: string;
  sub: string;
  icon: string;
  color: string;
  tag: string;
  silentOk: boolean;
}

const MODES: ModeCard[] = [
  { r: 'roleplay', title: 'Notas de voz', sub: 'Improvisa contra personajes IA', icon: '🎙️', color: 'var(--persuasion)', tag: 'Persuasión', silentOk: false },
  { r: 'arcade', title: 'Arcade 60 s', sub: 'Reto selfie: habla sin muletillas', icon: '📸', color: 'var(--claridad)', tag: 'Claridad', silentOk: false },
  { r: 'synonyms', title: 'Caza-sinónimos', sub: 'Desliza y encadena combos', icon: '🃏', color: 'var(--lexico)', tag: 'Léxico', silentOk: true },
];

export function Lobby({ go }: { go: (r: Route) => void }) {
  const progress = useGame((s) => s.progress);
  const silent = useGame((s) => s.settings.silent);
  const setSettings = useGame((s) => s.setSettings);
  const today = dayKey();
  const streak = visibleStreak(progress, today);
  const playedToday = progress.lastPlayed === today;
  const lp = levelProgress(progress.xp);
  const missions = missionsFor(today);
  const mp = progress.missionsDay === today ? progress.missionProgress : [0, 0, 0];
  const doneCount = missions.filter((m, i) => mp[i] >= m.target).length;

  // "Jugar ya": un toque y a jugar. En silencio, al modo sin sonido.
  const quick: Route = silent ? 'synonyms' : (['roleplay', 'arcade', 'synonyms'] as Route[])[new Date().getHours() % 3];
  const quickMode = MODES.find((m) => m.r === quick)!;

  const start = (r: Route) => {
    sfx.start();
    haptic.tap();
    go(r);
  };

  return (
    <>
      {/* Cabecera: nivel, racha, modo silencioso */}
      <header className="row" style={{ marginBottom: 14 }}>
        <ProgressRing ratio={lp.ratio} size={50}>
          <span style={{ fontSize: 18 }}>{lp.level}</span>
        </ProgressRing>
        <div style={{ lineHeight: 1.15 }}>
          <div style={{ fontWeight: 900 }}>Nivel {lp.level}</div>
          <div className="muted" style={{ fontSize: 13 }}>
            {lp.into}/{lp.needed} XP
          </div>
        </div>
        <span className="spacer" />
        <motion.div
          className="chip"
          animate={playedToday ? { scale: [1, 1.08, 1] } : {}}
          transition={{ repeat: Infinity, duration: 1.6 }}
          style={{
            background: playedToday ? 'rgba(255,138,61,.18)' : 'rgba(255,255,255,.06)',
            color: playedToday ? '#ffb15c' : 'var(--muted)',
            fontSize: 16,
          }}
          title={playedToday ? 'Racha asegurada hoy' : 'Juega hoy para mantener la racha'}
        >
          <span style={{ filter: playedToday ? 'none' : 'grayscale(1)' }}>🔥</span> {streak}
          {progress.freezes > 0 && <span title="Protectores de racha">🧊{progress.freezes}</span>}
        </motion.div>
        <button
          className="icon-btn"
          aria-pressed={silent}
          aria-label={silent ? 'Desactivar modo silencioso' : 'Activar modo silencioso'}
          onClick={() => {
            haptic.tap();
            setSettings({ silent: !silent });
          }}
          style={{ background: silent ? 'var(--lexico)' : undefined }}
        >
          {silent ? '🔇' : '🔊'}
        </button>
      </header>

      <div className="scroll">
        {!playedToday && streak > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="chip"
            style={{ width: '100%', justifyContent: 'center', marginBottom: 12, background: 'rgba(255,138,61,.15)', color: '#ffb15c' }}
          >
            🔥 Tu racha de {streak} días te espera: una partida y listo
          </motion.div>
        )}

        {/* CTA principal: menos de 3 s para empezar */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => start(quick)}
          style={{
            width: '100%',
            borderRadius: 28,
            padding: 22,
            textAlign: 'left',
            background: `linear-gradient(135deg, ${quickMode.color}, #8b5cf6)`,
            boxShadow: '0 6px 0 rgba(0,0,0,.35), 0 20px 40px rgba(139,92,246,.25)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 900, opacity: 0.85, letterSpacing: 1 }}>
            {silent ? 'MODO SILENCIOSO' : 'PARTIDA RÁPIDA'}
          </div>
          <div style={{ fontSize: 30, fontWeight: 900, margin: '4px 0 2px' }}>▶ Jugar ya</div>
          <div style={{ fontWeight: 800, opacity: 0.9 }}>
            {quickMode.icon} {quickMode.title}
          </div>
          <motion.span
            aria-hidden
            animate={{ rotate: [0, 8, -6, 0], scale: [1, 1.06, 1] }}
            transition={{ repeat: Infinity, duration: 3 }}
            style={{ position: 'absolute', right: 16, bottom: 6, fontSize: 84, opacity: 0.9 }}
          >
            {quickMode.icon}
          </motion.span>
        </motion.button>

        {/* Modos */}
        <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
          {MODES.map((m, i) => {
            const dim = silent && !m.silentOk;
            return (
              <motion.button
                key={m.r}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: dim ? 0.5 : 1, x: 0 }}
                transition={{ delay: 0.05 * i }}
                whileTap={{ scale: 0.97 }}
                onClick={() => start(m.r)}
                className="row"
                style={{
                  gap: 14,
                  padding: 14,
                  borderRadius: 22,
                  background: 'var(--card)',
                  border: '1px solid var(--line)',
                  textAlign: 'left',
                  boxShadow: '0 4px 0 rgba(0,0,0,.3)',
                }}
              >
                <span
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 18,
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: 30,
                    background: `color-mix(in srgb, ${m.color} 22%, transparent)`,
                    flex: 'none',
                  }}
                >
                  {m.icon}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 900, fontSize: 17 }}>{m.title}</div>
                  <div className="muted" style={{ fontSize: 14 }}>
                    {m.sub}
                  </div>
                </span>
                <span className="chip" style={{ color: m.color, fontSize: 12 }}>
                  {m.silentOk ? '🔇 ' : ''}
                  {m.tag}
                </span>
              </motion.button>
            );
          })}
        </div>

        {/* Misiones diarias */}
        <section style={{ marginTop: 22 }}>
          <div className="row" style={{ marginBottom: 10 }}>
            <h2 className="h2">Misiones de hoy</h2>
            <span className="spacer" />
            <motion.span
              key={doneCount}
              initial={{ scale: 1.6 }}
              animate={{ scale: 1 }}
              style={{ fontSize: 24, filter: doneCount === 3 ? 'none' : 'grayscale(.8)' }}
              title="Cofre diario"
            >
              {progress.chestClaimed ? '🎉' : '🎁'}
            </motion.span>
            <span className="muted" style={{ fontWeight: 900 }}>
              {doneCount}/3
            </span>
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {missions.map((m, i) => {
              const v = Math.min(mp[i] ?? 0, m.target);
              const done = v >= m.target;
              return (
                <div
                  key={m.kind}
                  className="row"
                  style={{ padding: '12px 14px', borderRadius: 18, background: 'var(--bg-2)', border: '1px solid var(--line)', opacity: done ? 0.7 : 1 }}
                >
                  <span style={{ fontSize: 22 }}>{done ? '✅' : m.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: 14, textDecoration: done ? 'line-through' : 'none' }}>{m.label}</div>
                    <div className="bar" style={{ marginTop: 6, height: 8 }}>
                      <motion.div
                        initial={false}
                        animate={{ width: `${(v / m.target) * 100}%` }}
                        style={{ ['--c' as string]: done ? 'var(--good)' : 'var(--gold)' }}
                      />
                    </div>
                  </div>
                  <span className="muted" style={{ fontSize: 13, fontWeight: 900, minWidth: 44, textAlign: 'right' }}>
                    {done ? `+${MISSION_XP}` : `${v}/${m.target}`}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <TabBar current="lobby" go={go} />
    </>
  );
}
