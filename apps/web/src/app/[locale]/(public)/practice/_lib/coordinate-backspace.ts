/**
 * Shared staged-coordinate backspace rule used by practice features that pick
 * a file and a rank in two steps (board-symmetry, route-planner, ...).
 *
 * Semantics (rank-first deletion):
 *   1. if `selectedRank` is set → clear rank (file preserved)
 *   2. else if `selectedFile` is set → clear file
 *   3. else → no change, and `cleared` is `false` so the caller can run an
 *      optional fallthrough action (e.g. undo the last move).
 *
 * This module is a pure function. It owns the rank-first rule and nothing
 * else — callers compose any fallthrough externally by inspecting the
 * returned `cleared` flag.
 */

/**
 * Staged-coordinate selection used by practice features that pick a file and
 * rank one at a time.
 */
export type StagedCoordinateSelection = {
  selectedFile: string | null;
  selectedRank: string | null;
};

export type CoordinateBackspaceResult = {
  /** The new selection after applying the backspace rule. */
  next: StagedCoordinateSelection;
  /**
   * True if this backspace consumed a stage (rank or file was cleared).
   * False if the selection was already empty — caller may choose to run a
   * fallthrough action (e.g. undo the last move).
   */
  cleared: boolean;
};

/**
 * Apply one step of staged-coordinate backspace. See module-level doc for
 * the rank-first rule. Pure; does not mutate its input.
 */
export function applyCoordinateBackspace(
  current: StagedCoordinateSelection
): CoordinateBackspaceResult {
  if (current.selectedRank !== null) {
    return {
      next: { selectedFile: current.selectedFile, selectedRank: null },
      cleared: true,
    };
  }
  if (current.selectedFile !== null) {
    return {
      next: { selectedFile: null, selectedRank: null },
      cleared: true,
    };
  }
  return {
    next: { selectedFile: null, selectedRank: null },
    cleared: false,
  };
}
