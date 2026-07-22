'use client';

import { useCallback, useState } from 'react';

import { useNavigationGuard } from 'next-navigation-guard';

type UseUnsavedChangesOptions = {
  isDirty: boolean;
  /**
   * What to run when the user confirms discarding via an in-app cancel (the
   * `requestDiscard` path) — e.g. closing an inline editor or navigating home.
   * Not called for route/tab navigation: the navigation guard performs that
   * itself once confirmed. Omit it when the component only needs the
   * navigation guard (the historical behaviour).
   */
  onDiscard?: () => void;
};

type UseUnsavedChangesReturn = {
  /** Whether the confirm dialog should be shown (either exit intent). */
  isBlocking: boolean;
  /** Proceed with the pending exit (leave the page and/or run `onDiscard`). */
  confirm: () => void;
  /** Abort the pending exit (stay). */
  cancel: () => void;
  /**
   * Ask to discard from inside the component (a Cancel button). Opens the same
   * dialog when dirty; when clean it discards immediately via `onDiscard`.
   */
  requestDiscard: () => void;
};

/**
 * One confirm-before-losing-work gate for a form/editor, covering both ways a
 * user can walk away from unsaved changes:
 *
 *   1. **Leaving the screen** — a route change or tab close, caught by
 *      `next-navigation-guard`.
 *   2. **Cancelling in place** — a Cancel button that shouldn't silently throw
 *      the draft away; call `requestDiscard()` from its onClick.
 *
 * Both raise the same dialog (`isBlocking` + `confirm`/`cancel`), so a screen
 * wires up `UnsavedChangesDialog` once and both exits flow through it.
 */
export function useUnsavedChanges({
  isDirty,
  onDiscard,
}: UseUnsavedChangesOptions): UseUnsavedChangesReturn {
  const guard = useNavigationGuard({ enabled: isDirty });
  // An in-app discard (Cancel) awaiting confirmation — separate from the
  // navigation guard, which owns route/tab exits.
  const [discardPending, setDiscardPending] = useState(false);

  const requestDiscard = useCallback(() => {
    if (isDirty) setDiscardPending(true);
    else onDiscard?.();
  }, [isDirty, onDiscard]);

  const confirm = useCallback(() => {
    if (guard.active) guard.accept();
    if (discardPending) {
      setDiscardPending(false);
      onDiscard?.();
    }
  }, [guard, discardPending, onDiscard]);

  const cancel = useCallback(() => {
    if (guard.active) guard.reject();
    setDiscardPending(false);
  }, [guard]);

  return {
    isBlocking: guard.active || discardPending,
    confirm,
    cancel,
    requestDiscard,
  };
}
