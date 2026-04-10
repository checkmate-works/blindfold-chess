/**
 * Look up a previously-granted EXP event and reconstruct ExpInfo.
 *
 * Used by practice result pages to rehydrate the "EXP gained" display after
 * a challenge, via a `?grant=<challenge_result_id>` query param, so the
 * display survives page reload and direct URL access.
 *
 * Authorization: the lookup is scoped to `(userId, source, sourceId)`, so a
 * user cannot observe another user's EXP event by guessing a sourceId —
 * passing a sourceId belonging to a different user yields `null`.
 *
 * @remarks `levelUp` is approximated by comparing `getLevel(totalExp)` with
 * `getLevel(totalExp - earnedExp)`. This is the same approximation the
 * original client-side flow used: it cannot distinguish "just granted" from
 * "granted minutes ago" (intervening EXP events can shift the comparison),
 * but it preserves the level-before-vs-after comparison for the most recent
 * grant well enough for UI display.
 */
import { getLevel, getLevelProgress } from '@blindfold-chess/features/exp';
import { and, eq } from 'drizzle-orm';

import type { ExpInfo } from '@/lib/exp-types';

import { db } from './index';
import { expEvents, userExp } from './schema';

export async function getExpInfoBySource(
  userId: string,
  source: string,
  sourceId: string
): Promise<ExpInfo | null> {
  const [event] = await db
    .select({ amount: expEvents.amount })
    .from(expEvents)
    .where(
      and(
        eq(expEvents.userId, userId),
        eq(expEvents.source, source),
        eq(expEvents.sourceId, sourceId)
      )
    )
    .limit(1);

  if (!event) return null;

  const [userExpRow] = await db
    .select({ totalExp: userExp.totalExp })
    .from(userExp)
    .where(eq(userExp.userId, userId))
    .limit(1);

  const totalExp = userExpRow?.totalExp ?? event.amount;
  const earnedExp = event.amount;

  const levelAfter = getLevel(totalExp);
  const levelBefore = getLevel(totalExp - earnedExp);
  const progress = getLevelProgress(totalExp);

  return {
    earnedExp,
    totalExp,
    level: levelAfter,
    levelUp: levelAfter > levelBefore,
    progressPercent: Math.round(progress.progress * 100),
  };
}
