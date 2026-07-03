'use client';

import {
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useRef,
} from 'react';

import type { Square as AlgebraicSquare } from '@blindfold-chess/types';

import { colorFromModifiers, pointerToSquare, toggleArrow, toggleCircle } from './editor-actions';
import { type BoardAnnotations, EMPTY_BOARD_ANNOTATIONS } from './types';

/**
 * The lichess-style right-click drawing gesture for board annotations
 * (arrows + circles): right-click a square for a circle, right-click + drag
 * for an arrow, modifier keys pick the color, repeating a mark removes it.
 *
 * Interaction is only active when both the current annotations and the
 * change handler are supplied — otherwise the returned `containerProps` are
 * empty so the right-click context menu remains usable. Left-click
 * semantics are untouched (right-button events do not trigger HTML
 * `onClick`), so a host board keeps its own click handling.
 */
export function useBoardAnnotationDrawing({
  annotations,
  onAnnotationsChange,
  flipped,
}: {
  annotations: BoardAnnotations | null;
  onAnnotationsChange?: (next: BoardAnnotations) => void;
  flipped: boolean;
}) {
  const interactive = annotations !== null && onAnnotationsChange !== undefined;
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<AlgebraicSquare | null>(null);

  const squareAt = useCallback(
    (clientX: number, clientY: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return null;
      return pointerToSquare(clientX, clientY, rect, flipped);
    },
    [flipped]
  );

  const handleContextMenu = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      if (!interactive) return;
      // Suppress the browser context menu so right-click drag is usable.
      e.preventDefault();
    },
    [interactive]
  );

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!interactive) return;
      if (e.button !== 2) return; // only right-button
      e.preventDefault();
      dragStartRef.current = squareAt(e.clientX, e.clientY);
    },
    [interactive, squareAt]
  );

  const handlePointerUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!interactive || !onAnnotationsChange || !annotations) return;
      if (e.button !== 2) return;
      e.preventDefault();
      const from = dragStartRef.current;
      const to = squareAt(e.clientX, e.clientY);
      dragStartRef.current = null;
      if (!from || !to) return;
      const color = colorFromModifiers(e);
      onAnnotationsChange(
        from === to
          ? toggleCircle(annotations, from, color)
          : toggleArrow(annotations, from, to, color)
      );
    },
    [interactive, annotations, onAnnotationsChange, squareAt]
  );

  const clearAnnotations = useCallback(() => {
    if (!interactive || !onAnnotationsChange) return;
    onAnnotationsChange(EMPTY_BOARD_ANNOTATIONS);
  }, [interactive, onAnnotationsChange]);

  const hasAnnotations =
    annotations !== null && (annotations.arrows.length > 0 || annotations.circles.length > 0);

  return {
    /** Whether the drawing gesture is armed. */
    interactive,
    /** Attach to the board's positioned container (the gesture's hit area). */
    containerRef,
    /** Spread onto the container; empty when not interactive. */
    containerProps: interactive
      ? {
          onContextMenu: handleContextMenu,
          onPointerDown: handlePointerDown,
          onPointerUp: handlePointerUp,
        }
      : {},
    hasAnnotations,
    clearAnnotations,
  };
}
