import { AnimatePresence, motion, useSpring, useTransform } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Confetti } from '../../components/Confetti';
import { ARCADE_SECONDS, LONG_SILENCE_S, randomPrompt, type ArcadePrompt } from '../../data/prompts';
import { haptic, sfx } from '../../lib/feedback';
import { expertWords, findFillers, PACE, paceZone } from '../../lib/lexicon';
import { shareCard } from '../../lib/share';
import { SpeechSession, speechSupported } from '../../lib/speech';
import { useGame, usePerk } from '../../store/game';
import { summarize, windowWpm, type ArcadeResult, type Sample } from './metrics';

type Phase = 'intro' | 'live' | 'result';
const MAX_WPM = 220;
const BLANK_AFTER_MS = 1500;

export function ArcadeScreen({ onExit }: { onExit: () => void }) {
  const record = useGame((s) => s.record);
  const hasMetronomo = usePerk('metronomo');
  const hasRadar = usePerk('radar');
  const hasRespiro = usePerk('respiro');

  const [phase, setPhase] = useState<Phase>('intro');
  const [prompt, setPrompt] = useState<ArcadePrompt>(() => randomPrompt());
  const [camState, setCamState] = useState<'pending' | 'on' | 'off'>('pending');
  const [timeLeft, setTimeLeft] = useState(ARCADE_SECONDS);
  const [caption, setCaption] = useState('');
  const [fillerFlash, setFillerFlash] = useState<{ word: string; key: number } | null>(null);
  const [silent, setSilent] = useState(false);
  const [popWords, setPopWords] = useState<{ w: string; key: number }[]>([]);
  const [result, setResult] = useState<ArcadeResult | null>(null);
  const [shareState, setShareState] = useState<string | null>(null);
  const [wpmNow, setWpmNow] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const session = useRef<SpeechSession | null>(null);
  const t0 = useRef(0);
  const text = useRef('');
  const lastChange = useRef(0);
  const samples = useRef<Sample[]>([]);
  const maxFillers = useRef(0);
  const seenExpert = useRef(new Set<string>());
  const blank = useRef(0);
  const silences = useRef(0);
  const inSilence = useRef(false);
  const respiroUsed = useRef(false);
  const paceTicks = useRef({ ideal: 0, total: 0 });
  const finished = useRef(false);

  // Medidor de ritmo con muelle: sube y baja con inercia, no a saltos.
  const wpmSpring = useSpring(0, { stiffness: 60, damping: 15 });
  const meterH = useTransform(wpmSpring, (v) => `${Math.min(100, (v / MAX_WPM) * 100)}%`);

  // Cámara frontal (solo vista previa: nunca se graba ni se sube).
  useEffect(() => {
    let cancelled = false;
    if (!navigator.mediaDevices?.getUserMedia) setCamState('off');
    else
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 1280 } }, audio: false })
        .then((stream) => {
          if (cancelled) return stream.getTracks().forEach((t) => t.stop());
          streamRef.current = stream;
          if (videoRef.current) videoRef.current.srcObject = stream;
          setCamState('on');
        })
        .catch(() => setCamState('off'));
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      session.current?.abort();
    };
  }, []);

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    const sess = session.current;
    session.current = null;
    const elapsed = performance.now() - t0.current;
    void (sess ? sess.stop() : Promise.resolve(text.current)).then((finalText) => {
      const r = summarize(finalText || text.current, elapsed, blank.current, paceTicks.current, silences.current);
      setResult(r);
      setPhase('result');
      if (r.grade === 'S' || r.grade === 'A') sfx.levelUp();
      record({
        type: 'arcade_end',
        fillers: r.fillers,
        expert: r.expert.length,
        words: r.words,
        paceIdealRatio: r.paceIdealRatio,
        silences: r.silences,
      });
    });
  }, [record]);

  const start = () => {
    sfx.start();
    haptic.success();
    finished.current = false;
    text.current = '';
    samples.current = [];
    maxFillers.current = 0;
    seenExpert.current = new Set();
    blank.current = 0;
    silences.current = 0;
    inSilence.current = false;
    respiroUsed.current = false;
    paceTicks.current = { ideal: 0, total: 0 };
    setCaption('');
    setPopWords([]);
    setResult(null);
    setShareState(null);
    setTimeLeft(ARCADE_SECONDS);
    wpmSpring.jump(0);
    t0.current = performance.now();
    lastChange.current = t0.current;
    setPhase('live');

    const sess = new SpeechSession((u) => {
      text.current = u.text;
      lastChange.current = u.lastChange;
      const now = performance.now() - t0.current;
      samples.current.push({ t: now, words: u.text.split(/\s+/).filter(Boolean).length });
      setCaption(u.text.split(/\s+/).slice(-9).join(' '));

      // Muletillas: destello rojo + vibración en cuanto aparecen.
      const fillers = findFillers(u.text);
      if (fillers.length > maxFillers.current) {
        maxFillers.current = fillers.length;
        setFillerFlash({ word: fillers[fillers.length - 1].word, key: Date.now() });
        haptic.filler();
        sfx.filler();
      }
      // Palabras expertas: recompensa instantánea.
      for (const w of expertWords(u.text)) {
        if (!seenExpert.current.has(w)) {
          seenExpert.current.add(w);
          setPopWords((p) => [...p.slice(-2), { w, key: Date.now() + Math.random() }]);
          sfx.good(seenExpert.current.size);
        }
      }
    });
    session.current = sess;
    sess.start();
  };

  // Bucle del HUD: tiempo, ritmo, silencios.
  useEffect(() => {
    if (phase !== 'live') return;
    let lastTick = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      const dt = (now - lastTick) / 1000;
      lastTick = now;
      const elapsed = now - t0.current;
      const left = Math.max(0, ARCADE_SECONDS - elapsed / 1000);
      setTimeLeft(left);

      const wpm = windowWpm(samples.current, elapsed);
      wpmSpring.set(wpm);
      setWpmNow(wpm);

      const quiet = now - lastChange.current;
      if (quiet > BLANK_AFTER_MS && elapsed > 2500) blank.current += dt;
      const isSilent = quiet > LONG_SILENCE_S * 1000 && elapsed > 3000;
      if (isSilent && !inSilence.current) {
        inSilence.current = true;
        // El poder Respiro perdona el primer silencio largo.
        if (hasRespiro && !respiroUsed.current) respiroUsed.current = true;
        else silences.current += 1;
        haptic.error();
      } else if (!isSilent) inSilence.current = false;
      setSilent(isSilent);

      if (elapsed > 5000 && !isSilent) {
        paceTicks.current.total += dt;
        if (paceZone(wpm) === 'ideal') paceTicks.current.ideal += dt;
      }
      if (left <= 0) finish();
    }, 100);
    return () => clearInterval(id);
  }, [phase, finish, wpmSpring, hasRespiro]);

  useEffect(() => {
    if (!fillerFlash) return;
    const t = setTimeout(() => setFillerFlash(null), 900);
    return () => clearTimeout(t);
  }, [fillerFlash]);

  const zone = paceZone(wpmNow);
  const zoneColor = zone === 'ideal' ? 'var(--good)' : zone === 'lento' ? 'var(--claridad)' : 'var(--bad)';
  const share = async () => {
    if (!result) return;
    setShareState('…');
    const r = await shareCard({
      grade: result.grade,
      prompt: prompt.text,
      expert: result.expert,
      fillers: result.fillers,
      blankSeconds: result.blankSeconds,
      wpm: result.wpm,
    });
    setShareState(r === 'downloaded' ? 'Imagen guardada' : r === 'shared' ? '¡Compartido!' : null);
  };

  return (
    <div className="screen" style={{ padding: 0, background: '#000' }}>
      {/* Cámara a pantalla completa (espejo) */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: 'scaleX(-1)',
          opacity: camState === 'on' ? 1 : 0,
          filter: phase === 'result' ? 'blur(14px) brightness(.5)' : 'none',
          transition: 'filter .4s',
        }}
      />
      {camState !== 'on' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at 50% 35%, #1d6b8a 0%, #120d24 65%)',
          }}
        />
      )}
      {/* Viñeta para legibilidad del HUD */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(0,0,0,.55) 0%, transparent 28%, transparent 62%, rgba(0,0,0,.7) 100%)',
        }}
      />

      {/* Destello rojo en los bordes al detectar una muletilla */}
      <AnimatePresence>
        {fillerFlash && (
          <motion.div
            key={fillerFlash.key}
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.9 }}
            style={{ position: 'absolute', inset: 0, pointerEvents: 'none', boxShadow: 'inset 0 0 70px 14px rgba(255,40,70,.65)', zIndex: 4 }}
          />
        )}
      </AnimatePresence>

      {/* Barra superior */}
      <div className="row" style={{ position: 'relative', zIndex: 5, padding: 'calc(var(--safe-t) + 12px) 14px 0' }}>
        <button className="icon-btn" onClick={onExit} aria-label="Salir" style={{ background: 'rgba(0,0,0,.35)' }}>
          ✕
        </button>
        <span className="spacer" />
        {phase === 'live' && (
          <motion.span
            animate={timeLeft < 10 ? { scale: [1, 1.15, 1] } : {}}
            transition={{ repeat: Infinity, duration: 1 }}
            style={{ fontSize: 34, fontWeight: 900, fontVariantNumeric: 'tabular-nums', color: timeLeft < 10 ? 'var(--bad)' : '#fff' }}
          >
            {Math.ceil(timeLeft)}
          </motion.span>
        )}
        <span className="spacer" />
        <span className="chip" style={{ background: 'rgba(0,0,0,.35)', fontSize: 12 }}>
          🔒 No se graba
        </span>
      </div>

      {/* Prompt */}
      {phase !== 'result' && (
        <motion.div
          key={prompt.text}
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: phase === 'live' ? 0.9 : 1 }}
          style={{
            position: 'relative',
            zIndex: 5,
            margin: '14px 16px 0',
            padding: phase === 'live' ? '10px 14px' : '16px 18px',
            borderRadius: 20,
            background: 'rgba(0,0,0,.45)',
            backdropFilter: 'blur(8px)',
            fontWeight: 900,
            fontSize: phase === 'live' ? 16 : 22,
            lineHeight: 1.3,
            textAlign: 'center',
            transformOrigin: 'top center',
          }}
        >
          {prompt.text}
        </motion.div>
      )}

      {/* Medidor de ritmo vertical */}
      {phase === 'live' && (
        <div style={{ position: 'absolute', right: 14, top: '28%', height: '36%', width: 18, zIndex: 5 }}>
          <div style={{ position: 'absolute', inset: 0, borderRadius: 9, background: 'rgba(255,255,255,.18)', overflow: 'hidden' }}>
            {hasMetronomo && (
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: `${(PACE.min / MAX_WPM) * 100}%`,
                  height: `${((PACE.max - PACE.min) / MAX_WPM) * 100}%`,
                  background: 'rgba(61,220,132,.3)',
                  borderTop: '2px solid var(--good)',
                  borderBottom: '2px solid var(--good)',
                }}
              />
            )}
            <motion.div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: meterH, background: zoneColor, borderRadius: 9 }} />
          </div>
          <div
            style={{ position: 'absolute', right: 24, bottom: -4, fontSize: 12, fontWeight: 900, whiteSpace: 'nowrap', color: zoneColor }}
          >
            {Math.round(wpmNow)} ppm · {zone === 'ideal' ? '👌' : zone === 'lento' ? '🐢' : '🐇'}
          </div>
        </div>
      )}

      {/* Palabras expertas detectadas */}
      <div style={{ position: 'absolute', left: 14, top: '30%', zIndex: 5, display: 'grid', gap: 6 }}>
        <AnimatePresence>
          {phase === 'live' &&
            popWords.map((p) => (
              <motion.span
                key={p.key}
                initial={{ x: -60, opacity: 0, scale: 0.6 }}
                animate={{ x: 0, opacity: 1, scale: 1 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ type: 'spring', stiffness: 500, damping: 18 }}
                className="chip"
                style={{ background: 'var(--gold)', color: '#3a2a00' }}
              >
                🧠 {p.w}
              </motion.span>
            ))}
        </AnimatePresence>
      </div>

      <span className="spacer" />

      {/* Zona inferior */}
      <div style={{ position: 'relative', zIndex: 5, padding: '0 16px calc(var(--safe-b) + 18px)' }}>
        {phase === 'intro' && (
          <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} style={{ display: 'grid', gap: 12, justifyItems: 'center' }}>
            {!speechSupported() && (
              <div className="chip" style={{ background: 'rgba(255,77,109,.3)', textAlign: 'center' }}>
                Tu navegador no transcribe voz: abre Horator en Chrome o Safari para ver tus métricas.
              </div>
            )}
            <motion.button
              onClick={start}
              whileTap={{ scale: 0.9 }}
              animate={{ boxShadow: ['0 0 0 0 rgba(69,214,255,.7)', '0 0 0 22px rgba(69,214,255,0)'] }}
              transition={{ repeat: Infinity, duration: 1.4 }}
              aria-label="Empezar reto"
              style={{
                width: 96,
                height: 96,
                borderRadius: 48,
                background: 'var(--claridad)',
                border: '6px solid #fff',
                fontWeight: 900,
                fontSize: 20,
                color: '#04283a',
              }}
            >
              60 s
            </motion.button>
            <button
              className="chip"
              style={{ background: 'rgba(0,0,0,.4)' }}
              onClick={() => {
                haptic.tap();
                setPrompt((p) => randomPrompt(Math.random, p.text));
              }}
            >
              🎲 Otro reto
            </button>
          </motion.div>
        )}

        {phase === 'live' && (
          <div style={{ display: 'grid', gap: 10, justifyItems: 'center' }}>
            <AnimatePresence>
              {silent && (
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: [1, 1.08, 1], opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ scale: { repeat: Infinity, duration: 0.8 } }}
                  className="chip"
                  style={{ background: 'var(--gold)', color: '#3a2a00', fontSize: 16 }}
                >
                  🤫 Silencio largo… ¡sigue!
                </motion.div>
              )}
            </AnimatePresence>
            <AnimatePresence>
              {fillerFlash && hasRadar && (
                <motion.div
                  key={fillerFlash.key}
                  initial={{ scale: 1.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="chip"
                  style={{ background: 'var(--bad)', fontSize: 16 }}
                >
                  📡 «{fillerFlash.word}»
                </motion.div>
              )}
            </AnimatePresence>
            {/* Subtítulos en vivo, estilo Reels */}
            <div style={{ minHeight: 56, fontSize: 20, fontWeight: 900, textAlign: 'center', textShadow: '0 2px 8px rgba(0,0,0,.8)' }}>
              {caption || <span style={{ opacity: 0.6 }}>Habla ya…</span>}
            </div>
            <div className="row" style={{ width: '100%', gap: 10 }}>
              <span className="chip" style={{ background: 'rgba(0,0,0,.4)' }}>
                🙊 {maxFillers.current}
              </span>
              <div className="bar" style={{ flex: 1, height: 8 }}>
                <motion.div
                  animate={{ width: `${(timeLeft / ARCADE_SECONDS) * 100}%` }}
                  transition={{ duration: 0.1, ease: 'linear' }}
                  style={{ ['--c' as string]: 'var(--claridad)' }}
                />
              </div>
              <button className="chip" style={{ background: 'rgba(0,0,0,.4)' }} onClick={finish}>
                ■ Terminar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Resultado: tarjeta compartible */}
      <AnimatePresence>
        {phase === 'result' && result && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 10,
              display: 'flex',
              flexDirection: 'column',
              padding: 'calc(var(--safe-t) + 64px) 18px calc(var(--safe-b) + 18px)',
            }}
          >
            {(result.grade === 'S' || result.grade === 'A') && <Confetti />}
            <button
              className="icon-btn"
              onClick={onExit}
              aria-label="Salir"
              style={{ position: 'absolute', top: 'calc(var(--safe-t) + 12px)', left: 14, background: 'rgba(0,0,0,.35)' }}
            >
              ✕
            </button>
            <div
              style={{
                borderRadius: 28,
                padding: 20,
                background: 'linear-gradient(160deg, #2a1d5c, #120d24)',
                border: '1px solid var(--line)',
                boxShadow: '0 20px 50px rgba(0,0,0,.5)',
              }}
            >
              <div style={{ color: 'var(--claridad)', fontWeight: 900, fontSize: 13, letterSpacing: 1 }}>ARCADE 60 s</div>
              <div style={{ fontWeight: 800, fontSize: 15, margin: '6px 0 4px', opacity: 0.9 }}>«{prompt.text}»</div>
              <motion.div
                initial={{ scale: 3, rotate: -20, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={{ delay: 0.25, type: 'spring', stiffness: 300, damping: 12 }}
                style={{ fontSize: 110, fontWeight: 900, color: 'var(--gold)', textAlign: 'center', lineHeight: 1.05 }}
              >
                {result.grade}
              </motion.div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  ['🧠', 'Expertas', String(result.expert.length)],
                  ['🙊', 'Muletillas', String(result.fillers)],
                  ['⏸️', 'En blanco', `${Math.round(result.blankSeconds)} s`],
                  ['🎚️', 'Ritmo', `${Math.round(result.wpm)} ppm`],
                ].map(([icon, label, v], i) => (
                  <motion.div
                    key={label}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + i * 0.1 }}
                    style={{ padding: 12, borderRadius: 16, background: 'rgba(255,255,255,.07)' }}
                  >
                    <div className="muted" style={{ fontSize: 12, fontWeight: 800 }}>
                      {icon} {label}
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 900 }}>{v}</div>
                  </motion.div>
                ))}
              </div>
              {result.expert.length > 0 && (
                <div className="row" style={{ flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                  {result.expert.slice(0, 6).map((w) => (
                    <span key={w} className="chip" style={{ fontSize: 12, color: 'var(--lexico)' }}>
                      {w}
                    </span>
                  ))}
                </div>
              )}
              {result.words < 10 && (
                <div className="muted" style={{ marginTop: 10, fontSize: 14 }}>
                  Casi no te he oído. Habla cerca del móvil y sin miedo 💪
                </div>
              )}
            </div>
            <span className="spacer" />
            <div className="row" style={{ gap: 10 }}>
              <button className="btn ghost" style={{ flex: 1 }} onClick={share}>
                {shareState ?? '↗ Compartir'}
              </button>
              <button
                className="btn"
                style={{ flex: 1.3, ['--c' as string]: 'var(--claridad)', color: '#04283a' }}
                onClick={() => {
                  setPrompt((p) => randomPrompt(Math.random, p.text));
                  setPhase('intro');
                }}
              >
                ↻ Otro reto
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
