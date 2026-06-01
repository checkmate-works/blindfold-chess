import { describe, expect, it } from 'vitest';

import { engineApproxElo } from './strength';

describe('engineApproxElo', () => {
  it('passes a Maia rating through unchanged (already an Elo)', () => {
    expect(engineApproxElo({ kind: 'maia', rating: 1600 })).toBe(1600);
    expect(engineApproxElo({ kind: 'maia', rating: 600 })).toBe(600);
    expect(engineApproxElo({ kind: 'maia', rating: 2600 })).toBe(2600);
  });

  it('maps a Stockfish skill level via the engine-configured Elo curve', () => {
    // Mirrors getEloForSkillLevel: level<15 → max(800, 700 + level*100).
    expect(engineApproxElo({ kind: 'stockfish', skillLevel: 1 })).toBe(800);
    expect(engineApproxElo({ kind: 'stockfish', skillLevel: 5 })).toBe(1200);
    expect(engineApproxElo({ kind: 'stockfish', skillLevel: 14 })).toBe(2100);
  });

  it('increases monotonically with Stockfish skill level', () => {
    const lo = engineApproxElo({ kind: 'stockfish', skillLevel: 3 });
    const hi = engineApproxElo({ kind: 'stockfish', skillLevel: 10 });
    expect(hi).toBeGreaterThan(lo);
  });
});
