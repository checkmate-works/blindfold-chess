import { and, inArray, isNull } from 'drizzle-orm';

import { chunks, db, gameComments, games, positions, repertoires, topicPosts } from '@/lib/db';
import type { UserActivityLog } from '@/lib/db/schema';
import { getPositionDetailPathForStoredType } from '@/lib/positions/routes';

import { buildTopicPostHref } from '@/app/[locale]/(public)/topics/_lib/topic-paths';

export type ActivityTargetLink = {
  /** Public path without the locale segment, ready for `AdminExternalLink`. */
  path: string;
  /**
   * The target's own name. `null` for the kinds that have none — a post and a
   * game comment are a body of text, not a titled entity — leaving the caller
   * to label the link with the id.
   */
  label: string | null;
};

/**
 * Resolved links for one page of activity rows, keyed by
 * {@link activityTargetKey}. A target absent from the map has no public page:
 * its row was deleted, or its `target_type` is one this module does not route
 * (`user`, which links to the admin detail page instead, or a type added by a
 * newer deploy).
 */
export type ActivityTargetLinkMap = ReadonlyMap<string, ActivityTargetLink>;

/**
 * `user_activity_log.target_id` is a bare uuid whose meaning depends on
 * `target_type`, so the type has to be part of the key.
 */
export function activityTargetKey(targetType: string, targetId: string): string {
  return `${targetType}:${targetId}`;
}

function collectLinks<Row extends { id: string }>(
  rows: Row[],
  toLink: (row: Row) => ActivityTargetLink | null
): Map<string, ActivityTargetLink> {
  const links = new Map<string, ActivityTargetLink>();
  for (const row of rows) {
    const link = toLink(row);
    if (link) links.set(row.id, link);
  }
  return links;
}

/**
 * One batched lookup per UGC kind an activity row can target, each keyed by the
 * `target_type` the writers store.
 *
 * Every one of these tables soft-deletes, and every resolver filters the
 * soft-deleted rows out rather than linking them: the row is only reachable
 * from the admin side, so a link would land the reader on a 404. Dropping it
 * from the map degrades the cell to the plain id it shows today, which is both
 * honest about the target being gone and still enough to look the row up.
 */
const TARGET_RESOLVERS: Record<
  string,
  (ids: string[]) => Promise<Map<string, ActivityTargetLink>>
> = {
  position: async (ids) => {
    const rows = await db
      .select({ id: positions.id, type: positions.type, title: positions.title })
      .from(positions)
      .where(and(inArray(positions.id, ids), isNull(positions.deletedAt)));
    return collectLinks(rows, (row) => {
      // `sequence` positions are stored but have no detail page.
      const path = getPositionDetailPathForStoredType(row.type, row.id);
      return path ? { path, label: row.title } : null;
    });
  },

  topic_post: async (ids) => {
    const rows = await db
      .select({ id: topicPosts.id, topicType: topicPosts.topicType, topicKey: topicPosts.topicKey })
      .from(topicPosts)
      .where(and(inArray(topicPosts.id, ids), isNull(topicPosts.deletedAt)));
    return collectLinks(rows, (row) => ({
      path: buildTopicPostHref(row.topicType, row.topicKey, row.id),
      label: null,
    }));
  },

  chunk: async (ids) => {
    const rows = await db
      .select({ id: chunks.id, slug: chunks.slug, title: chunks.title })
      .from(chunks)
      .where(and(inArray(chunks.id, ids), isNull(chunks.deletedAt)));
    // `/chunks/[slug]` is keyed by slug, so the id in the log would 404.
    return collectLinks(rows, (row) => ({ path: `/chunks/${row.slug}`, label: row.title }));
  },

  game: async (ids) => {
    const rows = await db
      .select({ id: games.id, title: games.title })
      .from(games)
      .where(and(inArray(games.id, ids), isNull(games.deletedAt)));
    return collectLinks(rows, (row) => ({
      path: `/games/shared/${row.id}`,
      label: row.title,
    }));
  },

  game_comment: async (ids) => {
    const rows = await db
      .select({ id: gameComments.id, gameId: gameComments.gameId })
      .from(gameComments)
      .where(and(inArray(gameComments.id, ids), isNull(gameComments.deletedAt)));
    // Comment threads are per-move: the detail page opens the commented move
    // and scrolls to it when `?comment=` names one.
    return collectLinks(rows, (row) => ({
      path: `/games/shared/${row.gameId}?comment=${row.id}`,
      label: null,
    }));
  },

  repertoire: async (ids) => {
    const rows = await db
      .select({ id: repertoires.id, name: repertoires.name })
      .from(repertoires)
      .where(and(inArray(repertoires.id, ids), isNull(repertoires.deletedAt)));
    return collectLinks(rows, (row) => ({ path: `/repertoires/${row.id}`, label: row.name }));
  },
};

/**
 * Resolve every activity row on the page to the public page its target is read
 * on, in one query per target kind — the same batching the page already does
 * for actor profiles, so the row component stays synchronous.
 */
export async function resolveActivityTargetLinks(
  logs: readonly UserActivityLog[]
): Promise<ActivityTargetLinkMap> {
  const idsByType = new Map<string, Set<string>>();
  for (const log of logs) {
    if (!log.targetType || !log.targetId) continue;
    if (!(log.targetType in TARGET_RESOLVERS)) continue;
    const ids = idsByType.get(log.targetType) ?? new Set<string>();
    ids.add(log.targetId);
    idsByType.set(log.targetType, ids);
  }

  const resolved = await Promise.all(
    [...idsByType].map(async ([targetType, ids]) => {
      const links = await TARGET_RESOLVERS[targetType]([...ids]);
      return [targetType, links] as const;
    })
  );

  const linksByKey = new Map<string, ActivityTargetLink>();
  for (const [targetType, links] of resolved) {
    for (const [targetId, link] of links) {
      linksByKey.set(activityTargetKey(targetType, targetId), link);
    }
  }
  return linksByKey;
}
