/**
 * Where a create/edit form is in its submit protocol.
 *
 * - `editing` — the author is filling the form in (the initial state, and
 *   where a rejected submit returns to).
 * - `confirming` — a confirmation dialog stands between the submit button
 *   and the write (e.g. a paid visibility tier asking to charge coins).
 * - `submitting` — the write is in flight.
 * - `succeeded` — the write landed and the form is navigating away. Terminal:
 *   the form unmounts on arrival, so nothing leads out of it.
 *
 * This replaces a set of independent booleans (`pending`, `confirmOpen`,
 * `submitted`) that could represent combinations the protocol never passes
 * through — a confirm dialog open over an in-flight write, or a form both
 * "saved" and still "saving". As one union, those states cannot be written.
 *
 * The rejection message itself is not part of this state: it is owned by
 * `useSubmitError`, which also moves focus to the control at fault, and
 * `useSubmitLifecycle` is the only thing that writes it — cleared when a
 * write starts, reported when one fails.
 */
export type SubmitLifecycleState =
  | { status: 'editing' }
  | { status: 'confirming' }
  | { status: 'submitting' }
  | { status: 'succeeded' };

export type SubmitLifecycleAction =
  | { type: 'requestConfirm' }
  | { type: 'cancelConfirm' }
  | { type: 'submit' }
  | { type: 'fail' }
  | { type: 'succeed' };

export const INITIAL_SUBMIT_LIFECYCLE: SubmitLifecycleState = { status: 'editing' };

/**
 * The legal transitions:
 *
 * ```
 * editing ──requestConfirm──▶ confirming ──cancelConfirm──▶ editing
 * editing | confirming ──submit──▶ submitting
 * submitting ──fail──▶ editing
 * submitting ──succeed──▶ succeeded
 * ```
 *
 * Any other action is ignored and the same state object is returned, so an
 * out-of-order dispatch is a no-op (and React skips the re-render) rather
 * than a jump into a state the protocol cannot reach.
 */
export function submitLifecycleReducer(
  state: SubmitLifecycleState,
  action: SubmitLifecycleAction
): SubmitLifecycleState {
  switch (action.type) {
    case 'requestConfirm':
      return state.status === 'editing' ? { status: 'confirming' } : state;
    case 'cancelConfirm':
      return state.status === 'confirming' ? { status: 'editing' } : state;
    case 'submit':
      return state.status === 'editing' || state.status === 'confirming'
        ? { status: 'submitting' }
        : state;
    case 'fail':
      return state.status === 'submitting' ? { status: 'editing' } : state;
    case 'succeed':
      return state.status === 'submitting' ? { status: 'succeeded' } : state;
  }
}

/**
 * Whether the form should read as busy — spinner on the submit button,
 * secondary actions disabled. True after success as well as during the
 * write: the page is still mounted while the navigation to the result
 * resolves, and a re-enabled button there would invite a second submit.
 */
export function isSubmitBusy(state: SubmitLifecycleState): boolean {
  return state.status === 'submitting' || state.status === 'succeeded';
}
