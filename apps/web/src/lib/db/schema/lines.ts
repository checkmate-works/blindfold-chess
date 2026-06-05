// Per-domain schema slice — user repertoire lines (型 / Kata).
//
// A user's private, memorized move-trees. Each row is ONE tree ("型"): an
// opening repertoire, a checkmate pattern, or any middlegame position whose
// continuation the user has committed to memory. The route surface is
// /lines (see apps/web URL naming); the UI label is 型 (Kata).
//
// Scope is deliberately broader than openings — unlike the static, admin-owned
// `chess_openings` master data, these are user-generated and start from an
// arbitrary position (a mate pattern carries its own FEN). Used later by a
// post-game "deviation correction" screen that replays a finished game against
// the user's trees and flags where the player left their own line.
import { index, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

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
 * repertoire tools "just work" (they all export PGN), and it avoids a
 * normalized node table until transposition-merging or large-tree performance
 * actually demands one (YAGNI).
 *
 * @design side — who the player is
 *
 * A repertoire is asymmetric: at the player's own turn there is a committed
 * move, while the opponent's replies branch. PGN itself does not record which
 * colour is "you", so it is stored explicitly here. Deviation detection depends
 * on it (a player-side mismatch is a mistake to correct; an opponent move not
 * in the tree is merely an unseen line).
 *
 * @design starting_fen — denormalized from the PGN
 *
 * NULL means the standard starting position (the opening case). A non-NULL FEN
 * is captured at write time from the PGN's `[FEN]` header so list/preview
 * surfaces can render the root position without parsing the whole PGN. Mirrors
 * `games.starting_fen`.
 *
 * @design user_id — owner, FK defined Supabase-side
 *
 * Ownership is row-level via `user_id` (references `auth.users`, FK + RLS in
 * custom SQL, following `chunks.user_id` / `games.author_id`). These rows are
 * private to their owner; there is no public catalog. Initial access to the
 * whole feature is gated by hiding the nav link (see the /lines route group);
 * a `user_grants` benefit can tighten that to real authorization later without
 * touching this table.
 */
export const userLines = pgTable(
  'user_lines',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // references auth.users — FK + RLS defined in custom SQL (ON DELETE CASCADE).
    userId: uuid('user_id').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    side: varchar('side', { length: 5 }).$type<'white' | 'black'>().notNull(),
    /** NULL = standard start; otherwise the root position from the PGN's [FEN]. */
    startingFen: varchar('starting_fen', { length: 100 }),
    /** Repertoire tree as PGN-with-variations (RAV). Source of truth. */
    pgn: text('pgn').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdateFn(() => new Date()),
  },
  (table) => [
    // List a user's own lines, newest first (the only read pattern so far).
    index('idx_user_lines_user').on(table.userId, table.createdAt),
  ]
);

export type UserLine = typeof userLines.$inferSelect;
export type NewUserLine = typeof userLines.$inferInsert;
