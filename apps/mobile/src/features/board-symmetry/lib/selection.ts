/**
 * The file/rank pickers of the untimed board-symmetry drill, as a pure step:
 * given what is selected now and the button just tapped, return the next
 * selection and — only when this tap completes it — the answer to submit.
 *
 * The decision to submit is made here, at the tap, rather than by watching the
 * selection in a React effect. An effect that fires on "file and rank are both
 * set and no result is showing" also fires on the render where the session
 * advances: the session hides the result and moves to the next question in
 * one batch, so that render still carries the previous question's file and
 * rank, and the effect submits them as the answer to the new question before
 * the clearing effect runs. Reordering the effects does not help, because both
 * see the same stale selection. Deciding at the tap means only a user's tap
 * can ever submit.
 */

export type SymmetrySelection = {
  file: string | null;
  rank: string | null;
};

export type SymmetryPick =
  { kind: "file"; value: string } | { kind: "rank"; value: string };

export type SymmetryAnswer = { file: string; rank: string };

export type SymmetryPickResult = {
  selection: SymmetrySelection;
  /** The answer to submit, or `null` when this tap does not submit. */
  answer: SymmetryAnswer | null;
};

/**
 * Applies one tap to the selection. Tapping the selected value again clears
 * it; tapping another value replaces it. The returned `answer` is set only
 * when both a file and a rank are selected after the tap and `locked` is
 * false (`locked` is true while the previous answer's result is showing).
 */
export function pickSymmetryCoordinate(
  current: SymmetrySelection,
  pick: SymmetryPick,
  locked: boolean,
): SymmetryPickResult {
  const toggle = (cur: string | null) =>
    cur === pick.value ? null : pick.value;
  const selection: SymmetrySelection =
    pick.kind === "file"
      ? { file: toggle(current.file), rank: current.rank }
      : { file: current.file, rank: toggle(current.rank) };

  const answer =
    !locked && selection.file !== null && selection.rank !== null
      ? { file: selection.file, rank: selection.rank }
      : null;

  return { selection, answer };
}
