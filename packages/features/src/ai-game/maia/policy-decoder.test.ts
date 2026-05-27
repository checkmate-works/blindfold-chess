/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { describe, expect, it } from "vitest";

import {
  decodeMaia3Output,
  decodeMaia3Policy,
  decodeMaia3Value,
} from "./policy-decoder";
import { preprocessForMaia3 } from "./preprocess";
import {
  MAIA3_POLICY_SIZE,
  type MaiaConfig,
  type MaiaInferenceInput,
  type MaiaInferenceOutput,
} from "./types";

const CONFIG: MaiaConfig = { selfElo: 1500, opponentElo: 1500 };

const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

/**
 * Build an inference output with a single logit set high so the decoder
 * has a clear "top move" to surface.
 */
function singlePeakedOutput(
  peakIndex: number,
  valueLogits: [number, number, number] = [0, 0, 0],
): MaiaInferenceOutput {
  const policy = new Float32Array(MAIA3_POLICY_SIZE);
  policy[peakIndex] = 10; // dwarfs all other zeros under softmax
  return {
    policyLogits: policy,
    valueLogits: Float32Array.from(valueLogits),
  };
}

describe("decodeMaia3Policy", () => {
  it("returns legal moves only", () => {
    const input = preprocessForMaia3(STARTING_FEN, CONFIG);
    const output: MaiaInferenceOutput = {
      policyLogits: new Float32Array(MAIA3_POLICY_SIZE), // all zeros
      valueLogits: Float32Array.from([0, 0, 0]),
    };
    const ranked = decodeMaia3Policy(output, input);
    // 20 legal moves at the starting position
    expect(ranked.length).toBe(20);

    const allMoveStrings = ranked.map((r) => r.move);
    const expectedSubset = ["e2e4", "d2d4", "g1f3", "b1c3"];
    for (const m of expectedSubset) {
      expect(allMoveStrings).toContain(m);
    }
  });

  it("returns moves in descending probability order with a strongly-peaked logit", () => {
    const input = preprocessForMaia3(STARTING_FEN, CONFIG);

    // Pick the first legal-move index from the mask and boost its logit,
    // leaving everything else at 0. Resilient to move-table renumbering.
    const firstLegalIndex = input.legalMask.findIndex((v) => v === 1);
    expect(firstLegalIndex).toBeGreaterThanOrEqual(0);

    const policy = new Float32Array(MAIA3_POLICY_SIZE);
    policy[firstLegalIndex] = 5;
    const output: MaiaInferenceOutput = {
      policyLogits: policy,
      valueLogits: Float32Array.from([0, 0, 0]),
    };

    const ranked = decodeMaia3Policy(output, input);

    expect(ranked.length).toBeGreaterThan(0);
    // Monotonically descending probability.
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i - 1].probability).toBeGreaterThanOrEqual(
        ranked[i].probability,
      );
    }
    // Softmax over legal moves sums to ~1.
    const sum = ranked.reduce((acc, m) => acc + m.probability, 0);
    expect(sum).toBeCloseTo(1, 5);
    // Boosted entry dominates by a wide margin (e^5 ≈ 148 vs e^0 = 1).
    expect(ranked[0].probability).toBeGreaterThan(0.5);
  });

  it("mirrors moves back when the original FEN is black-to-move", () => {
    // After 1. e4, black to move — black's e7-e5 should appear in ranked
    // moves with normal "e7e5" coordinates (not the white-perspective
    // mirror "e2e4").
    const fen = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1";
    const input = preprocessForMaia3(fen, CONFIG);
    expect(input.blackToMove).toBe(true);

    const output: MaiaInferenceOutput = {
      policyLogits: new Float32Array(MAIA3_POLICY_SIZE),
      valueLogits: Float32Array.from([0, 0, 0]),
    };
    const ranked = decodeMaia3Policy(output, input);
    const moves = ranked.map((r) => r.move);
    expect(moves).toContain("e7e5");
    expect(moves).not.toContain("e2e4"); // would be the un-mirrored result
  });

  it("returns empty for an empty legal mask", () => {
    const input: MaiaInferenceInput = {
      boardTokens: new Float32Array(64 * 12),
      legalMask: new Float32Array(MAIA3_POLICY_SIZE), // all zero
      selfElo: 1500,
      opponentElo: 1500,
      blackToMove: false,
    };
    const output = singlePeakedOutput(0);
    expect(decodeMaia3Policy(output, input)).toEqual([]);
  });

  it("throws on wrong-length policy logits", () => {
    const input = preprocessForMaia3(STARTING_FEN, CONFIG);
    const output: MaiaInferenceOutput = {
      policyLogits: new Float32Array(100),
      valueLogits: Float32Array.from([0, 0, 0]),
    };
    expect(() => decodeMaia3Policy(output, input)).toThrow();
  });
});

describe("decodeMaia3Value", () => {
  it("interprets WDL logits as a win probability for the side to move", () => {
    const input = preprocessForMaia3(STARTING_FEN, CONFIG);
    // Skewed heavily towards win (channel 2).
    const output: MaiaInferenceOutput = {
      policyLogits: new Float32Array(MAIA3_POLICY_SIZE),
      valueLogits: Float32Array.from([0, 0, 10]),
    };
    const winProb = decodeMaia3Value(output, input);
    expect(winProb).toBeGreaterThan(0.99);
  });

  it("flips the win probability when black-to-move", () => {
    const blackToMoveFen =
      "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1";
    const input = preprocessForMaia3(blackToMoveFen, CONFIG);
    // From the *model's* perspective (post-mirror, white-to-move), this
    // logit pattern means white wins. In the original frame, "side to
    // move" is black, so the returned value should be ~0 (= white wins,
    // black loses).
    const output: MaiaInferenceOutput = {
      policyLogits: new Float32Array(MAIA3_POLICY_SIZE),
      valueLogits: Float32Array.from([0, 0, 10]),
    };
    const blackWinProb = decodeMaia3Value(output, input);
    expect(blackWinProb).toBeLessThan(0.01);
  });

  it("counts a draw as half a win", () => {
    const input = preprocessForMaia3(STARTING_FEN, CONFIG);
    // 100% draw logit → win prob should be ~0.5.
    const output: MaiaInferenceOutput = {
      policyLogits: new Float32Array(MAIA3_POLICY_SIZE),
      valueLogits: Float32Array.from([0, 10, 0]),
    };
    const winProb = decodeMaia3Value(output, input);
    expect(winProb).toBeCloseTo(0.5, 3);
  });

  it("throws on wrong-length value logits", () => {
    const input = preprocessForMaia3(STARTING_FEN, CONFIG);
    const output: MaiaInferenceOutput = {
      policyLogits: new Float32Array(MAIA3_POLICY_SIZE),
      valueLogits: Float32Array.from([0, 0]),
    };
    expect(() => decodeMaia3Value(output, input)).toThrow();
  });
});

describe("decodeMaia3Output", () => {
  it("returns both ranked moves and win probability", () => {
    const input = preprocessForMaia3(STARTING_FEN, CONFIG);
    const output: MaiaInferenceOutput = {
      policyLogits: new Float32Array(MAIA3_POLICY_SIZE),
      valueLogits: Float32Array.from([0, 0, 0]),
    };
    const decoded = decodeMaia3Output(output, input);
    expect(decoded.rankedMoves.length).toBe(20);
    // Equal logits → uniform draw value → 0.5
    expect(decoded.winProbability).toBeCloseTo(0.5, 3);
  });
});
