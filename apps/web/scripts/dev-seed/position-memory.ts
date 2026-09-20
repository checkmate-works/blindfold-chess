import { and, eq, inArray } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { feedItems, positions } from '../../src/lib/db/schema';
import { validatePositionMutationData } from '../../src/lib/positions/validation';

type SeedMemoryPosition = {
  title: string;
  description: string;
  fen: string;
};

/**
 * Six positions to memorise, spanning the range of piece counts the
 * recreation screen has to handle.
 *
 * Unlike a chunk, a memory position must be a *legal* one —
 * `validatePositionMutationData` runs the chess.js-backed `validateFen`, so
 * every FEN here has two kings and passes the same check the create form
 * applies. The seed would fail loudly on one that does not.
 *
 * Six, so the catalog page has more entries than the ad interval and the
 * "other problems" grid on any one of them still has candidates to fill four
 * cells after the current position is excluded. The spread from a 32-piece
 * opening to a four-piece endgame is what makes the memorise timer and the
 * accuracy breakdown worth looking at: a run of six identical-density
 * positions exercises one point on that scale.
 */
const SEED_POSITIONS: SeedMemoryPosition[] = [
  {
    title: 'Italian Game: Giuoco Piano',
    description:
      'Everything still on the board except two pawns. The starting shape is doing most of the memorising for you — which is the point of beginning here.',
    fen: 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
  },
  {
    title: 'Ruy Lopez: Morphy Defence',
    description:
      'One pawn move apart from the Italian in feel and nothing alike in structure. Worth memorising next to it for exactly that reason.',
    fen: 'r1bqkbnr/1ppp1ppp/p1n5/4p3/B3P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4',
  },
  {
    title: 'Sicilian: Najdorf structure',
    description:
      'The asymmetric pawn structure is the hard part: both sides have six pawns and they are on different files, so there is no mirror to lean on.',
    fen: 'rnbqkb1r/1p2pppp/p2p1n2/8/3NP3/2N5/PPP2PPP/R1BQKB1R w KQkq - 0 6',
  },
  {
    title: 'French Defence: Advance Variation',
    description:
      'The locked pawn chains give you two diagonals to hold instead of eleven separate pawns. A good position for practising chunking rather than listing.',
    fen: 'rnbqkbnr/pp3ppp/4p3/2ppP3/3P4/5N2/PPP2PPP/RNBQKB1R b KQkq - 1 4',
  },
  {
    title: 'Queenless middlegame, symmetrical',
    description:
      'Twelve pieces and a mirror. Symmetry makes the board quick to take in and easy to get backwards — check which side each knight is on before you commit.',
    fen: 'r4rk1/pp3ppp/2n1b3/8/8/2N1B3/PP3PPP/R4RK1 w - - 0 1',
  },
  {
    title: 'Rook and pawn endgame',
    description:
      'Four pieces. Nothing to chunk and nowhere to hide — this one is a test of coordinate recall, not of pattern recognition.',
    fen: '8/8/4k3/8/8/4K3/4P3/4R3 w - - 0 1',
  },
];

const SEED_TITLES = SEED_POSITIONS.map((p) => p.title);

export type SeededMemoryPosition = { title: string; pieceCount: number };

/** Pieces on the board, for the seed log — the axis these six spread across. */
function countPieces(fen: string): number {
  return (fen.split(' ')[0].match(/[a-zA-Z]/g) ?? []).length;
}

/**
 * Replace this seed's memory positions for `ownerIds`.
 *
 * Scoped by owner and title, exactly as `reseedPuzzles` is: a re-run must not
 * touch a position someone saved by hand while signed in as a seed user.
 *
 * `feed_items.entity_id` has no FK (the table is polymorphic), so those rows
 * are deleted explicitly and first — the same order the puzzle seed needs.
 *
 * Every row goes through `validatePositionMutationData`, so a seeded position
 * is one the create form would have accepted, and a FEN that is merely
 * well-formed rather than legal fails the seed instead of reaching the
 * catalog.
 */
export async function reseedPositionMemory(
  db: PostgresJsDatabase,
  ownerIds: string[]
): Promise<SeededMemoryPosition[]> {
  if (ownerIds.length === 0) return [];

  const stale = await db
    .select({ id: positions.id })
    .from(positions)
    .where(
      and(
        eq(positions.type, 'memory'),
        inArray(positions.userId, ownerIds),
        inArray(positions.title, SEED_TITLES)
      )
    );

  if (stale.length > 0) {
    const staleIds = stale.map((row) => row.id);
    await db.delete(feedItems).where(inArray(feedItems.entityId, staleIds));
    await db.delete(positions).where(inArray(positions.id, staleIds));
  }

  const seeded: SeededMemoryPosition[] = [];

  // Spaced backwards from now so the catalog's newest-first order is stable
  // rather than a six-way tie, and so the "other problems" grid's author tier
  // has a defined order to rank within.
  const now = Date.now();
  const STEP_MS = 13 * 60 * 1000;

  for (const [index, seed] of SEED_POSITIONS.entries()) {
    const userId = ownerIds[index % ownerIds.length];
    const createdAt = new Date(now - index * STEP_MS);

    const error = validatePositionMutationData({
      fen: seed.fen,
      title: seed.title,
      description: seed.description,
      userId,
    });
    if (error) {
      throw new Error(`dev-seed: memory position "${seed.title}" is invalid (${error})`);
    }

    const [position] = await db
      .insert(positions)
      .values({
        userId,
        type: 'memory',
        fen: seed.fen,
        title: seed.title,
        description: seed.description,
        createdAt,
        updatedAt: createdAt,
      })
      .returning({ id: positions.id });

    await db.insert(feedItems).values({
      entityType: 'position',
      entityId: position.id,
      actorId: userId,
      metadata: { type: 'memory' },
      createdAt,
    });

    seeded.push({ title: seed.title, pieceCount: countPieces(seed.fen) });
  }

  return seeded;
}
