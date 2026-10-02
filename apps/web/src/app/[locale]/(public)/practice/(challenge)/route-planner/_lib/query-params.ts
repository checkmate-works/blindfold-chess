import type { RoutePlannerPieceType } from '@blindfold-chess/features/route-planner';

import { PIECE_NAME_TO_SHORT, PIECE_SHORT_TO_NAME } from '@/lib/games/chess-pieces';

/** Map from short piece code to full piece name (for URL params). */
export const PIECE_TYPE_TO_NAME: Record<string, string> = {
  n: PIECE_SHORT_TO_NAME.n,
  b: PIECE_SHORT_TO_NAME.b,
};

/** Map from full piece name to short piece code. */
export const PIECE_NAME_TO_TYPE: Record<string, RoutePlannerPieceType> = {
  knight: PIECE_NAME_TO_SHORT.knight as RoutePlannerPieceType,
  bishop: PIECE_NAME_TO_SHORT.bishop as RoutePlannerPieceType,
};

/**
 * Valid `piece` query-parameter values accepted by route-planner
 * challenge/training pages.
 */
export const VALID_PIECE_NAMES = ['bishop', 'knight'] as const;

/**
 * Resolve the `piece` query parameter the challenge and training pages both
 * read into the single piece the session drills. A missing or unknown value
 * falls back to the knight.
 */
export function parsePieceParam(raw: string | undefined): RoutePlannerPieceType[] {
  const pieceName = raw && (VALID_PIECE_NAMES as readonly string[]).includes(raw) ? raw : 'knight';
  return [PIECE_NAME_TO_TYPE[pieceName]];
}

/**
 * The piece a link to the challenge setup screen asks it to open with, or
 * `undefined` when the `piece` parameter is missing or names no route-planner
 * piece. Unlike `parsePieceParam` there is no fallback: an absent choice must
 * leave the player's stored setting alone rather than reset it to the knight.
 */
export function parsePieceSelectionSeed(raw: unknown): RoutePlannerPieceType | undefined {
  return typeof raw === 'string' && (VALID_PIECE_NAMES as readonly string[]).includes(raw)
    ? PIECE_NAME_TO_TYPE[raw]
    : undefined;
}
