// Per-domain schema slice — shared games (公開対局).
//
// User-submitted blindfold games published for advice / study. AI games are
// otherwise client-only (localStorage); these tables are the first server-side
// persistence of a game, created only when a user chooses to publish one.
//
// Ownership model (see the feature design):
//  - Registered authors own a row via `author_id`.
//  - Account-less (anonymous) authors get a `game_tokens` row instead — a
//    hashed capability secret held client-side that lets them delete / unpublish
//    without an account, and claim the game on later sign-up. Losing the secret
//    leaves an orphan (admin-moderatable only) — accepted by design.
import { sql } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import {
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import type { EngineConfig } from '@/lib/engines';
import type { MoveOperationLog } from '@/lib/games/saved-game-types';
import { uuidv7 } from '@/lib/uuidv7';

/**
 * Games — server-persisted snapshot of a blindfold game shared by a user.
 *
 * @design Immutable snapshot
 * Once published, the game facts (`moves`, `engine_config`, `result`,
 * `operation_logs`, …) never change — they record what was played. The only
 * mutable parts are the lifecycle (`status` / `deleted_at`) and the
 * author-supplied `title` / `description`. Editable commentary lives in the
 * separate `game_annotations` / `game_comments` tables, never in this row.
 *
 * @design UUIDv7 primary key
 * `id` is a UUIDv7 (time-ordered, generated app-side via the `uuid` package),
 * used directly as the public URL identifier — there is no slug. Time-ordering
 * gives index-only keyset pagination for the gallery (`WHERE id < :cursor ORDER
 * BY id DESC`); the 74 random bits keep it unguessable enough for `unlisted`
 * link-only games despite the embedded timestamp.
 *
 * @design author_id nullable + ON DELETE SET NULL
 * Mirrors `chunks.user_id`: a registered author owns the row via `author_id`;
 * an account-less author has `author_id = NULL` and is represented instead by a
 * `game_tokens` row. If a registered author's account is hard-deleted, the FK
 * (defined Supabase-side) sets this NULL so the public catalog row survives as
 * an orphan rather than cascading away.
 *
 * @design Denormalized filter columns
 * `engine_kind` / `engine_elo` / `move_count` / `clean_rate` are derived from
 * the snapshot at publish time so the gallery can filter and sort without
 * opening the `moves` / `operation_logs` JSONB. `engine_elo` is a *unified*
 * approximate Elo (Maia rating passed through; Stockfish skill level mapped)
 * so games against both engines sort on one comparable strength axis.
 *
 * @design status / deleted_at lifecycle
 * `status` (varchar, not pgEnum, for additive extensibility like
 * `chunks.status`): `public` (default) | `unlisted` (link-only) | `hidden`
 * (author unpublished, reversible) | `removed`. `deleted_at` records a delete /
 * moderation removal (soft, audit-friendly); the public catalog excludes
 * `deleted_at IS NOT NULL` and non-`public/unlisted` rows.
 */
export const games = pgTable(
  'games',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    // references auth.users — FK defined in custom SQL (ON DELETE SET NULL).
    // NULL for account-less submissions (control via game_tokens).
    authorId: uuid('author_id'),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),

    // --- Immutable game snapshot (read as a whole → JSONB) ---
    moves: jsonb('moves').$type<string[]>().notNull(),
    startingFen: varchar('starting_fen', { length: 100 }),
    playerColor: varchar('player_color', { length: 5 }).$type<'white' | 'black'>().notNull(),
    engineConfig: jsonb('engine_config').$type<EngineConfig>().notNull(),
    /** Per-move aid counts (self-reported, client-only). Null for legacy/absent. */
    operationLogs: jsonb('operation_logs').$type<MoveOperationLog[]>(),
    result: varchar('result', { length: 4 }).$type<'win' | 'loss' | 'draw'>().notNull(),

    // --- Denormalized for gallery filter / sort ---
    engineKind: varchar('engine_kind', { length: 20 }).$type<'stockfish' | 'maia'>().notNull(),
    /** Unified approximate Elo (cross-engine comparable). */
    engineElo: integer('engine_elo').notNull(),
    moveCount: integer('move_count').notNull(),
    /** 0–100, blindfold "perf" (% of clean moves). Null when no logs. */
    cleanRate: integer('clean_rate'),

    // --- Lifecycle ---
    status: varchar('status', { length: 20 }).notNull().default('public'),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_games_author').on(table.authorId),
    // Public catalog scan: visible, non-deleted rows. id (UUIDv7) carries the
    // chronological order, so pagination keys on id rather than a created_at index.
    index('idx_games_public')
      .on(table.id.desc())
      .where(sql`deleted_at IS NULL AND status IN ('public', 'unlisted')`),
    index('idx_games_engine_elo').on(table.engineElo),
    index('idx_games_clean_rate').on(table.cleanRate),
  ]
);

export type GameRecord = typeof games.$inferSelect;
export type NewGameRecord = typeof games.$inferInsert;

/**
 * Game Tokens — capability secret for account-less game ownership.
 *
 * @design Secret isolation (separate table, not a column on `games`)
 * The hashed token is a credential. Keeping it out of the broadly-public
 * `games` row means the catalog / detail SELECTs never touch it, and RLS can
 * deny all SELECT on this table (service-role-only) while `games` stays public.
 * NOT a normalization requirement (the relation is 1:0..1) — purely security +
 * lifecycle isolation.
 *
 * @design PK = FK (1:1)
 * `game_id` is both primary key and the FK to `games`, enforcing at most one
 * token per game. On claim (anonymous → registered) the app sets
 * `games.author_id` and deletes this row; the token is then unnecessary.
 */
export const gameTokens = pgTable('game_tokens', {
  gameId: uuid('game_id')
    .primaryKey()
    .references(() => games.id, { onDelete: 'cascade' }),
  /** Hash of the client-held secret (raw token is never stored). */
  tokenHash: text('token_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type GameToken = typeof gameTokens.$inferSelect;
export type NewGameToken = typeof gameTokens.$inferInsert;

/**
 * Game Annotations — the author's own inline notes on their game's moves.
 *
 * @description
 * The artifact layer (Lichess study / Chessable-style): the game's owner
 * attaches a note and/or a glyph to specific plies, turning the game into study
 * material. Distinct from `game_comments` (third-party advice) because the
 * author may be account-less (writes authorized via `game_tokens`, not a
 * member session) and there is at most one editable annotation per move.
 *
 * @design Anchor by ply
 * `ply` is the 0-based index into `games.moves[]`. The game is immutable so ply
 * indices are stable forever; the display label ("12. Nf6") is derived from
 * `ply` + `starting_fen` at render time, never stored. `(game_id, ply)` is the
 * primary key — one annotation per move, upserted on edit.
 */
export const gameAnnotations = pgTable(
  'game_annotations',
  {
    gameId: uuid('game_id')
      .notNull()
      .references(() => games.id, { onDelete: 'cascade' }),
    ply: integer('ply').notNull(),
    note: text('note'),
    /** NAG glyph code (e.g. 1 = !, 2 = ?, 3 = !!, 4 = ??, 5 = !?, 6 = ?!). */
    glyph: smallint('glyph'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdateFn(() => new Date()),
  },
  (table) => [primaryKey({ columns: [table.gameId, table.ply] })]
);

export type GameAnnotation = typeof gameAnnotations.$inferSelect;
export type NewGameAnnotation = typeof gameAnnotations.$inferInsert;

/**
 * Game Comments — third-party advice on a shared game.
 *
 * @description
 * The social layer: members leave advice on the game as a whole (`ply IS NULL`)
 * or anchored to a specific move (`ply = N`). Writing is members-only (enforced
 * in the action); `author_id` is nullable only so a hard-deleted commenter's
 * advice survives the FK `ON DELETE SET NULL` (rendered "deleted user"),
 * matching `chunk_edit_requests.proposer_id`.
 *
 * @design Reddit-style threading (`parent_id`)
 * Replies self-reference via `parent_id` (`ON DELETE CASCADE`: hard-deleting a
 * comment drops its subtree). A reply inherits its parent's `ply` (enforced in
 * the action), so a whole move's thread shares one `ply` and the tree is built
 * per-ply on the client — the same shape `topic_posts` uses. `updated_at`
 * advances past `created_at` on an in-place edit, driving the "(edited)" label.
 * Likes reuse the generic polymorphic `likes` table (`target_type =
 * 'game_comment'`), so there is no per-comment likes table.
 *
 * Forward-compatible (additive, deferred): `glyph`, a `line` JSONB suggested
 * continuation.
 */
export const gameComments = pgTable(
  'game_comments',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    gameId: uuid('game_id')
      .notNull()
      .references(() => games.id, { onDelete: 'cascade' }),
    /** 0-based index into `games.moves[]`; NULL = whole-game comment. */
    ply: integer('ply'),
    /** Parent comment for replies; NULL for a top-level comment on the move. */
    parentId: uuid('parent_id').references((): AnyPgColumn => gameComments.id, {
      onDelete: 'cascade',
    }),
    // references auth.users — FK defined in custom SQL (ON DELETE SET NULL).
    authorId: uuid('author_id'),
    body: text('body').notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdateFn(() => new Date()),
  },
  (table) => [
    index('idx_game_comments_game_ply').on(table.gameId, table.ply),
    index('idx_game_comments_parent').on(table.parentId),
  ]
);

export type GameComment = typeof gameComments.$inferSelect;
export type NewGameComment = typeof gameComments.$inferInsert;
