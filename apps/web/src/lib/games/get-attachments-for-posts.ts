import * as Sentry from '@sentry/nextjs';
import { and, asc, eq, inArray, isNull } from 'drizzle-orm';
import 'server-only';

import {
  db,
  postFenAttachments,
  postGameEmbedAttachments,
  postGamePgnAttachments,
  postImageAttachments,
  postVideoAttachments,
  topicPosts,
} from '@/lib/db';
import { captureError } from '@/lib/sentry/capture-error';

import type { AttachedEmbedCardData } from '@/app/[locale]/(public)/topics/_components/AttachedEmbedCard';
import type { AttachedFenCardData } from '@/app/[locale]/(public)/topics/_components/AttachedFenCard';
import type { AttachedGameCardData } from '@/app/[locale]/(public)/topics/_components/AttachedGameCard';
import type { AttachedImageCardData } from '@/app/[locale]/(public)/topics/_components/AttachedImageCard';
import type { AttachedVideoCardData } from '@/app/[locale]/(public)/topics/_components/AttachedVideoCard';

import type { ImageAttachmentRow, PgnAttachmentRow } from './attachment-card-mappers';
import {
  embedRowToCard,
  fenRowToCard,
  groupImageRows,
  pgnRowToCard,
  videoRowToCard,
} from './attachment-card-mappers';

/**
 * Per-post attachment payload, covering the full 5-kind family of
 * attachments.
 *
 * @design Application-layer single-kind invariant
 *
 * Each attachment table is independently RLS-gated and write-once. The
 * Server Actions only expose one attach-path per kind, so a given
 * `post_id` is expected to carry rows in AT MOST ONE of the five
 * tables. The loader below enforces that invariant defensively: when a
 * post somehow lands rows in multiple tables, the preferring order is
 *   pgn > embed > image > fen > video
 * (PGN/embed are the longest-running, best-tested rendering paths;
 * image is preferred over fen/video because the user explicitly
 * uploaded a file, a stronger intent signal than a URL paste).
 *
 * The `Map<postId, PostAttachment>` shape is preserved so callers
 * (PostCard, post detail page) can keep using `map.get(id) ?? null`.
 *
 * @design image cardinality
 *
 * `kind: 'image'` carries `data: readonly AttachedImageCardData[]`
 * because per-post image cardinality is 1:N (up to 3 enforced by a
 * trigger). Using a single map entry whose `data` is an array keeps
 * the `Map<postId, PostAttachment>` semantics intact while letting the
 * renderer iterate.
 */
export type PostAttachment =
  | { kind: 'pgn'; data: AttachedGameCardData }
  | { kind: 'embed'; data: AttachedEmbedCardData }
  | { kind: 'image'; data: readonly AttachedImageCardData[] }
  | { kind: 'fen'; data: AttachedFenCardData }
  | { kind: 'video'; data: AttachedVideoCardData };

/**
 * Fetch attachments for the given set of post IDs, filtering by parent
 * topic_post visibility.
 *
 * @description
 * Returns a `Map<postId, PostAttachment>` so callers can attach the
 * payload to their per-post objects in O(1) without re-querying. The
 * work is staged: the five attachment families are queried in parallel,
 * each family's rows go through its pure card mapper
 * (`./attachment-card-mappers`), and the results are reduced to a single
 * map entry per post per the single-kind preference order documented on
 * `PostAttachment`.
 *
 * @design Soft-delete safety
 *
 * Every SELECT joins back to `topic_posts` and filters
 * `deleted_at IS NULL`. The application's standard post queries already
 * exclude soft-deleted posts, so this filter is redundant in the happy
 * path — but it ensures any future caller that forgets the filter (or
 * fetches by post ID from a less-strict source) cannot leak attachments
 * belonging to deleted posts to the UI. Application-side mirror of the
 * RLS SELECT policy on each table.
 */
export async function getAttachmentsForPosts(
  postIds: readonly string[]
): Promise<Map<string, PostAttachment>> {
  if (postIds.length === 0) return new Map();

  const ids = [...postIds];

  const [pgnRows, embedRows, imageRows, fenRows, videoRows] = await Promise.all([
    db
      .select({
        id: postGamePgnAttachments.id,
        postId: postGamePgnAttachments.postId,
        source: postGamePgnAttachments.source,
        sourceUrl: postGamePgnAttachments.sourceUrl,
        sourceGameId: postGamePgnAttachments.sourceGameId,
        pgn: postGamePgnAttachments.pgn,
        moveCount: postGamePgnAttachments.moveCount,
        headerWhite: postGamePgnAttachments.headerWhite,
        headerBlack: postGamePgnAttachments.headerBlack,
        headerResult: postGamePgnAttachments.headerResult,
        headerEvent: postGamePgnAttachments.headerEvent,
        headerSite: postGamePgnAttachments.headerSite,
        headerDate: postGamePgnAttachments.headerDate,
        anonymized: postGamePgnAttachments.anonymized,
        attributionPlatform: postGamePgnAttachments.attributionPlatform,
        attributionPath: postGamePgnAttachments.attributionPath,
      })
      .from(postGamePgnAttachments)
      .innerJoin(topicPosts, eq(topicPosts.id, postGamePgnAttachments.postId))
      .where(and(inArray(postGamePgnAttachments.postId, ids), isNull(topicPosts.deletedAt))),
    db
      .select({
        id: postGameEmbedAttachments.id,
        postId: postGameEmbedAttachments.postId,
        embedProvider: postGameEmbedAttachments.embedProvider,
        embedId: postGameEmbedAttachments.embedId,
        attributionPlatform: postGameEmbedAttachments.attributionPlatform,
        attributionPath: postGameEmbedAttachments.attributionPath,
      })
      .from(postGameEmbedAttachments)
      .innerJoin(topicPosts, eq(topicPosts.id, postGameEmbedAttachments.postId))
      .where(and(inArray(postGameEmbedAttachments.postId, ids), isNull(topicPosts.deletedAt))),
    db
      .select({
        id: postImageAttachments.id,
        postId: postImageAttachments.postId,
        storagePath: postImageAttachments.storagePath,
        width: postImageAttachments.width,
        height: postImageAttachments.height,
        altText: postImageAttachments.altText,
        displayOrder: postImageAttachments.displayOrder,
      })
      .from(postImageAttachments)
      .innerJoin(topicPosts, eq(topicPosts.id, postImageAttachments.postId))
      .where(and(inArray(postImageAttachments.postId, ids), isNull(topicPosts.deletedAt)))
      .orderBy(asc(postImageAttachments.postId), asc(postImageAttachments.displayOrder)),
    db
      .select({
        id: postFenAttachments.id,
        postId: postFenAttachments.postId,
        fen: postFenAttachments.fen,
        caption: postFenAttachments.caption,
      })
      .from(postFenAttachments)
      .innerJoin(topicPosts, eq(topicPosts.id, postFenAttachments.postId))
      .where(and(inArray(postFenAttachments.postId, ids), isNull(topicPosts.deletedAt))),
    db
      .select({
        id: postVideoAttachments.id,
        postId: postVideoAttachments.postId,
        provider: postVideoAttachments.provider,
        providerVideoId: postVideoAttachments.providerVideoId,
        title: postVideoAttachments.title,
      })
      .from(postVideoAttachments)
      .innerJoin(topicPosts, eq(topicPosts.id, postVideoAttachments.postId))
      .where(and(inArray(postVideoAttachments.postId, ids), isNull(topicPosts.deletedAt))),
  ]);

  return mergeAttachmentsByPreference(
    { pgnRows, embedRows, imageRows, fenRows, videoRows },
    {
      onConflict: conflictWarn,
      onDroppedImage: (row, error) => {
        // Dropping the one bad row keeps the page alive; the storage_path
        // column is regex-pinned at the DB, so reaching this means row
        // corruption or a missing NEXT_PUBLIC_SUPABASE_URL — either way it
        // must be visible.
        captureError(
          error,
          `[get-attachments-for-posts] dropped image attachment ${row.id} (post ${row.postId}): public URL unresolvable`
        );
      },
    }
  );
}

/** The five per-family row sets, as fetched by {@link getAttachmentsForPosts}. */
type AttachmentRowSets = {
  pgnRows: readonly (PgnAttachmentRow & { postId: string })[];
  embedRows: readonly (AttachedEmbedCardData & { postId: string })[];
  imageRows: readonly ImageAttachmentRow[];
  fenRows: readonly (AttachedFenCardData & { postId: string })[];
  videoRows: readonly (AttachedVideoCardData & { postId: string })[];
};

/**
 * Reduce the five row sets to at most one attachment per post, applying the
 * `pgn > embed > image > fen > video` preference documented on
 * {@link PostAttachment}: the highest-priority kind is set unconditionally,
 * every lower-priority kind only where the post has no entry yet.
 *
 * A post carrying rows in more than one table breaks an application
 * invariant, so the loser is reported through `onConflict` (Sentry, in
 * production) and dropped — never thrown, because one bad post must not fail
 * the whole page.
 *
 * Pure, and separate from the fetch, because the fetch's tests drive it
 * through a FIFO queue of stubbed rows: that made the assertions depend on
 * the *order* the five `db.select()` calls are issued, so reordering the
 * `Promise.all` array — a semantically neutral edit — broke every case.
 */
export function mergeAttachmentsByPreference(
  rows: AttachmentRowSets,
  handlers: {
    onConflict: (postId: string, preferredKind: string, droppedKind: string) => void;
    onDroppedImage?: (row: ImageAttachmentRow, error: unknown) => void;
  }
): Map<string, PostAttachment> {
  const map = new Map<string, PostAttachment>();

  const setIfAbsent = (postId: string, attachment: PostAttachment) => {
    const existing = map.get(postId);
    if (existing) {
      handlers.onConflict(postId, existing.kind, attachment.kind);
      return;
    }
    map.set(postId, attachment);
  };

  for (const row of rows.pgnRows) {
    map.set(row.postId, { kind: 'pgn', data: pgnRowToCard(row) });
  }
  for (const row of rows.embedRows) {
    setIfAbsent(row.postId, { kind: 'embed', data: embedRowToCard(row) });
  }
  for (const [postId, images] of groupImageRows(rows.imageRows, handlers.onDroppedImage)) {
    setIfAbsent(postId, { kind: 'image', data: images });
  }
  for (const row of rows.fenRows) {
    setIfAbsent(row.postId, { kind: 'fen', data: fenRowToCard(row) });
  }
  for (const row of rows.videoRows) {
    setIfAbsent(row.postId, { kind: 'video', data: videoRowToCard(row) });
  }

  return map;
}

/**
 * Surface a multi-kind invariant break to observability without throwing.
 * Mirrors the Sentry posture from the original 2-kind aggregator.
 */
function conflictWarn(postId: string, preferredKind: string, droppedKind: string): void {
  Sentry.captureMessage(
    `[get-attachments-for-posts] post ${postId} has both ${preferredKind} and ${droppedKind} attachments; preferring ${preferredKind}`,
    {
      level: 'warning',
      tags: {
        component: 'get-attachments-for-posts',
        postId,
        preferredKind,
        droppedKind,
      },
    }
  );
}
