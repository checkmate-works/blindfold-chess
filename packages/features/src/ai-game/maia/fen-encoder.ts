/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Maia adapter — FEN → board-tokens tensor encoder for the Maia 3
 * "simplified" model. The model expects a flat Float32Array of length
 * 64 × 12 with a one-hot piece occupancy: for each chess square, a
 * 12-element slot tagging which piece (if any) sits there.
 *
 * The encoder assumes the supplied FEN is already in "white to move"
 * orientation. Callers that receive a black-to-move FEN should
 * vertically-mirror it first via `mirror.ts` so the model always sees a
 * white-perspective position.
 *
 * Reference implementation: CSSLab/maia-platform-frontend (GPL-3.0),
 * `src/lib/engine/tensor.ts::boardToMaia3Tokens`.
 */

import { MAIA3_BOARD_TOKENS_SIZE, type MaiaBoardTokens } from "./types";

/**
 * Piece-channel order required by the Maia 3 model.
 *
 *   0..5  : white  P, N, B, R, Q, K
 *   6..11 : black  p, n, b, r, q, k
 */
const PIECE_CHANNELS: ReadonlyArray<string> = [
  "P",
  "N",
  "B",
  "R",
  "Q",
  "K",
  "p",
  "n",
  "b",
  "r",
  "q",
  "k",
];

const FILES = 8;
const RANKS = 8;
const CHANNELS_PER_SQUARE = PIECE_CHANNELS.length;

/**
 * Encode the piece-placement field of a FEN string into a Maia 3 board-
 * tokens tensor. Returns a freshly-allocated Float32Array of length 768.
 *
 * Only the *first field* of the FEN (piece placement) is consulted — the
 * Maia 3 simplified model does not consume castling rights, en passant,
 * or the side-to-move plane (the side-to-move is handled by mirroring at
 * a higher layer rather than encoded into the tensor).
 *
 * Throws if the FEN's first field does not describe exactly 8 ranks.
 */
export function encodeFenToMaia3BoardTokens(fen: string): MaiaBoardTokens {
  const firstField = fen.split(" ")[0];
  if (!firstField) {
    throw new Error(`encodeFenToMaia3BoardTokens: empty FEN: ${fen}`);
  }

  const rows = firstField.split("/");
  if (rows.length !== RANKS) {
    throw new Error(
      `encodeFenToMaia3BoardTokens: FEN piece placement must have 8 ranks, got ${rows.length}: ${fen}`,
    );
  }

  const tokens = new Float32Array(MAIA3_BOARD_TOKENS_SIZE);

  // FEN rank 0 is rank 8 on the board; we want index 0 to correspond to
  // a1 (file 0, rank 0), so iterate ranks bottom-up.
  for (let fenRank = 0; fenRank < RANKS; fenRank++) {
    const boardRow = RANKS - 1 - fenRank;
    let file = 0;
    for (const ch of rows[fenRank]) {
      const emptyCount = parseInt(ch, 10);
      if (!Number.isNaN(emptyCount)) {
        file += emptyCount;
        continue;
      }
      const channel = PIECE_CHANNELS.indexOf(ch);
      if (channel < 0) {
        throw new Error(
          `encodeFenToMaia3BoardTokens: unknown piece '${ch}' in FEN: ${fen}`,
        );
      }
      const square = boardRow * FILES + file;
      tokens[square * CHANNELS_PER_SQUARE + channel] = 1.0;
      file += 1;
    }
    if (file !== FILES) {
      throw new Error(
        `encodeFenToMaia3BoardTokens: rank ${fenRank} resolves to ${file} files, expected ${FILES}: ${fen}`,
      );
    }
  }

  return tokens;
}
