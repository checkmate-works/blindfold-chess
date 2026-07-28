import { EMPTY_BOARD_FEN } from './board-editor-constants';

/**
 * Comparison helpers for the create forms' unsaved-changes dirty check.
 *
 * Both create forms (position-memory and puzzle) start pre-populated: a
 * default title is always present, and a fork or a `?fen=` / `?chunk=`
 * injection seeds the board, the tags, and the text fields. The dirty check
 * must therefore compare each field against the value it was *seeded* with,
 * never against "empty" — otherwise the guard fires on the first navigation
 * away from an untouched fork.
 */

/** Stable key for an unordered list of tag options, for dirty comparison. */
export function toSortedIdKey(items: ReadonlyArray<{ id: string }>): string {
  return items
    .map((item) => item.id)
    .sort()
    .join(',');
}

/**
 * Treat the empty-board FEN and a blank input as the same "no position yet"
 * baseline, so clearing the board on a fresh `/new` does not count as an edit.
 * Fork mode seeds a real FEN, so a change there is still detected.
 */
export function normalizeBaselineFen(fen: string): string {
  const trimmed = fen.trim();
  return trimmed === EMPTY_BOARD_FEN ? '' : trimmed;
}
