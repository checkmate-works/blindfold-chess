import { describe, expect, it } from "vitest";
import { summarizeFenSession } from "@blindfold-chess/features/fen-practice";

import {
  parseFenResultParams,
  parseFenSessionParams,
  serializeFenResultParams,
  serializeFenSessionParams,
} from "./route-params";

const A = "4k3/8/8/8/8/8/4p3/K7 w - - 0 1";
const B = "8/3R4/8/8/2k2Q2/P7/8/7K b - - 4 49";

describe("FEN session params", () => {
  it("round-trips the FEN list, the count and the shuffle flag", () => {
    const params = serializeFenSessionParams({
      fens: [A, B],
      problemCount: 1,
      shuffle: true,
    });
    expect(parseFenSessionParams(params)).toEqual({
      fens: [A, B],
      problemCount: 1,
      shuffle: true,
    });
  });

  it("caps the count at the number of FENs", () => {
    expect(
      serializeFenSessionParams({ fens: [A], problemCount: 5, shuffle: false })
        .count,
    ).toBe("1");
  });

  it("drops entries that are not FENs", () => {
    expect(
      parseFenSessionParams({ problems: JSON.stringify([A, "junk", 3]) }).fens,
    ).toEqual([A]);
  });

  it("falls back to an empty list on unreadable params", () => {
    expect(parseFenSessionParams({ problems: "{not json" })).toEqual({
      fens: [],
      problemCount: 5,
      shuffle: false,
    });
  });
});

describe("FEN result params", () => {
  it("round-trips a session summary", () => {
    const summary = summarizeFenSession({
      positions: [
        { fen: A, isBlackToMove: false },
        { fen: B, isBlackToMove: true },
      ],
      problemResults: new Map([
        [
          0,
          {
            correctPieces: 2,
            totalPieces: 3,
            incorrectPieces: 0,
            missingPieces: 1,
            extraPieces: 0,
            netScore: 2,
            accuracy: 66.666,
            details: [],
          },
        ],
      ]),
      recreatedPositions: new Map(),
      skippedProblems: new Set([1]),
    });

    expect(parseFenResultParams(serializeFenResultParams(summary, 2))).toEqual({
      accuracy: 66.7,
      correct: 2,
      totalPieces: 3,
      incorrect: 0,
      missing: 1,
      extra: 0,
      solved: 1,
      problems: 2,
    });
  });

  it("reads junk as zero", () => {
    expect(parseFenResultParams({ accuracy: "abc", correct: "-1" })).toEqual({
      accuracy: 0,
      correct: 0,
      totalPieces: 0,
      incorrect: 0,
      missing: 0,
      extra: 0,
      solved: 0,
      problems: 0,
    });
  });
});
