import { describe, expect, it } from "vitest";

import { computePracticeResult } from "./practice-result";

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
