import { parsePgn, replayMoves, toPositionKey } from '@blindfold-chess/features/chess-core';

/** The subset of a `repertoire_lines` row the scan replays. */
export type ScannableLine = {
  /** 1-based, immutable line number (the `[lineNo]` URL segment). */
  lineNo: number;
  pgn: string;
  startingFen: string | null;
};

/**
 * Where a position lives in a repertoire: the `?move=` deep-link target the
 * line page reads (1-based ply, matching its `initialPly`).
 */
export type LinePosition = { lineNo: number; ply: number };

/**
 * Scan lines (in the order given — pass display order so "first match" is the
 * first place a reader scanning the sidebar would meet the position) and
 * resolve each wanted position key to the first `(lineNo, ply)` that reaches
 * it. The batch sibling of `resolveLineForPosition`'s single-hash scan, but
 * keyed by the full normalised FEN (`toPositionKey`) because callers hold
 * `repertoire_chunks.position_key` verbatim — no hashing needed.
 *
 * A key no live line reaches is simply absent from the result — that is the
 * "orphaned link stops rendering" behaviour `repertoire_chunks` documents,
 * computed rather than garbage-collected. An unparsable line is skipped, same
 * as `resolveLineForPosition`.
 */
export function scanLinesForPositionKeys(
  lines: readonly ScannableLine[],
  positionKeys: Iterable<string>
): Map<string, LinePosition> {
  const wanted = new Set(positionKeys);
  const found = new Map<string, LinePosition>();

  for (const line of lines) {
    if (wanted.size === 0) break;
    // Skip a line whose stored PGN no longer parses.
    const parsed = parsePgn(line.pgn);
    if (!parsed.ok) continue;
    const sans: string[] = parsed.value;
    const positions = replayMoves(sans, line.startingFen ?? undefined);
    // positions[0] is the start; positions[ply] is the position after ply
    // (1-based) — ply 0 is not a linkable position (see the add action).
    for (let ply = 1; ply < positions.length; ply++) {
      const key = toPositionKey(positions[ply].fen);
      if (wanted.has(key)) {
        wanted.delete(key);
        found.set(key, { lineNo: line.lineNo, ply });
        if (wanted.size === 0) break;
      }
    }
  }
  return found;
}
