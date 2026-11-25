import { describe, expect, it } from "vitest";
import type { RoutePlannerResult } from "@blindfold-chess/features/route-planner";

import {
  buildRoutePlannerResultParams,
  parseRoutePlannerProblems,
} from "./result-params";

const RESULT: RoutePlannerResult = {
  problems: [
    {
      piece: "n",
      start: "b1",
      end: "d2",
      success: true,
      userPath: ["d2"],
      shortestPath: ["b1", "d2"],
    },
    {
      piece: "n",
      start: "g1",
      end: "g3",
      success: false,
      userPath: ["g3"],
      shortestPath: ["g1", "e2", "g3"],
    },
  ],
  totalProblems: 2,
  correctCount: 1,
  accuracy: 50,
};

describe("buildRoutePlannerResultParams", () => {
  it("scores the answered problems and lists them", () => {
    const params = buildRoutePlannerResultParams(RESULT, {
      timeElapsed: 30,
      timeLimit: 60,
      timedOutProblem: null,
    });
    expect(params).toMatchObject({
      correctAnswers: "1",
      incorrectAnswers: "1",
      totalQuestions: "2",
      accuracy: "50",
      timeTaken: "30",
      averageTime: "15",
    });
    expect(parseRoutePlannerProblems(params.problems)).toEqual(RESULT.problems);
  });

  it("lists the problem the clock cut off last, out of the score", () => {
    const params = buildRoutePlannerResultParams(RESULT, {
      timeElapsed: 61,
      timeLimit: 60,
      timedOutProblem: { piece: "n", start: "a1", end: "b3" },
    });
    expect(params.totalQuestions).toBe("2");
    expect(params.timeTaken).toBe("60");
    const problems = parseRoutePlannerProblems(params.problems);
    expect(problems).toHaveLength(3);
    expect(problems[2]).toEqual({
      piece: "n",
      start: "a1",
      end: "b3",
      success: false,
      userPath: [],
      shortestPath: ["a1", "b3"],
      timedOut: true,
    });
  });

  it("averages nothing over no answers", () => {
    const params = buildRoutePlannerResultParams(
      { problems: [], totalProblems: 0, correctCount: 0, accuracy: 0 },
      { timeElapsed: 60, timeLimit: 60, timedOutProblem: null },
    );
    expect(params.averageTime).toBe("0");
  });
});

describe("parseRoutePlannerProblems", () => {
  it("reads a missing or mangled list as empty", () => {
    expect(parseRoutePlannerProblems(undefined)).toEqual([]);
    expect(parseRoutePlannerProblems("{")).toEqual([]);
    expect(parseRoutePlannerProblems('{"a":1}')).toEqual([]);
  });
});
