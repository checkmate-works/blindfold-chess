/**
 * Exp Persistence
 *
 * @description
 * Database operations for granting Exp from challenge completions.
 * Orchestrates the full flow: calculation → persistence → level check.
 * Also takes a challenge result's grant back when moderation removes the
 * result ({@link reverseChallengeExp}).
 *
 * @see {@link @blindfold-chess/features/exp} for calculation logic (calculateExp, getLevel)
 * @see {@link ./save-challenge-result.ts} for the caller that invokes grantChallengeExp
 */
import {
  applyDailyCap,
  buildExpInfo,
  calculateExp,
  calculateGameExp,
  calculatePracticeExp,
  getModuleWeight,
} from '@blindfold-chess/features/exp';
import type { ExpInfo, GameExpEngine, GameExpOutcome } from '@blindfold-chess/features/exp';
import { and, eq, gte, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

import { CHALLENGE_RESULT_REVERSAL_SOURCE, CHALLENGE_RESULT_SOURCE } from './exp-sources';
import { startOfUtcDay } from './period-range';
import { expEvents, userExp } from './schema';
import type { DbTx } from './types';

/**
 * `exp_events.source` value for Exp granted from completing an AI game
 * (Stockfish / Maia). Paired with the localStorage game id as `source_id`,
 * which gives one-grant-per-game idempotency via `uq_exp_events_source_pair`.
 */
export const AI_GAME_RESULT_SOURCE = 'ai_game_result';

/**
 * Result of a {@link grantExp} call.
 *
 * When `alreadyGranted` is `true`, the grant was a no-op because an
 * `exp_events` row for `(source, source_id)` already existed. In that case,
 * `existingAmount` / `existingMetadata` describe the row from the first
 * (successful) grant, and `totalExp` is the current `user_exp.total_exp`
 * value — unchanged by this call.
 */
type GrantExpResult =
  | { totalExp: number; alreadyGranted: false }
  | {
      totalExp: number;
      alreadyGranted: true;
      existingAmount: number;
      existingMetadata: Record<string, unknown>;
    };

/**
 * Inserts an exp_event and upserts user_exp within the given transaction.
 *
 * Idempotent with respect to `(source, source_id)`: a partial unique index
 * `uq_exp_events_source_pair` prevents duplicate inserts when `source_id`
 * is non-null. On conflict, this function returns the existing event's
 * amount/metadata and the user's current totalExp WITHOUT incrementing
 * `user_exp` a second time.
 */
async function grantExp(
  tx: DbTx,
  params: {
    userId: string;
    source: string;
    sourceId: string;
    menuType: string;
    amount: number;
    metadata: Record<string, unknown>;
  }
): Promise<GrantExpResult> {
  const { userId, source, sourceId, menuType, amount, metadata } = params;

  // 1. Append to exp_events (immutable log) with idempotency guard.
  //    The partial unique index `uq_exp_events_source_pair` matches when
  //    source_id IS NOT NULL. Postgres requires the partial predicate to be
  //    repeated in `targetWhere` so it can infer the partial index as the
  //    conflict target — without it, Postgres raises "no unique or exclusion
  //    constraint matching the ON CONFLICT specification".
  const inserted = await tx
    .insert(expEvents)
    .values({
      userId,
      source,
      sourceId,
      menuType,
      amount,
      metadata,
    })
    .onConflictDoNothing({
      target: [expEvents.source, expEvents.sourceId],
      where: sql`source_id IS NOT NULL`,
    })
    .returning({ id: expEvents.id });

  if (inserted.length === 0) {
    // Idempotent path: a row already existed for (source, source_id).
    // Recover the original grant's amount/metadata and the current totalExp.
    const [existing] = await tx
      .select({ amount: expEvents.amount, metadata: expEvents.metadata })
      .from(expEvents)
      .where(and(eq(expEvents.source, source), eq(expEvents.sourceId, sourceId)))
      .limit(1);

    const [userExpRow] = await tx
      .select({ totalExp: userExp.totalExp })
      .from(userExp)
      .where(eq(userExp.userId, userId))
      .limit(1);

    return {
      totalExp: userExpRow?.totalExp ?? 0,
      alreadyGranted: true,
      existingAmount: existing?.amount ?? amount,
      existingMetadata: (existing?.metadata as Record<string, unknown> | null) ?? metadata,
    };
  }

  // 2. Fresh insert: upsert user_exp — increment if exists, insert otherwise
  const [row] = await tx
    .insert(userExp)
    .values({
      userId,
      totalExp: amount,
    })
    .onConflictDoUpdate({
      target: userExp.userId,
      set: {
        totalExp: sql`${userExp.totalExp} + ${amount}`,
        updatedAt: sql`now()`,
      },
    })
    .returning({ totalExp: userExp.totalExp });

  return { totalExp: row.totalExp, alreadyGranted: false };
}

/**
 * Calculates and grants Exp for a completed challenge within a transaction.
 *
 * Orchestrates: calculateExp → grantExp → level determination.
 * Extracted from writeChallengeResult to keep that function focused on challenge record persistence.
 *
 * Idempotent: if the same `challengeResultId` has already received an Exp grant,
 * the previously-granted amount is returned and `levelUp` is forced to `false`
 * (no state transition is happening on this call).
 */
export async function grantChallengeExp(
  tx: DbTx,
  params: {
    userId: string;
    challengeResultId: string;
    menuType: string;
    score: number;
    incorrectAnswers: number;
    timeTaken: number;
    leaderboardKey: string;
  }
): Promise<ExpInfo> {
  const {
    userId,
    challengeResultId,
    menuType,
    score,
    incorrectAnswers,
    timeTaken,
    leaderboardKey,
  } = params;

  const expResult = calculateExp({
    score,
    incorrectAnswers,
    menuType,
  });

  const grantResult = await grantExp(tx, {
    userId,
    source: CHALLENGE_RESULT_SOURCE,
    sourceId: challengeResultId,
    menuType,
    amount: expResult.totalExp,
    metadata: {
      score,
      incorrectAnswers,
      timeTaken,
      leaderboardKey,
      baseExp: expResult.baseExp,
      accuracyMultiplier: expResult.accuracyMultiplier,
    },
  });

  return buildExpInfo(grantResult, expResult.totalExp);
}

/**
 * Takes back the Exp granted for a challenge result that moderation removed,
 * inside the caller's transaction.
 *
 * The grant is cancelled, not deleted: `exp_events` is append-only, so this
 * appends a `challenge_result_reversal` row with the same `source_id`, the
 * negated `amount` and the grant's `menu_type`, and lowers `user_exp.total_exp`
 * by the same amount. Exp has no ceiling (`score × weight`), so a fabricated
 * score inflates the EXP ranking too, and leaving the grant would keep it
 * there after the result is gone.
 *
 * The reversal row is stamped with the grant's own `created_at`, not the
 * current time. Every reader of `exp_events` sums `amount` over a
 * `created_at` window (the period EXP ranking, the activity heatmap, both
 * per `menu_type`), and a row sharing the grant's timestamp and menu falls
 * inside exactly the windows the grant does, so each window nets to zero with
 * no reader changed. A reversal stamped now would instead push the current
 * period's total below zero and leave the original period inflated. The
 * removal time is kept in `metadata.reversedAt`.
 *
 * Idempotent: the reversal insert goes through the same partial unique index
 * as {@link grantExp}, so a second call finds the reversal already there,
 * inserts nothing and returns 0 without touching `user_exp`. Also 0 when the
 * result never received a grant (recorded before Exp existed). The total is
 * floored at 0 so a total that was already corrected by hand cannot go
 * negative.
 *
 * The level is derived from `total_exp` on read, so it falls with the total.
 * Nothing handed out because a level was reached is taken back here: this
 * reverses the Exp ledger only, and anything a future feature attaches to a
 * level crossing would need its own decision about removal.
 *
 * @returns The amount taken back: the grant's amount, or 0 when there was no
 *   grant or it had already been reversed.
 */
export async function reverseChallengeExp(
  tx: DbTx,
  params: { userId: string; challengeResultId: string }
): Promise<number> {
  const { userId, challengeResultId } = params;

  const [grant] = await tx
    .select({
      amount: expEvents.amount,
      menuType: expEvents.menuType,
      createdAt: expEvents.createdAt,
    })
    .from(expEvents)
    .where(
      and(
        eq(expEvents.userId, userId),
        eq(expEvents.source, CHALLENGE_RESULT_SOURCE),
        eq(expEvents.sourceId, challengeResultId)
      )
    )
    .limit(1);

  if (!grant) return 0;

  // Same conflict target and partial predicate as grantExp — see there for
  // why Postgres needs the predicate repeated to infer the partial index.
  const inserted = await tx
    .insert(expEvents)
    .values({
      userId,
      source: CHALLENGE_RESULT_REVERSAL_SOURCE,
      sourceId: challengeResultId,
      menuType: grant.menuType,
      amount: -grant.amount,
      metadata: { reversedAt: new Date().toISOString() },
      createdAt: grant.createdAt,
    })
    .onConflictDoNothing({
      target: [expEvents.source, expEvents.sourceId],
      where: sql`source_id IS NOT NULL`,
    })
    .returning({ id: expEvents.id });

  if (inserted.length === 0) return 0;

  await tx
    .update(userExp)
    .set({
      totalExp: sql`GREATEST(${userExp.totalExp} - ${grant.amount}, 0)`,
      updatedAt: sql`now()`,
    })
    .where(eq(userExp.userId, userId));

  return grant.amount;
}

/**
 * Calculates and grants Exp for a completed free-play practice run within a
 * transaction.
 *
 * Unlike {@link grantChallengeExp}, practice runs are not stored in
 * `challenge_results`, so there is no natural database-generated row id to
 * use as `source_id`. This function generates a UUID per grant and uses it
 * as the `exp_events.source_id`, giving callers a stable handle they can
 * propagate as `?grant=<id>` to the result page so it can refetch EXP
 * server-side via {@link getExpInfoBySource}.
 *
 * Caller contract:
 * - `correctCount = 0` runs MUST NOT reach this function (they grant zero
 *   EXP and are not eligible for persistence).
 * - Custom-FEN runs MUST NOT reach this function (gated by the action).
 */
export async function grantPracticeExp(
  tx: DbTx,
  params: {
    userId: string;
    menuType: string;
    correctCount: number;
    mistakes: number;
  }
): Promise<{ expEventId: string; grantedExp: number; expInfo: ExpInfo }> {
  const { userId, menuType, correctCount, mistakes } = params;

  const weight = getModuleWeight(menuType);
  const expResult = calculatePracticeExp({ correctCount, mistakes, weight });

  // Generate a stable sourceId for this grant so the result page can refetch
  // via ?grant=<id>. Idempotency is automatic: a new UUID per call means
  // duplicate calls from the same session yield distinct events, but the
  // `savedRef` guard on the client prevents that at the call site.
  const expEventId = randomUUID();

  const grantResult = await grantExp(tx, {
    userId,
    source: 'practice_result',
    sourceId: expEventId,
    menuType,
    amount: expResult.totalExp,
    metadata: {
      correctCount,
      mistakes,
      baseExp: expResult.baseExp,
      accuracyMultiplier: expResult.accuracyMultiplier,
    },
  });

  const expInfo = buildExpInfo(grantResult, expResult.totalExp);
  return { expEventId, grantedExp: expInfo.earnedExp, expInfo };
}

/**
 * Net Exp the user has already earned from AI games since 00:00 UTC today.
 * Read just before granting (inside the same transaction), so the row this
 * call is about to insert is not yet counted. Mirrors the UTC-day convention
 * used by the Coin creation cap (`creationEarnedToday`).
 */
async function gameExpEarnedToday(tx: DbTx, userId: string): Promise<number> {
  const [row] = await tx
    .select({ total: sql<number>`COALESCE(SUM(${expEvents.amount}), 0)::int` })
    .from(expEvents)
    .where(
      and(
        eq(expEvents.userId, userId),
        eq(expEvents.source, AI_GAME_RESULT_SOURCE),
        gte(expEvents.createdAt, startOfUtcDay())
      )
    );
  return row?.total ?? 0;
}

/**
 * Calculates and grants Exp for a completed AI game within a transaction.
 *
 * Anti-tamper posture (best-effort, matching the project's stance): the client
 * self-reports the game inputs, but the Exp *amount* is recomputed here from
 * those inputs via {@link calculateGameExp} — the client never supplies the
 * number. A soft daily cap ({@link applyDailyCap}) clamps the grant to the
 * remaining UTC-day budget, the primary guard against farming many quick games.
 *
 * Idempotent on `(source='ai_game_result', sourceId=gameId)`: revisiting the
 * result screen re-runs this with the same `gameId` and the partial unique
 * index makes the second insert a no-op (the original amount is returned and
 * `levelUp` is forced to `false`).
 *
 * Caller contract: a game with no player moves earns zero Exp and MUST NOT
 * reach this function (gated by the action).
 */
export async function grantGameExp(
  tx: DbTx,
  params: {
    userId: string;
    gameId: string;
    result: GameExpOutcome;
    engine: GameExpEngine;
    playerMoveCount: number;
    aidedMoveCount: number;
  }
): Promise<ExpInfo> {
  const { userId, gameId, result, engine, playerMoveCount, aidedMoveCount } = params;

  const expResult = calculateGameExp({
    result,
    engine,
    playerMoveCount,
    aidedMoveCount,
  });

  // Clamp the fresh grant to today's remaining budget. On an idempotent replay
  // this read also sees this game's own earlier row, but grantExp short-circuits
  // before the clamped amount is used, so the recomputed cap is harmless there.
  const earnedToday = await gameExpEarnedToday(tx, userId);
  const grantedAmount = applyDailyCap(expResult.totalExp, earnedToday);

  const grantResult = await grantExp(tx, {
    userId,
    source: AI_GAME_RESULT_SOURCE,
    sourceId: gameId,
    menuType: engine.kind,
    amount: grantedAmount,
    metadata: {
      result,
      engine,
      playerMoveCount,
      aidedMoveCount,
      difficultyBase: expResult.difficultyBase,
      resultMultiplier: expResult.resultMultiplier,
      purityMultiplier: expResult.purityMultiplier,
      earnedExp: expResult.totalExp,
      dailyCapped: grantedAmount < expResult.totalExp,
    },
  });

  return buildExpInfo(grantResult, grantedAmount);
}
