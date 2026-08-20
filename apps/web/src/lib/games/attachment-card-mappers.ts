/**
 * Pure row→card-data mappers for the five post-attachment families. Each
 * mapper turns one attachment table's row shape into the card-data shape its
 * renderer consumes; `getAttachmentsForPosts` composes them with the fetch
 * and the single-kind merge policy. Kept separate so the only non-trivial
 * transform — the PGN replay that derives the thumbnail FEN — is testable
 * without a database.
 */
import {
  getFenAfterMoves,
  getStartingFen,
  parsePgnWithFen,
} from '@blindfold-chess/features/chess-core';

import { buildPostImagePublicUrl } from '@/lib/post-images/public-url';

import type { AttachedEmbedCardData } from '@/app/[locale]/(public)/topics/_components/AttachedEmbedCard';
import type { AttachedFenCardData } from '@/app/[locale]/(public)/topics/_components/AttachedFenCard';
import type { AttachedGameCardData } from '@/app/[locale]/(public)/topics/_components/AttachedGameCard';
import type { AttachedImageCardData } from '@/app/[locale]/(public)/topics/_components/AttachedImageCard';
import type { AttachedVideoCardData } from '@/app/[locale]/(public)/topics/_components/AttachedVideoCard';

export type PgnAttachmentRow = Omit<AttachedGameCardData, 'finalFen'>;

/**
 * Compute the final-position FEN server-side. The summary card only needs a
 * static FEN string for its thumbnail, so doing the PGN parse + chess.js
 * replay here keeps chess-core off the client bundle of every page that
 * lists attached games — the card shows a thumbnail only, and the replay UI
 * is lazy-loaded on expand (see `GameReplayModal`).
 */
export function pgnRowToCard(row: PgnAttachmentRow): AttachedGameCardData {
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
  return {
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
  };
}

export function embedRowToCard(row: AttachedEmbedCardData): AttachedEmbedCardData {
  return {
    id: row.id,
    embedProvider: row.embedProvider,
    embedId: row.embedId,
    attributionPlatform: row.attributionPlatform,
    attributionPath: row.attributionPath,
  };
}

export type ImageAttachmentRow = Omit<AttachedImageCardData, 'publicUrl'> & {
  postId: string;
  storagePath: string;
};

/**
 * Group image rows by post (image cardinality is 1:N — up to 3, enforced by
 * a trigger), resolving each storage path to its public URL. Rows must
 * arrive ordered by (postId, displayOrder) ascending; insertion order is
 * preserved per bucket.
 *
 * A row whose storage path cannot be resolved to a public URL (unsafe path
 * shape, missing Supabase URL config) is dropped instead of thrown: one
 * corrupt row must not take down every page that lists attachments.
 * `onDroppedRow` receives each dropped row so the caller can surface it to
 * observability — the mapper itself stays side-effect-free.
 */
export function groupImageRows(
  rows: readonly ImageAttachmentRow[],
  onDroppedRow?: (row: ImageAttachmentRow, error: unknown) => void
): Map<string, AttachedImageCardData[]> {
  const imagesByPost = new Map<string, AttachedImageCardData[]>();
  for (const row of rows) {
    let publicUrl: string;
    try {
      publicUrl = buildPostImagePublicUrl(row.storagePath);
    } catch (error) {
      onDroppedRow?.(row, error);
      continue;
    }
    const item: AttachedImageCardData = {
      id: row.id,
      publicUrl,
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
  return imagesByPost;
}

export function fenRowToCard(row: AttachedFenCardData): AttachedFenCardData {
  return { id: row.id, fen: row.fen, caption: row.caption };
}

export function videoRowToCard(row: AttachedVideoCardData): AttachedVideoCardData {
  return {
    id: row.id,
    provider: row.provider,
    providerVideoId: row.providerVideoId,
    title: row.title,
  };
}
