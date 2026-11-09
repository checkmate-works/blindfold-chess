import { describe, expect, it } from "vitest";

import {
  deriveSideFromPgn,
  resolveFenStart,
  resolvePgnStart,
} from "./start-position";

const START_PLACEMENT = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR";

describe("resolveFenStart", () => {
  it("accepts a full FEN and resets its clocks", () => {
    expect(resolveFenStart(`${START_PLACEMENT} w KQkq - 5 12`, "w")).toEqual({
      ok: true,
      value: { startingFen: `${START_PLACEMENT} w KQkq - 0 1`, moves: [] },
    });
  });

  it("accepts a placement alone with no castling and no en passant", () => {
    expect(resolveFenStart("4k3/8/8/8/8/8/4P3/4K3", "w")).toEqual({
      ok: true,
      value: { startingFen: "4k3/8/8/8/8/8/4P3/4K3 w - - 0 1", moves: [] },
    });
  });

  it("uses the given side to move over the FEN's own field", () => {
    const result = resolveFenStart("4k3/4p3/8/8/8/8/4P3/4K3 w - - 0 1", "b");
    expect(result.ok && result.value.startingFen).toBe(
      "4k3/4p3/8/8/8/8/4P3/4K3 b - - 0 1",
    );
  });

  it("drops castling rights the placement cannot support", () => {
    // White king on f1: neither white right is possible.
    const result = resolveFenStart("r3k2r/8/8/8/8/8/8/R4K1R w KQkq - 0 1", "w");
    expect(result.ok && result.value.startingFen).toBe(
      "r3k2r/8/8/8/8/8/8/R4K1R w kq - 0 1",
    );
  });

  it("drops an en-passant target with no pawn behind it", () => {
    const result = resolveFenStart(`${START_PLACEMENT} b KQkq e3 0 1`, "b");
    expect(result.ok && result.value.startingFen).toBe(
      `${START_PLACEMENT} b KQkq - 0 1`,
    );
  });

  it("keeps a supported en-passant target", () => {
    const fen = "rnbqkbnr/pppp1ppp/8/8/4pP2/8/PPPPP1PP/RNBQKBNR";
    const result = resolveFenStart(`${fen} b KQkq f3 0 1`, "b");
    expect(result.ok && result.value.startingFen).toBe(`${fen} b KQkq f3 0 1`);
  });

  it("rejects empty input and an empty board", () => {
    expect(resolveFenStart("   ", "w")).toEqual({
      ok: false,
      error: "positionEmpty",
    });
    expect(resolveFenStart("8/8/8/8/8/8/8/8", "w")).toEqual({
      ok: false,
      error: "positionEmpty",
    });
  });

  it("rejects a position without both kings", () => {
    expect(resolveFenStart("8/8/8/8/8/8/8/4K3", "w")).toEqual({
      ok: false,
      error: "positionInvalid",
    });
  });

  it("asks for the other side to move when the side not to move is in check", () => {
    // Black king on e8 attacked by the rook on e1; White to move is impossible.
    expect(resolveFenStart("4k3/8/8/8/8/8/8/K3R3", "w")).toEqual({
      ok: false,
      error: "positionCheckCorrected",
    });
    expect(resolveFenStart("4k3/8/8/8/8/8/8/K3R3", "b").ok).toBe(true);
  });
});

describe("resolvePgnStart", () => {
  it("returns the mainline moves from the standard position", () => {
    expect(resolvePgnStart("1. e4 e5 2. Nf3 Nc6")).toEqual({
      ok: true,
      value: { moves: ["e4", "e5", "Nf3", "Nc6"] },
    });
  });

  it("returns the [FEN] header as the starting position", () => {
    const fen = "4k3/8/8/8/8/8/4P3/4K3 w - - 0 1";
    const result = resolvePgnStart(`[SetUp "1"]\n[FEN "${fen}"]\n\n1. e4 Kd7`);
    expect(result).toEqual({
      ok: true,
      value: { startingFen: fen, moves: ["e4", "Kd7"] },
    });
  });

  it("rejects an empty and an unreadable PGN", () => {
    expect(resolvePgnStart(" \n")).toEqual({ ok: false, error: "pgnEmpty" });
    expect(resolvePgnStart("1. e4 e4")).toEqual({
      ok: false,
      error: "invalidPgn",
    });
  });
});

describe("deriveSideFromPgn", () => {
  it("picks the side to move after the last move", () => {
    expect(deriveSideFromPgn("1. e4")).toBe("black");
    expect(deriveSideFromPgn("1. e4 e5")).toBe("white");
  });

  it("falls back to the [FEN] side to move when there are no moves", () => {
    expect(
      deriveSideFromPgn('[SetUp "1"]\n[FEN "4k3/8/8/8/8/8/4P3/4K3 b - - 0 1"]'),
    ).toBe("black");
  });

  it("returns null for an empty or invalid PGN", () => {
    expect(deriveSideFromPgn("")).toBeNull();
    expect(deriveSideFromPgn("1. e4 e4")).toBeNull();
  });
});
