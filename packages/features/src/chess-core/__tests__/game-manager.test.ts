import { describe, expect, it } from "vitest";

import { ChessGameManager } from "../game-manager";
import { getStartingFen } from "../fen";

const STARTING_FEN = getStartingFen();

// ============================================================
// ChessGameManager
// ============================================================
describe("ChessGameManager", () => {
  // ----------------------------------------------------------
  // Construction
  // ----------------------------------------------------------
  describe("constructor", () => {
    it("initializes to the starting position by default", () => {
      const mgr = new ChessGameManager();
      expect(mgr.fen()).toBe(STARTING_FEN);
    });

    it("initializes from a custom FEN", () => {
      const customFen =
        "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";
      const mgr = new ChessGameManager(customFen);
      expect(mgr.fen()).toBe(customFen);
    });

    it("throws for an invalid FEN", () => {
      expect(() => new ChessGameManager("invalid-fen")).toThrow();
    });
  });

  // ----------------------------------------------------------
  // move
  // ----------------------------------------------------------
  describe("move", () => {
    it("executes a valid move and returns move result", () => {
      const mgr = new ChessGameManager();
      const result = mgr.move("e4");
      expect(result.san).toBe("e4");
      expect(result.from).toBe("e2");
      expect(result.to).toBe("e4");
      expect(result.color).toBe("w");
      expect(result.piece).toBe("p");
    });

    it("updates the FEN after a move", () => {
      const mgr = new ChessGameManager();
      mgr.move("e4");
      expect(mgr.fen()).not.toBe(STARTING_FEN);
      expect(mgr.fen()).toContain("4P3");
    });

    it("throws for an invalid move", () => {
      const mgr = new ChessGameManager();
      expect(() => mgr.move("e5")).toThrow();
    });

    it("correctly reports captures", () => {
      const mgr = new ChessGameManager();
      mgr.move("e4");
      mgr.move("d5");
      const result = mgr.move("exd5");
      expect(result.captured).toBe("p");
    });
  });

  // ----------------------------------------------------------
  // undo
  // ----------------------------------------------------------
  describe("undo", () => {
    it("reverts the last move", () => {
      const mgr = new ChessGameManager();
      mgr.move("e4");
      mgr.undo();
      expect(mgr.fen()).toBe(STARTING_FEN);
    });

    it("can undo multiple moves", () => {
      const mgr = new ChessGameManager();
      mgr.move("e4");
      mgr.move("e5");
      mgr.undo();
      mgr.undo();
      expect(mgr.fen()).toBe(STARTING_FEN);
    });
  });

  // ----------------------------------------------------------
  // turn
  // ----------------------------------------------------------
  describe("turn", () => {
    it("returns 'w' at the start", () => {
      const mgr = new ChessGameManager();
      expect(mgr.turn()).toBe("w");
    });

    it("returns 'b' after white moves", () => {
      const mgr = new ChessGameManager();
      mgr.move("e4");
      expect(mgr.turn()).toBe("b");
    });

    it("returns 'w' after both sides move", () => {
      const mgr = new ChessGameManager();
      mgr.move("e4");
      mgr.move("e5");
      expect(mgr.turn()).toBe("w");
    });
  });

  // ----------------------------------------------------------
  // moves
  // ----------------------------------------------------------
  describe("moves", () => {
    it("returns 20 legal moves from the starting position", () => {
      const mgr = new ChessGameManager();
      expect(mgr.moves()).toHaveLength(20);
    });

    it("returns verbose move objects when option is set", () => {
      const mgr = new ChessGameManager();
      const verboseMoves = mgr.moves({ verbose: true });
      expect(verboseMoves.length).toBeGreaterThan(0);
    });
  });

  // ----------------------------------------------------------
  // Game state checks
  // ----------------------------------------------------------
  describe("game state checks", () => {
    it("isCheckmate returns false at the start", () => {
      const mgr = new ChessGameManager();
      expect(mgr.isCheckmate()).toBe(false);
    });

    it("isCheckmate returns true in a checkmate position", () => {
      const mgr = new ChessGameManager(
        "rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3",
      );
      expect(mgr.isCheckmate()).toBe(true);
    });

    it("isStalemate returns false at the start", () => {
      const mgr = new ChessGameManager();
      expect(mgr.isStalemate()).toBe(false);
    });

    it("isCheck returns false at the start", () => {
      const mgr = new ChessGameManager();
      expect(mgr.isCheck()).toBe(false);
    });

    it("isGameOver returns false at the start", () => {
      const mgr = new ChessGameManager();
      expect(mgr.isGameOver()).toBe(false);
    });

    it("isDraw returns false at the start", () => {
      const mgr = new ChessGameManager();
      expect(mgr.isDraw()).toBe(false);
    });
  });

  // ----------------------------------------------------------
  // board
  // ----------------------------------------------------------
  describe("board", () => {
    it("returns an 8x8 board array", () => {
      const mgr = new ChessGameManager();
      const board = mgr.board();
      expect(board).toHaveLength(8);
      for (const row of board) {
        expect(row).toHaveLength(8);
      }
    });
  });

  // ----------------------------------------------------------
  // PGN
  // ----------------------------------------------------------
  describe("PGN operations", () => {
    it("loadPgn loads a PGN and updates the position", () => {
      const mgr = new ChessGameManager();
      mgr.loadPgn("1. e4 e5 2. Nf3");
      expect(mgr.turn()).toBe("b");
      expect(mgr.fen()).toContain("5N2");
    });

    it("pgn returns the current game in PGN format", () => {
      const mgr = new ChessGameManager();
      mgr.move("e4");
      mgr.move("e5");
      const pgn = mgr.pgn();
      expect(pgn).toContain("e4");
      expect(pgn).toContain("e5");
    });
  });

  // ----------------------------------------------------------
  // history
  // ----------------------------------------------------------
  describe("history", () => {
    it("returns move strings", () => {
      const mgr = new ChessGameManager();
      mgr.move("e4");
      mgr.move("e5");
      const history = mgr.history();
      expect(history).toEqual(["e4", "e5"]);
    });

    it("returns verbose move objects with the verbose flag", () => {
      const mgr = new ChessGameManager();
      mgr.move("e4");
      const history = mgr.history({ verbose: true });
      expect(history).toHaveLength(1);
      expect(history[0].san).toBe("e4");
      expect(history[0].from).toBe("e2");
      expect(history[0].to).toBe("e4");
    });

    it("returns empty array initially", () => {
      const mgr = new ChessGameManager();
      expect(mgr.history()).toEqual([]);
    });
  });

  // ----------------------------------------------------------
  // header
  // ----------------------------------------------------------
  describe("header", () => {
    it("returns headers from a loaded PGN", () => {
      const mgr = new ChessGameManager();
      mgr.loadPgn('[Event "Test"]\n\n1. e4 e5');
      const headers = mgr.header();
      expect(headers.Event).toBe("Test");
    });
  });

  // ----------------------------------------------------------
  // clear and put
  // ----------------------------------------------------------
  describe("clear and put", () => {
    it("clears the board", () => {
      const mgr = new ChessGameManager();
      mgr.clear();
      const board = mgr.board();
      // All squares should be null after clear
      for (const row of board) {
        for (const cell of row) {
          expect(cell).toBeNull();
        }
      }
    });

    it("places a piece on the board", () => {
      const mgr = new ChessGameManager();
      mgr.clear();
      mgr.put({ type: "k", color: "w" }, "e1");
      mgr.put({ type: "k", color: "b" }, "e8");
      const board = mgr.board();
      // Find white king at e1 (row 7, col 4)
      const e1 = board[7][4];
      expect(e1).not.toBeNull();
      expect(e1!.type).toBe("k");
      expect(e1!.color).toBe("w");
    });
  });
});
