import {
  buildOpeningIndex,
  detectOpening,
  enumerateLines,
  parsePgnTree,
} from '@blindfold-chess/features/chess-core';

/**
 * Which named openings a repertoire's PGN plays.
 *
 * A repertoire PGN branches, so — unlike a game, which has exactly one opening
 * ({@link detectGameOpening}) — it can legitimately name several: each variation
 * is its own root-to-leaf line and gets its own deepest match. The result is the
 * de-duplicated set, in opening-master order.
 *
 * Pure and browser-safe (the import form runs it on every paste, client-side),
 * and tolerant by design: an unparseable or half-typed PGN yields no openings
 * rather than an error — the authoritative PGN check happens on submit.
 */
export function detectOpeningIdsFromPgn(
  pgn: string,
  openings: readonly { id: string; fen: string }[]
): string[] {
  if (!pgn.trim() || openings.length === 0) return [];

  let tree;
  try {
    tree = parsePgnTree(pgn);
  } catch {
    return [];
  }

  const index = buildOpeningIndex(openings.map((o) => ({ id: o.id, fen: o.fen })));
  const matched = new Set<string>();
  for (const moves of enumerateLines(tree)) {
    const match = detectOpening({ moves, startingFen: tree.startingFen }, index);
    if (match) matched.add(match.id);
  }

  return openings.filter((o) => matched.has(o.id)).map((o) => o.id);
}
