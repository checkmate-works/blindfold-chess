import type { PracticeSessionRow } from '@/lib/db/practice-session-types';
import { isTypedSession } from '@/lib/db/practice-session-types';

export const PIECE_TYPES = ['k', 'q', 'r', 'b', 'n'] as const;

export const DEFAULT_PIECE_FILTER: Record<string, boolean> = {
  k: true,
  q: true,
  r: true,
  b: true,
  n: true,
};

/**
 * Derive a piece filter from session data.
 * If all legal_moves sessions share the same selectedPieces configuration,
 * returns a filter matching that configuration. Otherwise returns DEFAULT_PIECE_FILTER.
 */
export function derivePieceFilterFromSessions(
  sessions: PracticeSessionRow[]
): Record<string, boolean> {
  const legalMovesSessions = sessions.filter(
    (s): s is Extract<PracticeSessionRow, { menuType: 'legal_moves' }> =>
      isTypedSession(s) && s.menuType === 'legal_moves'
  );

  if (legalMovesSessions.length === 0) return DEFAULT_PIECE_FILTER;

  const firstPieces = [...legalMovesSessions[0].settings.selectedPieces].sort().join(',');
  const allSame = legalMovesSessions.every(
    (s) => [...s.settings.selectedPieces].sort().join(',') === firstPieces
  );

  if (!allSame) return DEFAULT_PIECE_FILTER;

  const activePieceSet = new Set(legalMovesSessions[0].settings.selectedPieces);
  const filter: Record<string, boolean> = {};
  for (const p of PIECE_TYPES) {
    filter[p] = activePieceSet.has(p);
  }
  return filter;
}
