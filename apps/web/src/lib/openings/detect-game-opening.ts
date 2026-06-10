import { cache } from 'react';

import { unstable_cache } from 'next/cache';

import {
  type OpeningIndex,
  buildOpeningIndex,
  detectOpening,
} from '@blindfold-chess/features/chess-core';

import { chessOpenings, db } from '@/lib/db';

/**
 * detect-game-opening: resolve which named opening a recorded game played.
 *
 * The position-matching algorithm lives in `@blindfold-chess/features/chess-core`
 * ({@link detectOpening}); this module is the app-side adapter that feeds it the
 * `chess_openings` master data and maps the matched slug back to a display record.
 *
 * The opening is *derived* from `games.moves` + the opening master — it is not
 * stored on the game. Detection is cheap (the master is ~100 rows and a game is
 * only replayed as far as the deepest known opening), and computing it on read
 * keeps it correct as the master grows, with no migration or backfill. If a
 * browse-/filter-by-opening feature is ever wanted, that is the point to
 * denormalize a `games.opening_slug` column — not before.
 */

export type DetectedOpening = {
  slug: string;
  name: string;
  ecoCode: string;
};

type OpeningRow = DetectedOpening & { fen: string };

/**
 * The raw rows behind detection, cached for an hour under the shared `openings`
 * tag (so an opening-master change invalidates this alongside the other opening
 * caches).
 */
const loadOpeningRows = unstable_cache(
  async (): Promise<OpeningRow[]> =>
    db
      .select({
        slug: chessOpenings.slug,
        name: chessOpenings.name,
        ecoCode: chessOpenings.ecoCode,
        fen: chessOpenings.fen,
      })
      .from(chessOpenings),
  ['opening-detection-rows'],
  { tags: ['openings'], revalidate: 3600 }
);

/**
 * Build the position-key index once per request. `React.cache` dedupes so a
 * gallery page classifying many games pays the build cost only once. The
 * Map-bearing index can't pass through `unstable_cache` (JSON-serialized), but
 * the underlying rows are cached, so this only reassembles a ~100-entry map.
 */
const getOpeningLookup = cache(
  async (): Promise<{ index: OpeningIndex; bySlug: Map<string, DetectedOpening> }> => {
    const rows = await loadOpeningRows();
    const index = buildOpeningIndex(rows.map((r) => ({ id: r.slug, fen: r.fen })));
    const bySlug = new Map<string, DetectedOpening>(
      rows.map((r) => [r.slug, { slug: r.slug, name: r.name, ecoCode: r.ecoCode }])
    );
    return { index, bySlug };
  }
);

/**
 * Return the deepest named opening the game reached, or null when none applies
 * (no moves, a custom starting position, or no position matches the master).
 */
export async function detectGameOpening(game: {
  moves: string[];
  startingFen?: string | null;
}): Promise<DetectedOpening | null> {
  if (game.moves.length === 0) return null;

  const { index, bySlug } = await getOpeningLookup();
  const match = detectOpening(
    { moves: game.moves, startingFen: game.startingFen ?? undefined },
    index
  );
  return match ? (bySlug.get(match.id) ?? null) : null;
}
