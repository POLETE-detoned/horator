// Lógica pura del metajuego (XP, niveles, racha, misiones, poderes).
// Sin React ni almacenamiento: así se prueba fácil y el store solo la envuelve.

import { CHEST_XP, MISSION_XP, missionsFor, type MissionKind } from '../data/missions';
import { NODES, TIER_XP, type Branch, type PerkId } from '../data/powers';
import { MAX_LEVEL } from '../data/synonyms';

export interface Progress {
  xp: number;
  branchXp: Record<Branch, number>;
  perks: PerkId[];
  streak: number;
  bestStreak: number;
  lastPlayed: string | null;
  freezes: number;
  missionsDay: string | null;
  missionProgress: number[];
  chestClaimed: boolean;
  synLevelUnlocked: number;
  bests: { synScore: number; synCombo: number; arcadeWords: number; roleplayWins: number };
}

export const initialProgress = (): Progress => ({
  xp: 0,
  branchXp: { persuasion: 0, claridad: 0, lexico: 0 },
  perks: [],
  streak: 0,
  bestStreak: 0,
  lastPlayed: null,
  freezes: 0,
  missionsDay: null,
  missionProgress: [0, 0, 0],
  chestClaimed: false,
  synLevelUnlocked: 1,
  bests: { synScore: 0, synCombo: 0, arcadeWords: 0, roleplayWins: 0 },
});

// ---------- Fechas ----------
export const dayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const daysBetween = (a: string, b: string) => {
  const [ya, ma, da] = a.split('-').map(Number);
  const [yb, mb, db] = b.split('-').map(Number);
  return Math.round((Date.UTC(yb, mb - 1, db) - Date.UTC(ya, ma - 1, da)) / 86400000);
};

// ---------- Niveles ----------
/** XP acumulada necesaria para alcanzar el nivel n (n ≥ 1). */
export const xpForLevel = (n: number) => 50 * (n - 1) * n;
export const levelOf = (xp: number) => {
  let n = 1;
  while (xp >= xpForLevel(n + 1)) n++;
  return n;
};
export const levelProgress = (xp: number) => {
  const n = levelOf(xp);
  const a = xpForLevel(n);
  const b = xpForLevel(n + 1);
  return { level: n, into: xp - a, needed: b - a, ratio: (xp - a) / (b - a) };
};

export const branchTier = (bxp: number) => TIER_XP.filter((t, i) => i > 0 && bxp >= t).length;

/** Nodos que ya pueden reclamarse (la rama tiene XP suficiente) y aún no se han reclamado. */
export const readyNodes = (p: Progress) =>
  NODES.filter((n) => !p.perks.includes(n.id) && branchTier(p.branchXp[n.branch]) >= n.tier);

// ---------- Eventos de juego ----------
export type GameEvent =
  | { type: 'roleplay_reply'; stars: number; expert: number }
  | { type: 'roleplay_end'; win: boolean }
  | { type: 'arcade_end'; fillers: number; expert: number; words: number; paceIdealRatio: number; silences: number }
  | { type: 'syn_end'; score: number; correct: number; bestCombo: number; level: number; accuracy: number };

export interface Reward {
  xp: number;
  levelUp: number | null;
  missions: string[];
  chest: boolean;
  newNodes: PerkId[];
  synLevelUp: number | null;
  streakUp: number | null;
}

/** Garantiza que las misiones corresponden al día actual. */
export function rollMissions(p: Progress, today: string): Progress {
  if (p.missionsDay === today) return p;
  return { ...p, missionsDay: today, missionProgress: [0, 0, 0], chestClaimed: false };
}

/** Marca la partida de hoy en la racha. */
export function touchStreak(p: Progress, today: string): { p: Progress; streakUp: number | null } {
  if (p.lastPlayed === today) return { p, streakUp: null };
  let streak = 1;
  let freezes = p.freezes;
  if (p.lastPlayed) {
    const gap = daysBetween(p.lastPlayed, today);
    if (gap === 1) streak = p.streak + 1;
    else if (gap > 1 && gap - 1 <= freezes) {
      // Los protectores de racha cubren los días perdidos.
      freezes -= gap - 1;
      streak = p.streak + 1;
    }
  }
  // Cada 7 días de racha se gana un protector (máx. 2).
  if (streak % 7 === 0) freezes = Math.min(2, freezes + 1);
  return {
    p: { ...p, streak, freezes, lastPlayed: today, bestStreak: Math.max(p.bestStreak, streak) },
    streakUp: streak,
  };
}

/** Racha visible: si ayer no se jugó (y no hay protectores), se muestra rota. */
export function visibleStreak(p: Progress, today: string) {
  if (!p.lastPlayed) return 0;
  const gap = daysBetween(p.lastPlayed, today);
  if (gap <= 1) return p.streak;
  return gap - 1 <= p.freezes ? p.streak : 0;
}

function missionIncrements(ev: GameEvent): Partial<Record<MissionKind, number | ((cur: number) => number)>> {
  switch (ev.type) {
    case 'roleplay_reply':
      return { stars3: ev.stars >= 3 ? 1 : 0, expert_words: ev.expert };
    case 'roleplay_end':
      return { play_any: 1, roleplay_win: ev.win ? 1 : 0 };
    case 'arcade_end':
      return { play_any: 1, arcade_any: 1, arcade_clean: ev.fillers <= 2 && ev.words >= 20 ? 1 : 0, expert_words: ev.expert };
    case 'syn_end':
      return {
        play_any: 1,
        syn_games: 1,
        syn_correct: ev.correct,
        // El combo es un récord dentro de la partida, no se acumula.
        combo: (cur) => Math.max(cur, ev.bestCombo),
      };
  }
}

function xpFor(ev: GameEvent, p: Progress): { total: number; branch: Partial<Record<Branch, number>> } {
  switch (ev.type) {
    case 'roleplay_reply': {
      const pers = ev.stars * 10;
      const lex = ev.expert * 4;
      return { total: pers + lex, branch: { persuasion: pers, lexico: lex } };
    }
    case 'roleplay_end':
      return ev.win ? { total: 40, branch: { persuasion: 40 } } : { total: 10, branch: { persuasion: 10 } };
    case 'arcade_end': {
      if (ev.words < 5) return { total: 5, branch: { claridad: 5 } };
      const clean = Math.max(0, 30 - ev.fillers * 5);
      const pace = Math.round(20 * ev.paceIdealRatio);
      const silence = Math.max(0, 10 - ev.silences * 4);
      let clar = 15 + clean + pace + silence;
      if (p.perks.includes('foco')) clar = Math.round(clar * 1.25);
      const lex = ev.expert * 5;
      return { total: clar + lex, branch: { claridad: clar, lexico: lex } };
    }
    case 'syn_end': {
      const lex = Math.round(ev.score / 5);
      return { total: lex, branch: { lexico: lex } };
    }
  }
}

/** Requisito para desbloquear el siguiente nivel de dificultad léxica. */
export const SYN_UNLOCK = { score: 140, accuracy: 0.75 };

export function applyEvent(prev: Progress, ev: GameEvent, today: string): { p: Progress; reward: Reward } {
  let p = rollMissions(prev, today);
  const reward: Reward = { xp: 0, levelUp: null, missions: [], chest: false, newNodes: [], synLevelUp: null, streakUp: null };

  // Racha: cuenta al terminar una partida (no por una sola respuesta).
  if (ev.type !== 'roleplay_reply') {
    const s = touchStreak(p, today);
    p = s.p;
    reward.streakUp = s.streakUp;
  }

  const readyBefore = new Set(readyNodes(p).map((n) => n.id));
  const levelBefore = levelOf(p.xp);

  // XP base
  const gained = xpFor(ev, p);
  let xp = gained.total;
  const branchXp = { ...p.branchXp };
  for (const [b, v] of Object.entries(gained.branch) as [Branch, number][]) branchXp[b] += v;

  // Misiones
  const defs = missionsFor(today);
  const inc = missionIncrements(ev);
  const missionProgress = defs.map((d, i) => {
    const cur = p.missionProgress[i] ?? 0;
    const step = inc[d.kind];
    const next = Math.min(d.target, typeof step === 'function' ? step(cur) : cur + (step ?? 0));
    if (cur < d.target && next >= d.target) {
      reward.missions.push(d.label);
      xp += MISSION_XP;
    }
    return next;
  });
  let chestClaimed = p.chestClaimed;
  if (!chestClaimed && missionProgress.every((v, i) => v >= defs[i].target)) {
    chestClaimed = true;
    reward.chest = true;
    xp += CHEST_XP;
  }

  // Récords y dificultad léxica
  const bests = { ...p.bests };
  let synLevelUnlocked = p.synLevelUnlocked;
  if (ev.type === 'syn_end') {
    bests.synScore = Math.max(bests.synScore, ev.score);
    bests.synCombo = Math.max(bests.synCombo, ev.bestCombo);
    if (
      ev.level === synLevelUnlocked &&
      synLevelUnlocked < MAX_LEVEL &&
      ev.score >= SYN_UNLOCK.score &&
      ev.accuracy >= SYN_UNLOCK.accuracy
    ) {
      synLevelUnlocked++;
      reward.synLevelUp = synLevelUnlocked;
    }
  }
  if (ev.type === 'arcade_end') bests.arcadeWords = Math.max(bests.arcadeWords, ev.expert);
  if (ev.type === 'roleplay_end' && ev.win) bests.roleplayWins++;

  p = { ...p, xp: p.xp + xp, branchXp, missionProgress, chestClaimed, bests, synLevelUnlocked };
  reward.xp = xp;
  const levelAfter = levelOf(p.xp);
  if (levelAfter > levelBefore) reward.levelUp = levelAfter;
  reward.newNodes = readyNodes(p)
    .map((n) => n.id)
    .filter((id) => !readyBefore.has(id));
  return { p, reward };
}

export function claimNode(p: Progress, id: PerkId): Progress {
  if (!readyNodes(p).some((n) => n.id === id)) return p;
  return { ...p, perks: [...p.perks, id] };
}
