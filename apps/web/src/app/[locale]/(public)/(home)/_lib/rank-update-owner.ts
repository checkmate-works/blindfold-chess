import { and, eq } from 'drizzle-orm';

import { db, feedItems } from '@/lib/db';
import { RANK_UPDATE_ENTITY_TYPE } from '@/lib/feed-items/rank-update';

import { liveFeedRow } from './feed-liveness';

/** What a like on a rank-update card needs to notify its player. */
export type RankUpdateOwner = {
  actorId: string;
  menuType: string;
  leaderboardKey: string;
};

/**
 * The player behind a rank-update card the feed would show, or `null` when
 * the card is not one: reaped, a feed row of another type, or hidden by
 * `liveFeedRow` (its result removed by moderation, its actor gone, or its rank
 * past the feed threshold). Using the feed's own visibility rule means a card
 * nobody can see cannot be liked.
 */
export async function getLiveRankUpdateOwner(feedItemId: string): Promise<RankUpdateOwner | null> {
  const [row] = await db
    .select({ actorId: feedItems.actorId, metadata: feedItems.metadata })
    .from(feedItems)
    .where(
      and(
        eq(feedItems.id, feedItemId),
        eq(feedItems.entityType, RANK_UPDATE_ENTITY_TYPE),
        liveFeedRow()
      )
    )
    .limit(1);
  if (!row) return null;

  const metadata = (row.metadata ?? {}) as Record<string, unknown>;
  return {
    actorId: row.actorId,
    menuType: String(metadata.menuType ?? ''),
    leaderboardKey: String(metadata.leaderboardKey ?? ''),
  };
}
