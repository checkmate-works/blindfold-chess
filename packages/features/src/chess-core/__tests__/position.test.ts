import { describe, expect, it } from "vitest";

import {
  isCheckmate,
  isStalemate,
  isCheck,
  isDraw,
  isInsufficientMaterial,
  isGameOver,
  isSquareAttacked,
  findKingSquare,
  validatePosition,
} from "../position";
import { getStartingFen } from "../fen";

const STARTING_FEN = getStartingFen();

// ============================================================
// isCheckmate
// ============================================================
describe("isCheckmate", () => {
  it("returns false for the starting position", () => {
    expect(isCheckmate(STARTING_FEN)).toBe(false);
  });

  it("returns true for a checkmate position (fool's mate)", () => {
    // After 1. f3 e5 2. g4 Qh4# — white is checkmated
    const foolsMateFen =
      "rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3";
    expect(isCheckmate(foolsMateFen)).toBe(true);
  });
});

// ============================================================
// isStalemate
// ============================================================
describe("isStalemate", () => {
  it("returns false for the starting position", () => {
    expect(isStalemate(STARTING_FEN)).toBe(false);
  });

  it("returns true for a stalemate position", () => {
    // King on a8, white queen on b6, white king on c8 — black to move, stalemate
    const stalemateFen = "k7/8/1Q6/8/8/8/8/2K5 b - - 0 1";
    expect(isStalemate(stalemateFen)).toBe(true);
  });
});

// ============================================================
// isCheck
// ============================================================
describe("isCheck", () => {
  it("returns false for the starting position", () => {
    expect(isCheck(STARTING_FEN)).toBe(false);
  });

  it("returns true when a king is in check", () => {
    // White queen on e7 checking black king on e8
    const checkFen =
      "rnbqk1nr/ppppQppp/8/4p3/2B1P1b1/8/PPPP1PPP/RNB1K1NR b KQkq - 0 1";
    expect(isCheck(checkFen)).toBe(true);
  });
});

// ============================================================
// isDraw
// ============================================================
describe("isDraw", () => {
  it("returns false for the starting position", () => {
    expect(isDraw(STARTING_FEN)).toBe(false);
  });

  it("returns true for a stalemate (which is a draw)", () => {
    const stalemateFen = "k7/8/1Q6/8/8/8/8/2K5 b - - 0 1";
    expect(isDraw(stalemateFen)).toBe(true);
  });

  it("returns true for king vs king (insufficient material)", () => {
    const kvkFen = "k7/8/8/8/8/8/8/K7 w - - 0 1";
    expect(isDraw(kvkFen)).toBe(true);
  });
});

// ============================================================
// isInsufficientMaterial
// ============================================================
describe("isInsufficientMaterial", () => {
  it("returns false for the starting position", () => {
    expect(isInsufficientMaterial(STARTING_FEN)).toBe(false);
  });

  it("returns true for king vs king", () => {
    const kvkFen = "k7/8/8/8/8/8/8/K7 w - - 0 1";
    expect(isInsufficientMaterial(kvkFen)).toBe(true);
  });

  it("returns true for king + bishop vs king", () => {
    const kbvkFen = "k7/8/8/8/8/8/8/KB6 w - - 0 1";
    expect(isInsufficientMaterial(kbvkFen)).toBe(true);
  });

  it("returns true for king + knight vs king", () => {
    const knvkFen = "k7/8/8/8/8/8/8/KN6 w - - 0 1";
    expect(isInsufficientMaterial(knvkFen)).toBe(true);
  });

  it("returns false when there are sufficient pieces", () => {
    const sufficientFen = "k7/8/8/8/8/8/8/KRR5 w - - 0 1";
    expect(isInsufficientMaterial(sufficientFen)).toBe(false);
  });
});

// ============================================================
// isGameOver
// ============================================================
describe("isGameOver", () => {
  it("returns false for the starting position", () => {
    expect(isGameOver(STARTING_FEN)).toBe(false);
  });

  it("returns true for a checkmate", () => {
    const foolsMateFen =
      "rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3";
    expect(isGameOver(foolsMateFen)).toBe(true);
  });

  it("returns true for a stalemate", () => {
    const stalemateFen = "k7/8/1Q6/8/8/8/8/2K5 b - - 0 1";
    expect(isGameOver(stalemateFen)).toBe(true);
  });

  it("returns true for insufficient material", () => {
    const kvkFen = "k7/8/8/8/8/8/8/K7 w - - 0 1";
    expect(isGameOver(kvkFen)).toBe(true);
  });
});

// ============================================================
// isSquareAttacked
// ============================================================
describe("isSquareAttacked", () => {
  it("returns true for e2 attacked by white in starting position", () => {
    // White king on e1 attacks e2
    expect(isSquareAttacked(STARTING_FEN, "e2", "w")).toBe(true);
  });

  it("returns true for d3 attacked by white (pawn on e2 can attack d3)", () => {
    // Actually, in starting position, the e2 pawn can attack d3
    expect(isSquareAttacked(STARTING_FEN, "d3", "w")).toBe(true);
  });

  it("returns false for e5 attacked by white in starting position", () => {
    // No white piece attacks e5 in the starting position
    expect(isSquareAttacked(STARTING_FEN, "e5", "w")).toBe(false);
  });

  it("returns true for e7 attacked by black in starting position", () => {
    expect(isSquareAttacked(STARTING_FEN, "e7", "b")).toBe(true);
  });
});

// ============================================================
// findKingSquare
// ============================================================
describe("findKingSquare", () => {
  it("finds the white king at e1 in the starting position", () => {
    expect(findKingSquare(STARTING_FEN, "w")).toBe("e1");
  });

  it("finds the black king at e8 in the starting position", () => {
    expect(findKingSquare(STARTING_FEN, "b")).toBe("e8");
  });

  it("finds the king at a non-standard position", () => {
    const customFen = "8/8/8/4k3/8/8/8/4K3 w - - 0 1";
    expect(findKingSquare(customFen, "w")).toBe("e1");
    expect(findKingSquare(customFen, "b")).toBe("e5");
  });
});

// ============================================================
// validatePosition
// ============================================================
describe("validatePosition", () => {
  it("returns valid for the starting position", () => {
    const result = validatePosition(STARTING_FEN, STARTING_FEN);
    expect(result.valid).toBe(true);
  });

  it("returns invalid with positionEmpty for an empty board", () => {
    const emptyFen = "8/8/8/8/8/8/8/8 w - - 0 1";
    const result = validatePosition(emptyFen, emptyFen);
    expect(result.valid).toBe(false);
    expect(result.errorKey).toBe("positionEmpty");
  });

  it("returns invalid with positionAlreadyCheckmate for a checkmate position", () => {
    const checkmateFen =
      "rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3";
    const result = validatePosition(checkmateFen, checkmateFen);
    expect(result.valid).toBe(false);
    expect(result.errorKey).toBe("positionAlreadyCheckmate");
  });

  it("returns invalid with positionAlreadyStalemate for a stalemate position", () => {
    const stalemateFen = "k7/8/1Q6/8/8/8/8/2K5 b - - 0 1";
    const result = validatePosition(stalemateFen, stalemateFen);
    expect(result.valid).toBe(false);
    expect(result.errorKey).toBe("positionAlreadyStalemate");
  });

  it("returns invalid with positionInsufficientMaterial for K vs K", () => {
    const kvkFen = "k7/8/8/8/8/8/8/K7 w - - 0 1";
    const result = validatePosition(kvkFen, kvkFen);
    expect(result.valid).toBe(false);
    expect(result.errorKey).toBe("positionInsufficientMaterial");
  });

  it("returns valid with correctedColor when opponent's king is in check", () => {
    // White to move, but white's king is attacked by black — need color swap
    // Position: black queen attacks white king, but it's listed as white's turn
    // We need a position where the non-moving side's king is in check
    // This means if it's white's turn, the black king should be in check (impossible normally)
    // Let's create: white to move, but black king is in check from white piece
    const _fenWithWrongTurn =
      "rnbqk1nr/pppp1ppp/8/4p3/1b1PP3/8/PPP2PPP/RNBQKBNR b KQkq - 0 1";
    // Actually, the key concept is: the side NOT to move has their king in check
    // This would be an "illegal" position that validatePosition tries to correct
    // For example: "4k3/8/8/8/8/8/4R3/4K3 b - - 0 1" — black to move but black king is not in check (rook on e2)
    // Let's use: white to move, but the black king is attacked by white
    const correctedFen = "4k3/4R3/8/8/8/8/8/4K3 w - - 0 1";
    // Here white to move, Rook on e7 checks black king on e8
    // The opponent (black) king is in check while it's white's turn — validatePosition should detect this
    const result = validatePosition(correctedFen, correctedFen);
    expect(result.valid).toBe(true);
    expect(result.correctedColor).toBe("black");
  });

  it("returns invalid for a position with invalid FEN", () => {
    const result = validatePosition("invalid", "invalid");
    expect(result.valid).toBe(false);
    expect(result.errorKey).toBe("positionInvalid");
  });
});
