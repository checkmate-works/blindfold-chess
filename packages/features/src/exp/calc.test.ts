import { describe, expect, it } from "vitest";

import { calculateExp } from "./calc";

describe("calculateExp", () => {
  // ----------------------------------------------------------
  // 基本的なExp計算（score * weight）
  // ----------------------------------------------------------
  describe("基本計算", () => {
    it("score * weight でbaseExpを計算する", () => {
      const result = calculateExp({
        score: 5,
        totalQuestions: 10,
        menuType: "coordinate_quiz",
        dailyChallengeCount: 0,
      });
      // baseExp = 5 * 10 = 50, accuracy = 0.5 -> multiplier 1.0, streak 1 -> 1.0
      expect(result.baseExp).toBe(50);
      expect(result.totalExp).toBe(50);
    });

    it("route_planner の重み20が適用される", () => {
      const result = calculateExp({
        score: 3,
        totalQuestions: 10,
        menuType: "route_planner",
        dailyChallengeCount: 0,
      });
      // baseExp = 3 * 20 = 60
      expect(result.baseExp).toBe(60);
      expect(result.totalExp).toBe(60);
    });
  });

  // ----------------------------------------------------------
  // 精度ボーナス
  // ----------------------------------------------------------
  describe("精度ボーナス", () => {
    it("パーフェクト（100%）で1.5倍", () => {
      const result = calculateExp({
        score: 10,
        totalQuestions: 10,
        menuType: "coordinate_quiz",
        dailyChallengeCount: 0,
      });
      // baseExp = 100, accuracy 1.0 -> 1.5
      expect(result.accuracyMultiplier).toBe(1.5);
      expect(result.totalExp).toBe(150);
    });

    it("90%以上で1.2倍", () => {
      const result = calculateExp({
        score: 9,
        totalQuestions: 10,
        menuType: "coordinate_quiz",
        dailyChallengeCount: 0,
      });
      // baseExp = 90, accuracy 0.9 -> 1.2
      expect(result.accuracyMultiplier).toBe(1.2);
      expect(result.totalExp).toBe(108);
    });

    it("80%以上で1.1倍", () => {
      const result = calculateExp({
        score: 8,
        totalQuestions: 10,
        menuType: "coordinate_quiz",
        dailyChallengeCount: 0,
      });
      // baseExp = 80, accuracy 0.8 -> 1.1
      expect(result.accuracyMultiplier).toBe(1.1);
      expect(result.totalExp).toBe(88);
    });

    it("80%未満はボーナスなし（1.0倍）", () => {
      const result = calculateExp({
        score: 7,
        totalQuestions: 10,
        menuType: "coordinate_quiz",
        dailyChallengeCount: 0,
      });
      expect(result.accuracyMultiplier).toBe(1.0);
      expect(result.totalExp).toBe(70);
    });
  });

  // ----------------------------------------------------------
  // ストリークボーナス
  // ----------------------------------------------------------
  describe("ストリークボーナス", () => {
    it("streak 5以上（dailyChallengeCount=4）で1.3倍", () => {
      const result = calculateExp({
        score: 5,
        totalQuestions: 10,
        menuType: "coordinate_quiz",
        dailyChallengeCount: 4,
      });
      // baseExp = 50, streak = 5 -> 1.3
      expect(result.streakMultiplier).toBe(1.3);
      expect(result.totalExp).toBe(65);
    });

    it("streak 3（dailyChallengeCount=2）で1.2倍", () => {
      const result = calculateExp({
        score: 5,
        totalQuestions: 10,
        menuType: "coordinate_quiz",
        dailyChallengeCount: 2,
      });
      // streak = 3 -> 1.2
      expect(result.streakMultiplier).toBe(1.2);
      expect(result.totalExp).toBe(60);
    });

    it("streak 2（dailyChallengeCount=1）で1.1倍", () => {
      const result = calculateExp({
        score: 5,
        totalQuestions: 10,
        menuType: "coordinate_quiz",
        dailyChallengeCount: 1,
      });
      // streak = 2 -> 1.1
      expect(result.streakMultiplier).toBe(1.1);
      expect(result.totalExp).toBe(55);
    });

    it("streak 1（dailyChallengeCount=0）はボーナスなし", () => {
      const result = calculateExp({
        score: 5,
        totalQuestions: 10,
        menuType: "coordinate_quiz",
        dailyChallengeCount: 0,
      });
      expect(result.streakMultiplier).toBe(1.0);
      expect(result.totalExp).toBe(50);
    });
  });

  // ----------------------------------------------------------
  // ボーナスの組み合わせ
  // ----------------------------------------------------------
  describe("ボーナスの組み合わせ", () => {
    it("パーフェクト + 高ストリークで両方のボーナスが適用される", () => {
      const result = calculateExp({
        score: 10,
        totalQuestions: 10,
        menuType: "legal_moves",
        dailyChallengeCount: 5,
      });
      // baseExp = 10 * 15 = 150, accuracy 1.0 -> 1.5, streak 6 -> 1.3
      // total = floor(150 * 1.5 * 1.3) = floor(292.5) = 292
      expect(result.baseExp).toBe(150);
      expect(result.accuracyMultiplier).toBe(1.5);
      expect(result.streakMultiplier).toBe(1.3);
      expect(result.totalExp).toBe(292);
    });
  });

  // ----------------------------------------------------------
  // 最低保証
  // ----------------------------------------------------------
  describe("最低保証", () => {
    it("score 0 でも最低保証 1 Exp", () => {
      const result = calculateExp({
        score: 0,
        totalQuestions: 10,
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
    it("デフォルト重み10が適用される", () => {
      const result = calculateExp({
        score: 5,
        totalQuestions: 10,
        menuType: "unknown_module",
        dailyChallengeCount: 0,
      });
      // baseExp = 5 * 10 (default) = 50
      expect(result.baseExp).toBe(50);
      expect(result.totalExp).toBe(50);
    });
  });
});
