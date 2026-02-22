import { describe, expect, it } from "vitest";

import {
  validateFen,
  fenToBoard,
  getTurnFromFen,
  getFenAfterMoves,
  getStartingFen,
} from "../fen";

// ============================================================
// getStartingFen
// ============================================================
describe("getStartingFen", () => {
  it("returns the standard starting FEN", () => {
    expect(getStartingFen()).toBe(
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    );
  });
});

// ============================================================
// validateFen
// ============================================================
describe("validateFen", () => {
  it("returns true for a valid starting position FEN", () => {
    expect(validateFen(getStartingFen())).toBe(true);
  });

  it("returns true for a valid mid-game FEN", () => {
    expect(
      validateFen(
        "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
      ),
    ).toBe(true);
  });

  it("returns false for an empty string", () => {
    expect(validateFen("")).toBe(false);
  });

  it("returns false for a whitespace-only string", () => {
    expect(validateFen("   ")).toBe(false);
  });

  it("returns false for a completely invalid string", () => {
    expect(validateFen("not a fen string")).toBe(false);
  });

  it("returns false for an incomplete FEN", () => {
    expect(validateFen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR")).toBe(
      false,
    );
  });

  it("returns true for a FEN with black to move", () => {
    expect(
      validateFen("rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"),
    ).toBe(true);
  });

  it("returns true for a FEN with no castling rights", () => {
    expect(
      validateFen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w - - 0 1"),
    ).toBe(true);
  });
});

// ============================================================
// fenToBoard
// ============================================================
describe("fenToBoard", () => {
  it("returns an 8x8 array", () => {
    const board = fenToBoard(getStartingFen());
    expect(board).toHaveLength(8);
    for (const row of board) {
      expect(row).toHaveLength(8);
    }
  });

  it("has a white rook at a1 in the starting position", () => {
    const board = fenToBoard(getStartingFen());
    const a1 = board[7][0];
    expect(a1).not.toBeNull();
    expect(a1!.type).toBe("r");
    expect(a1!.color).toBe("w");
  });

  it("has a black king at e8 in the starting position", () => {
    const board = fenToBoard(getStartingFen());
    const e8 = board[0][4];
    expect(e8).not.toBeNull();
    expect(e8!.type).toBe("k");
    expect(e8!.color).toBe("b");
  });

  it("has null for empty squares", () => {
    const board = fenToBoard(getStartingFen());
    // Row index 2 (rank 6 from black's perspective, rank 3 actually) should be empty
    const emptySquare = board[3][0];
    expect(emptySquare).toBeNull();
  });

  it("throws for an invalid FEN", () => {
    expect(() => fenToBoard("invalid")).toThrow();
  });
});

// ============================================================
// getTurnFromFen
// ============================================================
describe("getTurnFromFen", () => {
  it("returns 'w' for starting position", () => {
    expect(getTurnFromFen(getStartingFen())).toBe("w");
  });

  it("returns 'b' when it is black's turn", () => {
    expect(
      getTurnFromFen(
        "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
      ),
    ).toBe("b");
  });

  it("throws for an invalid FEN", () => {
    expect(() => getTurnFromFen("invalid")).toThrow();
  });
});

// ============================================================
// getFenAfterMoves
// ============================================================
describe("getFenAfterMoves", () => {
  it("returns starting FEN when no moves are applied", () => {
    const result = getFenAfterMoves(getStartingFen(), []);
    expect(result).toBe(getStartingFen());
  });

  it("correctly applies a single move", () => {
    const result = getFenAfterMoves(getStartingFen(), ["e4"]);
    expect(result).toContain("4P3");
    expect(result).toContain("b KQkq");
  });

  it("correctly applies multiple moves", () => {
    const result = getFenAfterMoves(getStartingFen(), ["e4", "e5", "Nf3"]);
    expect(result).toBe(
      "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2",
    );
  });

  it("throws for an invalid move in the sequence", () => {
    expect(() =>
      getFenAfterMoves(getStartingFen(), ["e4", "invalidmove"]),
    ).toThrow();
  });

  it("works with a custom starting FEN", () => {
    const customFen =
      "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1";
    const result = getFenAfterMoves(customFen, ["e5"]);
    expect(result).toContain("4p3");
  });
});
