import { describe, expect, it } from "vitest";

import {
  validateMoveSequence,
  executeMove,
  getLegalMoves,
  movesToUci,
  uciToAlgebraic,
  getLastMoveDetails,
  replayMoves,
} from "../moves";
import { getStartingFen } from "../fen";

const STARTING_FEN = getStartingFen();

// ============================================================
// validateMoveSequence
// ============================================================
describe("validateMoveSequence", () => {
  it("returns valid for an empty move list", () => {
    const result = validateMoveSequence(STARTING_FEN, []);
    expect(result.valid).toBe(true);
    expect(result.validMoves).toEqual([]);
  });

  it("returns valid for a correct sequence of moves", () => {
    const result = validateMoveSequence(STARTING_FEN, ["e4", "e5", "Nf3"]);
    expect(result.valid).toBe(true);
    expect(result.validMoves).toEqual(["e4", "e5", "Nf3"]);
  });

  it("returns invalid with the correct error for a bad move", () => {
    const result = validateMoveSequence(STARTING_FEN, ["e4", "Nf3"]);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Nf3");
    expect(result.error).toContain("index 1");
    expect(result.validMoves).toEqual(["e4"]);
  });

  it("returns invalid for a completely illegal move", () => {
    const result = validateMoveSequence(STARTING_FEN, ["Ke2"]);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Ke2");
  });

  it("returns invalid for a nonsense string", () => {
    const result = validateMoveSequence(STARTING_FEN, ["xyz"]);
    expect(result.valid).toBe(false);
  });

  it("tracks valid moves up to the point of failure", () => {
    const result = validateMoveSequence(STARTING_FEN, [
      "e4",
      "e5",
      "Nf3",
      "badmove",
    ]);
    expect(result.valid).toBe(false);
    expect(result.validMoves).toEqual(["e4", "e5", "Nf3"]);
  });

  // Regression: user-reported puzzle-builder case. The third move `Bg3` is
  // illegal from this position for both black bishops (d7 and g5 cannot reach
  // g3 — wrong color square for d7, non-diagonal for g5). Guards against any
  // future relaxation of SAN parsing that might ambiguously resolve `Bg3` to
  // a different piece's move.
  it("rejects an illegal bishop move in a mid-game puzzle position", () => {
    const fen =
      "r2q1rk1/2pb1ppn/pp1p3p/6b1/2P1P1N1/1P1P3P/PB1N1RP1/R2Q2K1 b - - 4 16";
    const result = validateMoveSequence(fen, ["h5", "Nh2", "Bg3"]);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Bg3");
    expect(result.error).toContain("index 2");
    expect(result.validMoves).toEqual(["h5", "Nh2"]);
  });
});

// ============================================================
// executeMove
// ============================================================
describe("executeMove", () => {
  it("returns the new FEN and move result for a valid move", () => {
    const result = executeMove(STARTING_FEN, "e4");
    expect(result).not.toBeNull();
    expect(result!.fen).toContain("4P3");
    expect(result!.moveResult.san).toBe("e4");
    expect(result!.moveResult.from).toBe("e2");
    expect(result!.moveResult.to).toBe("e4");
    expect(result!.moveResult.color).toBe("w");
    expect(result!.moveResult.piece).toBe("p");
  });

  it("returns null for an invalid move", () => {
    const result = executeMove(STARTING_FEN, "e5");
    expect(result).toBeNull();
  });

  it("returns null for a nonsense move", () => {
    const result = executeMove(STARTING_FEN, "zz9");
    expect(result).toBeNull();
  });

  it("correctly reports a capture", () => {
    // After 1. e4 e5 2. d4, black can capture with exd4
    const fenBeforeCapture =
      "rnbqkbnr/pppp1ppp/8/4p3/3PP3/8/PPP2PPP/RNBQKBNR b KQkq d3 0 2";
    const result = executeMove(fenBeforeCapture, "exd4");
    expect(result).not.toBeNull();
    expect(result!.moveResult.captured).toBe("p");
  });

  it("returns null for an invalid FEN", () => {
    const result = executeMove("invalid-fen", "e4");
    expect(result).toBeNull();
  });
});

// ============================================================
// getLegalMoves
// ============================================================
describe("getLegalMoves", () => {
  it("returns 20 legal moves from the starting position", () => {
    const moves = getLegalMoves(STARTING_FEN);
    expect(moves).toHaveLength(20);
  });

  it("includes common opening moves", () => {
    const moves = getLegalMoves(STARTING_FEN);
    expect(moves).toContain("e4");
    expect(moves).toContain("d4");
    expect(moves).toContain("Nf3");
  });

  it("returns verbose move objects when verbose option is set", () => {
    const moves = getLegalMoves(STARTING_FEN, { verbose: true });
    expect(moves.length).toBeGreaterThan(0);
  });

  it("returns zero moves in a checkmate position", () => {
    // Scholar's mate final position
    const checkmateFen =
      "rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3";
    const moves = getLegalMoves(checkmateFen);
    expect(moves).toHaveLength(0);
  });
});

// ============================================================
// movesToUci
// ============================================================
describe("movesToUci", () => {
  it("converts algebraic moves to UCI format", () => {
    const uci = movesToUci(["e4", "e5", "Nf3"]);
    expect(uci).toEqual(["e2e4", "e7e5", "g1f3"]);
  });

  it("returns empty array for empty input", () => {
    const uci = movesToUci([]);
    expect(uci).toEqual([]);
  });

  it("stops at an invalid move and returns valid moves up to that point", () => {
    const uci = movesToUci(["e4", "badmove", "Nf3"]);
    expect(uci).toEqual(["e2e4"]);
  });

  it("uses a custom starting FEN when provided", () => {
    const customFen =
      "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1";
    const uci = movesToUci(["e5"], customFen);
    expect(uci).toEqual(["e7e5"]);
  });

  it("includes promotion in UCI notation", () => {
    // Position where white pawn can promote. We need the black king away from e8
    const promotionFen = "1k6/4P3/8/8/8/8/8/4K3 w - - 0 1";
    const uci = movesToUci(["e8=Q"], promotionFen);
    expect(uci).toEqual(["e7e8q"]);
  });
});

// ============================================================
// uciToAlgebraic
// ============================================================
describe("uciToAlgebraic", () => {
  it("converts a UCI pawn move to algebraic", () => {
    const san = uciToAlgebraic("e2e4", STARTING_FEN);
    expect(san).toBe("e4");
  });

  it("converts a UCI knight move to algebraic", () => {
    const san = uciToAlgebraic("g1f3", STARTING_FEN);
    expect(san).toBe("Nf3");
  });

  it("throws for an invalid UCI move", () => {
    expect(() => uciToAlgebraic("invalid", STARTING_FEN)).toThrow();
  });

  it("throws for an illegal UCI move", () => {
    expect(() => uciToAlgebraic("e1e8", STARTING_FEN)).toThrow();
  });
});

// ============================================================
// getLastMoveDetails
// ============================================================
describe("getLastMoveDetails", () => {
  it("returns null for an empty move list", () => {
    expect(getLastMoveDetails([])).toBeNull();
  });

  it("returns the from/to of the last move", () => {
    const details = getLastMoveDetails(["e4", "e5", "Nf3"]);
    expect(details).toEqual({ from: "g1", to: "f3" });
  });

  it("returns the from/to of a single move", () => {
    const details = getLastMoveDetails(["e4"]);
    expect(details).toEqual({ from: "e2", to: "e4" });
  });

  it("returns null when a move in the sequence is invalid", () => {
    const details = getLastMoveDetails(["e4", "invalidmove"]);
    expect(details).toBeNull();
  });

  it("works with a custom starting FEN", () => {
    const customFen =
      "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1";
    const details = getLastMoveDetails(["e5"], customFen);
    expect(details).toEqual({ from: "e7", to: "e5" });
  });
});

// ============================================================
// replayMoves
// ============================================================
describe("replayMoves", () => {
  it("returns only the initial position for empty moves", () => {
    const positions = replayMoves([]);
    expect(positions).toHaveLength(1);
    expect(positions[0].fen).toBe(STARTING_FEN);
    expect(positions[0].lastMove).toBeUndefined();
  });

  it("returns n+1 positions for n valid moves", () => {
    const positions = replayMoves(["e4", "e5", "Nf3"]);
    expect(positions).toHaveLength(4);
  });

  it("includes lastMove info for each move after the initial position", () => {
    const positions = replayMoves(["e4", "e5"]);
    expect(positions[0].lastMove).toBeUndefined();
    expect(positions[1].lastMove).toEqual({ from: "e2", to: "e4" });
    expect(positions[2].lastMove).toEqual({ from: "e7", to: "e5" });
  });

  it("stops at an invalid move and returns positions up to that point", () => {
    const positions = replayMoves(["e4", "badmove", "Nf3"]);
    expect(positions).toHaveLength(2); // initial + after e4
  });

  it("works with a custom starting FEN", () => {
    const customFen =
      "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";
    const positions = replayMoves(["e5"], customFen);
    expect(positions).toHaveLength(2);
    expect(positions[0].fen).toBe(customFen);
    expect(positions[1].lastMove).toEqual({ from: "e7", to: "e5" });
  });
});
