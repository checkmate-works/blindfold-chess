import { describe, expect, it } from "vitest";

import { pieceDisplayMap, pieceSymbolMap } from "./constants";
import {
  generateBalancedMoveQuestions,
  generateMoveQuestionForPiece,
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
      expect(isLegalMove("d4", "f6", "bishop")).toBe(true); // up-right
      expect(isLegalMove("d4", "b6", "bishop")).toBe(true); // up-left
      expect(isLegalMove("d4", "f2", "bishop")).toBe(true); // down-right
      expect(isLegalMove("d4", "b2", "bishop")).toBe(true); // down-left
    });

    it("rejects non-diagonal moves", () => {
      expect(isLegalMove("d4", "d6", "bishop")).toBe(false); // vertical
      expect(isLegalMove("d4", "f4", "bishop")).toBe(false); // horizontal
      expect(isLegalMove("d4", "e6", "bishop")).toBe(false); // knight-like
    });

    it("handles moves from the board edge", () => {
      expect(isLegalMove("a1", "h8", "bishop")).toBe(true);
      expect(isLegalMove("h1", "a8", "bishop")).toBe(true);
      expect(isLegalMove("a8", "h1", "bishop")).toBe(true);
      expect(isLegalMove("a1", "b2", "bishop")).toBe(true);
    });
  });

  // ----------------------------------------------------------
  // Knight
  // ----------------------------------------------------------
  describe("knight", () => {
    it("accepts L-shaped moves", () => {
      expect(isLegalMove("d4", "e6", "knight")).toBe(true);
      expect(isLegalMove("d4", "f5", "knight")).toBe(true);
      expect(isLegalMove("d4", "f3", "knight")).toBe(true);
      expect(isLegalMove("d4", "e2", "knight")).toBe(true);
      expect(isLegalMove("d4", "c2", "knight")).toBe(true);
      expect(isLegalMove("d4", "b3", "knight")).toBe(true);
      expect(isLegalMove("d4", "b5", "knight")).toBe(true);
      expect(isLegalMove("d4", "c6", "knight")).toBe(true);
    });

    it("rejects non L-shaped moves", () => {
      expect(isLegalMove("d4", "d5", "knight")).toBe(false); // one square up
      expect(isLegalMove("d4", "e5", "knight")).toBe(false); // diagonal
      expect(isLegalMove("d4", "f6", "knight")).toBe(false); // two diagonal
    });

    it("handles moves from the corner", () => {
      expect(isLegalMove("a1", "b3", "knight")).toBe(true);
      expect(isLegalMove("a1", "c2", "knight")).toBe(true);
      // only 2 legal knight moves from a1
      expect(isLegalMove("a1", "a3", "knight")).toBe(false);
    });
  });

  // ----------------------------------------------------------
  // Rook
  // ----------------------------------------------------------
  describe("rook", () => {
    it("accepts straight line moves", () => {
      expect(isLegalMove("d4", "d8", "rook")).toBe(true); // vertical
      expect(isLegalMove("d4", "a4", "rook")).toBe(true); // horizontal
      expect(isLegalMove("d4", "d1", "rook")).toBe(true);
      expect(isLegalMove("d4", "h4", "rook")).toBe(true);
    });

    it("rejects diagonal moves", () => {
      expect(isLegalMove("d4", "e5", "rook")).toBe(false);
      expect(isLegalMove("d4", "f6", "rook")).toBe(false);
    });

    it("handles moves from the edge", () => {
      expect(isLegalMove("a1", "a8", "rook")).toBe(true);
      expect(isLegalMove("a1", "h1", "rook")).toBe(true);
      expect(isLegalMove("h8", "h1", "rook")).toBe(true);
      expect(isLegalMove("h8", "a8", "rook")).toBe(true);
    });
  });

  // ----------------------------------------------------------
  // Queen
  // ----------------------------------------------------------
  describe("queen", () => {
    it("accepts diagonal moves", () => {
      expect(isLegalMove("d4", "f6", "queen")).toBe(true);
      expect(isLegalMove("d4", "a7", "queen")).toBe(true);
    });

    it("accepts straight line moves", () => {
      expect(isLegalMove("d4", "d8", "queen")).toBe(true);
      expect(isLegalMove("d4", "h4", "queen")).toBe(true);
    });

    it("rejects knight-like moves", () => {
      expect(isLegalMove("d4", "e6", "queen")).toBe(false);
      expect(isLegalMove("d4", "f5", "queen")).toBe(false);
    });
  });

  // ----------------------------------------------------------
  // King
  // ----------------------------------------------------------
  describe("king", () => {
    it("accepts one-square moves in all directions", () => {
      expect(isLegalMove("d4", "d5", "king")).toBe(true); // up
      expect(isLegalMove("d4", "e5", "king")).toBe(true); // up-right
      expect(isLegalMove("d4", "e4", "king")).toBe(true); // right
      expect(isLegalMove("d4", "e3", "king")).toBe(true); // down-right
      expect(isLegalMove("d4", "d3", "king")).toBe(true); // down
      expect(isLegalMove("d4", "c3", "king")).toBe(true); // down-left
      expect(isLegalMove("d4", "c4", "king")).toBe(true); // left
      expect(isLegalMove("d4", "c5", "king")).toBe(true); // up-left
    });

    it("rejects moves more than one square away", () => {
      expect(isLegalMove("d4", "d6", "king")).toBe(false);
      expect(isLegalMove("d4", "f6", "king")).toBe(false);
      expect(isLegalMove("d4", "b2", "king")).toBe(false);
    });

    it("handles moves from the corner", () => {
      expect(isLegalMove("a1", "a2", "king")).toBe(true);
      expect(isLegalMove("a1", "b1", "king")).toBe(true);
      expect(isLegalMove("a1", "b2", "king")).toBe(true);
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
      expect(isLegalMove("e2", "e4", "rook")).toBe(true);
      expect(isLegalMove("b1", "c3", "knight")).toBe(true);
      expect(isLegalMove("c1", "f4", "bishop")).toBe(true);
      expect(isLegalMove("d1", "d7", "queen")).toBe(true);
      expect(isLegalMove("e1", "e2", "king")).toBe(true);
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
    const allowedPieces: PieceType[] = ["knight", "bishop"];
    const questions = generateBalancedMoveQuestions(20, allowedPieces);

    for (const q of questions) {
      expect(allowedPieces).toContain(q.piece);
    }
  });

  it("works with a single allowed piece", () => {
    const questions = generateBalancedMoveQuestions(10, ["rook"]);
    expect(questions).toHaveLength(10);
    for (const q of questions) {
      expect(q.piece).toBe("rook");
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
// generateMoveQuestionForPiece
// ============================================================
describe("generateMoveQuestionForPiece", () => {
  it("returns a question with the requested piece type", () => {
    for (const piece of PIECE_TYPES) {
      const question = generateMoveQuestionForPiece(piece, true);
      expect(question).not.toBeNull();
      expect(question!.piece).toBe(piece);
    }
  });

  it("generates a legal move when preferLegal is true", () => {
    // Run multiple times to increase confidence
    for (let i = 0; i < 10; i++) {
      const q = generateMoveQuestionForPiece("knight", true);
      expect(q).not.toBeNull();
      if (q) {
        expect(isLegalMove(q.from, q.to, q.piece)).toBe(true);
      }
    }
  });

  it("generates an illegal move when preferLegal is false", () => {
    // Run multiple times to increase confidence
    for (let i = 0; i < 10; i++) {
      const q = generateMoveQuestionForPiece("bishop", false);
      expect(q).not.toBeNull();
      if (q) {
        expect(isLegalMove(q.from, q.to, q.piece)).toBe(false);
      }
    }
  });

  it("always produces from !== to", () => {
    for (let i = 0; i < 20; i++) {
      const piece = PIECE_TYPES[i % PIECE_TYPES.length];
      const q = generateMoveQuestionForPiece(piece, Math.random() < 0.5);
      expect(q).not.toBeNull();
      if (q) {
        expect(q.from).not.toBe(q.to);
      }
    }
  });
});

// ============================================================
// Constants and types
// ============================================================
describe("PIECE_TYPES", () => {
  it("contains exactly the five standard chess piece types", () => {
    expect(PIECE_TYPES).toEqual(["bishop", "knight", "rook", "queen", "king"]);
  });

  it("has length 5", () => {
    expect(PIECE_TYPES).toHaveLength(5);
  });
});

describe("pieceSymbolMap", () => {
  it("maps every PieceType to the correct chess.js symbol", () => {
    expect(pieceSymbolMap.bishop).toBe("b");
    expect(pieceSymbolMap.knight).toBe("n");
    expect(pieceSymbolMap.rook).toBe("r");
    expect(pieceSymbolMap.queen).toBe("q");
    expect(pieceSymbolMap.king).toBe("k");
  });

  it("has an entry for every PIECE_TYPE", () => {
    for (const piece of PIECE_TYPES) {
      expect(pieceSymbolMap[piece]).toBeDefined();
    }
  });
});

describe("pieceDisplayMap", () => {
  it("maps every PieceType to a Unicode chess symbol", () => {
    expect(pieceDisplayMap.bishop).toBe("\u2657");
    expect(pieceDisplayMap.knight).toBe("\u2658");
    expect(pieceDisplayMap.rook).toBe("\u2656");
    expect(pieceDisplayMap.queen).toBe("\u2655");
    expect(pieceDisplayMap.king).toBe("\u2654");
  });

  it("has an entry for every PIECE_TYPE", () => {
    for (const piece of PIECE_TYPES) {
      expect(pieceDisplayMap[piece]).toBeDefined();
    }
  });
});
