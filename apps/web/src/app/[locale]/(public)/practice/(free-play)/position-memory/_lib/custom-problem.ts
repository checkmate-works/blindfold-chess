import { isBlackToMoveFromFen, validateFenFormat } from '@blindfold-chess/features/chess-core/fen';

import { decodeFenFromBase64Url } from './share-url';
import type { PositionData } from './types';

/**
 * Upper bound on the Base64URL token length. A FEN is ~25–90 chars, so 256
 * comfortably covers any legal board while rejecting oversized/abusive input
 * before it reaches the (cheap but unbounded) decoder.
 */
const MAX_TOKEN_LENGTH = 256;

/**
 * Resolve a `custom/<token>` instant-problem URL segment into the position
 * data the session needs.
 *
 * The token is a Base64URL-encoded FEN (see {@link encodeFenToBase64Url}). We
 * length-guard, decode, then run the chess.js-free {@link validateFenFormat}
 * — which intentionally accepts kingless / otherwise-illegal-but-structurally-
 * valid positions, matching the existing custom-FEN session flow. Returns null
 * for any malformed input so callers can `notFound()`.
 */
export function resolveCustomProblem(token: string): PositionData | null {
  if (!token || token.length > MAX_TOKEN_LENGTH) return null;

  const fen = decodeFenFromBase64Url(token);
  if (!fen || !validateFenFormat(fen)) return null;

  return { fen, isBlackToMove: isBlackToMoveFromFen(fen) };
}
