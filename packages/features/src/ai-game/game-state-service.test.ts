import type { AlgebraicNotation } from "@blindfold-chess/types";
import { describe, expect, it } from "vitest";

import { computeGameState, validateGameMove } from "./game-state-service";

describe("game-state-service", () => {
  describe("computeGameState", () => {
    it("should initialize with standard starting position when no args", () => {
      const state = computeGameState();
      expect(state.currentFen).toBe(
        "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      );
    });

    it("should initialize with empty moves array", () => {
      const state = computeGameState([]);
      expect(state.currentFen).toBe(
        "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      );
    });

    it("should replay moves on initialization", () => {
      const moves = ["e4", "e5", "Nf3"] as AlgebraicNotation[];
      const state = computeGameState(moves);
      expect(state.currentTurn).toBe("black");
      expect(state.currentFen).toContain("5N2");
    });

    it("should initialize with custom starting FEN", () => {
      const customFen =
        "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";
      const state = computeGameState([], "white", customFen);
      expect(state.currentTurn).toBe("black");
    });

    it("should handle invalid moves gracefully by stopping at invalid move", () => {
      const moves = ["e4", "e5", "InvalidMove", "Nf3"] as AlgebraicNotation[];
      const state = computeGameState(moves);
      // Should have applied e4 and e5, then stopped at InvalidMove
      expect(state.currentTurn).toBe("white");
    });

    it("should replay moves on top of a custom FEN", () => {
      // Start after 1.e4 (black to move)
      const customFen =
        "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";
      const moves = ["e5"] as AlgebraicNotation[];
      const state = computeGameState(moves, "white", customFen);
      expect(state.currentTurn).toBe("white");
      // Pawn on e5
      expect(state.currentFen).toContain("4p3");
    });

    it("should detect checkmate via Fool's mate", () => {
      const moves = ["f3", "e5", "g4", "Qh4#"] as AlgebraicNotation[];
      const state = computeGameState(moves);
      expect(state.status).toBe("checkmate");
      expect(state.isGameOver).toBe(true);
      expect(state.legalMoves.length).toBe(0);
    });

    it("should return stalemate when no legal moves but not in check", () => {
      const stalemateFen = "7k/8/6QK/8/8/8/8/8 b - - 0 1";
      const state = computeGameState([], "white", stalemateFen);
      expect(state.status).toBe("stalemate");
      expect(state.isGameOver).toBe(true);
      expect(state.playerResult).toBe("draw");
    });

    it("should return draw for insufficient material", () => {
      const drawFen = "8/8/8/4k3/8/8/8/4K3 w - - 0 1";
      const state = computeGameState([], "white", drawFen);
      expect(state.status).toBe("draw");
      expect(state.playerResult).toBe("draw");
    });

    it("should return correct from/to of the last move after multiple moves", () => {
      const moves = ["e4", "e5", "Nf3"] as AlgebraicNotation[];
      const state = computeGameState(moves);
      expect(state.lastMoveDetails).toEqual({ from: "g1", to: "f3" });
    });

    it("should evaluate isPlayerTurn correctly", () => {
      const fenBlackToMove =
        "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";

      const stateWhite = computeGameState([], "white", fenBlackToMove);
      expect(stateWhite.isPlayerTurn).toBe(false);

      const stateBlack = computeGameState([], "black", fenBlackToMove);
      expect(stateBlack.isPlayerTurn).toBe(true);
    });
  });

  describe("validateGameMove", () => {
    it("should return true for legal pawn moves", () => {
      expect(validateGameMove([], "e4" as AlgebraicNotation)).toBe(true);
      expect(validateGameMove([], "d4" as AlgebraicNotation)).toBe(true);
    });

    it("should return true for legal knight moves", () => {
      expect(validateGameMove([], "Nf3" as AlgebraicNotation)).toBe(true);
    });

    it("should return false for illegal moves", () => {
      // Can't move black pawn on white's turn
      expect(validateGameMove([], "e5" as AlgebraicNotation)).toBe(false);
      // Can't move king through pawn
      expect(validateGameMove([], "Ke2" as AlgebraicNotation)).toBe(false);
    });

    it("should return false for invalid notation", () => {
      expect(validateGameMove([], "xyz" as AlgebraicNotation)).toBe(false);
    });

    it("should validate move based on previous move sequence", () => {
      const moves = ["e4"] as AlgebraicNotation[];
      expect(validateGameMove(moves, "e5" as AlgebraicNotation)).toBe(true);
      expect(validateGameMove(moves, "e4" as AlgebraicNotation)).toBe(false); // Can't move same pawn again immediately
    });

    it("should validate castling when legal", () => {
      // Position where white can castle kingside
      const fen =
        "r1bqk2r/ppppbppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4";
      expect(validateGameMove([], "O-O" as AlgebraicNotation, fen)).toBe(true);
    });
  });
});
