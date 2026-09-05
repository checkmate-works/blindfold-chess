import { getFenAfterMoves, isCheckmateFen } from '@blindfold-chess/features/chess-core';
import { and, eq, inArray } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { featuredPuzzles, feedItems, positions, puzzleSolutions } from '../../src/lib/db/schema';
import {
  normalizePuzzleMoves,
  validatePuzzleMutationData,
} from '../../src/lib/positions/validation';

type SeedPuzzle = {
  title: string;
  description: string;
  fen: string;
  /** SAN, player and opponent moves alternating — the shape `puzzle_solutions` stores. */
  moves: { san: string; note?: string }[];
  /** Whether the solution ends in mate. Checked against the board, not trusted. */
  endsInMate: boolean;
};

/**
 * Six puzzles covering the shapes the puzzle UI has to handle.
 *
 * Five are mate or a fork in one — enough to click through a solve, a wrong
 * answer, and the result screen. Légal's Mate is here for the sixth: it is
 * five plies, so it is the only one that exercises the opponent replying
 * between the player's moves, and per-move notes on a line long enough for
 * them to matter.
 *
 * All six are featured, because the Daily Puzzle picks by `md5(day || id)`
 * with no memory of yesterday — a pool of one or two repeats itself on
 * consecutive days, which reads as a bug when you are looking at the card
 * two mornings running.
 */
const SEED_PUZZLES: SeedPuzzle[] = [
  {
    title: 'Back-rank mate',
    description: 'The king never made an escape square. One move ends it.',
    fen: '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1',
    moves: [{ san: 'Ra8#', note: 'The f7-g7-h7 pawns are the mating net, not the defence.' }],
    endsInMate: true,
  },
  {
    title: 'Trade into the back rank',
    description: 'The defending rook is the only thing holding the eighth rank.',
    fen: '3r2k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1',
    moves: [{ san: 'Rxd8#' }],
    endsInMate: true,
  },
  {
    title: 'Fork on c7',
    description: 'King and rook on the same colour squares — find the square that hits both.',
    fen: 'r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1',
    moves: [
      { san: 'Nc7+', note: 'Check first: the rook cannot be saved while the king is in check.' },
    ],
    endsInMate: false,
  },
  {
    title: 'Ladder mate',
    description: 'Two rooks, one open board.',
    fen: '7k/R7/8/8/8/8/8/KR6 w - - 0 1',
    moves: [{ san: 'Rb8#' }],
    endsInMate: true,
  },
  {
    title: "Scholar's mate",
    description: 'Black just played 3...Nf6 and forgot what the queen and bishop were aiming at.',
    fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4',
    moves: [{ san: 'Qxf7#' }],
    endsInMate: true,
  },
  {
    title: "Légal's Mate",
    description: 'The pinned knight is not pinned. Five plies, and the queen is the price.',
    fen: 'r2qkbnr/ppp2ppp/2np4/4p2b/2B1P3/2N2N1P/PPPP1PP1/R1BQK2R w KQkq - 4 6',
    moves: [
      { san: 'Nxe5', note: 'Ignoring the pin — the bishop on h5 is worth less than the mate.' },
      { san: 'Bxd1' },
      { san: 'Bxf7+' },
      { san: 'Ke7' },
      { san: 'Nd5#' },
    ],
    endsInMate: true,
  },
];

/**
 * Reseeds the puzzle catalog and the Daily Puzzle pool.
 *
 * Without this the pool is empty, so `getDailyPuzzle` returns null and the
 * Daily Puzzle card renders nothing on both surfaces that carry it — the
 * signed-in dashboard and the top of `/practice`. There is no admin UI path
 * that creates a puzzle either: featuring one requires a puzzle to exist,
 * and puzzles are UGC.
 *
 * Mirrors the write shape of `createPuzzle` — a `positions` row, its
 * `puzzle_solutions` line, and a `feed_items` entry — but goes through the DB
 * directly, since that action authenticates off a session. Two deliberate
 * omissions: the new-position follower notification (nobody follows a seed
 * user) and theme / chunk tags (they need glossary and chunk rows that this
 * script does not create).
 *
 * Every position runs through the same validator the action uses, so a typo
 * in a FEN or a SAN above fails here rather than landing an unsolvable puzzle
 * in the DB. `validateMoveSequence` accepts a `#` on a move that does not
 * actually mate, so the mating lines are additionally played out and checked.
 *
 * Re-runnable: the previous seed puzzles are hard-deleted first, matched on
 * both the seed owners and the seed titles — so a puzzle you wrote by hand in
 * the local UI survives even if you happened to give it one of these names.
 *
 * @param ownerIds Seed users to attribute the puzzles to, round-robin, so the
 *   list page shows more than one author.
 */
export async function reseedPuzzles(
  db: PostgresJsDatabase,
  ownerIds: string[]
): Promise<{ title: string; moveCount: number }[]> {
  const titles = SEED_PUZZLES.map((p) => p.title);

  // `puzzle_solutions` and `featured_puzzles` cascade off `positions.id`;
  // `feed_items.entity_id` is a plain uuid column with no FK, so its rows
  // have to go first or they outlive the puzzle they point at.
  const stale = await db
    .select({ id: positions.id })
    .from(positions)
    .where(
      and(
        eq(positions.type, 'puzzle'),
        inArray(positions.userId, ownerIds),
        inArray(positions.title, titles)
      )
    );

  if (stale.length > 0) {
    const staleIds = stale.map((row) => row.id);
    await db.delete(feedItems).where(inArray(feedItems.entityId, staleIds));
    await db.delete(positions).where(inArray(positions.id, staleIds));
  }

  const seeded: { title: string; moveCount: number }[] = [];

  for (const [index, puzzle] of SEED_PUZZLES.entries()) {
    const userId = ownerIds[index % ownerIds.length];
    const solutionMoves = normalizePuzzleMoves(puzzle.moves);

    const error = validatePuzzleMutationData({
      fen: puzzle.fen,
      title: puzzle.title,
      description: puzzle.description,
      solutionMoves,
      userId,
    });
    if (error) {
      throw new Error(`dev-seed: puzzle "${puzzle.title}" is invalid (${error})`);
    }

    const finalFen = getFenAfterMoves(
      puzzle.fen,
      solutionMoves.map((m) => m.san)
    );
    if (puzzle.endsInMate && !(finalFen && isCheckmateFen(finalFen))) {
      throw new Error(`dev-seed: puzzle "${puzzle.title}" claims mate but does not deliver it`);
    }

    const [position] = await db
      .insert(positions)
      .values({
        userId,
        type: 'puzzle',
        fen: puzzle.fen,
        title: puzzle.title,
        description: puzzle.description,
      })
      .returning({ id: positions.id });

    await db.insert(puzzleSolutions).values({ positionId: position.id, solutionMoves });
    await db.insert(featuredPuzzles).values({ positionId: position.id });
    await db.insert(feedItems).values({
      entityType: 'position',
      entityId: position.id,
      actorId: userId,
      metadata: { type: 'puzzle' },
    });

    seeded.push({ title: puzzle.title, moveCount: solutionMoves.length });
  }

  return seeded;
}
