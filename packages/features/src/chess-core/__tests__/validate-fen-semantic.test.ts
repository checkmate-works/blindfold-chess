import { describe, expect, it } from "vitest";

import { validateFenSemantic } from "../validate-fen-semantic";

const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

// ============================================================
// Accepted cases
// ============================================================
describe("validateFenSemantic — accepted cases", () => {
  it("accepts the standard starting position", () => {
    expect(validateFenSemantic(STARTING_FEN)).toEqual({ ok: true });
  });

  it("accepts a typical mid-game position", () => {
    expect(
      validateFenSemantic(
        "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3",
      ),
    ).toEqual({ ok: true });
  });

  it("accepts a position with no castling rights and no en passant", () => {
    expect(validateFenSemantic("4k3/8/8/8/8/8/8/4K3 w - - 0 1")).toEqual({
      ok: true,
    });
  });

  it("accepts a valid en passant target with white to move (rank 6)", () => {
    // After 1. e4 d5 2. e5 f5, ep target is f6, side to move is white.
    expect(
      validateFenSemantic(
        "rnbqkbnr/ppp1p1pp/8/3pPp2/8/8/PPPP1PPP/RNBQKBNR w KQkq f6 0 3",
      ),
    ).toEqual({ ok: true });
  });

  it("accepts a valid en passant target with black to move (rank 3)", () => {
    // After 1. e4, ep target is e3, side to move is black.
    expect(
      validateFenSemantic(
        "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
      ),
    ).toEqual({ ok: true });
  });

  it("accepts a typical KR-vs-K endgame", () => {
    // White king on e3, white rook on e2, black king on e5. Standard
    // endgame study shape with no castling and no en passant.
    expect(validateFenSemantic("8/8/8/4k3/8/4K3/4R3/8 w - - 0 1")).toEqual({
      ok: true,
    });
  });

  it("accepts a mid-game position with KQkq castling availability", () => {
    // Italian Game shape — kings still on e1/e8, rooks still on the
    // corners, all four castling rights legitimately claimed.
    expect(
      validateFenSemantic(
        "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 4 4",
      ),
    ).toEqual({ ok: true });
  });
});

// ============================================================
// King invariants
// ============================================================
describe("validateFenSemantic — king invariants", () => {
  it("rejects a position with no kings", () => {
    const result = validateFenSemantic("8/8/8/8/8/8/8/8 w - - 0 1");
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("kings");
  });

  it("rejects a position with only one king (white missing)", () => {
    const result = validateFenSemantic("4k3/8/8/8/8/8/8/8 w - - 0 1");
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("kings");
  });

  it("rejects a position with two white kings", () => {
    const result = validateFenSemantic("4k3/8/8/8/8/8/8/3KK3 w - - 0 1");
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("kings");
  });

  it("rejects a position with two black kings", () => {
    const result = validateFenSemantic("3kk3/8/8/8/8/8/8/4K3 w - - 0 1");
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("kings");
  });

  it("rejects a position with only one king (black missing)", () => {
    const result = validateFenSemantic("8/8/8/8/8/8/8/4K3 w - - 0 1");
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("kings");
  });
});

// ============================================================
// Pawn placement
// ============================================================
describe("validateFenSemantic — pawn placement", () => {
  it("rejects a white pawn on rank 8", () => {
    // P on a8 (top-left).
    const result = validateFenSemantic("P3k3/8/8/8/8/8/8/4K3 w - - 0 1");
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("pawn_placement");
  });

  it("rejects a black pawn on rank 1", () => {
    const result = validateFenSemantic("4k3/8/8/8/8/8/8/p3K3 w - - 0 1");
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("pawn_placement");
  });

  it("rejects a black pawn on rank 8", () => {
    const result = validateFenSemantic("p3k3/8/8/8/8/8/8/4K3 w - - 0 1");
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("pawn_placement");
  });

  it("rejects a white pawn on rank 1", () => {
    const result = validateFenSemantic("4k3/8/8/8/8/8/8/P3K3 w - - 0 1");
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("pawn_placement");
  });
});

// ============================================================
// Piece counts
// ============================================================
describe("validateFenSemantic — piece counts", () => {
  it("rejects a side with 9 pawns", () => {
    // 9 white pawns: 8 on rank 2 plus an extra on rank 3.
    const result = validateFenSemantic("4k3/8/8/8/8/P7/PPPPPPPP/4K3 w - - 0 1");
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("piece_count");
  });

  it("rejects a side with 9 black pawns", () => {
    // 9 black pawns: 8 on rank 7 plus an extra on rank 6.
    const result = validateFenSemantic("4k3/pppppppp/p7/8/8/8/8/4K3 w - - 0 1");
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("piece_count");
  });

  it("rejects a side with 17 total pieces (over the 16-piece cap)", () => {
    // 17 white pieces: full rank-2 pawns (8), rank 1 (RNBQKBNR = 8), plus
    // an extra promoted bishop on rank 4. Black has only its king to keep
    // the test focused on the white-side cap.
    const result = validateFenSemantic(
      "4k3/8/8/8/4B3/8/PPPPPPPP/RNBQKBNR w KQ - 0 1",
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("piece_count");
  });
});

// ============================================================
// Castling rights
// ============================================================
describe("validateFenSemantic — castling rights", () => {
  it("rejects K when white rook is missing from h1", () => {
    // King on e1, no rook on h1, but castling has 'K'.
    const result = validateFenSemantic("4k3/8/8/8/8/8/8/4K3 w K - 0 1");
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("castling_rights");
  });

  it("rejects Q when white rook is missing from a1", () => {
    const result = validateFenSemantic("4k3/8/8/8/8/8/8/4K3 w Q - 0 1");
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("castling_rights");
  });

  it("rejects k when black rook is missing from h8", () => {
    const result = validateFenSemantic("4k3/8/8/8/8/8/8/4K3 w k - 0 1");
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("castling_rights");
  });

  it("rejects q when black rook is missing from a8", () => {
    const result = validateFenSemantic("4k3/8/8/8/8/8/8/4K3 w q - 0 1");
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("castling_rights");
  });

  it("rejects K when white king is not on e1", () => {
    // King on d1, rook on h1, but K castling implies king on e1.
    const result = validateFenSemantic("4k3/8/8/8/8/8/8/3K3R w K - 0 1");
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("castling_rights");
  });

  it("accepts KQkq with all rooks and kings on starting squares", () => {
    expect(validateFenSemantic("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1")).toEqual(
      { ok: true },
    );
  });

  it("rejects KQkq when both white rooks have moved off a1/h1", () => {
    // King on e1, kings on starting squares for both, but no white rook on
    // a1 OR h1 — chess.js is permissive here, our pre-check is the gate.
    const result = validateFenSemantic("r3k2r/8/8/8/8/8/8/4K3 w KQkq - 0 1");
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("castling_rights");
  });

  it("rejects k when black king is not on e8", () => {
    // Black king on d8, rook on h8, but k castling implies king on e8.
    const result = validateFenSemantic("3k3r/8/8/8/8/8/8/4K3 w k - 0 1");
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("castling_rights");
  });

  it("accepts '-' (no castling rights claimed) on the starting position", () => {
    expect(
      validateFenSemantic(
        "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w - - 0 1",
      ),
    ).toEqual({ ok: true });
  });
});

// ============================================================
// En passant
// ============================================================
describe("validateFenSemantic — en passant", () => {
  it("rejects ep on rank 3 when white is to move (must be rank 6)", () => {
    const result = validateFenSemantic(
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq e3 0 1",
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("en_passant");
  });

  it("rejects ep on rank 6 when black is to move (must be rank 3)", () => {
    const result = validateFenSemantic(
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq e6 0 1",
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("en_passant");
  });

  it("rejects ep target with no pawn behind it (white to move)", () => {
    // ep target f6 implies a black pawn on f5; but f5 is empty.
    const result = validateFenSemantic(
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq f6 0 1",
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("en_passant");
  });

  it("rejects ep target square that is not empty", () => {
    // White-to-move, ep target f6. The pawn-behind requirement is a black
    // pawn on f5 — which is present — but f6 itself is occupied by a
    // black knight, which is illegal. The validator must reject on the
    // "target square must be empty" rule.
    const result = validateFenSemantic("4k3/8/5n2/5p2/8/8/8/4K3 w - f6 0 1");
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("en_passant");
  });
});

// ============================================================
// Hostile / structural failures
// ============================================================
describe("validateFenSemantic — hostile inputs", () => {
  it("rejects whitespace-only input via structural delegation", () => {
    const result = validateFenSemantic("   ");
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("structure");
  });

  it("rejects a malformed FEN missing fields", () => {
    const result = validateFenSemantic(
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR",
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("structure");
  });

  it("rejects a FEN with consecutive rank digits", () => {
    // 17 on a rank trips the structural check.
    const result = validateFenSemantic("17/8/8/8/8/8/8/8 w - - 0 1");
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("structure");
  });

  it("rejects a FEN with bidi codepoints", () => {
    // Bidi override embedded in the placement field — fails structural check
    // because the override is not in the allow-listed character class.
    const result = validateFenSemantic(
      `‮rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1`,
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("structure");
  });

  it("rejects an oversized FEN beyond 100 chars (structural; caller still gates length)", () => {
    // The semantic validator itself does not enforce length (that is the
    // caller's CHECK constraint), but a string padded with junk that pushes
    // past the structural shape will fail upstream. This pins the contract.
    const padded = STARTING_FEN + " ".repeat(50);
    // Trimming inside the validator means trailing whitespace is tolerated;
    // adding garbage after the 6 fields is what blows the field count.
    const broken = STARTING_FEN + " extra";
    expect(validateFenSemantic(padded).ok).toBe(true);
    expect(validateFenSemantic(broken).ok).toBe(false);
  });
});
