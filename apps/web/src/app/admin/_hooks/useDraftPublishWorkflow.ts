'use client';

import { useState, useTransition } from 'react';

type SaveDraftSuccess = { success: true; id: string };
type SaveDraftFailure = { error: string; field?: string };
type SaveDraftResult = SaveDraftSuccess | SaveDraftFailure;

type Options<TData> = {
  /** Whether the record being edited is already public. */
  isPublished: boolean;
  /** Collect the current field state into the action's payload. */
  buildFormData: () => TData;
  onSaveDraft: (data: TData) => Promise<SaveDraftResult>;
  /** Drop any rejection left over from the previous attempt. */
  clearErrors: () => void;
  /** Surface a rejection, at the field the server blamed when it named one. */
  onSaveError: (failure: SaveDraftFailure) => void;
  /** What the plain Save button does on success (toast, redirect, ...). */
  onSaved: (success: SaveDraftSuccess) => void;
};

/**
 * The save half of the announcement and article editors: a pending flag, the
 * save-and-report transition, and the rule that saving an already-published
 * record asks for confirmation first.
 *
 * That rule is the reason this is shared rather than left as two similar
 * functions. Editing a published record is an edit to something readers can
 * already see, and the confirmation step is what stands between a half-typed
 * paragraph and the public site. Both editors had it written out separately,
 * so it could have been weakened in one without the other.
 *
 * Success effects stay with each caller through `onSaved`, because they
 * genuinely differ — which toast, whether a freshly created record redirects
 * to its edit page, whether the unsaved-changes guard is being stood down.
 * `saveThen` exposes the same transition for the secondary "save, then
 * navigate" buttons (preview, publish settings), which deliberately skip the
 * confirmation: they are leaving the editor, not publishing from it.
 *
 * A caller that must set state before the navigation fires does so before
 * calling `saveThen`, not in its callback — see the comment on the
 * announcement editor's preview handler for what goes wrong otherwise.
 */
export function useDraftPublishWorkflow<TData>({
  isPublished,
  buildFormData,
  onSaveDraft,
  clearErrors,
  onSaveError,
  onSaved,
}: Options<TData>) {
  const [isPending, startTransition] = useTransition();
  const [publishedConfirmOpen, setPublishedConfirmOpen] = useState(false);

  const saveThen = (
    handleSaved: (success: SaveDraftSuccess) => void,
    handleFailed?: () => void
  ) => {
    clearErrors();
    startTransition(async () => {
      const result = await onSaveDraft(buildFormData());

      if ('error' in result) {
        onSaveError(result);
        handleFailed?.();
      } else {
        handleSaved(result);
      }
    });
  };

  return {
    isPending,
    publishedConfirmOpen,
    /** The plain Save button: confirm first when the record is published. */
    requestSave: () => {
      if (isPublished) {
        setPublishedConfirmOpen(true);
      } else {
        saveThen(onSaved);
      }
    },
    confirmPublishedSave: () => {
      setPublishedConfirmOpen(false);
      saveThen(onSaved);
    },
    cancelPublishedSave: () => setPublishedConfirmOpen(false),
    saveThen,
  };
}
