import { describe, expect, it } from "vitest";

import {
  initiallyOpenRows,
  problemVerdict,
  verdictPresentation,
} from "./problem-details";

describe("problemVerdict", () => {
  it("is correct for a solved problem", () => {
    expect(problemVerdict({ correct: true })).toBe("correct");
  });

  it("is incorrect for a wrong answer", () => {
    expect(problemVerdict({ correct: false })).toBe("incorrect");
  });

  it("is skipped for a problem passed over", () => {
    expect(problemVerdict({ correct: false, skipped: true })).toBe("skipped");
  });

  it("keeps a solved problem correct even if it is also marked skipped", () => {
    expect(problemVerdict({ correct: true, skipped: true })).toBe("correct");
  });

  it("is time-up for the problem the clock cut off, whatever else is set", () => {
    expect(problemVerdict({ correct: false, timedOut: true })).toBe("timeUp");
    expect(
      problemVerdict({ correct: false, skipped: true, timedOut: true }),
    ).toBe("timeUp");
    expect(problemVerdict({ correct: true, timedOut: true })).toBe("timeUp");
  });
});

describe("initiallyOpenRows", () => {
  it("opens every row that is not correct", () => {
    expect([
      ...initiallyOpenRows(["correct", "incorrect", "skipped", "timeUp"]),
    ]).toEqual([1, 2, 3]);
  });

  it("opens nothing when every answer is right", () => {
    expect(initiallyOpenRows(["correct", "correct"]).size).toBe(0);
  });

  it("opens nothing for an empty list", () => {
    expect(initiallyOpenRows([]).size).toBe(0);
  });
});

describe("verdictPresentation", () => {
  it("shows OK in the success colour for a correct answer", () => {
    expect(verdictPresentation("correct")).toEqual({
      label: { text: "OK" },
      tone: "success",
      clock: false,
    });
  });

  it("shows NG in the destructive colour for a wrong answer", () => {
    expect(verdictPresentation("incorrect")).toEqual({
      label: { text: "NG" },
      tone: "destructive",
      clock: false,
    });
  });

  it("shows a skip muted, without the clock", () => {
    expect(verdictPresentation("skipped")).toEqual({
      label: { key: "practiceResult.skipped" },
      tone: "muted",
      clock: false,
    });
  });

  it("shows time-up muted with the clock, not as a wrong answer", () => {
    expect(verdictPresentation("timeUp")).toEqual({
      label: { key: "practiceResult.timeUp" },
      tone: "muted",
      clock: true,
    });
  });
});
