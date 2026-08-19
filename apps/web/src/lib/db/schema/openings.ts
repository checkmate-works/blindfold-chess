// Split from schema/rankings.ts on 2026-07-04. Per-domain
// schema slice — chess openings reference data.
//
// The static `chess_openings` master data: opening families with their
// representative PGN move sequences and resulting FEN positions. Referenced
// by topic posts (topicType='opening') and repertoires — unrelated to the
// challenge-ranking tables it used to share a file with.
import { index, integer, pgTable, text, uuid, varchar } from 'drizzle-orm/pg-core';

import { timestamps } from './columns';

/**
 * Chess Openings — master data for chess opening families.
 *
 * @description
 * Stores chess opening families (e.g., French Defense, Sicilian Defense) with their
 * representative PGN move sequences and resulting FEN positions. Used as topicKey
 * source for topic_posts with topicType='opening'.
 *
 * @design Master data, not user-generated content
 *
 * This table is seeded via migration/script and managed by admins only.
 * Users cannot create, modify, or delete openings. RLS allows public reads
 * but restricts writes to the service role.
 *
 * @design FEN derived from PGN at seed time
 *
 * The `fen` column stores the board state after executing the `pgn` moves.
 * This is computed at seed time using chess.js (via @blindfold-chess/features/chess-core)
 * to avoid runtime computation.
 *
 * @design slug as topicKey
 *
 * The `slug` column serves as the `topicKey` value when `topicType='opening'`,
 * following the same pattern as other topic types. It appears in URLs
 * (e.g., /topics/openings/french-defense).
 *
 * @design Flat URL slugs — no hierarchical paths
 *
 * Although parentSlug models a tree, URLs remain flat (/openings/kings-gambit-declined,
 * not /openings/kings-gambit/declined). The slug is used as topicKey in topicPosts and
 * as answerValue in userInterviewAnswers; hierarchical paths would require reverse-mapping
 * logic with no SEO or UX benefit. Hierarchy is expressed in the UI (breadcrumbs) instead.
 */
export const chessOpenings = pgTable(
  'chess_openings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: varchar('slug', { length: 100 }).unique().notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    ecoCode: varchar('eco_code', { length: 3 }).notNull(),
    pgn: text('pgn').notNull(),
    fen: varchar('fen', { length: 100 }).notNull(),
    firstMoveSquare: varchar('first_move_square', { length: 2 }).notNull(),
    parentSlug: varchar('parent_slug', { length: 100 }),
    sortOrder: integer('sort_order').notNull().default(0),
    ...timestamps,
  },
  (table) => [
    index('idx_chess_openings_first_move_square').on(table.firstMoveSquare),
    index('idx_chess_openings_eco_code').on(table.ecoCode),
    index('idx_chess_openings_parent_slug').on(table.parentSlug),
  ]
);

export type ChessOpening = typeof chessOpenings.$inferSelect;
export type NewChessOpening = typeof chessOpenings.$inferInsert;
