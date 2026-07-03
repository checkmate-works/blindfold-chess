'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { BoardPiece } from '@blindfold-chess/features/chess-core';

const DRAG_THRESHOLD_PX = 4;

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
 * Pointer-based drag-and-drop for {@link ChessBoard}, extracted so the board
 * component is free of the gesture's state machine.
 *
 * A press on a movable piece arms a pending drag; once the pointer moves past
 * a small threshold the piece is lifted as a DOM element following the cursor
 * (rendered by the caller into a body portal via {@link Result.floatingRef}),
 * and the source square fades. Window listeners track move/up so the gesture
 * survives the pointer leaving the board; hit-testing on release uses the
 * element under the pointer (the floating piece is `pointer-events: none`),
 * which also makes it unit-testable in jsdom. Touch is handled natively by
 * pointer events, so taps still fall through to click-to-move.
 *
 * Bookkeeping is kept in refs so the window listeners never go stale and never
 * force a re-render on every `pointermove`.
 */
export function useBoardDragDrop({
  enabled,
  fen,
  movableColorChar,
  pieceAt,
  attemptMove,
  clearSelection,
}: Params): Result {
  const [dragging, setDragging] = useState<{ from: string; size: number } | null>(null);

  const pendingDragRef = useRef<{
    from: string;
    startX: number;
    startY: number;
    size: number;
  } | null>(null);
  // Latest pointer position, used to seed the floating piece on mount.
  const dragPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  // The floating piece element; its left/top are updated imperatively per
  // pointermove to avoid re-rendering the 64-square board on every frame.
  const dragLayerRef = useRef<HTMLDivElement | null>(null);
  // True once a press has become a real drag — drives both the floating piece
  // and the suppression of the synthetic click that follows a drag.
  const didDragRef = useRef(false);
  // Detaches the active window pointer listeners; set while a press is live.
  const dragCleanupRef = useRef<(() => void) | null>(null);

  // Cancel any in-flight drag when the position changes underneath it.
  useEffect(() => {
    pendingDragRef.current = null;
    didDragRef.current = false;
    dragCleanupRef.current?.();
    setDragging(null);
  }, [fen]);

  // Detach lingering window listeners if the board unmounts mid-drag.
  useEffect(() => () => dragCleanupRef.current?.(), []);

  const handleBoardPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!enabled || e.button !== 0) return;
      const square = (e.target as HTMLElement).closest<HTMLElement>('[data-square]')?.dataset
        .square;
      if (!square) return;
      const piece = pieceAt(square);
      // Only movable pieces drag (own color by default; the side to move in
      // recall). Other presses (empty square, non-movable piece) fall
      // through to the click handler, preserving click-to-move and the
      // obfuscated "tried to grab the wrong piece" counting.
      if (!piece || piece.color !== movableColorChar) return;

      const size = e.currentTarget.getBoundingClientRect().width / 8;
      pendingDragRef.current = { from: square, startX: e.clientX, startY: e.clientY, size };
      dragPosRef.current = { x: e.clientX, y: e.clientY };
      didDragRef.current = false;

      const onPointerMove = (ev: PointerEvent) => {
        const pending = pendingDragRef.current;
        if (!pending) return;
        dragPosRef.current = { x: ev.clientX, y: ev.clientY };
        if (!didDragRef.current) {
          const dx = ev.clientX - pending.startX;
          const dy = ev.clientY - pending.startY;
          if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
          // Threshold crossed → start lifting. Drop any click-selection so the
          // drag source is the only highlighted origin.
          didDragRef.current = true;
          clearSelection();
          setDragging({ from: pending.from, size: pending.size });
        } else if (dragLayerRef.current) {
          dragLayerRef.current.style.left = `${ev.clientX}px`;
          dragLayerRef.current.style.top = `${ev.clientY}px`;
        }
      };
      const onPointerUp = (ev: PointerEvent) => {
        cleanup();
        const pending = pendingDragRef.current;
        pendingDragRef.current = null;
        setDragging(null);
        if (!pending || !didDragRef.current) return; // a plain tap → click handles it
        const to = (ev.target as HTMLElement | null)?.closest<HTMLElement>('[data-square]')?.dataset
          .square;
        if (to && to !== pending.from) {
          attemptMove(pending.from, to);
        } else {
          clearSelection();
        }
        // didDragRef stays true so the trailing synthetic click is suppressed.
      };
      // The OS / browser can abort a gesture (e.g. it decides a touch is a
      // scroll, or a system UI takes over). Tear down without applying a move.
      const onPointerCancel = () => {
        cleanup();
        pendingDragRef.current = null;
        didDragRef.current = false;
        setDragging(null);
        clearSelection();
      };
      const cleanup = () => {
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerCancel);
        dragCleanupRef.current = null;
      };
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointercancel', onPointerCancel);
      dragCleanupRef.current = cleanup;
    },
    [enabled, movableColorChar, pieceAt, attemptMove, clearSelection]
  );

  const floatingRef = useCallback((el: HTMLDivElement | null) => {
    dragLayerRef.current = el;
    if (el) {
      el.style.left = `${dragPosRef.current.x}px`;
      el.style.top = `${dragPosRef.current.y}px`;
    }
  }, []);

  const consumeTrailingClick = useCallback(() => {
    if (didDragRef.current) {
      didDragRef.current = false;
      return true;
    }
    return false;
  }, []);

  return {
    dragFrom: dragging?.from ?? null,
    dragSize: dragging?.size ?? null,
    handleBoardPointerDown,
    floatingRef,
    consumeTrailingClick,
  };
}
