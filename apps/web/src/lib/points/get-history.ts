import { addDays } from 'date-fns';
import { desc, eq } from 'drizzle-orm';
import 'server-only';

import { db, pointEvents } from '@/lib/db';

import {
  MAIA_GAME_SOURCE,
  POINT_SOURCES,
  POST_MATURATION_DAYS,
  type PointCategory,
  type PointSource,
} from './constants';

/**
 * One row as rendered on `/mypage/points` — one entry per ledger row.
 *
 * `maturesAt` is computed (not stored) so the UI can show "vests on Y/M/D"
 * for pending grants without an extra column. The value is meaningful only
 * for the original `earned_pending` grant rows (positive delta on a UGC
 * source); clawback / maturation accounting rows leave it `null`.
 */
export type PointHistoryEntry = {
  id: string;
  delta: number;
  category: PointCategory;
  source: PointSource | string;
  sourceId: string | null;
  createdAt: Date;
  maturesAt: Date | null;
  /** Discriminator the UI uses to pick the i18n label key. */
  kind:
    | 'post_grant'
    | 'post_clawback'
    | 'post_matured'
    | 'redemption'
    | 'purchase'
    | 'admin_grant'
    | 'maia_game'
    | 'other';
};

/**
 * Returns the user's point history, newest first, paginated.
 *
 * For original UGC grant rows (positive delta on `puzzle_created` /
 * `position_memory_created` / `topic_post_created` with category
 * `earned_pending`), computes `maturesAt = createdAt + POST_MATURATION_DAYS`
 * so the page can show "vests on Y/M/D" without a separate column.
 */
export async function getPointHistory(
  userId: string,
  limit: number,
  offset: number = 0
): Promise<PointHistoryEntry[]> {
  const rows = await db
    .select({
      id: pointEvents.id,
      delta: pointEvents.delta,
      category: pointEvents.category,
      source: pointEvents.source,
      sourceId: pointEvents.sourceId,
      createdAt: pointEvents.createdAt,
      metadata: pointEvents.metadata,
    })
    .from(pointEvents)
    .where(eq(pointEvents.userId, userId))
    .orderBy(desc(pointEvents.createdAt))
    .limit(limit)
    .offset(offset);

  return rows.map((row) => {
    const kind = classifyKind(row.source, row.delta, row.metadata);
    const maturesAt =
      kind === 'post_grant' && row.delta > 0 ? addDays(row.createdAt, POST_MATURATION_DAYS) : null;
    return {
      id: row.id,
      delta: row.delta,
      category: row.category as PointCategory,
      source: row.source,
      sourceId: row.sourceId,
      createdAt: row.createdAt,
      maturesAt,
      kind,
    };
  });
}

function classifyKind(source: string, delta: number, metadata: unknown): PointHistoryEntry['kind'] {
  const meta = (metadata ?? {}) as { reason?: unknown };
  // `reason` here is the lifecycle-stage tag the clawback / maturation
  // primitives stamp on the row (`'post_deleted'` / `'maturation'`). Admin
  // grants also write `reason` but it's free-form text, so only the exact
  // sentinels above promote a row to the corresponding clawback / matured
  // kind — anything else falls through to the source-based branches below.
  if (typeof meta.reason === 'string') {
    if (meta.reason === 'post_deleted') return 'post_clawback';
    if (meta.reason === 'maturation') return 'post_matured';
  }
  if ((POINT_SOURCES as readonly string[]).includes(source)) {
    return delta > 0 ? 'post_grant' : 'post_clawback';
  }
  if (source === 'admin_grant') return 'admin_grant';
  if (source === 'redemption') return 'redemption';
  if (source === 'purchase') return 'purchase';
  if (source === MAIA_GAME_SOURCE) return 'maia_game';
  return 'other';
}
