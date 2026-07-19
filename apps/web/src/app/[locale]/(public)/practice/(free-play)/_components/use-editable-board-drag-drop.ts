'use client';

import { type RefObject, useCallback, useEffect, useRef, useState } from 'react';

import type { FenPieceChar } from './types';

const DRAG_THRESHOLD_PX = 4;

export type EditableBoardDragSource =
  | { kind: 'palette'; piece: FenPieceChar }
  | { kind: 'board'; index: number; piece: FenPieceChar };

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
 * Pointer-based drag-and-drop for {@link EditableChessBoard}, mirroring
 * `useBoardDragDrop` (the live-game board's piece dragging) but for free
 * piece placement rather than legal-move dragging: a palette button can be
 * dragged onto a square to place a new piece, and a board piece can be
 * dragged to another square — or off the board entirely, to remove it —
 * instead of only via tap-select-then-tap-place/-remove.
 *
 * Hit-testing is delegated off a single pointerdown handler attached to the
 * board's outer wrapper: palette buttons carry `data-palette-piece`, board
 * squares carry `data-square` (the same logical index click-to-place
 * already uses). Bookkeeping lives in refs so the window listeners
 * (attached fresh per gesture, so the gesture survives the pointer leaving
 * the board) never force a re-render on every `pointermove`.
 */
export function useEditableBoardDragDrop({ enabled, boardRef, pieceAt, onDrop }: Params): Result {
  const [dragging, setDragging] = useState<{
    source: EditableBoardDragSource;
    size: number;
  } | null>(null);

  const pendingDragRef = useRef<{
    source: EditableBoardDragSource;
    startX: number;
    startY: number;
    size: number;
  } | null>(null);
  const dragPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragLayerRef = useRef<HTMLDivElement | null>(null);
  const didDragRef = useRef(false);
  const dragCleanupRef = useRef<(() => void) | null>(null);

  // Detach lingering window listeners if the board unmounts mid-drag.
  useEffect(() => () => dragCleanupRef.current?.(), []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!enabled || e.button !== 0) return;

      const target = e.target as HTMLElement;
      const paletteEl = target.closest<HTMLElement>('[data-palette-piece]');
      let source: EditableBoardDragSource | null = null;
      if (paletteEl) {
        source = {
          kind: 'palette',
          piece: paletteEl.dataset.palettePiece as FenPieceChar,
        };
      } else {
        const squareIndexAttr = target.closest<HTMLElement>('[data-square]')?.dataset.square;
        if (squareIndexAttr !== undefined) {
          const index = Number(squareIndexAttr);
          const piece = pieceAt(index);
          // Only an occupied square is a drag source — an empty square falls
          // through to the click handler, preserving tap-to-place.
          if (piece) source = { kind: 'board', index, piece };
        }
      }
      if (!source) return;

      // Touch pointers get *implicit* pointer capture on the element hit by
      // `pointerdown`, which pins `event.target` to that element for the
      // rest of the gesture — subsequent `pointermove`/`pointerup` events
      // report the drag source as their target no matter where the finger
      // actually is. Releasing capture immediately restores normal
      // pointer-position-based targeting (as mouse input already has), so
      // the drop-square lookup below sees the real element under the finger.
      (e.target as Element).releasePointerCapture?.(e.pointerId);

      const size = (boardRef.current?.getBoundingClientRect().width ?? 0) / 8;
      pendingDragRef.current = { source, startX: e.clientX, startY: e.clientY, size };
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
          didDragRef.current = true;
          setDragging({ source: pending.source, size: pending.size });
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
        const destAttr = (ev.target as HTMLElement | null)?.closest<HTMLElement>('[data-square]')
          ?.dataset.square;
        const destIndex = destAttr !== undefined ? Number(destAttr) : null;
        onDrop(pending.source, destIndex);
        // didDragRef stays true so the trailing synthetic click is suppressed.
      };
      // The OS / browser can abort a gesture (e.g. it decides a touch is a
      // scroll). Tear down without applying a drop.
      const onPointerCancel = () => {
        cleanup();
        pendingDragRef.current = null;
        didDragRef.current = false;
        setDragging(null);
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
    [enabled, boardRef, pieceAt, onDrop]
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
    dragSource: dragging?.source ?? null,
    dragSize: dragging?.size ?? null,
    handlePointerDown,
    floatingRef,
    consumeTrailingClick,
  };
}
