'use server';

import { authenticateAndGuard } from '@/lib/auth';
import { saveFreePlayResult } from '@/lib/db/save-free-play-result';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { handleServerActionError } from '@/lib/server-action-error';

export type SavePositionMemoryResultInput = {
  /** Number of correctly-placed pieces for the single position problem. */
  correctCount: number;
  /** Number of mistakes committed in the run. */
  mistakes: number;
  /**
   * Whether the session used a user-supplied custom FEN. Custom-FEN runs
   * are NOT eligible for EXP — the action returns early (no grant).
   */
  isCustomFen: boolean;
};

export type SavePositionMemoryResultResponse =
  { success: true; expEventId?: string } | { success: false; error: string };

/**
 * Server Action: grant EXP for a completed single-position position-memory run.
 *
 * Guards (mirror the challenge flow):
 * - Unauthenticated users: returns `{ success: false, error: 'signInRequired' }`.
 *   The caller should gracefully skip grant handling for guests.
 * - Custom FEN: returns `{ success: true }` without any DB write.
 * - correctCount === 0 (e.g., fully skipped): returns `{ success: true }`
 *   without any DB write, matching the calculator's "zero → no grant" rule.
 */
export async function savePositionMemoryResult(
  input: SavePositionMemoryResultInput
): Promise<SavePositionMemoryResultResponse> {
  try {
    if (input.isCustomFen) {
      return { success: true };
    }

    const correctCount = Math.max(0, Math.round(input.correctCount));
    const mistakes = Math.max(0, Math.round(input.mistakes));

    if (correctCount === 0) {
      return { success: true };
    }

    const guardResult = await authenticateAndGuard(RATE_LIMITS.savePracticeResult);
    if ('error' in guardResult) {
      return { success: false, error: guardResult.error };
    }
    const { user } = guardResult;

    const { expEventId } = await saveFreePlayResult({
      userId: user.id,
      menuType: 'position_memory',
      correctCount,
      mistakes,
    });

    return { success: true, expEventId };
  } catch (error) {
    return handleServerActionError(error, '[savePositionMemoryResult]');
  }
}
