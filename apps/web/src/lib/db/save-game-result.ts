/**
 * AI Game Result Persistence (AI対局リザルトの永続化)
 *
 * @description
 * Thin wrapper that grants Exp for a completed AI game (Stockfish / Maia)
 * inside a transaction. AI games themselves are NOT persisted server-side —
 * they live in localStorage. The only durable artifact is the `exp_events`
 * row keyed by the game's localStorage id, which both records the grant and
 * provides one-grant-per-game idempotency.
 *
 * @see {@link ./save-exp.ts} — `grantGameExp` (the underlying Exp writer + daily cap)
 * @see {@link ./save-free-play-result.ts} — the free-play analog this mirrors
 */
import type { ExpInfo, GameExpEngine, GameExpOutcome } from '@blindfold-chess/features/exp';

import { db } from './index';
import { grantGameExp } from './save-exp';

export type AiGameResultInput = {
  userId: string;
  /** The game's localStorage UUID — used as the grant's idempotency key. */
  gameId: string;
  result: GameExpOutcome;
  engine: GameExpEngine;
  playerMoveCount: number;
  aidedMoveCount: number;
};

export type AiGameResultOutput = {
  exp: ExpInfo;
};

/**
 * Saves an AI game result by granting Exp.
 *
 * The caller passes the game's localStorage id, which `grantGameExp` uses as
 * `exp_events.source_id`. The result page refetches the grant via
 * `getExpInfoBySource(userId, 'ai_game_result', gameId)`, so no `?grant=`
 * round-trip id needs to be generated — the game id is already stable.
 */
export async function saveAiGameResult(input: AiGameResultInput): Promise<AiGameResultOutput> {
  const { userId, gameId, result, engine, playerMoveCount, aidedMoveCount } = input;

  return db.transaction(async (tx) => {
    const exp = await grantGameExp(tx, {
      userId,
      gameId,
      result,
      engine,
      playerMoveCount,
      aidedMoveCount,
    });

    return { exp };
  });
}
