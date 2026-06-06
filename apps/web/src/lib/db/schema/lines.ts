// Per-domain schema slice — user repertoire lines (型 / Kata).
//
// A user's memorized move-trees. Each row is ONE tree ("型"): an opening
// repertoire, a checkmate pattern, or any middlegame position whose
// continuation the user has committed to memory. The route surface is /lines
// (see apps/web URL naming); the UI label is 型 (Kata).
//
// Scope is deliberately broader than openings — unlike the static, admin-owned
// `chess_openings` master data, these are user-generated. Powers a post-game
// "deviation correction" screen that replays a finished game against the user's
// trees and flags where the player left their own line.
//
// These are genuine UGC, like `chunks` / `games`, so the table is modelled on
// `games` (the closest sibling: a shareable artifact with a planned private
// tier). Today the whole feature is concealed simply by NOT linking it from
// global nav — that is the only gate while the feature is being built out. The
// lifecycle columns below (`status`, `deleted_at`, a nullable `user_id`) exist
// now so the eventual public catalog + per-line visibility toggle need no
// further migration of this table.
import { sql } from 'drizzle-orm';
import { index, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { uuidv7 } from '@/lib/uuidv7';

/**
 * User Lines — a user-owned repertoire move-tree (型 / Kata).
 *
 * @design PGN as the source of truth; tree rebuilt on read
 *
 * The branching tree is stored as a single PGN-with-variations (RAV) string in
 * `pgn`, mirroring how `chess_openings.pgn` and `games.moves` store the moves
 * and derive richer structure on demand. The tree is reconstructed at read time
 * via `parsePgnTree` from `@blindfold-chess/features/chess-core`. Keeping the
 * canonical form as PGN means imports from Lichess studies / Chess.com / other
 * repertoire tools "just work", and it avoids a normalized node table until
 * transposition-merging or large-tree performance actually demands one (YAGNI).
 *
 * @design UUIDv7 primary key
 *
 * `id` is a UUIDv7 (time-ordered, app-generated), used directly as the public
 * URL identifier — no slug. Time-ordering gives index-only keyset pagination
 * for the eventual catalog; the random bits keep ids unguessable, which matters
 * for the `private` tier and for link safety. Mirrors `games.id`.
 *
 * @design side — who the player is
 *
 * A repertoire is asymmetric: at the player's own turn there is a committed
 * move, while the opponent's replies branch. PGN does not record which colour
 * is "you", so it is stored explicitly. Deviation detection depends on it.
 *
 * @design starting_fen — denormalized from the PGN
 *
 * NULL means the standard start (the opening case). A non-NULL FEN is captured
 * at write time from the PGN's `[FEN]` header so list/preview surfaces can
 * render the root position without parsing the whole PGN. Mirrors
 * `games.starting_fen`.
 *
 * @design user_id — owner, nullable + ON DELETE SET NULL
 *
 * Ownership is row-level via `user_id` (references `auth.users`; FK + RLS in
 * custom SQL). Nullable + SET NULL — like `games.author_id` / `chunks.user_id`
 * — so that once a public catalog exists, a public line survives its author's
 * account deletion as an orphan rather than cascading away. There is no
 * account-less authoring path (import requires sign-in); NULL only ever results
 * from a later account deletion.
 *
 * @design status / deleted_at lifecycle (two orthogonal axes)
 *
 * `status` (varchar, not pgEnum, for additive extensibility like
 * `games.status`) is the visibility tier: `private` (default — personal prep,
 * owner-only) | `public` (planned — shared into the catalog). Sharing is
 * opt-in, so unlike `games` (which defaults `public`) a line defaults
 * `private`; nothing transitions a line to `public` yet — the column exists now
 * only so the value set never needs a later migration.
 * `deleted_at` is the orthogonal soft-delete / moderation tombstone. Reads
 * require `deleted_at IS NULL`; delete stamps `deleted_at` only.
 */
export const userLines = pgTable(
  'user_lines',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    // references auth.users — FK + RLS defined in custom SQL (ON DELETE SET NULL).
    // NULL only after a later account deletion; never on insert.
    userId: uuid('user_id'),
    name: varchar('name', { length: 255 }).notNull(),
    side: varchar('side', { length: 5 }).$type<'white' | 'black'>().notNull(),
    /** NULL = standard start; otherwise the root position from the PGN's [FEN]. */
    startingFen: varchar('starting_fen', { length: 100 }),
    /** Repertoire tree as PGN-with-variations (RAV). Source of truth. */
    pgn: text('pgn').notNull(),
    /** Visibility tier: 'private' (default) | 'public' (planned share). */
    status: varchar('status', { length: 20 })
      .$type<'private' | 'public'>()
      .notNull()
      .default('private'),
    /** Soft-delete / moderation tombstone. NULL = live. */
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdateFn(() => new Date()),
  },
  (table) => [
    // A user's own lines, newest first (the current read pattern).
    index('idx_user_lines_user').on(table.userId, table.createdAt),
    // Forward-ready catalog scan: visible, non-deleted, shared lines. Mirrors
    // games' partial public index; harmless while nothing is public yet.
    index('idx_user_lines_public')
      .on(table.id.desc())
      .where(sql`deleted_at IS NULL AND status = 'public'`),
  ]
);

export type UserLine = typeof userLines.$inferSelect;
export type NewUserLine = typeof userLines.$inferInsert;
