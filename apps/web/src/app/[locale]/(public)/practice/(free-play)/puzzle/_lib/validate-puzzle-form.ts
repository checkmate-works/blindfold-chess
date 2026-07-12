import type { useFenBoardEditor } from '../../_hooks/use-fen-board-editor';
import type { usePuzzleSolutionMoves } from '../_hooks/use-puzzle-solution-moves';

type BoardEditor = ReturnType<typeof useFenBoardEditor>;
type SolutionMoves = ReturnType<typeof usePuzzleSolutionMoves>;

/**
 * Pre-submit validation for the position step (create and edit). Clears the
 * previous field error, then re-checks the one hard requirement (a valid
 * position). On failure it flags `board.positionError` and returns `false`;
 * the caller aborts the transition to the solution step.
 */
export function validatePuzzlePosition(board: BoardEditor): boolean {
  board.setPositionError(false);

  if (!board.trimmedFen || !board.isFenValid) {
    board.setPositionError(true);
    return false;
  }

  return true;
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
