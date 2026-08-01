import { describe, expect, it } from "vitest";

import { diagnoseChessJsPgnError, diagnosePgn } from "../pgn-diagnosis";

describe("diagnosePgn", () => {
  it("says nothing about a PGN that parses", () => {
    expect(diagnosePgn("1. e4 c5 2. Nf3 d6 (2... Nc6 3. d4) 3. d4")).toBeNull();
  });

  it("treats blank input as not-yet-filled-in", () => {
    expect(diagnosePgn("")).toBeNull();
    expect(diagnosePgn("  \n ")).toBeNull();
  });

  it("locates the move that cannot be played", () => {
    const pgn =
      "1. Nf3 d5 2. g3 d4 3. c3 dxc3 4. bxc3 Nc6 5. Bg2 e6 6. d4 b6 7. Ne5 Nxe5 8. Bxa8 d7 9. Bg2 Ng6";
    expect(diagnosePgn(pgn)).toEqual({
      code: "illegalMove",
      san: "d7",
      moveNumber: 8,
      ply: 16,
    });
  });

  it("locates an illegal move inside a variation", () => {
    expect(diagnosePgn("1. e4 e5 (1... Ke7) 2. Nf3")).toEqual({
      code: "illegalMove",
      san: "Ke7",
      moveNumber: 1,
      ply: 2,
    });
  });

  it("reports movetext with no moves as such", () => {
    expect(diagnosePgn('[Event "x"]\n\n*')).toEqual({ code: "noMoves" });
  });

  it("reports a broken [FEN] header as unreadable", () => {
    expect(diagnosePgn('[FEN "not a fen"]\n[SetUp "1"]\n\n1. e4')).toEqual({
      code: "unreadable",
    });
  });

  it("never quotes a token that is not shaped like a move", () => {
    // The rejected token is arbitrary text the user pasted; it must not be
    // echoed back into the page.
    const diagnosis = diagnosePgn("1. e4 <script>alert(1)</script>");
    expect(diagnosis).toEqual({ code: "unreadable" });
  });

  it("does not quote an over-long token", () => {
    expect(diagnosePgn(`1. e4 ${"a".repeat(80)}`)).toEqual({
      code: "unreadable",
    });
  });
});

describe("diagnoseChessJsPgnError", () => {
  it("recovers the move name from chess.js' own validation message", () => {
    expect(diagnoseChessJsPgnError("Invalid move in PGN: d7")).toEqual({
      code: "illegalMoveUnlocated",
      san: "d7",
    });
  });

  it("recovers the move name from the PGN grammar parser message", () => {
    expect(diagnoseChessJsPgnError('Expected move but "Qz9" found.')).toEqual({
      code: "illegalMoveUnlocated",
      san: "Qz9",
    });
  });

  it("falls back to unreadable when the message names nothing", () => {
    expect(diagnoseChessJsPgnError("Something went wrong")).toEqual({
      code: "unreadable",
    });
  });

  it("does not quote a recovered token that is not move-shaped", () => {
    expect(
      diagnoseChessJsPgnError('Expected move but "<img src=x>" found.'),
    ).toEqual({ code: "unreadable" });
  });
});
