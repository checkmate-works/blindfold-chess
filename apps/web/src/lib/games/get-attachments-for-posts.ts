import { and, eq, inArray, isNull } from 'drizzle-orm';
import 'server-only';

import { db, topicPostAttachments, topicPosts } from '@/lib/db';

import type { AttachedGameCardData } from '@/app/[locale]/(public)/topics/_components/AttachedGameCard';

/**
 * Fetch attachments for the given set of post IDs, filtering by parent
 * topic_post visibility.
 *
 * @description
 * Returns a `Map<postId, AttachedGameCardData>` so callers can attach the
 * game data to their per-post objects in O(1) without re-querying.
 *
 * @design Soft-delete safety
 *
 * Joins back to `topic_posts` and filters `deleted_at IS NULL`. The
 * application's standard post queries already exclude soft-deleted posts,
 * so this filter is redundant in the happy path — but it ensures that any
 * future caller that forgets the filter (or fetches by post ID from a
 * less-strict source) cannot leak attachments belonging to deleted posts
 * to the UI. This is the application-side mirror of the RLS SELECT policy.
 */
export async function getAttachmentsForPosts(
  postIds: readonly string[]
): Promise<Map<string, AttachedGameCardData>> {
  if (postIds.length === 0) return new Map();

  const rows = await db
    .select({
      id: topicPostAttachments.id,
      postId: topicPostAttachments.postId,
      source: topicPostAttachments.source,
      sourceUrl: topicPostAttachments.sourceUrl,
      sourceGameId: topicPostAttachments.sourceGameId,
      pgn: topicPostAttachments.pgn,
      moveCount: topicPostAttachments.moveCount,
      headerWhite: topicPostAttachments.headerWhite,
      headerBlack: topicPostAttachments.headerBlack,
      headerResult: topicPostAttachments.headerResult,
      headerEvent: topicPostAttachments.headerEvent,
      headerDate: topicPostAttachments.headerDate,
      anonymized: topicPostAttachments.anonymized,
    })
    .from(topicPostAttachments)
    .innerJoin(topicPosts, eq(topicPosts.id, topicPostAttachments.postId))
    .where(and(inArray(topicPostAttachments.postId, [...postIds]), isNull(topicPosts.deletedAt)));

  const map = new Map<string, AttachedGameCardData>();
  for (const row of rows) {
    map.set(row.postId, {
      id: row.id,
      source: row.source,
      sourceUrl: row.sourceUrl,
      sourceGameId: row.sourceGameId,
      pgn: row.pgn,
      moveCount: row.moveCount,
      headerWhite: row.headerWhite,
      headerBlack: row.headerBlack,
      headerResult: row.headerResult,
      headerEvent: row.headerEvent,
      headerDate: row.headerDate,
      anonymized: row.anonymized,
    });
  }
  return map;
}
