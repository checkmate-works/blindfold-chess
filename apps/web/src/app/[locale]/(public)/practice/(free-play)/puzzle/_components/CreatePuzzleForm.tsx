'use client';

import { useCallback, useMemo, useState } from 'react';

import { useTranslations } from 'next-intl';

import { useUnsavedChanges } from '@/_hooks/useUnsavedChanges';
import { UnsavedChangesDialog } from '@/app/_components';
import { useRouter } from '@/i18n/routing';
import { executeMove, getTurnFromFen, validateFen } from '@blindfold-chess/features/chess-core';
import type { AlgebraicNotation } from '@blindfold-chess/types';
import { flushSync } from 'react-dom';
import { FaSyncAlt } from 'react-icons/fa';

import { PUZZLE_NOTE_MAX_LENGTH } from '@/lib/positions/validation';

import { EditableChessBoard } from '@/app/[locale]/(public)/practice/(free-play)/_components/EditableChessBoard';
import { MoveInputPanel } from '@/app/[locale]/_components/MoveInputPanel';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import { createPuzzle } from '../_actions/createPuzzle';
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

export function CreatePuzzleForm() {
  const router = useRouter();
  const t = useTranslations('practice.puzzle.create');
  const tBoard = useTranslations('practice.puzzle');
  const tPlay = useTranslations('play');
  const tUnsaved = useTranslations('unsavedChanges');
  const { preferences, updatePreferences } = useGamePreferences();

  const [fenInput, setFenInput] = useState('');
  const [boardFen, setBoardFen] = useState(EMPTY_BOARD_FEN);
  const [sideToMove, setSideToMove] = useState<SideToMove>('w');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [moves, setMoves] = useState<string[]>([]);
  const [notes, setNotes] = useState<string[]>([]);
  const [moveInput, setMoveInput] = useState('');
  const [moveError, setMoveError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [positionError, setPositionError] = useState(false);
  const [solutionError, setSolutionError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [activeTab, setActiveTab] = useState<EditorTab>('board');
  const [flipped, setFlipped] = useState(false);
  const [userFlipped, setUserFlipped] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const trimmedFen = fenInput.trim();
  const isFenValid = trimmedFen !== '' && validateFen(trimmedFen);

  const baseFen = isFenValid ? trimmedFen : '';

  // Derive currentFen by replaying the entered moves on top of baseFen.
  // On any replay failure we stop, returning the last good FEN — handleSubmit
  // already guarantees moves were accepted by executeMove, so this is defensive.
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

  // Side to move at the *current* position along the line. This is what
  // drives ButtonInput's piece-icon color: the pieces displayed should
  // belong to whichever side is about to play next, which alternates as
  // moves are appended. `firstTurn` only reflects the puzzle's starting
  // side and would leave the icons stale after the first move.
  const currentTurn: SideToMove = useMemo(() => {
    if (!currentFen) return firstTurn;
    try {
      return getTurnFromFen(currentFen) as SideToMove;
    } catch {
      return firstTurn;
    }
  }, [currentFen, firstTurn]);

  const isDirty =
    !submitted &&
    (title.trim() !== '' ||
      description.trim() !== '' ||
      moves.length > 0 ||
      notes.some((n) => n.trim() !== '') ||
      (fenInput.trim() !== '' && fenInput !== EMPTY_BOARD_FEN));

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

  function applyFen(nextFen: string) {
    const trimmed = nextFen.trim();
    setFenInput(trimmed);
    if (trimmed !== '' && validateFen(trimmed)) {
      setBoardFen(trimmed);
      const side = readSideToMove(trimmed);
      setSideToMove(side);
    }
    resetSolutionState();
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
    applyFen(EMPTY_BOARD_FEN);
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
      setMoveError(t('positionInvalid'));
      return false;
    }
    if (moves.length >= MAX_SOLUTION_MOVES) {
      setMoveError(t('maxMovesReached'));
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
      setSolutionError(t('solutionRequired'));
      return;
    }

    setPending(true);

    try {
      const solutionMoves = moves.map((san, i) => {
        const trimmed = notes[i]?.trim() ?? '';
        return { san, note: trimmed.length > 0 ? trimmed : null };
      });

      const result = await createPuzzle({
        fen: trimmedFen,
        title,
        description: description || null,
        solutionMoves,
      });

      if ('error' in result) {
        setError(result.error);
        return;
      }

      // flushSync ensures the re-render (isDirty -> false) completes before
      // router.push triggers the navigation guard check.
      //
      // Redirect to the just-created puzzle's detail page so the author lands
      // on their own puzzle (not the generic list). The `?toast=position_created`
      // param is picked up by the global `ToastContainer` — we reuse that key
      // rather than adding a puzzle-specific one because a puzzle IS a position
      // (`positions.type = 'puzzle'`) and the existing message "Position created
      // successfully" reads correctly here; this avoids widening the
      // `TOAST_PARAM_CONFIG` map and adding a near-duplicate i18n entry.
      flushSync(() => setSubmitted(true));
      router.push(`/practice/puzzle/${result.id}?toast=position_created`);
    } catch {
      setError('An unexpected error occurred. Please try again.');
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

        {/* Tab switcher — matches LeaderboardTabs style */}
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
            {t('tabBoard')}
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
            {t('tabFen')}
          </button>
        </nav>

        {/* Board editor tab */}
        {activeTab === 'board' && (
          <>
            <div className="flex items-center justify-between gap-2 mb-2">
              <div
                role="radiogroup"
                aria-label={t('sideToMove')}
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
                  {t('sideWhite')}
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
                  {t('sideBlack')}
                </button>
              </div>
              <button
                type="button"
                onClick={handleFlip}
                className="p-2 border border-border rounded-md hover:bg-muted"
                title={t('flipBoard')}
              >
                <FaSyncAlt className="w-4 h-4" />
              </button>
            </div>
            <div className="flex justify-center">
              <div className="w-full max-w-md">
                <EditableChessBoard
                  fen={boardFen}
                  onFenChange={handleBoardChange}
                  labels={editableBoardLabels}
                  editable={true}
                  flipped={flipped}
                  showCoordinates={true}
                />
              </div>
            </div>

            {positionError && (
              <p className="text-sm text-destructive text-center">{t('positionInvalid')}</p>
            )}

            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleClearBoard}
                className="px-3 py-1 text-sm rounded border border-border text-muted-foreground hover:bg-muted transition-colors"
              >
                {t('clearBoard')}
              </button>
            </div>
          </>
        )}

        {/* FEN input tab */}
        {activeTab === 'fen' && (
          <div>
            <label htmlFor="fen" className="block text-sm font-medium mb-1">
              {t('fenLabel')}
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
              <p className="text-sm text-destructive mt-1">{t('fenInvalid')}</p>
            )}
          </div>
        )}

        {/* Turn indicator */}
        {turnIndicator && (
          <p className="text-sm text-muted-foreground text-center">
            <span aria-hidden className="mr-1">
              {turnIndicator === 'w' ? '⚪' : '⚫'}
            </span>
            {turnIndicator === 'w' ? t('whiteToMove') : t('blackToMove')}
          </p>
        )}

        <div>
          <label htmlFor="title" className="block text-sm font-medium mb-1">
            {t('titleLabel')} <span className="text-destructive">*</span>
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
            {t('descriptionLabel')}
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 rounded border border-border bg-card text-foreground"
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <label className="text-sm font-medium">
              {t('solutionSection')} <span className="text-destructive">*</span>
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
              removeAriaLabel={t('removeLastMove', { move: moves[moves.length - 1]! })}
              disabled={pending}
              renderAfter={(index) => (
                <input
                  type="text"
                  value={notes[index] ?? ''}
                  onChange={(e) => handleNoteChange(index, e.target.value)}
                  maxLength={PUZZLE_NOTE_MAX_LENGTH}
                  placeholder={t('addMoveNote')}
                  aria-label={t('noteAriaLabel', { move: moves[index]! })}
                  className="w-full px-2 py-1 rounded border border-border bg-card text-foreground text-sm"
                />
              )}
            />
          )}

          {isFenValid ? (
            reachedMaxMoves ? (
              <p className="text-sm text-muted-foreground">{t('maxMovesReached')}</p>
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
                inputPlaceholder={t('movePlaceholder')}
                selectPlaceholder={tPlay('selectMove')}
                toggleTitle={tPlay('switchInputMode')}
                playerColor={currentTurn}
                showLegalMovesHint={false}
              />
            )
          ) : (
            <p className="text-sm text-muted-foreground">{t('positionInvalid')}</p>
          )}

          {solutionError && <p className="text-sm text-destructive">{solutionError}</p>}
        </div>

        <button
          type="submit"
          disabled={pending}
          className="w-full px-4 py-2 text-sm rounded bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {pending ? t('submitting') : t('submit')}
        </button>
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
