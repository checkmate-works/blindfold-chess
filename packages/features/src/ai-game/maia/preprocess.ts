/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Maia adapter — single-position preprocessing pipeline.
 *
 * Pulls together the three pure transforms needed before a Maia 3
 * inference call:
 *
 *   1. Vertical-mirror black-to-move positions so the model always
 *      sees a white-perspective board.
 *   2. Encode the (now-canonical) board into a Float32Array tensor.
 *   3. Compute a binary legal-moves mask over the Maia 3 move
 *      vocabulary (length 4352), driven by chess-core's legal-move
 *      generation in the *post-mirror* position.
 *
 * The function is pure: same input → same output, no I/O. The output
 * carries a `blackToMove` flag so the *decoder* can mirror Maia's chosen
 * move back into the original FEN's coordinate frame.
 *
 * Reference implementation: CSSLab/maia-platform-frontend (GPL-3.0),
 * `src/lib/engine/tensor.ts::preprocessMaia3`.
 */

import { getLegalMoves, isBlackToMoveFromFen } from "../../chess-core";

import { encodeFenToMaia3BoardTokens } from "./fen-encoder";
import { mirrorFen } from "./mirror";
import { maia3MoveToIndex } from "./move-tables/moves-maia3";
import {
  MAIA3_POLICY_SIZE,
  type MaiaConfig,
  type MaiaInferenceInput,
  type MaiaLegalMask,
} from "./types";

/**
 * Build the binary legal-moves mask consumed by the Maia 3 policy
 * decoder. One entry per move in the model's 4352-move vocabulary,
 * set to 1.0 for legal moves in `whiteToMoveFen` and 0.0 otherwise.
 *
 * Legal-but-out-of-vocabulary moves (e.g. extremely rare under-
 * promotions absent from Maia's training distribution) are silently
 * skipped — the mask just leaves them at 0. The decoder will therefore
 * never select them.
 *
 * `whiteToMoveFen` must already be in white-to-move orientation;
 * callers handle mirroring at the {@link preprocessForMaia3} layer.
 */
function buildLegalMovesMask(whiteToMoveFen: string): MaiaLegalMask {
  const mask = new Float32Array(MAIA3_POLICY_SIZE);
  const moves = getLegalMoves(whiteToMoveFen, { verbose: true });
  for (const move of moves) {
    const promotion = move.promotion ?? "";
    const uci = `${move.from}${move.to}${promotion}`;
    const index = maia3MoveToIndex(uci);
    if (index !== undefined) {
      mask[index] = 1.0;
    }
  }
  return mask;
}

/**
 * Preprocess a single position for Maia 3 inference.
 *
 * Returns a fully-constructed {@link MaiaInferenceInput}:
 *   - `boardTokens` : the (mirrored-if-needed) board as a 768-float tensor
 *   - `legalMask`   : the 4352-entry legal-moves mask for the model
 *   - `selfElo`     : passed through from `config`
 *   - `opponentElo` : passed through from `config`
 *   - `blackToMove` : true iff the original FEN was black-to-move
 *                     (decoder needs this to mirror the chosen move back)
 *
 * Throws on malformed FEN, propagating the error from `chess-core`.
 */
export function preprocessForMaia3(
  fen: string,
  config: MaiaConfig,
): MaiaInferenceInput {
  const blackToMove = isBlackToMoveFromFen(fen);
  const canonicalFen = blackToMove ? mirrorFen(fen) : fen;

  const boardTokens = encodeFenToMaia3BoardTokens(canonicalFen);
  const legalMask = buildLegalMovesMask(canonicalFen);

  return {
    boardTokens,
    legalMask,
    selfElo: config.selfElo,
    opponentElo: config.opponentElo,
    blackToMove,
  };
}
