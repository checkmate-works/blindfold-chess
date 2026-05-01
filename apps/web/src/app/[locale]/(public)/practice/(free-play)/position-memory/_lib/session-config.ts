/**
 * Shared session configuration constants for the position-memory feature.
 *
 * The time limit range and default are referenced by both the single-position
 * start form (`[id]/page.tsx` → `PositionStartForm`) and the single-position
 * session entry (`[id]/session/page.tsx`), so they live in one place.
 */

export const MIN_TIME_LIMIT = 5;
export const MAX_TIME_LIMIT = 60;
export const DEFAULT_TIME_LIMIT = 30;

/**
 * The user can choose how the position is presented during the memorize phase:
 * - `board`: render the chess board (default)
 * - `text`: render the algebraic piece list (e.g. "White Pieces: Kh4 g2 h3")
 */
export const DISPLAY_MODES = ['board', 'text'] as const;
export type DisplayMode = (typeof DISPLAY_MODES)[number];
export const DEFAULT_DISPLAY_MODE: DisplayMode = 'board';

export function parseDisplayMode(value: unknown): DisplayMode {
  return value === 'text' ? 'text' : 'board';
}

/**
 * localStorage key used to remember that the user skipped the position-memory
 * tutorial. Lives here (not in a component file) so both the setup flow and
 * the session view can import it without creating cross-component coupling.
 */
export const TUTORIAL_SKIPPED_KEY = 'positionMemoryTutorialSkipped';

/**
 * Clamp an arbitrary value into the valid time-limit range.
 *
 * Accepts unknown input (as comes from URL search params) and falls back to
 * {@link DEFAULT_TIME_LIMIT} by default, or to `opts.fallback` when provided.
 * The fallback override exists because the multi-problem session page uses a
 * different default (10 seconds) than the single-position start form (30).
 */
export function clampTimeLimit(value: unknown, opts?: { fallback?: number }): number {
  const fallback = opts?.fallback ?? DEFAULT_TIME_LIMIT;
  const num = typeof value === 'string' ? parseInt(value, 10) : NaN;
  if (Number.isNaN(num)) return fallback;
  return Math.max(MIN_TIME_LIMIT, Math.min(MAX_TIME_LIMIT, num));
}
