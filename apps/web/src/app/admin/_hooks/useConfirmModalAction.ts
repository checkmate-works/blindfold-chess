'use client';

import { useState } from 'react';

import { adminErrorMessage } from '@/app/admin/_lib/action-errors';

import type { ActionResult } from '@/lib/action-types';

/**
 * State machine shared by the admin "click a button -> confirm in a modal ->
 * call a Server Action -> show error or close" flows (GrantRankButton,
 * BanButton, UnbanButton, DeletePostAdminButton, RevokeButton).
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
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function open() {
    setIsOpen(true);
  }

  function cancel() {
    setIsOpen(false);
    setError(null);
  }

  async function run<T extends ActionResult>(
    action: () => Promise<T>,
    onSuccess?: (result: Exclude<T, { error: string }>) => void
  ): Promise<void> {
    setIsPending(true);
    setError(null);

    const result = await action();

    if ('error' in result) {
      setError(adminErrorMessage(result.error));
      setIsPending(false);
      return;
    }

    setIsOpen(false);
    setIsPending(false);
    onSuccess?.(result as Exclude<T, { error: string }>);
  }

  return { isOpen, open, cancel, isPending, error, setError, run };
}
