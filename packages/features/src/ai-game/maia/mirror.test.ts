/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { describe, expect, it } from "vitest";

import { mirrorFen, mirrorSquare, mirrorUciMove } from "./mirror";

describe("mirrorSquare", () => {
  it("flips the rank while keeping the file", () => {
    expect(mirrorSquare("e2")).toBe("e7");
    expect(mirrorSquare("a1")).toBe("a8");
    expect(mirrorSquare("h8")).toBe("h1");
  });
});

describe("mirrorUciMove", () => {
  it("mirrors a plain move", () => {
    expect(mirrorUciMove("e2e4")).toBe("e7e5");
    expect(mirrorUciMove("g1f3")).toBe("g8f6");
  });

  it("preserves the promotion suffix", () => {
    expect(mirrorUciMove("a7a8q")).toBe("a2a1q");
    expect(mirrorUciMove("e7e8n")).toBe("e2e1n");
  });
});

describe("mirrorFen", () => {
  it("flips the starting position to a black-to-move equivalent", () => {
    // Starting position is symmetric in piece placement, so mirror just
    // swaps the active colour back (here we start from white-to-move).
    const start = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    const mirrored = mirrorFen(start);
    expect(mirrored).toBe(
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1",
    );
  });

  it("mirrors a black-to-move position into a white-to-move one", () => {
    // After 1. e4 — black to move. The mirror swaps active colour and
    // reflects ranks + colours, so:
    //   - active colour flips b → w
    //   - the white pawn on e4 becomes a black pawn on e5
    //     (white's rank 4 becomes black's rank 5 after the flip-and-swap)
    //   - en passant square e3 mirrors to e6
    //   - both sides retain full castling rights (KQkq → KQkq via the
    //     swap-then-canonical-emit path)
    const fen = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1";
    const mirrored = mirrorFen(fen);
    expect(mirrored).toBe(
      "rnbqkbnr/pppp1ppp/8/4p3/8/8/PPPPPPPP/RNBQKBNR w KQkq e6 0 1",
    );
  });

  it("preserves a `-` castling field", () => {
    const fen = "8/8/8/4k3/4K3/8/8/8 w - - 10 30";
    const mirrored = mirrorFen(fen);
    expect(mirrored.split(" ")[2]).toBe("-");
  });

  it("preserves a `-` en-passant field", () => {
    const fen = "8/8/8/4k3/4K3/8/8/8 w - - 10 30";
    const mirrored = mirrorFen(fen);
    expect(mirrored.split(" ")[3]).toBe("-");
  });

  it("hands each side's castling rights to the other, in KQkq order", () => {
    const castlingOf = (castling: string) =>
      mirrorFen(`r3k2r/8/8/8/8/8/8/R3K2R w ${castling} - 0 1`).split(" ")[2];
    expect(castlingOf("K")).toBe("k");
    expect(castlingOf("Q")).toBe("q");
    expect(castlingOf("k")).toBe("K");
    expect(castlingOf("q")).toBe("Q");
    expect(castlingOf("Kq")).toBe("Qk");
    expect(castlingOf("Qk")).toBe("Kq");
  });

  it("swaps every piece colour and leaves empty-square runs alone", () => {
    const fen = "4k3/1q6/8/2N5/8/8/6r1/4K3 w - - 3 40";
    expect(mirrorFen(fen)).toBe("4k3/6R1/8/8/2n5/8/1Q6/4K3 b - - 3 40");
  });

  it("throws when a field is missing", () => {
    expect(() => mirrorFen("8/8/8/4k3/4K3/8/8/8 w - - 10")).toThrow(
      "mirrorFen: FEN must have 6 space-separated fields, got: 8/8/8/4k3/4K3/8/8/8 w - - 10",
    );
  });

  it("throws on a malformed FEN", () => {
    expect(() => mirrorFen("not-a-fen")).toThrow();
  });
});
