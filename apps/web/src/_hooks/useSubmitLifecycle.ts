'use client';

import { useReducer } from 'react';

import { useRouter } from '@/i18n/routing';
import { flushSync } from 'react-dom';

import { INITIAL_SUBMIT_LIFECYCLE, isSubmitBusy, submitLifecycleReducer } from './submit-lifecycle';
import { useSubmitError } from './useSubmitError';

/**
 * What a form's write reports back to {@link useSubmitLifecycle}: where to
 * land on success, or the rejection to show (`field: null` for one no single
 * control owns — see `useSubmitError`).
 */
export type SubmitOutcome<Field extends string> =
  { ok: true; href: string } | { ok: false; field: Field | null; message: string };

/**
 * The submit protocol of a create/edit form that navigates away on success:
 * the {@link submitLifecycleReducer} state, the rejection message, and the
 * redirect — in one place, so each form only supplies the write itself.
 *
 * `resolveAnchorId` is passed through to `useSubmitError`: it maps a rejected
 * field to the DOM id focus should land on.
 *
 * The returned error accessors are read-only on purpose. The message is
 * cleared when a write starts and reported when one fails, and nothing else
 * touches it — so a stale rejection can't linger over an in-flight retry.
 *
 * **Redirect ordering.** A form feeds `!submitted` into its dirty flag, which
 * arms `useUnsavedChanges`' navigation guard. On success the `succeeded`
 * state is committed with `flushSync` *before* `router.push`: a plain
 * dispatch would only be rendered after the push had already started, and
 * the still-armed guard would stop the app's own redirect to the saved
 * record with a "discard unsaved changes?" dialog.
 */
export function useSubmitLifecycle<Field extends string>(
  resolveAnchorId: (field: Field) => string | null
) {
  const router = useRouter();
  const [state, dispatch] = useReducer(submitLifecycleReducer, INITIAL_SUBMIT_LIFECYCLE);
  const submitError = useSubmitError<Field>(resolveAnchorId);

  /**
   * Run the form's write. Closes a pending confirmation, clears the previous
   * rejection, and on the outcome either reports the new one (back to
   * `editing`) or commits `succeeded` and navigates.
   */
  async function run(write: () => Promise<SubmitOutcome<Field>>) {
    dispatch({ type: 'submit' });
    submitError.clear();

    const outcome = await write();
    if (!outcome.ok) {
      dispatch({ type: 'fail' });
      submitError.report(outcome.field, outcome.message);
      return;
    }
    flushSync(() => dispatch({ type: 'succeed' }));
    router.push(outcome.href);
  }

  return {
    status: state.status,
    /** Submit button spinner / secondary actions disabled. */
    busy: isSubmitBusy(state),
    /** Feed `!submitted` into the form's dirty flag. */
    submitted: state.status === 'succeeded',
    /** Whether the confirmation dialog is open. */
    confirmOpen: state.status === 'confirming',
    /** Open the confirmation dialog instead of writing straight away. */
    requestConfirm: () => dispatch({ type: 'requestConfirm' }),
    /** Dismiss the confirmation dialog without writing. */
    cancelConfirm: () => dispatch({ type: 'cancelConfirm' }),
    run,
    /** The rejection for `field`, or null — feed straight to `<FieldError>`. */
    messageFor: submitError.messageFor,
    /** The rejection no control owns, or null — feed to `<FormErrorBanner>`. */
    formMessage: submitError.formMessage,
    /** Attach to the form-level strip so `field: null` rejections get focus. */
    summaryRef: submitError.summaryRef,
  };
}
