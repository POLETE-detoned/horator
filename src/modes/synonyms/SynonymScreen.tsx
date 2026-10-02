import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Confetti } from '../../components/Confetti';
import { LEVEL_NAMES, MAX_LEVEL, splitSentence, type SynonymRound } from '../../data/synonyms';
import { haptic, sfx } from '../../lib/feedback';
import { useGame, usePerk } from '../../store/game';
import { SYN_UNLOCK } from '../../store/progress';
import { buildDeck, multiplier, pickRound, POINTS_PER_CARD, SYN_SECONDS, type Card } from './engine';
import { SwipeCard, type Dir } from './SwipeCard';

type Phase = 'playing' | 'results';

interface Miss {
  word: string;
  why: string;
  sentence: string;
}

const LEVEL_KEY = 'horator.synLevel';

export function SynonymScreen({ onExit }: { onExit: () => void }) {
  const unlocked = useGame((s) => s.progress.synLevelUnlocked);
  const best = useGame((s) => s.progress.bests.synScore);
  const record = useGame((s) => s.record);
  const hasComodin = usePerk('comodin');
  const hasEscudo = usePerk('escudo');
  const hasReloj = usePerk('reloj');
  const cap = usePerk('multix5') ? 5 : 4;
  const totalTime = SYN_SECONDS + (hasReloj ? 10 : 0);

  const [level, setLevel] = useState(() => {
    const saved = Number(localStorage.getItem(LEVEL_KEY));
    return saved >= 1 && saved <= unlocked ? saved : unlocked;
  });
  const [phase, setPhase] = useState<Phase>('playing');
  const [round, setRound] = useState<SynonymRound>(() => pickRound(level, []));
  const [deck, setDeck] = useState<Card[]>(() => buildDeck(round));
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [stats, setStats] = useState({ ok: 0, total: 0 });
  const [timeLeft, setTimeLeft] = useState(totalTime);
  const [forced, setForced] = useState<Dir | null>(null);
  const [feedback, setFeedback] = useState<'good' | 'bad' | null>(null);
  const [toast, setToast] = useState<{ text: string; good: boolean; key: number } | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [misses, setMisses] = useState<Miss[]>([]);
  const [shieldUsed, setShieldUsed] = useState(false);
  const [skipUsed, setSkipUsed] = useState(false);
  const [flash, setFlash] = useState<'good' | 'bad' | null>(null);
  const recent = useRef<string[]>([]);
  const busy = useRef(false);
  const ended = useRef(false);

  // Reloj de partida
  useEffect(() => {
    if (phase !== 'playing') return;
    const started = performance.now();
    setTimeLeft(totalTime);
    const id = setInterval(() => {
      const left = Math.max(0, totalTime - (performance.now() - started) / 1000);
      setTimeLeft(left);
      if (left <= 0) clearInterval(id);
    }, 100);
    return () => clearInterval(id);
  }, [phase, totalTime]);

  // Los avisos se retiran solos.
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 1500);
    return () => clearTimeout(t);
  }, [toast]);

  const finish = useCallback(() => {
    if (ended.current) return;
    ended.current = true;
    setPhase('results');
    const accuracy = stats.total ? stats.ok / stats.total : 0;
    record({ type: 'syn_end', score, correct: stats.ok, bestCombo, level, accuracy });
  }, [stats, score, bestCombo, level, record]);

  useEffect(() => {
    if (phase === 'playing' && timeLeft <= 0) finish();
  }, [timeLeft, phase, finish]);

  const nextCard = useCallback(() => {
    const rest = deck.slice(1);
    if (rest.length) setDeck(rest);
    else {
      // Frase completada: la siguiente entra sin pantalla de carga.
      recent.current = [...recent.current.slice(-8), round.id];
      const r = pickRound(level, recent.current);
      setRound(r);
      setChosen(null);
      setDeck(buildDeck(r));
    }
    setForced(null);
    setFeedback(null);
    busy.current = false;
  }, [deck, level, round.id]);

  const decide = useCallback(
    (dir: Dir) => {
      const card = deck[0];
      if (!card || phase !== 'playing') return;
      busy.current = true;
      const correct = (dir === 'right') === card.good;
      setStats((s) => ({ ok: s.ok + (correct ? 1 : 0), total: s.total + 1 }));
      if (correct) {
        const c = combo + 1;
        const mult = multiplier(c, cap);
        setCombo(c);
        setBestCombo((b) => Math.max(b, c));
        setScore((s) => s + POINTS_PER_CARD * mult);
        setFeedback('good');
        setFlash('good');
        if (dir === 'right') setChosen(card.word);
        sfx.good(c);
        haptic.success();
        if (mult > multiplier(combo, cap)) setToast({ text: `¡Combo ×${mult}!`, good: true, key: Date.now() });
      } else {
        const shield = hasEscudo && !shieldUsed && combo > 0;
        if (shield) setShieldUsed(true);
        else setCombo(0);
        setFeedback('bad');
        setFlash('bad');
        sfx.bad();
        haptic.error();
        const text = card.good ? `«${card.word}» sí valía` : card.why ?? 'No encaja';
        setToast({ text: shield ? `🛡️ ${text}` : text, good: false, key: Date.now() });
        setMisses((m) =>
          m.length < 6
            ? [...m, { word: card.word, why: card.good ? 'Era una buena alternativa.' : card.why ?? '', sentence: round.sentence }]
            : m,
        );
      }
      setTimeout(() => setFlash(null), 260);
      setTimeout(nextCard, 260);
    },
    [deck, phase, combo, cap, hasEscudo, shieldUsed, round.sentence, nextCard],
  );

  const tap = (dir: Dir) => {
    if (busy.current || forced) return;
    setForced(dir);
  };

  const skip = () => {
    if (skipUsed || busy.current) return;
    setSkipUsed(true);
    haptic.tap();
    nextCard();
  };

  const restart = (lvl = level) => {
    localStorage.setItem(LEVEL_KEY, String(lvl));
    const r = pickRound(lvl, []);
    setLevel(lvl);
    setRound(r);
    setDeck(buildDeck(r));
    setScore(0);
    setCombo(0);
    setBestCombo(0);
    setStats({ ok: 0, total: 0 });
    setTimeLeft(totalTime);
    setMisses([]);
    setChosen(null);
    setShieldUsed(false);
    setSkipUsed(false);
    setFeedback(null);
    setForced(null);
    busy.current = false;
    ended.current = false;
    sfx.start();
    setPhase('playing');
  };

  const mult = multiplier(combo, cap);
  const [before, target, after] = splitSentence(round.sentence);
  const card = deck[0];

  if (phase === 'results') {
    const accuracy = stats.total ? Math.round((stats.ok / stats.total) * 100) : 0;
    const isRecord = score > 0 && score >= best;
    const canUnlock = level === unlocked && unlocked < MAX_LEVEL;
    return (
      <div className="screen" style={{ textAlign: 'center' }}>
        {isRecord && <Confetti />}
        <div className="row">
          <button className="icon-btn" onClick={onExit} aria-label="Salir">
            ✕
          </button>
        </div>
        <div className="scroll" style={{ paddingTop: 8 }}>
          <div className="muted" style={{ fontWeight: 900, letterSpacing: 2 }}>
            {isRecord ? '¡NUEVO RÉCORD!' : 'FIN DE PARTIDA'}
          </div>
          <motion.div
            initial={{ scale: 0.3 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 12 }}
            style={{ fontSize: 76, fontWeight: 900, color: 'var(--lexico)', lineHeight: 1.1 }}
          >
            {score}
          </motion.div>
          <div className="row" style={{ justifyContent: 'center', gap: 8, margin: '10px 0 18px', flexWrap: 'wrap' }}>
            <span className="chip">🎯 {accuracy}% acierto</span>
            <span className="chip">🔗 Combo {bestCombo}</span>
            <span className="chip">
              📚 Nivel {level} · {LEVEL_NAMES[level]}
            </span>
          </div>
          {canUnlock && (
            <div className="chip" style={{ marginBottom: 16, background: 'rgba(197,139,255,.15)', color: 'var(--lexico)' }}>
              🔓 Nivel {level + 1}: {SYN_UNLOCK.score} puntos con {SYN_UNLOCK.accuracy * 100}% de acierto
            </div>
          )}
          {misses.length > 0 && (
            <div style={{ textAlign: 'left', display: 'grid', gap: 8 }}>
              <div className="h2" style={{ fontSize: 17 }}>
                Para la próxima
              </div>
              {misses.slice(0, 4).map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.08 }}
                  style={{ padding: 12, borderRadius: 16, background: 'var(--bg-2)', border: '1px solid var(--line)' }}
                >
                  <b>{m.word}</b> <span className="muted">· {m.why}</span>
                </motion.div>
              ))}
            </div>
          )}
          {unlocked > 1 && (
            <div style={{ marginTop: 18 }}>
              <div className="muted" style={{ fontWeight: 800, marginBottom: 8 }}>
                Dificultad léxica
              </div>
              <div className="row" style={{ justifyContent: 'center', gap: 6 }}>
                {Array.from({ length: MAX_LEVEL }, (_, i) => i + 1).map((l) => (
                  <button
                    key={l}
                    disabled={l > unlocked}
                    onClick={() => setLevel(l)}
                    className="chip"
                    style={{
                      background: l === level ? 'var(--lexico)' : undefined,
                      opacity: l > unlocked ? 0.35 : 1,
                      width: 44,
                      justifyContent: 'center',
                    }}
                  >
                    {l > unlocked ? '🔒' : l}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <button className="btn block" style={{ ['--c' as string]: 'var(--lexico)' }} onClick={() => restart(level)}>
          ↻ Otra partida
        </button>
      </div>
    );
  }

  return (
    <div className="screen" style={{ gap: 12 }}>
      {/* Destello de resultado en los bordes */}
      <AnimatePresence>
        {flash && (
          <motion.div
            key={flash + stats.total}
            initial={{ opacity: 0.9 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              boxShadow: `inset 0 0 60px 10px ${flash === 'good' ? 'rgba(61,220,132,.55)' : 'rgba(255,77,109,.6)'}`,
              zIndex: 5,
            }}
          />
        )}
      </AnimatePresence>

      {/* HUD */}
      <div className="row">
        <button className="icon-btn" onClick={onExit} aria-label="Salir">
          ✕
        </button>
        <div className="bar" style={{ flex: 1, height: 12 }}>
          <motion.div
            animate={{ width: `${(timeLeft / totalTime) * 100}%` }}
            transition={{ duration: 0.1, ease: 'linear' }}
            style={{ ['--c' as string]: timeLeft < 10 ? 'var(--bad)' : 'var(--lexico)' }}
          />
        </div>
        <motion.span key={score} initial={{ scale: 1.4 }} animate={{ scale: 1 }} style={{ fontWeight: 900, fontSize: 22, minWidth: 54, textAlign: 'right' }}>
          {score}
        </motion.span>
      </div>

      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="chip" style={{ color: 'var(--lexico)' }}>
          📚 {LEVEL_NAMES[level]}
        </span>
        <AnimatePresence mode="popLayout">
          <motion.span
            key={mult}
            initial={{ scale: 2.2, rotate: -15, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 14 }}
            className="chip"
            style={{
              background: mult > 1 ? 'var(--gold)' : undefined,
              color: mult > 1 ? '#3a2a00' : undefined,
              fontSize: 16,
            }}
          >
            ×{mult} {combo > 0 && <span style={{ opacity: 0.7 }}>· {combo}🔗</span>}
          </motion.span>
        </AnimatePresence>
      </div>

      {/* Frase plana: el fragmento se sustituye por la palabra elegida */}
      <motion.div
        key={round.id}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          padding: '18px 16px',
          borderRadius: 22,
          background: 'var(--card)',
          border: '1px solid var(--line)',
          fontSize: 22,
          fontWeight: 800,
          textAlign: 'center',
          lineHeight: 1.35,
        }}
      >
        {before}
        <AnimatePresence mode="wait">
          <motion.span
            key={chosen ?? target}
            initial={{ opacity: 0, y: 12, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12 }}
            style={{
              display: 'inline-block',
              padding: '0 8px',
              borderRadius: 10,
              background: chosen ? 'rgba(61,220,132,.2)' : 'rgba(197,139,255,.2)',
              color: chosen ? 'var(--good)' : 'var(--lexico)',
              textDecoration: chosen ? 'none' : 'underline wavy',
              textUnderlineOffset: 6,
            }}
          >
            {chosen ?? target}
          </motion.span>
        </AnimatePresence>
        {after}
        {stats.total === 0 && (
          <div className="muted" style={{ fontSize: 13, fontWeight: 800, marginTop: 8 }}>
            Desliza → si la tarjeta mejora la frase · ← si no encaja
          </div>
        )}
      </motion.div>

      {/* Mazo */}
      <div style={{ flex: 1, minHeight: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'relative', width: 'min(100%, 300px)', height: 'min(100%, 340px)' }}>
        {deck[1] && (
          <div
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 28,
              background: 'rgba(255,255,255,.12)',
              transform: 'translateY(14px) scale(.94)',
            }}
          />
        )}
        <AnimatePresence>
          {card && <SwipeCard key={card.id} word={card.word} onDecide={decide} forced={forced} feedback={feedback} />}
        </AnimatePresence>
        <AnimatePresence>
          {toast && (
            <motion.div
              key={toast.key}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'absolute',
                left: -4,
                right: -4,
                bottom: -6,
                zIndex: 10,
                padding: '10px 14px',
                borderRadius: 16,
                fontWeight: 800,
                textAlign: 'center',
                background: toast.good ? 'var(--gold)' : 'var(--bad)',
                color: toast.good ? '#3a2a00' : '#fff',
                pointerEvents: 'none',
              }}
            >
              {toast.text}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      </div>

      {/* Controles en la zona del pulgar */}
      <div className="row" style={{ gap: 12 }}>
        <button className="btn" style={{ flex: 1, ['--c' as string]: 'var(--bad)', fontSize: 26 }} onClick={() => tap('left')} aria-label="Descartar">
          ✕
        </button>
        {hasComodin && (
          <button className="btn ghost" disabled={skipUsed} style={{ opacity: skipUsed ? 0.35 : 1 }} onClick={skip} aria-label="Comodín: saltar tarjeta">
            🃏
          </button>
        )}
        <button className="btn" style={{ flex: 1, ['--c' as string]: 'var(--good)', fontSize: 26 }} onClick={() => tap('right')} aria-label="Elegir">
          ✓
        </button>
      </div>
    </div>
  );
}
