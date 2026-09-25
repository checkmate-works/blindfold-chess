'use client';

import { adminErrorMessage } from '@/app/admin/_lib/action-errors';

import type { ActionResult } from '@/lib/action-types';

import { useConfirmAction } from '@/app/[locale]/_hooks/use-confirm-action';

/**
 * Admin flavour of {@link useConfirmAction}, shared by the admin "click a
 * button -> confirm in a modal -> call a Server Action -> show error or close"
 * flows (GrantRankButton, BanButton, UnbanButton, DeletePostAdminButton,
 * RevokeButton). Unlike the base hook, `cancel` also clears the error.
 *
 * Deliberately holds ONLY the state machine. Success-side effects that
 * differ per button (e.g. GrantRankButton clearing its reason field and
 * advancing rankSlug to the next candidate, then router.refresh()) and any
 * pre-flight validation (e.g. "reason is required") stay in each component —
 * the latter via the exposed `setError`, called before `run` for cases that
 * never need to reach the server.
 *
 * The one thing it does to the value it is handed is turn the action's error
 * code into English via `adminErrorMessage`. That used to be an optional
 * `mapError` callback each button passed, which meant a button that forgot it
 * — four of the five did — showed the operator the raw token, and nothing
 * anywhere failed to say so. Doing it here cannot be forgotten, and prose from
 * an action that has not adopted codes passes through unchanged.
 */
export function useConfirmModalAction() {
  const { isOpen, open, cancel, isPending, error, setError, run } = useConfirmAction();

  function cancelAndClear() {
    cancel();
    setError(null);
  }

  function runAction<T extends ActionResult>(
    action: () => Promise<T>,
    onSuccess?: (result: Exclude<T, { error: string }>) => void
  ): Promise<void> {
    return run(
      action,
      (result) => ('error' in result ? adminErrorMessage(result.error) : null),
      onSuccess && ((result) => onSuccess(result as Exclude<T, { error: string }>))
    );
  }

  return { isOpen, open, cancel: cancelAndClear, isPending, error, setError, run: runAction };
}
