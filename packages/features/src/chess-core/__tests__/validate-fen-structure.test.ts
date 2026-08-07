import { describe, expect, it } from "vitest";

import { validateFenStructure } from "../validate-fen-structure";

// ============================================================
// Accepted cases
// ============================================================
describe("validateFenStructure — accepted cases", () => {
  it("accepts the standard starting position", () => {
    const result = validateFenStructure(
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    );
    expect(result).toEqual({ ok: true });
  });

  // User-reported regression: a kingless board representing a rook-pair
  // pattern. chess.js rejects this, but for the chunks catalog we must
  // accept it.
  it("accepts a kingless rook-pair pattern (user-reported case)", () => {
    const result = validateFenStructure("8/4R1R1/8/8/8/8/8/8 w - - 0 1");
    expect(result).toEqual({ ok: true });
  });

  it("accepts a kingside fianchetto pattern (single bishop, no kings)", () => {
    const result = validateFenStructure("8/8/8/8/8/8/6B1/8 w - - 0 1");
    expect(result).toEqual({ ok: true });
  });

  it("accepts a completely empty board", () => {
    const result = validateFenStructure("8/8/8/8/8/8/8/8 w - - 0 1");
    expect(result).toEqual({ ok: true });
  });

  it("accepts black to move", () => {
    const result = validateFenStructure(
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1",
    );
    expect(result).toEqual({ ok: true });
  });

  it.each([
    ["KQkq", "full castling rights"],
    ["KQ", "white-only castling rights"],
    ["kq", "black-only castling rights"],
    ["-", "no castling rights"],
    ["q", "single-side castling"],
    ["Kq", "mixed castling rights"],
  ])("accepts castling field %s (%s)", (castling) => {
    const result = validateFenStructure(
      `rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w ${castling} - 0 1`,
    );
    expect(result).toEqual({ ok: true });
  });

  it.each([
    ["e3", "white pawn just advanced two squares"],
    ["d6", "black pawn just advanced two squares"],
    ["a3", "a-file en passant"],
    ["h6", "h-file en passant"],
  ])("accepts en passant square %s (%s)", (ep) => {
    const result = validateFenStructure(
      `rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq ${ep} 0 1`,
    );
    expect(result).toEqual({ ok: true });
  });

  it("accepts non-zero halfmove and fullmove clocks", () => {
    const result = validateFenStructure(
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 42 100",
    );
    expect(result).toEqual({ ok: true });
  });

  it("accepts halfmove clock of zero", () => {
    const result = validateFenStructure("8/8/8/8/8/8/8/8 w - - 0 1");
    expect(result).toEqual({ ok: true });
  });

  it("tolerates surrounding whitespace via trim", () => {
    const result = validateFenStructure(
      "  rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1  ",
    );
    expect(result).toEqual({ ok: true });
  });
});

// ============================================================
// Rejected cases
// ============================================================
describe("validateFenStructure — rejected cases", () => {
  it("rejects an empty string", () => {
    const result = validateFenStructure("");
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected invalid result");
    expect(result.error).toBeDefined();
  });

  it("rejects whitespace-only input", () => {
    const result = validateFenStructure("   ");
    expect(result.ok).toBe(false);
  });

  it("rejects a non-string value gracefully", () => {
    // @ts-expect-error — intentionally passing a non-string to exercise the guard
    const result = validateFenStructure(null);
    expect(result.ok).toBe(false);
  });

  it("rejects a garbage string", () => {
    const result = validateFenStructure("garbage");
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected invalid result");
    expect(result.error).toBe("FEN must have 6 space-separated fields");
  });

  // --- Field count ---

  it("rejects FEN with 5 fields (trailing field missing)", () => {
    const result = validateFenStructure(
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0",
    );
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected invalid result");
    expect(result.error).toBe("FEN must have 6 space-separated fields");
  });

  it("rejects FEN with 7 fields (extra trailing field)", () => {
    const result = validateFenStructure(
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1 extra",
    );
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected invalid result");
    expect(result.error).toBe("FEN must have 6 space-separated fields");
  });

  // --- Rank count ---

  it("rejects board with only 7 ranks", () => {
    const result = validateFenStructure("8/8/8/8/8/8/8 w - - 0 1");
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected invalid result");
    expect(result.error).toBe("Board must have exactly 8 ranks");
  });

  it("rejects board with 9 ranks", () => {
    const result = validateFenStructure("8/8/8/8/8/8/8/8/8 w - - 0 1");
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected invalid result");
    expect(result.error).toBe("Board must have exactly 8 ranks");
  });

  // --- Rank sum ---

  it("rejects a rank that sums to 7 squares", () => {
    const result = validateFenStructure("7/8/8/8/8/8/8/8 w - - 0 1");
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected invalid result");
    expect(result.error).toMatch(/does not sum to 8/);
  });

  it("rejects a rank that sums to 9 squares (1p7 → 1+1+7=9)", () => {
    const result = validateFenStructure("1p7/8/8/8/8/8/8/8 w - - 0 1");
    expect(result.ok).toBe(false);
  });

  // --- Invalid piece chars ---

  it("rejects an unknown piece character X", () => {
    const result = validateFenStructure("8/8/8/8/8/8/8/7X w - - 0 1");
    expect(result.ok).toBe(false);
  });

  it("rejects an unknown piece character ?", () => {
    const result = validateFenStructure("8/8/8/8/8/8/8/7? w - - 0 1");
    expect(result.ok).toBe(false);
  });

  // --- Side to move ---

  it.each([
    ["x", "invalid letter"],
    ["W", "uppercase W"],
    ["B", "uppercase B"],
    ["", "empty (collapsed by split)"],
  ])("rejects side-to-move %s (%s)", (stm) => {
    const fen = `8/8/8/8/8/8/8/8 ${stm} - - 0 1`.replace(/\s+/g, " ");
    const result = validateFenStructure(fen);
    expect(result.ok).toBe(false);
  });

  // --- Castling rights ---

  it("rejects castling rights containing an invalid character", () => {
    const result = validateFenStructure("8/8/8/8/8/8/8/8 w KQkX - 0 1");
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected invalid result");
    expect(result.error).toBe("Castling rights are malformed");
  });

  it("rejects a castling field with only invalid characters", () => {
    const result = validateFenStructure("8/8/8/8/8/8/8/8 w Xyz - 0 1");
    expect(result.ok).toBe(false);
  });

  // --- En passant ---

  it.each([
    ["z9", "non-file, non-rank"],
    ["e", "file only"],
    ["ee3", "too long"],
    ["e9", "out-of-range rank"],
    ["i3", "out-of-range file"],
  ])("rejects en passant square %s (%s)", (ep) => {
    const result = validateFenStructure(`8/8/8/8/8/8/8/8 w - ${ep} 0 1`);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected invalid result");
    expect(result.error).toBe("En passant square is malformed");
  });

  // --- Halfmove ---

  it("rejects negative halfmove clock", () => {
    const result = validateFenStructure("8/8/8/8/8/8/8/8 w - - -1 1");
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected invalid result");
    expect(result.error).toBe("Halfmove clock must be a non-negative integer");
  });

  it("rejects non-numeric halfmove clock", () => {
    const result = validateFenStructure("8/8/8/8/8/8/8/8 w - - abc 1");
    expect(result.ok).toBe(false);
  });

  // --- Fullmove ---

  it("rejects fullmove number of 0", () => {
    const result = validateFenStructure("8/8/8/8/8/8/8/8 w - - 0 0");
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected invalid result");
    expect(result.error).toBe("Fullmove number must be a positive integer");
  });

  it("rejects negative fullmove number", () => {
    const result = validateFenStructure("8/8/8/8/8/8/8/8 w - - 0 -1");
    expect(result.ok).toBe(false);
  });

  it("rejects non-numeric fullmove number", () => {
    const result = validateFenStructure("8/8/8/8/8/8/8/8 w - - 0 abc");
    expect(result.ok).toBe(false);
  });
});
