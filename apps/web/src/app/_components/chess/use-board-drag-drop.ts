'use client';

import { useCallback } from 'react';

import type { BoardPiece } from '@blindfold-chess/features/chess-core';

import { usePointerDragGesture } from './use-pointer-drag-gesture';

type Params = {
  /** Interactive mode (only armed when the board wires `onMove`). */
  enabled: boolean;
  /** Current FEN — an in-flight drag is cancelled when the position changes. */
  fen: string;
  /** Color (`'w'`/`'b'`) the user may pick up — own color, or side-to-move. */
  movableColorChar: string;
  pieceAt: (square: string) => BoardPiece | null;
  /** Apply a completed move from `from` to `to` (validates + may promote). */
  attemptMove: (from: string, to: string) => void;
  /** Clear the click-to-move selection (a starting drag / cancel drops it). */
  clearSelection: () => void;
};

type Result = {
  /** Source square of the active drag, or `null`. Gets the "selected" tint. */
  dragFrom: string | null;
  /** Side length (px) of one square, used to size the floating piece. */
  dragSize: number | null;
  handleBoardPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  /** Ref callback for the floating piece element — seeds + tracks its position. */
  floatingRef: (el: HTMLDivElement | null) => void;
  /**
   * Returns `true` (and consumes the flag) when the next board click is the
   * synthetic click trailing a completed drag and should be swallowed so it
   * doesn't double as a click-to-move action.
   */
  consumeTrailingClick: () => boolean;
};

/**
 * Piece dragging for {@link ChessBoard} — {@link usePointerDragGesture} with
 * the live board's rules: a drag source is a movable piece, a release on
 * another square is a move attempt, and anything else drops the selection.
 * The gesture is keyed to the FEN, so a position changing underneath a live
 * drag (an opponent move arriving, an undo) cancels it.
 */
export function useBoardDragDrop({
  enabled,
  fen,
  movableColorChar,
  pieceAt,
  attemptMove,
  clearSelection,
}: Params): Result {
  const resolveSource = useCallback(
    (e: React.PointerEvent) => {
      const square = (e.target as HTMLElement).closest<HTMLElement>('[data-square]')?.dataset
        .square;
      if (!square) return null;
      const piece = pieceAt(square);
      // Only movable pieces drag (own color by default; the side to move in
      // recall). Other presses (empty square, non-movable piece) fall
      // through to the click handler, preserving click-to-move and the
      // obfuscated "tried to grab the wrong piece" counting.
      if (!piece || piece.color !== movableColorChar) return null;
      return square;
    },
    [pieceAt, movableColorChar]
  );

  const measureSquareSize = useCallback(
    (e: React.PointerEvent) => e.currentTarget.getBoundingClientRect().width / 8,
    []
  );

  const handleDrop = useCallback(
    (from: string, to: string | undefined) => {
      if (to && to !== from) {
        attemptMove(from, to);
      } else {
        clearSelection();
      }
    },
    [attemptMove, clearSelection]
  );

  const { dragSource, dragSize, handlePointerDown, floatingRef, consumeTrailingClick } =
    usePointerDragGesture<string>({
      enabled,
      resetKey: fen,
      resolveSource,
      measureSquareSize,
      // Drop any click-selection so the drag source is the only highlighted origin.
      onDragStart: clearSelection,
      onDrop: handleDrop,
      onCancel: clearSelection,
    });

  return {
    dragFrom: dragSource,
    dragSize,
    handleBoardPointerDown: handlePointerDown,
    floatingRef,
    consumeTrailingClick,
  };
}
