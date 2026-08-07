import { describe, expect, it } from "vitest";

import { validatePosition } from "../position";
import { getStartingFen } from "../fen";

const STARTING_FEN = getStartingFen();

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
    if (result.valid) throw new Error("expected invalid result");
    expect(result.errorKey).toBe("positionEmpty");
  });

  it("returns invalid with positionAlreadyCheckmate for a checkmate position", () => {
    const checkmateFen =
      "rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3";
    const result = validatePosition(checkmateFen, checkmateFen);
    expect(result.valid).toBe(false);
    if (result.valid) throw new Error("expected invalid result");
    expect(result.errorKey).toBe("positionAlreadyCheckmate");
  });

  it("returns invalid with positionAlreadyStalemate for a stalemate position", () => {
    const stalemateFen = "k7/8/1Q6/8/8/8/8/2K5 b - - 0 1";
    const result = validatePosition(stalemateFen, stalemateFen);
    expect(result.valid).toBe(false);
    if (result.valid) throw new Error("expected invalid result");
    expect(result.errorKey).toBe("positionAlreadyStalemate");
  });

  it("returns invalid with positionInsufficientMaterial for K vs K", () => {
    const kvkFen = "k7/8/8/8/8/8/8/K7 w - - 0 1";
    const result = validatePosition(kvkFen, kvkFen);
    expect(result.valid).toBe(false);
    if (result.valid) throw new Error("expected invalid result");
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
    if (!result.valid) throw new Error("expected valid result");
    expect(result.correctedColor).toBe("black");
  });

  it("returns invalid for a position with invalid FEN", () => {
    const result = validatePosition("invalid", "invalid");
    expect(result.valid).toBe(false);
    if (result.valid) throw new Error("expected invalid result");
    expect(result.errorKey).toBe("positionInvalid");
  });
});
