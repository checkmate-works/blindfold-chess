import { latestLeaderboardKey } from '@blindfold-chess/features/challenge-records';
import type { BoardOrientation } from '@blindfold-chess/types';
import { isBoardOrientation } from '@blindfold-chess/types';

import type { ChallengeResultRow } from '../_actions/get-challenge-sessions';

export const DEFAULT_BOARD_ORIENTATION: BoardOrientation = 'white';

/**
 * The orientation filter to open a coordinate-quiz menu on: the orientation
 * of the player's most recent coordinate-quiz run among `sessions`, or
 * `white` when there is none.
 *
 * Most recent, not "all the same or else the default": the filter decides
 * which runs the dashboard shows at all, so it must be one the player
 * actually played in the period. A fixed `white` left a black-only week
 * looking empty — the same failure the piece filter had, solved the same
 * way. `sessions` arrive newest-first from the query, but the pick is by
 * timestamp so the order is not load-bearing.
 */
export function deriveOrientationFromSessions(sessions: ChallengeResultRow[]): BoardOrientation {
  const key = latestLeaderboardKey(sessions, 'coordinate_quiz');
  return key !== undefined && isBoardOrientation(key) ? key : DEFAULT_BOARD_ORIENTATION;
}
