'use server';

import type { ExpInfo, GameExpEngine, GameExpOutcome } from '@blindfold-chess/features/exp';

import { authenticateAndGuard } from '@/lib/auth';
import { saveAiGameResult } from '@/lib/db/save-game-result';
import { parseAiGameResultReport } from '@/lib/games/ai-game-result-input';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { handleServerActionError } from '@/lib/server-action-error';

export type SaveGameResultInput = {
  /** The game's localStorage UUID — the grant's idempotency key. */
  gameId: string;
  result: GameExpOutcome;
  engine: GameExpEngine;
  playerMoveCount: number;
  aidedMoveCount: number;
};

export type SaveGameResultResponse =
  { success: true; exp?: ExpInfo } | { success: false; error: string };

/**
 * Server Action: grant Exp for a completed AI game (Stockfish / Maia).
 *
 * The client self-reports the game inputs (matching the project's best-effort
 * anti-tamper stance for client-only games); the Exp *amount* is recomputed
 * server-side from those inputs and clamped to the daily cap in `grantGameExp`.
 *
 * Guards (mirror the practice flow):
 * - Invalid/missing inputs → `{ success: false, error: 'invalid_input' }`.
 * - A game with no player moves → `{ success: true }` with no DB write.
 * - Unauthenticated users → `{ success: false, error: 'signInRequired' }`;
 *   the caller skips grant handling for guests.
 *
 * Idempotent: the underlying writer keys on (source, gameId), so revisiting the
 * result screen returns the original grant without double-counting.
 */
export async function saveGameResult(input: SaveGameResultInput): Promise<SaveGameResultResponse> {
  try {
    const report = parseAiGameResultReport(input);
    if (!report) {
      return { success: false, error: 'invalid_input' };
    }
    if (report.playerMoveCount === 0) {
      return { success: true };
    }

    const guardResult = await authenticateAndGuard(RATE_LIMITS.saveGameResult);
    if ('error' in guardResult) {
      return { success: false, error: guardResult.error };
    }
    const { user } = guardResult;

    const { exp } = await saveAiGameResult({ userId: user.id, ...report });

    return { success: true, exp };
  } catch (error) {
    return handleServerActionError(error, '[saveGameResult]');
  }
}
