import { inArray } from 'drizzle-orm';

import { SOCIAL_AUTHOR_COLUMNS, db, profiles } from '@/lib/db';
import { EMPTY_LIKE_META, getLikeMetaMap } from '@/lib/db/like-queries';
import { MEMBER_JOINED_LIKE_TARGET } from '@/lib/feed-items/member-joined';

import type { MemberJoinedFeedData } from '../types';

/**
 * Bulk-load the arrival announcements in a slice of feed rows. Returns
 * `Map<feedItemId, data>` — keyed by the feed row rather than by the member,
 * because the like target is the row (`MEMBER_JOINED_LIKE_TARGET`).
 *
 * A member whose profile has since been deleted is dropped, like the other
 * loaders' missing entities; `liveFeedRow` normally filters those rows out
 * before they get here.
 */
export async function loadMemberJoinedForFeed(
  rows: readonly { id: string; actorId: string }[],
  currentUserId: string | undefined
): Promise<Map<string, MemberJoinedFeedData>> {
  const map = new Map<string, MemberJoinedFeedData>();
  if (rows.length === 0) return map;

  const [memberRows, likeMetaMap] = await Promise.all([
    db
      .select({ ...SOCIAL_AUTHOR_COLUMNS, id: profiles.id })
      .from(profiles)
      .where(
        inArray(
          profiles.id,
          rows.map((r) => r.actorId)
        )
      ),
    getLikeMetaMap(
      MEMBER_JOINED_LIKE_TARGET,
      rows.map((r) => r.id),
      currentUserId
    ),
  ]);

  const members = new Map(memberRows.map(({ id, ...member }) => [id, member]));

  for (const row of rows) {
    const member = members.get(row.actorId);
    if (!member) continue;
    map.set(row.id, {
      member,
      likeMeta: likeMetaMap.get(row.id) ?? EMPTY_LIKE_META,
      isMine: currentUserId === row.actorId,
    });
  }

  return map;
}
