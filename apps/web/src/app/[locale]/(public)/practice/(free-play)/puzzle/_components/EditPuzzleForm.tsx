'use client';

import { useCallback, useMemo, useRef, useState } from 'react';

import { useTranslations } from 'next-intl';

import { useUnsavedChanges } from '@/_hooks/useUnsavedChanges';
import { BoardSkeleton, Button, FlipBoardButton, UnsavedChangesDialog } from '@/app/_components';
import { useRouter } from '@/i18n/routing';
import { executeMove, getTurnFromFen, validateFen } from '@blindfold-chess/features/chess-core';
import type { AlgebraicNotation } from '@blindfold-chess/types';
import { flushSync } from 'react-dom';

import { PUZZLE_NOTE_MAX_LENGTH } from '@/lib/positions/validation';

import { EditableChessBoard } from '@/app/[locale]/(public)/practice/(free-play)/_components/EditableChessBoard';
import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';
import { MoveInputPanel } from '@/app/[locale]/_components/MoveInputPanel';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import { updatePuzzle } from '../_actions/updatePuzzle';
import type { ChunkOption, ThemeOption } from '../_lib/load-puzzle-tags';
import { PuzzleTagPicker } from './PuzzleTagPicker';
import { SolutionMoveList } from './SolutionMoveList';

const EMPTY_BOARD_FEN = '8/8/8/8/8/8/8/8 w - - 0 1';
const MAX_SOLUTION_MOVES = 20;

type EditorTab = 'board' | 'fen';
type SideToMove = 'w' | 'b';

function replaceSideToMove(fen: string, side: SideToMove): string {
  const parts = fen.trim().split(/\s+/);
  if (parts.length < 2) return fen;
  parts[1] = side;
  return parts.join(' ');
}

function readSideToMove(fen: string): SideToMove {
  const parts = fen.trim().split(/\s+/);
  return parts[1] === 'b' ? 'b' : 'w';
}

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
  const tBoard = useTranslations('practice.puzzle');
  const tTags = useTranslations('practice.puzzle.tags');
  const tPlay = useTranslations('play');
  const tUnsaved = useTranslations('unsavedChanges');
  const { preferences, updatePreferences, isLoaded } = useGamePreferences();

  const initialMovesRef = useRef(initial.solutionMoves.map((m) => m.san));
  const initialNotesRef = useRef(initial.solutionMoves.map((m) => m.note ?? ''));
  const initialDescription = initial.description ?? '';
  const initialThemeIdsRef = useRef(initial.themes.map((t) => t.id));
  const initialChunkIdsRef = useRef(initial.chunks.map((c) => c.id));

  const [fenInput, setFenInput] = useState(initial.fen);
  const [boardFen, setBoardFen] = useState(initial.fen);
  const [sideToMove, setSideToMove] = useState<SideToMove>(readSideToMove(initial.fen));
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initialDescription);
  const [moves, setMoves] = useState<string[]>(initialMovesRef.current);
  const [notes, setNotes] = useState<string[]>(initialNotesRef.current);
  const [moveInput, setMoveInput] = useState('');
  const [moveError, setMoveError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [positionError, setPositionError] = useState(false);
  const [solutionError, setSolutionError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [activeTab, setActiveTab] = useState<EditorTab>('board');
  const [flipped, setFlipped] = useState(readSideToMove(initial.fen) === 'b');
  const [userFlipped, setUserFlipped] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [clearBoardOpen, setClearBoardOpen] = useState(false);
  const [selectedThemes, setSelectedThemes] = useState<ThemeOption[]>(initial.themes);
  const [selectedChunks, setSelectedChunks] = useState<ChunkOption[]>(initial.chunks);

  const themeIds = useMemo(() => selectedThemes.map((t) => t.id), [selectedThemes]);
  const chunkIds = useMemo(() => selectedChunks.map((c) => c.id), [selectedChunks]);

  const handleTagChange = useCallback((themes: ThemeOption[], chunks: ChunkOption[]) => {
    setSelectedThemes(themes);
    setSelectedChunks(chunks);
  }, []);

  const tagsChanged = useMemo(() => {
    const initialThemeIds = initialThemeIdsRef.current;
    const initialChunkIds = initialChunkIdsRef.current;
    if (themeIds.length !== initialThemeIds.length) return true;
    if (chunkIds.length !== initialChunkIds.length) return true;
    const themeSet = new Set(initialThemeIds);
    const chunkSet = new Set(initialChunkIds);
    return themeIds.some((id) => !themeSet.has(id)) || chunkIds.some((id) => !chunkSet.has(id));
  }, [themeIds, chunkIds]);

  const tagPickerLabels = useMemo(
    () => ({
      section: tTags('section'),
      help: tTags('help'),
      placeholder: tTags('placeholder'),
      badgeTheme: tTags('badge.theme'),
      badgeChunk: tTags('badge.chunk'),
      noResults: tTags('noResults'),
      remove: (label: string) => tTags('remove', { label }),
      openDetail: (label: string) => tTags('openDetail', { label }),
      detail: {
        readingPrefix: tTags('detail.readingPrefix'),
        noDescription: tTags('detail.noDescription'),
        viewInGlossary: tTags('detail.viewInGlossary'),
        viewChunkPage: tTags('detail.viewChunkPage'),
        detach: tTags('detail.detach'),
        close: tTags('detail.close'),
      },
    }),
    [tTags]
  );

  const trimmedFen = fenInput.trim();
  const isFenValid = trimmedFen !== '' && validateFen(trimmedFen);
  const baseFen = isFenValid ? trimmedFen : '';

  // Replay the entered moves on top of baseFen for the move input panel's
  // "current FEN" — defensively returning the last good FEN if executeMove
  // ever rejects (handleMoveSubmit already validates each move before it
  // gets stored, so this should not normally fire).
  const currentFen = useMemo(() => {
    if (!baseFen) return '';
    let fen = baseFen;
    for (const move of moves) {
      const r = executeMove(fen, move);
      if (!r) return fen;
      fen = r.fen;
    }
    return fen;
  }, [baseFen, moves]);

  const firstTurn: SideToMove = useMemo(() => {
    if (!baseFen) return 'w';
    try {
      return getTurnFromFen(baseFen) as SideToMove;
    } catch {
      return 'w';
    }
  }, [baseFen]);

  const currentTurn: SideToMove = useMemo(() => {
    if (!currentFen) return firstTurn;
    try {
      return getTurnFromFen(currentFen) as SideToMove;
    } catch {
      return firstTurn;
    }
  }, [currentFen, firstTurn]);

  const initialMoves = initialMovesRef.current;
  const initialNotes = initialNotesRef.current;
  const movesChanged =
    moves.length !== initialMoves.length || moves.some((m, i) => m !== initialMoves[i]);
  const notesChanged =
    notes.length !== initialNotes.length || notes.some((n, i) => n !== initialNotes[i]);

  const isDirty =
    !submitted &&
    (title !== initial.title ||
      description !== initialDescription ||
      fenInput.trim() !== initial.fen ||
      movesChanged ||
      notesChanged ||
      tagsChanged);

  const { isBlocking, confirm, cancel } = useUnsavedChanges({ isDirty });

  const handleFlip = useCallback(() => {
    setFlipped((prev) => !prev);
    setUserFlipped(true);
  }, []);

  const turnIndicator = useMemo(() => {
    if (!isFenValid) return null;
    try {
      return getTurnFromFen(trimmedFen);
    } catch {
      return null;
    }
  }, [trimmedFen, isFenValid]);

  const editableBoardLabels = useMemo(
    () => ({
      whitePieces: tBoard('whitePieces'),
      blackPieces: tBoard('blackPieces'),
      removePieceMode: tBoard('removePieceMode'),
      placingPiece: tBoard('placingPiece'),
    }),
    [tBoard]
  );

  function resetSolutionState() {
    setMoves([]);
    setNotes([]);
    setMoveInput('');
    setMoveError(null);
    setSolutionError(null);
  }

  function handleFenInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value;
    setFenInput(value);
    if (value.trim() !== '' && validateFen(value.trim())) {
      setBoardFen(value.trim());
      setSideToMove(readSideToMove(value.trim()));
    }
    resetSolutionState();
  }

  function handleBoardChange(newFen: string) {
    const withSide = replaceSideToMove(newFen, sideToMove);
    setFenInput(withSide);
    setBoardFen(withSide);
    setPositionError(false);
    resetSolutionState();
  }

  function handleClearBoard() {
    setFenInput(EMPTY_BOARD_FEN);
    setBoardFen(EMPTY_BOARD_FEN);
    setSideToMove('w');
    setPositionError(false);
    setError(null);
    resetSolutionState();
  }

  function handleSideToMoveChange(next: SideToMove) {
    if (next === sideToMove) return;
    setSideToMove(next);
    const sourceFen = boardFen && validateFen(boardFen) ? boardFen : EMPTY_BOARD_FEN;
    const updated = replaceSideToMove(sourceFen, next);
    setBoardFen(updated);
    setFenInput(updated);
    if (next === 'b' && !userFlipped) {
      setFlipped(true);
    }
    resetSolutionState();
  }

  function handleMoveSubmit(move: AlgebraicNotation): boolean {
    const trimmed = move.trim();
    if (!trimmed) return false;
    if (!baseFen) {
      setMoveError(tCreate('positionInvalid'));
      return false;
    }
    if (moves.length >= MAX_SOLUTION_MOVES) {
      setMoveError(tCreate('maxMovesReached'));
      return false;
    }
    const r = executeMove(currentFen, trimmed);
    if (!r) {
      setMoveError(tPlay('invalidMove'));
      return false;
    }
    setMoves((prev) => [...prev, trimmed]);
    setNotes((prev) => [...prev, '']);
    setMoveInput('');
    setMoveError(null);
    setSolutionError(null);
    return true;
  }

  function handleRemoveLast() {
    setMoves((prev) => prev.slice(0, -1));
    setNotes((prev) => prev.slice(0, -1));
    setMoveError(null);
    setSolutionError(null);
  }

  function handleNoteChange(index: number, value: string) {
    setNotes((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPositionError(false);
    setSolutionError(null);

    if (!trimmedFen || !isFenValid) {
      setPositionError(true);
      return;
    }

    if (moves.length === 0) {
      setSolutionError(tCreate('solutionRequired'));
      return;
    }

    setPending(true);
    try {
      const result = await updatePuzzle({
        id: positionId,
        fen: trimmedFen,
        title,
        description: description || null,
        solutionMoves: moves.map((san, i) => ({ san, note: notes[i] || null })),
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

  const reachedMaxMoves = moves.length >= MAX_SOLUTION_MOVES;

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
            aria-selected={activeTab === 'board'}
            onClick={() => setActiveTab('board')}
            className={`flex-1 rounded-md px-4 py-2 text-center text-sm font-medium transition-colors ${
              activeTab === 'board'
                ? 'bg-card text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tCreate('tabBoard')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'fen'}
            onClick={() => setActiveTab('fen')}
            className={`flex-1 rounded-md px-4 py-2 text-center text-sm font-medium transition-colors ${
              activeTab === 'fen'
                ? 'bg-card text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tCreate('tabFen')}
          </button>
        </nav>

        {activeTab === 'board' && (
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
                  aria-checked={sideToMove === 'w'}
                  onClick={() => handleSideToMoveChange('w')}
                  className={`px-3 py-1.5 transition-colors ${
                    sideToMove === 'w'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {tCreate('sideWhite')}
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={sideToMove === 'b'}
                  onClick={() => handleSideToMoveChange('b')}
                  className={`px-3 py-1.5 transition-colors ${
                    sideToMove === 'b'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {tCreate('sideBlack')}
                </button>
              </div>
              <FlipBoardButton onClick={handleFlip} title={tCreate('flipBoard')} />
            </div>
            <div className="flex justify-center">
              <div className="w-full max-w-md">
                {!isLoaded ? (
                  <BoardSkeleton />
                ) : (
                  <EditableChessBoard
                    fen={boardFen}
                    onFenChange={handleBoardChange}
                    labels={editableBoardLabels}
                    editable={true}
                    flipped={flipped}
                    showCoordinates={true}
                    boardTheme={preferences.boardTheme}
                  />
                )}
              </div>
            </div>

            {positionError && (
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

        {activeTab === 'fen' && (
          <div>
            <label htmlFor="fen" className="block text-sm font-medium mb-1">
              {tCreate('fenLabel')}
            </label>
            <textarea
              id="fen"
              value={fenInput}
              onChange={handleFenInputChange}
              placeholder="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
              rows={2}
              className="w-full px-3 py-2 rounded border border-border bg-card text-foreground text-sm font-mono"
            />
            {fenInput.trim() && !isFenValid && (
              <p className="text-sm text-destructive mt-1">{tCreate('fenInvalid')}</p>
            )}
          </div>
        )}

        {turnIndicator && (
          <p className="text-sm text-muted-foreground text-center">
            <span aria-hidden className="mr-1">
              {turnIndicator === 'w' ? '⚪' : '⚫'}
            </span>
            {turnIndicator === 'w' ? tCreate('whiteToMove') : tCreate('blackToMove')}
          </p>
        )}

        {isFenValid && (
          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <label className="text-sm font-medium">
                {tCreate('solutionSection')} <span className="text-destructive">*</span>
              </label>
              <span className="text-xs text-muted-foreground">
                {moves.length} / {MAX_SOLUTION_MOVES}
              </span>
            </div>

            {moves.length > 0 && (
              <SolutionMoveList
                moves={moves}
                firstTurn={firstTurn}
                onRemoveLast={handleRemoveLast}
                removeAriaLabel={tCreate('removeLastMove', { move: moves[moves.length - 1]! })}
                disabled={pending}
                renderAfter={(index) => (
                  <input
                    type="text"
                    value={notes[index] ?? ''}
                    onChange={(e) => handleNoteChange(index, e.target.value)}
                    maxLength={PUZZLE_NOTE_MAX_LENGTH}
                    placeholder={tCreate('addMoveNote')}
                    aria-label={tCreate('noteAriaLabel', { move: moves[index]! })}
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
                currentFen={currentFen}
                moveInput={moveInput}
                onMoveInputChange={setMoveInput}
                error={moveError}
                onErrorClear={() => setMoveError(null)}
                onSubmit={handleMoveSubmit}
                disabled={pending}
                inputPlaceholder={tCreate('movePlaceholder')}
                selectPlaceholder={tPlay('selectMove')}
                toggleTitle={tPlay('switchInputMode')}
                playerColor={currentTurn}
                showLegalMovesHint={false}
              />
            )}

            {solutionError && <p className="text-sm text-destructive">{solutionError}</p>}
          </div>
        )}

        <PuzzleTagPicker
          selectedThemes={selectedThemes}
          selectedChunks={selectedChunks}
          availableThemes={available.themes}
          availableChunks={available.chunks}
          disabled={pending}
          onChange={handleTagChange}
          labels={tagPickerLabels}
        />

        <Button
          type="submit"
          variant="primary"
          fullWidth
          disabled={pending || !isFenValid || moves.length === 0 || title.trim() === '' || !isDirty}
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
          handleClearBoard();
        }}
        onCancel={() => setClearBoardOpen(false)}
      />
    </>
  );
}
