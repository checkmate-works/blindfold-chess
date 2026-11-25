import { describe, expect, it } from "vitest";
import type { DiagonalQuestionResult } from "@blindfold-chess/features/diagonal-quiz";

import {
  parseQuestionResults,
  serializeQuestionResults,
} from "./result-params";

const WRONG: DiagonalQuestionResult = {
  square: "f3",
  isCorrect: false,
  isDiagonalCorrect: false,
  isAntiDiagonalCorrect: true,
  correctDiagonal: "d1-h5",
  correctAntiDiagonal: "a8-h1",
  userDiagonal: "a1-a8",
  userAntiDiagonal: "a8-h1",
};

const TIMED_OUT: DiagonalQuestionResult = {
  square: "c6",
  isCorrect: false,
  isDiagonalCorrect: false,
  isAntiDiagonalCorrect: false,
  correctDiagonal: "a4-e8",
  correctAntiDiagonal: "a8-h1",
  timedOut: true,
};

describe("diagonal quiz result params", () => {
  it("round-trips answered and timed-out questions", () => {
    const data = serializeQuestionResults([WRONG, TIMED_OUT]);
    expect(parseQuestionResults(data)).toEqual([WRONG, TIMED_OUT]);
  });

  it("uses the web's short keys", () => {
    expect(JSON.parse(serializeQuestionResults([TIMED_OUT]))).toEqual([
      { s: "c6", c: 0, dc: 0, ac: 0, cd: "a4-e8", ca: "a8-h1", t: 1 },
    ]);
  });

  it("gives an empty list for a missing or malformed param", () => {
    expect(parseQuestionResults(undefined)).toEqual([]);
    expect(parseQuestionResults("{not json")).toEqual([]);
    expect(parseQuestionResults('{"s":"e4"}')).toEqual([]);
  });

  it("drops entries that are not questions", () => {
    const data = JSON.stringify([
      { s: "z9", c: 1, dc: 1, ac: 1, cd: "a1-h8", ca: "a8-h1" },
      null,
      { s: "e4", c: 1, dc: 1, ac: 1, cd: "b1-h7", ca: "a8-h1" },
    ]);
    expect(parseQuestionResults(data).map((r) => r.square)).toEqual(["e4"]);
  });
});
