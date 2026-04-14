import { describe, expect, it } from "vitest";

import { boardFlatToFen, fenToBoardFlat, getStartingFen } from "../fen";

// ============================================================
// boardFlatToFen
// ============================================================
describe("boardFlatToFen", () => {
  describe("round-trip with fenToBoardFlat", () => {
    it("preserves the starting position placement", () => {
      const startingFen = getStartingFen();
      const board = fenToBoardFlat(startingFen);
      const fen = boardFlatToFen(board);
      expect(fen.split(" ")[0]).toBe(startingFen.split(" ")[0]);
    });

    it("preserves a position after 1.e4", () => {
      const src = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1";
      const board = fenToBoardFlat(src);
      const fen = boardFlatToFen(board);
      expect(fen.split(" ")[0]).toBe(src.split(" ")[0]);
    });
  });

  describe("empty board", () => {
    it("returns all-empty ranks for an empty board", () => {
      const board: string[] = new Array(64).fill("");
      const fen = boardFlatToFen(board);
      expect(fen).toBe("8/8/8/8/8/8/8/8 w - - 0 1");
    });
  });

  describe("default game state suffix", () => {
    it("appends ' w - - 0 1' when no preserveFrom is given", () => {
      const board = fenToBoardFlat(getStartingFen());
      const fen = boardFlatToFen(board);
      expect(fen.endsWith(" w - - 0 1")).toBe(true);
    });
  });

  describe("preserveFrom option", () => {
    it("copies side-to-move, castling, en passant, halfmove and fullmove from the source FEN", () => {
      const src =
        "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 5 42";
      const board = fenToBoardFlat(src);
      const fen = boardFlatToFen(board, { preserveFrom: src });
      expect(fen).toBe(src);
    });

    it("falls back to the default suffix when preserveFrom is a partial FEN", () => {
      const board = fenToBoardFlat(getStartingFen());
      const fen = boardFlatToFen(board, {
        preserveFrom: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR",
      });
      expect(fen.endsWith(" w - - 0 1")).toBe(true);
    });
  });

  describe("empty-run compression", () => {
    it("merges runs of empty squares into a single digit", () => {
      const board: string[] = new Array(64).fill("");
      // Place a white king at e1 (index 60)
      board[60] = "K";
      const fen = boardFlatToFen(board);
      expect(fen.split(" ")[0]).toBe("8/8/8/8/8/8/8/4K3");
    });
  });
});
