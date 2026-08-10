'use client';

import { useState } from 'react';

import type { EditRequestAction } from '@/lib/edit-requests/shared';

type ResolveResult = { error: string } | object;

type Options = {
  /** Runs the Server Action for `action` and returns its result. */
  resolve: (action: EditRequestAction) => Promise<ResolveResult>;
  /** Turns a Server Action error code into a message for the reader. */
  localizeError: (code: string) => string;
  /**
   * Called once a resolution has succeeded. Owns everything entity-specific
   * about the aftermath — navigation, toasts, refresh — because the two
   * feature areas genuinely differ there (chunks stay on the list, positions
   * bounce the owner back to the detail page with a `?toast=` param).
   */
  onResolved: (action: EditRequestAction) => void;
};

export type EditRequestResolution = {
  /** The action currently in flight, or null. Drives the button spinners. */
  pending: EditRequestAction | null;
  /** Localized failure from the last attempt, or null. */
  error: string | null;
  /** The action awaiting confirmation, or null. Drives the modals. */
  confirm: EditRequestAction | null;
  /** Opens the confirmation modal for `action`. */
  requestConfirm: (action: EditRequestAction) => void;
  /** Dismisses the confirmation modal without resolving. */
  cancelConfirm: () => void;
  /** Runs `action` for real. Wired to the modals' confirm button. */
  run: (action: EditRequestAction) => Promise<void>;
};

/**
 * The confirm → run → report cycle behind an edit-request row's
 * accept / reject / withdraw buttons.
 *
 * @description
 * Both edit-request surfaces (chunk proposals and position proposals) drive
 * the same three pieces of state and sequence them the same way: clear the
 * error, mark the action pending, await the Server Action, clear pending and
 * the confirmation, then branch on whether the result carries an `error`. The
 * ordering matters — the confirmation modal has to close before the failure
 * message renders underneath it, or the reader never sees why it failed — and
 * that is precisely the kind of detail that drifts when it is written twice.
 *
 * What is NOT here: what success means. That is `onResolved`, because the two
 * callers legitimately disagree.
 */
export function useEditRequestResolution({
  resolve,
  localizeError,
  onResolved,
}: Options): EditRequestResolution {
  const [pending, setPending] = useState<EditRequestAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<EditRequestAction | null>(null);

  async function run(action: EditRequestAction) {
    setError(null);
    setPending(action);

    const result = await resolve(action);

    setPending(null);
    setConfirm(null);

    if ('error' in result && typeof result.error === 'string') {
      setError(localizeError(result.error));
      return;
    }

    onResolved(action);
  }

  return {
    pending,
    error,
    confirm,
    requestConfirm: setConfirm,
    cancelConfirm: () => setConfirm(null),
    run,
  };
}
