import { describe, expect, it } from "vitest";

import { parsePracticeStatsParams } from "./practice-result-params";

describe("parsePracticeStatsParams", () => {
  it("parses all fields from stringified params", () => {
    expect(
      parsePracticeStatsParams({
        correctAnswers: "12",
        incorrectAnswers: "3",
        totalQuestions: "15",
        accuracy: "80.5",
        timeTaken: "60",
        averageTime: "4.2",
      }),
    ).toEqual({
      correctAnswers: 12,
      incorrectAnswers: 3,
      totalQuestions: 15,
      accuracy: 80.5,
      timeTaken: 60,
      averageTime: 4.2,
    });
  });

  it("defaults every missing field to 0 instead of NaN", () => {
    expect(parsePracticeStatsParams({})).toEqual({
      correctAnswers: 0,
      incorrectAnswers: 0,
      totalQuestions: 0,
      accuracy: 0,
      timeTaken: 0,
      averageTime: 0,
    });
  });
});
