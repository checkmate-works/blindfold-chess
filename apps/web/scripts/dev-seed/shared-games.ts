import { and, eq, inArray } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { feedItems, games } from '../../src/lib/db/schema';
import { deriveGameColumns, validatePublishSnapshot } from '../../src/lib/games/publish-game';

type SeedGame = {
  title: string;
  description: string | null;
  /** SAN from the standard starting position, as a played game stores them. */
  moves: string[];
  playerColor: 'white' | 'black';
  /** From the seed player's side, like every published game. */
  result: 'win' | 'loss' | 'draw';
  engineConfig: { kind: 'stockfish'; skillLevel: number } | { kind: 'maia'; rating: number };
};

/**
 * Eight short, well-known games, published as blindfold games against the
 * engine.
 *
 * Eight rather than a handful because `/games/shared` interleaves a native ad
 * before every fifth card, starting with the first: eight entries put two ad
 * slots on the page, which is the smallest seed that shows the repeat rather
 * than just the leading card.
 *
 * They mix both colours, all three results and both engines, because each of
 * those is a visible difference on the list card (the colour/opening row, the
 * result, the engine badge), and a seed of one kind leaves the others
 * untested. Lines that are recognisable openings also give the opening tag
 * something to show.
 */
const SEED_GAMES: SeedGame[] = [
  {
    title: "Scholar's mate, blindfold",
    description: 'Four moves. The queen and bishop were on f7 the whole time.',
    moves: ['e4', 'e5', 'Bc4', 'Nc6', 'Qh5', 'Nf6', 'Qxf7#'],
    playerColor: 'white',
    result: 'win',
    engineConfig: { kind: 'stockfish', skillLevel: 1 },
  },
  {
    title: 'Opera Game',
    description: 'Morphy vs. the Duke and the Count, replayed without a board.',
    moves: [
      'e4',
      'e5',
      'Nf3',
      'd6',
      'd4',
      'Bg4',
      'dxe5',
      'Bxf3',
      'Qxf3',
      'dxe5',
      'Bc4',
      'Nf6',
      'Qb3',
      'Qe7',
      'Nc3',
      'c6',
      'Bg5',
      'b5',
      'Nxb5',
      'cxb5',
      'Bxb5+',
      'Nbd7',
      'O-O-O',
      'Rd8',
      'Rxd7',
      'Rxd7',
      'Rd1',
      'Qe6',
      'Bxd7+',
      'Nxd7',
      'Qb8+',
      'Nxb8',
      'Rd8#',
    ],
    playerColor: 'white',
    result: 'win',
    engineConfig: { kind: 'maia', rating: 1400 },
  },
  {
    title: "Fool's mate — on the wrong side of it",
    description: 'Lost the king on move two. Posting it so nobody else does.',
    moves: ['f3', 'e5', 'g4', 'Qh4#'],
    playerColor: 'white',
    result: 'loss',
    engineConfig: { kind: 'stockfish', skillLevel: 3 },
  },
  {
    title: "Légal's trap in the Philidor",
    description: null,
    moves: [
      'e4',
      'e5',
      'Nf3',
      'd6',
      'Bc4',
      'Bg4',
      'Nc3',
      'g6',
      'Nxe5',
      'Bxd1',
      'Bxf7+',
      'Ke7',
      'Nd5#',
    ],
    playerColor: 'white',
    result: 'win',
    engineConfig: { kind: 'maia', rating: 1000 },
  },
  {
    title: 'Queen trade into a dead draw',
    description: 'Symmetrical Petrov, everything came off, and neither side could make progress.',
    moves: [
      'e4',
      'e5',
      'Nf3',
      'Nf6',
      'Nxe5',
      'd6',
      'Nf3',
      'Nxe4',
      'd4',
      'd5',
      'Bd3',
      'Bd6',
      'O-O',
      'O-O',
      'c4',
      'c6',
      'Re1',
      'Bf5',
      'Qb3',
      'Qd7',
    ],
    playerColor: 'black',
    result: 'draw',
    engineConfig: { kind: 'stockfish', skillLevel: 8 },
  },
  {
    title: 'Blackburne Shilling trap, as Black',
    description: 'The engine took the pawn on e5 and walked straight into it.',
    moves: [
      'e4',
      'e5',
      'Nf3',
      'Nc6',
      'Bc4',
      'Nd4',
      'Nxe5',
      'Qg5',
      'Nxf7',
      'Qxg2',
      'Rf1',
      'Qxe4+',
      'Be2',
      'Nf3#',
    ],
    playerColor: 'black',
    result: 'win',
    engineConfig: { kind: 'maia', rating: 1200 },
  },
  {
    title: 'Queens Gambit Declined, lost the thread',
    description: 'Lost track of the d-file around move ten and never found it again.',
    moves: [
      'd4',
      'd5',
      'c4',
      'e6',
      'Nc3',
      'Nf6',
      'Bg5',
      'Be7',
      'e3',
      'O-O',
      'Nf3',
      'Nbd7',
      'Rc1',
      'c6',
      'Bd3',
      'dxc4',
      'Bxc4',
      'Nd5',
      'Bxe7',
      'Qxe7',
    ],
    playerColor: 'black',
    result: 'loss',
    engineConfig: { kind: 'stockfish', skillLevel: 12 },
  },
  {
    title: 'Italian, quiet and level',
    description: null,
    moves: [
      'e4',
      'e5',
      'Nf3',
      'Nc6',
      'Bc4',
      'Bc5',
      'c3',
      'Nf6',
      'd3',
      'd6',
      'O-O',
      'O-O',
      'Re1',
      'a6',
    ],
    playerColor: 'white',
    result: 'draw',
    engineConfig: { kind: 'maia', rating: 1600 },
  },
];

/**
 * Reseeds the public game gallery (`/games/shared`).
 *
 * Without this the gallery is empty on a fresh database, and an empty list
 * places no native ad either, so the one surface the gallery's ad slot
 * renders on cannot be looked at locally.
 *
 * Mirrors the write shape of `publishGame` for a registered author — a
 * `games` row plus the `feed_items` entry that puts the publish on the home
 * timeline — but writes through the script's own connection, since that
 * helper is `server-only` and uses the app's pool. Every game runs through
 * `validatePublishSnapshot` first, the same gate the publish action uses, so
 * an illegal SAN above fails here rather than landing an unreplayable game.
 *
 * Re-runnable: the previous seed games are hard-deleted first, matched on
 * both the seed owners and the seed titles, so a game published by hand in
 * the local UI survives. Comments, AI reviews and chunk links cascade with
 * the row; the feed item has no foreign key and is deleted explicitly.
 *
 * @param authorIds Seed users to attribute the games to, round-robin, so the
 *   gallery shows more than one author.
 */
export async function reseedSharedGames(
  db: PostgresJsDatabase,
  authorIds: string[]
): Promise<{ title: string; result: SeedGame['result'] }[]> {
  if (authorIds.length === 0) return [];

  const stale = await db
    .select({ id: games.id })
    .from(games)
    .where(
      and(
        inArray(
          games.title,
          SEED_GAMES.map((g) => g.title)
        ),
        inArray(games.authorId, authorIds)
      )
    );
  if (stale.length > 0) {
    const staleIds = stale.map((row) => row.id);
    await db
      .delete(feedItems)
      .where(and(eq(feedItems.entityType, 'game'), inArray(feedItems.entityId, staleIds)));
    await db.delete(games).where(inArray(games.id, staleIds));
  }

  // Spaced backwards from now so the gallery's newest-first order is stable
  // rather than an eight-way tie.
  const now = Date.now();
  const STEP_MS = 13 * 60 * 1000;

  const seeded: { title: string; result: SeedGame['result'] }[] = [];
  for (const [index, seed] of SEED_GAMES.entries()) {
    const validated = validatePublishSnapshot(seed);
    if (!validated.ok) {
      throw new Error(`dev-seed: game "${seed.title}" is invalid (${validated.error})`);
    }
    const { game } = validated;
    const columns = deriveGameColumns(game);
    const authorId = authorIds[index % authorIds.length];
    const createdAt = new Date(now - index * STEP_MS);

    const [row] = await db
      .insert(games)
      .values({
        authorId,
        title: game.title,
        description: game.description,
        moves: game.moves,
        startingFen: game.startingFen,
        setupPlies: game.setupPlies,
        playerColor: game.playerColor,
        engineConfig: game.engineConfig,
        operationLogs: game.operationLogs,
        operationTotals: game.operationTotals,
        undoneLogs: game.undoneLogs,
        playSettings: game.playSettings,
        playSettingsLog: game.playSettingsLog,
        maiaChargeId: game.maiaChargeId,
        result: game.result,
        engineKind: columns.engineKind,
        engineElo: columns.engineElo,
        moveCount: columns.moveCount,
        cleanRate: columns.cleanRate,
        createdAt,
      })
      .returning({ id: games.id });

    await db.insert(feedItems).values({
      entityType: 'game',
      entityId: row.id,
      actorId: authorId,
      metadata: { result: game.result },
      createdAt,
    });

    seeded.push({ title: game.title, result: game.result });
  }

  return seeded;
}
