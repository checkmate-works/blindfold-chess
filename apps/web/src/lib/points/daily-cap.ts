import { and, eq, gte, inArray, sql } from 'drizzle-orm';
import 'server-only';

import { db, pointEvents } from '@/lib/db';
import { startOfUtcDay } from '@/lib/db/period-range';
import type { DbTxOrDb } from '@/lib/db/types';

import { DAILY_CREATION_POINT_CAP, POINT_SOURCES } from './constants';

/**
 * Daily creation-cap helpers — the read side of `DAILY_CREATION_POINT_CAP`.
 *
 * The cap is enforced in `grantPointsForPost` and surfaced for display on
 * `/mypage/points`; both go through `creationEarnedToday` so there is one
 * definition of "what counts toward today's cap". The cap resets at the
 * UTC day boundary (`startOfUtcDay`) — deterministic and matching what
 * the `/coin` guide documents; a locale-relative reset would be
 * unverifiable from the server.
 */

/**
 * Net points the user has earned from UGC creation (`POINT_SOURCES`)
 * since 00:00 UTC today. Sums `delta`, so a same-day clawback (a negative
 * delta written on the same creation source by `clawbackPointsForPost`)
 * lowers the figure and frees cap headroom — a delete+recreate nets to
 * the single grant it deserves.
 *
 * Accepts either the base `db` client (the display path) or an open
 * transaction (`grantPointsForPost`, which reads the cap just before
 * appending its own row — the new row is not yet inserted, so reading
 * via the tx or via `db` is equivalent here).
 *
 * Returns `0` when the user has no creation rows today — never null.
 */
export async function creationEarnedToday(executor: DbTxOrDb, userId: string): Promise<number> {
  const [row] = await executor
    .select({ total: sql<number>`COALESCE(SUM(${pointEvents.delta}), 0)::int` })
    .from(pointEvents)
    .where(
      and(
        eq(pointEvents.userId, userId),
        inArray(pointEvents.source, POINT_SOURCES as readonly string[]),
        gte(pointEvents.createdAt, startOfUtcDay())
      )
    );
  return row?.total ?? 0;
}

/** Daily creation-cap status as rendered on `/mypage/points`. */
export type DailyCreationCapStatus = {
  /** Net creation points earned since 00:00 UTC, floored at 0. */
  earnedToday: number;
  /** The cap itself (`DAILY_CREATION_POINT_CAP`). */
  cap: number;
  /** Points still earnable from creation today. */
  remaining: number;
};

/**
 * Resolve the daily creation-cap status for display. `earnedToday` is
 * floored at 0: a net figure can only go below zero if same-day
 * clawbacks exceed same-day grants, which the UI should show as "0
 * earned today", not a negative number.
 */
export async function getDailyCreationCapStatus(userId: string): Promise<DailyCreationCapStatus> {
  const earnedToday = Math.max(0, await creationEarnedToday(db, userId));
  return {
    earnedToday,
    cap: DAILY_CREATION_POINT_CAP,
    remaining: Math.max(0, DAILY_CREATION_POINT_CAP - earnedToday),
  };
}
