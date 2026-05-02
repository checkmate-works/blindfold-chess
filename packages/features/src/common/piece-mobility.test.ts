import { describe, expect, it } from "vitest";

import { getMovesForPiece } from "./piece-mobility";

describe("getMovesForPiece — bishop ('b')", () => {
  it("returns all 4 diagonals from center (d4) — 13 squares total", () => {
    const moves = getMovesForPiece("b", 3, 3);
    expect(moves).toHaveLength(13);
    expect(new Set(moves)).toEqual(
      new Set([
        // (1,1)
        "e5",
        "f6",
        "g7",
        "h8",
        // (1,-1)
        "e3",
        "f2",
        "g1",
        // (-1,1)
        "c5",
        "b6",
        "a7",
        // (-1,-1)
        "c3",
        "b2",
        "a1",
      ]),
    );
  });

  it("returns the long diagonal from corner a1 — 7 squares", () => {
    const moves = getMovesForPiece("b", 0, 0);
    expect(moves).toHaveLength(7);
    expect(new Set(moves)).toEqual(
      new Set(["b2", "c3", "d4", "e5", "f6", "g7", "h8"]),
    );
  });

  it("returns the long diagonal from corner h8 — 7 squares", () => {
    const moves = getMovesForPiece("b", 7, 7);
    expect(moves).toHaveLength(7);
    expect(new Set(moves)).toEqual(
      new Set(["a1", "b2", "c3", "d4", "e5", "f6", "g7"]),
    );
  });

  it("does not include the origin square", () => {
    expect(getMovesForPiece("b", 3, 3)).not.toContain("d4");
  });
});

describe("getMovesForPiece — rook ('r')", () => {
  it("returns full file and rank from center (d4) — 14 squares", () => {
    const moves = getMovesForPiece("r", 3, 3);
    expect(moves).toHaveLength(14);
    expect(new Set(moves)).toEqual(
      new Set([
        // file d (rank 1..8 except 4)
        "d1",
        "d2",
        "d3",
        "d5",
        "d6",
        "d7",
        "d8",
        // rank 4 (files a..h except d)
        "a4",
        "b4",
        "c4",
        "e4",
        "f4",
        "g4",
        "h4",
      ]),
    );
  });

  it("returns full file and rank from corner a1 — 14 squares", () => {
    const moves = getMovesForPiece("r", 0, 0);
    expect(moves).toHaveLength(14);
    expect(new Set(moves)).toEqual(
      new Set([
        "a2",
        "a3",
        "a4",
        "a5",
        "a6",
        "a7",
        "a8",
        "b1",
        "c1",
        "d1",
        "e1",
        "f1",
        "g1",
        "h1",
      ]),
    );
  });

  it("does not include the origin square", () => {
    expect(getMovesForPiece("r", 0, 0)).not.toContain("a1");
  });
});

describe("getMovesForPiece — knight ('n')", () => {
  it("returns all 8 L-shaped moves from center (d4)", () => {
    const moves = getMovesForPiece("n", 3, 3);
    expect(moves).toHaveLength(8);
    expect(new Set(moves)).toEqual(
      new Set(["f5", "f3", "b5", "b3", "e6", "e2", "c6", "c2"]),
    );
  });

  it("returns only the 2 on-board moves from corner a1 (boundary check)", () => {
    const moves = getMovesForPiece("n", 0, 0);
    expect(moves).toHaveLength(2);
    expect(new Set(moves)).toEqual(new Set(["c2", "b3"]));
  });

  it("returns only the 2 on-board moves from corner h8 (boundary check)", () => {
    const moves = getMovesForPiece("n", 7, 7);
    expect(moves).toHaveLength(2);
    expect(new Set(moves)).toEqual(new Set(["f7", "g6"]));
  });

  it("returns only the 2 on-board moves from corner h1 (boundary check)", () => {
    const moves = getMovesForPiece("n", 7, 0);
    expect(moves).toHaveLength(2);
    expect(new Set(moves)).toEqual(new Set(["f2", "g3"]));
  });

  it("returns 4 on-board moves from edge a4 (boundary check)", () => {
    // file=0, rank=3 (a4). Knight offsets that land on-board:
    // (2,1)→c5, (2,-1)→c3, (1,2)→b6, (1,-2)→b2 — only 4 of 8 are valid.
    const moves = getMovesForPiece("n", 0, 3);
    expect(moves).toHaveLength(4);
    expect(new Set(moves)).toEqual(new Set(["c5", "c3", "b6", "b2"]));
  });
});

describe("getMovesForPiece — queen ('q')", () => {
  it("equals the union of bishop + rook moves from the same square", () => {
    const queen = new Set(getMovesForPiece("q", 3, 3));
    const bishop = getMovesForPiece("b", 3, 3);
    const rook = getMovesForPiece("r", 3, 3);
    const union = new Set<string>([...bishop, ...rook]);
    expect(queen).toEqual(union);
    // Sanity: 13 (bishop) + 14 (rook) = 27, with no overlap.
    expect(queen.size).toBe(27);
  });

  it("from corner a1: 7 (diagonal) + 14 (file+rank) = 21 squares", () => {
    const moves = getMovesForPiece("q", 0, 0);
    expect(moves).toHaveLength(21);
  });
});

describe("getMovesForPiece — king ('k')", () => {
  it("returns all 8 adjacent squares from center (d4)", () => {
    const moves = getMovesForPiece("k", 3, 3);
    expect(moves).toHaveLength(8);
    expect(new Set(moves)).toEqual(
      new Set(["e4", "e5", "d5", "c5", "c4", "c3", "d3", "e3"]),
    );
  });

  it("returns only the 3 on-board adjacents from corner a1 (boundary check)", () => {
    const moves = getMovesForPiece("k", 0, 0);
    expect(moves).toHaveLength(3);
    expect(new Set(moves)).toEqual(new Set(["b1", "b2", "a2"]));
  });

  it("returns only the 3 on-board adjacents from corner h8 (boundary check)", () => {
    const moves = getMovesForPiece("k", 7, 7);
    expect(moves).toHaveLength(3);
    expect(new Set(moves)).toEqual(new Set(["g8", "g7", "h7"]));
  });

  it("returns 5 on-board adjacents from edge a4 (boundary check)", () => {
    // a4 = (0,3). Adjacents on-board: a5, b5, b4, b3, a3 (5 of 8).
    const moves = getMovesForPiece("k", 0, 3);
    expect(moves).toHaveLength(5);
    expect(new Set(moves)).toEqual(new Set(["a5", "b5", "b4", "b3", "a3"]));
  });
});
