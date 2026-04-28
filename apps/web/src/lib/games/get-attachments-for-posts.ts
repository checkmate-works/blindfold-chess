import {
  getFenAfterMoves,
  getStartingFen,
  parsePgnWithFen,
} from '@blindfold-chess/features/chess-core';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import 'server-only';

import { db, postGameEmbedAttachments, postGamePgnAttachments, topicPosts } from '@/lib/db';

import type { AttachedEmbedCardData } from '@/app/[locale]/(public)/topics/_components/AttachedEmbedCard';
import type { AttachedGameCardData } from '@/app/[locale]/(public)/topics/_components/AttachedGameCard';

/**
 * Per-post attachment payload. SPEC2 Phase B introduces the `embed`
 * variant alongside the existing `pgn` variant.
 *
 * @design Application-layer 1:0..1 invariant
 *
 * The two attachment tables (`post_game_pgn_attachments` and
 * `post_game_embed_attachments`) are independently RLS-gated and
 * write-once. The Server Actions only expose one entry point per kind,
 * so a given `post_id` is expected to have AT MOST ONE row across the
 * two tables. The loader below enforces that invariant defensively: if
 * a post somehow has both, it logs a warning and returns the PGN
 * variant (older + better-tested rendering path).
 */
export type PostAttachment =
  | { kind: 'pgn'; data: AttachedGameCardData }
  | { kind: 'embed'; data: AttachedEmbedCardData };

/**
 * Fetch attachments for the given set of post IDs, filtering by parent
 * topic_post visibility.
 *
 * @description
 * Returns a `Map<postId, PostAttachment>` so callers can attach the
 * game data to their per-post objects in O(1) without re-querying.
 * Includes both PGN attachments (post_game_pgn_attachments) and embed
 * attachments (post_game_embed_attachments).
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
): Promise<Map<string, PostAttachment>> {
  if (postIds.length === 0) return new Map();

  const [pgnRows, embedRows] = await Promise.all([
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
      .where(
        and(inArray(postGamePgnAttachments.postId, [...postIds]), isNull(topicPosts.deletedAt))
      ),
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
      .where(
        and(inArray(postGameEmbedAttachments.postId, [...postIds]), isNull(topicPosts.deletedAt))
      ),
  ]);

  const map = new Map<string, PostAttachment>();
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
      // PGN/embed exclusivity invariant violated. The Server Actions
      // enforce 1:0..1 by construction, so this branch only fires if
      // a future flow inserts both kinds for the same post (or via a
      // direct DB write). We prefer the PGN variant for safety: it is
      // the older, better-tested rendering path. Logged via console
      // so Sentry / observability picks it up without throwing.

      console.warn(
        `[get-attachments-for-posts] post ${row.postId} has both PGN and embed attachments; preferring PGN`
      );
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
  return map;
}
