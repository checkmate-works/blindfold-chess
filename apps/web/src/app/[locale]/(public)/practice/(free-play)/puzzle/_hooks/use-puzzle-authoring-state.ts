'use client';

import { useCallback, useMemo, useState } from 'react';

import { executeMove, getTurnFromFen, validateFen } from '@blindfold-chess/features/chess-core';
import type { AlgebraicNotation } from '@blindfold-chess/types';

import { readSideToMove, replaceSideToMove } from '../_lib/fen-utils';
import type { ChunkOption, ThemeOption } from '../_lib/load-puzzle-tags';
import {
  EMPTY_BOARD_FEN,
  type EditorTab,
  MAX_SOLUTION_MOVES,
  type SideToMove,
} from '../_lib/puzzle-form-constants';

export type PuzzleAuthoringInitial = {
  fen?: string;
  moves?: string[];
  notes?: string[];
  themes?: ThemeOption[];
  chunks?: ChunkOption[];
};

export type MoveSubmitLabels = {
  positionInvalid: string;
  maxMovesReached: string;
  invalidMove: string;
};

/**
 * Central state + handlers shared between `CreatePuzzleForm` and
 * `EditPuzzleForm`. Both forms wrap this with their own title /
 * description state, initial-value strategy, submit, and (in Create's
 * case) draft hydration + start-over. The hook intentionally does NOT
 * own:
 *
 * - `title` / `description` — initial values differ wildly between
 *   the two flows (date-stamped default vs. server-loaded) and Edit
 *   needs the original kept in scope for the dirty calculation.
 * - `pending` / `error` — submit pipelines diverge (write draft &
 *   navigate vs. call Server Action) so the host form owns these.
 * - `submitted` — only relevant to the unsaved-changes guard, which
 *   each form configures itself.
 *
 * Returns derived board state (`currentFen`, `firstTurn`, etc.) and
 * the eight pure-handler functions that were identical across both
 * forms before this extraction.
 */
export function usePuzzleAuthoringState(initial: PuzzleAuthoringInitial = {}) {
  const initialFen = initial.fen ?? '';
  const initialBoardFen = initial.fen ?? EMPTY_BOARD_FEN;
  const initialSide: SideToMove = initial.fen ? readSideToMove(initial.fen) : 'w';

  const [fenInput, setFenInput] = useState(initialFen);
  const [boardFen, setBoardFen] = useState(initialBoardFen);
  const [sideToMove, setSideToMove] = useState<SideToMove>(initialSide);
  const [moves, setMoves] = useState<string[]>(initial.moves ?? []);
  const [notes, setNotes] = useState<string[]>(initial.notes ?? []);
  const [moveInput, setMoveInput] = useState('');
  const [moveError, setMoveError] = useState<string | null>(null);
  const [solutionError, setSolutionError] = useState<string | null>(null);
  const [positionError, setPositionError] = useState(false);
  const [activeTab, setActiveTab] = useState<EditorTab>('board');
  const [flipped, setFlipped] = useState(initialSide === 'b');
  const [userFlipped, setUserFlipped] = useState(false);
  const [selectedThemes, setSelectedThemes] = useState<ThemeOption[]>(initial.themes ?? []);
  const [selectedChunks, setSelectedChunks] = useState<ChunkOption[]>(initial.chunks ?? []);

  const trimmedFen = fenInput.trim();
  const isFenValid = trimmedFen !== '' && validateFen(trimmedFen);
  const baseFen = isFenValid ? trimmedFen : '';

  // Replay the entered moves on top of baseFen for "current FEN" in
  // the move input panel. Defensively returns the last good FEN if
  // executeMove ever rejects — handleMoveSubmit already validates
  // each move before storage so this branch should not fire.
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

  // Side to move at the *current* position along the line. This is
  // what drives MoveInputPanel's piece-icon color: the displayed
  // pieces should belong to whichever side is about to play, which
  // alternates as moves are appended. `firstTurn` only reflects the
  // puzzle's starting side and would leave the icons stale after the
  // first move.
  const currentTurn: SideToMove = useMemo(() => {
    if (!currentFen) return firstTurn;
    try {
      return getTurnFromFen(currentFen) as SideToMove;
    } catch {
      return firstTurn;
    }
  }, [currentFen, firstTurn]);

  const turnIndicator = useMemo(() => {
    if (!isFenValid) return null;
    try {
      return getTurnFromFen(trimmedFen);
    } catch {
      return null;
    }
  }, [trimmedFen, isFenValid]);

  const handleFlip = useCallback(() => {
    setFlipped((prev) => !prev);
    setUserFlipped(true);
  }, []);

  const handleTagChange = useCallback((themes: ThemeOption[], chunks: ChunkOption[]) => {
    setSelectedThemes(themes);
    setSelectedChunks(chunks);
  }, []);

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

  // Reset board state directly: EMPTY_BOARD_FEN fails validateFen's
  // king-count check, so the usual FEN-validation path would skip
  // setBoardFen. For this known-good reset we bypass validation.
  function handleClearBoard() {
    setFenInput(EMPTY_BOARD_FEN);
    setBoardFen(EMPTY_BOARD_FEN);
    setSideToMove('w');
    setPositionError(false);
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

  function makeMoveSubmitHandler(labels: MoveSubmitLabels) {
    return function handleMoveSubmit(move: AlgebraicNotation): boolean {
      const trimmed = move.trim();
      if (!trimmed) return false;
      if (!baseFen) {
        setMoveError(labels.positionInvalid);
        return false;
      }
      if (moves.length >= MAX_SOLUTION_MOVES) {
        setMoveError(labels.maxMovesReached);
        return false;
      }
      const r = executeMove(currentFen, trimmed);
      if (!r) {
        setMoveError(labels.invalidMove);
        return false;
      }
      setMoves((prev) => [...prev, trimmed]);
      setNotes((prev) => [...prev, '']);
      setMoveInput('');
      setMoveError(null);
      setSolutionError(null);
      return true;
    };
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

  /**
   * Reset every owned state slot to the values the host form was
   * initialized with. Used by Create's "Start Over" button to clear
   * a hydrated draft; Edit does not call this.
   */
  function resetToInitial() {
    setFenInput(initialFen);
    setBoardFen(initialBoardFen);
    setSideToMove(initialSide);
    setMoves(initial.moves ?? []);
    setNotes(initial.notes ?? []);
    setMoveInput('');
    setMoveError(null);
    setSolutionError(null);
    setPositionError(false);
    setActiveTab('board');
    setFlipped(initialSide === 'b');
    setUserFlipped(false);
    setSelectedThemes(initial.themes ?? []);
    setSelectedChunks(initial.chunks ?? []);
  }

  return {
    // state
    fenInput,
    setFenInput,
    boardFen,
    setBoardFen,
    sideToMove,
    setSideToMove,
    moves,
    setMoves,
    notes,
    setNotes,
    moveInput,
    setMoveInput,
    moveError,
    setMoveError,
    solutionError,
    setSolutionError,
    positionError,
    setPositionError,
    activeTab,
    setActiveTab,
    flipped,
    setFlipped,
    userFlipped,
    setUserFlipped,
    selectedThemes,
    setSelectedThemes,
    selectedChunks,
    setSelectedChunks,
    // derived
    trimmedFen,
    isFenValid,
    baseFen,
    currentFen,
    firstTurn,
    currentTurn,
    turnIndicator,
    // handlers
    handleFlip,
    handleTagChange,
    handleFenInputChange,
    handleBoardChange,
    handleClearBoard,
    handleSideToMoveChange,
    makeMoveSubmitHandler,
    handleRemoveLast,
    handleNoteChange,
    resetSolutionState,
    resetToInitial,
  };
}

export type PuzzleAuthoringState = ReturnType<typeof usePuzzleAuthoringState>;
