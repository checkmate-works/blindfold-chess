import { MAX_SOLUTION_MOVES } from '@blindfold-chess/features/puzzle';
import 'server-only';

import { saveFreePlayResult } from '@/lib/db/save-free-play-result';

export type PuzzleResultInput = {
  playerMoveCount: number;
  incorrectAttempts: number;
  peekCount: number;
};

/**
 * Ceiling on `incorrectAttempts` and `peekCount`. Both only reduce the EXP
 * awarded, so clamping them cannot hurt the player; the cap exists so a huge
 * value cannot overflow the arithmetic or the integer columns downstream.
 */
const MAX_PENALTY_COUNT = 1000;

/**
 * Turns a client-reported count into a whole number in `[0, max]`. JSON cannot
 * carry NaN or Infinity, but a non-finite value is treated as 0 anyway so the
 * clamp never depends on the transport.
 */
function clampCount(value: number, max: number): number {
  const finite = Number.isFinite(value) ? value : 0;
  return Math.min(max, Math.max(0, Math.round(finite)));
}

/**
 * Records a solved puzzle for `userId` (free-play EXP): the counts are
 * rounded and clamped at zero, and a run with no player move records
 * nothing. The caller has authenticated the user and applied the rate
 * limit. Shared by the web's `savePuzzleResult` action and the mobile API's
 * `POST /api/mobile/v1/puzzles/results`, so both entry points get the same
 * clamps.
 *
 * The counts are reported by the client, so they are capped at the largest
 * value an honest run could produce. EXP grows with `playerMoveCount`
 * (correct moves × weight), so an uncapped value such as `1e9` would award
 * a huge amount of EXP in one request — skewing the EXP leaderboard — and
 * could overflow the integer columns, failing the request. No puzzle's
 * solution is longer than `MAX_SOLUTION_MOVES` (the authoring UI enforces
 * it), so that is the ceiling on the player's moves. Checking the count
 * against the solved puzzle's actual solution length was rejected: it would
 * change the request shape for both the web and mobile clients.
 */
export async function savePuzzleResultForUser(
  userId: string,
  input: PuzzleResultInput
): Promise<{ expEventId?: string }> {
  const playerMoveCount = clampCount(input.playerMoveCount, MAX_SOLUTION_MOVES);
  const incorrectAttempts = clampCount(input.incorrectAttempts, MAX_PENALTY_COUNT);
  const peekCount = clampCount(input.peekCount, MAX_PENALTY_COUNT);
  if (playerMoveCount === 0) return {};

  return saveFreePlayResult({
    userId,
    menuType: 'puzzle',
    correctCount: playerMoveCount,
    mistakes: incorrectAttempts + peekCount,
  });
}
