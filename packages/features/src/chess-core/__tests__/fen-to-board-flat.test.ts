import { describe, expect, it } from "vitest";

import { fenToBoardFlat, getStartingFen } from "../fen";

// ============================================================
// fenToBoardFlat
// ============================================================
describe("fenToBoardFlat", () => {
  describe("array structure", () => {
    it("always returns an array of length 64", () => {
      const board = fenToBoardFlat(getStartingFen());
      expect(board).toHaveLength(64);
    });

    it("returns an array of length 64 for an empty board", () => {
      const board = fenToBoardFlat("8/8/8/8/8/8/8/8");
      expect(board).toHaveLength(64);
    });
  });

  describe("starting position", () => {
    const startingFen =
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

    it("has black rook at a8 (index 0)", () => {
      const board = fenToBoardFlat(startingFen);
      expect(board[0]).toBe("r");
    });

    it("has black knight at b8 (index 1)", () => {
      const board = fenToBoardFlat(startingFen);
      expect(board[1]).toBe("n");
    });

    it("has black bishop at c8 (index 2)", () => {
      const board = fenToBoardFlat(startingFen);
      expect(board[2]).toBe("b");
    });

    it("has black queen at d8 (index 3)", () => {
      const board = fenToBoardFlat(startingFen);
      expect(board[3]).toBe("q");
    });

    it("has black king at e8 (index 4)", () => {
      const board = fenToBoardFlat(startingFen);
      expect(board[4]).toBe("k");
    });

    it("has black pawns on rank 7 (indices 8-15)", () => {
      const board = fenToBoardFlat(startingFen);
      for (let i = 8; i <= 15; i++) {
        expect(board[i]).toBe("p");
      }
    });

    it("has white pawns on rank 2 (indices 48-55)", () => {
      const board = fenToBoardFlat(startingFen);
      for (let i = 48; i <= 55; i++) {
        expect(board[i]).toBe("P");
      }
    });

    it("has white rook at a1 (index 56)", () => {
      const board = fenToBoardFlat(startingFen);
      expect(board[56]).toBe("R");
    });

    it("has white king at e1 (index 60)", () => {
      const board = fenToBoardFlat(startingFen);
      expect(board[60]).toBe("K");
    });

    it("has white rook at h1 (index 63)", () => {
      const board = fenToBoardFlat(startingFen);
      expect(board[63]).toBe("R");
    });

    it("has empty squares in the middle (indices 16-47)", () => {
      const board = fenToBoardFlat(startingFen);
      for (let i = 16; i <= 47; i++) {
        expect(board[i]).toBe("");
      }
    });
  });

  describe("empty board", () => {
    it("returns all empty strings for an empty board FEN", () => {
      const board = fenToBoardFlat("8/8/8/8/8/8/8/8");
      for (let i = 0; i < 64; i++) {
        expect(board[i]).toBe("");
      }
    });
  });

  describe("partial FEN (piece placement only, no side/castling info)", () => {
    it("parses correctly with only the piece placement section", () => {
      const board = fenToBoardFlat(
        "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR",
      );
      expect(board[0]).toBe("r");
      expect(board[63]).toBe("R");
      expect(board).toHaveLength(64);
    });
  });

  describe("various piece configurations", () => {
    it("correctly parses a position after 1.e4", () => {
      const board = fenToBoardFlat(
        "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
      );
      // e4 pawn at index 36 (rank 4, file e: row 4 * 8 + 4 = 36)
      expect(board[36]).toBe("P");
      // e2 should now be empty (index 52)
      expect(board[52]).toBe("");
    });

    it("correctly parses a position with a single king", () => {
      const board = fenToBoardFlat("8/8/8/4K3/8/8/8/8 w - - 0 1");
      // King at e5: row 3 (rank 5 from top=rank 5), file e=4 -> index 3*8+4=28
      expect(board[28]).toBe("K");
      // All other squares should be empty
      const nonEmpty = board.filter((piece) => piece !== "");
      expect(nonEmpty).toHaveLength(1);
    });

    it("correctly parses a Sicilian Defense position", () => {
      const board = fenToBoardFlat(
        "rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2",
      );
      // c5 pawn (black) at index 26 (row 3 * 8 + 2 = 26)
      expect(board[26]).toBe("p");
      // e4 pawn (white) at index 36
      expect(board[36]).toBe("P");
    });

    it("uses uppercase for white pieces and lowercase for black", () => {
      const board = fenToBoardFlat(getStartingFen());
      // White pieces (rank 1, indices 56-63) are uppercase
      expect(board[56]).toMatch(/^[A-Z]$/);
      expect(board[60]).toMatch(/^[A-Z]$/);
      // Black pieces (rank 8, indices 0-7) are lowercase
      expect(board[0]).toMatch(/^[a-z]$/);
      expect(board[4]).toMatch(/^[a-z]$/);
    });
  });
});
