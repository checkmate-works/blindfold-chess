import type { PieceSelection } from '@/app/_components/practice/PieceSelector';

import type { ChallengeResultRow } from '../_actions/get-practice-sessions';

export type { PieceSelection } from '@/app/_components/practice/PieceSelector';

export const PIECE_TYPES = ['k', 'q', 'r', 'b', 'n'] as const;

export const DEFAULT_PIECE_SELECTION: PieceSelection = 'random';

/** Map from full piece name (stored as leaderboardKey in DB) to PieceType short code. */
const PIECE_NAME_TO_SHORT: Record<string, string> = {
  king: 'k',
  queen: 'q',
  rook: 'r',
  bishop: 'b',
  knight: 'n',
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
  const shortCode = PIECE_NAME_TO_SHORT[firstKey];
  if (shortCode && (PIECE_TYPES as readonly string[]).includes(shortCode)) {
    return shortCode as PieceSelection;
  }

  return DEFAULT_PIECE_SELECTION;
}
