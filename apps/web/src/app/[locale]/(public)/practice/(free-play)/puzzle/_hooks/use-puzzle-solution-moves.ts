'use client';

import { useMemo, useState } from 'react';

import { executeMove, getTurnFromFen } from '@blindfold-chess/features/chess-core';
import type { AlgebraicNotation } from '@blindfold-chess/types';

import { MAX_SOLUTION_MOVES, type SideToMove } from '../_lib/puzzle-form-constants';

export type MoveSubmitLabels = {
  positionInvalid: string;
  maxMovesReached: string;
  invalidMove: string;
};

export type PuzzleSolutionMovesOptions = {
  /** Validated starting FEN. Empty string while the board is invalid. */
  baseFen: string;
  initialMoves?: string[];
  initialNotes?: string[];
};

/**
 * State + handlers for the solution-move list of the puzzle authoring
 * form. Owns the move array, per-move note array, in-flight move
 * input, and the derived "current FEN" (baseFen with moves replayed)
 * along with first / current turn for MoveInputPanel piece-icon
 * coloring.
 */
export function usePuzzleSolutionMoves({
  baseFen,
  initialMoves,
  initialNotes,
}: PuzzleSolutionMovesOptions) {
  const [moves, setMoves] = useState<string[]>(initialMoves ?? []);
  const [notes, setNotes] = useState<string[]>(initialNotes ?? []);
  const [moveInput, setMoveInput] = useState('');
  const [moveError, setMoveError] = useState<string | null>(null);
  const [solutionError, setSolutionError] = useState<string | null>(null);

  // Replay the entered moves on top of baseFen for "current FEN" in
  // the move input panel. Defensively returns the last good FEN if
  // executeMove ever rejects — makeMoveSubmitHandler already
  // validates each move before storage so this branch should not fire.
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

  // Side to move at the *current* position along the line. Drives
  // MoveInputPanel's piece-icon color: pieces displayed should belong
  // to whichever side is about to play, which alternates as moves are
  // appended. firstTurn only reflects the puzzle's starting side.
  const currentTurn: SideToMove = useMemo(() => {
    if (!currentFen) return firstTurn;
    try {
      return getTurnFromFen(currentFen) as SideToMove;
    } catch {
      return firstTurn;
    }
  }, [currentFen, firstTurn]);

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
   * Clear moves, notes, and in-flight input. Used both as the side
   * effect of board changes (host form wires this via onBoardChange)
   * and by Create's "Start Over" reset.
   */
  function reset() {
    setMoves(initialMoves ?? []);
    setNotes(initialNotes ?? []);
    setMoveInput('');
    setMoveError(null);
    setSolutionError(null);
  }

  return {
    // state
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
    // derived
    currentFen,
    firstTurn,
    currentTurn,
    // handlers
    makeMoveSubmitHandler,
    handleRemoveLast,
    handleNoteChange,
    reset,
  };
}

export type PuzzleSolutionMoves = ReturnType<typeof usePuzzleSolutionMoves>;
