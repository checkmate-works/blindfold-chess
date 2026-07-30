import { inArray } from 'drizzle-orm';

import { db, positions, topicPosts } from '@/lib/db';

/** The polymorphic source pointer carried by a `user_grants` row. */
type GrantSourceRef = {
  sourceType: string | null;
  sourceId: string | null;
};

type TopicPostRef = { id: string; topicType: string; topicKey: string };
type PositionRef = { id: string; type: string };

/**
 * Resolve the entities a page of grants was earned from, so each row can be
 * labelled and linked.
 *
 * Two batched `IN` queries rather than a lookup per row: the benefits list and
 * the per-type history page both render a page of grants at a time, and a
 * per-row fetch would be an N+1. Grants whose source is neither a topic post
 * nor a position (or whose source has since been deleted) simply have no entry
 * in either map, which both callers already treat as "no link".
 */
export async function resolveGrantSources(grants: readonly GrantSourceRef[]): Promise<{
  topicPostMap: Map<string, TopicPostRef>;
  positionMap: Map<string, PositionRef>;
}> {
  const topicPostIds = grants
    .filter((g) => g.sourceType === 'topic_post' && g.sourceId)
    .map((g) => g.sourceId as string);
  const positionIds = grants
    .filter((g) => g.sourceType === 'position' && g.sourceId)
    .map((g) => g.sourceId as string);

  const [topicPostRows, positionRows] = await Promise.all([
    topicPostIds.length
      ? db
          .select({
            id: topicPosts.id,
            topicType: topicPosts.topicType,
            topicKey: topicPosts.topicKey,
          })
          .from(topicPosts)
          .where(inArray(topicPosts.id, topicPostIds))
      : Promise.resolve([] as TopicPostRef[]),
    positionIds.length
      ? db
          .select({ id: positions.id, type: positions.type })
          .from(positions)
          .where(inArray(positions.id, positionIds))
      : Promise.resolve([] as PositionRef[]),
  ]);

  return {
    topicPostMap: new Map(topicPostRows.map((r) => [r.id, r])),
    positionMap: new Map(positionRows.map((r) => [r.id, r])),
  };
}
