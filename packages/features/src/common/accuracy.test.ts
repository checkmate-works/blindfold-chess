import { describe, expect, it } from "vitest";

import { calculateAccuracy, calculateSquareDifferences } from "./accuracy";
import { STARTING_FEN } from "../chess-core/fen-pure";

const EMPTY_FEN = "8/8/8/8/8/8/8/8 w - - 0 1";

// Minimal piece-name map; any string is fine since calculateAccuracy only
// threads these through the description callbacks.
const NAMES = {
  P: "Pawn",
  N: "Knight",
  B: "Bishop",
  R: "Rook",
  Q: "Queen",
  K: "King",
  p: "pawn",
  n: "knight",
  b: "bishop",
  r: "rook",
  q: "queen",
  k: "king",
};

const DESC = {
  correct: (piece: string, square: string) => `${piece} on ${square}: ok`,
  wrongPiece: (square: string, expected: string, actual: string) =>
    `${square}: expected ${expected}, got ${actual}`,
  missing: (piece: string, square: string) => `missing ${piece} on ${square}`,
  extra: (piece: string, square: string) => `extra ${piece} on ${square}`,
};

describe("calculateAccuracy", () => {
  it("returns 100% accuracy when both FENs are identical", () => {
    const result = calculateAccuracy(STARTING_FEN, STARTING_FEN, NAMES, DESC);
    expect(result.correctPieces).toBe(32);
    expect(result.totalPieces).toBe(32);
    expect(result.incorrectPieces).toBe(0);
    expect(result.missingPieces).toBe(0);
    expect(result.extraPieces).toBe(0);
    expect(result.accuracy).toBe(100);
  });

  it("returns 0% when the recreated board is empty", () => {
    const result = calculateAccuracy(STARTING_FEN, EMPTY_FEN, NAMES, DESC);
    expect(result.correctPieces).toBe(0);
    expect(result.missingPieces).toBe(32);
    expect(result.totalPieces).toBe(32);
    expect(result.accuracy).toBe(0);
  });

  it("treats wrong-piece placements as incorrect and clamps to 0", () => {
    // All 32 pieces present but every square holds the wrong piece type:
    // mirror the starting position (white and black swapped). Every square
    // has both original and recreated pieces but none match.
    const swapped = "RNBQKBNR/PPPPPPPP/8/8/8/8/pppppppp/rnbqkbnr w KQkq - 0 1";
    const result = calculateAccuracy(STARTING_FEN, swapped, NAMES, DESC);
    expect(result.totalPieces).toBe(32);
    expect(result.correctPieces).toBe(0);
    expect(result.incorrectPieces).toBe(32);
    expect(result.accuracy).toBe(0);
  });

  it("returns 0 accuracy when there are no original pieces", () => {
    const result = calculateAccuracy(EMPTY_FEN, EMPTY_FEN, NAMES, DESC);
    expect(result.totalPieces).toBe(0);
    expect(result.accuracy).toBe(0);
  });

  it("penalizes extra pieces without counting them toward the piece total", () => {
    // One correct pawn on e4 plus one extra pawn on e3: the extra square was
    // empty in the original, so totalPieces stays 1 while the extra piece
    // subtracts half a point from the net score.
    const original = "8/8/8/8/4P3/8/8/8 w - - 0 1";
    const recreated = "8/8/8/8/4P3/4P3/8/8 w - - 0 1";
    const result = calculateAccuracy(original, recreated, NAMES, DESC);
    expect(result.correctPieces).toBe(1);
    expect(result.extraPieces).toBe(1);
    expect(result.totalPieces).toBe(1);
    expect(result.netScore).toBe(0.5);
    expect(result.accuracy).toBe(50);
  });

  it("scores and describes each square kind (correct / wrongPiece / missing / extra)", () => {
    // a8 correct (rook), b8 wrong piece (knight vs bishop), c8 missing
    // (queen), d8 extra (pawn) — one detail of each kind, in board order.
    const original = "rnq5/8/8/8/8/8/8/8 w - - 0 1";
    const recreated = "rb1p4/8/8/8/8/8/8/8 w - - 0 1";
    const result = calculateAccuracy(original, recreated, NAMES, DESC);

    expect(result.correctPieces).toBe(1);
    expect(result.incorrectPieces).toBe(1);
    expect(result.missingPieces).toBe(1);
    expect(result.extraPieces).toBe(1);
    expect(result.totalPieces).toBe(3);
    // netScore = 1 correct − (1 wrong + 1 extra) × 0.5
    expect(result.netScore).toBe(0);
    expect(result.accuracy).toBe(0);

    expect(result.details).toEqual([
      {
        square: "a8",
        expected: "r",
        actual: "r",
        score: 1,
        description: "rook on a8: ok",
      },
      {
        square: "b8",
        expected: "n",
        actual: "b",
        score: -0.5,
        description: "b8: expected knight, got bishop",
      },
      {
        square: "c8",
        expected: "q",
        actual: "",
        score: 0,
        description: "missing queen on c8",
      },
      {
        square: "d8",
        expected: "",
        actual: "p",
        score: -0.5,
        description: "extra pawn on d8",
      },
    ]);
  });

  it("clamps a negative net score to 0 accuracy while reporting the raw netScore", () => {
    const swapped = "RNBQKBNR/PPPPPPPP/8/8/8/8/pppppppp/rnbqkbnr w KQkq - 0 1";
    const result = calculateAccuracy(STARTING_FEN, swapped, NAMES, DESC);
    expect(result.netScore).toBe(-16);
    expect(result.accuracy).toBe(0);
  });
});

describe("calculateSquareDifferences", () => {
  it("returns an empty list when both positions are empty", () => {
    expect(calculateSquareDifferences(EMPTY_FEN, EMPTY_FEN)).toEqual([]);
  });

  it("marks identical positions as all-correct", () => {
    const diffs = calculateSquareDifferences(STARTING_FEN, STARTING_FEN);
    expect(diffs).toHaveLength(32);
    expect(diffs.every((d) => d.status === "correct")).toBe(true);
  });

  it("marks empty-vs-populated squares as missing", () => {
    const diffs = calculateSquareDifferences(STARTING_FEN, EMPTY_FEN);
    expect(diffs).toHaveLength(32);
    expect(diffs.every((d) => d.status === "missing")).toBe(true);
  });

  it("marks populated-vs-empty squares as incorrect (extra)", () => {
    const diffs = calculateSquareDifferences(EMPTY_FEN, STARTING_FEN);
    expect(diffs).toHaveLength(32);
    expect(diffs.every((d) => d.status === "incorrect")).toBe(true);
  });
});
