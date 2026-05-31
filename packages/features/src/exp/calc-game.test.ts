import { describe, expect, it } from "vitest";

import {
  applyDailyCap,
  calculateGameExp,
  difficultyBase,
  GAME_EXP_BASE_FLOOR,
  GAME_EXP_BASE_MAX,
  GAME_EXP_DAILY_CAP,
  purityMultiplier,
} from "./calc-game";

describe("difficultyBase", () => {
  it("Stockfish Lv20 / Maia 2600 reach the max base", () => {
    expect(difficultyBase({ kind: "stockfish", skillLevel: 20 })).toBe(
      GAME_EXP_BASE_MAX,
    );
    expect(difficultyBase({ kind: "maia", rating: 2600 })).toBe(
      GAME_EXP_BASE_MAX,
    );
  });

  it("Maia 600 (weakest) sits at the floor", () => {
    expect(difficultyBase({ kind: "maia", rating: 600 })).toBe(
      GAME_EXP_BASE_FLOOR,
    );
  });

  it("scales monotonically with Stockfish skill", () => {
    // factor = skill/20 → base = 5 + round(115 * factor)
    expect(difficultyBase({ kind: "stockfish", skillLevel: 1 })).toBe(11); // 5 + round(5.75)
    expect(difficultyBase({ kind: "stockfish", skillLevel: 10 })).toBe(63); // 5 + round(57.5)
  });

  it("scales monotonically with Maia rating", () => {
    // factor = (rating-600)/2000 → base = 5 + round(115 * factor)
    expect(difficultyBase({ kind: "maia", rating: 1600 })).toBe(63); // factor 0.5
  });

  it("clamps out-of-range engine values instead of throwing", () => {
    expect(difficultyBase({ kind: "stockfish", skillLevel: 999 })).toBe(
      GAME_EXP_BASE_MAX,
    );
    expect(difficultyBase({ kind: "maia", rating: 100 })).toBe(
      GAME_EXP_BASE_FLOOR,
    );
  });
});

describe("purityMultiplier", () => {
  it.each([
    [0, 10, 1.5], // fully clean → perfect bonus
    [1, 10, 1.2], // 10% aided (boundary)
    [2, 10, 1.0], // 20% aided
    [3, 10, 0.8], // 30% aided
    [6, 10, 0.6], // 60% aided → floor
  ])("aided=%i / moves=%i → ×%s", (aided, moves, expected) => {
    expect(purityMultiplier(aided, moves)).toBe(expected);
  });

  it("returns 0 when there are no player moves", () => {
    expect(purityMultiplier(0, 0)).toBe(0);
  });
});

describe("calculateGameExp", () => {
  it("clean win vs the strongest engine earns the full reward", () => {
    const result = calculateGameExp({
      result: "win",
      engine: { kind: "maia", rating: 2600 },
      playerMoveCount: 30,
      aidedMoveCount: 0,
    });
    // base 120 × win 1.0 × clean 1.5 = 180
    expect(result.difficultyBase).toBe(120);
    expect(result.resultMultiplier).toBe(1.0);
    expect(result.purityMultiplier).toBe(1.5);
    expect(result.totalExp).toBe(180);
  });

  it("a loss still earns a small completion reward", () => {
    const result = calculateGameExp({
      result: "loss",
      engine: { kind: "stockfish", skillLevel: 10 },
      playerMoveCount: 20,
      aidedMoveCount: 0,
    });
    // base 63 × loss 0.2 × clean 1.5 = floor(18.9) = 18
    expect(result.totalExp).toBe(18);
  });

  it("aid usage decays the reward", () => {
    const clean = calculateGameExp({
      result: "win",
      engine: { kind: "stockfish", skillLevel: 10 },
      playerMoveCount: 20,
      aidedMoveCount: 0,
    });
    const aided = calculateGameExp({
      result: "win",
      engine: { kind: "stockfish", skillLevel: 10 },
      playerMoveCount: 20,
      aidedMoveCount: 15, // 75% aided → floor 0.6
    });
    expect(clean.totalExp).toBeGreaterThan(aided.totalExp);
    expect(aided.purityMultiplier).toBe(0.6);
  });

  it("a game with no player moves earns nothing", () => {
    const result = calculateGameExp({
      result: "loss",
      engine: { kind: "maia", rating: 1600 },
      playerMoveCount: 0,
      aidedMoveCount: 0,
    });
    expect(result.totalExp).toBe(0);
  });

  it("clamps tiny grants up to the minimum completion reward", () => {
    const result = calculateGameExp({
      result: "loss",
      engine: { kind: "maia", rating: 600 },
      playerMoveCount: 5,
      aidedMoveCount: 4, // 80% aided → 0.6
    });
    // base 5 × 0.2 × 0.6 = floor(0.6) = 0 → clamped to MIN (1)
    expect(result.totalExp).toBe(1);
  });
});

describe("applyDailyCap", () => {
  it("grants the full amount when under the cap", () => {
    expect(applyDailyCap(180, 0)).toBe(180);
    expect(applyDailyCap(180, 100)).toBe(180);
  });

  it("clamps to the remaining daily budget", () => {
    expect(applyDailyCap(180, GAME_EXP_DAILY_CAP - 50)).toBe(50);
  });

  it("grants nothing once the cap is reached", () => {
    expect(applyDailyCap(180, GAME_EXP_DAILY_CAP)).toBe(0);
    expect(applyDailyCap(180, GAME_EXP_DAILY_CAP + 100)).toBe(0);
  });

  it("accepts a custom cap", () => {
    expect(applyDailyCap(180, 90, 100)).toBe(10);
  });
});
