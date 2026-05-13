/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Maia adapter — output decoder.
 *
 * Two pure transforms over Maia 3's raw inference outputs:
 *
 *   - `decodeMaia3Policy` softmaxes the policy logits over *legal* moves
 *     only (illegal moves are masked out), undoes the board mirror if the
 *     original position was black-to-move, and returns the moves ranked
 *     by probability descending.
 *
 *   - `decodeMaia3Value` softmaxes the 3-channel WDL logits into a
 *     0..1 win probability for the side to move in the *original* FEN
 *     (mirrored back if needed).
 *
 * Reference implementation: CSSLab/maia-platform-frontend (GPL-3.0),
 * `src/lib/engine/maia.ts::processOutputsMaia3`.
 */

import type { UciMove } from "@blindfold-chess/types";

import { mirrorUciMove } from "./mirror";
import { maia3IndexToMove } from "./move-tables/moves-maia3";
import {
  MAIA3_POLICY_SIZE,
  MAIA3_VALUE_SIZE,
  type MaiaDecodedResult,
  type MaiaInferenceInput,
  type MaiaInferenceOutput,
  type MaiaScoredMove,
} from "./types";

/**
 * Numerically-stable softmax over the supplied values. Returns a fresh
 * array of the same length whose entries sum to 1.
 */
function softmax(values: ReadonlyArray<number>): number[] {
  if (values.length === 0) return [];
  const max = Math.max(...values);
  const exps = values.map((v) => Math.exp(v - max));
  const sum = exps.reduce((acc, x) => acc + x, 0);
  return exps.map((x) => x / sum);
}

/**
 * Decode Maia 3 policy logits into legal moves ranked by probability,
 * returned in the *original* FEN's coordinate frame.
 *
 * If `input.blackToMove` is true, the UCI strings emerging from the
 * Maia 3 move table are mirrored back so they reference the squares on
 * the original board (Maia internally sees a flipped board).
 *
 * Probabilities are a softmax over the legal-and-in-vocab subset of
 * moves. Out-of-vocabulary legal moves (extremely rare) are silently
 * dropped — they could only ever appear at probability 0 anyway since
 * the model has no logit for them.
 *
 * The returned array is sorted by descending probability. An empty
 * array means the position has no legal moves *that the model knows
 * about* — the caller should treat this as a checkmated / stalemated
 * position from Maia's point of view.
 */
export function decodeMaia3Policy(
  output: MaiaInferenceOutput,
  input: MaiaInferenceInput,
): ReadonlyArray<MaiaScoredMove> {
  if (output.policyLogits.length !== MAIA3_POLICY_SIZE) {
    throw new Error(
      `decodeMaia3Policy: policy logits must have length ${MAIA3_POLICY_SIZE}, got ${output.policyLogits.length}`,
    );
  }
  if (input.legalMask.length !== MAIA3_POLICY_SIZE) {
    throw new Error(
      `decodeMaia3Policy: legal mask must have length ${MAIA3_POLICY_SIZE}, got ${input.legalMask.length}`,
    );
  }

  type Candidate = { index: number; logit: number; uci: string };
  const candidates: Candidate[] = [];
  for (let i = 0; i < MAIA3_POLICY_SIZE; i++) {
    if (input.legalMask[i] === 0) continue;
    const uci = maia3IndexToMove(i);
    if (uci === undefined) continue;
    candidates.push({ index: i, logit: output.policyLogits[i], uci });
  }

  if (candidates.length === 0) return [];

  const probs = softmax(candidates.map((c) => c.logit));

  const scored = candidates
    .map(
      (c, i): MaiaScoredMove => ({
        move: (input.blackToMove ? mirrorUciMove(c.uci) : c.uci) as UciMove,
        probability: probs[i],
      }),
    )
    .sort((a, b) => b.probability - a.probability);

  return scored;
}

/**
 * Decode the 3-channel WDL logits into a win probability for the side
 * to move in the *original* FEN.
 *
 * The model emits WDL from white-to-move's perspective (because the
 * board was mirrored to white-perspective during preprocessing). If
 * the original FEN was black-to-move, we flip `winProb` to `1 - winProb`
 * so the returned value always describes *the side that actually has
 * the move*.
 *
 * Result is a probability in [0, 1].
 */
export function decodeMaia3Value(
  output: MaiaInferenceOutput,
  input: MaiaInferenceInput,
): number {
  if (output.valueLogits.length !== MAIA3_VALUE_SIZE) {
    throw new Error(
      `decodeMaia3Value: value logits must have length ${MAIA3_VALUE_SIZE}, got ${output.valueLogits.length}`,
    );
  }
  const [loss, draw, win] = softmax([
    output.valueLogits[0],
    output.valueLogits[1],
    output.valueLogits[2],
  ]);
  // Side-to-move-in-mirrored-frame win prob — counts a draw as half a win.
  void loss;
  const sideToMoveWin = win + 0.5 * draw;
  return input.blackToMove ? 1 - sideToMoveWin : sideToMoveWin;
}

/**
 * One-shot decode covering both policy and value, mirroring the shape
 * of {@link MaiaInferenceOutput} on the input side.
 */
export function decodeMaia3Output(
  output: MaiaInferenceOutput,
  input: MaiaInferenceInput,
): MaiaDecodedResult {
  return {
    rankedMoves: decodeMaia3Policy(output, input),
    winProbability: decodeMaia3Value(output, input),
  };
}
