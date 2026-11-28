import { describe, expect, it } from "vitest";

import { parseFenResultData, summarizeFenSession } from "./result-data";

describe("parseFenResultData", () => {
  const entry = {
    fen: "8/8/8/8/8/8/8/K6k w - - 0 1",
    recreatedFen: "8/8/8/8/8/8/8/K7 w - - 0 1",
    isBlackToMove: false,
    accuracy: 50,
    correctPieces: 1,
    totalPieces: 2,
    incorrectPieces: 0,
    missingPieces: 1,
    extraPieces: 0,
    originalIndex: 0,
    skipped: false,
  };
  const payload = {
    score: 50,
    total: 100,
    detailedStats: {
      correctPieces: 1,
      totalPieces: 2,
      incorrectPieces: 0,
      missingPieces: 1,
      extraPieces: 0,
    },
    results: [entry],
  };
  const encode = (value: unknown) => encodeURIComponent(JSON.stringify(value));

  it("decodes the payload the session writes", () => {
    expect(parseFenResultData(encode(payload))).toEqual(payload);
  });

  it.each([null, "", "%E0%A4%A", "not-json"])(
    "returns null for absent or invalid data: %s",
    (data) => {
      expect(parseFenResultData(data)).toBeNull();
    },
  );

  it.each([null, 42, "text", [payload]])(
    "returns null when the payload is not an object: %j",
    (value) => {
      expect(parseFenResultData(encode(value))).toBeNull();
    },
  );

  it("drops a missing or malformed top-level field and keeps the rest", () => {
    expect(
      parseFenResultData(
        encode({
          score: "50",
          total: 100,
          detailedStats: { correct: 1, incorrect: 1, total: 2 },
          results: "none",
        }),
      ),
    ).toEqual({ total: 100 });
  });

  it("drops the session's null detailedStats, so the page uses its own", () => {
    expect(
      parseFenResultData(
        encode({ score: 0, total: 100, results: [], detailedStats: null }),
      ),
    ).toEqual({ score: 0, total: 100, results: [] });
  });

  it("drops result entries of the wrong shape and keeps the well-formed ones", () => {
    const { accuracy: _accuracy, ...withoutAccuracy } = entry;
    expect(
      parseFenResultData(
        encode({
          results: [
            null,
            "a1",
            [entry],
            withoutAccuracy,
            { ...entry, fen: 1 },
            { ...entry, skipped: "no" },
            { ...entry, totalPieces: null },
            entry,
          ],
        }),
      ),
    ).toEqual({ results: [entry] });
  });
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
