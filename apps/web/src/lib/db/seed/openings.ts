import { getFenAfterMoves, getStartingFen, parsePgn } from '@blindfold-chess/features/chess-core';
import { eq, not, sql } from 'drizzle-orm';

import { chessOpenings as chessOpeningsData } from '../data/chess-openings';
import { chessOpenings, db } from '../index';

// ---------------------------------------------------------------------------
// Master data: Chess Openings (code is source of truth, upserted on every deploy)
// ---------------------------------------------------------------------------

export async function seedChessOpenings() {
  console.log(`Seeding ${chessOpeningsData.length} chess openings...`);

  const validSlugs: string[] = [];

  // Pass 1: Upsert all openings with parentSlug set to null.
  // This ensures all parent rows exist before children reference them via FK.
  for (const opening of chessOpeningsData) {
    const moves = parsePgn(opening.pgn);
    const fen = getFenAfterMoves(getStartingFen(), moves);

    await db
      .insert(chessOpenings)
      .values({
        slug: opening.slug,
        name: opening.name,
        ecoCode: opening.ecoCode,
        pgn: opening.pgn,
        fen,
        firstMoveSquare: opening.firstMoveSquare,
        parentSlug: null,
        sortOrder: opening.sortOrder,
      })
      .onConflictDoUpdate({
        target: chessOpenings.slug,
        set: {
          name: opening.name,
          ecoCode: opening.ecoCode,
          pgn: opening.pgn,
          fen,
          firstMoveSquare: opening.firstMoveSquare,
          parentSlug: null,
          sortOrder: opening.sortOrder,
          updatedAt: new Date(),
        },
      });

    validSlugs.push(opening.slug);
  }

  // Pass 2: Set parentSlug for openings that have a parent.
  // All parent rows are guaranteed to exist after Pass 1.
  const childOpenings = chessOpeningsData.filter((o) => o.parentSlug);
  for (const opening of childOpenings) {
    await db
      .update(chessOpenings)
      .set({ parentSlug: opening.parentSlug!, updatedAt: new Date() })
      .where(eq(chessOpenings.slug, opening.slug));
  }

  // Pass 3: Clean up openings removed from code data source
  if (validSlugs.length > 0) {
    const slugValues = validSlugs.map((s) => sql`${s}`);
    await db
      .delete(chessOpenings)
      .where(not(sql`${chessOpenings.slug} IN (${sql.join(slugValues, sql`, `)})`));
  }
}
