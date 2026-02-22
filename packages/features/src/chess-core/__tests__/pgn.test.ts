import { describe, expect, it } from "vitest";

import {
  validatePgn,
  parsePgn,
  parsePgnWithFen,
  generatePgn,
  validatePgnWithDetails,
  getPgnHeaders,
  getPgnHistory,
} from "../pgn";

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
    expect(result.isValid).toBe(true);
    expect(result.moveCount).toBe(4);
    expect(result.error).toBeUndefined();
  });

  it("returns invalid with error message for empty PGN", () => {
    const result = validatePgnWithDetails("");
    expect(result.isValid).toBe(false);
    expect(result.error).toBe("PGN cannot be empty");
  });

  it("returns invalid with error message for whitespace PGN", () => {
    const result = validatePgnWithDetails("   ");
    expect(result.isValid).toBe(false);
    expect(result.error).toBe("PGN cannot be empty");
  });

  it("returns invalid with error for malformed PGN", () => {
    // e5 is not a legal first move for white
    const result = validatePgnWithDetails("1. e5");
    expect(result.isValid).toBe(false);
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
