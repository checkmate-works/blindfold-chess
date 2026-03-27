import type { PieceSelection } from '@/app/_components/practice/PieceSelector';

import type { ChallengeResultRow } from '../_actions/get-challenge-sessions';

export type { PieceSelection } from '@/app/_components/practice/PieceSelector';

export const PIECE_TYPES = ['k', 'q', 'r', 'b', 'n'] as const;

export const DEFAULT_PIECE_SELECTION: PieceSelection = 'random';

/** Map from PieceType short code to full piece name (stored as leaderboardKey in DB). */
export const PIECE_SHORT_TO_NAME: Record<(typeof PIECE_TYPES)[number], string> = {
  k: 'king',
  q: 'queen',
  r: 'rook',
  b: 'bishop',
  n: 'knight',
};

/** Piece full names used as leaderboard keys in DB. */
export type PieceFullName = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'random';

/** Map from full piece name (stored as leaderboardKey in DB) to PieceType short code. */
export const PIECE_NAME_TO_SHORT: Record<PieceFullName, PieceSelection> = {
  king: 'k',
  queen: 'q',
  rook: 'r',
  bishop: 'b',
  knight: 'n',
  random: 'random',
};

/**
 * Derive a piece selection from session data.
 * - If all legal_moves sessions use the same leaderboardKey (piece), returns that piece.
 * - If all sessions use 'random', returns 'random'.
 * - Otherwise (mixed or no data), returns 'random'.
 */
export function derivePieceSelectionFromSessions(sessions: ChallengeResultRow[]): PieceSelection {
  const legalMovesSessions = sessions.filter((s) => s.menuType === 'legal_moves');

  if (legalMovesSessions.length === 0) return DEFAULT_PIECE_SELECTION;

  const firstKey = legalMovesSessions[0].leaderboardKey;
  const allSame = legalMovesSessions.every((s) => s.leaderboardKey === firstKey);

  if (!allSame) return DEFAULT_PIECE_SELECTION;

  if (firstKey === 'random') return 'random';

  // Convert full piece name to short code for PieceSelection
  if (!(firstKey in PIECE_NAME_TO_SHORT)) return DEFAULT_PIECE_SELECTION;
  const shortCode = PIECE_NAME_TO_SHORT[firstKey as PieceFullName];
  if (
    shortCode &&
    shortCode !== 'random' &&
    (PIECE_TYPES as readonly string[]).includes(shortCode)
  ) {
    return shortCode;
  }

  return DEFAULT_PIECE_SELECTION;
}
