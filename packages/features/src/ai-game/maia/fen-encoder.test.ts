/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { describe, expect, it } from "vitest";

import { encodeFenToMaia3BoardTokens } from "./fen-encoder";
import { MAIA3_BOARD_TOKENS_SIZE } from "./types";

const FILES = 8;
const CHANNELS = 12;

function squareIndex(file: number, rank: number): number {
  return (rank * FILES + file) * CHANNELS;
}

describe("encodeFenToMaia3BoardTokens", () => {
  it("returns a Float32Array of length 768", () => {
    const tokens = encodeFenToMaia3BoardTokens(
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    );
    expect(tokens).toBeInstanceOf(Float32Array);
    expect(tokens.length).toBe(MAIA3_BOARD_TOKENS_SIZE);
  });

  it("sets exactly one channel to 1.0 per occupied square in the starting position", () => {
    const tokens = encodeFenToMaia3BoardTokens(
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    );

    // 32 pieces, each with exactly one 1.0 in its 12-channel slot.
    const ones = Array.from(tokens).filter((v) => v === 1.0).length;
    expect(ones).toBe(32);
    // Everything else is exactly 0.
    const others = Array.from(tokens).filter((v) => v !== 0 && v !== 1).length;
    expect(others).toBe(0);
  });

  it("encodes a1 as white rook (channel 3) at rank 0 file 0", () => {
    const tokens = encodeFenToMaia3BoardTokens(
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    );
    expect(tokens[squareIndex(0, 0) + 3]).toBe(1.0);
  });

  it("encodes e1 as white king (channel 5)", () => {
    const tokens = encodeFenToMaia3BoardTokens(
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    );
    expect(tokens[squareIndex(4, 0) + 5]).toBe(1.0);
  });

  it("encodes e8 as black king (channel 11)", () => {
    const tokens = encodeFenToMaia3BoardTokens(
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    );
    expect(tokens[squareIndex(4, 7) + 11]).toBe(1.0);
  });

  it("encodes a black pawn (channel 6) at e5 after 1. e4 e5", () => {
    const tokens = encodeFenToMaia3BoardTokens(
      "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2",
    );
    // e5 is file 4, rank 4
    expect(tokens[squareIndex(4, 4) + 6]).toBe(1.0);
    // The white pawn moved off e2 and onto e4
    expect(tokens[squareIndex(4, 1) + 0]).toBe(0);
    expect(tokens[squareIndex(4, 3) + 0]).toBe(1.0);
  });

  it("ignores fields past piece placement", () => {
    const a = encodeFenToMaia3BoardTokens(
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    );
    const b = encodeFenToMaia3BoardTokens(
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b - e3 99 1",
    );
    expect(Array.from(a)).toEqual(Array.from(b));
  });

  it("throws on the wrong number of ranks", () => {
    expect(() =>
      encodeFenToMaia3BoardTokens(
        "rnbqkbnr/pppppppp/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      ),
    ).toThrow();
  });

  it("throws on an unknown piece character", () => {
    expect(() =>
      encodeFenToMaia3BoardTokens(
        "Xnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      ),
    ).toThrow();
  });

  it("throws when a rank does not account for all 8 files", () => {
    // 7 squares on rank 8 (qkbnr + 2 → only 7 files described).
    expect(() =>
      encodeFenToMaia3BoardTokens(
        "qkbnr2/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      ),
    ).toThrow();
  });
});
