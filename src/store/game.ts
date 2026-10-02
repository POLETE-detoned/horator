import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { PerkId } from '../data/powers';
import { configureFeedback } from '../lib/feedback';
import {
  applyEvent,
  claimNode,
  dayKey,
  initialProgress,
  rollMissions,
  type GameEvent,
  type Progress,
  type Reward,
} from './progress';

export interface Settings {
  /** Modo silencioso: sin sonido ni voz; las notas de voz se muestran subtituladas. */
  silent: boolean;
  haptics: boolean;
}

interface GameState {
  progress: Progress;
  settings: Settings;
  /** Cola de recompensas para la capa de celebraciones (no se persiste). */
  rewards: (Reward & { key: number })[];
  record: (ev: GameEvent) => Reward;
  claim: (id: PerkId) => void;
  setSettings: (s: Partial<Settings>) => void;
  shiftReward: () => void;
  refreshDay: () => void;
  has: (perk: PerkId) => boolean;
}

let rewardKey = 0;

export const useGame = create<GameState>()(
  persist(
    (set, get) => ({
      progress: initialProgress(),
      settings: { silent: false, haptics: true },
      rewards: [],
      record: (ev) => {
        const { p, reward } = applyEvent(get().progress, ev, dayKey());
        set((s) => ({ progress: p, rewards: [...s.rewards, { ...reward, key: ++rewardKey }] }));
        return reward;
      },
      claim: (id) => set((s) => ({ progress: claimNode(s.progress, id) })),
      setSettings: (patch) =>
        set((s) => {
          const settings = { ...s.settings, ...patch };
          configureFeedback({ sound: !settings.silent, haptics: settings.haptics });
          return { settings };
        }),
      shiftReward: () => set((s) => ({ rewards: s.rewards.slice(1) })),
      refreshDay: () => set((s) => ({ progress: rollMissions(s.progress, dayKey()) })),
      has: (perk) => get().progress.perks.includes(perk),
    }),
    {
      name: 'horator',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ progress: s.progress, settings: s.settings }),
      merge: (persisted, current) => {
        const p = persisted as Partial<GameState> | undefined;
        return {
          ...current,
          progress: { ...current.progress, ...p?.progress },
          settings: { ...current.settings, ...p?.settings },
        };
      },
      onRehydrateStorage: () => (state) => {
        if (state) configureFeedback({ sound: !state.settings.silent, haptics: state.settings.haptics });
      },
    },
  ),
);

export const usePerk = (perk: PerkId) => useGame((s) => s.progress.perks.includes(perk));
