import { cache } from 'react';

import {
  type OpeningIndex,
  buildOpeningIndex,
  detectOpening,
} from '@blindfold-chess/features/chess-core';

import { getOpenings } from '@/lib/openings/master-queries';

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

/**
 * A master opening plus its signature FEN. Shipped to the client when detection
 * must run there (the play-result game lives only in localStorage, so the server
 * never sees its moves); the client builds the index and runs {@link detectOpening}
 * directly — both are browser-safe pure functions.
 */
export type OpeningCatalogEntry = DetectedOpening & { fen: string };

type OpeningRow = OpeningCatalogEntry;

/**
 * The rows behind detection, projected from the one cached opening master
 * ({@link getOpenings}). This used to be a second `unstable_cache` over the
 * same table, which meant two Data Cache entries and two tag strings for one
 * seeded master; the projection is four fields off rows already in memory.
 */
async function loadOpeningRows(): Promise<OpeningRow[]> {
  return (await getOpenings()).map(({ slug, name, ecoCode, fen }) => ({
    slug,
    name,
    ecoCode,
    fen,
  }));
}

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
 * The opening master (`{ slug, name, ecoCode, fen }`), cached. Exposed for the
 * client-side detection path: a Server Component fetches this and hands it to a
 * client component, which builds the index and detects locally (see the
 * play-result page).
 */
export async function getOpeningEntries(): Promise<OpeningCatalogEntry[]> {
  return loadOpeningRows();
}

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
