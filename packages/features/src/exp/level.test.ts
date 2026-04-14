import { describe, expect, it } from "vitest";

import { getExpForLevel, getLevel, getLevelProgress } from "./level";

// ============================================================
// getExpForLevel
// ============================================================
describe("getExpForLevel", () => {
  it("level 0 は 0", () => {
    expect(getExpForLevel(0)).toBe(0);
  });

  it("level 1 = floor(100 * 1^1.5) = 100", () => {
    expect(getExpForLevel(1)).toBe(100);
  });

  it("level 2 = floor(100 * 2^1.5) = floor(282.84) = 282", () => {
    expect(getExpForLevel(2)).toBe(282);
  });

  it("level 10 = floor(100 * 10^1.5) = floor(3162.27) = 3162", () => {
    expect(getExpForLevel(10)).toBe(3162);
  });

  it("レベルが上がると必要Expも増える", () => {
    for (let i = 1; i <= 20; i++) {
      expect(getExpForLevel(i)).toBeGreaterThan(getExpForLevel(i - 1));
    }
  });
});

// ============================================================
// getLevel
// ============================================================
describe("getLevel", () => {
  it("totalExp 0 はレベル 0", () => {
    expect(getLevel(0)).toBe(0);
  });

  it("totalExp 99 はレベル 0", () => {
    expect(getLevel(99)).toBe(0);
  });

  it("totalExp 100 はレベル 1", () => {
    expect(getLevel(100)).toBe(1);
  });

  it("totalExp 282 はまだレベル 1（level 2 の必要Expぴったり）", () => {
    // getExpForLevel(2) = 282 なのでレベル2に到達
    expect(getLevel(282)).toBe(2);
  });

  it("totalExp 281 はレベル 1", () => {
    expect(getLevel(281)).toBe(1);
  });

  it("totalExp 283 はレベル 2", () => {
    expect(getLevel(283)).toBe(2);
  });

  it("負の値はレベル 0", () => {
    expect(getLevel(-100)).toBe(0);
  });

  it("getExpForLevel の結果を入力するとそのレベルが返る", () => {
    for (let level = 0; level <= 20; level++) {
      const exp = getExpForLevel(level);
      expect(getLevel(exp)).toBe(level);
    }
  });

  it("必要Expの1つ手前はひとつ下のレベル", () => {
    for (let level = 1; level <= 20; level++) {
      const exp = getExpForLevel(level);
      expect(getLevel(exp - 1)).toBe(level - 1);
    }
  });
});

// ============================================================
// getLevelProgress
// ============================================================
describe("getLevelProgress", () => {
  it("totalExp 0 の場合", () => {
    const progress = getLevelProgress(0);
    expect(progress.level).toBe(0);
    expect(progress.currentLevelExp).toBe(0);
    expect(progress.nextLevelExp).toBe(100);
    expect(progress.progress).toBe(0);
  });

  it("レベル1到達直後（totalExp = 100）", () => {
    const progress = getLevelProgress(100);
    expect(progress.level).toBe(1);
    expect(progress.currentLevelExp).toBe(100);
    expect(progress.nextLevelExp).toBe(282);
    expect(progress.progress).toBe(0);
  });

  it("レベル1の中間地点", () => {
    // level 1 = 100, level 2 = 282, 範囲 = 182
    // totalExp 191 -> (191 - 100) / 182 = 91 / 182 = 0.5
    const progress = getLevelProgress(191);
    expect(progress.level).toBe(1);
    expect(progress.progress).toBeCloseTo(0.5, 1);
  });

  it("progressは0.0から1.0の範囲", () => {
    const progress = getLevelProgress(50);
    expect(progress.progress).toBeGreaterThanOrEqual(0);
    expect(progress.progress).toBeLessThanOrEqual(1);
  });
});
