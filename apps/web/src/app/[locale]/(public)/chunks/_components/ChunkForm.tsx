'use client';

import { useEffect, useState } from 'react';

import { useTranslations } from 'next-intl';

import { useUnsavedChanges } from '@/_hooks/useUnsavedChanges';
import { Button, UnsavedChangesDialog } from '@/app/_components';
import { useRouter } from '@/i18n/routing';
import { validateFenStructure } from '@blindfold-chess/features/chess-core';
import { flushSync } from 'react-dom';
import { FiInfo } from 'react-icons/fi';

import { type BoardAnnotations, EMPTY_BOARD_ANNOTATIONS } from '@/lib/board-annotations/types';
import type { ChunkFeedbackTopic, ChunkStatus } from '@/lib/chunks/validation';

import { useFenBoardEditor } from '@/app/[locale]/(public)/practice/(free-play)/_hooks/use-fen-board-editor';
import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';

import { deleteChunk } from '../_actions/deleteChunk';
import { publishChunk } from '../_actions/publishChunk';
import { updateChunk } from '../_actions/updateChunk';
import {
  type ChunkDraftV1,
  clearChunkDraft,
  readChunkDraft,
  writeChunkDraft,
} from '../_lib/draft-storage';
import { localizeChunkError } from '../_lib/localize-error';
import { ChunkFormFields } from './ChunkFormFields';

export type ChunkFormInitial = {
  id: string;
  representativeFen: string;
  title: string;
  slug: string;
  description: string | null;
  annotations: BoardAnnotations;
  /**
   * Topics the chunk currently has flagged on the server. Used to
   * pre-populate the checkbox group on the edit form so the author can
   * see (and tweak) the same set the detail-page callout is
   * displaying.
   */
  feedbackTopics: readonly ChunkFeedbackTopic[];
};

type CreateProps = {
  mode: 'create';
  /**
   * Skip the unsaved-changes navigation guard. Set when the form is
   * rendered behind a guest sign-up overlay so the overlay's CTAs are
   * not blocked by a confirm dialog the guest didn't summon.
   */
  disableUnsavedGuard?: boolean;
};

type EditProps = {
  mode: 'edit';
  initial: ChunkFormInitial;
  disableUnsavedGuard?: boolean;
};

type Props = CreateProps | EditProps;

const validateFenForChunks = (fen: string) => validateFenStructure(fen).ok;

const FORM_ERROR_CODES = new Set([
  'signInRequired',
  'banned',
  'rateLimited',
  'slugTaken',
  'notFound',
  'unauthorized',
  'alreadyDeleted',
  'cannotEditPublished',
  'invalidFeedbackTopic',
  'descriptionRequired',
]);

/**
 * Form shell for chunk authoring.
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
  // The publish-from-edit affordance reaches into the chunk-level
  // `actions.*` keys (publish CTA, confirmation copy, the same
  // "needs description" guard wording the detail-page button uses)
  // so the proof-of-publish UX stays consistent across surfaces.
  const tChunks = useTranslations('chunks');

  const initialFen = mode === 'edit' ? props.initial.representativeFen : undefined;

  const board = useFenBoardEditor({
    initialFen,
    validate: validateFenForChunks,
  });

  const [title, setTitle] = useState(mode === 'edit' ? props.initial.title : '');
  const [slug, setSlug] = useState(mode === 'edit' ? props.initial.slug : '');
  const [description, setDescription] = useState(
    mode === 'edit' ? (props.initial.description ?? '') : ''
  );
  const [annotations, setAnnotations] = useState<BoardAnnotations>(
    mode === 'edit' ? props.initial.annotations : EMPTY_BOARD_ANNOTATIONS
  );
  // The lifecycle toggle is only meaningful in create mode. Edit mode
  // can only run against an already-draft row (the page guard blocks
  // published chunks from reaching this form), so we pin it to 'draft'
  // and never surface the toggle.
  const [status, setStatus] = useState<ChunkStatus>('draft');
  const [feedbackTopics, setFeedbackTopics] = useState<ChunkFeedbackTopic[]>(
    mode === 'edit' ? [...props.initial.feedbackTopics] : []
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [publishPending, setPublishPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);
  // Captured at handlePublish time so the post-publish redirect lands
  // on the freshly-renamed URL (matches handleSubmit's `targetSlug`).
  const [publishTargetSlug, setPublishTargetSlug] = useState<string | null>(null);
  const [startOverOpen, setStartOverOpen] = useState(false);
  const [hydratedFromDraft, setHydratedFromDraft] = useState(false);

  // Rehydrate from sessionStorage when re-entering the create form (e.g.
  // via the preview's "Back to edit" button). Edit mode skips this path
  // entirely since its seed data comes from the server.
  useEffect(() => {
    if (mode !== 'create') return;
    const draft = readChunkDraft();
    if (!draft) return;
    board.setFenInput(draft.representativeFen);
    board.setBoardFen(draft.representativeFen);
    board.setSideToMove(draft.sideToMove);
    board.setActiveTab(draft.activeTab);
    board.setFlipped(draft.flipped);
    board.setUserFlipped(draft.userFlipped);
    setTitle(draft.title);
    setSlug(draft.slug);
    setDescription(draft.description);
    setAnnotations(draft.annotations);
    setStatus(draft.status);
    setFeedbackTopics(draft.feedbackTopics);
    setHydratedFromDraft(true);
    // The board hook is stable for the lifetime of this component —
    // omit it from deps so a setter identity change doesn't re-hydrate
    // and clobber subsequent user edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const isDirty =
    !submitted &&
    (mode === 'create'
      ? board.trimmedFen !== '' ||
        title.trim() !== '' ||
        slug.trim() !== '' ||
        description.trim() !== ''
      : board.trimmedFen !== (props as EditProps).initial.representativeFen ||
        title !== (props as EditProps).initial.title ||
        slug !== (props as EditProps).initial.slug ||
        description !== ((props as EditProps).initial.description ?? ''));

  const { isBlocking, confirm, cancel } = useUnsavedChanges({
    isDirty: disableUnsavedGuard ? false : isDirty,
  });

  function handleStartOver() {
    clearChunkDraft();
    board.resetBoard();
    setTitle('');
    setSlug('');
    setDescription('');
    setAnnotations(EMPTY_BOARD_ANNOTATIONS);
    setStatus('draft');
    setFeedbackTopics([]);
    setError(null);
    setHydratedFromDraft(false);
    setStartOverOpen(false);
  }

  // Persist the current edit-form state through `updateChunk`. Shared
  // by the plain Save flow and the Save-before-Publish flow so the
  // payload shape — including the "send slug only when changed"
  // optimisation and the empty-array-wipes contract for feedbackTopics —
  // stays single-sourced. Returns the slug to navigate to on success
  // so callers don't have to recompute `slugChanged` themselves.
  async function saveEdit(
    initial: ChunkFormInitial
  ): Promise<{ ok: true; targetSlug: string } | { ok: false }> {
    setPending(true);
    const slugChanged = slug.trim() !== initial.slug;
    const result = await updateChunk(initial.id, {
      representativeFen: board.trimmedFen,
      title,
      ...(slugChanged ? { slug: slug.trim() } : {}),
      description: description || null,
      annotations,
      feedbackTopics,
    });
    setPending(false);

    if ('error' in result) {
      setError(localizeChunkError(result.error, t, FORM_ERROR_CODES));
      return { ok: false };
    }
    return { ok: true, targetSlug: slugChanged ? slug.trim() : initial.slug };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === 'create') {
      if (!board.isFenValid) {
        setError(t('errors.invalidFen'));
        return;
      }
      if (title.trim() === '') {
        setError(t('errors.titleRequired'));
        return;
      }
      if (slug.trim() === '') {
        setError(t('errors.slugRequired'));
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

      // flushSync so the isDirty -> false re-render completes before
      // router.push triggers the navigation guard.
      flushSync(() => setSubmitted(true));
      router.push('/chunks/new/preview');
      return;
    }

    const result = await saveEdit(props.initial);
    if (!result.ok) return;

    flushSync(() => setSubmitted(true));
    // Land on the freshly-renamed URL when the slug changed —
    // otherwise the old detail URL 404s after revalidation.
    router.push(`/chunks/${result.targetSlug}` as '/chunks/[slug]');
  }

  /**
   * Save (when dirty) then open the publish-confirmation modal. Saves
   * are routed through the same `updateChunk` Server Action as Save,
   * so slug rename + topic_posts cascade + validation errors come out
   * uniformly. The synchronous description-required gate mirrors the
   * server-side `publishChunkEntry` guard, surfacing the rule before
   * the user has to bounce off the publish action.
   */
  async function handlePublish() {
    if (mode !== 'edit') return;
    setError(null);

    let finalSlug = props.initial.slug;
    if (isDirty) {
      const saveResult = await saveEdit(props.initial);
      if (!saveResult.ok) return;
      finalSlug = saveResult.targetSlug;
    }

    if (description.trim().length === 0) {
      // The server enforces the same rule via `descriptionRequired`,
      // but raising it inline keeps the user on the field they need
      // to fix instead of bouncing them out to a modal.
      setError(t('errors.descriptionRequired'));
      return;
    }

    setPublishTargetSlug(finalSlug);
    setPublishConfirmOpen(true);
  }

  async function handlePublishConfirm() {
    if (mode !== 'edit') return;
    setPublishConfirmOpen(false);
    setPublishPending(true);
    setError(null);

    const result = await publishChunk(props.initial.id);
    setPublishPending(false);

    if ('error' in result) {
      setError(localizeChunkError(result.error, t, FORM_ERROR_CODES));
      return;
    }

    flushSync(() => setSubmitted(true));
    router.push(`/chunks/${publishTargetSlug ?? props.initial.slug}` as '/chunks/[slug]');
  }

  async function handleDelete() {
    if (mode !== 'edit') return;
    setDeleteConfirmOpen(false);
    setDeletePending(true);
    setError(null);

    const result = await deleteChunk(props.initial.id);
    setDeletePending(false);

    if ('error' in result) {
      setError(localizeChunkError(result.error, t, FORM_ERROR_CODES));
      return;
    }

    flushSync(() => setSubmitted(true));
    router.push('/chunks');
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
          onTitleChange={setTitle}
          description={description}
          onDescriptionChange={setDescription}
          slug={slug}
          onSlugChange={setSlug}
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
              onClick={handlePublish}
            >
              {publishPending ? tChunks('actions.publishPending') : tChunks('actions.publish')}
            </Button>
            <button
              type="button"
              onClick={() => setDeleteConfirmOpen(true)}
              disabled={pending || deletePending || publishPending}
              className="w-full px-4 py-2 text-sm rounded border border-destructive text-destructive hover:bg-destructive/10 disabled:opacity-50 transition-colors"
            >
              {deletePending ? t('actions.deleting') : t('actions.delete')}
            </button>
          </>
        )}
      </form>

      <ConfirmationModal
        isOpen={deleteConfirmOpen}
        title={t('delete.confirmTitle')}
        message={t('delete.confirmBody')}
        confirmText={t('delete.confirm')}
        cancelText={t('delete.cancel')}
        confirmVariant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmOpen(false)}
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
        isOpen={publishConfirmOpen}
        title={tChunks('actions.publishConfirmTitle')}
        message={tChunks('actions.publishConfirmMessage')}
        confirmText={tChunks('actions.publishConfirmCta')}
        cancelText={tChunks('actions.publishConfirmCancel')}
        confirmVariant="primary"
        onConfirm={handlePublishConfirm}
        onCancel={() => setPublishConfirmOpen(false)}
      />

      <UnsavedChangesDialog open={isBlocking} onCancel={cancel} onConfirm={confirm} />
    </>
  );
}
