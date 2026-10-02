import { describe, expect, it } from 'vitest';
import { missionsFor } from '../src/data/missions';
import {
  applyEvent,
  claimNode,
  initialProgress,
  levelOf,
  readyNodes,
  touchStreak,
  visibleStreak,
  xpForLevel,
} from '../src/store/progress';

describe('niveles', () => {
  it('curva creciente', () => {
    expect(xpForLevel(1)).toBe(0);
    expect(xpForLevel(2)).toBe(100);
    expect(levelOf(99)).toBe(1);
    expect(levelOf(100)).toBe(2);
    expect(levelOf(300)).toBe(3);
  });
});

describe('racha', () => {
  it('sube con días consecutivos y se rompe al saltar uno', () => {
    let p = touchStreak(initialProgress(), '2026-10-01').p;
    p = touchStreak(p, '2026-10-02').p;
    expect(p.streak).toBe(2);
    expect(touchStreak(p, '2026-10-02').streakUp).toBeNull();
    expect(touchStreak(p, '2026-10-04').p.streak).toBe(1);
  });
  it('los protectores cubren días perdidos', () => {
    const p = { ...initialProgress(), streak: 5, lastPlayed: '2026-10-01', freezes: 1 };
    expect(visibleStreak(p, '2026-10-03')).toBe(5);
    const after = touchStreak(p, '2026-10-03').p;
    expect(after.streak).toBe(6);
    expect(after.freezes).toBe(0);
  });
  it('cada 7 días se gana un protector', () => {
    const p = { ...initialProgress(), streak: 6, lastPlayed: '2026-10-01' };
    expect(touchStreak(p, '2026-10-02').p.freezes).toBe(1);
  });
  it('funciona entre meses', () => {
    const p = { ...initialProgress(), streak: 3, lastPlayed: '2026-09-30' };
    expect(touchStreak(p, '2026-10-01').p.streak).toBe(4);
  });
});

describe('eventos', () => {
  const day = '2026-10-02';
  it('una partida da XP, carga el poder y marca la racha', () => {
    const { p, reward } = applyEvent(initialProgress(), { type: 'syn_end', score: 200, correct: 18, bestCombo: 7, level: 1, accuracy: 0.9 }, day);
    expect(reward.xp).toBeGreaterThanOrEqual(40);
    expect(p.branchXp.lexico).toBe(40);
    expect(p.streak).toBe(1);
    expect(reward.synLevelUp).toBe(2);
    expect(p.synLevelUnlocked).toBe(2);
  });
  it('una respuesta suelta no cuenta para la racha', () => {
    const { p } = applyEvent(initialProgress(), { type: 'roleplay_reply', stars: 3, expert: 2 }, day);
    expect(p.lastPlayed).toBeNull();
    expect(p.branchXp.persuasion).toBe(30);
  });
  it('el nodo se puede reclamar al llegar al umbral', () => {
    let p = initialProgress();
    const r = applyEvent(p, { type: 'roleplay_reply', stars: 3, expert: 0 }, day);
    p = applyEvent(r.p, { type: 'roleplay_reply', stars: 3, expert: 0 }, day).p;
    expect(readyNodes(p).map((n) => n.id)).toContain('marta');
    p = claimNode(p, 'marta');
    expect(p.perks).toContain('marta');
    expect(claimNode(p, 'ramiro').perks).not.toContain('ramiro');
  });
  it('las misiones se completan y dan cofre', () => {
    const defs = missionsFor(day);
    expect(defs).toHaveLength(3);
    expect(new Set(defs.map((d) => d.kind)).size).toBe(3);
    let p = initialProgress();
    let chest = false;
    for (let i = 0; i < 6; i++) {
      for (const ev of [
        { type: 'syn_end', score: 300, correct: 25, bestCombo: 12, level: 1, accuracy: 1 },
        { type: 'roleplay_reply', stars: 3, expert: 5 },
        { type: 'roleplay_end', win: true },
        { type: 'arcade_end', fillers: 0, expert: 5, words: 100, paceIdealRatio: 1, silences: 0 },
      ] as const) {
        const r = applyEvent(p, ev, day);
        p = r.p;
        chest ||= r.reward.chest;
      }
    }
    expect(chest).toBe(true);
    expect(p.chestClaimed).toBe(true);
  });
});
