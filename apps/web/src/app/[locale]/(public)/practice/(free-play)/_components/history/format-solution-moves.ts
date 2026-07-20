import type { PuzzleSolutionMove } from '@/lib/db/schema/positions';

/**
 * Render an old/new `puzzle_solutions` snapshot for the edit-history diff:
 * each row (alternative solution) becomes a comma-separated SAN list with
 * inline notes, rows joined by " | ". Returns `''` for an empty snapshot —
 * callers fall back to the generic "(empty)" label in that case.
 */
export function formatSolutionMovesForDisplay(rows: PuzzleSolutionMove[][]): string {
  return rows
    .map((row) =>
      row.map((move) => (move.note ? `${move.san} (${move.note})` : move.san)).join(', ')
    )
    .join(' | ');
}
