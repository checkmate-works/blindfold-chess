import { describe, expect, it } from "vitest";

import { FEEDBACK_FLASH_MS } from "../common/flash-policy";
import { type RandomSource, generateSquareSequence } from "../common/utils";
import { diagonalQuizChallengeDefinition as definition } from "./challenge";
import { EXCLUDED_QUIZ_SQUARES, getDiagonals } from "./logic";

/** Deterministic random source (mulberry32), so two calls draw the same sequence. */
function createSeededRng(seed: number): RandomSource {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("diagonalQuizChallengeDefinition", () => {
  it("accepts any settings object as the single 'default' leaderboard", () => {
    const settings = definition.parseSettings({});
    expect(settings).toEqual({});
    expect(definition.leaderboardKey(settings!)).toBe("default");
    expect(definition.parseSettings(undefined)).toBeNull();
    expect(definition.parseSettings([])).toBeNull();
  });

  it("generates the requested number of questions, never a single-diagonal square", () => {
    const questions = definition.generateQuestions({}, 60);
    expect(questions).toHaveLength(60);
    for (const square of questions) {
      expect(EXCLUDED_QUIZ_SQUARES.has(square)).toBe(false);
    }
  });

  it("draws the same squares as generateSquareSequence from the same random source", () => {
    expect(definition.generateQuestions({}, 30, createSeededRng(7))).toEqual(
      generateSquareSequence(30, createSeededRng(7), EXCLUDED_QUIZ_SQUARES),
    );
  });

  it("grades both diagonals right as correct, in either endpoint order and case", () => {
    const { diagonal, antiDiagonal } = getDiagonals("d4");
    const reversed = antiDiagonal.split("-").reverse().join("-").toUpperCase();
    const answer = definition.parseAnswer({ diagonal, antiDiagonal: reversed });
    expect(answer).not.toBeNull();
    expect(definition.grade("d4", answer!)).toBe(true);
  });

  it("parses a malformed or half-wrong answer and grades it incorrect", () => {
    const { diagonal } = getDiagonals("d4");
    for (const raw of [
      { diagonal, antiDiagonal: "" },
      { diagonal: "not a diagonal", antiDiagonal: "z9-z0" },
    ]) {
      const answer = definition.parseAnswer(raw);
      expect(answer).toEqual(raw);
      expect(definition.grade("d4", answer!)).toBe(false);
    }
  });

  it.each([
    ["a non-object", "a1-h8"],
    ["a missing anti-diagonal", { diagonal: "a1-h8" }],
    ["a non-string diagonal", { diagonal: 18, antiDiagonal: "a7-g1" }],
  ])("rejects %s as a broken answer", (_label, raw) => {
    expect(definition.parseAnswer(raw)).toBeNull();
  });

  it("flashes a correct answer shorter than an incorrect one", () => {
    expect(definition.feedbackMs({}, true)).toBe(FEEDBACK_FLASH_MS.correct);
    expect(definition.feedbackMs({}, false)).toBe(FEEDBACK_FLASH_MS.incorrect);
  });

  it("allows a mean of 1200 ms per answer and generates enough questions for it", () => {
    expect(definition.minMeanThinkMs).toBe(1200);
    expect(definition.maxQuestions).toBe(60);
  });
});
