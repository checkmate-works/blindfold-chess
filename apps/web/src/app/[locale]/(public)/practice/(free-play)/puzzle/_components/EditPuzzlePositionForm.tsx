'use client';

import { useMemo, useRef, useState } from 'react';

import { useTranslations } from 'next-intl';

import { useUnsavedChanges } from '@/_hooks/useUnsavedChanges';
import { FormErrorBanner } from '@/app/_components';
import { useRouter } from '@/i18n/routing';

import type { ChunkOption } from '@/lib/chunks/types';
import type { ThemeOption } from '@/lib/themes/types';

import { useFenBoardEditor } from '../../_hooks/use-fen-board-editor';
import { useTagSelection } from '../../_hooks/use-tag-selection';
import { resolveOptionsByIds } from '../../_lib/resolve-options';
import { usePuzzleDraftHydration } from '../_hooks/use-puzzle-draft-hydration';
import { usePuzzlePositionStep } from '../_hooks/use-puzzle-position-step';
import type { PuzzleEditDraftV1 } from '../_lib/edit-draft-storage';
import { readEditDraft, writeEditDraft } from '../_lib/edit-draft-storage';
import { stringArraysEqual } from '../_lib/string-arrays-equal';
import { PositionChangedModal } from './PositionChangedModal';
import { PuzzlePositionFields } from './PuzzlePositionFields';
import { PuzzleStepIndicator } from './PuzzleStepIndicator';
import { PuzzleUnsavedChangesDialog } from './PuzzleUnsavedChangesDialog';

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

export function EditPuzzlePositionForm({ positionId, initial, available }: Props) {
  const router = useRouter();
  const t = useTranslations('practice.puzzle.create');

  const initialMovesRef = useRef(initial.solutionMoves.map((m) => m.san));
  const initialNotesRef = useRef(initial.solutionMoves.map((m) => m.note ?? ''));
  const initialMoves = initialMovesRef.current;
  const initialNotes = initialNotesRef.current;
  const initialDescription = initial.description ?? '';
  const initialThemeIdsRef = useRef(initial.themes.map((t) => t.id));
  const initialChunkIdsRef = useRef(initial.chunks.map((c) => c.id));

  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initialDescription);

  const board = useFenBoardEditor({ initialFen: initial.fen });
  const tags = useTagSelection({ initialThemes: initial.themes, initialChunks: initial.chunks });

  const themeIds = useMemo(() => tags.selectedThemes.map((t) => t.id), [tags.selectedThemes]);
  const chunkIds = useMemo(() => tags.selectedChunks.map((c) => c.id), [tags.selectedChunks]);

  const step = usePuzzlePositionStep({
    board,
    title,
    initialMoves,
    initialNotes,
    initialFen: initial.fen,
    writeDraft: (moves, notes) =>
      writeEditDraft(positionId, {
        version: 1,
        fen: board.trimmedFen,
        title,
        description,
        moves,
        notes,
        activeTab: board.activeTab,
        sideToMove: board.sideToMove,
        flipped: board.flipped,
        themeIds,
        chunkIds,
      }),
    nextPath: `/practice/puzzle/${positionId}/edit/solution`,
    draftWriteFailedMessage: t('draftWriteFailed'),
  });

  // Resume an in-progress edit (e.g. returning from the solution step's Back
  // button, or a reload mid-edit) from the ID-scoped edit draft; otherwise
  // the DB-loaded `initial` values already seeded every field above.
  usePuzzleDraftHydration<PuzzleEditDraftV1>({
    read: () => readEditDraft(positionId),
    apply: (draft) => {
      board.setFenInput(draft.fen);
      board.setBoardFen(draft.fen);
      board.setSideToMove(draft.sideToMove);
      board.setActiveTab(draft.activeTab);
      board.setFlipped(draft.flipped);
      setTitle(draft.title);
      setDescription(draft.description);
      step.seedCarried(draft.moves, draft.notes, draft.fen);
      tags.setSelectedThemes(resolveOptionsByIds(draft.themeIds, available.themes));
      tags.setSelectedChunks(resolveOptionsByIds(draft.chunkIds, available.chunks));
    },
  });

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
    !step.submitted &&
    (title !== initial.title ||
      description !== initialDescription ||
      board.fenInput.trim() !== initial.fen ||
      !stringArraysEqual(step.carriedMoves, initialMoves) ||
      !stringArraysEqual(step.carriedNotes, initialNotes) ||
      tagsChanged);

  const { isBlocking, confirm, cancel } = useUnsavedChanges({ isDirty });

  return (
    <>
      <div className="space-y-6">
        <PuzzleStepIndicator flow="edit" current="position" />

        <FormErrorBanner ref={step.submitError.summaryRef} message={step.submitError.formMessage} />

        <PuzzlePositionFields
          board={board}
          tags={tags}
          title={title}
          onTitleChange={setTitle}
          description={description}
          onDescriptionChange={setDescription}
          pending={step.pending}
          availableThemes={available.themes}
          availableChunks={available.chunks}
          onContinue={step.handleContinue}
          continueLabel={t('continueToSolution')}
          onCancel={() => router.push(`/practice/puzzle/${positionId}`)}
          cancelLabel={t('cancel')}
          messageFor={step.submitError.messageFor}
        />
      </div>

      <PuzzleUnsavedChangesDialog open={isBlocking} onConfirm={confirm} onCancel={cancel} />

      <PositionChangedModal
        isOpen={step.positionChangedOpen}
        onConfirm={step.confirmPositionChanged}
        onCancel={step.cancelPositionChanged}
      />
    </>
  );
}
