'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import { useUnsavedChanges } from '@/_hooks/useUnsavedChanges';
import { Button, UnsavedChangesDialog } from '@/app/_components';
import { useRouter } from '@/i18n/routing';
import { validateFenStructure } from '@blindfold-chess/features/chess-core';
import { flushSync } from 'react-dom';
import { FiInfo } from 'react-icons/fi';

import { useFenBoardEditor } from '@/app/[locale]/(public)/practice/(free-play)/_hooks/use-fen-board-editor';
import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';

import { useChunkDraftRecovery } from '../_hooks/use-chunk-draft-recovery';
import { type ChunkFormInitial, useChunkFormState } from '../_hooks/use-chunk-form-state';
import { useChunkLifecycleActions } from '../_hooks/use-chunk-lifecycle-actions';
import { saveChunkEdit } from '../_lib/chunk-form-actions';
import { validateChunkCreateForm } from '../_lib/chunk-form-validation';
import { type ChunkDraftV1, clearChunkDraft, writeChunkDraft } from '../_lib/draft-storage';
import { ChunkFormFields } from './ChunkFormFields';

export type { ChunkFormInitial } from '../_hooks/use-chunk-form-state';

type CreateProps = {
  mode: 'create';
  /**
   * Skip the unsaved-changes navigation guard. Set when the form is
   * rendered behind a guest sign-up overlay so the overlay's CTAs are
   * not blocked by a confirm dialog the guest didn't summon.
   */
  disableUnsavedGuard?: boolean;
  /**
   * Seed the board with this position when entering the create form
   * (e.g. "create a chunk from this game position", passed via `?fen=`).
   * Already validated server-side. Takes precedence over any stored
   * draft — see `useChunkDraftRecovery`.
   */
  injectedFen?: string;
};

type EditProps = {
  mode: 'edit';
  initial: ChunkFormInitial;
  disableUnsavedGuard?: boolean;
};

type Props = CreateProps | EditProps;

const validateFenForChunks = (fen: string) => validateFenStructure(fen).ok;

/**
 * Form shell for chunk authoring. The pieces live in focused modules:
 * field state + dirty check in `useChunkFormState`, sessionStorage draft
 * recovery in `useChunkDraftRecovery`, the create-mode validation gate in
 * `validateChunkCreateForm`, and the publish / delete flows in
 * `useChunkLifecycleActions`. This component wires them to the markup.
 *
 * - **Create**: validates the in-form state, writes a `ChunkDraftV1` to
 *   sessionStorage, and navigates to `/chunks/new/preview` — the
 *   `Server Action` that actually persists the row lives on that page,
 *   matching the puzzle authoring flow exactly.
 * - **Edit**: calls `updateChunk` directly (no preview step — same as
 *   `EditPuzzleForm`). The slug field is read-only here; the
 *   server-side mutation layer also drops the slug on update.
 *
 * Annotations are NOT user-editable from this form yet. Newly-created
 * chunks store the empty shape (the DB default); edits leave whatever
 * value was previously written untouched by omitting the column from
 * the update payload (drizzle treats `undefined` as "skip").
 */
export function ChunkForm(props: Props) {
  const { mode, disableUnsavedGuard = false } = props;
  const router = useRouter();
  const t = useTranslations('chunks.form');

  // A position injected via `?fen=` (create mode only) seeds the board and
  // takes precedence over any stored draft (handled in the recovery hook).
  const injectedFen = props.mode === 'create' ? props.injectedFen : undefined;
  const initialFen = mode === 'edit' ? props.initial.representativeFen : injectedFen;

  const board = useFenBoardEditor({
    initialFen,
    validate: validateFenForChunks,
  });

  const form = useChunkFormState({
    mode,
    initial: mode === 'edit' ? props.initial : undefined,
  });
  const {
    title,
    slug,
    description,
    annotations,
    status,
    feedbackTopics,
    setAnnotations,
    setStatus,
    setFeedbackTopics,
  } = form;

  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [startOverOpen, setStartOverOpen] = useState(false);

  const { hydratedFromDraft, setHydratedFromDraft } = useChunkDraftRecovery({
    mode,
    injectedFen,
    board,
    form,
  });

  const isDirty = !submitted && form.computeIsDirty(board.trimmedFen);

  const { isBlocking, confirm, cancel } = useUnsavedChanges({
    isDirty: disableUnsavedGuard ? false : isDirty,
  });

  function handleStartOver() {
    clearChunkDraft();
    board.resetBoard();
    form.resetFields();
    setError(null);
    setHydratedFromDraft(false);
    setStartOverOpen(false);
  }

  // flushSync so the isDirty -> false re-render completes before
  // router.push triggers the navigation guard.
  function navigateAfterSubmit(path: string) {
    flushSync(() => setSubmitted(true));
    router.push(path as '/chunks/[slug]');
  }

  // Wraps `saveChunkEdit` with the form's pending lifecycle and error
  // display. The pure action lives in `_lib/chunk-form-actions` so the
  // payload shape — including the "send slug only when changed"
  // optimisation and the empty-array-wipes contract for feedbackTopics —
  // stays single-sourced. Returns the slug to navigate to on success
  // so callers don't have to recompute `slugChanged` themselves.
  async function runSaveEdit(
    initial: ChunkFormInitial
  ): Promise<{ ok: true; targetSlug: string } | { ok: false }> {
    setPending(true);
    const result = await saveChunkEdit({
      initialId: initial.id,
      initialSlug: initial.slug,
      payload: {
        representativeFen: board.trimmedFen,
        title,
        slug,
        description,
        annotations,
        feedbackTopics,
      },
      t,
    });
    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return { ok: false };
    }
    return { ok: true, targetSlug: result.targetSlug };
  }

  const lifecycle = useChunkLifecycleActions({
    chunk: mode === 'edit' ? { id: props.initial.id, slug: props.initial.slug } : null,
    isDirty,
    description,
    saveEdit: () => (mode === 'edit' ? runSaveEdit(props.initial) : Promise.resolve({ ok: false })),
    onError: setError,
    navigateAfterSubmit,
    t,
  });
  const { tChunks, publishPending, deletePending } = lifecycle;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === 'create') {
      const errorKey = validateChunkCreateForm({
        isFenValid: board.isFenValid,
        title,
        slug,
        status,
        description,
      });
      if (errorKey) {
        setError(t(errorKey));
        return;
      }

      const draft: ChunkDraftV1 = {
        version: 1,
        representativeFen: board.trimmedFen,
        title,
        slug,
        description,
        annotations,
        status,
        feedbackTopics,
        activeTab: board.activeTab,
        sideToMove: board.sideToMove,
        flipped: board.flipped,
        userFlipped: board.userFlipped,
      };

      const ok = writeChunkDraft(draft);
      if (!ok) {
        setError(t('errors.draftWriteFailed'));
        return;
      }

      navigateAfterSubmit('/chunks/new/preview');
      return;
    }

    const result = await runSaveEdit(props.initial);
    if (!result.ok) return;

    // Land on the freshly-renamed URL when the slug changed —
    // otherwise the old detail URL 404s after revalidation.
    navigateAfterSubmit(`/chunks/${result.targetSlug}`);
  }

  const submitDisabled =
    pending ||
    deletePending ||
    publishPending ||
    !board.isFenValid ||
    title.trim() === '' ||
    (mode === 'create' && slug.trim() === '');

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 rounded bg-destructive-soft text-destructive-soft-foreground text-sm">
            {error}
          </div>
        )}

        {hydratedFromDraft && mode === 'create' && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center justify-between gap-3 rounded-md border border-border bg-secondary px-3 py-2 text-sm"
          >
            <div className="flex items-center gap-2 text-muted-foreground">
              <FiInfo className="h-4 w-4 flex-shrink-0" aria-hidden />
              <span>{t('draftRestoredBanner')}</span>
            </div>
            <button
              type="button"
              onClick={() => setStartOverOpen(true)}
              className="rounded border border-destructive px-2 py-1 text-xs text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
            >
              {t('draftRestoredDiscard')}
            </button>
          </div>
        )}

        <ChunkFormFields
          board={board}
          title={title}
          onTitleChange={form.setTitle}
          description={description}
          onDescriptionChange={form.setDescription}
          slug={slug}
          onSlugChange={form.setSlug}
          annotations={annotations}
          onAnnotationsChange={setAnnotations}
          status={status}
          onStatusChange={setStatus}
          feedbackTopics={feedbackTopics}
          onFeedbackTopicsChange={setFeedbackTopics}
          mode={mode}
          pending={pending || deletePending || publishPending}
        />

        <Button
          type="submit"
          variant="primary"
          fullWidth
          disabled={submitDisabled}
          loading={pending}
        >
          {mode === 'create' ? t('actions.continueToPreview') : t('actions.save')}
        </Button>

        {mode === 'edit' && (
          <>
            {/*
             * Publish-from-edit affordance. Saves the form first (when
             * dirty) so the published content is current, then opens
             * the same publish-confirmation modal the detail page
             * uses. Kept below Save so "Save" stays the lowest-
             * commitment action — readers scan top-down and the
             * one-way publish step is the deliberate next escalation.
             */}
            <Button
              type="button"
              variant="primary"
              fullWidth
              disabled={submitDisabled}
              loading={publishPending}
              onClick={lifecycle.handlePublish}
            >
              {publishPending ? tChunks('actions.publishPending') : tChunks('actions.publish')}
            </Button>
            <button
              type="button"
              onClick={() => lifecycle.setDeleteConfirmOpen(true)}
              disabled={pending || deletePending || publishPending}
              className="w-full px-4 py-2 text-sm rounded border border-destructive text-destructive hover:bg-destructive/10 disabled:opacity-50 transition-colors"
            >
              {deletePending ? t('actions.deleting') : t('actions.delete')}
            </button>
          </>
        )}
      </form>

      <ConfirmationModal
        isOpen={lifecycle.deleteConfirmOpen}
        title={t('delete.confirmTitle')}
        message={t('delete.confirmBody')}
        confirmText={t('delete.confirm')}
        cancelText={t('delete.cancel')}
        confirmVariant="danger"
        onConfirm={lifecycle.handleDelete}
        onCancel={() => lifecycle.setDeleteConfirmOpen(false)}
      />

      <ConfirmationModal
        isOpen={startOverOpen}
        title={t('startOverConfirmTitle')}
        message={t('startOverConfirmMessage')}
        confirmText={t('startOverConfirm')}
        cancelText={t('startOverCancel')}
        confirmVariant="danger"
        onConfirm={handleStartOver}
        onCancel={() => setStartOverOpen(false)}
      />

      <ConfirmationModal
        isOpen={lifecycle.publishConfirmOpen}
        title={tChunks('actions.publishConfirmTitle')}
        message={tChunks('actions.publishConfirmMessage')}
        confirmText={tChunks('actions.publishConfirmCta')}
        cancelText={tChunks('actions.publishConfirmCancel')}
        confirmVariant="primary"
        onConfirm={lifecycle.handlePublishConfirm}
        onCancel={() => lifecycle.setPublishConfirmOpen(false)}
      />

      <UnsavedChangesDialog open={isBlocking} onCancel={cancel} onConfirm={confirm} />
    </>
  );
}
