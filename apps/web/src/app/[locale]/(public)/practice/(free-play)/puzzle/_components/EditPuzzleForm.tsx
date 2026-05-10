'use client';

import { useMemo, useRef, useState } from 'react';

import { useTranslations } from 'next-intl';

import { useUnsavedChanges } from '@/_hooks/useUnsavedChanges';
import { BoardSkeleton, Button, FlipBoardButton, UnsavedChangesDialog } from '@/app/_components';
import { useRouter } from '@/i18n/routing';
import { flushSync } from 'react-dom';

import type { ChunkOption } from '@/lib/chunks/types';
import { PUZZLE_NOTE_MAX_LENGTH } from '@/lib/positions/validation';
import type { ThemeOption } from '@/lib/themes/types';

import { EditableChessBoard } from '@/app/[locale]/(public)/practice/(free-play)/_components/EditableChessBoard';
import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';
import { MoveInputPanel } from '@/app/[locale]/_components/MoveInputPanel';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import { updatePuzzle } from '../_actions/updatePuzzle';
import { useEditableBoardLabels } from '../_hooks/use-editable-board-labels';
import { useFenBoardEditor } from '../_hooks/use-fen-board-editor';
import { usePuzzleSolutionMoves } from '../_hooks/use-puzzle-solution-moves';
import { usePuzzleTagSelection } from '../_hooks/use-puzzle-tag-selection';
import { useTagPickerLabels } from '../_hooks/use-tag-picker-labels';
import { MAX_SOLUTION_MOVES } from '../_lib/puzzle-form-constants';
import { PuzzleTagPicker } from './PuzzleTagPicker';
import { SolutionMoveList } from './SolutionMoveList';

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
  const tPlay = useTranslations('play');
  const tUnsaved = useTranslations('unsavedChanges');
  const tagPickerLabels = useTagPickerLabels();
  const editableBoardLabels = useEditableBoardLabels();
  const { preferences, updatePreferences, isLoaded } = useGamePreferences();

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
  const [clearBoardOpen, setClearBoardOpen] = useState(false);

  // Compose the three authoring hooks. `solution` needs `board.baseFen`
  // to validate new moves, and `board` needs to reset `solution` when
  // the position changes — break the cycle with a ref that the board's
  // onBoardChange dereferences lazily.
  const solutionResetRef = useRef<() => void>(() => {});
  const board = useFenBoardEditor({
    initialFen: initial.fen,
    onBoardChange: () => solutionResetRef.current(),
  });
  const solution = usePuzzleSolutionMoves({
    baseFen: board.baseFen,
    initialMoves: initialMovesRef.current,
    initialNotes: initialNotesRef.current,
  });
  solutionResetRef.current = solution.reset;
  const tags = usePuzzleTagSelection({
    initialThemes: initial.themes,
    initialChunks: initial.chunks,
  });
  const handleMoveSubmit = useMemo(
    () =>
      solution.makeMoveSubmitHandler({
        positionInvalid: tCreate('positionInvalid'),
        maxMovesReached: tCreate('maxMovesReached'),
        invalidMove: tPlay('invalidMove'),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [board.baseFen, solution.currentFen, solution.moves, tCreate, tPlay]
  );

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
    board.setPositionError(false);
    solution.setSolutionError(null);

    if (!board.trimmedFen || !board.isFenValid) {
      board.setPositionError(true);
      return;
    }

    if (solution.moves.length === 0) {
      solution.setSolutionError(tCreate('solutionRequired'));
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

  const reachedMaxMoves = solution.moves.length >= MAX_SOLUTION_MOVES;

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 rounded bg-destructive-soft text-destructive-soft-foreground text-sm">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="title" className="block text-sm font-medium mb-1">
            {tCreate('titleLabel')} <span className="text-destructive">*</span>
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 rounded border border-border bg-card text-foreground"
            required
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium mb-1">
            {tCreate('descriptionLabel')}
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 rounded border border-border bg-card text-foreground"
          />
        </div>

        <nav className="flex rounded-lg bg-secondary p-1" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={board.activeTab === 'board'}
            onClick={() => board.setActiveTab('board')}
            className={`flex-1 rounded-md px-4 py-2 text-center text-sm font-medium transition-colors ${
              board.activeTab === 'board'
                ? 'bg-card text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tCreate('tabBoard')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={board.activeTab === 'fen'}
            onClick={() => board.setActiveTab('fen')}
            className={`flex-1 rounded-md px-4 py-2 text-center text-sm font-medium transition-colors ${
              board.activeTab === 'fen'
                ? 'bg-card text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tCreate('tabFen')}
          </button>
        </nav>

        {board.activeTab === 'board' && (
          <>
            <div className="flex items-center justify-between gap-2 mb-2">
              <div
                role="radiogroup"
                aria-label={tCreate('sideToMove')}
                className="inline-flex rounded-md border border-border overflow-hidden text-sm"
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={board.sideToMove === 'w'}
                  onClick={() => board.handleSideToMoveChange('w')}
                  className={`px-3 py-1.5 transition-colors ${
                    board.sideToMove === 'w'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {tCreate('sideWhite')}
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={board.sideToMove === 'b'}
                  onClick={() => board.handleSideToMoveChange('b')}
                  className={`px-3 py-1.5 transition-colors ${
                    board.sideToMove === 'b'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {tCreate('sideBlack')}
                </button>
              </div>
              <FlipBoardButton onClick={board.handleFlip} title={tCreate('flipBoard')} />
            </div>
            <div className="flex justify-center">
              <div className="w-full max-w-md">
                {!isLoaded ? (
                  <BoardSkeleton />
                ) : (
                  <EditableChessBoard
                    fen={board.boardFen}
                    onFenChange={board.handleBoardChange}
                    labels={editableBoardLabels}
                    editable={true}
                    flipped={board.flipped}
                    showCoordinates={true}
                    boardTheme={preferences.boardTheme}
                  />
                )}
              </div>
            </div>

            {board.positionError && (
              <p className="text-sm text-destructive text-center">{tCreate('positionInvalid')}</p>
            )}

            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setClearBoardOpen(true)}
                className="px-3 py-1 text-sm rounded border border-border text-muted-foreground hover:bg-muted transition-colors"
              >
                {tCreate('clearBoard')}
              </button>
            </div>
          </>
        )}

        {board.activeTab === 'fen' && (
          <div>
            <label htmlFor="fen" className="block text-sm font-medium mb-1">
              {tCreate('fenLabel')}
            </label>
            <textarea
              id="fen"
              value={board.fenInput}
              onChange={board.handleFenInputChange}
              placeholder="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
              rows={2}
              className="w-full px-3 py-2 rounded border border-border bg-card text-foreground text-sm font-mono"
            />
            {board.fenInput.trim() && !board.isFenValid && (
              <p className="text-sm text-destructive mt-1">{tCreate('fenInvalid')}</p>
            )}
          </div>
        )}

        {board.turnIndicator && (
          <p className="text-sm text-muted-foreground text-center">
            <span aria-hidden className="mr-1">
              {board.turnIndicator === 'w' ? '⚪' : '⚫'}
            </span>
            {board.turnIndicator === 'w' ? tCreate('whiteToMove') : tCreate('blackToMove')}
          </p>
        )}

        {board.isFenValid && (
          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <label className="text-sm font-medium">
                {tCreate('solutionSection')} <span className="text-destructive">*</span>
              </label>
              <span className="text-xs text-muted-foreground">
                {solution.moves.length} / {MAX_SOLUTION_MOVES}
              </span>
            </div>

            {solution.moves.length > 0 && (
              <SolutionMoveList
                moves={solution.moves}
                firstTurn={solution.firstTurn}
                onRemoveLast={solution.handleRemoveLast}
                removeAriaLabel={tCreate('removeLastMove', {
                  move: solution.moves[solution.moves.length - 1]!,
                })}
                disabled={pending}
                renderAfter={(index) => (
                  <input
                    type="text"
                    value={solution.notes[index] ?? ''}
                    onChange={(e) => solution.handleNoteChange(index, e.target.value)}
                    maxLength={PUZZLE_NOTE_MAX_LENGTH}
                    placeholder={tCreate('addMoveNote')}
                    aria-label={tCreate('noteAriaLabel', { move: solution.moves[index]! })}
                    className="w-full px-2 py-1 rounded border border-border bg-card text-foreground text-sm"
                  />
                )}
              />
            )}

            {reachedMaxMoves ? (
              <p className="text-sm text-muted-foreground">{tCreate('maxMovesReached')}</p>
            ) : (
              <MoveInputPanel
                preferences={preferences}
                updatePreferences={updatePreferences}
                currentFen={solution.currentFen}
                moveInput={solution.moveInput}
                onMoveInputChange={solution.setMoveInput}
                error={solution.moveError}
                onErrorClear={() => solution.setMoveError(null)}
                onSubmit={handleMoveSubmit}
                disabled={pending}
                inputPlaceholder={tCreate('movePlaceholder')}
                selectPlaceholder={tPlay('selectMove')}
                toggleTitle={tPlay('switchInputMode')}
                playerColor={solution.currentTurn}
                showLegalMovesHint={false}
              />
            )}

            {solution.solutionError && (
              <p className="text-sm text-destructive">{solution.solutionError}</p>
            )}
          </div>
        )}

        <PuzzleTagPicker
          selectedThemes={tags.selectedThemes}
          selectedChunks={tags.selectedChunks}
          availableThemes={available.themes}
          availableChunks={available.chunks}
          disabled={pending}
          onChange={tags.handleTagChange}
          labels={tagPickerLabels}
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

      <ConfirmationModal
        isOpen={clearBoardOpen}
        title={tCreate('clearBoardConfirmTitle')}
        message={tCreate('clearBoardConfirmMessage')}
        confirmText={tCreate('clearBoardConfirmConfirm')}
        cancelText={tCreate('clearBoardConfirmCancel')}
        confirmVariant="danger"
        onConfirm={() => {
          setClearBoardOpen(false);
          board.handleClearBoard();
        }}
        onCancel={() => setClearBoardOpen(false)}
      />
    </>
  );
}
