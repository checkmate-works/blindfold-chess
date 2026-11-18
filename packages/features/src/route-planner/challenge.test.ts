import { describe, expect, it } from "vitest";

import { FEEDBACK_FLASH_MS } from "../common/flash-policy";
import type { RandomSource } from "../common/utils";
import { routePlannerChallengeDefinition as definition } from "./challenge";
import { generateProblem } from "./generate";
import type { RoutePlannerProblem } from "./types";

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

// b1 → c3 → d5 is two legal knight moves; b1 → d5 is not one.
const question: RoutePlannerProblem = { piece: "n", start: "b1", end: "d5" };

describe("routePlannerChallengeDefinition", () => {
  it.each([
    ["knight", "n"],
    ["bishop", "b"],
  ] as const)(
    "keys the %s leaderboard by its name and draws only that piece",
    (selectedPiece, piece) => {
      const settings = definition.parseSettings({ selectedPiece });
      expect(settings).toEqual({ selectedPiece });
      expect(definition.leaderboardKey(settings!)).toBe(selectedPiece);
      const questions = definition.generateQuestions(settings!, 12);
      expect(questions).toHaveLength(12);
      expect(questions.every((q) => q.piece === piece)).toBe(true);
    },
  );

  it.each([
    ["a piece outside the challenge", { selectedPiece: "rook" }],
    ["a short piece code", { selectedPiece: "n" }],
    ["an inherited property name", { selectedPiece: "toString" }],
    ["a missing piece", {}],
    ["a non-object", "knight"],
    ["null", null],
    ["an array", [{ selectedPiece: "knight" }]],
  ])("rejects settings with %s", (_label, raw) => {
    expect(definition.parseSettings(raw)).toBeNull();
  });

  it("draws the same problems as generateProblem from the same random source", () => {
    const rng = createSeededRng(3);
    const expected = Array.from({ length: 15 }, () =>
      generateProblem(["b"], rng),
    );
    expect(
      definition.generateQuestions(
        { selectedPiece: "bishop" },
        15,
        createSeededRng(3),
      ),
    ).toEqual(expected);
  });

  it("grades a legal path correct, with or without the goal square entered", () => {
    for (const raw of [{ path: ["c3"] }, { path: ["c3", "d5"] }]) {
      const answer = definition.parseAnswer(raw);
      expect(answer).toEqual(raw);
      expect(definition.grade(question, answer!)).toBe(true);
    }
  });

  it("grades an illegal path incorrect", () => {
    const answer = definition.parseAnswer({ path: [] });
    expect(answer).toEqual({ path: [] });
    expect(definition.grade(question, answer!)).toBe(false);
  });

  it("parses a skip and grades it incorrect", () => {
    const answer = definition.parseAnswer({ skipped: true });
    expect(answer).toEqual({ skipped: true });
    expect(definition.grade(question, answer!)).toBe(false);
  });

  it.each([
    ["a non-object", ["c3"]],
    ["null", null],
    ["a bare square name", "c3"],
    ["a number", 3],
    ["a non-array path", { path: "c3" }],
    ["a path entry that is a number", { path: ["c3", 42] }],
    ["a path entry that is null", { path: ["c3", null] }],
    // An array holding one square name stringifies to that name.
    ["a path entry that is an array", { path: ["c3", ["d5"]] }],
    ["a path entry that is not a square", { path: ["c3", "z9"] }],
    ["a skip flag that is not true", { skipped: false }],
    ["both a path and a skip", { path: ["c3"], skipped: true }],
  ])("rejects %s as a broken answer", (_label, raw) => {
    expect(definition.parseAnswer(raw)).toBeNull();
  });

  it("flashes a correct answer shorter than an incorrect one", () => {
    const settings = { selectedPiece: "knight" } as const;
    expect(definition.feedbackMs(settings, true)).toBe(
      FEEDBACK_FLASH_MS.correct,
    );
    expect(definition.feedbackMs(settings, false)).toBe(
      FEEDBACK_FLASH_MS.incorrect,
    );
  });

  it("allows a mean of 2000 ms per answer and generates enough questions for it", () => {
    expect(definition.minMeanThinkMs).toBe(2000);
    expect(definition.maxQuestions).toBe(40);
  });
});
