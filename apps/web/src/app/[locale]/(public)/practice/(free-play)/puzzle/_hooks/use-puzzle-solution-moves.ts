'use client';

import { useCallback, useMemo, useState } from 'react';

import {
  executeMove,
  formatMovesToPgn,
  getTurnFromFen,
  isCheckmateFen,
} from '@blindfold-chess/features/chess-core';
import type { FormattedPgnMove } from '@blindfold-chess/features/chess-core';
import type { AlgebraicNotation } from '@blindfold-chess/types';

import type { MoveSquares } from '@/lib/board/move-squares';

import { parseFenMeta } from '@/app/[locale]/(public)/games/play/_lib/fen-utils';

import type { SideToMove } from '../../_lib/board-editor-constants';
import type { MoveSubmitLabels } from './use-move-submit-labels';

/** Per-puzzle solution-move ceiling (UI hard limit). */
export const MAX_SOLUTION_MOVES = 20;

export type PuzzleSolutionMovesOptions = {
  /** Validated starting FEN. Empty string while the board is invalid. */
  baseFen: string;
  moveSubmitLabels: MoveSubmitLabels;
};

type SolutionPosition = {
  fen: string;
  /** The move that produced this position, for the board's last-move
   * highlight. `null` at ply 0 (the starting position). */
  lastMove: MoveSquares | null;
};

export function usePuzzleSolutionMoves({ baseFen, moveSubmitLabels }: PuzzleSolutionMovesOptions) {
  const [moves, setMoves] = useState<string[]>([]);
  const [notes, setNotes] = useState<string[]>([]);
  const [moveInput, setMoveInput] = useState('');
  const [moveError, setMoveError] = useState<string | null>(null);
  const [solutionError, setSolutionError] = useState<string | null>(null);
  // Which ply of the entered line the board displays. `null` follows the
  // tip, so a newly added move is shown without any bookkeeping; a number
  // is an explicit history position picked via the navigation controls.
  const [viewPly, setViewPly] = useState<number | null>(null);

  // Board position at each ply; index 0 is the start. Defensive: an
  // executeMove rejection here would only fire if a move somehow got stored
  // without going through handleMoveSubmit (which validates first). Stop at
  // the last good position rather than throw.
  const positions = useMemo<SolutionPosition[]>(() => {
    const list: SolutionPosition[] = [{ fen: baseFen, lastMove: null }];
    if (!baseFen) return list;
    let fen = baseFen;
    for (const move of moves) {
      const r = executeMove(fen, move);
      if (!r) break;
      fen = r.fen;
      list.push({ fen, lastMove: { from: r.moveResult.from, to: r.moveResult.to } });
    }
    return list;
  }, [baseFen, moves]);

  /** FEN at the tip of the line — validation/persistence always use this,
   * regardless of which ply the board is browsing. */
  const currentFen = baseFen ? positions[positions.length - 1]!.fen : '';

  const maxPly = positions.length - 1;
  const viewedPly = viewPly === null ? maxPly : Math.min(viewPly, maxPly);
  const isViewingHistory = viewedPly < maxPly;
  const viewedFen = baseFen ? positions[viewedPly]!.fen : '';
  const viewedLastMove = positions[viewedPly]!.lastMove;

  /** Jump the board to a ply of the line. The tip is stored as `null` so
   * the view keeps following newly added moves afterwards. */
  const goToPly = useCallback(
    (ply: number) => setViewPly(ply >= maxPly ? null : Math.max(0, ply)),
    [maxPly]
  );

  // Numbered move pairs for the horizontal move list, honoring a black-to-
  // move start and the FEN's fullmove counter (same as the game screen).
  const formattedPgn = useMemo<FormattedPgnMove[]>(() => {
    if (!baseFen || moves.length === 0) return [];
    const { startsAsBlack, startMoveNumber } = parseFenMeta(baseFen);
    return formatMovesToPgn(moves, startsAsBlack, startMoveNumber);
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
      setViewPly(null);
      return true;
    },
    [baseFen, currentFen, moves, moveSubmitLabels]
  );

  function handleRemoveLast() {
    setMoves((prev) => prev.slice(0, -1));
    setNotes((prev) => prev.slice(0, -1));
    setMoveError(null);
    setSolutionError(null);
    // Snap the view back to the (new) tip — removal always acts on the
    // line's end, even while an earlier ply is being browsed.
    setViewPly(null);
  }

  function handleNoteChange(index: number, value: string) {
    setNotes((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
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
    viewedPly,
    viewedFen,
    viewedLastMove,
    isViewingHistory,
    goToPly,
    formattedPgn,
    handleMoveSubmit,
    handleRemoveLast,
    handleNoteChange,
  };
}

export type PuzzleSolutionMoves = ReturnType<typeof usePuzzleSolutionMoves>;
