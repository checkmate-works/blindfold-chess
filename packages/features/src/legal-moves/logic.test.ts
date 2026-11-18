import { describe, expect, it } from "vitest";

import { type RandomSource, getMovesForPiece } from "../common";

import { pieceDisplayMap } from "./constants";
import {
  generateBalancedMoveQuestions,
  generateIllegalMoveQuestion,
  generateLegalMoveQuestion,
  isLegalMove,
} from "./logic";
import { PIECE_TYPES, type PieceType } from "./types";

// ============================================================
// isLegalMove
// ============================================================
describe("isLegalMove", () => {
  // ----------------------------------------------------------
  // Bishop
  // ----------------------------------------------------------
  describe("bishop", () => {
    it("accepts diagonal moves", () => {
      expect(isLegalMove("d4", "f6", "b")).toBe(true); // up-right
      expect(isLegalMove("d4", "b6", "b")).toBe(true); // up-left
      expect(isLegalMove("d4", "f2", "b")).toBe(true); // down-right
      expect(isLegalMove("d4", "b2", "b")).toBe(true); // down-left
    });

    it("rejects non-diagonal moves", () => {
      expect(isLegalMove("d4", "d6", "b")).toBe(false); // vertical
      expect(isLegalMove("d4", "f4", "b")).toBe(false); // horizontal
      expect(isLegalMove("d4", "e6", "b")).toBe(false); // knight-like
    });

    it("handles moves from the board edge", () => {
      expect(isLegalMove("a1", "h8", "b")).toBe(true);
      expect(isLegalMove("h1", "a8", "b")).toBe(true);
      expect(isLegalMove("a8", "h1", "b")).toBe(true);
      expect(isLegalMove("a1", "b2", "b")).toBe(true);
    });
  });

  // ----------------------------------------------------------
  // Knight
  // ----------------------------------------------------------
  describe("knight", () => {
    it("accepts L-shaped moves", () => {
      expect(isLegalMove("d4", "e6", "n")).toBe(true);
      expect(isLegalMove("d4", "f5", "n")).toBe(true);
      expect(isLegalMove("d4", "f3", "n")).toBe(true);
      expect(isLegalMove("d4", "e2", "n")).toBe(true);
      expect(isLegalMove("d4", "c2", "n")).toBe(true);
      expect(isLegalMove("d4", "b3", "n")).toBe(true);
      expect(isLegalMove("d4", "b5", "n")).toBe(true);
      expect(isLegalMove("d4", "c6", "n")).toBe(true);
    });

    it("rejects non L-shaped moves", () => {
      expect(isLegalMove("d4", "d5", "n")).toBe(false); // one square up
      expect(isLegalMove("d4", "e5", "n")).toBe(false); // diagonal
      expect(isLegalMove("d4", "f6", "n")).toBe(false); // two diagonal
    });

    it("handles moves from the corner", () => {
      expect(isLegalMove("a1", "b3", "n")).toBe(true);
      expect(isLegalMove("a1", "c2", "n")).toBe(true);
      // only 2 legal knight moves from a1
      expect(isLegalMove("a1", "a3", "n")).toBe(false);
    });
  });

  // ----------------------------------------------------------
  // Rook
  // ----------------------------------------------------------
  describe("rook", () => {
    it("accepts straight line moves", () => {
      expect(isLegalMove("d4", "d8", "r")).toBe(true); // vertical
      expect(isLegalMove("d4", "a4", "r")).toBe(true); // horizontal
      expect(isLegalMove("d4", "d1", "r")).toBe(true);
      expect(isLegalMove("d4", "h4", "r")).toBe(true);
    });

    it("rejects diagonal moves", () => {
      expect(isLegalMove("d4", "e5", "r")).toBe(false);
      expect(isLegalMove("d4", "f6", "r")).toBe(false);
    });

    it("handles moves from the edge", () => {
      expect(isLegalMove("a1", "a8", "r")).toBe(true);
      expect(isLegalMove("a1", "h1", "r")).toBe(true);
      expect(isLegalMove("h8", "h1", "r")).toBe(true);
      expect(isLegalMove("h8", "a8", "r")).toBe(true);
    });
  });

  // ----------------------------------------------------------
  // Queen
  // ----------------------------------------------------------
  describe("queen", () => {
    it("accepts diagonal moves", () => {
      expect(isLegalMove("d4", "f6", "q")).toBe(true);
      expect(isLegalMove("d4", "a7", "q")).toBe(true);
    });

    it("accepts straight line moves", () => {
      expect(isLegalMove("d4", "d8", "q")).toBe(true);
      expect(isLegalMove("d4", "h4", "q")).toBe(true);
    });

    it("rejects knight-like moves", () => {
      expect(isLegalMove("d4", "e6", "q")).toBe(false);
      expect(isLegalMove("d4", "f5", "q")).toBe(false);
    });
  });

  // ----------------------------------------------------------
  // King
  // ----------------------------------------------------------
  describe("king", () => {
    it("accepts one-square moves in all directions", () => {
      expect(isLegalMove("d4", "d5", "k")).toBe(true); // up
      expect(isLegalMove("d4", "e5", "k")).toBe(true); // up-right
      expect(isLegalMove("d4", "e4", "k")).toBe(true); // right
      expect(isLegalMove("d4", "e3", "k")).toBe(true); // down-right
      expect(isLegalMove("d4", "d3", "k")).toBe(true); // down
      expect(isLegalMove("d4", "c3", "k")).toBe(true); // down-left
      expect(isLegalMove("d4", "c4", "k")).toBe(true); // left
      expect(isLegalMove("d4", "c5", "k")).toBe(true); // up-left
    });

    it("rejects moves more than one square away", () => {
      expect(isLegalMove("d4", "d6", "k")).toBe(false);
      expect(isLegalMove("d4", "f6", "k")).toBe(false);
      expect(isLegalMove("d4", "b2", "k")).toBe(false);
    });

    it("handles moves from the corner", () => {
      expect(isLegalMove("a1", "a2", "k")).toBe(true);
      expect(isLegalMove("a1", "b1", "k")).toBe(true);
      expect(isLegalMove("a1", "b2", "k")).toBe(true);
    });
  });

  // ----------------------------------------------------------
  // Edge cases
  // ----------------------------------------------------------
  describe("edge cases", () => {
    it("returns false when from and to are the same square", () => {
      for (const piece of PIECE_TYPES) {
        expect(isLegalMove("e4", "e4", piece)).toBe(false);
      }
    });

    it("works correctly after chess.clear() without kings on the board", () => {
      // Verify that chess.js clear() + put() approach works for each piece
      // This is a regression guard for the chess.js internal state concern
      expect(isLegalMove("e2", "e4", "r")).toBe(true);
      expect(isLegalMove("b1", "c3", "n")).toBe(true);
      expect(isLegalMove("c1", "f4", "b")).toBe(true);
      expect(isLegalMove("d1", "d7", "q")).toBe(true);
      expect(isLegalMove("e1", "e2", "k")).toBe(true);
    });
  });
});

// ============================================================
// generateBalancedMoveQuestions
// ============================================================
describe("generateBalancedMoveQuestions", () => {
  it("generates the specified number of questions", () => {
    const questions = generateBalancedMoveQuestions(10);
    expect(questions).toHaveLength(10);
  });

  it("generates a single question when count is 1", () => {
    const questions = generateBalancedMoveQuestions(1);
    expect(questions).toHaveLength(1);
  });

  it("returns an empty array when count is 0", () => {
    const questions = generateBalancedMoveQuestions(0);
    expect(questions).toHaveLength(0);
  });

  it("produces roughly balanced legal/illegal moves (within ±30%)", () => {
    // Use a larger sample to get statistical significance
    const count = 40;
    const questions = generateBalancedMoveQuestions(count);

    let legalCount = 0;
    for (const q of questions) {
      if (isLegalMove(q.from, q.to, q.piece)) {
        legalCount++;
      }
    }

    const legalRatio = legalCount / count;
    // Allow a generous tolerance since the algorithm is random
    expect(legalRatio).toBeGreaterThanOrEqual(0.2);
    expect(legalRatio).toBeLessThanOrEqual(0.8);
  });

  it("only includes pieces from the allowedPieces parameter", () => {
    const allowedPieces: PieceType[] = ["n", "b"];
    const questions = generateBalancedMoveQuestions(20, allowedPieces);

    for (const q of questions) {
      expect(allowedPieces).toContain(q.piece);
    }
  });

  it("works with a single allowed piece", () => {
    const questions = generateBalancedMoveQuestions(10, ["r"]);
    expect(questions).toHaveLength(10);
    for (const q of questions) {
      expect(q.piece).toBe("r");
    }
  });

  it("generates questions with valid squares", () => {
    const validFiles = ["a", "b", "c", "d", "e", "f", "g", "h"];
    const validRanks = ["1", "2", "3", "4", "5", "6", "7", "8"];
    const questions = generateBalancedMoveQuestions(20);

    for (const q of questions) {
      expect(q.from).toHaveLength(2);
      expect(q.to).toHaveLength(2);
      expect(validFiles).toContain(q.from[0]);
      expect(validRanks).toContain(q.from[1]);
      expect(validFiles).toContain(q.to[0]);
      expect(validRanks).toContain(q.to[1]);
    }
  });

  it("ensures from and to are different for every question", () => {
    const questions = generateBalancedMoveQuestions(30);
    for (const q of questions) {
      expect(q.from).not.toBe(q.to);
    }
  });
});

// ============================================================
// generateLegalMoveQuestion / generateIllegalMoveQuestion
// ============================================================
describe("generateLegalMoveQuestion", () => {
  it("returns a question with the requested piece type", () => {
    for (const piece of PIECE_TYPES) {
      const question = generateLegalMoveQuestion(piece);
      expect(question).not.toBeNull();
      expect(question!.piece).toBe(piece);
    }
  });

  it("generates a legal move", () => {
    // Run multiple times to increase confidence
    for (let i = 0; i < 10; i++) {
      const q = generateLegalMoveQuestion("n");
      expect(q).not.toBeNull();
      if (q) {
        expect(isLegalMove(q.from, q.to, q.piece)).toBe(true);
      }
    }
  });
});

describe("generateIllegalMoveQuestion", () => {
  it("generates an illegal move", () => {
    // Run multiple times to increase confidence
    for (let i = 0; i < 10; i++) {
      const q = generateIllegalMoveQuestion("b");
      expect(q).not.toBeNull();
      if (q) {
        expect(isLegalMove(q.from, q.to, q.piece)).toBe(false);
      }
    }
  });
});

describe("move question generators", () => {
  it("always produce from !== to", () => {
    for (let i = 0; i < 20; i++) {
      const piece = PIECE_TYPES[i % PIECE_TYPES.length];
      const q =
        Math.random() < 0.5
          ? generateLegalMoveQuestion(piece)
          : generateIllegalMoveQuestion(piece);
      expect(q).not.toBeNull();
      if (q) {
        expect(q.from).not.toBe(q.to);
      }
    }
  });
});

/** An rng that returns `values` in order, then keeps returning the last. */
function sequence(...values: number[]): RandomSource {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}

/** A small deterministic rng (LCG) for tests that need many varied draws. */
function seeded(seed: number): RandomSource {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 2 ** 32;
    return state / 2 ** 32;
  };
}

describe("generateBalancedMoveQuestions with a controlled rng", () => {
  it("makes exactly half the questions legal, rounding down", () => {
    for (const count of [7, 10]) {
      const questions = generateBalancedMoveQuestions(
        count,
        undefined,
        seeded(count),
      );
      const legal = questions.filter((q) => isLegalMove(q.from, q.to, q.piece));
      expect(questions).toHaveLength(count);
      expect(legal).toHaveLength(Math.floor(count / 2));
    }
  });

  it("draws the piece from the whole allowed list", () => {
    const pieces = new Set(
      generateBalancedMoveQuestions(20, ["n", "r"], seeded(1)).map(
        (q) => q.piece,
      ),
    );
    expect(pieces).toEqual(new Set(["n", "r"]));
  });

  // With the rng stuck at 0 every illegal attempt is a1 → a1, so no illegal
  // question can ever be made.
  it("returns a short batch instead of spinning when questions cannot be made", () => {
    const questions = generateBalancedMoveQuestions(4, ["r"], () => 0);
    expect(questions).toHaveLength(2);
    for (const q of questions) {
      expect(isLegalMove(q.from, q.to, q.piece)).toBe(true);
    }
  });
});

describe("move question generators with a controlled rng", () => {
  it("draws the origin square from the whole board", () => {
    // Origin file, origin rank, then the pick among the king's moves.
    expect(generateLegalMoveQuestion("k", sequence(0.99, 0.99, 0))?.from).toBe(
      "h8",
    );
  });

  it("draws a legal target from all of the piece's moves", () => {
    const moves = getMovesForPiece("r", 0, 0);
    expect(generateLegalMoveQuestion("r", sequence(0, 0, 0.99))).toEqual({
      from: "a1",
      to: moves[moves.length - 1],
      piece: "r",
    });
  });

  it("skips a target on the origin and a legal target when asked for an illegal move", () => {
    // Attempt 1: a1 → a1. Attempt 2: a1 → a8, legal for a rook.
    // Attempt 3: a1 → h8.
    const rng = sequence(0, 0, 0, 0, 0, 0, 0, 0.99, 0, 0, 0.99, 0.99);
    expect(generateIllegalMoveQuestion("r", rng)).toEqual({
      from: "a1",
      to: "h8",
      piece: "r",
    });
  });

  it("gives up with null when every attempt fails", () => {
    expect(generateIllegalMoveQuestion("r", () => 0)).toBeNull();
  });
});

// ============================================================
// Constants and types
// ============================================================
describe("PIECE_TYPES", () => {
  it("contains exactly the five standard chess piece types", () => {
    expect(PIECE_TYPES).toEqual(["b", "n", "r", "q", "k"]);
  });

  it("has length 5", () => {
    expect(PIECE_TYPES).toHaveLength(5);
  });
});

describe("pieceDisplayMap", () => {
  it("maps every PieceType to a Unicode chess symbol", () => {
    expect(pieceDisplayMap.b).toBe("\u2657");
    expect(pieceDisplayMap.n).toBe("\u2658");
    expect(pieceDisplayMap.r).toBe("\u2656");
    expect(pieceDisplayMap.q).toBe("\u2655");
    expect(pieceDisplayMap.k).toBe("\u2654");
  });

  it("has an entry for every PIECE_TYPE", () => {
    for (const piece of PIECE_TYPES) {
      expect(pieceDisplayMap[piece]).toBeDefined();
    }
  });
});
