import type { PracticeSessionRow } from '@/lib/db/practice-session-types';
import { isTypedSession } from '@/lib/db/practice-session-types';

export const PIECE_TYPES = ['k', 'q', 'r', 'b', 'n'] as const;

export type PieceSelection = (typeof PIECE_TYPES)[number] | 'random';

export const DEFAULT_PIECE_SELECTION: PieceSelection = 'random';

/**
 * Derive a piece selection from session data.
 * - If all legal_moves sessions use the same single piece, returns that piece.
 * - If all sessions use all 5 pieces, returns 'random'.
 * - Otherwise (mixed or no data), returns 'random'.
 */
export function derivePieceSelectionFromSessions(sessions: PracticeSessionRow[]): PieceSelection {
  const legalMovesSessions = sessions.filter(
    (s): s is Extract<PracticeSessionRow, { menuType: 'legal_moves' }> =>
      isTypedSession(s) && s.menuType === 'legal_moves'
  );

  if (legalMovesSessions.length === 0) return DEFAULT_PIECE_SELECTION;

  const firstPieces = [...legalMovesSessions[0].settings.selectedPieces].sort().join(',');
  const allSame = legalMovesSessions.every(
    (s) => [...s.settings.selectedPieces].sort().join(',') === firstPieces
  );

  if (!allSame) return DEFAULT_PIECE_SELECTION;

  const pieces = [...legalMovesSessions[0].settings.selectedPieces].sort();

  // All 5 pieces selected = random
  if (pieces.length === PIECE_TYPES.length && pieces.every((p, i) => p === PIECE_TYPES[i])) {
    return 'random';
  }

  // Single piece selected
  if (pieces.length === 1 && (PIECE_TYPES as readonly string[]).includes(pieces[0])) {
    return pieces[0] as PieceSelection;
  }

  // Multi-piece combination (legacy) — default to random
  return DEFAULT_PIECE_SELECTION;
}
