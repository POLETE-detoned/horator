// Misiones diarias: tres al día, elegidas de forma determinista a partir de la fecha.

export type MissionKind =
  | 'play_any'
  | 'stars3'
  | 'combo'
  | 'arcade_clean'
  | 'expert_words'
  | 'roleplay_win'
  | 'syn_correct'
  | 'syn_games'
  | 'arcade_any';

export interface MissionDef {
  kind: MissionKind;
  target: number;
  label: string;
  icon: string;
}

export const MISSION_POOL: MissionDef[] = [
  { kind: 'play_any', target: 3, label: 'Juega 3 partidas', icon: '🎮' },
  { kind: 'stars3', target: 1, label: 'Consigue ⭐⭐⭐ en una nota de voz', icon: '⭐' },
  { kind: 'combo', target: 6, label: 'Haz un combo de 6', icon: '🔗' },
  { kind: 'arcade_clean', target: 1, label: 'Termina un Arcade con 2 muletillas o menos', icon: '🎙️' },
  { kind: 'expert_words', target: 5, label: 'Usa 5 palabras de nivel experto', icon: '🧠' },
  { kind: 'roleplay_win', target: 1, label: 'Convence a un personaje', icon: '🤝' },
  { kind: 'syn_correct', target: 20, label: 'Acierta 20 tarjetas', icon: '🃏' },
  { kind: 'syn_games', target: 2, label: 'Juega 2 partidas de Caza-sinónimos', icon: '🔇' },
  { kind: 'arcade_any', target: 1, label: 'Completa un reto Arcade', icon: '📸' },
];

export const MISSION_XP = 30;
export const CHEST_XP = 60;

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function missionsFor(day: string): MissionDef[] {
  const pool = [...MISSION_POOL];
  const out: MissionDef[] = [];
  let h = hash(day);
  while (out.length < 3) {
    const i = h % pool.length;
    out.push(pool.splice(i, 1)[0]);
    h = hash(String(h));
  }
  return out;
}
