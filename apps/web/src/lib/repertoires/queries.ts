import { and, asc, desc, eq, inArray, isNull } from 'drizzle-orm';

import type { Repertoire, RepertoireLine } from '@/lib/db';
import { chessOpenings, db, profiles, repertoireOpenings, repertoires } from '@/lib/db';
import { repertoireLines } from '@/lib/db';

/** Author subset joined onto a repertoire for catalog cards. */
export type RepertoireAuthorProfile = {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
};

export type RepertoireWithProfile = {
  repertoire: Repertoire;
  profile: RepertoireAuthorProfile | null;
  /**
   * FEN to render as the card thumbnail: the (primary) linked opening's
   * characteristic position when one is linked, else the repertoire's own
   * starting position, else the standard start. Its side-to-move field is
   * normalised to the repertoire's side so the thumbnail is oriented from the
   * player's perspective (BoardThumbnail auto-flips on side-to-move and exposes
   * no orientation prop).
   */
  thumbnailFen: string;
};

const STANDARD_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

/**
 * Force a FEN's side-to-move field to the repertoire's side. The thumbnail is a
 * static board, so this only affects orientation (BoardThumbnail flips when
 * black is to move), never the rendered pieces.
 */
function orientFenForSide(fen: string, side: 'white' | 'black'): string {
  const parts = fen.split(' ');
  if (parts.length < 2) return fen;
  parts[1] = side === 'white' ? 'w' : 'b';
  return parts.join(' ');
}

/**
 * Map each repertoire id to a representative thumbnail FEN. Prefers the linked
 * opening's `chess_openings.fen` (a recognisable tabiya — cheap PK-join, no PGN
 * parsing); when several openings are linked, the lowest `sort_order` wins.
 */
async function getOpeningThumbnailFens(repertoireIds: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (repertoireIds.length === 0) return map;

  const rows = await db
    .select({ repertoireId: repertoireOpenings.repertoireId, fen: chessOpenings.fen })
    .from(repertoireOpenings)
    .innerJoin(chessOpenings, eq(chessOpenings.id, repertoireOpenings.openingId))
    .where(inArray(repertoireOpenings.repertoireId, repertoireIds))
    .orderBy(asc(chessOpenings.sortOrder));

  for (const row of rows) {
    if (!map.has(row.repertoireId)) map.set(row.repertoireId, row.fen);
  }
  return map;
}

/** A user's own live (non-deleted) repertoires, newest first, with author. */
export async function listRepertoiresForUser(userId: string): Promise<RepertoireWithProfile[]> {
  const rows = await db
    .select({
      repertoire: repertoires,
      profile: {
        username: profiles.username,
        displayName: profiles.displayName,
        avatarUrl: profiles.avatarUrl,
      },
    })
    .from(repertoires)
    .leftJoin(profiles, eq(repertoires.userId, profiles.id))
    .where(and(eq(repertoires.userId, userId), isNull(repertoires.deletedAt)))
    .orderBy(desc(repertoires.createdAt));

  const openingFens = await getOpeningThumbnailFens(rows.map((r) => r.repertoire.id));

  return rows.map((row) => ({
    repertoire: row.repertoire,
    profile: row.profile?.username ? row.profile : null,
    thumbnailFen: orientFenForSide(
      openingFens.get(row.repertoire.id) ?? row.repertoire.startingFen ?? STANDARD_FEN,
      row.repertoire.side
    ),
  }));
}

export type RepertoireWithLines = {
  repertoire: Repertoire;
  lines: RepertoireLine[];
  profile: RepertoireAuthorProfile | null;
};

export type RepertoireForViewer = RepertoireWithLines & {
  /** Whether the requesting viewer owns this repertoire (gates annotation edits). */
  isOwner: boolean;
};

/**
 * A single repertoire with its lines + author profile, for the public-facing
 * detail / line pages. Repertoires follow a soft-privacy model — "private" only
 * hides them from listings / navigation; an undeleted repertoire is viewable by
 * anyone who has the URL. Hence no status / auth gate on viewing here; the
 * returned `isOwner` flag is what gates the owner-only affordances (delete,
 * annotate).
 *
 * `viewerId` is null for anonymous visitors.
 */
export async function getRepertoireForViewer(
  id: string,
  viewerId: string | null
): Promise<RepertoireForViewer | null> {
  const [repertoire] = await db
    .select()
    .from(repertoires)
    .where(and(eq(repertoires.id, id), isNull(repertoires.deletedAt)))
    .limit(1);
  if (!repertoire) return null;

  const isOwner = viewerId != null && repertoire.userId === viewerId;

  const lines = await db
    .select()
    .from(repertoireLines)
    .where(and(eq(repertoireLines.repertoireId, repertoire.id), isNull(repertoireLines.deletedAt)))
    .orderBy(asc(repertoireLines.seq));

  let profile: RepertoireAuthorProfile | null = null;
  if (repertoire.userId) {
    const [row] = await db
      .select({
        username: profiles.username,
        displayName: profiles.displayName,
        avatarUrl: profiles.avatarUrl,
      })
      .from(profiles)
      .where(eq(profiles.id, repertoire.userId))
      .limit(1);
    profile = row?.username ? row : null;
  }

  return { repertoire, lines, profile, isOwner };
}

/**
 * Existence + author lookup for the comment system (topicType 'repertoire').
 * Returns the owner id (for notification targeting) when the repertoire exists
 * and is not deleted; null otherwise. Mirrors the puzzle's `getPositionById`
 * existence check used in the post-creation actions.
 */
export async function getRepertoireById(id: string): Promise<{ userId: string | null } | null> {
  const [row] = await db
    .select({ userId: repertoires.userId })
    .from(repertoires)
    .where(and(eq(repertoires.id, id), isNull(repertoires.deletedAt)))
    .limit(1);
  return row ?? null;
}
