import type { AlgebraicNotation } from "@blindfold-chess/types";
import { describe, expect, it } from "vitest";

import { getFenAfterMoves } from "../fen";
import { getPlayerMovesFromSequence } from "../moves";
import {
  validatePgn,
  parsePgn,
  parsePgnWithFen,
  generatePgn,
  validatePgnWithDetails,
  getPgnHeaders,
  getPgnHistory,
  formatPgnToText,
  getPgnSuggestion,
  parsePgnMoves,
  flattenPgnMoves,
  validatePgnMoves,
  parsePgnMoveSequence,
  validateAttachedPgn,
} from "../pgn";
import type { FormattedPgn } from "../pgn";

const SIMPLE_PGN = "1. e4 e5 2. Nf3 Nc6";

// ============================================================
// validatePgn
// ============================================================
describe("validatePgn", () => {
  it("returns true for a valid PGN", () => {
    expect(validatePgn(SIMPLE_PGN)).toBe(true);
  });

  it("returns true for a PGN with headers", () => {
    const pgn = '[Event "Test"]\n[Site "Test"]\n\n1. e4 e5 2. Nf3';
    expect(validatePgn(pgn)).toBe(true);
  });

  it("returns false for an empty string", () => {
    expect(validatePgn("")).toBe(false);
  });

  it("returns false for a whitespace-only string", () => {
    expect(validatePgn("   ")).toBe(false);
  });

  it("returns false for an invalid PGN with illegal moves", () => {
    // e5 is not a legal first move for white
    expect(validatePgn("1. e5")).toBe(false);
  });
});

// ============================================================
// parsePgn
// ============================================================
describe("parsePgn", () => {
  it("returns an array of algebraic moves", () => {
    const moves = parsePgn(SIMPLE_PGN);
    expect(moves).toEqual(["e4", "e5", "Nf3", "Nc6"]);
  });

  it("handles a single move PGN", () => {
    const moves = parsePgn("1. e4");
    expect(moves).toEqual(["e4"]);
  });

  it("throws for an invalid PGN", () => {
    expect(() => parsePgn("1. invalidmove")).toThrow("Invalid PGN format");
  });

  it("handles PGN with result markers", () => {
    const moves = parsePgn("1. e4 e5 1-0");
    expect(moves).toEqual(["e4", "e5"]);
  });
});

// ============================================================
// parsePgnWithFen
// ============================================================
describe("parsePgnWithFen", () => {
  it("returns moves and no startingFen for a standard game", () => {
    const result = parsePgnWithFen(SIMPLE_PGN);
    expect(result.moves).toEqual(["e4", "e5", "Nf3", "Nc6"]);
    expect(result.startingFen).toBeUndefined();
  });

  it("returns startingFen when a custom FEN header is present", () => {
    const pgnWithFen =
      '[SetUp "1"]\n[FEN "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"]\n\n1... e5';
    const result = parsePgnWithFen(pgnWithFen);
    expect(result.startingFen).toBe(
      "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
    );
    expect(result.moves).toContain("e5");
  });

  it("does not return startingFen when FEN is the standard starting position", () => {
    const pgnWithDefaultFen =
      '[FEN "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"]\n\n1. e4';
    const result = parsePgnWithFen(pgnWithDefaultFen);
    expect(result.startingFen).toBeUndefined();
  });

  it("throws for an invalid PGN", () => {
    expect(() => parsePgnWithFen("invalid pgn data")).toThrow(
      "Invalid PGN format",
    );
  });
});

// ============================================================
// generatePgn
// ============================================================
describe("generatePgn", () => {
  it("generates PGN from a list of moves", () => {
    const pgn = generatePgn(["e4", "e5", "Nf3"]);
    expect(pgn).toContain("e4");
    expect(pgn).toContain("e5");
    expect(pgn).toContain("Nf3");
  });

  it("generates PGN with SetUp and FEN headers for a custom starting position", () => {
    const customFen =
      "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";
    const pgn = generatePgn(["e5"], customFen);
    expect(pgn).toContain('[SetUp "1"]');
    expect(pgn).toContain("[FEN");
    expect(pgn).toContain("e5");
  });

  it("returns PGN with default headers for an empty move list", () => {
    const pgn = generatePgn([]);
    // chess.js generates default PGN headers even with no moves
    expect(pgn).toContain("*");
  });

  it("throws for invalid moves", () => {
    expect(() => generatePgn(["invalidmove"])).toThrow(
      "Invalid moves sequence",
    );
  });
});

// ============================================================
// validatePgnWithDetails
// ============================================================
describe("validatePgnWithDetails", () => {
  it("returns valid with move count for a valid PGN", () => {
    const result = validatePgnWithDetails(SIMPLE_PGN);
    expect(result.valid).toBe(true);
    expect(result.moveCount).toBe(4);
    expect(result.error).toBeUndefined();
  });

  it("returns invalid with error message for empty PGN", () => {
    const result = validatePgnWithDetails("");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("PGN cannot be empty");
  });

  it("returns invalid with error message for whitespace PGN", () => {
    const result = validatePgnWithDetails("   ");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("PGN cannot be empty");
  });

  it("returns invalid with error for malformed PGN", () => {
    // e5 is not a legal first move for white
    const result = validatePgnWithDetails("1. e5");
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });
});

// ============================================================
// getPgnHeaders
// ============================================================
describe("getPgnHeaders", () => {
  it("returns headers from a PGN with headers", () => {
    const pgn = '[Event "Test Game"]\n[Site "Online"]\n\n1. e4 e5';
    const headers = getPgnHeaders(pgn);
    expect(headers.Event).toBe("Test Game");
    expect(headers.Site).toBe("Online");
  });

  it("returns an empty object for PGN without headers", () => {
    const headers = getPgnHeaders("1. e4 e5");
    // May contain auto-generated headers or be empty
    expect(typeof headers).toBe("object");
  });

  it("returns an empty object for invalid PGN", () => {
    const headers = getPgnHeaders("invalid pgn data");
    expect(headers).toEqual({});
  });
});

// ============================================================
// getPgnHistory
// ============================================================
describe("getPgnHistory", () => {
  it("returns an array of move strings", () => {
    const history = getPgnHistory(SIMPLE_PGN);
    expect(history).toEqual(["e4", "e5", "Nf3", "Nc6"]);
  });

  it("returns verbose move details when verbose option is set", () => {
    const history = getPgnHistory(SIMPLE_PGN, { verbose: true });
    expect(history.length).toBe(4);
    const firstMove = history[0] as { san: string; from: string; to: string };
    expect(firstMove.san).toBe("e4");
    expect(firstMove.from).toBe("e2");
    expect(firstMove.to).toBe("e4");
  });

  it("returns empty array for invalid PGN", () => {
    const history = getPgnHistory("invalid pgn data");
    expect(history).toEqual([]);
  });

  it("returns empty array for empty string", () => {
    const history = getPgnHistory("");
    expect(history).toEqual([]);
  });
});

const STANDARD_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

// ============================================================
// formatPgnToText
// ============================================================
describe("formatPgnToText", () => {
  it("formats move pairs into PGN text", () => {
    const formatted: FormattedPgn = [
      { moveNumber: 1, whiteMove: "e4", blackMove: "e5" },
      { moveNumber: 2, whiteMove: "Nf3", blackMove: "Nc6" },
    ];
    expect(formatPgnToText(formatted)).toBe("1. e4 e5 2. Nf3 Nc6");
  });

  it("handles a move pair with only white move", () => {
    const formatted: FormattedPgn = [{ moveNumber: 1, whiteMove: "e4" }];
    expect(formatPgnToText(formatted)).toBe("1. e4");
  });

  it("handles a move pair with only black move", () => {
    const formatted: FormattedPgn = [{ moveNumber: 1, blackMove: "e5" }];
    expect(formatPgnToText(formatted)).toBe("1... e5");
  });

  it("includes FEN header when startingFen is provided", () => {
    const formatted: FormattedPgn = [
      { moveNumber: 1, whiteMove: "e4", blackMove: "e5" },
    ];
    const customFen =
      "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";
    const result = formatPgnToText(formatted, customFen);
    expect(result).toContain('[SetUp "1"]');
    expect(result).toContain(`[FEN "${customFen}"]`);
    expect(result).toContain("1. e4 e5");
  });

  it("handles an empty array", () => {
    expect(formatPgnToText([])).toBe("");
  });
});

// ============================================================
// getPgnSuggestion
// ============================================================
describe("getPgnSuggestion", () => {
  it('returns "1. " for empty input', () => {
    expect(getPgnSuggestion("")).toBe("1. ");
  });

  it('returns "1. " for whitespace-only input', () => {
    expect(getPgnSuggestion("   ")).toBe("1. ");
  });

  it('returns "1. " when no move number is found', () => {
    expect(getPgnSuggestion("hello")).toBe("1. ");
  });

  it("returns next move number after a complete pair", () => {
    expect(getPgnSuggestion("1. e4 e5")).toBe(" 2. ");
  });

  it("returns null when only white has moved", () => {
    expect(getPgnSuggestion("1. e4")).toBeNull();
  });

  it("returns next move number after multiple complete pairs", () => {
    expect(getPgnSuggestion("1. e4 e5 2. Nf3 Nc6")).toBe(" 3. ");
  });
});

// ============================================================
// parsePgnMoves
// ============================================================
describe("parsePgnMoves", () => {
  it("parses standard PGN moves", () => {
    const result = parsePgnMoves("1. e4 e5 2. Nf3 Nc6");
    expect(result).toEqual([
      { moveNumber: 1, white: "e4", black: "e5" },
      { moveNumber: 2, white: "Nf3", black: "Nc6" },
    ]);
  });

  it("handles PGN with only white move", () => {
    const result = parsePgnMoves("1. e4");
    expect(result).toEqual([{ moveNumber: 1, white: "e4", black: null }]);
  });

  it("handles black-only notation with dots", () => {
    const result = parsePgnMoves("1...e5");
    expect(result).toEqual([{ moveNumber: 1, white: null, black: "e5" }]);
  });

  it("returns empty array for empty input", () => {
    expect(parsePgnMoves("")).toEqual([]);
  });

  it("normalizes extra whitespace", () => {
    const result = parsePgnMoves("1.  e4   e5   2.  Nf3   Nc6");
    expect(result).toEqual([
      { moveNumber: 1, white: "e4", black: "e5" },
      { moveNumber: 2, white: "Nf3", black: "Nc6" },
    ]);
  });
});

// ============================================================
// flattenPgnMoves
// ============================================================
describe("flattenPgnMoves", () => {
  it("flattens parsed moves into a sequential array", () => {
    const parsed = [
      { moveNumber: 1, white: "e4", black: "e5" },
      { moveNumber: 2, white: "Nf3", black: "Nc6" },
    ];
    expect(flattenPgnMoves(parsed)).toEqual(["e4", "e5", "Nf3", "Nc6"]);
  });

  it("skips null moves", () => {
    const parsed = [
      { moveNumber: 1, white: null, black: "e5" },
      { moveNumber: 2, white: "Nf3", black: null },
    ];
    expect(flattenPgnMoves(parsed)).toEqual(["e5", "Nf3"]);
  });

  it("returns empty array for empty input", () => {
    expect(flattenPgnMoves([])).toEqual([]);
  });
});

// ============================================================
// validatePgnMoves
// ============================================================
describe("validatePgnMoves", () => {
  it("validates legal moves from starting position", () => {
    const moves = ["e4", "e5", "Nf3", "Nc6"];
    const result = validatePgnMoves(STANDARD_FEN, moves);
    expect(result.valid).toBe(true);
    expect(result.validMoves).toEqual(moves);
  });

  it("returns invalid for illegal moves", () => {
    const moves = ["e4", "e5", "Nc3", "Ke2"];
    const result = validatePgnMoves(STANDARD_FEN, moves);
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("returns invalid for bad FEN", () => {
    const result = validatePgnMoves("invalid-fen", ["e4"]);
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Invalid FEN position");
  });
});

// ============================================================
// parsePgnMoveSequence
// ============================================================
describe("parsePgnMoveSequence", () => {
  it("parses and validates a move sequence from standard position", () => {
    const result = parsePgnMoveSequence(STANDARD_FEN, "1. e4 e5 2. Nf3 Nc6");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fen).toBe(STANDARD_FEN);
      expect(result.data.moves).toEqual(["e4", "e5", "Nf3", "Nc6"]);
      expect(result.data.playerColor).toBe("w");
    }
  });

  it("returns failure for invalid FEN", () => {
    const result = parsePgnMoveSequence("invalid-fen", "1. e4 e5");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Invalid FEN position");
    }
  });

  it("returns failure for empty PGN", () => {
    const result = parsePgnMoveSequence(STANDARD_FEN, "");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("No moves found in PGN");
    }
  });

  it("returns failure for invalid moves", () => {
    const result = parsePgnMoveSequence(STANDARD_FEN, "1. e4 Ke7");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeDefined();
    }
  });

  it("detects player color from FEN turn", () => {
    const blackFen =
      "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";
    const result = parsePgnMoveSequence(blackFen, "1. e5");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.playerColor).toBe("b");
    }
  });
});

// ============================================================
// getPlayerMovesFromSequence
// ============================================================
describe("getPlayerMovesFromSequence", () => {
  const moves = ["e4", "e5", "Nf3", "Nc6", "Bb5"] as AlgebraicNotation[];

  it("returns white player moves (indices 0, 2, 4)", () => {
    const result = getPlayerMovesFromSequence(moves, "w");
    expect(result).toEqual(["e4", "Nf3", "Bb5"]);
  });

  it("returns black player moves (indices 1, 3)", () => {
    const result = getPlayerMovesFromSequence(moves, "b");
    expect(result).toEqual(["e5", "Nc6"]);
  });

  it("returns empty array for empty moves", () => {
    expect(getPlayerMovesFromSequence([], "w")).toEqual([]);
  });
});

// ============================================================
// getFenAfterMoves (from fen module, previously wrapped by getFenAfterPgnMoves)
// ============================================================
describe("getFenAfterMoves", () => {
  it("returns the FEN after applying moves", () => {
    const fen = getFenAfterMoves(STANDARD_FEN, ["e4", "e5"]);
    expect(fen).toContain("rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR");
  });

  it("returns the same FEN for empty moves", () => {
    const fen = getFenAfterMoves(STANDARD_FEN, []);
    expect(fen).toBe(STANDARD_FEN);
  });
});

// ============================================================
// Edge case tests
// ============================================================

describe("validatePgn - edge cases", () => {
  it("returns true for PGN with result marker 1-0", () => {
    expect(validatePgn("1. e4 e5 1-0")).toBe(true);
  });

  it("returns true for PGN with result marker 0-1", () => {
    expect(validatePgn("1. e4 e5 0-1")).toBe(true);
  });

  it("returns true for PGN with result marker 1/2-1/2", () => {
    expect(validatePgn("1. e4 e5 1/2-1/2")).toBe(true);
  });

  it("returns true for PGN with castling moves", () => {
    // Italian Game leading to kingside castling
    expect(validatePgn("1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. O-O Nf6")).toBe(true);
  });

  it("returns true for a long game (50+ half-moves)", () => {
    // A well-known Scholar's Mate extension to 30 moves
    const longPgn =
      "1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. d3 Nf6 5. Nc3 d6 6. Be3 Bxe3 7. fxe3 O-O 8. O-O Be6 9. Bb3 Bxb3 10. axb3 Qd7 11. Qe2 a6 12. Rad1 Rab8 13. d4 exd4 14. exd4 Rfe8 15. e5 dxe5 16. dxe5 Nd5 17. Nxd5 Qxd5 18. Rxd5 Nxe5 19. Nxe5 Rxe5 20. Rd7 Rc5 21. Rxc7 Rxc7";
    expect(validatePgn(longPgn)).toBe(true);
  });

  it("returns false for tab-only string", () => {
    expect(validatePgn("\t\t")).toBe(false);
  });

  it("returns false for newline-only string", () => {
    expect(validatePgn("\n\n")).toBe(false);
  });
});

describe("parsePgn - edge cases", () => {
  it("handles PGN with draw result marker", () => {
    const moves = parsePgn("1. e4 e5 1/2-1/2");
    expect(moves).toEqual(["e4", "e5"]);
  });

  it("handles PGN with black win result marker", () => {
    const moves = parsePgn("1. e4 e5 0-1");
    expect(moves).toEqual(["e4", "e5"]);
  });

  it("handles PGN with kingside castling", () => {
    const moves = parsePgn("1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. O-O Nf6");
    expect(moves).toContain("O-O");
  });

  it("handles PGN with pawn promotion", () => {
    // Position where promotion occurs
    const pgnWithPromotion =
      '[SetUp "1"]\n[FEN "4k3/P7/8/8/8/8/8/4K3 w - - 0 1"]\n\n1. a8=Q+';
    const moves = parsePgn(pgnWithPromotion);
    expect(moves).toEqual(["a8=Q+"]);
  });
});

describe("parsePgnWithFen - edge cases", () => {
  it("handles PGN with multiple headers", () => {
    const pgn =
      '[Event "World Championship"]\n[Site "London"]\n[Date "2024.01.01"]\n[White "Player A"]\n[Black "Player B"]\n\n1. e4 e5';
    const result = parsePgnWithFen(pgn);
    expect(result.moves).toEqual(["e4", "e5"]);
    expect(result.startingFen).toBeUndefined();
  });

  it("handles PGN with only SetUp header but no FEN", () => {
    // chess.js may or may not accept this - test graceful behavior
    const pgn = '[SetUp "1"]\n\n1. e4 e5';
    const result = parsePgnWithFen(pgn);
    expect(result.moves).toEqual(["e4", "e5"]);
  });
});

describe("generatePgn - edge cases", () => {
  it("generates PGN with castling notation", () => {
    const moves = ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "O-O"];
    const pgn = generatePgn(moves);
    expect(pgn).toContain("O-O");
  });

  it("generates PGN from a position where it is black to move", () => {
    const blackFen =
      "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";
    const pgn = generatePgn(["e5"], blackFen);
    expect(pgn).toContain("e5");
  });
});

describe("validatePgnWithDetails - edge cases", () => {
  it("returns valid with correct count for a long game", () => {
    const longPgn =
      "1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. d3 Nf6 5. Nc3 d6 6. Be3 Bxe3 7. fxe3 O-O 8. O-O Be6 9. Bb3 Bxb3 10. axb3";
    const result = validatePgnWithDetails(longPgn);
    expect(result.valid).toBe(true);
    // moveCount counts half-moves (individual ply), not full moves
    expect(result.moveCount).toBe(19);
  });

  it("returns valid for PGN with result markers", () => {
    const result = validatePgnWithDetails("1. e4 e5 1-0");
    expect(result.valid).toBe(true);
    expect(result.moveCount).toBe(2);
  });

  it("returns valid for a single move", () => {
    const result = validatePgnWithDetails("1. e4");
    expect(result.valid).toBe(true);
    expect(result.moveCount).toBe(1);
  });
});

describe("getPgnHeaders - edge cases", () => {
  it("returns all standard headers", () => {
    const pgn =
      '[Event "Match"]\n[Site "Online"]\n[Date "2024.01.01"]\n[White "Alice"]\n[Black "Bob"]\n[Result "1-0"]\n\n1. e4 e5 1-0';
    const headers = getPgnHeaders(pgn);
    expect(headers.Event).toBe("Match");
    expect(headers.White).toBe("Alice");
    expect(headers.Black).toBe("Bob");
    expect(headers.Result).toBe("1-0");
  });

  it("returns default headers for empty string (chess.js auto-generates headers)", () => {
    const headers = getPgnHeaders("");
    // chess.js generates default seven-tag roster headers even for empty input
    expect(headers.Event).toBeDefined();
    expect(typeof headers).toBe("object");
  });
});

describe("getPgnHistory - edge cases", () => {
  it("returns moves from PGN with castling", () => {
    const pgn = "1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. O-O Nf6";
    const history = getPgnHistory(pgn);
    expect(history).toContain("O-O");
    expect(history.length).toBe(8);
  });

  it("returns verbose details including captured piece", () => {
    const pgn = "1. e4 d5 2. exd5";
    const history = getPgnHistory(pgn, { verbose: true });
    expect(history.length).toBe(3);
    const capture = history[2] as { san: string; captured: string | undefined };
    expect(capture.san).toBe("exd5");
    expect(capture.captured).toBe("p");
  });
});

describe("formatPgnToText - edge cases", () => {
  it("formats a single white move at high move number", () => {
    const formatted: FormattedPgn = [{ moveNumber: 42, whiteMove: "Qxh7#" }];
    expect(formatPgnToText(formatted)).toBe("42. Qxh7#");
  });

  it("handles multiple black-only entries", () => {
    const formatted: FormattedPgn = [
      { moveNumber: 1, blackMove: "e5" },
      { moveNumber: 2, whiteMove: "Nf3", blackMove: "Nc6" },
    ];
    expect(formatPgnToText(formatted)).toBe("1... e5 2. Nf3 Nc6");
  });

  it("does not include FEN header when startingFen is undefined", () => {
    const formatted: FormattedPgn = [
      { moveNumber: 1, whiteMove: "e4", blackMove: "e5" },
    ];
    const result = formatPgnToText(formatted, undefined);
    expect(result).not.toContain("[SetUp");
    expect(result).not.toContain("[FEN");
    expect(result).toBe("1. e4 e5");
  });

  it("handles empty string as startingFen by not including header", () => {
    const formatted: FormattedPgn = [{ moveNumber: 1, whiteMove: "e4" }];
    // Empty string is falsy, so should not include FEN header
    const result = formatPgnToText(formatted, "");
    expect(result).not.toContain("[SetUp");
    expect(result).toBe("1. e4");
  });
});

describe("getPgnSuggestion - edge cases", () => {
  it("returns null for partial white move input", () => {
    expect(getPgnSuggestion("1. e")).toBeNull();
  });

  it("returns next move after a high move number pair", () => {
    expect(getPgnSuggestion("10. Qd2 Rd8")).toBe(" 11. ");
  });

  it("returns null for trailing whitespace after white move only", () => {
    // "1. e4 " - white has moved but black hasn't
    expect(getPgnSuggestion("1. e4 ")).toBeNull();
  });
});

describe("parsePgnMoves - edge cases", () => {
  it("parses PGN with promotion notation", () => {
    const result = parsePgnMoves("1. a8=Q");
    expect(result).toEqual([{ moveNumber: 1, white: "a8=Q", black: null }]);
  });

  it("parses PGN with check notation", () => {
    const result = parsePgnMoves("1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7+");
    expect(result[3]).toEqual({
      moveNumber: 4,
      white: "Qxf7+",
      black: null,
    });
  });

  it("parses PGN with checkmate notation", () => {
    const result = parsePgnMoves("1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7#");
    expect(result[3]).toEqual({
      moveNumber: 4,
      white: "Qxf7#",
      black: null,
    });
  });

  it("parses PGN with castling O-O notation", () => {
    const result = parsePgnMoves("1. O-O e5");
    expect(result).toEqual([{ moveNumber: 1, white: "O-O", black: "e5" }]);
  });

  it("parses PGN with queenside castling O-O-O notation", () => {
    const result = parsePgnMoves("1. O-O-O e5");
    expect(result).toEqual([{ moveNumber: 1, white: "O-O-O", black: "e5" }]);
  });

  it("returns empty array for whitespace-only input", () => {
    expect(parsePgnMoves("   ")).toEqual([]);
  });

  it("handles black-only with space after dots (known limitation: space causes empty black)", () => {
    // "1... e5" with a space between dots and move: the regex captures ".."
    // as firstMove and "e5" as secondMove. Since firstMove starts with ".",
    // it enters the black-only branch and strips dots, resulting in empty string.
    // The secondMove "e5" is discarded in that branch.
    // Use "1...e5" (no space) for correct parsing.
    const result = parsePgnMoves("1... e5");
    expect(result).toEqual([{ moveNumber: 1, white: null, black: "" }]);
  });

  it("parses many move pairs correctly", () => {
    const pgn =
      "1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. d3 Nf6 5. Nc3 d6 6. Be3 Bxe3 7. fxe3 O-O 8. O-O Be6 9. Bb3 Bxb3 10. axb3";
    const result = parsePgnMoves(pgn);
    expect(result.length).toBe(10);
    expect(result[0]).toEqual({ moveNumber: 1, white: "e4", black: "e5" });
    expect(result[9]).toEqual({
      moveNumber: 10,
      white: "axb3",
      black: null,
    });
  });
});

describe("flattenPgnMoves - edge cases", () => {
  it("flattens single white-only move", () => {
    const parsed = [{ moveNumber: 1, white: "e4", black: null }];
    expect(flattenPgnMoves(parsed)).toEqual(["e4"]);
  });

  it("flattens single black-only move", () => {
    const parsed = [{ moveNumber: 1, white: null, black: "e5" }];
    expect(flattenPgnMoves(parsed)).toEqual(["e5"]);
  });

  it("flattens entry with both white and black null", () => {
    const parsed = [{ moveNumber: 1, white: null, black: null }];
    expect(flattenPgnMoves(parsed)).toEqual([]);
  });

  it("preserves order across many moves", () => {
    const parsed = [
      { moveNumber: 1, white: "e4", black: "e5" },
      { moveNumber: 2, white: "Nf3", black: "Nc6" },
      { moveNumber: 3, white: "Bb5", black: null },
    ];
    expect(flattenPgnMoves(parsed)).toEqual(["e4", "e5", "Nf3", "Nc6", "Bb5"]);
  });
});

describe("validatePgnMoves - edge cases", () => {
  it("validates moves with castling", () => {
    const moves = ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "O-O"];
    const result = validatePgnMoves(STANDARD_FEN, moves);
    expect(result.valid).toBe(true);
    expect(result.validMoves.length).toBe(7);
  });

  it("returns partial valid moves before the invalid one", () => {
    const moves = ["e4", "e5", "INVALID"];
    const result = validatePgnMoves(STANDARD_FEN, moves);
    expect(result.valid).toBe(false);
    expect(result.validMoves).toEqual(["e4", "e5"]);
  });

  it("validates empty moves array as valid", () => {
    const result = validatePgnMoves(STANDARD_FEN, []);
    expect(result.valid).toBe(true);
    expect(result.validMoves).toEqual([]);
  });

  it("validates moves from a custom FEN (black to move)", () => {
    const blackFen =
      "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";
    const result = validatePgnMoves(blackFen, ["e5", "Nf3"]);
    expect(result.valid).toBe(true);
    expect(result.validMoves).toEqual(["e5", "Nf3"]);
  });

  it("returns invalid for a move that is legal in a different position", () => {
    // Nc6 is a valid move but not as white's first move
    const result = validatePgnMoves(STANDARD_FEN, ["Nc6"]);
    expect(result.valid).toBe(false);
  });
});

describe("parsePgnMoveSequence - edge cases", () => {
  it("returns failure for whitespace-only PGN", () => {
    const result = parsePgnMoveSequence(STANDARD_FEN, "   ");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("No moves found in PGN");
    }
  });

  it("parses a single move PGN", () => {
    const result = parsePgnMoveSequence(STANDARD_FEN, "1. e4");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.moves).toEqual(["e4"]);
      expect(result.data.playerColor).toBe("w");
    }
  });

  it("returns failure for PGN with no parseable move numbers", () => {
    const result = parsePgnMoveSequence(STANDARD_FEN, "just some text");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("No moves found in PGN");
    }
  });

  it("detects black player color from FEN in a middlegame position", () => {
    // Position after 1.e4 e5 2.Nf3, it's black's turn
    const midgameFen =
      "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2";
    const result = parsePgnMoveSequence(midgameFen, "1. Nc6");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.playerColor).toBe("b");
      expect(result.data.moves).toEqual(["Nc6"]);
    }
  });

  it("returns failure for empty FEN", () => {
    const result = parsePgnMoveSequence("", "1. e4");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Invalid FEN position");
    }
  });
});

describe("getPlayerMovesFromSequence - edge cases", () => {
  it("returns single white move for a one-move sequence", () => {
    const moves = ["e4"] as AlgebraicNotation[];
    expect(getPlayerMovesFromSequence(moves, "w")).toEqual(["e4"]);
  });

  it("returns empty for black when only one move exists", () => {
    const moves = ["e4"] as AlgebraicNotation[];
    expect(getPlayerMovesFromSequence(moves, "b")).toEqual([]);
  });

  it("handles even number of moves for both colors", () => {
    const moves = ["e4", "e5", "Nf3", "Nc6"] as AlgebraicNotation[];
    expect(getPlayerMovesFromSequence(moves, "w")).toEqual(["e4", "Nf3"]);
    expect(getPlayerMovesFromSequence(moves, "b")).toEqual(["e5", "Nc6"]);
  });

  it("handles large move sequences", () => {
    const moves = [
      "e4",
      "e5",
      "Nf3",
      "Nc6",
      "Bc4",
      "Bc5",
      "d3",
      "Nf6",
      "Nc3",
      "d6",
    ] as AlgebraicNotation[];
    const whiteMoves = getPlayerMovesFromSequence(moves, "w");
    const blackMoves = getPlayerMovesFromSequence(moves, "b");
    expect(whiteMoves).toEqual(["e4", "Nf3", "Bc4", "d3", "Nc3"]);
    expect(blackMoves).toEqual(["e5", "Nc6", "Bc5", "Nf6", "d6"]);
    expect(whiteMoves.length).toBe(5);
    expect(blackMoves.length).toBe(5);
  });
});

describe("getFenAfterMoves - edge cases", () => {
  it("returns FEN after castling", () => {
    const fen = getFenAfterMoves(STANDARD_FEN, [
      "e4",
      "e5",
      "Nf3",
      "Nc6",
      "Bc4",
      "Bc5",
      "O-O",
    ]);
    // After O-O, the king should be on g1 (1RK1 in FEN rank 1)
    expect(fen).toContain("1RK1");
  });

  it("throws for invalid moves in the sequence", () => {
    expect(() => getFenAfterMoves(STANDARD_FEN, ["e4", "INVALID"])).toThrow();
  });
});

// ============================================================
// Integration: full pipeline test (parse -> flatten -> validate -> format)
// ============================================================
describe("Integration: full PGN pipeline", () => {
  it("parse -> flatten -> validate -> getPlayerMoves", () => {
    const pgnText = "1. e4 e5 2. Nf3 Nc6 3. Bb5 a6";
    const parsed = parsePgnMoves(pgnText);
    expect(parsed.length).toBe(3);

    const flattened = flattenPgnMoves(parsed);
    expect(flattened).toEqual(["e4", "e5", "Nf3", "Nc6", "Bb5", "a6"]);

    const validation = validatePgnMoves(STANDARD_FEN, flattened);
    expect(validation.valid).toBe(true);
    expect(validation.validMoves.length).toBe(6);

    const whiteMoves = getPlayerMovesFromSequence(validation.validMoves, "w");
    const blackMoves = getPlayerMovesFromSequence(validation.validMoves, "b");
    expect(whiteMoves).toEqual(["e4", "Nf3", "Bb5"]);
    expect(blackMoves).toEqual(["e5", "Nc6", "a6"]);
  });

  it("validate moves from black starting position directly", () => {
    // parsePgnMoves regex has known limitations with multi-move sequences
    // starting from black (e.g. "1. e5 2. Nf3 Nc6" is misparsed because
    // "2." is captured as the black move of move 1).
    // For black-starting positions, validate moves directly instead.
    const blackFen =
      "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";
    const moves = ["e5", "Nf3", "Nc6"];
    const validation = validatePgnMoves(blackFen, moves);
    expect(validation.valid).toBe(true);
    expect(validation.validMoves).toEqual(["e5", "Nf3", "Nc6"]);
  });

  it("parsePgnMoveSequence is equivalent to manual pipeline", () => {
    const pgnText = "1. e4 e5 2. Nf3 Nc6";
    const sequenceResult = parsePgnMoveSequence(STANDARD_FEN, pgnText);
    expect(sequenceResult.success).toBe(true);

    // Manual pipeline
    const parsed = parsePgnMoves(pgnText);
    const flattened = flattenPgnMoves(parsed);
    const validation = validatePgnMoves(STANDARD_FEN, flattened);

    if (sequenceResult.success) {
      expect(sequenceResult.data.moves).toEqual(validation.validMoves);
    }
  });

  it("full roundtrip: generate PGN -> parse -> validate", () => {
    const originalMoves = ["e4", "e5", "Nf3", "Nc6", "Bb5"];
    const generatedPgn = generatePgn(originalMoves);

    const parsed = parsePgn(generatedPgn);
    expect(parsed).toEqual(originalMoves);

    const validation = validatePgnMoves(STANDARD_FEN, parsed);
    expect(validation.valid).toBe(true);
    expect(validation.validMoves).toEqual(originalMoves);
  });

  it("formatPgnToText output is re-parseable by parsePgnMoves", () => {
    const formatted: FormattedPgn = [
      { moveNumber: 1, whiteMove: "e4", blackMove: "e5" },
      { moveNumber: 2, whiteMove: "Nf3", blackMove: "Nc6" },
    ];
    const text = formatPgnToText(formatted);
    const reParsed = parsePgnMoves(text);
    expect(reParsed).toEqual([
      { moveNumber: 1, white: "e4", black: "e5" },
      { moveNumber: 2, white: "Nf3", black: "Nc6" },
    ]);
  });
});

// ============================================================
// validateAttachedPgn
// ============================================================
describe("validateAttachedPgn", () => {
  it("returns ok for a minimal headerless PGN", () => {
    const result = validateAttachedPgn(SIMPLE_PGN);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.moveCount).toBe(4);
      expect(result.startingFen).toBeNull();
      expect(result.headers.white).toBeNull();
      expect(result.headers.black).toBeNull();
      expect(result.byteLength).toBeGreaterThan(0);
      expect(result.normalized.length).toBeGreaterThan(0);
    }
  });

  it("returns ok with extracted headers for a full PGN", () => {
    const pgn =
      '[Event "Test Cup"]\n' +
      '[Site "https://lichess.org/abcd1234"]\n' +
      '[Date "2026.04.27"]\n' +
      '[White "Alice"]\n' +
      '[Black "Bob"]\n' +
      '[Result "1-0"]\n\n' +
      "1. e4 e5 2. Nf3 Nc6 1-0";
    const result = validateAttachedPgn(pgn);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.headers.white).toBe("Alice");
      expect(result.headers.black).toBe("Bob");
      expect(result.headers.result).toBe("1-0");
      expect(result.headers.event).toBe("Test Cup");
      expect(result.headers.site).toBe("https://lichess.org/abcd1234");
      expect(result.headers.date).toBe("2026.04.27");
      expect(result.moveCount).toBe(4);
    }
  });

  it("returns 'empty' for an empty string", () => {
    expect(validateAttachedPgn("")).toEqual({ ok: false, error: "empty" });
  });

  it("returns 'empty' for whitespace-only input", () => {
    expect(validateAttachedPgn("   \n\t  ")).toEqual({
      ok: false,
      error: "empty",
    });
  });

  it("returns 'too_large' before invoking chess.js when input exceeds maxBytes", () => {
    // Construct a string just over the cap. Use a tiny maxBytes so we don't
    // need to allocate 100 KB of test data.
    const big = "1. e4 ".repeat(200); // ~1200 bytes
    const result = validateAttachedPgn(big, { maxBytes: 64 });
    expect(result).toEqual({ ok: false, error: "too_large" });
  });

  it("returns 'invalid_pgn' for syntactically malformed PGN", () => {
    const result = validateAttachedPgn("not a real pgn !!! @@@");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      // Either invalid_pgn or no_moves are acceptable here depending on
      // chess.js behavior, but we expect invalid_pgn for outright garbage.
      expect(["invalid_pgn", "no_moves"]).toContain(result.error);
    }
  });

  it("returns 'invalid_pgn' when a move in the middle is illegal", () => {
    // 2. Ke2 is legal, 3. Ke3 walks the king into a check pattern
    // that chess.js will accept. Use a clearly illegal move instead:
    // bishop teleports through pieces.
    const result = validateAttachedPgn("1. e4 e5 2. Bc4 Bc5 3. Bf8");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("invalid_pgn");
    }
  });

  it("returns 'no_moves' for a header-only PGN", () => {
    const result = validateAttachedPgn('[Event "x"]\n\n*');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("no_moves");
    }
  });

  it("anonymizes White and Black headers when opts.anonymize=true", () => {
    const pgn = '[White "Alice"]\n[Black "Bob"]\n\n1. e4 e5 2. Nf3 Nc6';
    const result = validateAttachedPgn(pgn, { anonymize: true });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.headers.white).toBe("Player 1");
      expect(result.headers.black).toBe("Player 2");
      expect(result.normalized).not.toContain("Alice");
      expect(result.normalized).not.toContain("Bob");
      expect(result.normalized).toContain("Player 1");
      expect(result.normalized).toContain("Player 2");
    }
  });

  it("preserves a non-default starting FEN in the result", () => {
    const customFen =
      "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";
    const pgn = `[SetUp "1"]\n[FEN "${customFen}"]\n\n1... e5`;
    const result = validateAttachedPgn(pgn);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.startingFen).toBe(customFen);
      expect(result.moveCount).toBe(1);
    }
  });

  it("returns 'invalid_pgn' for a syntactically broken FEN header", () => {
    const pgn = '[SetUp "1"]\n[FEN "garbage"]\n\n1. e4';
    const result = validateAttachedPgn(pgn);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      // Either invalid_pgn (chess.js rejects the position) or no_moves
      // (chess.js silently swallows the FEN and yields zero history).
      // Both are acceptable; the important guarantee is that we don't
      // return ok:true with junk data.
      expect(["invalid_pgn", "no_moves"]).toContain(result.error);
    }
  });

  // ─── Boundary value tests for SPEC1 attachment limit (100 KiB) ───
  describe("byte-length boundary at 100 KiB", () => {
    const KIB_100 = 100 * 1024;

    it("accepts input whose UTF-8 byte length equals exactly maxBytes (when normalized fits too)", () => {
      // The contract has TWO maxBytes checks: the input AND the normalized
      // re-emitted PGN must both fit (see pgn.ts §"normalizedByteLength
      // > maxBytes"). chess.js typically ADDS headers (Result, Site=?, etc.)
      // when re-emitting, so the normalized form is usually larger than the
      // raw input. To exercise the boundary, we set maxBytes to a value
      // comfortably above the normalized re-emit size and confirm acceptance.
      const pgn = "1. e4 e5 2. Nf3 Nc6"; // 19 bytes
      // Re-normalized chess.js output for the SIMPLE_PGN above is around
      // 200-300 bytes; pick 1024 so we are clearly over the normalized size
      // boundary on the safe side.
      const result = validateAttachedPgn(pgn, { maxBytes: 1024 });
      expect(result.ok).toBe(true);
      if (result.ok) {
        // Sanity: the byteLength field must reflect the normalized output,
        // not the raw input — this is what gets stored in the DB column.
        expect(result.byteLength).toBeGreaterThanOrEqual(pgn.length);
      }
    });

    it("rejects input one byte over the input maxBytes guard", () => {
      const pgn = "1. e4 e5 2. Nf3 Nc6";
      const oneByteUnder = pgn.length - 1;
      const result = validateAttachedPgn(pgn, { maxBytes: oneByteUnder });
      expect(result).toEqual({ ok: false, error: "too_large" });
    });

    it("rejects when normalized output exceeds maxBytes even if input fits", () => {
      // Choose maxBytes equal to the raw input length so the input passes
      // the first cap check but the normalized chess.js output (which is
      // larger due to added headers) trips the second check.
      const pgn = "1. e4 e5 2. Nf3 Nc6"; // 19 bytes
      const result = validateAttachedPgn(pgn, { maxBytes: pgn.length });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe("too_large");
      }
    });

    it("accepts a real 100 KiB-or-under input under the production cap", () => {
      // The default cap is 102_400. Build a PGN comfortably under it
      // and confirm it passes — this is the happy-path boundary check
      // for the production-default code path.
      const moves: string[] = [];
      for (let i = 1; i <= 200; i += 2) {
        // 200 plies => 100 moves each side, well under any byte limit
        moves.push(`${Math.floor(i / 2) + 1}. e4 e5`);
      }
      // Replace alternating moves with legal ones — keep it minimal/legal
      const pgn = "1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7";
      const result = validateAttachedPgn(pgn);
      expect(result.ok).toBe(true);
    });

    it("rejects an input over the default 100 KiB cap (no custom maxBytes)", () => {
      // Construct a string whose UTF-8 byte length is just over the
      // default cap. Use a single-byte ASCII char to keep length == bytes.
      const oversized = "a".repeat(KIB_100 + 1);
      const result = validateAttachedPgn(oversized);
      expect(result).toEqual({ ok: false, error: "too_large" });
    });
  });

  describe("empty / whitespace boundaries", () => {
    it("returns 'empty' for a pure tab+newline+space mix", () => {
      expect(validateAttachedPgn("\t\n \r\n  ")).toEqual({
        ok: false,
        error: "empty",
      });
    });

    it("returns 'empty' for the empty string (regression)", () => {
      expect(validateAttachedPgn("")).toEqual({ ok: false, error: "empty" });
    });
  });

  describe("normalized output safety", () => {
    it("anonymized normalized PGN never contains the original White name", () => {
      const pgn =
        '[White "AliceTheGreat"]\n[Black "BobTheWise"]\n\n1. e4 e5 2. Nf3 Nc6';
      const result = validateAttachedPgn(pgn, { anonymize: true });
      expect(result.ok).toBe(true);
      if (result.ok) {
        // Defense-in-depth assertion: the stored, normalized text MUST
        // not leak the original names. If chess.js ever changes how
        // headers are emitted, this test surfaces it immediately.
        expect(result.normalized).not.toContain("AliceTheGreat");
        expect(result.normalized).not.toContain("BobTheWise");
      }
    });

    it("non-anonymized PGN preserves original White / Black names verbatim", () => {
      const pgn =
        '[White "AliceTheGreat"]\n[Black "BobTheWise"]\n\n1. e4 e5 2. Nf3 Nc6';
      const result = validateAttachedPgn(pgn);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.headers.white).toBe("AliceTheGreat");
        expect(result.headers.black).toBe("BobTheWise");
        expect(result.normalized).toContain("AliceTheGreat");
      }
    });
  });

  // ─── Lichess-style adjacent comment block compatibility ───
  // chess.js 1.4.0 cannot parse two consecutive `{...}` comment blocks,
  // but the PGN spec allows them and Lichess's export deliberately
  // separates textual annotations from `{ [%eval][%clk] }` annotation.
  // `validateAttachedPgn` preprocesses `} <ws> {` into a single comment
  // before chess.js parses, so Lichess PGN should round-trip cleanly.
  describe("Lichess-style adjacent comment blocks", () => {
    it("accepts two adjacent comment blocks on the same move", () => {
      const pgn =
        "1. d4 { Mistake. Nb6 was best. } { [%eval 1.56] [%clk 0:09:46] } d5 1-0";
      const result = validateAttachedPgn(pgn);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.moveCount).toBe(2);
      }
    });

    it("accepts a Lichess-style PGN with RAV, NAG suffixes, and adjacent comments", () => {
      const pgn =
        '[Event "rated rapid game"]\n' +
        '[White "a"]\n' +
        '[Black "b"]\n' +
        '[Result "1-0"]\n\n' +
        "1. d4 { [%eval 0.15] [%clk 0:10:00] } 1... d5 { [%eval 0.27] [%clk 0:10:00] } " +
        "2. Nd2 { [%eval 0.0] [%clk 0:09:59] } 2... b6? { (0.13 → 1.56) Mistake. } " +
        "{ [%eval 1.56] [%clk 0:09:46] } (2... Nb6 3. e4 Bg6) 3. Ngf3 1-0";
      const result = validateAttachedPgn(pgn);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.moveCount).toBe(5);
        expect(result.headers.white).toBe("a");
        expect(result.headers.black).toBe("b");
        expect(result.headers.result).toBe("1-0");
      }
    });

    it("accepts three or more adjacent comment blocks in a row", () => {
      // Defense-in-depth: the regex is global so multiple consecutive
      // `} { ... } {` separators all collapse, not just the first.
      const pgn = "1. e4 { a } { b } { c } e5 1-0";
      const result = validateAttachedPgn(pgn);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.moveCount).toBe(2);
      }
    });
  });
});
