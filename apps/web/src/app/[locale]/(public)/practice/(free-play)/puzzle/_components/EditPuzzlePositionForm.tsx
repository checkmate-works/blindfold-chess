'use client';

import { useMemo, useRef, useState } from 'react';

import { useTranslations } from 'next-intl';

import { useUnsavedChanges } from '@/_hooks/useUnsavedChanges';
import { UnsavedChangesDialog } from '@/app/_components';
import { useRouter } from '@/i18n/routing';
import { flushSync } from 'react-dom';

import type { ChunkOption } from '@/lib/chunks/types';
import type { ThemeOption } from '@/lib/themes/types';

import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';

import { useFenBoardEditor } from '../../_hooks/use-fen-board-editor';
import { useTagSelection } from '../../_hooks/use-tag-selection';
import { usePuzzleDraftHydration } from '../_hooks/use-puzzle-draft-hydration';
import type { PuzzleEditDraftV1 } from '../_lib/edit-draft-storage';
import { readEditDraft, writeEditDraft } from '../_lib/edit-draft-storage';
import { resolveOptionsByIds } from '../_lib/resolve-options';
import { validatePuzzlePosition } from '../_lib/validate-puzzle-form';
import { PuzzlePositionFields } from './PuzzlePositionFields';

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
  const tUnsaved = useTranslations('unsavedChanges');

  const initialMovesRef = useRef(initial.solutionMoves.map((m) => m.san));
  const initialNotesRef = useRef(initial.solutionMoves.map((m) => m.note ?? ''));
  const initialMoves = initialMovesRef.current;
  const initialNotes = initialNotesRef.current;
  const initialDescription = initial.description ?? '';
  const initialThemeIdsRef = useRef(initial.themes.map((t) => t.id));
  const initialChunkIdsRef = useRef(initial.chunks.map((c) => c.id));

  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initialDescription);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [positionChangedOpen, setPositionChangedOpen] = useState(false);

  const board = useFenBoardEditor({ initialFen: initial.fen });
  const tags = useTagSelection({ initialThemes: initial.themes, initialChunks: initial.chunks });

  // Solution moves are never edited on this step — carried through untouched
  // to the solution step, plus used to detect whether the position changed
  // under them (see handleContinue below).
  const [carriedMoves, setCarriedMoves] = useState<string[]>(initialMoves);
  const [carriedNotes, setCarriedNotes] = useState<string[]>(initialNotes);
  // The FEN `carriedMoves` are valid against. Reassigned inside the
  // hydration `apply` callback (not just at declaration) so a restored
  // edit-draft's fen/moves pair is never compared against a stale value.
  const originalFenRef = useRef(initial.fen);

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
      setCarriedMoves(draft.moves);
      setCarriedNotes(draft.notes);
      originalFenRef.current = draft.fen;
      tags.setSelectedThemes(resolveOptionsByIds(draft.themeIds, available.themes));
      tags.setSelectedChunks(resolveOptionsByIds(draft.chunkIds, available.chunks));
    },
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

  const movesChanged =
    carriedMoves.length !== initialMoves.length ||
    carriedMoves.some((m, i) => m !== initialMoves[i]);
  const notesChanged =
    carriedNotes.length !== initialNotes.length ||
    carriedNotes.some((n, i) => n !== initialNotes[i]);

  const isDirty =
    !submitted &&
    (title !== initial.title ||
      description !== initialDescription ||
      board.fenInput.trim() !== initial.fen ||
      movesChanged ||
      notesChanged ||
      tagsChanged);

  const { isBlocking, confirm, cancel } = useUnsavedChanges({ isDirty });

  function writeAndContinue(moves: string[], notes: string[]) {
    const ok = writeEditDraft(positionId, {
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
    });
    if (!ok) {
      setError(t('draftWriteFailed'));
      setPending(false);
      return;
    }
    flushSync(() => setSubmitted(true));
    router.push(`/practice/puzzle/${positionId}/edit/solution`);
  }

  function handleContinue() {
    setError(null);
    if (!validatePuzzlePosition(board)) return;

    setPending(true);

    const positionChanged = carriedMoves.length > 0 && board.trimmedFen !== originalFenRef.current;
    if (positionChanged) {
      setPositionChangedOpen(true);
      setPending(false);
      return;
    }

    writeAndContinue(carriedMoves, carriedNotes);
  }

  function handleConfirmPositionChanged() {
    setPositionChangedOpen(false);
    setPending(true);
    setCarriedMoves([]);
    setCarriedNotes([]);
    originalFenRef.current = board.trimmedFen;
    writeAndContinue([], []);
  }

  return (
    <>
      <div className="space-y-6">
        {error && (
          <div className="p-3 rounded bg-destructive-soft text-destructive-soft-foreground text-sm">
            {error}
          </div>
        )}

        <PuzzlePositionFields
          board={board}
          tags={tags}
          title={title}
          onTitleChange={setTitle}
          description={description}
          onDescriptionChange={setDescription}
          pending={pending}
          availableThemes={available.themes}
          availableChunks={available.chunks}
          onContinue={handleContinue}
          continueLabel={t('continueToSolution')}
        />
      </div>

      <UnsavedChangesDialog
        open={isBlocking}
        onConfirm={confirm}
        onCancel={cancel}
        title={tUnsaved('title')}
        message={tUnsaved('message')}
        confirmLabel={tUnsaved('confirm')}
        cancelLabel={tUnsaved('cancel')}
      />

      <ConfirmationModal
        isOpen={positionChangedOpen}
        title={t('positionChangedConfirmTitle')}
        message={t('positionChangedConfirmMessage')}
        confirmText={t('positionChangedConfirmConfirm')}
        cancelText={t('positionChangedConfirmCancel')}
        confirmVariant="danger"
        onConfirm={handleConfirmPositionChanged}
        onCancel={() => setPositionChangedOpen(false)}
      />
    </>
  );
}
