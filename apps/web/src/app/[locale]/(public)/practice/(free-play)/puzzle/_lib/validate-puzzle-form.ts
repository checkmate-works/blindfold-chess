import type { useFenBoardEditor } from '../../_hooks/use-fen-board-editor';
import type { usePuzzleSolutionMoves } from '../_hooks/use-puzzle-solution-moves';

type BoardEditor = ReturnType<typeof useFenBoardEditor>;
type SolutionMoves = ReturnType<typeof usePuzzleSolutionMoves>;

/**
 * Shared pre-submit validation for the create and edit puzzle forms. Clears
 * the previous field errors, then re-checks the two hard requirements (a valid
 * position and at least one solution move). On failure it flags the offending
 * field via the hook's error setter and returns `false`; the caller aborts.
 *
 * The form-level (`error` banner) state is intentionally left to the caller —
 * create and edit surface different banners on top of these field errors.
 */
export function validatePuzzleForm(
  board: BoardEditor,
  solution: SolutionMoves,
  solutionRequiredMessage: string
): boolean {
  board.setPositionError(false);
  solution.setSolutionError(null);

  if (!board.trimmedFen || !board.isFenValid) {
    board.setPositionError(true);
    return false;
  }

  if (solution.moves.length === 0) {
    solution.setSolutionError(solutionRequiredMessage);
    return false;
  }

  return true;
}
