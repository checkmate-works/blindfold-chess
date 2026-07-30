import { cache } from 'react';

import { type SQL, and, asc, desc, eq, inArray, isNull } from 'drizzle-orm';

import {
  AUTHOR_PROFILE_COLUMNS,
  chunkFeedbackTopics,
  chunks,
  db,
  liveProfileJoinOn,
  positionChunks,
  positions,
  profiles,
} from '@/lib/db';
import { combineConditions, countRows, runPaginatedSelect } from '@/lib/db/list-query';
import { UUID_RE } from '@/lib/validations/uuid';

import { linkableChunkPredicate } from './linkability';
import type { ChunkOption } from './types';
import type { ChunkFeedbackTopic, ChunkStatus } from './validation';
import { isChunkFeedbackTopic, isChunkStatus } from './validation';

// Shared select column list for the picker-facing chunk queries.
// Centralized so the per-position and the global catalog loaders stay
// in lock-step — adding a chunk column shows up in one place.
const chunkOptionSelectColumns = {
  id: chunks.id,
  slug: chunks.slug,
  title: chunks.title,
  representativeFen: chunks.representativeFen,
  description: chunks.description,
  status: chunks.status,
} as const;

type ChunkOptionRow = {
  id: string;
  slug: string;
  title: string;
  representativeFen: string;
  description: string | null;
  status: string;
};

function mapChunkOption(row: ChunkOptionRow): ChunkOption {
  return {
    id: row.id,
    slug: row.slug,
    label: row.title,
    representativeFen: row.representativeFen,
    description: row.description ?? null,
    // `status` is a varchar column (deliberately not a pgEnum, so future
    // states need no ALTER TYPE). Anything outside the known set reads as
    // 'published' — the conservative default: an unrecognized state must
    // not render as "still being workshopped".
    status: isChunkStatus(row.status) ? row.status : 'published',
  };
}

type ListChunksOptions = {
  includeDeleted?: boolean;
  /**
   * Restrict to a single lifecycle status. Omitting it returns
   * chunks of any status (the default behaviour for the public
   * catalog "all" tab). The list-page filter chips pass
   * `'draft'` / `'published'` to materialize the tab-specific views.
   */
  status?: ChunkStatus;
  limit: number;
  offset: number;
};

function buildListConditions({
  includeDeleted,
  status,
}: Pick<ListChunksOptions, 'includeDeleted' | 'status'>): SQL | undefined {
  const conditions: SQL[] = [];
  if (!includeDeleted) conditions.push(isNull(chunks.deletedAt));
  if (status) conditions.push(eq(chunks.status, status));
  return combineConditions(conditions);
}

/**
 * Fetch a paginated list of chunks ordered by `createdAt` DESC.
 */
export async function listChunks({ includeDeleted, status, limit, offset }: ListChunksOptions) {
  const where = buildListConditions({ includeDeleted, status });
  return runPaginatedSelect(db.select().from(chunks).$dynamic(), {
    where,
    orderBy: [desc(chunks.createdAt)],
    limit,
    offset,
  });
}

/**
 * Fetch a paginated list of chunks joined with author profiles. Used by
 * the public catalog list page when the cards need an author avatar.
 *
 * `userId` is nullable on `chunks` (orphaned-author rows survive hard
 * account deletes), and the join is `LEFT` so those rows still surface
 * with a null profile.
 */
export async function listChunksWithProfile({
  includeDeleted,
  status,
  limit,
  offset,
}: ListChunksOptions) {
  const where = buildListConditions({ includeDeleted, status });
  const query = db
    .select({
      chunk: chunks,
      profile: AUTHOR_PROFILE_COLUMNS,
    })
    .from(chunks)
    .leftJoin(profiles, liveProfileJoinOn(chunks.userId))
    .$dynamic();
  return runPaginatedSelect(query, {
    where,
    orderBy: [desc(chunks.createdAt)],
    limit,
    offset,
  });
}

/**
 * Count chunks matching the given filters.
 */
export async function countChunks({
  includeDeleted,
  status,
}: Pick<ListChunksOptions, 'includeDeleted' | 'status'>) {
  return countRows(chunks, buildListConditions({ includeDeleted, status }));
}

/**
 * Fetch a single chunk by slug. Only returns non-deleted rows (public use).
 *
 * Wrapped with `React.cache` for per-request deduplication.
 */
export const getChunkBySlug = cache(async (slug: string) => {
  if (!slug) return null;

  const [row] = await db
    .select()
    .from(chunks)
    .where(and(eq(chunks.slug, slug), isNull(chunks.deletedAt)))
    .limit(1);

  return row ?? null;
});

/**
 * Same as {@link getChunkBySlug} but also returns the author profile fields
 * needed by the detail page's "Created by" attribution row.
 *
 * `userId` is nullable on `chunks` (orphaned-author rows survive hard
 * account deletes), and the join is `LEFT` so those rows still surface
 * with a null profile — matches `listChunksWithProfile`.
 */
export const getChunkBySlugWithProfile = cache(async (slug: string) => {
  if (!slug) return null;

  const [row] = await db
    .select({
      chunk: chunks,
      profile: AUTHOR_PROFILE_COLUMNS,
    })
    .from(chunks)
    .leftJoin(profiles, liveProfileJoinOn(chunks.userId))
    .where(and(eq(chunks.slug, slug), isNull(chunks.deletedAt)))
    .limit(1);

  return row ?? null;
});

/**
 * Fetch the set of fields the chunk author wants targeted feedback on.
 * Returns an empty array when no rows exist (either the author opted out
 * or the chunk is published and has been cleared on transition).
 *
 * Filters out unknown topic strings defensively — the DB stores
 * `varchar(50)` so a future topic added in newer code could appear on a
 * page rendered by older code; dropping the unknown value is safer than
 * crashing the page over a forward-compat surprise.
 */
export const getFeedbackTopicsForChunk = cache(
  async (chunkId: string): Promise<ChunkFeedbackTopic[]> => {
    if (!UUID_RE.test(chunkId)) return [];

    const rows = await db
      .select({ topic: chunkFeedbackTopics.topic })
      .from(chunkFeedbackTopics)
      .where(eq(chunkFeedbackTopics.chunkId, chunkId));

    return rows.map((row) => row.topic).filter(isChunkFeedbackTopic);
  }
);

/**
 * Bulk variant of `getFeedbackTopicsForChunk` for list surfaces.
 * Returns a Map keyed by chunk id; chunks with no flagged topics
 * are absent from the map (callers fall back to "no topics").
 *
 * The list page uses this to render per-card "topic" chips on draft
 * cards in one round-trip instead of N parallel single-chunk queries.
 */
export const getFeedbackTopicsForChunks = cache(
  async (chunkIds: readonly string[]): Promise<Map<string, ChunkFeedbackTopic[]>> => {
    const map = new Map<string, ChunkFeedbackTopic[]>();
    if (chunkIds.length === 0) return map;

    const validIds = chunkIds.filter((id) => UUID_RE.test(id));
    if (validIds.length === 0) return map;

    const rows = await db
      .select({ chunkId: chunkFeedbackTopics.chunkId, topic: chunkFeedbackTopics.topic })
      .from(chunkFeedbackTopics)
      .where(inArray(chunkFeedbackTopics.chunkId, validIds as string[]));

    for (const row of rows) {
      if (!isChunkFeedbackTopic(row.topic)) continue;
      const existing = map.get(row.chunkId);
      if (existing) {
        existing.push(row.topic);
      } else {
        map.set(row.chunkId, [row.topic]);
      }
    }
    return map;
  }
);

/**
 * Slug-collision preflight for the chunk create flow. Returns minimal
 * metadata for any chunk matching `slug` regardless of `deletedAt` —
 * the DB-level UNIQUE constraint on `chunks.slug` does NOT exclude
 * soft-deleted rows, so a slug remains reserved after a logical delete.
 * Resurrecting via the same slug requires a service-role restore, not a
 * fresh INSERT.
 *
 * The check is a UX preflight only; the canonical guarantee is the unique
 * constraint, and the mutation layer also catches PG error code 23505 to
 * cover the race window between preflight and INSERT.
 */
export const findChunkBySlug = cache(async (slug: string) => {
  const trimmed = slug.trim();
  if (!trimmed) return null;

  const [row] = await db
    .select({
      id: chunks.id,
      slug: chunks.slug,
      deletedAt: chunks.deletedAt,
    })
    .from(chunks)
    .where(eq(chunks.slug, trimmed))
    .limit(1);

  return row ?? null;
});

/**
 * Fetch chunks linked to a position via the position_chunks junction table.
 * Only returns non-deleted chunks, ordered by chunk title ascending.
 * Used on position detail pages to show related patterns.
 */
export async function getLinkedChunksForPosition(positionId: string) {
  const rows = await db
    .select({
      id: chunks.id,
      slug: chunks.slug,
      title: chunks.title,
      description: chunks.description,
      representativeFen: chunks.representativeFen,
    })
    .from(positionChunks)
    .innerJoin(chunks, eq(positionChunks.chunkId, chunks.id))
    .where(and(eq(positionChunks.positionId, positionId), isNull(chunks.deletedAt)))
    .orderBy(chunks.title);

  return rows;
}

/**
 * Picker-facing variant of `getLinkedChunksForPosition` that returns
 * the `ChunkOption` shape (with `label` instead of raw `title`). Used
 * by the puzzle editor when hydrating already-attached chunks; the
 * detail-page-facing `getLinkedChunksForPosition` stays available
 * unchanged for read-side consumers.
 */
export const getLinkedChunkOptionsForPosition = cache(
  async (positionId: string): Promise<ChunkOption[]> => {
    const rows = await db
      .select(chunkOptionSelectColumns)
      .from(positionChunks)
      .innerJoin(chunks, eq(chunks.id, positionChunks.chunkId))
      .where(and(eq(positionChunks.positionId, positionId), isNull(chunks.deletedAt)))
      .orderBy(asc(chunks.title));
    return rows.map(mapChunkOption);
  }
);

/**
 * Resolve `ChunkOption`s for an arbitrary set of chunk IDs, regardless of
 * status or soft-delete. Used to backfill labels in the position
 * edit-request diff: a proposal may reference a chunk that has since been
 * unlinked, unpublished, or soft-deleted, and the review UI still needs a
 * human-readable label for it. Hard-deleted (physically removed) chunks
 * simply don't come back in the result. Returns a `Map` keyed by id for
 * O(1) lookup at the call site.
 */
export async function getChunkOptionsByIds(ids: string[]): Promise<Map<string, ChunkOption>> {
  const valid = Array.from(new Set(ids)).filter((id) => UUID_RE.test(id));
  if (valid.length === 0) return new Map();
  const rows = await db
    .select(chunkOptionSelectColumns)
    .from(chunks)
    .where(inArray(chunks.id, valid));
  return new Map(rows.map((row) => [row.id, mapChunkOption(row)]));
}

/**
 * Load every published, non-deleted chunk for the picker catalog.
 * Draft chunks are intentionally excluded — they're still being
 * workshopped and surfacing them in the puzzle / position-memory
 * picker would let users pin themselves to an identifier that hasn't
 * settled yet. Already-linked draft attachments stay visible via
 * `getLinkedChunkOptionsForPosition`, which doesn't filter on
 * status — that's the right shape for "what is currently attached"
 * vs. "what is eligible to attach".
 *
 * Chunks are UGC and may grow large enough to need server-side
 * search — when that happens, swap this for a debounced search
 * action without changing the return type.
 */
export const getAllAvailableChunkOptions = cache(async (): Promise<ChunkOption[]> => {
  const rows = await db
    .select(chunkOptionSelectColumns)
    .from(chunks)
    .where(and(isNull(chunks.deletedAt), eq(chunks.status, 'published')))
    .orderBy(asc(chunks.title));
  return rows.map(mapChunkOption);
});

/**
 * Picker catalog for the game-move chunk link: every published chunk,
 * **plus the viewer's own drafts**. See `linkableChunkPredicate` for why
 * the draft allowance exists and why it is keyed on the chunk's owner.
 *
 * Anonymous viewers get the published-only list — identical to
 * `getAllAvailableChunkOptions`, but reached through the same call site so
 * the page does not branch on auth just to pick a loader.
 */
export const getLinkableChunkOptionsForViewer = cache(
  async (viewerId: string | null): Promise<ChunkOption[]> => {
    const rows = await db
      .select(chunkOptionSelectColumns)
      .from(chunks)
      .where(and(isNull(chunks.deletedAt), linkableChunkPredicate(viewerId)))
      .orderBy(asc(chunks.title));
    return rows.map(mapChunkOption);
  }
);

/**
 * Linked positions for the chunk detail page.
 *
 * Returns the full Position row plus the author profile fields needed by the
 * shared `PositionListCard` so the chunk page can render the same card UI as
 * `/practice/puzzle` and `/practice/position-memory`. Soft-deleted positions
 * are excluded; profile join is `LEFT` so a deleted-author position still
 * surfaces with a null profile (matches `listPositionsWithProfile`).
 *
 * @design position_chunks rows are intentionally preserved when a chunk is
 * soft-deleted. Because chunks use logical deletion (`deletedAt`), the
 * junction rows remain so that restoring the chunk also restores its
 * position associations without data loss. Callers that display chunk data
 * on public pages should filter out soft-deleted chunks at the chunk query
 * level (e.g. `getChunkBySlug` already enforces `deletedAt IS NULL`),
 * which prevents the linked positions from surfacing indirectly.
 */
export async function getLinkedPositionsForChunk(chunkId: string) {
  const rows = await db
    .select({
      position: positions,
      profile: AUTHOR_PROFILE_COLUMNS,
    })
    .from(positionChunks)
    .innerJoin(positions, eq(positionChunks.positionId, positions.id))
    .leftJoin(profiles, liveProfileJoinOn(positions.userId))
    .where(and(eq(positionChunks.chunkId, chunkId), isNull(positions.deletedAt)))
    .orderBy(desc(positions.createdAt));

  return rows;
}
