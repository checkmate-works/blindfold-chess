'use server';

import { authenticateAndGuard } from '@/lib/auth';
import { saveFreePlayResult } from '@/lib/db/save-free-play-result';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { handleServerActionError } from '@/lib/server-action-error';

export type SavePuzzleResultInput = {
  /**
   * Number of player half-moves in the solved solution line — this is the
   * "size" signal fed to the EXP calculator as `correctCount`. A puzzle is
   * only persisted on solve, so this is always the depth of the line the
   * user actually completed (locked solution).
   */
  playerMoveCount: number;
  /** Number of incorrect move submissions made before the solve. */
  incorrectAttempts: number;
  /** Number of times the board peek was used. Folded into `mistakes`. */
  peekCount: number;
};

export type SavePuzzleResultResponse =
  { success: true; expEventId?: string } | { success: false; error: string };

/**
 * Server Action: grant EXP for a solved puzzle run.
 *
 * Mirrors the position-memory free-play flow. Guards:
 * - Unsolved runs MUST NOT call this action — the caller only invokes it
 *   from the solve path, so `playerMoveCount === 0` is treated as a no-op
 *   early return (no DB write, no auth check) defensively.
 * - Unauthenticated users: returns `{ success: false, error: 'signInRequired' }`.
 *   The caller gracefully skips grant handling for guests.
 *
 * `mistakes` for the EXP calculator combines `incorrectAttempts + peekCount`
 * — wrong submissions and peeks both signal "less than fully unaided", so
 * they share the accuracy ladder. If we want to weight peeks differently
 * later, split here.
 */
export async function savePuzzleResult(
  input: SavePuzzleResultInput
): Promise<SavePuzzleResultResponse> {
  try {
    const playerMoveCount = Math.max(0, Math.round(input.playerMoveCount));
    const incorrectAttempts = Math.max(0, Math.round(input.incorrectAttempts));
    const peekCount = Math.max(0, Math.round(input.peekCount));

    if (playerMoveCount === 0) {
      return { success: true };
    }

    const guardResult = await authenticateAndGuard(RATE_LIMITS.savePracticeResult);
    if ('error' in guardResult) {
      return { success: false, error: guardResult.error };
    }
    const { user } = guardResult;

    const { expEventId } = await saveFreePlayResult({
      userId: user.id,
      menuType: 'puzzle',
      correctCount: playerMoveCount,
      mistakes: incorrectAttempts + peekCount,
    });

    return { success: true, expEventId };
  } catch (error) {
    return handleServerActionError(error, '[savePuzzleResult]');
  }
}
