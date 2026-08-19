// Per-domain schema slice — repertoires (型 / Kata): a Chessable-style course,
// its chapters and lines, opening links, and the per-user learning loop
// (spaced-repetition reviews, deviations from real games, annotations).
//
// Layers:
//   repertoires          — the course (name, side, phase, status). The list card.
//   repertoire_chapters   — optional Chessable-style section grouping for lines.
//   repertoire_lines      — one row per line (variation). Source of truth; the
//                           repertoire tree is reconstructed by merging them.
//   repertoire_openings   — n:n link to the `chess_openings` master.
//
// The learning loop keys on POSITION, not line — both Chessable and Chessbook
// drill/score/annotate per position, which dedupes transpositions and shared
// prefixes AND survives line re-import (positions persist even when line rows
// are regenerated). `position_key` is the normalised FEN (placement, side,
// castling, en passant) — the same key the deviation matcher uses.
//   repertoire_reviews    — per-user spaced-repetition state (FSRS-shaped).
//   repertoire_deviations — mistakes found in finished games → the review queue.
//   repertoire_annotations— owner-authored "why" note per position.
import type { Side } from '@blindfold-chess/types';
import { sql } from 'drizzle-orm';
import {
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { EMPTY_BOARD_ANNOTATIONS } from '@/lib/board-annotations/types';
import type { BoardAnnotations } from '@/lib/board-annotations/types';
import { uuidv7 } from '@/lib/uuidv7';

import { chunks } from './chunks';
import { createdAtOnly, softDeleteTimestamp, timestamps } from './columns';
import { chessOpenings } from './openings';

/**
 * Repertoires — a user-owned course (型 / Kata). The unit shown on the /repertoires
 * list and the target of repertoire-level likes/comments.
 *
 * @design Lines are the source of truth (no canonical PGN here)
 *
 * The repertoire row holds only course metadata; the moves live in
 * `repertoire_lines`. The branching tree (for deviation matching / a tree view)
 * is reconstructed by merging the lines on read. `starting_fen` is denormalised
 * purely so the list card can render the root without joining the lines.
 *
 * @design phase — exclusive game-phase category
 *
 * Every repertoire is exactly one of opening / middlegame / endgame. varchar
 * (not pgEnum) for additive extensibility, matching `games.status`.
 *
 * @design UUIDv7 id, nullable user_id (SET NULL), status, deleted_at — same
 * lifecycle shape as `games`.
 */
export const repertoires = pgTable(
  'repertoires',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    // references auth.users — FK + RLS in custom SQL (ON DELETE SET NULL).
    userId: uuid('user_id'),
    name: varchar('name', { length: 255 }).notNull(),
    side: varchar('side', { length: 5 }).$type<Side>().notNull(),
    phase: varchar('phase', { length: 20 })
      .$type<'opening' | 'middlegame' | 'endgame'>()
      .notNull()
      .default('opening'),
    description: text('description'),
    /** Denormalised root for the card thumbnail. NULL = standard start. */
    startingFen: varchar('starting_fen', { length: 100 }),
    /**
     * Lifecycle + visibility, one value at a time. `building` is a lifecycle
     * state; the other three are the coin-gated visibility tiers (the
     * `RepertoireVisibility` union in `@/lib/points`):
     *
     * - `building` — the owner's workshop. Default on the row insert, but the
     *   /new create-and-publish flow overwrites it to the chosen visibility in
     *   the same transaction, so a course only lingers here if some path
     *   creates it empty. Never listed, never matched by the kata check (a
     *   course too thin to check would manufacture false deviations); owner-only
     *   at the read path.
     * - `public` — free (the default choice). Catalogue content, surfaced on
     *   the opening topic pages it is linked to and viewable by anyone.
     * - `followers_only` — coin-gated. Listed nowhere public; at the read path
     *   viewable only by the owner and users who follow them (`user_follows`).
     * - `private` — coin-gated. Owner-only everywhere, including the direct URL.
     *
     * Unlike `building`, visibility is NOT one-way: the owner can move a course
     * among public / followers_only / private freely (see
     * `changeRepertoireVisibility`). Coins are charged only the first time a
     * paid tier is unlocked (increment above the highest tier ever paid), so
     * flipping back and forth is free once unlocked. `publishedAt` is stamped
     * on the first move out of `building` and left as-is thereafter.
     *
     * NOTE the read path enforces these tiers as a HARD gate (private/followers
     * return 404 to non-viewers) — a departure from the pre-existing
     * soft-privacy model where any status was URL-reachable. Every listing
     * query already filters `status = 'public'`, so followers_only / private
     * are excluded from public catalogs for free.
     */
    status: varchar('status', { length: 20 })
      .$type<'building' | 'private' | 'followers_only' | 'public'>()
      .notNull()
      .default('building'),
    /**
     * When this course was published (`building` → `public`). NULL while
     * still `building`. The catalog sorts "newest" on this column, not
     * `created_at` — otherwise a course drafted for weeks would publish
     * straight into obscurity instead of appearing as new.
     */
    publishedAt: timestamp('published_at', { withTimezone: true }),
    ...softDeleteTimestamp,
    ...timestamps,
  },
  (table) => [
    index('idx_repertoires_user').on(table.userId, table.createdAt),
    // Sorted on published_at (not id) so the catalog's "newest" ordering
    // matches what listPublicRepertoires actually queries — id (UUIDv7) only
    // tracks creation order, which diverges from publish order once a course
    // can sit in `building` for a while before publishing.
    index('idx_repertoires_public')
      .on(table.publishedAt.desc())
      .where(sql`deleted_at IS NULL AND status = 'public'`),
  ]
);

export type Repertoire = typeof repertoires.$inferSelect;
export type NewRepertoire = typeof repertoires.$inferInsert;

/**
 * Repertoire Chapters — optional Chessable-style section grouping ("Do's and
 * Don'ts", "Introduction", …). A line may belong to one chapter or none;
 * the lines belonging to none are the "unfiled" bucket, which sorts after
 * every chapter. Lifecycle follows the parent (cascade).
 *
 * @design No stable number, unlike `repertoire_lines.line_no`
 *
 * A chapter is addressed by its `id` and has no URL of its own — nothing
 * outside this table ever names a chapter by position — so `seq` here is pure
 * ordering with none of the identity duty that forced the line_no split. Give a
 * chapter its own route and that stops being true; add a stable number then,
 * don't reuse `seq`.
 *
 * @design Deleting a chapter ungroups its lines, in the mutation, not the FK
 *
 * The obvious spelling is `ON DELETE SET NULL` on `repertoire_lines.chapter_id`,
 * and that is what this was until chapters were first used. It cannot survive
 * the composite FK that keeps a line and its chapter in the same repertoire:
 * that FK spans `(chapter_id, repertoire_id)`, and a plain SET NULL would try to
 * null `repertoire_id` too, which is NOT NULL. Postgres 15+ can say
 * `SET NULL (chapter_id)`, but drizzle-kit cannot express the column list, so
 * the generated snapshot would disagree with the database forever.
 *
 * So the FK is left at NO ACTION and `deleteRepertoireChapter` clears its
 * lines' `chapter_id` first, in the same transaction. The behaviour is
 * unchanged; it is just written where it can be read and tested.
 */
export const repertoireChapters = pgTable(
  'repertoire_chapters',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    repertoireId: uuid('repertoire_id')
      .notNull()
      .references(() => repertoires.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    seq: integer('seq').notNull().default(0),
    ...timestamps,
  },
  (table) => [
    index('idx_repertoire_chapters_repertoire').on(table.repertoireId, table.seq),
    // Redundant on its own (`id` is already the PK) — it exists so
    // `repertoire_lines` can point a composite FK at it. See below.
    unique('uq_repertoire_chapter_scope').on(table.id, table.repertoireId),
  ]
);

export type RepertoireChapter = typeof repertoireChapters.$inferSelect;
export type NewRepertoireChapter = typeof repertoireChapters.$inferInsert;

/**
 * Repertoire Lines — one row per line (variation / left-menu item). Source of
 * truth for the moves; the repertoire's tree is the merge of its lines.
 *
 * @design name — authored label, not derivable (Chessable line names). NULL
 * right after a bulk PGN import, before the user names the line.
 *
 * @design chapter_id — optional section grouping; NULL is the "unfiled" bucket,
 * which sorts after every chapter. The FK is composite —
 * `(chapter_id, repertoire_id)` — so a line can only be filed under a chapter of
 * its OWN repertoire; the single-column version let a bug or a forged request
 * file a line under another course's chapter. See the chapter table's `@design`
 * note for why it is NO ACTION rather than SET NULL.
 *
 * @design lifecycle follows the parent — no `status`; `deleted_at` allows
 * removing a single line; the repertoire FK cascades.
 *
 * @design line_no vs seq — identity and order are separate columns
 *
 * `line_no` is WHICH line ("Line 3", `/repertoires/{id}/lines/3`); `seq` is
 * WHERE it sits in the list. They were one column until 2026-07-31, when `seq`
 * did both jobs (`lineNo = seq + 1`), which made the two things it means
 * mutually exclusive: any reordering renamed every line's URL, and a delete
 * repacking `seq` to stay gapless silently moved every later line's URL onto a
 * different line.
 *
 * So: `line_no` is assigned once at insert (`max(line_no) + 1` over ALL rows of
 * the repertoire, soft-deleted included) and never rewritten — numbers are not
 * dense, not reused after a delete, and a deleted line's URL stays a 404 rather
 * than resolving to whichever line shuffled into its place. `seq` is free to be
 * rewritten by a reorder and carries no meaning outside `ORDER BY`.
 *
 * Neither column addresses content — annotations and per-move comment threads
 * are keyed by normalised FEN (see `repertoire_annotations.position_key` and
 * `move-topic-key.ts`), so reordering, renumbering, and re-importing all leave
 * the discussion attached to the position it is about.
 */
export const repertoireLines = pgTable(
  'repertoire_lines',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    repertoireId: uuid('repertoire_id')
      .notNull()
      .references(() => repertoires.id, { onDelete: 'cascade' }),
    chapterId: uuid('chapter_id'),
    name: varchar('name', { length: 255 }),
    /** This single line's moves as PGN. Source of truth. */
    pgn: text('pgn').notNull(),
    /** NULL = standard start; otherwise the line's root position. */
    startingFen: varchar('starting_fen', { length: 100 }),
    /**
     * Stable 1-based identity within the repertoire — the "Line N" label and
     * the `[lineNo]` URL segment. Immutable once assigned; see the `@design`
     * note above for why this is not `seq + 1`.
     */
    lineNo: integer('line_no').notNull(),
    /**
     * Display order WITHIN this line's chapter (0-based); the unfiled lines
     * (`chapter_id IS NULL`) form their own bucket with its own 0-based run.
     * Rewritten by a reorder. Repertoire-wide order is therefore
     * `(chapter.seq NULLS LAST, line.seq)` — never `line.seq` alone.
     *
     * It was repertoire-wide until chapters shipped; no migration was needed
     * because every line was unfiled at that point, so the existing values were
     * already "the order within the unfiled bucket".
     */
    seq: integer('seq').notNull().default(0),
    ...softDeleteTimestamp,
    ...timestamps,
  },
  (table) => [
    index('idx_repertoire_lines_repertoire').on(table.repertoireId, table.chapterId, table.seq),
    // Covers soft-deleted rows too: a retired number must never be handed to a
    // new line, or an old URL would silently resolve to different moves.
    unique('uq_repertoire_line_no').on(table.repertoireId, table.lineNo),
    foreignKey({
      columns: [table.chapterId, table.repertoireId],
      foreignColumns: [repertoireChapters.id, repertoireChapters.repertoireId],
      name: 'fk_repertoire_lines_chapter_scope',
    }),
  ]
);

export type RepertoireLine = typeof repertoireLines.$inferSelect;
export type NewRepertoireLine = typeof repertoireLines.$inferInsert;

/**
 * Repertoire ↔ Opening links (n:n with the `chess_openings` master).
 *
 * @design Junction table, not a nullable FK on `repertoires`: "no link = no
 * row" (zero NULLs), and it scales to 0 / 1 / many openings (a transposing
 * English that becomes a QGD or Reversed Sicilian maps to several). To restrict
 * to one opening per repertoire later, add `UNIQUE(repertoire_id)` — the table
 * shape stays the same. `opening_id` is ON DELETE RESTRICT (admin master data).
 */
export const repertoireOpenings = pgTable(
  'repertoire_openings',
  {
    repertoireId: uuid('repertoire_id')
      .notNull()
      .references(() => repertoires.id, { onDelete: 'cascade' }),
    openingId: uuid('opening_id')
      .notNull()
      .references(() => chessOpenings.id, { onDelete: 'restrict' }),
  },
  (table) => [
    primaryKey({ columns: [table.repertoireId, table.openingId] }),
    index('idx_repertoire_openings_opening').on(table.openingId),
  ]
);

export type RepertoireOpening = typeof repertoireOpenings.$inferSelect;
export type NewRepertoireOpening = typeof repertoireOpenings.$inferInsert;

/**
 * Repertoire Reviews — per-user spaced-repetition state, keyed by position.
 *
 * @design Position-keyed (FSRS-shaped)
 *
 * One row per (user, repertoire, position) decision point the user must recall
 * — `position_key` is the normalised FEN before the user's move. Keying on the
 * position (not the line) dedupes transpositions / shared prefixes and survives
 * line re-import. Fields mirror FSRS (`stability`/`difficulty`/`state`) but are
 * scheduler-agnostic; `user_id` FK to auth.users (ON DELETE CASCADE) is in
 * custom SQL — review state is meaningless without its owner.
 */
export const repertoireReviews = pgTable(
  'repertoire_reviews',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    // references auth.users — FK + RLS in custom SQL (ON DELETE CASCADE).
    userId: uuid('user_id').notNull(),
    repertoireId: uuid('repertoire_id')
      .notNull()
      .references(() => repertoires.id, { onDelete: 'cascade' }),
    positionKey: varchar('position_key', { length: 100 }).notNull(),
    /** Scheduler lifecycle: new | learning | review | relearning. */
    state: varchar('state', { length: 20 }).notNull().default('new'),
    /** FSRS memory state; NULL until first graded. */
    stability: real('stability'),
    difficulty: real('difficulty'),
    dueAt: timestamp('due_at', { withTimezone: true }),
    lastReviewedAt: timestamp('last_reviewed_at', { withTimezone: true }),
    reps: integer('reps').notNull().default(0),
    lapses: integer('lapses').notNull().default(0),
    ...timestamps,
  },
  (table) => [
    unique('uq_repertoire_review').on(table.userId, table.repertoireId, table.positionKey),
    // The "due now" queue.
    index('idx_repertoire_reviews_due').on(table.userId, table.dueAt),
  ]
);

export type RepertoireReview = typeof repertoireReviews.$inferSelect;
export type NewRepertoireReview = typeof repertoireReviews.$inferInsert;

/**
 * Repertoire Deviations — mistakes a user made in a finished game, relative to
 * one of their repertoires (the post-game correction loop; Chessbook's "find
 * mistakes in your online games").
 *
 * @design The bridge from `matchGameToLine` to the review queue
 *
 * Recorded at the position where the player left their own line. `game_id` is a
 * LOOSE reference (nullable, NO FK) because a finished game is often client-only
 * (localStorage) and never published to `games`. `user_id` FK to auth.users
 * (ON DELETE CASCADE) is in custom SQL.
 */
export const repertoireDeviations = pgTable(
  'repertoire_deviations',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    // references auth.users — FK + RLS in custom SQL (ON DELETE CASCADE).
    userId: uuid('user_id').notNull(),
    repertoireId: uuid('repertoire_id')
      .notNull()
      .references(() => repertoires.id, { onDelete: 'cascade' }),
    /** Loose reference to the source game (may be client-only) — no FK. */
    gameId: uuid('game_id'),
    positionKey: varchar('position_key', { length: 100 }).notNull(),
    ply: integer('ply').notNull(),
    playedMove: varchar('played_move', { length: 16 }).notNull(),
    expectedMoves: jsonb('expected_moves').$type<string[]>().notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_repertoire_deviations_user').on(table.userId, table.repertoireId),
    index('idx_repertoire_deviations_open').on(table.userId, table.resolvedAt),
  ]
);

export type RepertoireDeviation = typeof repertoireDeviations.$inferSelect;
export type NewRepertoireDeviation = typeof repertoireDeviations.$inferInsert;

/**
 * Repertoire Annotations — the owner-authored explanation of a position (the
 * Chessable right-panel content): a "why this move" note and/or the board
 * markup drawn over it. Content, not social discussion — that is `topic_posts`.
 * Position-keyed so it is shared across the lines / transpositions that reach
 * the position and survives line re-import. One row per (repertoire, position).
 *
 * @design text and shapes share one row
 *
 * Both answer the same question ("what should I see here?") and are keyed
 * identically, so a second table would only add a join and a second owner
 * check. Either half may be empty — `text` defaults to '' and `shapes` to the
 * empty annotation object — and the write paths delete the row once both are
 * empty, so an untouched position has no row at all.
 */
export const repertoireAnnotations = pgTable(
  'repertoire_annotations',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    repertoireId: uuid('repertoire_id')
      .notNull()
      .references(() => repertoires.id, { onDelete: 'cascade' }),
    positionKey: varchar('position_key', { length: 100 }).notNull(),
    text: text('text').notNull().default(''),
    /**
     * Display-only board markup (arrows + circles) drawn over the position —
     * the same value object the chunks / glossary boards store, inline JSONB
     * for the same reason (no independent identity, edit replaces the whole
     * object). See `apps/web/src/lib/board-annotations/types.ts`.
     */
    shapes: jsonb('shapes').$type<BoardAnnotations>().notNull().default(EMPTY_BOARD_ANNOTATIONS),
    ...timestamps,
  },
  (table) => [unique('uq_repertoire_annotation').on(table.repertoireId, table.positionKey)]
);

export type RepertoireAnnotation = typeof repertoireAnnotations.$inferSelect;
export type NewRepertoireAnnotation = typeof repertoireAnnotations.$inferInsert;

/**
 * Repertoire Chunks — community-suggested chunk (piece-coordination pattern)
 * links on a POSITION of a repertoire (型).
 *
 * Mirrors `game_chunks` (see its TSDoc for the suggestion-layer design: any
 * member links, no owner veto, dedup via unique constraint) but is keyed by
 * `position_key` (normalised FEN, same as `repertoire_annotations`) instead of
 * a ply — so one link surfaces on every line that reaches the position
 * (transpositions, shared prefixes) and survives line reorder / re-import.
 *
 * @design position_key is SERVER-DERIVED, never client-supplied
 * Unlike `game_chunks.ply` (a mere index that renders nowhere if bogus),
 * `position_key` is content. The write path derives it from
 * (repertoireId, lineNo, ply) by replaying the line server-side, which
 * simultaneously validates that the position is actually reachable in the
 * repertoire and that the caller may view it. See
 * `lines/[lineNo]/_actions/repertoire-chunks.ts`.
 *
 * @design ON DELETE RESTRICT on chunk_id — mirrors `position_chunks` /
 * `game_chunks`: a referenced chunk cannot be hard-deleted (service-role
 * only path anyway). Repertoire cascade drops its links. Rows whose
 * position is no longer reached by any live line simply stop rendering
 * (display is computed from current lines) — same as orphaned
 * `repertoire_move` comment threads; they are not garbage-collected.
 *
 * @design the reverse link (chunk page → kata) lists PUBLIC courses only.
 * Repertoires have `building`/`private`/`followers_only` visibility tiers a
 * game doesn't, so an *unconditional* backlink list would leak the existence
 * of a non-public course to anyone who can view the chunk. Filtering the
 * list to `status = 'public'` (see `listRepertoiresLinkingChunk`) removes
 * the leak entirely — the list is viewer-independent, like the Games tab's
 * `publiclyVisible()` rule. The trade-off: a member who links a chunk to
 * their own private course cannot reach that course from the chunk page
 * (only from the course side); showing viewer-visible non-public rows would
 * need a per-viewer `canViewRepertoire`-equivalent predicate plus an
 * unmistakable "only you can see this" marker, and is deliberately not done
 * until wanted. Note `countChunkReferences` counts links in ALL live
 * courses (it warns the chunk's owner about renames, where a private
 * course's link is just as real), so its count can exceed the tab's.
 */
export const repertoireChunks = pgTable(
  'repertoire_chunks',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    repertoireId: uuid('repertoire_id')
      .notNull()
      .references(() => repertoires.id, { onDelete: 'cascade' }),
    /** Normalised FEN (first four fields — `toPositionKey`), server-derived. */
    positionKey: varchar('position_key', { length: 100 }).notNull(),
    chunkId: uuid('chunk_id')
      .notNull()
      .references(() => chunks.id, { onDelete: 'restrict' }),
    // references auth.users — FK defined in custom SQL (ON DELETE SET NULL).
    suggestedById: uuid('suggested_by_id'),
    ...createdAtOnly,
  },
  (table) => [
    // One link per (repertoire, position, chunk); a repeat link is a no-op
    // (`already_linked`), not a duplicate. Leading (repertoire_id) prefix
    // also serves the per-repertoire fetch, so no separate index needed.
    unique('uq_repertoire_chunks').on(table.repertoireId, table.positionKey, table.chunkId),
    // For the ON DELETE RESTRICT reference check on chunks.
    index('idx_repertoire_chunks_chunk').on(table.chunkId),
  ]
);

export type RepertoireChunk = typeof repertoireChunks.$inferSelect;
export type NewRepertoireChunk = typeof repertoireChunks.$inferInsert;
