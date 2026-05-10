import {
  getFenAfterMoves,
  getStartingFen,
  parsePgnWithFen,
} from '@blindfold-chess/features/chess-core';
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
import { buildPostImagePublicUrl } from '@/lib/post-images/public-url';

import type { AttachedEmbedCardData } from '@/app/[locale]/(public)/topics/_components/AttachedEmbedCard';
import type { AttachedFenCardData } from '@/app/[locale]/(public)/topics/_components/AttachedFenCard';
import type { AttachedGameCardData } from '@/app/[locale]/(public)/topics/_components/AttachedGameCard';
import type { AttachedImageCardData } from '@/app/[locale]/(public)/topics/_components/AttachedImageCard';
import type { AttachedVideoCardData } from '@/app/[locale]/(public)/topics/_components/AttachedVideoCard';

/**
 * Per-post attachment payload. SPEC2 UI integration widens the union
 * from `'pgn' | 'embed'` to the full 5-kind family of attachments.
 *
 * @design Application-layer single-kind invariant (SPEC2 D3 case (iii))
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
 * @design image cardinality (SPEC2 D4 γ-1)
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
 * five attachment families (`post_game_pgn_attachments`,
 * `post_game_embed_attachments`, `post_image_attachments`,
 * `post_fen_attachments`, `post_video_attachments`) are queried in
 * parallel and reduced to a single map entry per post per the
 * single-kind preference order documented on `PostAttachment`.
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

  // Order matters: pgn > embed > image > fen > video. The preference
  // is documented on PostAttachment and enforced here by the order of
  // the loops + the `if (map.has(...))` guard.

  for (const row of pgnRows) {
    // Compute the final-position FEN server-side. The summary card
    // only needs a static FEN string for its thumbnail, so doing the
    // PGN parse + chess.js replay here keeps chess-core off the
    // client bundle of every page that lists attached games. See
    // SPEC1 §5-1 ("初期はサムネイルのみ + 詳細展開時のみリプレイ UI を lazy ロード").
    let finalFen: string;
    try {
      const parsed = parsePgnWithFen(row.pgn);
      const startingFen = parsed.startingFen ?? getStartingFen();
      finalFen = getFenAfterMoves(startingFen, parsed.moves);
    } catch {
      // Defensive: validateAttachedPgn already accepted this PGN at
      // write time. If it now fails to parse the row is corrupt or
      // chess.js changed behavior; fall back to the standard starting
      // position rather than dropping the whole attachment.
      finalFen = getStartingFen();
    }

    map.set(row.postId, {
      kind: 'pgn',
      data: {
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
        headerSite: row.headerSite,
        headerDate: row.headerDate,
        anonymized: row.anonymized,
        attributionPlatform: row.attributionPlatform,
        attributionPath: row.attributionPath,
        finalFen,
      },
    });
  }

  for (const row of embedRows) {
    if (map.has(row.postId)) {
      conflictWarn(row.postId, 'pgn', 'embed');
      continue;
    }
    map.set(row.postId, {
      kind: 'embed',
      data: {
        id: row.id,
        embedProvider: row.embedProvider,
        embedId: row.embedId,
        attributionPlatform: row.attributionPlatform,
        attributionPath: row.attributionPath,
      },
    });
  }

  // Image cardinality is 1:N — group rows by post into an array entry.
  // Rows are already ordered by (postId, displayOrder) ascending.
  const imagesByPost = new Map<string, AttachedImageCardData[]>();
  for (const row of imageRows) {
    const item: AttachedImageCardData = {
      id: row.id,
      publicUrl: buildPostImagePublicUrl(row.storagePath),
      width: row.width,
      height: row.height,
      altText: row.altText,
      displayOrder: row.displayOrder,
    };
    const bucket = imagesByPost.get(row.postId);
    if (bucket) {
      bucket.push(item);
    } else {
      imagesByPost.set(row.postId, [item]);
    }
  }
  for (const [postId, images] of imagesByPost) {
    if (map.has(postId)) {
      const existingKind = map.get(postId)!.kind;
      conflictWarn(postId, existingKind, 'image');
      continue;
    }
    map.set(postId, { kind: 'image', data: images });
  }

  for (const row of fenRows) {
    if (map.has(row.postId)) {
      const existingKind = map.get(row.postId)!.kind;
      conflictWarn(row.postId, existingKind, 'fen');
      continue;
    }
    map.set(row.postId, {
      kind: 'fen',
      data: {
        id: row.id,
        fen: row.fen,
        caption: row.caption,
      },
    });
  }

  for (const row of videoRows) {
    if (map.has(row.postId)) {
      const existingKind = map.get(row.postId)!.kind;
      conflictWarn(row.postId, existingKind, 'video');
      continue;
    }
    map.set(row.postId, {
      kind: 'video',
      data: {
        id: row.id,
        provider: row.provider,
        providerVideoId: row.providerVideoId,
        title: row.title,
      },
    });
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
