'use client';

import { useMemo, useRef, useState } from 'react';

import { useTranslations } from 'next-intl';

import { useSubmitError } from '@/_hooks/useSubmitError';
import { useUnsavedChanges } from '@/_hooks/useUnsavedChanges';
import { Button, FormActionFooter, FormErrorBanner, UnsavedChangesDialog } from '@/app/_components';
import { useRouter } from '@/i18n/routing';
import { flushSync } from 'react-dom';

import type { ChunkOption } from '@/lib/chunks/types';
import type { ThemeOption } from '@/lib/themes/types';

import { useFenBoardEditor } from '@/app/[locale]/(public)/practice/(free-play)/_hooks/use-fen-board-editor';
import { useTagSelection } from '@/app/[locale]/(public)/practice/(free-play)/_hooks/use-tag-selection';

import { updatePosition } from '../_actions/updatePosition';
import { type PositionFormField, validatePositionForm } from '../_lib/position-form-validation';
import { PositionFormFields } from './PositionFormFields';

type Props = {
  positionId: string;
  initial: {
    fen: string;
    title: string;
    description: string | null;
    themes: ThemeOption[];
    chunks: ChunkOption[];
  };
  available: {
    themes: ThemeOption[];
    chunks: ChunkOption[];
  };
};

export function EditPositionForm({ positionId, initial, available }: Props) {
  const router = useRouter();
  const t = useTranslations('practice.positionMemory.edit');
  // The field-level validation messages live alongside the field labels,
  // which `PositionFormFields` reads from the `create` namespace.
  const tCreate = useTranslations('practice.positionMemory.create');
  const tUnsaved = useTranslations('unsavedChanges');

  const initialDescription = initial.description ?? '';
  const initialThemeIdsRef = useRef(initial.themes.map((th) => th.id));
  const initialChunkIdsRef = useRef(initial.chunks.map((c) => c.id));

  const board = useFenBoardEditor({ initialFen: initial.fen });
  const tags = useTagSelection({ initialThemes: initial.themes, initialChunks: initial.chunks });
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initialDescription);
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // A rejected position has no text control to focus while the board tab
  // is showing, so it anchors on the position block instead.
  const submitError = useSubmitError<PositionFormField>((field) =>
    field === 'title' ? 'title' : board.activeTab === 'board' ? 'position-editor' : 'fen'
  );

  const themeIds = useMemo(() => tags.selectedThemes.map((th) => th.id), [tags.selectedThemes]);
  const chunkIds = useMemo(() => tags.selectedChunks.map((c) => c.id), [tags.selectedChunks]);

  const tagsChanged = useMemo(() => {
    const initialThemeIds = initialThemeIdsRef.current;
    const initialChunkIds = initialChunkIdsRef.current;
    if (themeIds.length !== initialThemeIds.length) return true;
    if (chunkIds.length !== initialChunkIds.length) return true;
    const themeSet = new Set(initialThemeIds);
    const chunkSet = new Set(initialChunkIds);
    return themeIds.some((id) => !themeSet.has(id)) || chunkIds.some((id) => !chunkSet.has(id));
  }, [themeIds, chunkIds]);

  const isDirty =
    !submitted &&
    (title !== initial.title ||
      description !== initialDescription ||
      board.fenInput.trim() !== initial.fen ||
      tagsChanged);

  const { isBlocking, confirm, cancel } = useUnsavedChanges({ isDirty });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    submitError.clear();
    board.setPositionError(false);

    const invalid = validatePositionForm({
      trimmedFen: board.trimmedFen,
      isFenValid: board.isFenValid,
      title,
    });
    if (invalid) {
      submitError.report(invalid.field, tCreate(invalid.key));
      return;
    }

    setPending(true);
    try {
      const result = await updatePosition({
        id: positionId,
        fen: board.trimmedFen,
        title,
        description: description || null,
        themeIds,
        chunkIds,
      });

      if ('error' in result) {
        submitError.report(null, result.error);
        return;
      }

      flushSync(() => setSubmitted(true));
      router.push(`/practice/position-memory/${positionId}?toast=position_updated`);
    } catch {
      submitError.report(null, t('saveError'));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      {/*
       * `noValidate`: the browser's own bubble on `required` would fire
       * first and speak the browser's locale, not the app's. The submit
       * gate below owns the message and the focus move.
       */}
      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <FormErrorBanner ref={submitError.summaryRef} message={submitError.formMessage} />

        <PositionFormFields
          board={board}
          tags={tags}
          title={title}
          onTitleChange={setTitle}
          description={description}
          onDescriptionChange={setDescription}
          pending={pending}
          availableThemes={available.themes}
          availableChunks={available.chunks}
          messageFor={submitError.messageFor}
        />

        <FormActionFooter
          cancel={{
            label: t('cancel'),
            onClick: () => router.push(`/practice/position-memory/${positionId}`),
            disabled: pending,
          }}
        >
          {/*
           * `!isDirty` still disables — "nothing to save" is a state, not
           * an error to report. Invalid *content*, by contrast, stays
           * clickable so `handleSubmit` can say what is wrong and put the
           * cursor on it.
           */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            disabled={pending || !isDirty}
          >
            {pending ? t('submitting') : t('submit')}
          </Button>
        </FormActionFooter>
      </form>

      <UnsavedChangesDialog
        open={isBlocking}
        onConfirm={confirm}
        onCancel={cancel}
        title={tUnsaved('title')}
        message={tUnsaved('message')}
        confirmLabel={tUnsaved('confirm')}
        cancelLabel={tUnsaved('cancel')}
      />
    </>
  );
}
