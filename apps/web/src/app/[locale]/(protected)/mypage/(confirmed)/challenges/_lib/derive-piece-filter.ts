import type { PieceSelection } from '@/app/_components/practice/PieceSelector';

import { PIECE_NAME_TO_SHORT, PIECE_TYPES, type PieceFullName } from '@/lib/games/chess-pieces';

import type { ChallengeResultRow } from '../_actions/get-challenge-sessions';

export type { PieceSelection } from '@/app/_components/practice/PieceSelector';
export {
  PIECE_TYPES,
  PIECE_SHORT_TO_NAME,
  PIECE_NAME_TO_SHORT,
  type PieceFullName,
} from '@/lib/games/chess-pieces';

export const DEFAULT_PIECE_SELECTION: PieceSelection = 'random';

/**
 * The piece filter to open a legal-moves menu on: the piece of the player's
 * most recent legal-moves run among `sessions` (`random` included), or
 * `random` when there is none or the key is not a piece.
 *
 * Most recent, not "all the same or else random": the filter decides which
 * runs the dashboard shows at all, so it has to be one the player actually
 * played in the period. The earlier rule fell back to `random` for a mixed
 * week — a knight-and-bishop player then saw an empty dashboard, since none
 * of their runs had the key `random`. `sessions` arrive newest-first from the
 * query, but the pick is by timestamp so the order is not load-bearing.
 */
export function derivePieceSelectionFromSessions(sessions: ChallengeResultRow[]): PieceSelection {
  const latest = sessions
    .filter((s) => s.menuType === 'legal_moves')
    .reduce<ChallengeResultRow | undefined>(
      (best, s) => (!best || s.createdAt > best.createdAt ? s : best),
      undefined
    );
  if (!latest) return DEFAULT_PIECE_SELECTION;

  const key = latest.leaderboardKey;
  if (key === 'random') return 'random';

  // Convert full piece name to short code for PieceSelection
  if (!(key in PIECE_NAME_TO_SHORT)) return DEFAULT_PIECE_SELECTION;
  const shortCode = PIECE_NAME_TO_SHORT[key as PieceFullName];
  if (
    shortCode &&
    shortCode !== 'random' &&
    (PIECE_TYPES as readonly string[]).includes(shortCode)
  ) {
    return shortCode;
  }

  return DEFAULT_PIECE_SELECTION;
}
