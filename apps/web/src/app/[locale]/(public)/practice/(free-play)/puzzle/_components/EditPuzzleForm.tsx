'use client';

import { useMemo, useRef, useState } from 'react';

import { useTranslations } from 'next-intl';

import { useUnsavedChanges } from '@/_hooks/useUnsavedChanges';
import { Button, UnsavedChangesDialog } from '@/app/_components';
import { useRouter } from '@/i18n/routing';
import { flushSync } from 'react-dom';

import type { ChunkOption } from '@/lib/chunks/types';
import type { ThemeOption } from '@/lib/themes/types';

import { updatePuzzle } from '../_actions/updatePuzzle';
import { usePuzzleFormComposition } from '../_hooks/use-puzzle-form-composition';
import { validatePuzzleForm } from '../_lib/validate-puzzle-form';
import { PuzzleFormFields } from './PuzzleFormFields';

type Props = {
  positionId: string;
  initial: {
    title: string;
    description: string | null;
    fen: string;
    solutionMoves: Array<{ san: string; note: string | null }>;
    themes: ThemeOption[];
    chunks: ChunkOption[];
  };
  available: {
    themes: ThemeOption[];
    chunks: ChunkOption[];
  };
};

export function EditPuzzleForm({ positionId, initial, available }: Props) {
  const router = useRouter();
  const t = useTranslations('practice.puzzle.edit');
  const tCreate = useTranslations('practice.puzzle.create');
  const tUnsaved = useTranslations('unsavedChanges');

  const initialMovesRef = useRef(initial.solutionMoves.map((m) => m.san));
  const initialNotesRef = useRef(initial.solutionMoves.map((m) => m.note ?? ''));
  const initialDescription = initial.description ?? '';
  const initialThemeIdsRef = useRef(initial.themes.map((t) => t.id));
  const initialChunkIdsRef = useRef(initial.chunks.map((c) => c.id));

  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initialDescription);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const { board, solution, tags } = usePuzzleFormComposition({
    initialFen: initial.fen,
    initialMoves: initialMovesRef.current,
    initialNotes: initialNotesRef.current,
    initialThemes: initial.themes,
    initialChunks: initial.chunks,
  });

  const themeIds = useMemo(() => tags.selectedThemes.map((t) => t.id), [tags.selectedThemes]);
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

  const initialMoves = initialMovesRef.current;
  const initialNotes = initialNotesRef.current;
  const movesChanged =
    solution.moves.length !== initialMoves.length ||
    solution.moves.some((m, i) => m !== initialMoves[i]);
  const notesChanged =
    solution.notes.length !== initialNotes.length ||
    solution.notes.some((n, i) => n !== initialNotes[i]);

  const isDirty =
    !submitted &&
    (title !== initial.title ||
      description !== initialDescription ||
      board.fenInput.trim() !== initial.fen ||
      movesChanged ||
      notesChanged ||
      tagsChanged);

  const { isBlocking, confirm, cancel } = useUnsavedChanges({ isDirty });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!validatePuzzleForm(board, solution, tCreate('solutionRequired'))) {
      return;
    }

    setPending(true);
    try {
      const result = await updatePuzzle({
        id: positionId,
        fen: board.trimmedFen,
        title,
        description: description || null,
        solutionMoves: solution.moves.map((san, i) => ({ san, note: solution.notes[i] || null })),
        themeIds,
        chunkIds,
      });

      if ('error' in result) {
        setError(result.error);
        return;
      }

      flushSync(() => setSubmitted(true));
      router.push(`/practice/puzzle/${positionId}?toast=puzzle_updated`);
    } catch {
      setError(t('saveError'));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 rounded bg-destructive-soft text-destructive-soft-foreground text-sm">
            {error}
          </div>
        )}

        <PuzzleFormFields
          board={board}
          solution={solution}
          tags={tags}
          title={title}
          onTitleChange={setTitle}
          description={description}
          onDescriptionChange={setDescription}
          pending={pending}
          availableThemes={available.themes}
          availableChunks={available.chunks}
        />

        <Button
          type="submit"
          variant="primary"
          fullWidth
          disabled={
            pending ||
            !board.isFenValid ||
            solution.moves.length === 0 ||
            title.trim() === '' ||
            !isDirty
          }
        >
          {pending ? t('submitting') : t('submit')}
        </Button>
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
