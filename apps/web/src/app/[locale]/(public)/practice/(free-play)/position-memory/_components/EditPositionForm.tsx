'use client';

import { useMemo, useRef, useState } from 'react';

import { useTranslations } from 'next-intl';

import { useUnsavedChanges } from '@/_hooks/useUnsavedChanges';
import { Button, FormErrorBanner, UnsavedChangesDialog } from '@/app/_components';
import { useRouter } from '@/i18n/routing';
import { flushSync } from 'react-dom';

import type { ChunkOption } from '@/lib/chunks/types';
import type { ThemeOption } from '@/lib/themes/types';

import { useFenBoardEditor } from '@/app/[locale]/(public)/practice/(free-play)/_hooks/use-fen-board-editor';
import { useTagSelection } from '@/app/[locale]/(public)/practice/(free-play)/_hooks/use-tag-selection';

import { updatePosition } from '../_actions/updatePosition';
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
  const tUnsaved = useTranslations('unsavedChanges');

  const initialDescription = initial.description ?? '';
  const initialThemeIdsRef = useRef(initial.themes.map((th) => th.id));
  const initialChunkIdsRef = useRef(initial.chunks.map((c) => c.id));

  const board = useFenBoardEditor({ initialFen: initial.fen });
  const tags = useTagSelection({ initialThemes: initial.themes, initialChunks: initial.chunks });
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initialDescription);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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
    setError(null);
    board.setPositionError(false);

    if (!board.trimmedFen || !board.isFenValid) {
      board.setPositionError(true);
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
        setError(result.error);
        return;
      }

      flushSync(() => setSubmitted(true));
      router.push(`/practice/position-memory/${positionId}?toast=position_updated`);
    } catch {
      setError(t('saveError'));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        <FormErrorBanner variant="soft" message={error} />

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
        />

        <div className="space-y-4">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            disabled={pending || !board.isFenValid || title.trim() === '' || !isDirty}
          >
            {pending ? t('submitting') : t('submit')}
          </Button>
          {/* Abandon editing and return to the detail page. A plain
              `router.push` (not a <Link>) so the unsaved-changes navigation
              guard still intercepts when there are pending edits. Mirrors the
              chunk / repertoire / line edit forms' cancel affordance. */}
          <button
            type="button"
            onClick={() => router.push(`/practice/position-memory/${positionId}`)}
            disabled={pending}
            className="block w-full text-center text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
          >
            {t('cancel')}
          </button>
        </div>
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
