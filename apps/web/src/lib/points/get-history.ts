import { addDays } from 'date-fns';
import { and, desc, eq, gt } from 'drizzle-orm';
import 'server-only';

import { db, pointEvents } from '@/lib/db';

import { POST_MATURATION_DAYS, type PointCategory, type PointSource } from './constants';

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
  kind: 'post_grant' | 'post_clawback' | 'post_matured' | 'redemption' | 'purchase' | 'other';
};

const UGC_SOURCES: readonly string[] = [
  'puzzle_created',
  'position_memory_created',
  'topic_post_created',
];

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

/**
 * Whether the user has any history at all. Lets the page render a "first
 * earn your first points" empty state without paginating.
 */
export async function hasAnyPointHistory(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: pointEvents.id })
    .from(pointEvents)
    .where(eq(pointEvents.userId, userId))
    .limit(1);
  return !!row;
}

/**
 * Count of pending UGC grant rows still expected to mature in the future —
 * powers the "X grants vesting" hint on the page.
 */
export async function countPendingPostGrants(
  userId: string,
  now: Date = new Date()
): Promise<number> {
  const rows = await db
    .select({ delta: pointEvents.delta })
    .from(pointEvents)
    .where(
      and(
        eq(pointEvents.userId, userId),
        eq(pointEvents.category, 'earned_pending'),
        gt(pointEvents.delta, 0),
        gt(pointEvents.createdAt, addDays(now, -POST_MATURATION_DAYS))
      )
    );
  return rows.length;
}

function classifyKind(source: string, delta: number, metadata: unknown): PointHistoryEntry['kind'] {
  const meta = (metadata ?? {}) as { reason?: unknown };
  if (typeof meta.reason === 'string') {
    if (meta.reason === 'post_deleted') return 'post_clawback';
    if (meta.reason === 'maturation') return 'post_matured';
  }
  if (UGC_SOURCES.includes(source)) {
    return delta > 0 ? 'post_grant' : 'post_clawback';
  }
  if (source === 'redemption') return 'redemption';
  if (source === 'purchase') return 'purchase';
  return 'other';
}
