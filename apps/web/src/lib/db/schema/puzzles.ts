// Auto-split from schema/tables.ts on 2026-05-27. Per-domain
// schema slice — puzzles.
//
// Puzzle solution moves — sibling table to `positions` that stores per-puzzle
// solution lines.
import { index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { createdAtOnly } from './columns';
import { positions } from './positions';

/**
 * Puzzle Solutions — correct move sequences for puzzle-type positions.
 *
 * @description
 * Stores the solution line(s) for positions with `type = 'puzzle'`.
 * Each row represents one valid solution; a puzzle with multiple correct
 * first moves has multiple rows sharing the same `positionId`.
 *
 * @design Rationale for normalization — avoid turning `positions` into an STI table
 * If puzzle-specific data (the solution moves) were added to the `positions`
 * table as nullable columns, the table would accumulate NULL columns per type,
 * similar to Rails' Single Table Inheritance. Instead, puzzle-specific data
 * is split into a separate table to keep concerns clearly separated.
 *
 * @design Rationale for consolidated `solutionMoves` JSONB storage
 * Each row stores a single array of `{ san, note }` objects — the move and its
 * optional note live in the same element. This replaced an earlier design that
 * used parallel `solution_line: text` + `notes: jsonb Array<string|null>` columns,
 * where per-move notes were matched to moves by index. The parallel-index design
 * was a latent bug surface (truncating one array out of sync silently broke the
 * mapping); the consolidated shape makes the invariant structural.
 *
 * The `solution_line` column is kept as a read-only archive of the pre-migration
 * denormalized form. Newly inserted rows write `solutionMoves` only; `solutionLine`
 * stays NULL. The column can be dropped outright once we have confidence
 * that no external tooling reads it.
 *
 * @design Rationale for SAN format
 * Every API in the chess-core package (`validateMoveSequence`, `executeMove`,
 * `getLegalMoves`) is SAN-based, so the `san` field in each element goes into
 * those APIs unchanged. The key name `san` matches the `AlgebraicNotation` /
 * `SAN` vocabulary used throughout the codebase.
 *
 * @design Representing alternative solutions
 * Alternative solutions are represented by inserting multiple rows with the
 * same `positionId`.
 * Example: if both `Nf3` and `Bg5` are correct, store 2 rows with
 * `solutionMoves: [{san:'Nf3',note:null}]` and `solutionMoves: [{san:'Bg5',note:null}]`.
 * Alternative paths in multi-move puzzles are represented the same way.
 *
 * @example
 * // Single-move puzzle with a note on the only move
 * { positionId: '...', solutionMoves: [
 *     { san: 'Nf3', note: 'develops and eyes e5' }
 *   ] }
 *
 * // Multi-move (player move → opponent response → player move), note on move 1 only
 * { positionId: '...', solutionMoves: [
 *     { san: 'Qh7+', note: 'forcing check' },
 *     { san: 'Kf8', note: null },
 *     { san: 'Qh8#', note: null }
 *   ] }
 */
export type PuzzleSolutionMove = {
  san: string;
  note: string | null;
};

export const puzzleSolutions = pgTable(
  'puzzle_solutions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    positionId: uuid('position_id')
      .notNull()
      .references(() => positions.id, { onDelete: 'cascade' }),
    solutionLine: text('solution_line'), // archive of pre-migration denormalized line; new rows leave NULL
    solutionMoves: jsonb('solution_moves').$type<PuzzleSolutionMove[]>().notNull().default([]),
    ...createdAtOnly,
  },
  (table) => [index('idx_puzzle_solutions_position').on(table.positionId)]
);

export type PuzzleSolution = typeof puzzleSolutions.$inferSelect;
export type NewPuzzleSolution = typeof puzzleSolutions.$inferInsert;

/**
 * Featured Puzzles — the admin-curated pool the Daily Puzzle is drawn from.
 *
 * @description
 * Row existence IS pool membership: featuring inserts a row, unfeaturing
 * deletes it, so the table always reads as "the current pool" with no
 * status column to interpret. The daily reader (`getDailyPuzzle`) picks one
 * member per UTC day via a seeded hash; an empty pool hides the Daily
 * Puzzle card entirely.
 *
 * @design Separate table, not a `featured_at` column on `positions`
 * Curation is editorial data owned by admins, not an attribute of the UGC
 * row. Keeping it out of `positions` follows the same normalization
 * rationale as `puzzle_solutions` above, and lets RLS make the whole table
 * deny-by-default (ENABLE + FORCE, no policies — see rls_policies.sql):
 * `positions` has an owner-writable UPDATE policy, so a flag column there
 * would be self-settable by the puzzle's author via PostgREST.
 *
 * @design No `featured_by` column, no `updated_at`
 * Who featured what (and the unfeature history) lives in
 * `moderation_actions` (`feature_puzzle` / `unfeature_puzzle`), mirroring
 * the user_grants decision to keep admin attribution in the audit table.
 * Rows are insert/delete only, so there is nothing for `updated_at` to
 * track; `featured_at` doubles as the row's creation timestamp.
 *
 * @design `position_id` as primary key
 * A puzzle is either in the pool or not — a natural 1:0..1 relation, so the
 * FK itself is the key (no surrogate id, no separate unique index).
 * `onDelete: 'cascade'` covers physical deletes; soft-deleted puzzles are
 * filtered out by the daily reader instead (the row survives, which also
 * means an un-delete would restore pool membership). Enforcement that the
 * referenced position has `type = 'puzzle'` is at the app layer (the admin
 * action checks; the reader re-filters), since a DB-level check would need
 * a composite (id, type) FK for little gain.
 */
export const featuredPuzzles = pgTable('featured_puzzles', {
  positionId: uuid('position_id')
    .primaryKey()
    .references(() => positions.id, { onDelete: 'cascade' }),
  featuredAt: timestamp('featured_at', { withTimezone: true }).defaultNow().notNull(),
});

export type FeaturedPuzzle = typeof featuredPuzzles.$inferSelect;
