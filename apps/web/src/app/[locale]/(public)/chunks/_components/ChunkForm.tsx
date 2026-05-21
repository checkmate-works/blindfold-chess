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

import { useFenBoardEditor } from '@/app/[locale]/(public)/practice/(free-play)/_hooks/use-fen-board-editor';
import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';

import { deleteChunk } from '../_actions/deleteChunk';
import { updateChunk } from '../_actions/updateChunk';
import {
  type ChunkDraftV1,
  clearChunkDraft,
  readChunkDraft,
  writeChunkDraft,
} from '../_lib/draft-storage';
import { ChunkFormFields } from './ChunkFormFields';

export type ChunkFormInitial = {
  id: string;
  representativeFen: string;
  title: string;
  slug: string;
  description: string | null;
  annotations: BoardAnnotations;
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

function localizeError(code: string, t: ReturnType<typeof useTranslations<'chunks.form'>>): string {
  const wellKnown = new Set([
    'signInRequired',
    'banned',
    'rateLimited',
    'slugTaken',
    'notFound',
    'unauthorized',
    'alreadyDeleted',
  ]);
  return wellKnown.has(code) ? t(`errors.${code}` as 'errors.signInRequired') : code;
}

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
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
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
    setError(null);
    setHydratedFromDraft(false);
    setStartOverOpen(false);
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

    setPending(true);
    const result = await updateChunk(props.initial.id, {
      representativeFen: board.trimmedFen,
      title,
      description: description || null,
      annotations,
    });
    setPending(false);

    if ('error' in result) {
      setError(localizeError(result.error, t));
      return;
    }

    flushSync(() => setSubmitted(true));
    router.push(`/chunks/${props.initial.slug}` as '/chunks/[slug]');
  }

  async function handleDelete() {
    if (mode !== 'edit') return;
    setDeleteConfirmOpen(false);
    setDeletePending(true);
    setError(null);

    const result = await deleteChunk(props.initial.id);
    setDeletePending(false);

    if ('error' in result) {
      setError(localizeError(result.error, t));
      return;
    }

    flushSync(() => setSubmitted(true));
    router.push('/chunks');
  }

  const submitDisabled =
    pending ||
    deletePending ||
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
          mode={mode}
          pending={pending || deletePending}
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
          <button
            type="button"
            onClick={() => setDeleteConfirmOpen(true)}
            disabled={pending || deletePending}
            className="w-full px-4 py-2 text-sm rounded border border-destructive text-destructive hover:bg-destructive/10 disabled:opacity-50 transition-colors"
          >
            {deletePending ? t('actions.deleting') : t('actions.delete')}
          </button>
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

      <UnsavedChangesDialog open={isBlocking} onCancel={cancel} onConfirm={confirm} />
    </>
  );
}
