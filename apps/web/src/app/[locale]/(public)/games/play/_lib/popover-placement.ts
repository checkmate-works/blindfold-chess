type Box = { top: number; bottom: number; right: number };
type Size = { width: number; height: number };

/** Gap between the anchor and the popover, and minimum gap to the viewport edge. */
const GAP = 4;
const EDGE_MARGIN = 8;

/**
 * Viewport coordinates for a `position: fixed` popover hanging off `anchor`:
 * right-aligned to it, below it when it fits on screen, otherwise above it
 * when that fits, otherwise below anyway (the page can still be scrolled to
 * it). Horizontally it is kept inside the viewport.
 *
 * Fixed positioning against the viewport is what lets a popover opened from
 * inside a scrolling list escape the list's clipping; this is the arithmetic
 * that keeps it next to the row that opened it.
 */
export function placePopover(
  anchor: Box,
  size: Size,
  viewport: Size
): { top: number; left: number } {
  const below = anchor.bottom + GAP;
  const above = anchor.top - GAP - size.height;
  const fitsBelow = below + size.height <= viewport.height - EDGE_MARGIN;
  const fitsAbove = above >= EDGE_MARGIN;
  const top = fitsBelow || !fitsAbove ? below : above;

  const left = Math.max(
    EDGE_MARGIN,
    Math.min(anchor.right - size.width, viewport.width - size.width - EDGE_MARGIN)
  );
  return { top, left };
}
