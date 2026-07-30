'use client';

import { type RefObject, useCallback } from 'react';

import { usePointerDragGesture } from '@/app/_components/chess/use-pointer-drag-gesture';

import type { FenPieceChar } from './types';

export type EditableBoardDragSource =
  { kind: 'palette'; piece: FenPieceChar } | { kind: 'board'; index: number; piece: FenPieceChar };

type Params = {
  enabled: boolean;
  /** The board's square-grid container — measured to size the floating piece
   * to exactly one square, regardless of whether the drag started on the
   * grid or on a palette button outside it. */
  boardRef: RefObject<HTMLElement | null>;
  /** Look up the piece currently on a board square, by logical index. */
  pieceAt: (index: number) => FenPieceChar;
  /**
   * Drop resolution. `destIndex` is `null` when the pointer was released
   * outside any board square — dragging a board piece off the board removes
   * it; dragging a palette piece off the board is a no-op (cancel).
   */
  onDrop: (source: EditableBoardDragSource, destIndex: number | null) => void;
};

type Result = {
  /** Active drag source, or `null`. A board-origin drag fades its square. */
  dragSource: EditableBoardDragSource | null;
  /** Side length (px) of one square, used to size the floating piece. */
  dragSize: number | null;
  handlePointerDown: (e: React.PointerEvent) => void;
  /** Ref callback for the floating piece element — seeds + tracks its position. */
  floatingRef: (el: HTMLDivElement | null) => void;
  /**
   * Returns `true` (and consumes the flag) when the next click is the
   * synthetic click trailing a completed drag and should be swallowed so it
   * doesn't double as a tap-to-place/-select action.
   */
  consumeTrailingClick: () => boolean;
};

/**
 * Piece dragging for {@link EditableChessBoard} — {@link usePointerDragGesture}
 * with free-placement rules rather than legal-move rules: a palette button can
 * be dragged onto a square to place a new piece, and a board piece can be
 * dragged to another square, or off the board entirely to remove it, instead
 * of only via tap-select-then-tap-place/-remove.
 *
 * Hit-testing is delegated off a single pointerdown handler attached to the
 * board's outer wrapper: palette buttons carry `data-palette-piece`, board
 * squares carry `data-square` (the same logical index click-to-place already
 * uses).
 */
export function useEditableBoardDragDrop({ enabled, boardRef, pieceAt, onDrop }: Params): Result {
  const resolveSource = useCallback(
    (e: React.PointerEvent): EditableBoardDragSource | null => {
      const target = e.target as HTMLElement;
      const paletteEl = target.closest<HTMLElement>('[data-palette-piece]');
      if (paletteEl) {
        return { kind: 'palette', piece: paletteEl.dataset.palettePiece as FenPieceChar };
      }
      const squareIndexAttr = target.closest<HTMLElement>('[data-square]')?.dataset.square;
      if (squareIndexAttr === undefined) return null;
      const index = Number(squareIndexAttr);
      const piece = pieceAt(index);
      // Only an occupied square is a drag source — an empty square falls
      // through to the click handler, preserving tap-to-place.
      return piece ? { kind: 'board', index, piece } : null;
    },
    [pieceAt]
  );

  const measureSquareSize = useCallback(
    () => (boardRef.current?.getBoundingClientRect().width ?? 0) / 8,
    [boardRef]
  );

  const handleDrop = useCallback(
    (source: EditableBoardDragSource, squareAttr: string | undefined) => {
      onDrop(source, squareAttr !== undefined ? Number(squareAttr) : null);
    },
    [onDrop]
  );

  return usePointerDragGesture<EditableBoardDragSource>({
    enabled,
    resolveSource,
    measureSquareSize,
    onDrop: handleDrop,
  });
}
