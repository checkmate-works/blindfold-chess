import { and, asc, count, desc, eq, inArray, isNull } from 'drizzle-orm';

import type { Repertoire, RepertoireLine } from '@/lib/db';
import {
  AUTHOR_PROFILE_COLUMNS,
  chessOpenings,
  db,
  likes,
  liveProfileJoinOn,
  profiles,
  repertoireOpenings,
  repertoires,
} from '@/lib/db';
import { repertoireLines } from '@/lib/db';
import { guardOwnership } from '@/lib/ownership-guard';

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

/** The columns every card list selects: the row itself plus its author. */
const REPERTOIRE_CARD_COLUMNS = {
  repertoire: repertoires,
  profile: AUTHOR_PROFILE_COLUMNS,
};

type RepertoireCardRow = {
  repertoire: Repertoire;
  profile: RepertoireAuthorProfile | null;
};

/**
 * Attach the card thumbnail to freshly selected rows. One extra query for the
 * whole page rather than a join, since the thumbnail needs the lowest-sorting
 * of possibly several linked openings.
 */
async function toCards(rows: RepertoireCardRow[]): Promise<RepertoireWithProfile[]> {
  const openingFens = await getOpeningThumbnailFens(rows.map((r) => r.repertoire.id));

  return rows.map((row) => ({
    repertoire: row.repertoire,
    // A left join on a deleted author yields a row of nulls, not no row.
    profile: row.profile?.username ? row.profile : null,
    thumbnailFen: orientFenForSide(
      openingFens.get(row.repertoire.id) ?? row.repertoire.startingFen ?? STANDARD_FEN,
      row.repertoire.side
    ),
  }));
}

/** Ordering offered on the opening page's Repertoires tab. */
export type RepertoireSort = 'new' | 'popular';

/**
 * Live repertoires linked to one opening and visible to everyone.
 *
 * Filters on `status = 'public'` even though nothing writes that column today
 * (every repertoire is public by default): the paid-plan "make private" toggle
 * then becomes a UI change with no query to revisit — and, more importantly, a
 * repertoire that IS private must never appear here.
 */
function publicRepertoiresForOpening(openingSlug: string) {
  return and(
    eq(chessOpenings.slug, openingSlug),
    eq(repertoires.status, 'public'),
    isNull(repertoires.deletedAt)
  );
}

/**
 * The "who has prepared this opening" panel on the opening topic page.
 *
 * `popular` orders by like count (the same polymorphic `likes` rows the cards
 * render), newest first among ties, so a repertoire nobody has liked yet still
 * has a stable place.
 */
export async function listPublicRepertoiresForOpening(
  openingSlug: string,
  limit: number,
  sort: RepertoireSort = 'new'
): Promise<RepertoireWithProfile[]> {
  const likeCount = db.$count(
    likes,
    and(eq(likes.targetType, 'repertoire'), eq(likes.targetId, repertoires.id))
  );

  const rows = await db
    .select(REPERTOIRE_CARD_COLUMNS)
    .from(repertoireOpenings)
    .innerJoin(chessOpenings, eq(chessOpenings.id, repertoireOpenings.openingId))
    .innerJoin(repertoires, eq(repertoires.id, repertoireOpenings.repertoireId))
    .leftJoin(profiles, liveProfileJoinOn(repertoires.userId))
    .where(publicRepertoiresForOpening(openingSlug))
    .orderBy(
      ...(sort === 'popular'
        ? [desc(likeCount), desc(repertoires.createdAt)]
        : [desc(repertoires.createdAt)])
    )
    .limit(limit);

  return toCards(rows);
}

/**
 * How many public repertoires cover an opening — for the tab label, which must
 * show the true total even though the panel itself renders only the first page
 * of cards.
 */
export async function countPublicRepertoiresForOpening(openingSlug: string): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(repertoireOpenings)
    .innerJoin(chessOpenings, eq(chessOpenings.id, repertoireOpenings.openingId))
    .innerJoin(repertoires, eq(repertoires.id, repertoireOpenings.repertoireId))
    .where(publicRepertoiresForOpening(openingSlug));

  return row?.value ?? 0;
}

/**
 * Every live public repertoire, newest first — the /repertoires catalog.
 *
 * Repertoires are UGC surfaced to everyone (the feature is concealed only by
 * not being linked from global nav yet, not by being private), so this powers
 * the signed-out-visible catalog. Filters on `status = 'public'` for the same
 * reason `publicRepertoiresForOpening` does: nothing writes `private` today,
 * but a future "make private" toggle must never leak a private course here.
 */
export async function listPublicRepertoires(
  limit: number,
  offset: number
): Promise<RepertoireWithProfile[]> {
  const rows = await db
    .select(REPERTOIRE_CARD_COLUMNS)
    .from(repertoires)
    .leftJoin(profiles, liveProfileJoinOn(repertoires.userId))
    .where(and(eq(repertoires.status, 'public'), isNull(repertoires.deletedAt)))
    .orderBy(desc(repertoires.createdAt))
    .limit(limit)
    .offset(offset);

  return toCards(rows);
}

/** Total live public repertoires — the catalog's pagination denominator. */
export async function countPublicRepertoires(): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(repertoires)
    .where(and(eq(repertoires.status, 'public'), isNull(repertoires.deletedAt)));

  return row?.value ?? 0;
}

/** A user's own live (non-deleted) repertoires, newest first, with author. */
export async function listRepertoiresForUser(userId: string): Promise<RepertoireWithProfile[]> {
  const rows = await db
    .select(REPERTOIRE_CARD_COLUMNS)
    .from(repertoires)
    .leftJoin(profiles, liveProfileJoinOn(repertoires.userId))
    .where(and(eq(repertoires.userId, userId), isNull(repertoires.deletedAt)))
    .orderBy(desc(repertoires.createdAt));

  return toCards(rows);
}

/**
 * A user's live repertoires for one side, each with its live lines — the kata
 * check's input (a game is only compared against repertoires prepared for the
 * colour the player actually held).
 */
export async function listRepertoiresWithLinesForSide(
  userId: string,
  side: 'white' | 'black'
): Promise<{ repertoire: Repertoire; lines: RepertoireLine[] }[]> {
  const reps = await db
    .select()
    .from(repertoires)
    .where(
      and(eq(repertoires.userId, userId), eq(repertoires.side, side), isNull(repertoires.deletedAt))
    )
    .orderBy(desc(repertoires.createdAt));
  if (reps.length === 0) return [];

  const allLines = await db
    .select()
    .from(repertoireLines)
    .where(
      and(
        inArray(
          repertoireLines.repertoireId,
          reps.map((r) => r.id)
        ),
        isNull(repertoireLines.deletedAt)
      )
    )
    .orderBy(asc(repertoireLines.seq));

  const byRepertoire = new Map<string, RepertoireLine[]>();
  for (const line of allLines) {
    const bucket = byRepertoire.get(line.repertoireId);
    if (bucket) bucket.push(line);
    else byRepertoire.set(line.repertoireId, [line]);
  }
  return reps.map((repertoire) => ({
    repertoire,
    lines: byRepertoire.get(repertoire.id) ?? [],
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
      .select(AUTHOR_PROFILE_COLUMNS)
      .from(profiles)
      .where(eq(profiles.id, repertoire.userId))
      .limit(1);
    profile = row?.username ? row : null;
  }

  return { repertoire, lines, profile, isOwner };
}

/**
 * A single line of a viewable repertoire, addressed by its 1-based number
 * (seq + 1). Wraps `getRepertoireForViewer` + the seq lookup the line detail and
 * edit pages both did inline. Returns null when the repertoire isn't visible or
 * the line doesn't exist.
 */
export async function getRepertoireLineForViewer(
  id: string,
  lineNo: number,
  viewerId: string | null
): Promise<{ repertoire: Repertoire; line: RepertoireLine; isOwner: boolean } | null> {
  const data = await getRepertoireForViewer(id, viewerId);
  if (!data) return null;
  const line = data.lines.find((l) => l.seq === lineNo - 1);
  if (!line) return null;
  return { repertoire: data.repertoire, line, isOwner: data.isOwner };
}

/**
 * Owner gate shared by the repertoire's write paths (annotations, line edits).
 * The app DB connection bypasses RLS, so ownership is enforced here; a deleted
 * or missing repertoire is treated as not found.
 */
export async function assertRepertoireOwner(
  repertoireId: string,
  viewerId: string
): Promise<'unauthorized' | 'notFound' | null> {
  const [row] = await db
    .select({ userId: repertoires.userId })
    .from(repertoires)
    .where(and(eq(repertoires.id, repertoireId), isNull(repertoires.deletedAt)))
    .limit(1);
  // The fetch filters deleted rows, so this yields 'notFound' | 'unauthorized' | null.
  return guardOwnership(row, viewerId) as 'unauthorized' | 'notFound' | null;
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
