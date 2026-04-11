/**
 * Computes the next (file, rank) selection after a Backspace press in the
 * board-symmetry coordinate input.
 *
 * Semantics (matches the user-approved rule): if a rank is currently selected,
 * Backspace clears the rank only. Otherwise, if a file is selected, Backspace
 * clears the file. When both are already empty, the state is left unchanged
 * (no-op). Backspace never triggers answer submission on its own.
 */
export type BoardSymmetrySelection = {
  selectedFile: string | null;
  selectedRank: string | null;
};

export function applyBoardSymmetryBackspace(
  current: BoardSymmetrySelection
): BoardSymmetrySelection {
  if (current.selectedRank !== null) {
    return { selectedFile: current.selectedFile, selectedRank: null };
  }
  if (current.selectedFile !== null) {
    return { selectedFile: null, selectedRank: null };
  }
  return current;
}
