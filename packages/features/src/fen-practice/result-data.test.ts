import { describe, expect, it } from "vitest";

import { parseFenResultData, summarizeFenSession } from "./result-data";

describe("parseFenResultData", () => {
  it("decodes the complete result payload", () => {
    const payload = {
      score: 2,
      total: 3,
      detailedStats: { correct: 2, incorrect: 1, total: 3 },
      results: [{ square: "a1" }],
    };

    expect(
      parseFenResultData(encodeURIComponent(JSON.stringify(payload))),
    ).toEqual(payload);
  });

  it.each([null, "", "%E0%A4%A", "not-json"])(
    "returns null for absent or invalid data: %s",
    (data) => {
      expect(parseFenResultData(data)).toBeNull();
    },
  );
});

describe("summarizeFenSession", () => {
  const positions = [
    { fen: "8/8/8/8/8/8/8/K6k w - - 0 1", isBlackToMove: false },
    { fen: "8/8/8/8/8/8/8/k6K b - - 0 1", isBlackToMove: true },
    { fen: "8/8/8/8/8/8/8/KQ5k w - - 0 1", isBlackToMove: false },
  ];
  const accuracy = (value: number, correct: number, total: number) => ({
    correctPieces: correct,
    totalPieces: total,
    incorrectPieces: 0,
    missingPieces: total - correct,
    extraPieces: 1,
    netScore: correct,
    accuracy: value,
    details: [],
  });

  it("is empty when nothing was submitted or skipped", () => {
    const summary = summarizeFenSession({
      positions,
      problemResults: new Map(),
      recreatedPositions: new Map(),
      skippedProblems: new Set(),
    });
    expect(summary.empty).toBe(true);
    expect(summary.score).toBe(0);
    expect(summary.results).toEqual([]);
    expect(summary.detailedStats).toBeNull();
  });

  it("lists every position and counts unreached ones as skipped", () => {
    const summary = summarizeFenSession({
      positions,
      problemResults: new Map([[0, accuracy(100, 2, 2)]]),
      recreatedPositions: new Map([[0, positions[0].fen]]),
      skippedProblems: new Set([1]),
    });

    expect(summary.empty).toBe(false);
    expect(summary.score).toBe(100);
    expect(summary.results.map((r) => r.skipped)).toEqual([false, true, true]);
    expect(summary.results[0]).toMatchObject({
      recreatedFen: positions[0].fen,
      correctPieces: 2,
      originalIndex: 0,
    });
    expect(summary.results[2].recreatedFen).toBe("");
    expect(summary.detailedStats).toEqual({
      correctPieces: 2,
      totalPieces: 2,
      incorrectPieces: 0,
      missingPieces: 0,
      extraPieces: 1,
    });
  });

  it("averages accuracy over submitted problems and rounds the score", () => {
    const summary = summarizeFenSession({
      positions,
      problemResults: new Map([
        [0, accuracy(50, 1, 2)],
        [1, accuracy(75, 3, 4)],
      ]),
      recreatedPositions: new Map(),
      skippedProblems: new Set(),
    });
    expect(summary.aggregated.totalAccuracy).toBe(62.5);
    expect(summary.score).toBe(63);
    expect(summary.aggregated.totalCorrect).toBe(4);
    expect(summary.aggregated.totalPieces).toBe(6);
  });
});
