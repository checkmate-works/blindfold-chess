/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { describe, expect, it } from "vitest";

import { preprocessForMaia3 } from "./preprocess";
import {
  MAIA3_BOARD_TOKENS_SIZE,
  MAIA3_POLICY_SIZE,
  type MaiaConfig,
} from "./types";

const CONFIG: MaiaConfig = { selfElo: 1500, opponentElo: 1500 };

describe("preprocessForMaia3", () => {
  it("produces tensors of the documented shapes", () => {
    const input = preprocessForMaia3(
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      CONFIG,
    );
    expect(input.boardTokens.length).toBe(MAIA3_BOARD_TOKENS_SIZE);
    expect(input.legalMask.length).toBe(MAIA3_POLICY_SIZE);
  });

  it("threads the Elo config through verbatim", () => {
    const input = preprocessForMaia3(
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      { selfElo: 1300, opponentElo: 1800 },
    );
    expect(input.selfElo).toBe(1300);
    expect(input.opponentElo).toBe(1800);
  });

  it("marks blackToMove=false for white-to-move positions", () => {
    const input = preprocessForMaia3(
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      CONFIG,
    );
    expect(input.blackToMove).toBe(false);
  });

  it("marks blackToMove=true for black-to-move positions", () => {
    const input = preprocessForMaia3(
      "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
      CONFIG,
    );
    expect(input.blackToMove).toBe(true);
  });

  it("includes all 20 starting-position legal moves in the mask", () => {
    const input = preprocessForMaia3(
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      CONFIG,
    );
    const legalCount = Array.from(input.legalMask).filter(
      (v) => v === 1,
    ).length;
    // 16 pawn moves (8 single + 8 double) + 4 knight moves
    expect(legalCount).toBe(20);
  });

  it("produces identical board tokens for a position and its pre-mirrored equivalent", () => {
    // The Maia 3 board encoder is supposed to be invariant to which "side"
    // of the mirror the caller hands it. Here we provide:
    //   - originalFen     : after 1. e4, black to move
    //   - preMirroredFen  : the manually-mirrored equivalent, white to move
    // After preprocessing, both should encode to the same board tokens.
    const originalFen =
      "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1";
    const preMirroredFen =
      "rnbqkbnr/pppp1ppp/8/4p3/8/8/PPPPPPPP/RNBQKBNR w KQkq e6 0 1";

    const a = preprocessForMaia3(originalFen, CONFIG);
    const b = preprocessForMaia3(preMirroredFen, CONFIG);

    expect(Array.from(a.boardTokens)).toEqual(Array.from(b.boardTokens));
    // The flag still distinguishes them: only the caller-supplied side
    // affects `blackToMove`, not whether the boards encode the same way.
    expect(a.blackToMove).toBe(true);
    expect(b.blackToMove).toBe(false);
  });
});
