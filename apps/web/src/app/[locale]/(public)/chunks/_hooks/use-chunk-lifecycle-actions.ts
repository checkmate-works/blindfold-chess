'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import {
  type ChunkFormTranslator,
  submitChunkDelete,
  submitChunkPublish,
} from '../_lib/chunk-form-actions';

/**
 * The edit form's publish and delete flows: each is a
 * confirm-modal → Server Action → navigate sequence with its own pending
 * flag, kept out of the form shell so ChunkForm stays a thin wiring layer.
 *
 * The hook is inert in create mode (`chunk` is null): the handlers no-op
 * and the flags stay false.
 */
export function useChunkLifecycleActions({
  chunk,
  isDirty,
  description,
  saveEdit,
  onError,
  navigateAfterSubmit,
  t,
}: {
  /** The chunk being edited, or null in create mode. */
  chunk: { id: string; slug: string } | null;
  isDirty: boolean;
  description: string;
  /** Persist the current form state (the shared Save flow). */
  saveEdit: () => Promise<{ ok: true; targetSlug: string } | { ok: false }>;
  onError: (message: string | null) => void;
  /** Mark the form submitted (releasing the unsaved guard) and navigate. */
  navigateAfterSubmit: (path: string) => void;
  t: ChunkFormTranslator;
}) {
  const tChunks = useTranslations('chunks');

  const [publishPending, setPublishPending] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  // Captured at handlePublish time so the post-publish redirect lands
  // on the freshly-renamed URL (matches handleSubmit's `targetSlug`).
  const [publishTargetSlug, setPublishTargetSlug] = useState<string | null>(null);

  /**
   * Save (when dirty) then open the publish-confirmation modal. Saves
   * are routed through the same `updateChunk` Server Action as Save,
   * so slug rename + topic_posts cascade + validation errors come out
   * uniformly. The synchronous description-required gate mirrors the
   * server-side `publishChunkEntry` guard, surfacing the rule before
   * the user has to bounce off the publish action.
   */
  async function handlePublish() {
    if (!chunk) return;
    onError(null);

    let finalSlug = chunk.slug;
    if (isDirty) {
      const saveResult = await saveEdit();
      if (!saveResult.ok) return;
      finalSlug = saveResult.targetSlug;
    }

    if (description.trim().length === 0) {
      // The server enforces the same rule via `descriptionRequired`,
      // but raising it inline keeps the user on the field they need
      // to fix instead of bouncing them out to a modal.
      onError(t('errors.descriptionRequired'));
      return;
    }

    setPublishTargetSlug(finalSlug);
    setPublishConfirmOpen(true);
  }

  async function handlePublishConfirm() {
    if (!chunk) return;
    setPublishConfirmOpen(false);
    setPublishPending(true);
    onError(null);

    const result = await submitChunkPublish({ chunkId: chunk.id, t });
    setPublishPending(false);

    if (!result.ok) {
      onError(result.error);
      return;
    }

    navigateAfterSubmit(`/chunks/${publishTargetSlug ?? chunk.slug}`);
  }

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
    tChunks,
    publishPending,
    deletePending,
    publishConfirmOpen,
    setPublishConfirmOpen,
    deleteConfirmOpen,
    setDeleteConfirmOpen,
    handlePublish,
    handlePublishConfirm,
    handleDelete,
  };
}
