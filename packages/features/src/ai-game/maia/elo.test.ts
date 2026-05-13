/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { describe, expect, it } from "vitest";

import type { SkillLevel } from "../types";

import { skillLevelToMaiaElo } from "./elo";

describe("skillLevelToMaiaElo", () => {
  it("anchors level 1 at the bottom of Maia's training distribution (1100)", () => {
    expect(skillLevelToMaiaElo(1 as SkillLevel)).toBe(1100);
  });

  it("anchors level 20 at the top of Maia's training distribution (1900)", () => {
    expect(skillLevelToMaiaElo(20 as SkillLevel)).toBe(1900);
  });

  it("places level 10 near the middle of the range", () => {
    // 1100 + 9/19 * 800 ≈ 1479
    expect(skillLevelToMaiaElo(10 as SkillLevel)).toBe(1479);
  });

  it("is monotonically non-decreasing across all 20 levels", () => {
    let prev = -Infinity;
    for (let level = 1; level <= 20; level++) {
      const elo = skillLevelToMaiaElo(level as SkillLevel);
      expect(elo).toBeGreaterThanOrEqual(prev);
      prev = elo;
    }
  });

  it("clamps below-range input to 1100", () => {
    expect(skillLevelToMaiaElo(0 as SkillLevel)).toBe(1100);
    expect(skillLevelToMaiaElo(-5 as SkillLevel)).toBe(1100);
  });

  it("clamps above-range input to 1900", () => {
    expect(skillLevelToMaiaElo(25 as SkillLevel)).toBe(1900);
    expect(skillLevelToMaiaElo(100 as SkillLevel)).toBe(1900);
  });
});
