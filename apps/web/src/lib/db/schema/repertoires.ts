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
import { sql } from 'drizzle-orm';
import {
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
    side: varchar('side', { length: 5 }).$type<'white' | 'black'>().notNull(),
    phase: varchar('phase', { length: 20 })
      .$type<'opening' | 'middlegame' | 'endgame'>()
      .notNull()
      .default('opening'),
    description: text('description'),
    /** Denormalised root for the card thumbnail. NULL = standard start. */
    startingFen: varchar('starting_fen', { length: 100 }),
    /**
     * Lifecycle + visibility, one value at a time:
     *
     * - `building` — the owner's workshop. Default on create. Never shown on
     *   any public listing, never matched by the kata check (a course too
     *   thin to be checked against would just manufacture false deviations),
     *   but still reachable by the owner's direct URL (soft-privacy, like
     *   `public`). One-way exit via `publishRepertoireEntry` once it has
     *   ≥1 line: publishing is the owner asserting "this is done," so there
     *   is no path back to `building` — see `publishedAt` below.
     * - `public` — catalogue content, surfaced on the opening topic pages it
     *   is linked to and viewable by anyone with the URL.
     * - `private` — planned as a paid-plan affordance (coin-gated) for hiding
     *   a *finished* course from listings without deleting it; until that
     *   ships nothing writes this value. Distinct from `building`: private
     *   content already cleared the completeness bar, it's just deliberately
     *   withheld.
     */
    status: varchar('status', { length: 20 })
      .$type<'building' | 'private' | 'public'>()
      .notNull()
      .default('building'),
    /**
     * When this course was published (`building` → `public`). NULL while
     * still `building`. The catalog sorts "newest" on this column, not
     * `created_at` — otherwise a course drafted for weeks would publish
     * straight into obscurity instead of appearing as new.
     */
    publishedAt: timestamp('published_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdateFn(() => new Date()),
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
 * Don'ts", "Introduction", …). A line may belong to one chapter or none.
 * Lifecycle follows the parent (cascade); deleting a chapter ungroups its lines
 * rather than deleting them (see `repertoire_lines.chapter_id` SET NULL).
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
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdateFn(() => new Date()),
  },
  (table) => [index('idx_repertoire_chapters_repertoire').on(table.repertoireId, table.seq)]
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
 * @design chapter_id — optional section grouping (SET NULL on chapter delete).
 *
 * @design lifecycle follows the parent — no `status`; `deleted_at` allows
 * removing a single line; the repertoire FK cascades.
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
    chapterId: uuid('chapter_id').references(() => repertoireChapters.id, {
      onDelete: 'set null',
    }),
    name: varchar('name', { length: 255 }),
    /** This single line's moves as PGN. Source of truth. */
    pgn: text('pgn').notNull(),
    /** NULL = standard start; otherwise the line's root position. */
    startingFen: varchar('starting_fen', { length: 100 }),
    seq: integer('seq').notNull().default(0),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdateFn(() => new Date()),
  },
  (table) => [index('idx_repertoire_lines_repertoire').on(table.repertoireId, table.seq)]
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
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdateFn(() => new Date()),
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
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdateFn(() => new Date()),
  },
  (table) => [unique('uq_repertoire_annotation').on(table.repertoireId, table.positionKey)]
);

export type RepertoireAnnotation = typeof repertoireAnnotations.$inferSelect;
export type NewRepertoireAnnotation = typeof repertoireAnnotations.$inferInsert;
