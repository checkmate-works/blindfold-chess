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
import type { Side } from '@blindfold-chess/types';
import { sql } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import type { EngineConfig } from '@/lib/engines';
import type {
  GamePlaySettings,
  MoveOperationLog,
  OperationTotals,
  PlaySettingsChangeEntry,
  UndoneMoveLog,
} from '@/lib/games/saved-game-types';
import { uuidv7 } from '@/lib/uuidv7';

import { chunks } from './chunks';

/**
 * Games — server-persisted snapshot of a blindfold game shared by a user.
 *
 * @design Immutable snapshot
 * Once published, the game facts (`moves`, `engine_config`, `result`,
 * `operation_logs`, …) never change — they record what was played. The only
 * mutable parts are the lifecycle (`status` / `deleted_at`) and the
 * author-supplied `title` / `description`. Editable commentary lives in the
 * separate `game_comments` table, never in this row.
 *
 * @design UUIDv7 primary key
 * `id` is a UUIDv7 (time-ordered, generated app-side via the `uuid` package),
 * used directly as the public URL identifier — there is no slug. Time-ordering
 * gives index-only keyset pagination for the gallery (`WHERE id < :cursor ORDER
 * BY id DESC`); the 74 random bits keep ids unguessable (not enumerable from
 * the embedded timestamp), which matters for the planned owner-only `private`
 * tier and for link safety generally.
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
 * @design status / deleted_at lifecycle (two orthogonal axes)
 * `status` (varchar, not pgEnum, for additive extensibility like
 * `chunks.status`) is the author/visibility tier: `public` (default) |
 * `private` (非公開 — owner-only). `private` is a planned paid-member feature,
 * so nothing transitions a game into it yet; the column exists now only so the
 * value set never needs a later migration.
 * `deleted_at` is the orthogonal deletion / moderation tombstone (soft,
 * audit-friendly). The public catalog requires `deleted_at IS NULL AND status =
 * 'public'`. Deletion stamps `deleted_at` ONLY (status is left as-is), so the
 * two axes never overlap and "why is this row hidden?" has one answer each.
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
    /**
     * How many leading entries of `moves` were pre-played at setup (an opening
     * line or a pasted PGN) rather than played by the author. Together with
     * `starting_fen` this reconstructs the position the game actually started
     * from — `starting_fen` alone cannot, because opening/PGN starts keep the
     * standard start and seed `moves` instead. Also the offset aligning
     * `operation_logs` (one entry per in-session player move) with `moves`.
     * Null for legacy rows and plain standard-start games (no prefix).
     */
    setupPlies: integer('setup_plies'),
    playerColor: varchar('player_color', { length: 5 }).$type<Side>().notNull(),
    engineConfig: jsonb('engine_config').$type<EngineConfig>().notNull(),
    /** Per-move aid counts (self-reported, client-only). Null for legacy/absent. */
    operationLogs: jsonb('operation_logs').$type<MoveOperationLog[]>(),
    /**
     * Monotonic game-lifetime aid counters ({@link OperationTotals}). Unlike
     * `operation_logs` — whose entries are deleted when a move is undone —
     * these only ever increase during play, so peek → undo → replay cannot
     * launder the peek count (issue #95). The 1dan hidden-board evaluator
     * reads `peeks` from here; rows without it (published before this
     * column) fall back to the per-move sums and fail closed on any undo.
     * Self-reported like the rest of the snapshot. Null for legacy rows.
     */
    operationTotals: jsonb('operation_totals').$type<OperationTotals>(),
    /**
     * Per-move log records discarded by Undo / restart-from-position
     * ({@link UndoneMoveLog}), archived at the moment of the rollback so
     * "undo = the move never happened" applies only to the display log —
     * the audit record keeps what was tried (notably rejected SAN texts,
     * which `operation_totals` counts but cannot reconstruct). Capped and
     * re-bounded at publish. Null for legacy rows and rollback-free games.
     */
    undoneLogs: jsonb('undone_logs').$type<UndoneMoveLog[]>(),
    /**
     * Blindfold difficulty snapshot captured at game start (board visibility,
     * which side was hidden, piece shape / color) — the validated
     * `GamePlaySettings` subset. JSONB so the shape can evolve without a
     * migration. Null for legacy games and games published before this column.
     */
    playSettings: jsonb('play_settings').$type<GamePlaySettings>(),
    /**
     * Timeline of mid-game edits to the display-relevant blindfold settings
     * (the validated {@link PlaySettingsChangeEntry} subset). Folded over
     * `play_settings` per position so the replay shows what the player saw at
     * each move, not only at game start. JSONB so the shape can evolve without
     * a migration. Null when the player never changed settings mid-game (the
     * common case) and for games published before this column.
     */
    playSettingsLog: jsonb('play_settings_log').$type<PlaySettingsChangeEntry[]>(),
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
      .where(sql`deleted_at IS NULL AND status = 'public'`),
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
    /**
     * 0-based index into `games.moves[]`; NULL anchors the comment to the game
     * as a whole. NULL deliberately carries two readings that share one thread
     * (shown on the review's opening board): "about the whole game" and, for a
     * custom-FEN / seeded-prefix game, "about the start position" — the UI
     * swaps the thread's heading on that distinction (see `GameReview`) rather
     * than minting a second anchor value, because a commenter can't
     * meaningfully be asked to pick between the two.
     */
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

/**
 * Game Chunks — community-suggested chunk (piece-coordination pattern) links
 * on a specific move of a shared game.
 *
 * @description
 * The "this position applies this chunk" layer: any signed-in member can link a
 * published `chunks` row to a move (`ply`), tagging the game with known
 * patterns. Mirrors `position_chunks` (the position↔chunk junction) but adds
 * `ply` (the move it applies to) and `suggested_by_id` (who linked it, for
 * attribution + own-removal). Unlike an overlay, the chunk's own board is the
 * reference — the link is an assertion, not a coordinate mapping.
 *
 * @design ON DELETE RESTRICT on chunk_id
 * Mirrors `position_chunks`: a chunk that is still referenced by a game cannot
 * be hard-deleted, protecting the link's target. `game_id` cascades (deleting a
 * game drops its links). `suggested_by_id` → auth.users SET NULL (custom SQL).
 */
export const gameChunks = pgTable(
  'game_chunks',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    gameId: uuid('game_id')
      .notNull()
      .references(() => games.id, { onDelete: 'cascade' }),
    /** 0-based index into `games.moves[]` the chunk is asserted to apply to. */
    ply: integer('ply').notNull(),
    chunkId: uuid('chunk_id')
      .notNull()
      .references(() => chunks.id, { onDelete: 'restrict' }),
    // references auth.users — FK defined in custom SQL (ON DELETE SET NULL).
    suggestedById: uuid('suggested_by_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    // One link per (game, move, chunk); a second member "linking" the same
    // chunk is a no-op rather than a duplicate. Its leading (game_id, ply)
    // prefix also serves the per-game / per-move lookups, so no separate
    // (game_id, ply) index is needed.
    unique('uq_game_chunks').on(table.gameId, table.ply, table.chunkId),
    // chunk_id is not covered by the game_id-leading unique; index it for the
    // ON DELETE RESTRICT reference check and the future chunk→games backlink.
    index('idx_game_chunks_chunk').on(table.chunkId),
  ]
);

export type GameChunk = typeof gameChunks.$inferSelect;
export type NewGameChunk = typeof gameChunks.$inferInsert;
