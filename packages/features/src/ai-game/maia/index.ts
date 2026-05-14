/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Maia adapter — pure barrel.
 *
 * This module wraps the Maia 3 neural-network chess engine
 * (https://maiachess.com, https://github.com/CSSLab/maia-chess) so that
 * the rest of the codebase can drive it through the {@link ChessOpponent}
 * port. All transforms exposed here are pure: FEN → tensors, tensors →
 * scored moves. The actual ONNX inference call lives at the app layer
 * (e.g. an ONNX-Runtime-Web Worker in `apps/web`) — keeping this
 * package platform-independent.
 *
 * Derived from CSSLab/maia-platform-frontend (GPL-3.0).
 */

export type {
  MaiaBoardTokens,
  MaiaConfig,
  MaiaDecodedResult,
  MaiaElo,
  MaiaInferenceInput,
  MaiaInferenceOutput,
  MaiaLegalMask,
  MaiaPolicyLogits,
  MaiaScoredMove,
  MaiaValueLogits,
} from "./types";

export {
  MAIA3_BOARD_TOKENS_SIZE,
  MAIA3_POLICY_SIZE,
  MAIA3_VALUE_SIZE,
} from "./types";

export { mirrorFen, mirrorSquare, mirrorUciMove } from "./mirror";

export { encodeFenToMaia3BoardTokens } from "./fen-encoder";

export { skillLevelToMaiaElo } from "./elo";

export type { MaiaRating } from "./ratings";
export {
  DEFAULT_MAIA_RATING,
  MAIA_RATINGS,
  isMaiaRating,
  maiaRatingToElo,
} from "./ratings";

export { preprocessForMaia3 } from "./preprocess";

export {
  decodeMaia3Output,
  decodeMaia3Policy,
  decodeMaia3Value,
} from "./policy-decoder";
