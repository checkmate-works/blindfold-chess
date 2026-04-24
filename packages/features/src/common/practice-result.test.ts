import { describe, expect, it } from "vitest";

import { computePracticeResult, deriveResultStats } from "./practice-result";

describe("computePracticeResult", () => {
  it("computes basic result with correct and incorrect counts", () => {
    const result = computePracticeResult(
      8,
      2,
      45,
      60,
      [1.5, 2.0, 1.0, 2.5, 3.0, 1.5, 2.0, 1.0, 2.5, 3.0],
    );

    expect(result.correctAnswers).toBe(8);
    expect(result.incorrectAnswers).toBe(2);
    expect(result.totalQuestions).toBe(10);
    expect(result.accuracy).toBe(80);
    expect(result.timeTaken).toBe(45);
    expect(result.averageTime).toBe(2);
  });

  it("caps timeTaken at duration when elapsed exceeds duration", () => {
    const result = computePracticeResult(5, 3, 90, 60, [2.0]);

    expect(result.timeTaken).toBe(60);
  });

  it("uses elapsed time when it is less than duration", () => {
    const result = computePracticeResult(5, 3, 30, 60, [2.0]);

    expect(result.timeTaken).toBe(30);
  });

  it("returns 0 accuracy when no questions answered", () => {
    const result = computePracticeResult(0, 0, 10, 60, []);

    expect(result.correctAnswers).toBe(0);
    expect(result.incorrectAnswers).toBe(0);
    expect(result.totalQuestions).toBe(0);
    expect(result.accuracy).toBe(0);
    expect(result.averageTime).toBe(0);
  });

  it("returns 100 accuracy when all answers are correct", () => {
    const result = computePracticeResult(
      5,
      0,
      30,
      60,
      [1.0, 2.0, 1.5, 2.5, 3.0],
    );

    expect(result.accuracy).toBe(100);
    expect(result.totalQuestions).toBe(5);
  });

  it("returns 0 accuracy when all answers are incorrect", () => {
    const result = computePracticeResult(
      0,
      5,
      30,
      60,
      [1.0, 2.0, 1.5, 2.5, 3.0],
    );

    expect(result.accuracy).toBe(0);
    expect(result.totalQuestions).toBe(5);
  });

  it("computes averageTime from questionTimes", () => {
    const result = computePracticeResult(3, 1, 20, 60, [1.0, 3.0, 5.0, 7.0]);

    expect(result.averageTime).toBe(4);
  });

  it("returns 0 averageTime when questionTimes is empty", () => {
    const result = computePracticeResult(3, 1, 20, 60, []);

    expect(result.averageTime).toBe(0);
  });

  it("handles single question time", () => {
    const result = computePracticeResult(1, 0, 5, 60, [3.5]);

    expect(result.averageTime).toBe(3.5);
    expect(result.totalQuestions).toBe(1);
    expect(result.accuracy).toBe(100);
  });

  it("uses timeTaken equal to duration when they are the same", () => {
    const result = computePracticeResult(5, 5, 60, 60, [1.0]);

    expect(result.timeTaken).toBe(60);
  });
});

const BASE_LABELS = {
  correctAnswers: "Correct",
  accuracy: "Accuracy",
  timeTaken: "Time",
  averageTime: "Avg Time",
};

describe("deriveResultStats", () => {
  it("returns scoreValue as correct / total", () => {
    const result = deriveResultStats(
      {
        correctAnswers: 8,
        totalQuestions: 10,
        accuracy: 80,
        timeTaken: 45,
        averageTime: 2,
      },
      BASE_LABELS,
    );

    expect(result.scoreValue).toBe("8 / 10");
  });

  it("returns scoreLabel when provided", () => {
    const result = deriveResultStats(
      {
        correctAnswers: 5,
        totalQuestions: 10,
        accuracy: 50,
        timeTaken: 30,
        averageTime: 3,
      },
      { ...BASE_LABELS, scoreLabel: "Score" },
    );

    expect(result.scoreLabel).toBe("Score");
  });

  it("returns undefined scoreLabel when not provided", () => {
    const result = deriveResultStats(
      {
        correctAnswers: 5,
        totalQuestions: 10,
        accuracy: 50,
        timeTaken: 30,
        averageTime: 3,
      },
      BASE_LABELS,
    );

    expect(result.scoreLabel).toBeUndefined();
  });

  it("formats accuracy to 1 decimal place", () => {
    const result = deriveResultStats(
      {
        correctAnswers: 1,
        totalQuestions: 3,
        accuracy: 33.333333,
        timeTaken: 10,
        averageTime: 3.333,
      },
      BASE_LABELS,
    );

    const accuracyStat = result.stats.find((s) => s.label === "Accuracy");
    expect(accuracyStat?.value).toBe("33.3%");
  });

  it("formats averageTime to 1 decimal place with s suffix", () => {
    const result = deriveResultStats(
      {
        correctAnswers: 3,
        totalQuestions: 3,
        accuracy: 100,
        timeTaken: 15,
        averageTime: 5,
      },
      BASE_LABELS,
    );

    const avgStat = result.stats.find((s) => s.label === "Avg Time");
    expect(avgStat?.value).toBe("5.0s");
  });

  it("marks correctAnswers stat with highlight true", () => {
    const result = deriveResultStats(
      {
        correctAnswers: 7,
        totalQuestions: 10,
        accuracy: 70,
        timeTaken: 40,
        averageTime: 4,
      },
      BASE_LABELS,
    );

    const correctStat = result.stats.find((s) => s.label === "Correct");
    expect(correctStat?.highlight).toBe(true);
  });

  it("returns exactly 4 stat items", () => {
    const result = deriveResultStats(
      {
        correctAnswers: 5,
        totalQuestions: 10,
        accuracy: 50,
        timeTaken: 30,
        averageTime: 3,
      },
      BASE_LABELS,
    );

    expect(result.stats).toHaveLength(4);
  });

  it("uses caller-supplied label strings verbatim", () => {
    const labels = {
      correctAnswers: "正解数",
      accuracy: "正確率",
      timeTaken: "経過時間",
      averageTime: "平均時間",
    };
    const result = deriveResultStats(
      {
        correctAnswers: 5,
        totalQuestions: 10,
        accuracy: 50,
        timeTaken: 30,
        averageTime: 3,
      },
      labels,
    );

    expect(result.stats.map((s) => s.label)).toEqual([
      "正解数",
      "正確率",
      "経過時間",
      "平均時間",
    ]);
  });
});
