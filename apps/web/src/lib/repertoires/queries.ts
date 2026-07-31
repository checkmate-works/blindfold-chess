import { and, asc, count, desc, eq, inArray, isNull, ne } from 'drizzle-orm';

import type { Repertoire, RepertoireLine } from '@/lib/db';
import {
  AUTHOR_PROFILE_COLUMNS,
  chessOpenings,
  db,
  likes,
  liveProfileJoinOn,
  profiles,
  repertoireChapters,
  repertoireOpenings,
  repertoires,
} from '@/lib/db';
import { repertoireLines } from '@/lib/db';
import { countRows, runPaginatedSelect } from '@/lib/db/list-query';
import { guardOwnership } from '@/lib/ownership-guard';
import { isFollowing } from '@/lib/social/follows';

/**
 * The repertoire-wide display order of lines: chapter by chapter, then within
 * each chapter. `repertoire_lines.seq` is scoped to the chapter (see its
 * schema TSDoc), so ordering by it alone would interleave chapters.
 *
 * Requires a LEFT JOIN onto `repertoire_chapters`. Unfiled lines join to NULL
 * and land last for free — Postgres sorts NULLS LAST under ASC, which is
 * exactly where the unfiled bucket belongs.
 */
export const linesInDisplayOrder = [asc(repertoireChapters.seq), asc(repertoireLines.seq)] as const;

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
 * Live repertoires visible to everyone.
 *
 * Filters on `status = 'public'` even though nothing writes that column today
 * (every repertoire is public by default): the paid-plan "make private" toggle
 * then becomes a UI change with no query to revisit — and, more importantly, a
 * repertoire that IS private must never appear in a public listing.
 */
function publicRepertoiresOnly() {
  return and(eq(repertoires.status, 'public'), isNull(repertoires.deletedAt));
}

/** {@link publicRepertoiresOnly}, optionally narrowed to one side (catalog filter). */
function publicRepertoiresForSide(side?: 'white' | 'black') {
  return side ? and(eq(repertoires.side, side), publicRepertoiresOnly()) : publicRepertoiresOnly();
}

/** {@link publicRepertoiresOnly} narrowed to repertoires linked to one opening. */
function publicRepertoiresForOpening(openingSlug: string) {
  return and(eq(chessOpenings.slug, openingSlug), publicRepertoiresOnly());
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
        ? [desc(likeCount), desc(repertoires.publishedAt)]
        : [desc(repertoires.publishedAt)])
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
 * Every live public repertoire, newest-published first — the /repertoires
 * catalog.
 *
 * Repertoires are UGC surfaced to everyone (the feature is concealed only by
 * not being linked from global nav yet, not by being private), so this powers
 * the signed-out-visible catalog. Filters on `status = 'public'` — this
 * excludes `building` (not yet ready to show) for free, and a future
 * "make private" toggle must never leak a private course here either. Sorts
 * on `published_at`, not `created_at`: a course can sit in `building` for a
 * while before publishing, and should read as new when it finally does.
 */
export async function listPublicRepertoires(
  limit: number,
  offset: number,
  side?: 'white' | 'black'
): Promise<RepertoireWithProfile[]> {
  const rows = await runPaginatedSelect(
    db
      .select(REPERTOIRE_CARD_COLUMNS)
      .from(repertoires)
      .leftJoin(profiles, liveProfileJoinOn(repertoires.userId))
      .$dynamic(),
    {
      where: publicRepertoiresForSide(side),
      orderBy: [desc(repertoires.publishedAt)],
      limit,
      offset,
    }
  );

  return toCards(rows);
}

/** Total live public repertoires (optionally for one side) — pagination denominator. */
export async function countPublicRepertoires(side?: 'white' | 'black'): Promise<number> {
  return countRows(repertoires, publicRepertoiresForSide(side));
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
 * A user's own `building` repertoires, newest first — never public (excluded
 * from every catalog query above), so this is their only listing surface
 * short of the direct detail URL. Powers the owner-only "in progress" section
 * on /repertoires.
 */
export async function listBuildingRepertoiresForUser(
  userId: string
): Promise<RepertoireWithProfile[]> {
  const rows = await db
    .select(REPERTOIRE_CARD_COLUMNS)
    .from(repertoires)
    .leftJoin(profiles, liveProfileJoinOn(repertoires.userId))
    .where(
      and(
        eq(repertoires.userId, userId),
        eq(repertoires.status, 'building'),
        isNull(repertoires.deletedAt)
      )
    )
    .orderBy(desc(repertoires.createdAt));

  return toCards(rows);
}

/**
 * A user's live repertoires for one side, each with its live lines — the kata
 * check's input (a game is only compared against repertoires prepared for the
 * colour the player actually held). Excludes `building` repertoires: a course
 * still being assembled is too thin to check a game against without
 * manufacturing false deviations. `private` is included on purpose — see
 * {@link getRepertoireCheckReport}, this is an owner-scoped lookup, never
 * another user's repertoires, so visibility is irrelevant here.
 */
export async function listRepertoiresWithLinesForSide(
  userId: string,
  side: 'white' | 'black'
): Promise<{ repertoire: Repertoire; lines: RepertoireLine[] }[]> {
  const reps = await db
    .select()
    .from(repertoires)
    .where(
      and(
        eq(repertoires.userId, userId),
        eq(repertoires.side, side),
        ne(repertoires.status, 'building'),
        isNull(repertoires.deletedAt)
      )
    )
    .orderBy(desc(repertoires.createdAt));
  if (reps.length === 0) return [];

  const allLines = (
    await db
      .select({ line: repertoireLines })
      .from(repertoireLines)
      .leftJoin(repertoireChapters, eq(repertoireChapters.id, repertoireLines.chapterId))
      .where(
        and(
          inArray(
            repertoireLines.repertoireId,
            reps.map((r) => r.id)
          ),
          isNull(repertoireLines.deletedAt)
        )
      )
      .orderBy(...linesInDisplayOrder)
  ).map((row) => row.line);

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
 * The read-path visibility gate (see {@link getRepertoireForViewer}). `public`
 * is open to everyone; `followers_only` additionally admits a viewer who
 * follows the (live) author; `private` and `building` are owner-only. The owner
 * always sees their own course regardless of tier.
 */
async function canViewRepertoire(
  repertoire: Repertoire,
  viewerId: string | null,
  isOwner: boolean
): Promise<boolean> {
  if (isOwner) return true;
  if (repertoire.status === 'public') return true;
  if (repertoire.status === 'followers_only') {
    // A SET-NULL author (deleted account) leaves nobody to follow → hidden.
    return repertoire.userId != null && (await isFollowing(viewerId, repertoire.userId));
  }
  // 'private' | 'building' — owner only, and isOwner was already false here.
  return false;
}

/**
 * A single repertoire with its lines + author profile, for the public-facing
 * detail / line pages.
 *
 * @design Visibility is a HARD gate (coin-gated privacy)
 *
 * `public` is viewable by anyone; the coin-gated tiers are enforced here, not
 * merely hidden from listings:
 *   - `followers_only` → owner, or a viewer who follows the author
 *   - `private` / `building` → owner only
 * A viewer who fails the gate gets `null` (→ 404), same as a missing/deleted
 * repertoire — the content and its lines never leave the server. This is a
 * deliberate departure from the repertoire's original soft-privacy model: once
 * a user pays coins to make a course followers-only or private, URL knowledge
 * alone must not defeat it. The `isOwner` flag still gates owner-only
 * affordances (delete, annotate, publish, change visibility).
 *
 * `viewerId` is null for anonymous visitors.
 */
export async function getRepertoireForViewer(
  id: string,
  viewerId: string | null
): Promise<RepertoireForViewer | null> {
  // Same live-author LEFT JOIN as the catalog lists, so the detail page shows
  // (or hides) a deleted author exactly like the cards that link to it.
  const [row]: RepertoireCardRow[] = await db
    .select(REPERTOIRE_CARD_COLUMNS)
    .from(repertoires)
    .leftJoin(profiles, liveProfileJoinOn(repertoires.userId))
    .where(and(eq(repertoires.id, id), isNull(repertoires.deletedAt)))
    .limit(1);
  if (!row) return null;
  const { repertoire } = row;

  const isOwner = viewerId != null && repertoire.userId === viewerId;

  if (!(await canViewRepertoire(repertoire, viewerId, isOwner))) return null;

  const lines = (
    await db
      .select({ line: repertoireLines })
      .from(repertoireLines)
      .leftJoin(repertoireChapters, eq(repertoireChapters.id, repertoireLines.chapterId))
      .where(
        and(eq(repertoireLines.repertoireId, repertoire.id), isNull(repertoireLines.deletedAt))
      )
      .orderBy(...linesInDisplayOrder)
  ).map((row) => row.line);

  // A left join on a deleted author yields a row of nulls, not no row.
  const profile = row.profile?.username ? row.profile : null;

  return { repertoire, lines, profile, isOwner };
}

/**
 * A single line of a viewable repertoire, addressed by its stable `line_no`.
 * Wraps `getRepertoireForViewer` + the lookup the line detail and edit pages
 * both did inline. Returns null when the repertoire isn't visible or the line
 * doesn't exist.
 *
 * `lines` carries the repertoire's full (seq-ordered) line set alongside the
 * addressed one, so the line detail page can render the same line-switching
 * list the repertoire page has without a second round-trip — the underlying
 * query already fetched them.
 */
export async function getRepertoireLineForViewer(
  id: string,
  lineNo: number,
  viewerId: string | null
): Promise<{
  repertoire: Repertoire;
  line: RepertoireLine;
  lines: RepertoireLine[];
  /** The repertoire author's live profile (null for anon/deleted), so the line
   *  page can show the same "Created by" attribution the detail page does. */
  profile: RepertoireAuthorProfile | null;
  isOwner: boolean;
} | null> {
  const data = await getRepertoireForViewer(id, viewerId);
  if (!data) return null;
  const line = data.lines.find((l) => l.lineNo === lineNo);
  if (!line) return null;
  return {
    repertoire: data.repertoire,
    line,
    lines: data.lines,
    profile: data.profile,
    isOwner: data.isOwner,
  };
}

/**
 * A repertoire's chapters in display order — the headings the arrange page
 * lays out between the lines. Not folded into {@link getRepertoireForViewer}:
 * every page loads that, and only this one needs the headings themselves (the
 * others need chapters solely to ORDER the lines, which the join already does).
 */
export async function listChaptersForRepertoire(
  repertoireId: string
): Promise<{ id: string; name: string }[]> {
  return db
    .select({ id: repertoireChapters.id, name: repertoireChapters.name })
    .from(repertoireChapters)
    .where(eq(repertoireChapters.repertoireId, repertoireId))
    .orderBy(asc(repertoireChapters.seq));
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
