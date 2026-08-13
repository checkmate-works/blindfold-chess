import type { Side } from '@blindfold-chess/types';
import { and, eq, inArray } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import {
  chessOpenings,
  repertoireLines,
  repertoireOpenings,
  repertoires,
} from '../../src/lib/db/schema';
import { detectOpeningIdsFromPgn } from '../../src/lib/repertoires/detect-openings';
import { validateRepertoireLineEdit } from '../../src/lib/repertoires/validation';

type SeedLine = { name: string; moves: string };

type SeedRepertoire = {
  name: string;
  side: Side;
  description: string;
  lines: SeedLine[];
};

/**
 * Three main-line Ruy Lopez variations, one kata.
 *
 * Deliberately shallow — the point is to have a course whose lines share a real
 * prefix (`1. e4 e5 2. Nf3 Nc6 3. Bb5`) so the merged tree, the transposition
 * dedupe, and the kata check have something branching to chew on. Depth beyond
 * the naming move buys none of that.
 *
 * Each line reaches the position its `chess_openings` master row is keyed on
 * (Closed after 5...Be7, Berlin after 3...Nf6, Exchange after 4. Bxc6), so the
 * opening links are detected rather than hardcoded — see {@link withAncestors}
 * for why the parent family is linked too.
 */
const SEED_REPERTOIRES: SeedRepertoire[] = [
  {
    name: 'Ruy Lopez essentials',
    side: 'white',
    description: 'Three main lines every 1. e4 player meets after 3. Bb5.',
    lines: [
      {
        name: 'Closed: 8. c3 O-O',
        moves: '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O',
      },
      {
        name: 'Berlin Defense: queenless middlegame',
        moves:
          '1. e4 e5 2. Nf3 Nc6 3. Bb5 Nf6 4. O-O Nxe4 5. d4 Nd6 6. Bxc6 dxc6 7. dxe5 Nf5 8. Qxd8+ Kxd8',
      },
      {
        name: 'Exchange Variation: 5. O-O',
        moves: '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Bxc6 dxc6 5. O-O f6 6. d4',
      },
    ],
  },
];

/**
 * Reseeds the kata (型 / repertoire) courses owned by one seed user.
 *
 * Mirrors `createRepertoireEntry`'s write shape — a `repertoires` row published
 * straight to `public`, one `repertoire_lines` row per line, and detected
 * `repertoire_openings` links — but goes through the DB directly, because that
 * mutation authenticates off a session. Two deliberate omissions:
 *
 * - The publish coin reward (`grantPointsForPost`). It lives behind the
 *   `server-only` points barrel, and a seeded wallet balance is not what this
 *   script exists to produce.
 * - Line names. The real import flow leaves them NULL (the user names lines
 *   afterwards); naming them here is what makes the seeded course readable in
 *   the line list, which is the whole point of having one locally.
 *
 * Re-runnable: the previous courses of this owner are hard-deleted by name
 * first, and every child table cascades off `repertoires.id`. Deleting by name
 * (not by owner) leaves any course you created by hand in the local UI alone.
 *
 * Depends on `pnpm db:seed` having populated `chess_openings` — without it the
 * courses still seed, just with no opening links.
 */
export async function reseedRepertoires(
  db: PostgresJsDatabase,
  ownerId: string
): Promise<{ name: string; lineCount: number; openingSlugs: string[] }[]> {
  await db.delete(repertoires).where(
    and(
      eq(repertoires.userId, ownerId),
      inArray(
        repertoires.name,
        SEED_REPERTOIRES.map((r) => r.name)
      )
    )
  );

  const openings = await db
    .select({
      id: chessOpenings.id,
      slug: chessOpenings.slug,
      fen: chessOpenings.fen,
      parentSlug: chessOpenings.parentSlug,
    })
    .from(chessOpenings);

  const summaries: { name: string; lineCount: number; openingSlugs: string[] }[] = [];

  for (const seed of SEED_REPERTOIRES) {
    // Run the moves through the same validator the line editor uses, so a typo
    // in the SAN above fails here instead of landing an unplayable line in the
    // DB — and so the stored PGN is the canonical re-emitted text.
    const lines = seed.lines.map((line) => {
      const validated = validateRepertoireLineEdit({
        name: line.name,
        pgn: line.moves,
        startingFen: null,
      });
      if (!validated.ok) {
        throw new Error(`dev-seed: line "${line.name}" is invalid (${validated.error})`);
      }
      return validated.data;
    });

    const [repertoire] = await db
      .insert(repertoires)
      .values({
        userId: ownerId,
        name: seed.name,
        side: seed.side,
        phase: 'opening',
        description: seed.description,
        startingFen: null,
        status: 'public',
        publishedAt: new Date(),
      })
      .returning({ id: repertoires.id });

    await db.insert(repertoireLines).values(
      lines.map((line, index) => ({
        repertoireId: repertoire.id,
        name: line.name,
        pgn: line.pgn,
        startingFen: null,
        lineNo: index + 1,
        seq: index,
      }))
    );

    const openingIds = withAncestors(
      lines.flatMap((line) => detectOpeningIdsFromPgn(line.pgn, openings)),
      openings
    );
    if (openingIds.size > 0) {
      await db
        .insert(repertoireOpenings)
        .values([...openingIds].map((openingId) => ({ repertoireId: repertoire.id, openingId })));
    }

    summaries.push({
      name: seed.name,
      lineCount: lines.length,
      openingSlugs: openings.filter((o) => openingIds.has(o.id)).map((o) => o.slug),
    });
  }

  return summaries;
}

type OpeningRow = { id: string; slug: string; parentSlug: string | null };

/**
 * Widen a detected opening set to include each match's ancestors.
 *
 * Detection returns only the DEEPEST opening per line (`ruy-lopez-berlin`, not
 * `ruy-lopez`), and the "who has prepared this opening" panel matches its slug
 * exactly — no rollup over `parent_slug`. Linking only the leaves would
 * therefore leave the family page (`/topics/openings/ruy-lopez`) empty while
 * three variation pages listed the same course, which is a poor local fixture
 * and not what an author would leave behind: the import form seeds the picker
 * from detection but lets them add the family by hand, and they would.
 */
function withAncestors(detected: string[], openings: readonly OpeningRow[]): Set<string> {
  const bySlug = new Map(openings.map((o) => [o.slug, o]));
  const ids = new Set<string>();

  for (const id of detected) {
    let current = openings.find((o) => o.id === id);
    // `parent_slug` is master data, but a cycle in it would hang the seed —
    // stop as soon as a slug repeats rather than trusting it blindly.
    while (current && !ids.has(current.id)) {
      ids.add(current.id);
      current = current.parentSlug ? bySlug.get(current.parentSlug) : undefined;
    }
  }

  return ids;
}
