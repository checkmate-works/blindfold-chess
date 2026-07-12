'use client';

import { useCallback, useMemo, useState } from 'react';

import { executeMove, getTurnFromFen, isCheckmateFen } from '@blindfold-chess/features/chess-core';
import type { AlgebraicNotation } from '@blindfold-chess/types';

import type { SideToMove } from '../../_lib/board-editor-constants';
import type { MoveSubmitLabels } from './use-move-submit-labels';

/** Per-puzzle solution-move ceiling (UI hard limit). */
export const MAX_SOLUTION_MOVES = 20;

export type PuzzleSolutionMovesOptions = {
  /** Validated starting FEN. Empty string while the board is invalid. */
  baseFen: string;
  initialMoves?: string[];
  initialNotes?: string[];
  moveSubmitLabels: MoveSubmitLabels;
};

export function usePuzzleSolutionMoves({
  baseFen,
  initialMoves,
  initialNotes,
  moveSubmitLabels,
}: PuzzleSolutionMovesOptions) {
  const [moves, setMoves] = useState<string[]>(initialMoves ?? []);
  const [notes, setNotes] = useState<string[]>(initialNotes ?? []);
  const [moveInput, setMoveInput] = useState('');
  const [moveError, setMoveError] = useState<string | null>(null);
  const [solutionError, setSolutionError] = useState<string | null>(null);

  // Defensive: executeMove rejection here would only fire if a move
  // somehow got stored without going through handleMoveSubmit (which
  // validates first). Fall back to the last good FEN rather than throw.
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

  // Once the line reaches checkmate, the position is terminal — no further
  // reply exists, so no further move should be addable. Undoing the mating
  // move (handleRemoveLast) recomputes `currentFen` to a non-terminal
  // position and this flips back to `false` on its own; no extra state.
  const isCheckmate = useMemo(() => {
    if (!currentFen) return false;
    return isCheckmateFen(currentFen);
  }, [currentFen]);

  const firstTurn: SideToMove = useMemo(() => {
    if (!baseFen) return 'w';
    try {
      return getTurnFromFen(baseFen) as SideToMove;
    } catch {
      return 'w';
    }
  }, [baseFen]);

  // Drives MoveInputPanel's piece-icon color — must reflect the side
  // about to play at the *current* position, not the puzzle's starting
  // side (which would freeze after the first move).
  const currentTurn: SideToMove = useMemo(() => {
    if (!currentFen) return firstTurn;
    try {
      return getTurnFromFen(currentFen) as SideToMove;
    } catch {
      return firstTurn;
    }
  }, [currentFen, firstTurn]);

  const handleMoveSubmit = useCallback(
    (move: AlgebraicNotation): boolean => {
      const trimmed = move.trim();
      if (!trimmed) return false;
      if (!baseFen) {
        setMoveError(moveSubmitLabels.positionInvalid);
        return false;
      }
      if (moves.length >= MAX_SOLUTION_MOVES) {
        setMoveError(moveSubmitLabels.maxMovesReached);
        return false;
      }
      if (isCheckmateFen(currentFen)) {
        setMoveError(moveSubmitLabels.checkmateReached);
        return false;
      }
      const r = executeMove(currentFen, trimmed);
      if (!r) {
        setMoveError(moveSubmitLabels.invalidMove);
        return false;
      }
      // Store the engine-normalized SAN (e.g. "Rh8#"), not the raw input —
      // the two can differ when the author's typed notation omits the
      // check/checkmate suffix, and `isCheckmate` above re-derives from the
      // replayed position rather than string-matching this suffix, but the
      // move list should still display it correctly.
      setMoves((prev) => [...prev, r.moveResult.san]);
      setNotes((prev) => [...prev, '']);
      setMoveInput('');
      setMoveError(null);
      setSolutionError(null);
      return true;
    },
    [baseFen, currentFen, moves, moveSubmitLabels]
  );

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

  function reset() {
    setMoves(initialMoves ?? []);
    setNotes(initialNotes ?? []);
    setMoveInput('');
    setMoveError(null);
    setSolutionError(null);
  }

  return {
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
    currentFen,
    firstTurn,
    currentTurn,
    isCheckmate,
    handleMoveSubmit,
    handleRemoveLast,
    handleNoteChange,
    reset,
  };
}

export type PuzzleSolutionMoves = ReturnType<typeof usePuzzleSolutionMoves>;
