import type { FormattedPgnMove } from '@blindfold-chess/features/chess-core';

/** How many move-pairs the generated fallback title shows before truncating. */
const FALLBACK_PAIRS = 2;

/**
 * Default title for an unnamed line: its opening move-pairs ("1. d4 d5 2.
 * c4 …") rather than a purely numeric "Line N" that says nothing about the
 * line itself — used everywhere a line's `name` is null (the sidebar list,
 * the line detail page, its edit page's breadcrumb). `numericFallback` is
 * the ultimate fallback for the one case a line has no moves to show
 * (shouldn't normally happen — a line's whole point is its moves).
 */
export function lineFallbackTitle(formatted: FormattedPgnMove[], numericFallback: string): string {
  if (formatted.length === 0) return numericFallback;

  const shown = formatted.slice(0, FALLBACK_PAIRS);
  const truncated = formatted.length > FALLBACK_PAIRS;
  const text = shown
    .map(
      (pair) => `${pair.moveNumber}. ${[pair.whiteMove, pair.blackMove].filter(Boolean).join(' ')}`
    )
    .join(' ');
  return truncated ? `${text} …` : text;
}
