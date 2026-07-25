'use client';

import { useState } from 'react';

import { type ChunkFormTranslator, submitChunkDelete } from '../_lib/chunk-form-actions';

/**
 * The edit form's delete flow: a confirm-modal → Server Action → navigate
 * sequence with its own pending flag, kept out of the form shell so
 * ChunkForm stays a thin wiring layer. Inert in create mode (`chunk` is
 * null): the handler no-ops and the flags stay false.
 *
 * Publish is NOT handled here — it rides the shared preview flow (uncheck
 * "Save as draft" → the preview's Publish button), matching create.
 */
export function useChunkLifecycleActions({
  chunk,
  onError,
  navigateAfterSubmit,
  t,
}: {
  /** The chunk being edited, or null in create mode. */
  chunk: { id: string; slug: string } | null;
  onError: (message: string | null) => void;
  /** Mark the form submitted (releasing the unsaved guard) and navigate. */
  navigateAfterSubmit: (path: string) => void;
  t: ChunkFormTranslator;
}) {
  const [deletePending, setDeletePending] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  async function handleDelete() {
    if (!chunk) return;
    setDeleteConfirmOpen(false);
    setDeletePending(true);
    onError(null);

    const result = await submitChunkDelete({ chunkId: chunk.id, t });
    setDeletePending(false);

    if (!result.ok) {
      onError(result.error);
      return;
    }

    navigateAfterSubmit('/chunks');
  }

  return {
    deletePending,
    deleteConfirmOpen,
    setDeleteConfirmOpen,
    handleDelete,
  };
}
