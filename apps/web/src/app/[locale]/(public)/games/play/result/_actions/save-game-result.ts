'use server';

import type { ExpInfo, GameExpEngine, GameExpOutcome } from '@blindfold-chess/features/exp';

import { authenticateAndGuard } from '@/lib/auth';
import { saveAiGameResult } from '@/lib/db/save-game-result';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { handleServerActionError } from '@/lib/server-action-error';
import { UUID_RE } from '@/lib/validations/uuid';

export type SaveGameResultInput = {
  /** The game's localStorage UUID — the grant's idempotency key. */
  gameId: string;
  result: GameExpOutcome;
  engine: GameExpEngine;
  playerMoveCount: number;
  aidedMoveCount: number;
};

export type SaveGameResultResponse =
  | { success: true; exp?: ExpInfo }
  | { success: false; error: string };

const VALID_RESULTS: readonly GameExpOutcome[] = ['win', 'loss', 'draw'];

/**
 * Narrow an untrusted engine payload to {@link GameExpEngine}. Difficulty
 * values are passed through as plain numbers — the calculator clamps
 * out-of-range inputs, so we only require a finite number of the right kind.
 */
function normalizeEngine(value: unknown): GameExpEngine | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  if (v.kind === 'stockfish' && typeof v.skillLevel === 'number' && Number.isFinite(v.skillLevel)) {
    return { kind: 'stockfish', skillLevel: v.skillLevel };
  }
  if (v.kind === 'maia' && typeof v.rating === 'number' && Number.isFinite(v.rating)) {
    return { kind: 'maia', rating: v.rating };
  }
  return null;
}

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
    if (!input || typeof input.gameId !== 'string' || !UUID_RE.test(input.gameId)) {
      return { success: false, error: 'invalid_input' };
    }
    if (!VALID_RESULTS.includes(input.result)) {
      return { success: false, error: 'invalid_input' };
    }
    const engine = normalizeEngine(input.engine);
    if (!engine) {
      return { success: false, error: 'invalid_input' };
    }

    const playerMoveCount = Math.max(0, Math.round(Number(input.playerMoveCount) || 0));
    // Aided moves can never exceed the move count; clamp defensively so a
    // tampered payload cannot push the purity ratio above 1.
    const aidedMoveCount = Math.min(
      playerMoveCount,
      Math.max(0, Math.round(Number(input.aidedMoveCount) || 0))
    );

    if (playerMoveCount === 0) {
      return { success: true };
    }

    const guardResult = await authenticateAndGuard(RATE_LIMITS.saveGameResult);
    if ('error' in guardResult) {
      return { success: false, error: guardResult.error };
    }
    const { user } = guardResult;

    const { exp } = await saveAiGameResult({
      userId: user.id,
      gameId: input.gameId,
      result: input.result,
      engine,
      playerMoveCount,
      aidedMoveCount,
    });

    return { success: true, exp };
  } catch (error) {
    return handleServerActionError(error, '[saveGameResult]');
  }
}
