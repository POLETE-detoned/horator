import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Confetti } from '../../components/Confetti';
import { OpenInBrowser } from '../../components/OpenInBrowser';
import { Stars } from '../../components/Stars';
import { CHARACTERS, MAX_TURNS, closingLine, getCharacter, type Character, type CharacterId, type Scenario } from '../../data/characters';
import { drawFromBag } from '../../lib/bag';
import { haptic, sfx } from '../../lib/feedback';
import { analyze, starsFor, type LexicalReport, type Stars as StarCount } from '../../lib/lexicon';
import { aiTurn, offlineTurn, type HistoryItem, type Mood } from '../../lib/roleplayApi';
import { SpeechSession, speechSupported } from '../../lib/speech';
import { estimateDuration, speak, type Playback } from '../../lib/tts';
import { useGame } from '../../store/game';
import { HoldToRecord } from './HoldToRecord';
import { VoiceNote } from './VoiceNote';

type Phase = 'npc' | 'awaiting' | 'recording' | 'thinking' | 'ended';

interface Msg {
  id: number;
  from: 'npc' | 'user';
  text: string;
  durationMs: number;
  report?: LexicalReport;
  stars?: StarCount;
  reactionMs?: number;
}

const MOOD_EMOJI: Record<Mood, string> = { enfadado: '😠', escéptico: '🤨', neutral: '😐', interesado: '🤔', convencido: '😍' };
const LAST_KEY = 'horator.roleplay';
const WIN_AT_END = 75;

function unlockedIds(perks: string[]): CharacterId[] {
  return CHARACTERS.filter((c) => c.id === 'lucia' || perks.includes(c.id)).map((c) => c.id);
}

/** Siguiente conversación: situación al azar del último personaje, sin repetir hasta haberlas jugado todas. */
let nonce = 0;

function readLast(): { id?: CharacterId; s?: string } {
  try {
    return JSON.parse(localStorage.getItem(LAST_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function saveLast(id: CharacterId, scenarioId: string) {
  try {
    localStorage.setItem(LAST_KEY, JSON.stringify({ id, s: scenarioId }));
  } catch {
    /* sin almacenamiento */
  }
}

function nextConversation(perks: string[], prefer?: CharacterId): { c: Character; s: Scenario; n: number } {
  const ids = unlockedIds(perks);
  const last = readLast();
  const id = prefer ?? (last.id && ids.includes(last.id) ? last.id : ids[ids.length - 1]);
  const c = getCharacter(id);
  const s = drawFromBag(`rp-${id}`, c.scenarios, { exclude: last.s ? [last.s] : [] });
  saveLast(id, s.id);
  return { c, s, n: ++nonce };
}

export function RoleplayScreen({ onExit }: { onExit: () => void }) {
  const perks = useGame((s) => s.progress.perks);
  const silent = useGame((s) => s.settings.silent);
  const record = useGame((s) => s.record);
  const freeAi = useGame((s) => s.settings.ai.freeAi);
  const setSettings = useGame((s) => s.setSettings);
  const aiSettings = useGame((s) => s.settings.ai);
  const hasChuleta = perks.includes('chuleta');

  const [{ c, s, n }, setConv] = useState(() => nextConversation(perks));
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [phase, setPhase] = useState<Phase>('npc');
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [meter, setMeter] = useState(30);
  const [mood, setMood] = useState<Mood>('escéptico');
  const [live, setLive] = useState('');
  const [hint, setHint] = useState<string | null>(null);
  const [picker, setPicker] = useState(false);
  const [won, setWon] = useState<boolean | null>(null);
  const [typing, setTyping] = useState(!speechSupported());
  const [draft, setDraft] = useState('');

  const npcEndAt = useRef(0);
  const recStartAt = useRef(0);
  const session = useRef<SpeechSession | null>(null);
  const playback = useRef<Playback | null>(null);
  const idSeq = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const meterRef = useRef(30);
  const turnRef = useRef(0);
  const convKey = useRef(0);

  const playNpc = useCallback(
    async (m: Msg) => {
      playback.current?.stop();
      setPlayingId(m.id);
      const p = speak(m.text, c.voice, silent);
      playback.current = p;
      await p.done;
      setPlayingId((cur) => (cur === m.id ? null : cur));
    },
    [c.voice, silent],
  );

  const npcSays = useCallback(
    async (text: string) => {
      const m: Msg = { id: ++idSeq.current, from: 'npc', text, durationMs: estimateDuration(text, c.voice.rate) };
      setMsgs((x) => [...x, m]);
      sfx.send();
      await playNpc(m);
    },
    [c.voice.rate, playNpc],
  );

  // Arranque de conversación (y reinicio al cambiar de personaje/escenario).
  useEffect(() => {
    const key = ++convKey.current;
    const start = 30 + (perks.includes('carisma') ? 15 : 0);
    meterRef.current = start;
    turnRef.current = 0;
    setMeter(start);
    setMood(c.id === 'ramiro' ? 'enfadado' : 'escéptico');
    setMsgs([]);
    setWon(null);
    setPhase('npc');
    const t = setTimeout(async () => {
      await npcSays(s.opener);
      if (convKey.current !== key) return;
      npcEndAt.current = performance.now();
      setPhase('awaiting');
    }, 350);
    return () => {
      clearTimeout(t);
      playback.current?.stop();
      session.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [msgs, live, phase]);

  const startRec = () => {
    if (phase !== 'awaiting') return;
    playback.current?.stop();
    recStartAt.current = performance.now();
    setLive('');
    setPhase('recording');
    const sess = new SpeechSession(
      (u) => setLive(u.text),
      () => {
        // Sin permiso de micrófono o sin reconocimiento: pasamos a responder escribiendo.
        setTyping(true);
        setPhase('awaiting');
        setHint('No puedo usar el micrófono: responde escribiendo ✍️');
      },
    );
    session.current = sess;
    sess.start();
  };

  const cancelRec = () => {
    session.current?.abort();
    session.current = null;
    setLive('');
    setPhase('awaiting');
    haptic.tap();
  };

  const submit = async (text: string, reactionMs: number, speakingMs: number) => {
    const key = convKey.current;
    if (!text.trim()) {
      setHint('No te he oído 🙉 Mantén pulsado mientras hablas');
      setPhase('awaiting');
      return;
    }
    const report = analyze(text);
    const stars = starsFor(report.score, reactionMs, report.words);
    const userMsg: Msg = { id: ++idSeq.current, from: 'user', text, durationMs: speakingMs, report, stars, reactionMs };
    setMsgs((x) => [...x, userMsg]);
    sfx.send();
    haptic.success();
    record({ type: 'roleplay_reply', stars, expert: report.expert.length });
    setPhase('thinking');

    turnRef.current += 1;
    const turn = turnRef.current;
    const history: HistoryItem[] = [...msgs, userMsg].map((m) => ({ from: m.from, text: m.text }));
    // El personaje "graba" un mínimo para que la espera se sienta como parte de la ficción.
    const local = offlineTurn(c, s, stars, meterRef.current, turn);
    const input = { characterId: c.id, scenarioId: s.id, meter: meterRef.current, history };
    const [ai] = await Promise.all([aiTurn(input, useGame.getState().settings.ai, local), new Promise((r) => setTimeout(r, 900))]);
    if (convKey.current !== key) return;
    const res = ai ?? local;

    const nextMeter = Math.max(0, Math.min(100, meterRef.current + res.delta));
    meterRef.current = nextMeter;
    setMeter(nextMeter);
    setMood(res.mood);
    if (res.delta > 0) sfx.good(Math.round(res.delta / 5));
    else sfx.bad();

    const win = nextMeter >= 100 || (turn >= MAX_TURNS && nextMeter >= WIN_AT_END);
    const over = win || turn >= MAX_TURNS;
    // Sin IA, el cierre usa las frases de victoria/derrota del escenario.
    const reply = over && res.offline ? closingLine(c, s, win) : res.reply;
    await npcSays(reply);
    if (convKey.current !== key) return;
    if (over) {
      setWon(win);
      setPhase('ended');
      record({ type: 'roleplay_end', win });
    } else {
      npcEndAt.current = performance.now();
      setPhase('awaiting');
    }
  };

  const release = async () => {
    const sess = session.current;
    session.current = null;
    if (!sess) return;
    const speakingMs = performance.now() - recStartAt.current;
    setPhase('thinking');
    const text = await sess.stop();
    setLive('');
    void submit(text, recStartAt.current - npcEndAt.current, speakingMs);
  };

  const sendTyped = () => {
    if (phase !== 'awaiting' || !draft.trim()) return;
    const text = draft;
    setDraft('');
    // Escribir es más lento que hablar: se escala el tiempo de reacción.
    const reaction = (performance.now() - npcEndAt.current) / 4;
    void submit(text, reaction, estimateDuration(text));
  };

  useEffect(() => {
    if (!hint) return;
    const t = setTimeout(() => setHint(null), 2600);
    return () => clearTimeout(t);
  }, [hint]);

  const switchTo = (id: CharacterId) => {
    setPicker(false);
    setConv(nextConversation(perks, id));
  };

  const status =
    phase === 'thinking' ? 'grabando audio…' : phase === 'recording' ? 'escuchando…' : phase === 'npc' ? 'hablando…' : 'en línea';
  const turnsLeft = MAX_TURNS - turnRef.current;
  const meterColor = meter >= 75 ? 'var(--good)' : meter >= 40 ? 'var(--gold)' : 'var(--bad)';

  return (
    <div className="screen" style={{ padding: 0, background: 'linear-gradient(180deg, #160f2e, #0f0a20)' }}>
      {/* Cabecera estilo chat */}
      <header
        style={{
          padding: 'calc(var(--safe-t) + 10px) 12px 10px',
          background: 'var(--bg-2)',
          borderBottom: '1px solid var(--line)',
        }}
      >
        <div className="row">
          <button className="icon-btn" onClick={onExit} aria-label="Salir">
            ←
          </button>
          <button className="row" style={{ flex: 1, textAlign: 'left', gap: 10 }} onClick={() => setPicker(true)}>
            <span
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                display: 'grid',
                placeItems: 'center',
                fontSize: 26,
                background: `color-mix(in srgb, ${c.color} 30%, transparent)`,
                border: `2px solid ${c.color}`,
              }}
            >
              {c.avatar}
            </span>
            <span style={{ lineHeight: 1.15 }}>
              <div style={{ fontWeight: 900 }}>
                {c.name}{' '}
                <motion.span key={mood} initial={{ scale: 2 }} animate={{ scale: 1 }} style={{ display: 'inline-block' }}>
                  {MOOD_EMOJI[mood]}
                </motion.span>
              </div>
              <div style={{ fontSize: 13, color: phase === 'thinking' || phase === 'recording' ? 'var(--good)' : 'var(--muted)' }}>
                {status}
              </div>
            </span>
          </button>
          <span className="chip" style={{ fontSize: 12 }}>
            ⇄ Cambiar
          </span>
        </div>
        {/* Medidor de convencimiento: la barra ES el marcador de la partida */}
        <div className="row" style={{ marginTop: 10, gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 900 }} className="muted">
            🎯 {s.goal}
          </span>
        </div>
        <div className="row" style={{ marginTop: 6, gap: 8 }}>
          <div className="bar" style={{ flex: 1, height: 12 }}>
            <motion.div
              initial={false}
              animate={{ width: `${meter}%` }}
              transition={{ type: 'spring', stiffness: 120, damping: 14 }}
              style={{ ['--c' as string]: meterColor }}
            />
          </div>
          <span style={{ fontWeight: 900, fontSize: 13, minWidth: 64, textAlign: 'right' }}>
            {phase === 'ended' ? 'Fin' : `${Math.max(0, turnsLeft)} turnos`}
          </span>
        </div>
      </header>

      {/* Consentimiento de la IA gratuita: se pregunta una sola vez */}
      {freeAi === 'unset' && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ margin: '8px 12px 0', padding: 12, borderRadius: 16, background: 'var(--card-2)', fontSize: 14 }}
        >
          <div style={{ fontWeight: 900 }}>✨ ¿Activar IA gratuita?</div>
          <div className="muted" style={{ fontSize: 13, margin: '2px 0 8px' }}>
            Los personajes reaccionarán a lo que dices. Tus respuestas transcritas se envían a un servicio público externo (sin audio ni vídeo).
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button className="chip" style={{ background: 'var(--good)', color: '#04210f' }} onClick={() => setSettings({ ai: { ...aiSettings, freeAi: 'on' } })}>
              Activar
            </button>
            <button className="chip" onClick={() => setSettings({ ai: { ...aiSettings, freeAi: 'off' } })}>
              Ahora no
            </button>
          </div>
        </motion.div>
      )}

      {/* Conversación */}
      <div ref={scrollRef} className="scroll" style={{ margin: 0, padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className="chip" style={{ alignSelf: 'center', fontSize: 12 }}>
          {s.title}
        </div>
        <AnimatePresence initial={false}>
          {msgs.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 16, scale: 0.9, x: m.from === 'user' ? 20 : -20 }}
              animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              style={{
                alignSelf: m.from === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '86%',
                padding: '10px 12px',
                borderRadius: 18,
                borderTopLeftRadius: m.from === 'npc' ? 4 : 18,
                borderTopRightRadius: m.from === 'user' ? 4 : 18,
                background: m.from === 'user' ? '#3b2a7a' : 'var(--card)',
              }}
            >
              <VoiceNote
                text={m.text}
                color={m.from === 'user' ? 'var(--accent)' : c.color}
                playing={playingId === m.id}
                durationMs={m.durationMs}
                onPlay={m.from === 'npc' ? () => void playNpc(m) : undefined}
              />
              {/* Transcripción: siempre visible en modo silencioso */}
              {(m.from === 'user' || silent || playingId !== m.id) && (
                <div style={{ marginTop: 6, fontSize: 15, lineHeight: 1.35, opacity: 0.92 }}>
                  {m.from === 'user' ? <i>«{m.text}»</i> : m.text}
                </div>
              )}
              {m.from === 'user' && m.stars !== undefined && m.report && (
                <div style={{ marginTop: 8 }}>
                  <Stars value={m.stars} size={24} />
                  <div className="row" style={{ flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                    <span className="chip" style={{ fontSize: 12 }}>
                      ⚡ {((m.reactionMs ?? 0) / 1000).toFixed(1)} s
                    </span>
                    {m.report.expert.slice(0, 3).map((w) => (
                      <span key={w} className="chip" style={{ fontSize: 12, color: 'var(--lexico)' }}>
                        🧠 {w}
                      </span>
                    ))}
                    {m.report.fillers.length > 0 && (
                      <span className="chip" style={{ fontSize: 12, color: 'var(--bad)' }}>
                        🙊 {m.report.fillers.length} muletilla{m.report.fillers.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        {phase === 'thinking' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="row"
            style={{ alignSelf: 'flex-start', padding: '10px 14px', borderRadius: 18, background: 'var(--card)', gap: 4 }}
          >
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                animate={{ y: [0, -5, 0] }}
                transition={{ repeat: Infinity, duration: 0.7, delay: i * 0.12 }}
                style={{ width: 8, height: 8, borderRadius: 4, background: c.color, display: 'block' }}
              />
            ))}
            <span className="muted" style={{ marginLeft: 6, fontSize: 13 }}>
              🎙️ grabando
            </span>
          </motion.div>
        )}
        {phase === 'recording' && live && (
          <div style={{ alignSelf: 'flex-end', maxWidth: '86%', opacity: 0.6, fontStyle: 'italic' }}>{live}</div>
        )}
      </div>

      {/* Zona inferior: grabar */}
      <div style={{ padding: '6px 16px calc(var(--safe-b) + 12px)', position: 'relative' }}>
        <AnimatePresence>
          {hint && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="chip"
              style={{ position: 'absolute', top: -40, left: 16, right: 16, justifyContent: 'center', background: 'var(--card-2)' }}
            >
              {hint}
            </motion.div>
          )}
        </AnimatePresence>

        {phase === 'ended' ? (
          <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} style={{ textAlign: 'center' }}>
            {won && <Confetti originY="70%" />}
            <div style={{ fontSize: 24, fontWeight: 900, margin: '4px 0 12px' }}>
              {won ? `¡Has convencido a ${c.name}! 🏆` : `${c.name} no está convencido… 💔`}
            </div>
            <div className="row" style={{ gap: 10 }}>
              <button className="btn ghost" style={{ flex: 1 }} onClick={() => setPicker(true)}>
                ⇄ Personaje
              </button>
              <button className="btn" style={{ flex: 1.4, ['--c' as string]: 'var(--persuasion)' }} onClick={() => switchTo(c.id)}>
                ↻ Otra
              </button>
            </div>
          </motion.div>
        ) : typing ? (
          <div className="row" style={{ gap: 8 }}>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendTyped()}
              placeholder={phase === 'awaiting' ? 'Responde rápido…' : 'Espera tu turno…'}
              disabled={phase !== 'awaiting'}
              enterKeyHint="send"
              style={{
                flex: 1,
                height: 52,
                borderRadius: 26,
                border: '1px solid var(--line)',
                background: 'var(--card)',
                color: 'var(--text)',
                padding: '0 18px',
                font: 'inherit',
                fontSize: 16,
                userSelect: 'text',
              }}
            />
            <button className="btn" style={{ ['--c' as string]: 'var(--persuasion)', minHeight: 52, padding: '0 18px' }} onClick={sendTyped}>
              ➤
            </button>
            {!speechSupported() && <OpenInBrowser label="Voz" />}
            {speechSupported() && (
              <button className="icon-btn" onClick={() => setTyping(false)} aria-label="Responder con voz">
                🎙️
              </button>
            )}
          </div>
        ) : (
          <>
            {hasChuleta && phase === 'recording' && (
              <div className="row" style={{ justifyContent: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                {s.powerWords.slice(0, 3).map((w) => (
                  <span key={w} className="chip" style={{ fontSize: 12, color: 'var(--gold)' }}>
                    📝 {w}
                  </span>
                ))}
              </div>
            )}
            <HoldToRecord
              disabled={phase !== 'awaiting' && phase !== 'recording'}
              recording={phase === 'recording'}
              onStart={startRec}
              onRelease={() => void release()}
              onCancel={cancelRec}
              color="var(--persuasion)"
            />
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="muted" style={{ fontSize: 13 }}>
                {phase === 'awaiting' ? 'Mantén pulsado y responde ya ⏱️' : ' '}
              </span>
              <button className="muted" style={{ fontSize: 13, fontWeight: 800 }} onClick={() => setTyping(true)}>
                ⌨️ Escribir
              </button>
            </div>
          </>
        )}
      </div>

      {/* Selector de personaje */}
      <AnimatePresence>
        {picker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPicker(false)}
            style={{ position: 'absolute', inset: 0, background: 'rgba(5,3,15,.6)', zIndex: 20 }}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 36 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                maxHeight: '80%',
                overflowY: 'auto',
                background: 'var(--bg-2)',
                borderRadius: '28px 28px 0 0',
                padding: '16px 16px calc(var(--safe-b) + 16px)',
              }}
            >
              <div style={{ width: 40, height: 5, borderRadius: 3, background: 'var(--line)', margin: '0 auto 14px' }} />
              <h2 className="h2" style={{ marginBottom: 12 }}>
                ¿Con quién hablas?
              </h2>
              {CHARACTERS.map((ch) => {
                const locked = !unlockedIds(perks).includes(ch.id);
                return (
                  <div key={ch.id} style={{ marginBottom: 14, opacity: locked ? 0.5 : 1 }}>
                    <div className="row" style={{ marginBottom: 8 }}>
                      <span style={{ fontSize: 28 }}>{locked ? '🔒' : ch.avatar}</span>
                      <div>
                        <div style={{ fontWeight: 900 }}>{ch.name}</div>
                        <div className="muted" style={{ fontSize: 13 }}>
                          {locked ? 'Desbloquéalo en Poderes · Persuasión' : `${ch.role} · Nivel ${ch.level}`}
                        </div>
                      </div>
                    </div>
                    {!locked && (
                      <button
                        className="chip"
                        onClick={() => switchTo(ch.id)}
                        style={{ background: ch.id === c.id ? ch.color : undefined }}
                      >
                        🎲 Nueva situación · {ch.scenarios.length} distintas
                      </button>
                    )}
                  </div>
                );
              })}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
