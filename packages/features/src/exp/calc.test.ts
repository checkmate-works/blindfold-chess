import { describe, expect, it } from "vitest";

import { calculateExp } from "./calc";

describe("calculateExp", () => {
  // ----------------------------------------------------------
  // 基本的なExp計算（score * weight）
  // ----------------------------------------------------------
  describe("基本計算", () => {
    it("score * weight でbaseExpを計算する（coordinate_quiz: weight=1）", () => {
      const result = calculateExp({
        score: 5,
        incorrectAnswers: 3,
        menuType: "coordinate_quiz",
        dailyChallengeCount: 0,
      });
      // baseExp = 5 * 1 = 5, incorrectAnswers=3 (burst) -> 1.0, streak 1 -> 1.0
      expect(result.baseExp).toBe(5);
      expect(result.totalExp).toBe(5);
    });

    it("route_planner の重み15が適用される", () => {
      const result = calculateExp({
        score: 3,
        incorrectAnswers: 3,
        menuType: "route_planner",
        dailyChallengeCount: 0,
      });
      // baseExp = 3 * 15 = 45
      expect(result.baseExp).toBe(45);
      expect(result.totalExp).toBe(45);
    });

    it("legal_moves の重み1.5が適用される", () => {
      const result = calculateExp({
        score: 10,
        incorrectAnswers: 3,
        menuType: "legal_moves",
        dailyChallengeCount: 0,
      });
      // baseExp = 10 * 1.5 = 15
      expect(result.baseExp).toBe(15);
      expect(result.totalExp).toBe(15);
    });

    it("board_symmetry の重み2.5が適用される", () => {
      const result = calculateExp({
        score: 4,
        incorrectAnswers: 3,
        menuType: "board_symmetry",
        dailyChallengeCount: 0,
      });
      // baseExp = 4 * 2.5 = 10
      expect(result.baseExp).toBe(10);
      expect(result.totalExp).toBe(10);
    });

    it("diagonal_quiz の重み15が適用される", () => {
      const result = calculateExp({
        score: 2,
        incorrectAnswers: 3,
        menuType: "diagonal_quiz",
        dailyChallengeCount: 0,
      });
      // baseExp = 2 * 15 = 30
      expect(result.baseExp).toBe(30);
      expect(result.totalExp).toBe(30);
    });
  });

  // ----------------------------------------------------------
  // 精度ボーナス（ミス数ベース）
  // ----------------------------------------------------------
  describe("精度ボーナス", () => {
    it("ミス0（パーフェクト）で1.5倍", () => {
      const result = calculateExp({
        score: 10,
        incorrectAnswers: 0,
        menuType: "coordinate_quiz",
        dailyChallengeCount: 0,
      });
      // baseExp = 10 * 1 = 10, incorrectAnswers=0 -> 1.5
      expect(result.accuracyMultiplier).toBe(1.5);
      expect(result.totalExp).toBe(15);
    });

    it("ミス1で1.2倍", () => {
      const result = calculateExp({
        score: 10,
        incorrectAnswers: 1,
        menuType: "coordinate_quiz",
        dailyChallengeCount: 0,
      });
      // baseExp = 10 * 1 = 10, incorrectAnswers=1 -> 1.2
      expect(result.accuracyMultiplier).toBe(1.2);
      expect(result.totalExp).toBe(12);
    });

    it("ミス2で1.1倍", () => {
      const result = calculateExp({
        score: 10,
        incorrectAnswers: 2,
        menuType: "coordinate_quiz",
        dailyChallengeCount: 0,
      });
      // baseExp = 10 * 1 = 10, incorrectAnswers=2 -> 1.1
      expect(result.accuracyMultiplier).toBe(1.1);
      expect(result.totalExp).toBe(11);
    });

    it("ミス3（バースト）はボーナスなし（1.0倍）", () => {
      const result = calculateExp({
        score: 10,
        incorrectAnswers: 3,
        menuType: "coordinate_quiz",
        dailyChallengeCount: 0,
      });
      // baseExp = 10 * 1 = 10, incorrectAnswers=3 -> 1.0
      expect(result.accuracyMultiplier).toBe(1.0);
      expect(result.totalExp).toBe(10);
    });
  });

  // ----------------------------------------------------------
  // ストリークボーナス
  // ----------------------------------------------------------
  describe("ストリークボーナス", () => {
    it("streak 5以上（dailyChallengeCount=4）で1.3倍", () => {
      const result = calculateExp({
        score: 5,
        incorrectAnswers: 3,
        menuType: "coordinate_quiz",
        dailyChallengeCount: 4,
      });
      // baseExp = 5 * 1 = 5, streak = 5 -> 1.3
      expect(result.streakMultiplier).toBe(1.3);
      expect(result.totalExp).toBe(6); // floor(5 * 1.0 * 1.3) = 6
    });

    it("streak 3（dailyChallengeCount=2）で1.2倍", () => {
      const result = calculateExp({
        score: 5,
        incorrectAnswers: 3,
        menuType: "coordinate_quiz",
        dailyChallengeCount: 2,
      });
      // baseExp = 5 * 1 = 5, streak = 3 -> 1.2
      expect(result.streakMultiplier).toBe(1.2);
      expect(result.totalExp).toBe(6); // floor(5 * 1.0 * 1.2) = 6
    });

    it("streak 2（dailyChallengeCount=1）で1.1倍", () => {
      const result = calculateExp({
        score: 5,
        incorrectAnswers: 3,
        menuType: "coordinate_quiz",
        dailyChallengeCount: 1,
      });
      // baseExp = 5 * 1 = 5, streak = 2 -> 1.1
      expect(result.streakMultiplier).toBe(1.1);
      expect(result.totalExp).toBe(5); // floor(5 * 1.0 * 1.1) = 5
    });

    it("streak 1（dailyChallengeCount=0）はボーナスなし", () => {
      const result = calculateExp({
        score: 5,
        incorrectAnswers: 3,
        menuType: "coordinate_quiz",
        dailyChallengeCount: 0,
      });
      expect(result.streakMultiplier).toBe(1.0);
      expect(result.totalExp).toBe(5);
    });
  });

  // ----------------------------------------------------------
  // ボーナスの組み合わせ
  // ----------------------------------------------------------
  describe("ボーナスの組み合わせ", () => {
    it("パーフェクト + 高ストリークで両方のボーナスが適用される", () => {
      const result = calculateExp({
        score: 10,
        incorrectAnswers: 0,
        menuType: "legal_moves",
        dailyChallengeCount: 5,
      });
      // baseExp = 10 * 1.5 = 15, incorrectAnswers=0 -> 1.5, streak 6 -> 1.3
      // total = floor(15 * 1.5 * 1.3) = floor(29.25) = 29
      expect(result.baseExp).toBe(15);
      expect(result.accuracyMultiplier).toBe(1.5);
      expect(result.streakMultiplier).toBe(1.3);
      expect(result.totalExp).toBe(29);
    });

    it("ミス1 + route_planner で精度ボーナスとweight両方が反映される", () => {
      const result = calculateExp({
        score: 8,
        incorrectAnswers: 1,
        menuType: "route_planner",
        dailyChallengeCount: 0,
      });
      // baseExp = 8 * 15 = 120, incorrectAnswers=1 -> 1.2, streak 1 -> 1.0
      // total = floor(120 * 1.2 * 1.0) = 144
      expect(result.baseExp).toBe(120);
      expect(result.accuracyMultiplier).toBe(1.2);
      expect(result.totalExp).toBe(144);
    });
  });

  // ----------------------------------------------------------
  // 最低保証
  // ----------------------------------------------------------
  describe("最低保証", () => {
    it("score 0 でも最低保証 1 Exp", () => {
      const result = calculateExp({
        score: 0,
        incorrectAnswers: 0,
        menuType: "coordinate_quiz",
        dailyChallengeCount: 0,
      });
      expect(result.baseExp).toBe(0);
      expect(result.totalExp).toBe(1);
    });

    it("score 0 + バースト（ミス3）でも最低保証 1 Exp", () => {
      const result = calculateExp({
        score: 0,
        incorrectAnswers: 3,
        menuType: "coordinate_quiz",
        dailyChallengeCount: 0,
      });
      expect(result.baseExp).toBe(0);
      expect(result.totalExp).toBe(1);
    });
  });

  // ----------------------------------------------------------
  // 未知のmenuType
  // ----------------------------------------------------------
  describe("未知のmenuType", () => {
    it("デフォルト重み1が適用される", () => {
      const result = calculateExp({
        score: 5,
        incorrectAnswers: 3,
        menuType: "unknown_module",
        dailyChallengeCount: 0,
      });
      // baseExp = 5 * 1 (default) = 5
      expect(result.baseExp).toBe(5);
      expect(result.totalExp).toBe(5);
    });
  });

  // ----------------------------------------------------------
  // 小数weightのエッジケース
  // ----------------------------------------------------------
  describe("小数weightでの計算", () => {
    it("legal_moves (weight=1.5) でbaseExpが小数になる場合、totalExpはfloorされる", () => {
      const result = calculateExp({
        score: 3,
        incorrectAnswers: 1,
        menuType: "legal_moves",
        dailyChallengeCount: 0,
      });
      // baseExp = 3 * 1.5 = 4.5, incorrectAnswers=1 -> 1.2
      // total = floor(4.5 * 1.2) = floor(5.4) = 5
      expect(result.baseExp).toBe(4.5);
      expect(result.totalExp).toBe(5);
    });

    it("board_symmetry (weight=2.5) でbaseExpが小数になる場合、totalExpはfloorされる", () => {
      const result = calculateExp({
        score: 3,
        incorrectAnswers: 2,
        menuType: "board_symmetry",
        dailyChallengeCount: 0,
      });
      // baseExp = 3 * 2.5 = 7.5, incorrectAnswers=2 -> 1.1
      // total = floor(7.5 * 1.1) = floor(8.25) = 8
      expect(result.baseExp).toBe(7.5);
      expect(result.totalExp).toBe(8);
    });
  });

  // ----------------------------------------------------------
  // 各モジュールのweight確認
  // ----------------------------------------------------------
  describe("各モジュールのweight", () => {
    it.each([
      ["coordinate_quiz", 1],
      ["square_colors", 1],
      ["diagonal_quiz", 15],
      ["legal_moves", 1.5],
      ["board_symmetry", 2.5],
      ["route_planner", 15],
    ])("%s のweight=%s が正しく適用される", (menuType, expectedWeight) => {
      const score = 10;
      const result = calculateExp({
        score,
        incorrectAnswers: 3, // burst -> multiplier 1.0
        menuType,
        dailyChallengeCount: 0,
      });
      expect(result.baseExp).toBe(score * expectedWeight);
    });
  });
});
