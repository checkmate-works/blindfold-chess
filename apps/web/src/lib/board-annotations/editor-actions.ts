import type { Square } from '@blindfold-chess/types';

import type { AnnotationColor, BoardAnnotations } from './types';

/**
 * Three-state toggle semantics matching lichess's drawing UX:
 *
 *  1. The element does not exist for this slot (from→to or square) → add it.
 *  2. It exists with the same color → remove it (idempotent toggle off).
 *  3. It exists with a different color → replace the color.
 *
 * The same rule applies to both arrows (slotted by `from`+`to`) and
 * circles (slotted by `square`). Self-consistent toggling is the
 * difference between a single-color picker and a four-color picker
 * collapsing onto the same UI: re-pressing the same color clears,
 * pressing a different color recolors, never accidentally stacking
 * two duplicate marks.
 */
export function toggleArrow(
  curr: BoardAnnotations,
  from: Square,
  to: Square,
  color: AnnotationColor
): BoardAnnotations {
  const idx = curr.arrows.findIndex((a) => a.from === from && a.to === to);
  if (idx === -1) {
    return { ...curr, arrows: [...curr.arrows, { from, to, color }] };
  }
  const existing = curr.arrows[idx];
  if (existing.color === color) {
    const next = curr.arrows.slice();
    next.splice(idx, 1);
    return { ...curr, arrows: next };
  }
  const next = curr.arrows.slice();
  next[idx] = { from, to, color };
  return { ...curr, arrows: next };
}

export function toggleCircle(
  curr: BoardAnnotations,
  square: Square,
  color: AnnotationColor
): BoardAnnotations {
  const idx = curr.circles.findIndex((c) => c.square === square);
  if (idx === -1) {
    return { ...curr, circles: [...curr.circles, { square, color }] };
  }
  const existing = curr.circles[idx];
  if (existing.color === color) {
    const next = curr.circles.slice();
    next.splice(idx, 1);
    return { ...curr, circles: next };
  }
  const next = curr.circles.slice();
  next[idx] = { square, color };
  return { ...curr, circles: next };
}

/**
 * Resolve the annotation color from keyboard modifiers on a pointer event,
 * matching lichess: default green, shift→red, alt→blue, ctrl/meta→yellow.
 *
 * Returned in priority order shift > alt > ctrl so that holding multiple
 * modifiers degrades to a single deterministic color rather than the
 * combination silently picking one. Users learning the shortcuts get a
 * stable mental model.
 */
export function colorFromModifiers(e: {
  shiftKey: boolean;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
}): AnnotationColor {
  if (e.shiftKey) return 'red';
  if (e.altKey) return 'blue';
  if (e.ctrlKey || e.metaKey) return 'yellow';
  return 'green';
}

/**
 * Compute the algebraic square at a pointer position over a rendered
 * board, given the board's bounding rectangle. Returns `null` if the
 * pointer is outside the board.
 *
 * The board is assumed to occupy the rectangle as a true 8×8 grid (no
 * padding / borders consumed by the squares themselves), which matches
 * how `BoardThumbnail` and `BoardLayout` render today. The mapping
 * mirrors `getSquareVisualCell` from `board-coords.ts`, kept inline
 * here only because that helper consumes a `square` string and we want
 * the inverse direction.
 */
export function pointerToSquare(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number },
  flipped: boolean
): Square | null {
  if (rect.width <= 0 || rect.height <= 0) return null;
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  if (x < 0 || x >= rect.width || y < 0 || y >= rect.height) return null;
  const col = Math.min(7, Math.max(0, Math.floor((x / rect.width) * 8)));
  const row = Math.min(7, Math.max(0, Math.floor((y / rect.height) * 8)));
  const fileIndex = flipped ? 7 - col : col;
  const rankIndex = flipped ? 7 - row : row;
  const file = 'abcdefgh'[fileIndex] as 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h';
  // rankIndex 0 → rank 8, rankIndex 7 → rank 1
  const rank = String(8 - rankIndex) as '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8';
  return `${file}${rank}`;
}
