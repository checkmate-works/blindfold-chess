/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Maia adapter — types describing the inputs and outputs of the Maia 3
 * "simplified" ONNX model.
 *
 * Reference implementation: CSSLab/maia-platform-frontend (GPL-3.0).
 * https://github.com/CSSLab/maia-platform-frontend
 */

import type { UciMove } from "@blindfold-chess/types";

/**
 * A continuous Elo rating. Maia 3 takes raw Elo as a `float32` input and
 * interpolates internally — there are no discrete model variants per
 * rating band (unlike the earlier `maia_kdd_1100`..`maia_kdd_1900` series).
 *
 * No runtime clamping is enforced at this layer; callers should pass a
 * sensible value (~1000..2500). The model degrades gracefully outside the
 * training distribution but is most accurate inside it.
 */
export type MaiaElo = number;

/**
 * Per-request configuration for a Maia opponent.
 *
 * Maia models human play conditioned on **both** ratings — `selfElo` is
 * "what skill level should the AI play at" and `opponentElo` is "who is
 * Maia imagining its opponent is". The opponent rating influences move
 * selection because real humans adapt their style to perceived
 * opposition; passing the player's true rating gives the most natural
 * response.
 */
export type MaiaConfig = Readonly<{
  selfElo: MaiaElo;
  opponentElo: MaiaElo;
}>;

/**
 * Maia 3 input/output tensor shapes (single-position inference).
 *
 *   boardTokens : Float32Array, length 64 * 12 = 768
 *       One-hot piece occupancy on 64 squares × 12 piece channels
 *       (white P,N,B,R,Q,K then black p,n,b,r,q,k). The board is always
 *       encoded from white's perspective; if the position is black-to-
 *       move the FEN is vertically mirrored and the side is swapped
 *       before encoding.
 *   legalMask : Float32Array, length 4352
 *       1.0 at indices corresponding to legal moves, 0.0 elsewhere.
 *       Indices are defined by the Maia 3 move table.
 *   policyLogits : Float32Array, length 4352
 *       Raw policy head output (pre-softmax) over all possible moves.
 *   valueLogits : Float32Array, length 3
 *       WDL (loss, draw, win) logits for the side to move, pre-softmax.
 */
export const MAIA3_BOARD_TOKENS_SIZE = 64 * 12;
export const MAIA3_POLICY_SIZE = 4352;
export const MAIA3_VALUE_SIZE = 3;

export type MaiaBoardTokens = Float32Array;
export type MaiaLegalMask = Float32Array;
export type MaiaPolicyLogits = Float32Array;
export type MaiaValueLogits = Float32Array;

/**
 * The fully-prepared input to a single Maia 3 forward pass. Constructed
 * by {@link import("./preprocess").preprocessForMaia3}.
 */
export type MaiaInferenceInput = Readonly<{
  boardTokens: MaiaBoardTokens;
  legalMask: MaiaLegalMask;
  selfElo: MaiaElo;
  opponentElo: MaiaElo;
  /**
   * True if the original FEN was black-to-move and was mirrored to white's
   * perspective for the model. The policy decoder needs this to mirror
   * output moves back into the original FEN's coordinate frame.
   */
  blackToMove: boolean;
}>;

/**
 * The raw outputs of a single Maia 3 forward pass.
 */
export type MaiaInferenceOutput = Readonly<{
  policyLogits: MaiaPolicyLogits;
  valueLogits: MaiaValueLogits;
}>;

/**
 * A legal move plus its softmax probability under the Maia policy.
 * Returned in descending-probability order by the decoder.
 */
export type MaiaScoredMove = Readonly<{
  move: UciMove;
  probability: number;
}>;

/**
 * The complete decoded result of a Maia inference.
 */
export type MaiaDecodedResult = Readonly<{
  /** Legal moves ranked by Maia policy probability, descending. */
  rankedMoves: ReadonlyArray<MaiaScoredMove>;
  /**
   * Estimated win probability for the side to move in the *original* FEN
   * (i.e. mirrored back if the position was black-to-move). Range [0, 1].
   */
  winProbability: number;
}>;
