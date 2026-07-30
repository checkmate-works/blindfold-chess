import type { usePuzzleSolutionMoves } from '../_hooks/use-puzzle-solution-moves';

type SolutionMoves = ReturnType<typeof usePuzzleSolutionMoves>;

/** The control a position-step error belongs to. */
export type PuzzlePositionField = 'fen' | 'title';

/** Translation keys under `practice.puzzle.create`. */
export type PuzzlePositionErrorKey = 'positionInvalid' | 'titleRequired';

export type PuzzlePositionError = { field: PuzzlePositionField; key: PuzzlePositionErrorKey };

/**
 * Pre-submit validation for the position step (create and edit). Returns
 * the first failing rule as a `{ field, key }` pair so the caller can put
 * the message on the control at fault and focus it, or null when the step
 * may advance to the solution.
 *
 * The title rule used to live only in the Continue button's `disabled`
 * expression, which said nothing about which requirement was unmet.
 */
export function validatePuzzlePosition(input: {
  trimmedFen: string;
  isFenValid: boolean;
  title: string;
}): PuzzlePositionError | null {
  if (input.trimmedFen === '' || !input.isFenValid) {
    return { field: 'fen', key: 'positionInvalid' };
  }
  if (input.title.trim() === '') return { field: 'title', key: 'titleRequired' };
  return null;
}

/**
 * Pre-submit validation for the solution step (create and edit). Clears the
 * previous field error, then re-checks the one hard requirement (at least
 * one solution move). On failure it flags `solution.solutionError` and
 * returns `false`; the caller aborts.
 */
export function validatePuzzleSolution(
  solution: SolutionMoves,
  solutionRequiredMessage: string
): boolean {
  solution.setSolutionError(null);

  if (solution.moves.length === 0) {
    solution.setSolutionError(solutionRequiredMessage);
    return false;
  }

  return true;
}
