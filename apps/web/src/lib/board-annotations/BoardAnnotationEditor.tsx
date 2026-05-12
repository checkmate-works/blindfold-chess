'use client';

import { type MouseEvent, type PointerEvent, useCallback, useRef } from 'react';

import type { Square } from '@blindfold-chess/types';

import { BoardThumbnail } from '@/lib/positions/ui/BoardThumbnail';

import { colorFromModifiers, pointerToSquare, toggleArrow, toggleCircle } from './editor-actions';
import { type BoardAnnotations, EMPTY_BOARD_ANNOTATIONS } from './types';

type Props = {
  fen: string;
  value: BoardAnnotations;
  onChange: (next: BoardAnnotations) => void;
  flipped?: boolean;
  className?: string;
  /**
   * Disable interaction (e.g. while the parent form is submitting).
   * The board still renders the current annotations read-only.
   */
  disabled?: boolean;
};

/**
 * Interactive annotation editor for a single board.
 *
 * Interaction model mirrors lichess's drawing UX:
 *
 * - **Right-click + drag**: arrow from the start square to the release
 *   square. If the same arrow already exists with the same color, it is
 *   cleared (idempotent toggle off); with a different color it is
 *   recolored. See `toggleArrow`.
 * - **Right-click (no drag)**: circle on the clicked square. Same toggle
 *   semantics. See `toggleCircle`.
 * - **Color modifiers**: default green, **Shift** = red, **Alt** = blue,
 *   **Ctrl/Cmd** = yellow. Resolved by `colorFromModifiers`.
 * - **Left-click**: reserved for future "clear preview" — currently no-op.
 *   The dedicated **Clear all** button below the board wipes everything.
 *
 * The component is a controlled input — it never owns the annotation
 * state, only mutates it via `onChange`. The parent form is responsible
 * for persisting on submit.
 */
export function BoardAnnotationEditor({
  fen,
  value,
  onChange,
  flipped = false,
  className,
  disabled = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<Square | null>(null);

  const squareAt = useCallback(
    (clientX: number, clientY: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return null;
      return pointerToSquare(clientX, clientY, rect, flipped);
    },
    [flipped]
  );

  const handleContextMenu = useCallback((e: MouseEvent<HTMLDivElement>) => {
    // Suppress the browser context menu so right-click drag is usable.
    e.preventDefault();
  }, []);

  const handlePointerDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (disabled) return;
      if (e.button !== 2) return; // only right-button
      e.preventDefault();
      dragStartRef.current = squareAt(e.clientX, e.clientY);
    },
    [disabled, squareAt]
  );

  const handlePointerUp = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (disabled) return;
      if (e.button !== 2) return;
      e.preventDefault();
      const from = dragStartRef.current;
      const to = squareAt(e.clientX, e.clientY);
      dragStartRef.current = null;
      if (!from || !to) return;
      const color = colorFromModifiers(e);
      if (from === to) {
        onChange(toggleCircle(value, from, color));
      } else {
        onChange(toggleArrow(value, from, to, color));
      }
    },
    [disabled, onChange, squareAt, value]
  );

  const handleClear = useCallback(() => {
    if (disabled) return;
    onChange(EMPTY_BOARD_ANNOTATIONS);
  }, [disabled, onChange]);

  const hasAnnotations = value.arrows.length > 0 || value.circles.length > 0;

  return (
    <div className={className}>
      <div
        ref={containerRef}
        className="relative select-none touch-none"
        onContextMenu={handleContextMenu}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
      >
        <BoardThumbnail fen={fen} annotations={value} className="w-full" />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span>
          <strong>Right-click</strong> a square for a circle, <strong>right-click + drag</strong>{' '}
          for an arrow.
        </span>
        <span>
          Hold <kbd>Shift</kbd> red, <kbd>Alt</kbd> blue, <kbd>Ctrl</kbd> yellow.
        </span>
        <button
          type="button"
          onClick={handleClear}
          disabled={disabled || !hasAnnotations}
          className="ml-auto px-2 py-1 rounded border border-border text-foreground hover:bg-muted disabled:opacity-50 transition-opacity"
        >
          Clear all
        </button>
      </div>
    </div>
  );
}
