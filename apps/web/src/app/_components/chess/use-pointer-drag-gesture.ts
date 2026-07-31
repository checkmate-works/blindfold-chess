'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const DRAG_THRESHOLD_PX = 4;

type Params<TSource> = {
  /** Interactive mode — a disabled board never arms a drag. */
  enabled: boolean;
  /**
   * Cancels an in-flight drag whenever it changes, for boards whose content can
   * shift underneath a live gesture (the live board keys this to its FEN).
   * Omit on boards where nothing but the user moves the pieces.
   */
  resetKey?: unknown;
  /**
   * What is being dragged, resolved from the press. Return `null` for a press
   * that is not a drag source (an empty square, a piece the viewer may not
   * move) — it then falls through to the board's click handler, preserving
   * click-to-move / tap-to-place.
   */
  resolveSource: (e: React.PointerEvent) => TSource | null;
  /** Side length (px) of one square, for sizing the floating piece. */
  measureSquareSize: (e: React.PointerEvent) => number;
  /** Fired once, when the press crosses the threshold and becomes a real drag. */
  onDragStart?: () => void;
  /**
   * Fired on release after a real drag. `squareAttr` is the `data-square`
   * value of the square under the pointer, or `undefined` when the release
   * landed outside every square — which each board reads its own way (an
   * off-board release cancels a move, but removes a piece in the editor).
   */
  onDrop: (source: TSource, squareAttr: string | undefined) => void;
  /** Fired when the OS / browser aborts the gesture (see `pointercancel`). */
  onCancel?: () => void;
};

type Result<TSource> = {
  /** What is currently being dragged, or `null`. */
  dragSource: TSource | null;
  /** Side length (px) of one square, used to size the floating piece. */
  dragSize: number | null;
  handlePointerDown: (e: React.PointerEvent) => void;
  /** Ref callback for the floating piece element — seeds + tracks its position. */
  floatingRef: (el: HTMLDivElement | null) => void;
  /**
   * Returns `true` (and consumes the flag) when the next click is the
   * synthetic click trailing a completed drag and should be swallowed so it
   * doesn't double as a click-to-move / tap-to-place action.
   */
  consumeTrailingClick: () => boolean;
};

/**
 * The pointer drag-and-drop gesture shared by the app's chess boards.
 *
 * A press on a drag source arms a pending drag; once the pointer moves past a
 * small threshold the piece is lifted as a DOM element following the cursor
 * (rendered by the caller into a body portal via {@link Result.floatingRef}),
 * and the source square fades. Window listeners track move/up so the gesture
 * survives the pointer leaving the board; hit-testing on release uses the
 * element under the pointer (the floating piece is `pointer-events: none`),
 * which also makes it unit-testable in jsdom. Touch is handled natively by
 * pointer events, so taps still fall through to click handling.
 *
 * Bookkeeping is kept in refs so the window listeners never go stale and never
 * force a re-render on every `pointermove`.
 *
 * What a board decides for itself: what counts as a drag source, how to
 * measure a square, and what a release means. Everything else — the threshold,
 * the touch pointer-capture release, the listener lifecycle, the trailing-click
 * suppression — lives here, because it was previously maintained twice
 * (`useBoardDragDrop` and `useEditableBoardDragDrop`) and is exactly the kind
 * of detail that must not drift between two copies.
 */
export function usePointerDragGesture<TSource>({
  enabled,
  resetKey,
  resolveSource,
  measureSquareSize,
  onDragStart,
  onDrop,
  onCancel,
}: Params<TSource>): Result<TSource> {
  const [dragging, setDragging] = useState<{ source: TSource; size: number } | null>(null);

  const pendingDragRef = useRef<{
    source: TSource;
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

  // Cancel any in-flight drag when the board's content changes underneath it.
  useEffect(() => {
    pendingDragRef.current = null;
    didDragRef.current = false;
    dragCleanupRef.current?.();
    setDragging(null);
  }, [resetKey]);

  // Detach lingering window listeners if the board unmounts mid-drag.
  useEffect(() => () => dragCleanupRef.current?.(), []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!enabled || e.button !== 0) return;
      const source = resolveSource(e);
      if (source === null) return;

      // Touch pointers get *implicit* pointer capture on the element hit by
      // `pointerdown`, which pins `event.target` to that element for the
      // rest of the gesture — subsequent `pointermove`/`pointerup` events
      // report the drag source as their target no matter where the finger
      // actually is. Releasing capture immediately restores normal
      // pointer-position-based targeting (as mouse input already has), so
      // the drop-square lookup below sees the real element under the finger.
      (e.target as Element).releasePointerCapture?.(e.pointerId);

      const size = measureSquareSize(e);
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
          // Threshold crossed → start lifting.
          didDragRef.current = true;
          onDragStart?.();
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
        const squareAttr = (ev.target as HTMLElement | null)?.closest<HTMLElement>('[data-square]')
          ?.dataset.square;
        onDrop(pending.source, squareAttr);
        // didDragRef stays true so the trailing synthetic click is suppressed.
      };
      // The OS / browser can abort a gesture (e.g. it decides a touch is a
      // scroll, or a system UI takes over). Tear down without applying a drop.
      const onPointerCancel = () => {
        cleanup();
        pendingDragRef.current = null;
        didDragRef.current = false;
        setDragging(null);
        onCancel?.();
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
    [enabled, resolveSource, measureSquareSize, onDragStart, onDrop, onCancel]
  );

  const floatingRef = useCallback((el: HTMLDivElement | null) => {
    dragLayerRef.current = el;
    if (el) {
      // eslint-disable-next-line no-param-reassign -- imperative DOM positioning is this hook's point: styling the drag layer per frame without re-rendering the board
      el.style.left = `${dragPosRef.current.x}px`;
      // eslint-disable-next-line no-param-reassign -- see above
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
