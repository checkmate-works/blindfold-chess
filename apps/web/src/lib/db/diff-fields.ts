import type { PuzzleSolutionMove } from './schema/positions';

/** Old → new value pairs for the fields an in-place edit overwrote. */
export type FieldChanges = Record<string, { from: string | null; to: string | null }>;

/**
 * Diff the overwritten fields (old → new) so the activity log keeps the
 * prior values an in-place edit discarded (UGC rows keep no revision
 * history). Values are normalized with `?? null` on both sides so an absent
 * field and an explicit null compare equal. Fields that did not change are
 * omitted — an empty result means nothing worth logging.
 */
export function diffFields<K extends string>(
  prev: Partial<Record<K, string | null>>,
  next: Partial<Record<K, string | null>>,
  keys: readonly K[]
): FieldChanges {
  const changes: FieldChanges = {};
  for (const key of keys) {
    const from = prev[key] ?? null;
    const to = next[key] ?? null;
    if (from !== to) {
      changes[key] = { from, to };
    }
  }
  return changes;
}

/** Old → new snapshot pair for `puzzle_solutions`, one array per alternative-solution row. */
export type SolutionMovesChange = {
  from: PuzzleSolutionMove[][];
  to: PuzzleSolutionMove[][];
};

/**
 * `puzzle_solutions` holds one row per alternative solution to the same
 * puzzle; rows are semantically an unordered set (there is no "first"
 * alternative), so a save that reorders rows without changing their content
 * must not register as a change. Each row is collapsed to a plain string and
 * the resulting set is sorted before comparing, which also absorbs
 * incidental array-identity differences from the delete+insert replace
 * strategy `updatePuzzle` uses.
 */
export function diffSolutionMoves(
  prev: PuzzleSolutionMove[][],
  next: PuzzleSolutionMove[][]
): SolutionMovesChange | null {
  if (canonicalizeSolutionRows(prev) === canonicalizeSolutionRows(next)) {
    return null;
  }
  return { from: prev, to: next };
}

function canonicalizeSolutionRows(rows: PuzzleSolutionMove[][]): string {
  const rowKeys = rows.map((row) => JSON.stringify(row.map((move) => [move.san, move.note])));
  return JSON.stringify(rowKeys.sort());
}
