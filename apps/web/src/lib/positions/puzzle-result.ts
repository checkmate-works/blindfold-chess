import 'server-only';

import { saveFreePlayResult } from '@/lib/db/save-free-play-result';

export type PuzzleResultInput = {
  playerMoveCount: number;
  incorrectAttempts: number;
  peekCount: number;
};

/**
 * Records a solved puzzle for `userId` (free-play EXP): the counts are
 * rounded and clamped at zero, and a run with no player move records
 * nothing. The caller has authenticated the user and applied the rate
 * limit. Shared by the web's `savePuzzleResult` action and the mobile API's
 * `POST /api/mobile/v1/puzzles/results`.
 */
export async function savePuzzleResultForUser(
  userId: string,
  input: PuzzleResultInput
): Promise<{ expEventId?: string }> {
  const playerMoveCount = Math.max(0, Math.round(input.playerMoveCount));
  const incorrectAttempts = Math.max(0, Math.round(input.incorrectAttempts));
  const peekCount = Math.max(0, Math.round(input.peekCount));
  if (playerMoveCount === 0) return {};

  return saveFreePlayResult({
    userId,
    menuType: 'puzzle',
    correctCount: playerMoveCount,
    mistakes: incorrectAttempts + peekCount,
  });
}
