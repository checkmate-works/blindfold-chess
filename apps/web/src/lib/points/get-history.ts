import { desc, eq } from 'drizzle-orm';
import 'server-only';

import { db, pointEvents } from '@/lib/db';

import { MAIA_GAME_SOURCE, POINT_SOURCES, type PointCategory, type PointSource } from './constants';

/**
 * One row as rendered on `/mypage/points` — one entry per ledger row.
 */
export type PointHistoryEntry = {
  id: string;
  delta: number;
  category: PointCategory;
  source: PointSource | string;
  sourceId: string | null;
  createdAt: Date;
  /** Discriminator the UI uses to pick the i18n label key. */
  kind:
    | 'post_grant'
    | 'post_clawback'
    | 'redemption'
    | 'purchase'
    | 'admin_grant'
    | 'maia_game'
    | 'other';
};

/**
 * Returns the user's point history, newest first, paginated.
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

  return rows.map((row) => ({
    id: row.id,
    delta: row.delta,
    category: row.category as PointCategory,
    source: row.source,
    sourceId: row.sourceId,
    createdAt: row.createdAt,
    kind: classifyKind(row.source, row.delta, row.metadata),
  }));
}

function classifyKind(source: string, delta: number, metadata: unknown): PointHistoryEntry['kind'] {
  const meta = (metadata ?? {}) as { reason?: unknown };
  // `reason='post_removed'` is the tag the clawback primitive stamps on its
  // offsetting row when a moderator removes the source post.
  if (meta.reason === 'post_removed') return 'post_clawback';
  if ((POINT_SOURCES as readonly string[]).includes(source)) {
    return delta > 0 ? 'post_grant' : 'post_clawback';
  }
  if (source === 'admin_grant') return 'admin_grant';
  if (source === 'redemption') return 'redemption';
  if (source === 'purchase') return 'purchase';
  if (source === MAIA_GAME_SOURCE) return 'maia_game';
  return 'other';
}
