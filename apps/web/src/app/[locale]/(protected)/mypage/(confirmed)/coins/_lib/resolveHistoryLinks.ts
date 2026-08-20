import { and, inArray, isNull } from 'drizzle-orm';
import 'server-only';

import { chunks, db, games, positions, repertoires, topicPosts } from '@/lib/db';
import { POINT_SOURCES, type PointHistoryEntry, type PointSource } from '@/lib/points';
import { getPositionKindDetailPath } from '@/lib/positions/kind';

import { buildTopicPostPath } from '@/app/[locale]/(public)/topics/_lib/topic-paths';

/**
 * Resolve a deep link to the UGC that earned each coin-grant history row.
 *
 * @design Live-only, best-effort
 *
 * Only positive `post_grant` rows (UGC create / publish) resolve a link;
 * like-coin grants, clawbacks, redemptions etc. never do. Each source id is
 * checked against its live table (`deleted_at IS NULL`) before a link is
 * produced, so a deleted contribution simply falls back to plain text — the
 * accompanying negative `post_clawback` row already explains the reversal, and
 * we never emit a URL that would 404. Ids / slugs are immutable, so a resolved
 * link cannot drift.
 *
 * Returns `Map<pointEventId, href>`; a row absent from the map renders without
 * a link. One batched query per source table keeps this to a fixed cost.
 */
export async function resolveHistoryLinks(
  entries: PointHistoryEntry[]
): Promise<Map<string, string>> {
  const grantRows = entries.filter(
    (e): e is PointHistoryEntry & { sourceId: string } =>
      e.kind === 'post_grant' &&
      e.delta > 0 &&
      e.sourceId !== null &&
      (POINT_SOURCES as readonly string[]).includes(e.source)
  );
  if (grantRows.length === 0) return new Map();

  const idsBySource = new Map<string, string[]>();
  for (const row of grantRows) {
    const list = idsBySource.get(row.source) ?? [];
    list.push(row.sourceId);
    idsBySource.set(row.source, list);
  }

  // puzzle + position-memory grants both point at rows in `positions`.
  const positionIds = [
    ...(idsBySource.get('puzzle_created') ?? []),
    ...(idsBySource.get('position_memory_created') ?? []),
  ];
  const chunkIds = idsBySource.get('chunk_created') ?? [];
  const topicIds = idsBySource.get('topic_post_created') ?? [];
  const repertoireIds = idsBySource.get('repertoire_published') ?? [];
  const gameIds = idsBySource.get('game_published') ?? [];

  const [positionRows, chunkRows, topicRows, repertoireRows, gameRows] = await Promise.all([
    positionIds.length
      ? db
          .select({ id: positions.id })
          .from(positions)
          .where(and(inArray(positions.id, positionIds), isNull(positions.deletedAt)))
      : Promise.resolve<{ id: string }[]>([]),
    chunkIds.length
      ? db
          .select({ id: chunks.id, slug: chunks.slug })
          .from(chunks)
          .where(and(inArray(chunks.id, chunkIds), isNull(chunks.deletedAt)))
      : Promise.resolve<{ id: string; slug: string }[]>([]),
    topicIds.length
      ? db
          .select({
            id: topicPosts.id,
            topicType: topicPosts.topicType,
            topicKey: topicPosts.topicKey,
          })
          .from(topicPosts)
          .where(and(inArray(topicPosts.id, topicIds), isNull(topicPosts.deletedAt)))
      : Promise.resolve<{ id: string; topicType: string; topicKey: string }[]>([]),
    repertoireIds.length
      ? db
          .select({ id: repertoires.id })
          .from(repertoires)
          .where(and(inArray(repertoires.id, repertoireIds), isNull(repertoires.deletedAt)))
      : Promise.resolve<{ id: string }[]>([]),
    gameIds.length
      ? db
          .select({ id: games.id })
          .from(games)
          .where(and(inArray(games.id, gameIds), isNull(games.deletedAt)))
      : Promise.resolve<{ id: string }[]>([]),
  ]);

  const resolved: ResolvedEntities = {
    livePositionIds: new Set(positionRows.map((r) => r.id)),
    chunkSlugById: new Map(chunkRows.map((r) => [r.id, r.slug])),
    topicMetaById: new Map(topicRows.map((r) => [r.id, r])),
    liveRepertoireIds: new Set(repertoireRows.map((r) => r.id)),
    liveGameIds: new Set(gameRows.map((r) => r.id)),
  };

  const links = new Map<string, string>();
  for (const row of grantRows) {
    const href = grantHref(row.source, row.sourceId, resolved);
    if (href) links.set(row.id, href);
  }
  return links;
}

/** Liveness / URL-component lookups resolved from the source tables. */
export type ResolvedEntities = {
  livePositionIds: Set<string>;
  chunkSlugById: Map<string, string>;
  topicMetaById: Map<string, { topicType: string; topicKey: string }>;
  liveRepertoireIds: Set<string>;
  liveGameIds: Set<string>;
};

/** Resolves one grant source's deep link, or `null` when the target is gone. */
type GrantHrefResolver = (sourceId: string, resolved: ResolvedEntities) => string | null;

/**
 * One resolver per earning source.
 *
 * `satisfies Record<PointSource, …>` closes the set: adding a source to
 * `POINT_SOURCES` without a link here is a compile error. Previously this was
 * a `switch` over a `string` parameter ending in `default: return null`, so a
 * new earning source produced coin-history rows rendered as plain text while
 * every other source linked — a silent asymmetry with nothing to catch it.
 *
 * Note the sibling gap this does NOT close: the batched liveness lookups in
 * {@link resolveHistoryLinks} need a matching table read per source, and
 * nothing forces that to be added alongside a resolver here.
 */
const GRANT_HREF_RESOLVERS = {
  puzzle_created: (sourceId, resolved) =>
    resolved.livePositionIds.has(sourceId) ? getPositionKindDetailPath('puzzle', sourceId) : null,
  position_memory_created: (sourceId, resolved) =>
    resolved.livePositionIds.has(sourceId) ? getPositionKindDetailPath('memory', sourceId) : null,
  chunk_created: (sourceId, resolved) => {
    const slug = resolved.chunkSlugById.get(sourceId);
    return slug ? `/chunks/${slug}` : null;
  },
  repertoire_published: (sourceId, resolved) =>
    resolved.liveRepertoireIds.has(sourceId) ? `/repertoires/${sourceId}` : null,
  game_published: (sourceId, resolved) =>
    resolved.liveGameIds.has(sourceId) ? `/games/shared/${sourceId}` : null,
  topic_post_created: (sourceId, resolved) => {
    const meta = resolved.topicMetaById.get(sourceId);
    if (!meta) return null;
    // Only `square` / `opening` topics earn grants (isPointEligibleTopicType);
    // both use the plural-segment post route (`squares` / `openings`).
    return buildTopicPostPath(meta.topicType, meta.topicKey, sourceId);
  },
} as const satisfies Record<PointSource, GrantHrefResolver>;

/**
 * Map a grant `(source, sourceId)` to its UGC deep link, or `null` when the
 * target is not live (absent from the resolved sets). Pure — the DB lookups
 * happen in {@link resolveHistoryLinks}; this is the branch logic, unit-tested
 * on its own.
 *
 * `source` stays `string`: `point_events.source` also carries non-UGC values
 * (`admin_grant`, `like_grant`, `redemption`, …) that legitimately have no
 * link, and callers pass rows straight from the ledger.
 */
export function grantHref(
  source: string,
  sourceId: string,
  resolved: ResolvedEntities
): string | null {
  const resolve: GrantHrefResolver | undefined = (
    GRANT_HREF_RESOLVERS as Record<string, GrantHrefResolver>
  )[source];
  return resolve ? resolve(sourceId, resolved) : null;
}
