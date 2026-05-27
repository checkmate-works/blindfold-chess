import { describe, expect, it } from "vitest";

import {
  calculatePracticeExp,
  getPracticeAccuracyMultiplier,
} from "./calc-practice";
import { getModuleWeight } from "./constants";

describe("getPracticeAccuracyMultiplier", () => {
  it.each([
    [0, 1.5],
    [1, 1.2],
    [2, 1.2],
    [3, 1.2],
    [4, 1.1],
    [5, 1.1],
    [6, 1.0],
    [99, 1.0],
  ])("mistakes=%i -> multiplier=%s", (mistakes, expected) => {
    expect(getPracticeAccuracyMultiplier(mistakes)).toBe(expected);
  });
});

describe("calculatePracticeExp", () => {
  // ----------------------------------------------------------
  // Boundary: mistake tiers
  // ----------------------------------------------------------
  describe("精度ボーナスの境界値", () => {
    it("mistakes=0 (perfect) → ×1.5", () => {
      const result = calculatePracticeExp({
        correctCount: 10,
        mistakes: 0,
        weight: 5,
      });
      // base = 10 * 5 = 50, total = floor(50 * 1.5) = 75
      expect(result.baseExp).toBe(50);
      expect(result.accuracyMultiplier).toBe(1.5);
      expect(result.totalExp).toBe(75);
    });

    it("mistakes=3 (境界上限) → ×1.2", () => {
      const result = calculatePracticeExp({
        correctCount: 10,
        mistakes: 3,
        weight: 5,
      });
      // base = 50, total = floor(50 * 1.2) = 60
      expect(result.accuracyMultiplier).toBe(1.2);
      expect(result.totalExp).toBe(60);
    });

    it("mistakes=4 (×1.1 tier 開始)", () => {
      const result = calculatePracticeExp({
        correctCount: 10,
        mistakes: 4,
        weight: 5,
      });
      // base = 50, total = floor(50 * 1.1) = 55
      expect(result.accuracyMultiplier).toBe(1.1);
      expect(result.totalExp).toBe(55);
    });

    it("mistakes=5 (×1.1 tier 上限)", () => {
      const result = calculatePracticeExp({
        correctCount: 10,
        mistakes: 5,
        weight: 5,
      });
      expect(result.accuracyMultiplier).toBe(1.1);
      expect(result.totalExp).toBe(55);
    });

    it("mistakes=6 (ボーナスなし)", () => {
      const result = calculatePracticeExp({
        correctCount: 10,
        mistakes: 6,
        weight: 5,
      });
      // base = 50, total = floor(50 * 1.0) = 50
      expect(result.accuracyMultiplier).toBe(1.0);
      expect(result.totalExp).toBe(50);
    });
  });

  // ----------------------------------------------------------
  // Correct count boundaries
  // ----------------------------------------------------------
  describe("correctCount の境界", () => {
    it("correctCount=0 は付与なし (totalExp=0)", () => {
      const result = calculatePracticeExp({
        correctCount: 0,
        mistakes: 0,
        weight: 5,
      });
      expect(result.baseExp).toBe(0);
      expect(result.totalExp).toBe(0);
    });

    it("correctCount=0 ＋ミス多数でも totalExp=0", () => {
      const result = calculatePracticeExp({
        correctCount: 0,
        mistakes: 10,
        weight: 5,
      });
      expect(result.totalExp).toBe(0);
    });

    it("correctCount=1, mistakes=6 → 最低保証 1", () => {
      // base = 1 * 5 = 5, floor(5 * 1.0) = 5. Still >= MIN so test MIN via small weight.
      const result = calculatePracticeExp({
        correctCount: 1,
        mistakes: 0,
        weight: 0.1,
      });
      // base = 0.1, total = floor(0.1 * 1.5) = 0 -> clamped to 1
      expect(result.totalExp).toBe(1);
    });
  });

  // ----------------------------------------------------------
  // Specific spec examples
  // ----------------------------------------------------------
  describe("仕様書の具体例", () => {
    it("correctCount=10, mistakes=0, weight=5 → 75 EXP", () => {
      const result = calculatePracticeExp({
        correctCount: 10,
        mistakes: 0,
        weight: 5,
      });
      expect(result.totalExp).toBe(75);
    });

    it("correctCount=10, mistakes=3, weight=5 → 60 EXP", () => {
      const result = calculatePracticeExp({
        correctCount: 10,
        mistakes: 3,
        weight: 5,
      });
      expect(result.totalExp).toBe(60);
    });
  });

  // ----------------------------------------------------------
  // Integration with getModuleWeight
  // ----------------------------------------------------------
  describe("getModuleWeight との連携", () => {
    it("position_memory の重み=5 が取得できる", () => {
      expect(getModuleWeight("position_memory")).toBe(5);
    });

    it("未知 menuType はデフォルト重み 1", () => {
      expect(getModuleWeight("unknown_module")).toBe(1);
    });

    it("既存モジュールの重みは変更されない (回帰ガード)", () => {
      expect(getModuleWeight("coordinate_quiz")).toBe(1);
      expect(getModuleWeight("square_colors")).toBe(1);
      expect(getModuleWeight("legal_moves")).toBe(1.5);
      expect(getModuleWeight("board_symmetry")).toBe(2.5);
      expect(getModuleWeight("diagonal_quiz")).toBe(15);
      expect(getModuleWeight("route_planner")).toBe(15);
      expect(getModuleWeight("puzzle")).toBe(12);
    });
  });
});
