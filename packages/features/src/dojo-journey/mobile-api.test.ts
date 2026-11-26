import { describe, expect, it } from "vitest";

import {
  parseMobileDojoExamResponse,
  parseMobileDojoResponse,
  parseMobileDojoStepsResponse,
} from "./mobile-api";

describe("parseMobileDojoResponse", () => {
  const body = {
    achievedRanks: ["5kyu", "4kyu"],
    bestScores: [
      { menuType: "legal_moves", leaderboardKey: "king", score: 21 },
    ],
    completedSteps: ["guide:5kyu:1", "exam:2kyu:puzzle"],
  };

  it("reads a well-formed body and drops unknown fields", () => {
    expect(
      parseMobileDojoResponse({
        ...body,
        extra: true,
        bestScores: [{ ...body.bestScores[0], userId: "u1" }],
      }),
    ).toEqual(body);
  });

  it("rejects a body with any field of the wrong shape", () => {
    for (const bad of [
      null,
      [],
      "body",
      { ...body, achievedRanks: undefined },
      { ...body, achievedRanks: ["5kyu", 4] },
      { ...body, completedSteps: "guide:5kyu:1" },
      { ...body, bestScores: [{ menuType: "legal_moves", score: 1 }] },
      {
        ...body,
        bestScores: [
          { menuType: "legal_moves", leaderboardKey: "king", score: "21" },
        ],
      },
      {
        ...body,
        bestScores: [
          { menuType: "legal_moves", leaderboardKey: "king", score: NaN },
        ],
      },
    ]) {
      expect(parseMobileDojoResponse(bad)).toBeUndefined();
    }
  });
});

describe("parseMobileDojoStepsResponse", () => {
  it("reads the completed and rejected keys", () => {
    expect(
      parseMobileDojoStepsResponse({
        completed: ["guide:5kyu:1"],
        rejected: ["exam:2kyu:puzzle"],
      }),
    ).toEqual({ completed: ["guide:5kyu:1"], rejected: ["exam:2kyu:puzzle"] });
  });

  it("rejects a body missing either list or holding non-strings", () => {
    expect(parseMobileDojoStepsResponse({ completed: [] })).toBeUndefined();
    expect(
      parseMobileDojoStepsResponse({ completed: [1], rejected: [] }),
    ).toBeUndefined();
    expect(parseMobileDojoStepsResponse(null)).toBeUndefined();
  });
});

describe("parseMobileDojoExamResponse", () => {
  const body = {
    passed: true,
    accuracy: 93.75,
    recorded: true,
    grantedRanks: ["2kyu"],
    highestRank: "2kyu",
  };

  it("reads a graded memory answer", () => {
    expect(parseMobileDojoExamResponse(body)).toEqual(body);
  });

  it("reads a puzzle answer, which has no accuracy, from a player with no rank", () => {
    const puzzle = {
      ...body,
      accuracy: null,
      recorded: false,
      grantedRanks: [],
      highestRank: null,
    };
    expect(parseMobileDojoExamResponse(puzzle)).toEqual(puzzle);
  });

  it("rejects a body with any field of the wrong shape", () => {
    for (const bad of [
      null,
      { ...body, passed: "true" },
      { ...body, accuracy: undefined },
      { ...body, accuracy: Infinity },
      { ...body, recorded: undefined },
      { ...body, grantedRanks: "2kyu" },
      { ...body, highestRank: undefined },
      { ...body, highestRank: 2 },
    ]) {
      expect(parseMobileDojoExamResponse(bad)).toBeUndefined();
    }
  });
});
