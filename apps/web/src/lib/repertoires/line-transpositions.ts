import { toPositionKey } from '@blindfold-chess/features/chess-core';

/**
 * A replayed line, ready for transposition detection. `positions[0]` is the
 * root position; `positions[k]` is the position after the line's k-th move.
 */
export type LineForTransposition = {
  id: string;
  positions: { fen: string }[];
};

/**
 * A run of consecutive plies where `current` and one other line sit on the
 * same position, ply-for-ply in parallel. Both ply fields are 1-based, same
 * indexing as `positions`.
 */
export type SharedSegment = {
  otherLineId: string;
  /** current-side span (inclusive). */
  fromPly: number;
  toPly: number;
  /** other-side ply matching `fromPly`; the span offsets in lockstep from there. */
  otherFromPly: number;
  /** Moves left in the other line after the span's other-side end. */
  otherContinuationPlies: number;
};

export type LineTranspositions = {
  /** True transpositions only — see the common-prefix note below. fromPly asc, then otherLineId. */
  segments: SharedSegment[];
  /**
   * Segments that end at current's last ply and have moves left on the other
   * side — "the rest of this position lives in line N". Includes the one case
   * excluded from `segments` (a current line that is a straight prefix of
   * another): the "continues in" framing is still useful there even though
   * it isn't a transposition.
   */
  continuations: SharedSegment[];
};

/**
 * Detect where `current` shares a run of positions with any of `others`,
 * ply-for-ply, without assuming the two lines are at the same ply number
 * (that's the whole point — a transposition is the same position reached via
 * a different move order, or via extra moves, so ply indices commonly
 * diverge). For each other line, positions are matched by
 * `current ply - other ply` ("offset"): a maximal run of consecutive current
 * plies matching the same other line at a constant offset is one shared
 * segment. Matching the same other line at more than one offset (the other
 * line revisits a position, or the two lines cross twice) yields independent
 * segments — offsets don't merge.
 *
 * A segment that starts at ply 1 on both sides *and* the two lines' root
 * positions also match is just the two lines sharing an opening prefix — not
 * a transposition, since the sidebar's line list already lets a reader switch
 * lines from ply 1. Such segments are dropped from `segments` (they would
 * otherwise appear on every prefix-sharing line and add noise), but not from
 * `continuations`: an unbroken prefix match all the way to current's last ply
 * still means "the rest of this line lives in line N", which is the useful
 * fact regardless of why the lines started matching.
 */
export function findLineTranspositions(
  current: LineForTransposition,
  others: LineForTransposition[]
): LineTranspositions {
  const currentMaxPly = current.positions.length - 1;
  const segments: SharedSegment[] = [];
  const continuations: SharedSegment[] = [];

  for (const other of others) {
    if (other.id === current.id) continue;
    const otherMaxPly = other.positions.length - 1;

    const otherPliesByKey = new Map<string, number[]>();
    for (let q = 0; q <= otherMaxPly; q++) {
      const key = toPositionKey(other.positions[q].fen);
      const plies = otherPliesByKey.get(key);
      if (plies) plies.push(q);
      else otherPliesByKey.set(key, [q]);
    }

    // One in-progress run per offset (current ply - other ply). A run closes
    // as soon as its offset stops matching at the current ply being scanned.
    const runsByOffset = new Map<number, { fromPly: number; otherFromPly: number }>();

    const closeRun = (offset: number, toPly: number) => {
      const run = runsByOffset.get(offset);
      if (!run) return;
      runsByOffset.delete(offset);

      const otherToPly = run.otherFromPly + (toPly - run.fromPly);
      const segment: SharedSegment = {
        otherLineId: other.id,
        fromPly: run.fromPly,
        toPly,
        otherFromPly: run.otherFromPly,
        otherContinuationPlies: otherMaxPly - otherToPly,
      };

      const isCommonPrefixOnly =
        run.fromPly === 1 &&
        run.otherFromPly === 1 &&
        toPositionKey(current.positions[0].fen) === toPositionKey(other.positions[0].fen);
      if (!isCommonPrefixOnly) segments.push(segment);

      if (toPly === currentMaxPly && segment.otherContinuationPlies > 0) {
        continuations.push(segment);
      }
    };

    for (let p = 1; p <= currentMaxPly; p++) {
      const key = toPositionKey(current.positions[p].fen);
      const matchedOffsets = new Set<number>();
      for (const q of otherPliesByKey.get(key) ?? []) {
        const offset = p - q;
        matchedOffsets.add(offset);
        if (!runsByOffset.has(offset)) runsByOffset.set(offset, { fromPly: p, otherFromPly: q });
      }
      for (const offset of [...runsByOffset.keys()]) {
        if (!matchedOffsets.has(offset)) closeRun(offset, p - 1);
      }
    }
    for (const offset of [...runsByOffset.keys()]) closeRun(offset, currentMaxPly);
  }

  const byFromPlyThenLine = (a: SharedSegment, b: SharedSegment) =>
    a.fromPly - b.fromPly || a.otherLineId.localeCompare(b.otherLineId);
  segments.sort(byFromPlyThenLine);
  continuations.sort(byFromPlyThenLine);

  return { segments, continuations };
}
