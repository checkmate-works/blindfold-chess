'use client';

import { useEffect, useRef, useState } from 'react';

import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';

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
import { validateChunkForm } from '../_lib/chunk-form-validation';
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
 * recovery in `useChunkDraftRecovery`, and the submit validation gate in
 * `validateChunkForm`. This component wires them to the markup.
 *
 * Both modes hand off through the same confirmation page: submit writes
 * a `ChunkDraftV1` to sessionStorage and navigates to a preview, where
 * the `Server Action` that actually persists lives (the sessionStorage
 * handoff can't be read on the server).
 *
 * - **Create**: navigates to `/chunks/new/preview`; the preview calls
 *   `createChunk`.
 * - **Edit**: navigates to `/chunks/<slug>/edit/preview`; the preview
 *   calls `updateChunk` — and Publish when the "Save as draft" toggle is
 *   off, exactly like create. The draft carries the row id + starting
 *   slug (`draft.edit`) so the preview can resolve the post-save target
 *   slug (draft chunks allow slug renames). Delete is NOT offered here —
 *   it lives on the detail page's "⋯" owner menu (`ChunkDeleteButton`),
 *   the one surface that also covers published chunks (which 404 here).
 *
 * Annotations are NOT user-editable from this form yet. Newly-created
 * chunks store the empty shape (the DB default); edits leave whatever
 * value was previously written untouched by omitting the column from
 * the update payload (drizzle treats `undefined` as "skip").
 */
export function ChunkForm(props: Props) {
  const { mode, disableUnsavedGuard = false } = props;
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('chunks.form');

  // Latched at mount: `true` when the author arrived from the preview's
  // "Back to edit" (`?resumed=1`) rather than a cold visit. Distinguishes
  // an intentional round-trip — where the draft restore is expected and
  // the banner would be noise — from a genuine fresh restore. Latched via
  // ref so stripping the marker below doesn't flip it and reveal the
  // banner. Mirrors the puzzle authoring flow.
  const resumedRef = useRef(searchParams.get('resumed') === '1');
  const resumed = resumedRef.current;

  // Strip the marker so it isn't bookmarked or re-read on refresh.
  useEffect(() => {
    if (!resumed) return;
    const base =
      mode === 'edit' ? `/chunks/${(props as EditProps).initial.slug}/edit` : '/chunks/new';
    router.replace(base as '/chunks/[slug]');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
  const [submitted, setSubmitted] = useState(false);
  const [startOverOpen, setStartOverOpen] = useState(false);

  const { hydratedFromDraft, setHydratedFromDraft } = useChunkDraftRecovery({
    mode,
    injectedFen,
    editChunkId: mode === 'edit' ? props.initial.id : undefined,
    resumed,
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const errorKey = validateChunkForm({
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

    // Both modes hand off to a confirmation page: create persists via
    // `/chunks/new/preview`, edit via `/chunks/<slug>/edit/preview`. The
    // draft is the handoff channel for both — the preview reads it,
    // renders it for review, and only then calls the mutation (and, when
    // the draft toggle is off, Publish). Edit drafts carry the row id +
    // starting slug so the preview can call `updateChunk` and resolve the
    // (possibly renamed) target slug.
    const draft: ChunkDraftV1 = {
      version: 1,
      representativeFen: board.trimmedFen,
      title,
      slug,
      description,
      annotations,
      status,
      feedbackTopics,
      ...(mode === 'edit'
        ? { edit: { chunkId: props.initial.id, initialSlug: props.initial.slug } }
        : {}),
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

    navigateAfterSubmit(
      mode === 'create' ? '/chunks/new/preview' : `/chunks/${props.initial.slug}/edit/preview`
    );
  }

  const submitDisabled = !board.isFenValid || title.trim() === '' || slug.trim() === '';

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 rounded bg-destructive-soft text-destructive-soft-foreground text-sm">
            {error}
          </div>
        )}

        {hydratedFromDraft && mode === 'create' && !resumed && (
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
          pending={false}
        />

        <div className="space-y-3">
          <Button type="submit" variant="primary" size="lg" fullWidth disabled={submitDisabled}>
            {t('actions.continueToPreview')}
          </Button>

          {mode === 'edit' && (
            // Abandon editing and return to the detail page. A plain
            // `router.push` (not a <Link>) so the unsaved-changes guard
            // still intercepts when there are pending edits. Mirrors the
            // repertoire / line edit forms' cancel affordance.
            <button
              type="button"
              onClick={() => router.push(`/chunks/${props.initial.slug}` as '/chunks/[slug]')}
              className="block w-full text-center text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
            >
              {t('actions.cancel')}
            </button>
          )}
        </div>
      </form>

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

      <UnsavedChangesDialog open={isBlocking} onCancel={cancel} onConfirm={confirm} />
    </>
  );
}
