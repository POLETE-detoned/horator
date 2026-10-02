// Árbol de habilidades: tres Poderes que crecen jugando. Cada nodo es una ventaja real en el juego.

export type Branch = 'persuasion' | 'claridad' | 'lexico';

export type PerkId =
  | 'marta'
  | 'chuleta'
  | 'ramiro'
  | 'carisma'
  | 'metronomo'
  | 'radar'
  | 'respiro'
  | 'foco'
  | 'comodin'
  | 'escudo'
  | 'reloj'
  | 'multix5';

export interface PowerNode {
  id: PerkId;
  branch: Branch;
  tier: 1 | 2 | 3 | 4;
  name: string;
  icon: string;
  desc: string;
}

export const BRANCHES: Record<Branch, { name: string; icon: string; color: string; fedBy: string }> = {
  persuasion: { name: 'Persuasión', icon: '🔥', color: '#ff6b5a', fedBy: 'Notas de voz' },
  claridad: { name: 'Claridad', icon: '💎', color: '#45d6ff', fedBy: 'Arcade 60 s' },
  lexico: { name: 'Léxico', icon: '⚡', color: '#c58bff', fedBy: 'Caza-sinónimos' },
};

/** XP de rama necesaria para cada nivel del árbol. */
export const TIER_XP = [0, 60, 200, 450, 900] as const;

export const NODES: PowerNode[] = [
  { id: 'marta', branch: 'persuasion', tier: 1, name: 'Entrevista', icon: '👩🏽‍💼', desc: 'Desbloquea a Marta, la entrevistadora.' },
  { id: 'chuleta', branch: 'persuasion', tier: 2, name: 'Chuleta', icon: '📝', desc: 'Ves 3 palabras poderosas mientras grabas.' },
  { id: 'ramiro', branch: 'persuasion', tier: 3, name: 'Cliente difícil', icon: '👴🏻', desc: 'Desbloquea a Don Ramiro, el cliente gruñón.' },
  { id: 'carisma', branch: 'persuasion', tier: 4, name: 'Carisma', icon: '✨', desc: 'El medidor de convencimiento empieza +15.' },
  { id: 'metronomo', branch: 'claridad', tier: 1, name: 'Metrónomo', icon: '🎚️', desc: 'El medidor de ritmo marca tu zona ideal.' },
  { id: 'radar', branch: 'claridad', tier: 2, name: 'Radar', icon: '📡', desc: 'Ves en pantalla qué muletilla acabas de decir.' },
  { id: 'respiro', branch: 'claridad', tier: 3, name: 'Respiro', icon: '🫁', desc: 'Tu primer silencio largo no cuenta.' },
  { id: 'foco', branch: 'claridad', tier: 4, name: 'Foco', icon: '🎯', desc: '+25 % de XP en el Arcade.' },
  { id: 'comodin', branch: 'lexico', tier: 1, name: 'Comodín', icon: '🃏', desc: 'Salta una tarjeta por partida sin romper el combo.' },
  { id: 'escudo', branch: 'lexico', tier: 2, name: 'Escudo', icon: '🛡️', desc: 'Tu primer fallo no rompe el combo.' },
  { id: 'reloj', branch: 'lexico', tier: 3, name: 'Reloj de arena', icon: '⏳', desc: '+10 s en Caza-sinónimos.' },
  { id: 'multix5', branch: 'lexico', tier: 4, name: 'Multiplicador ×5', icon: '💥', desc: 'El combo puede llegar a ×5.' },
];

export const nodesOf = (b: Branch) => NODES.filter((n) => n.branch === b);
