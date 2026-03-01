import { describe, expect, it } from "vitest";

import { getEloForSkillLevel, isLimitedStrength } from "./constants";
import type { SkillLevel } from "./types";

describe("getEloForSkillLevel", () => {
  it("should return 800 for level 1 (clamped by Math.max)", () => {
    expect(getEloForSkillLevel(1)).toBe(800);
  });

  it("should return correct ELO for each skill level", () => {
    const expectedElos: Record<number, number> = {
      1: 800,
      2: 900,
      3: 1000,
      4: 1100,
      5: 1200,
      6: 1300,
      7: 1400,
      8: 1500,
      9: 1600,
      10: 1700,
      11: 1800,
      12: 1900,
      13: 2000,
      14: 2100,
      15: 3500,
      16: 3600,
      17: 3700,
      18: 3800,
      19: 3900,
      20: 4000,
    };

    for (let level = 1; level <= 20; level++) {
      expect(getEloForSkillLevel(level as SkillLevel)).toBe(
        expectedElos[level],
      );
    }
  });

  it("should always return at least 800", () => {
    // Level 1: 700 + 100 = 800, Math.max(800, 800) = 800
    expect(getEloForSkillLevel(1)).toBeGreaterThanOrEqual(800);
  });

  it("should increase monotonically with level", () => {
    let previousElo = 0;
    for (let level = 1; level <= 20; level++) {
      const elo = getEloForSkillLevel(level as SkillLevel);
      expect(elo).toBeGreaterThan(previousElo);
      previousElo = elo;
    }
  });
});

describe("isLimitedStrength", () => {
  it("should return true for levels 1-14", () => {
    for (let level = 1; level <= 14; level++) {
      expect(isLimitedStrength(level as SkillLevel)).toBe(true);
    }
  });

  it("should return false for levels 15-20", () => {
    for (let level = 15; level <= 20; level++) {
      expect(isLimitedStrength(level as SkillLevel)).toBe(false);
    }
  });

  it("should return true for boundary level 14", () => {
    expect(isLimitedStrength(14 as SkillLevel)).toBe(true);
  });

  it("should return false for boundary level 15", () => {
    expect(isLimitedStrength(15 as SkillLevel)).toBe(false);
  });
});
