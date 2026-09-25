'use client';

import { useState } from 'react';

/**
 * State machine for "open a confirmation modal -> run an action -> keep the
 * modal open with an error on failure, close it on success".
 *
 * Owns only `isOpen` / `isPending` / `error`. The caller decides what counts
 * as failure and how it reads, via `toError`: action results in this app come
 * in several shapes (`{ error }`, `{ ok }`, `{ success }`) and each surface
 * localizes codes with its own catalogue, so neither belongs here.
 *
 * `cancel` only closes. The error is left in place so the modal can be closed
 * and reopened without the component re-rendering its own copy; surfaces that
 * want a clean slate on reopen clear it themselves (`setError(null)`) — the
 * admin wrapper `useConfirmModalAction` does this on cancel.
 */
export function useConfirmAction() {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function open() {
    setIsOpen(true);
  }

  function cancel() {
    setIsOpen(false);
  }

  /**
   * @param toError - Returns the message to show for a failed result, or
   *   `null` when the result is a success.
   * @param onSuccess - Runs after the modal has been closed.
   */
  async function run<T>(
    action: () => Promise<T>,
    toError: (result: T) => string | null,
    onSuccess?: (result: T) => void
  ): Promise<void> {
    setIsPending(true);
    setError(null);

    const result = await action();
    const message = toError(result);

    setIsPending(false);
    if (message !== null) {
      setError(message);
      return;
    }

    setIsOpen(false);
    onSuccess?.(result);
  }

  return { isOpen, open, cancel, isPending, error, setError, run };
}
