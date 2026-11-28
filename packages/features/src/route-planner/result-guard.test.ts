import { describe, expect, it } from "vitest";

import { isRoutePlannerProblemResult } from "./result-guard";
import type { RoutePlannerProblemResult } from "./types";

const solved: RoutePlannerProblemResult = {
  piece: "n",
  start: "g1",
  end: "e2",
  success: true,
  userPath: ["e2"],
  shortestPath: ["g1", "e2"],
};

describe("isRoutePlannerProblemResult", () => {
  it.each([
    ["a solved problem", solved],
    [
      "a skipped problem",
      { ...solved, success: false, userPath: [], skipped: true },
    ],
    [
      "the timed-out problem",
      { ...solved, success: false, userPath: [], timedOut: true },
    ],
    ["a rook or queen problem", { ...solved, piece: "q" }],
  ])("accepts %s", (_label, value) => {
    expect(isRoutePlannerProblemResult(value)).toBe(true);
  });

  const { userPath: _userPath, ...withoutUserPath } = solved;
  it.each([
    ["null", null],
    ["a string", "g1"],
    ["an array", [solved]],
    ["an empty object", {}],
    ["a missing userPath", withoutUserPath],
    ["a piece the planner has no problems for", { ...solved, piece: "k" }],
    ["a start that is not a square", { ...solved, start: "z9" }],
    ["an end that is not a string", { ...solved, end: { square: "e2" } }],
    ["a success that is not a boolean", { ...solved, success: "yes" }],
    ["a path with a non-square", { ...solved, shortestPath: ["g1", 7] }],
    ["a skipped flag that is not a boolean", { ...solved, skipped: 1 }],
    ["a timedOut flag that is not a boolean", { ...solved, timedOut: "true" }],
  ])("rejects %s", (_label, value) => {
    expect(isRoutePlannerProblemResult(value)).toBe(false);
  });
});
