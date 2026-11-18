import { describe, expect, it } from "vitest";

import { FEEDBACK_FLASH_MS } from "../common/flash-policy";
import type { RandomSource } from "../common/utils";
import { boardSymmetryChallengeDefinition as definition } from "./challenge";
import { calculateSymmetricSquare, generateProblem } from "./logic";
import type { BoardSymmetryProblem } from "./types";

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

const question: BoardSymmetryProblem = { square: "b3", type: "point" };

describe("boardSymmetryChallengeDefinition", () => {
  it("accepts any settings object as the single 'default' leaderboard", () => {
    const settings = definition.parseSettings({ anything: "ignored" });
    expect(settings).toEqual({});
    expect(definition.leaderboardKey(settings!)).toBe("default");
    expect(definition.parseSettings(null)).toBeNull();
    expect(definition.parseSettings("default")).toBeNull();
  });

  it("generates the requested number of questions", () => {
    expect(definition.generateQuestions({}, 7)).toHaveLength(7);
  });

  it("draws the same questions as generateProblem from the same random source", () => {
    const fromDefinition = definition.generateQuestions(
      {},
      20,
      createSeededRng(42),
    );
    const rng = createSeededRng(42);
    const fromGenerator = Array.from({ length: 20 }, () =>
      generateProblem(rng),
    );
    expect(fromDefinition).toEqual(fromGenerator);
  });

  it("grades the mirrored square correct", () => {
    const correct = calculateSymmetricSquare(question.square, question.type);
    const answer = definition.parseAnswer({
      file: correct[0],
      rank: correct[1],
    });
    expect(answer).not.toBeNull();
    expect(definition.grade(question, answer!)).toBe(true);
  });

  it("grades any other square on the board incorrect", () => {
    const answer = definition.parseAnswer({ file: "b", rank: "3" });
    expect(answer).toEqual({ file: "b", rank: "3" });
    expect(definition.grade(question, answer!)).toBe(false);
  });

  it.each([
    ["a non-object", "g6"],
    ["a missing rank", { file: "g" }],
    ["a non-string file", { file: 7, rank: "6" }],
    ["a file the board does not have", { file: "g6", rank: "" }],
    ["a rank the board does not have", { file: "g", rank: "9" }],
  ])("rejects %s as a broken answer", (_label, raw) => {
    expect(definition.parseAnswer(raw)).toBeNull();
  });

  it("flashes a correct answer shorter than an incorrect one", () => {
    expect(definition.feedbackMs({}, true)).toBe(FEEDBACK_FLASH_MS.correct);
    expect(definition.feedbackMs({}, false)).toBe(FEEDBACK_FLASH_MS.incorrect);
  });

  it("allows a mean of 600 ms per answer and generates enough questions for it", () => {
    expect(definition.minMeanThinkMs).toBe(600);
    expect(definition.maxQuestions).toBe(110);
  });
});
