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

import type { AttachedEmbedCardData } from '@/app/[locale]/(public)/topics/_components/AttachedEmbedCard';
import type { AttachedFenCardData } from '@/app/[locale]/(public)/topics/_components/AttachedFenCard';
import type { AttachedGameCardData } from '@/app/[locale]/(public)/topics/_components/AttachedGameCard';
import type { AttachedImageCardData } from '@/app/[locale]/(public)/topics/_components/AttachedImageCard';
import type { AttachedVideoCardData } from '@/app/[locale]/(public)/topics/_components/AttachedVideoCard';

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

  const map = new Map<string, PostAttachment>();

  // Apply the documented single-kind preference by setting the highest-
  // priority kind unconditionally, then merging lower-priority kinds only
  // where the post has no entry yet (conflicts are reported, not thrown).
  const setIfAbsent = (postId: string, attachment: PostAttachment) => {
    const existing = map.get(postId);
    if (existing) {
      conflictWarn(postId, existing.kind, attachment.kind);
      return;
    }
    map.set(postId, attachment);
  };

  for (const row of pgnRows) {
    map.set(row.postId, { kind: 'pgn', data: pgnRowToCard(row) });
  }
  for (const row of embedRows) {
    setIfAbsent(row.postId, { kind: 'embed', data: embedRowToCard(row) });
  }
  for (const [postId, images] of groupImageRows(imageRows)) {
    setIfAbsent(postId, { kind: 'image', data: images });
  }
  for (const row of fenRows) {
    setIfAbsent(row.postId, { kind: 'fen', data: fenRowToCard(row) });
  }
  for (const row of videoRows) {
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
