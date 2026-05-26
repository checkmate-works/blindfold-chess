import type { PerGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import { isBoardVisibility, legacyToBoardVisibility } from './board-visibility';

/**
 * Safe defaults applied when a per-game preferences object is missing a field
 * or carries an invalid value. The boolean / enum choices here mirror the
 * historical behaviour ("highlight the last move", "show all pieces", "normal
 * pieces") so a legacy record that predates a given field reads back as if
 * that field had always been on.
 *
 * `boardVisibility: 'peek'` matches `DEFAULT_BOARD_VISIBILITY` and preserves
 * the pre-three-state behaviour of "the board can be peeked at". `peekMode`
 * and `moveInputMode` defaults are intentionally the lowest-affordance choice
 * (`modal`, `text`) so a partially-migrated record never silently enables a
 * UI affordance the player did not opt into.
 */
export const DEFAULT_PER_GAME_PREFERENCES: PerGamePreferences = {
  boardVisibility: 'peek',
  highlightLastMove: true,
  showOwnPieces: true,
  showOpponentPieces: true,
  pieceShapeMode: 'normal',
  pieceColors: 'normal',
  peekMode: 'modal',
  moveInputMode: 'text',
};

const PIECE_SHAPE_MODES = [
  'normal',
  'circles-all',
  'circles-own',
  'circles-opponent',
] as const satisfies readonly PerGamePreferences['pieceShapeMode'][];
const PIECE_COLORS = [
  'normal',
  'white-only',
  'black-only',
] as const satisfies readonly PerGamePreferences['pieceColors'][];
const PEEK_MODES = ['modal', 'inline'] as const satisfies readonly PerGamePreferences['peekMode'][];
const MOVE_INPUT_MODES = [
  'text',
  'select',
  'button',
] as const satisfies readonly PerGamePreferences['moveInputMode'][];

function isOneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value);
}

/**
 * Normalize an arbitrary value into a complete, type-safe
 * {@link PerGamePreferences}. Used at every read boundary that turns a
 * persisted blob (localStorage, URL `gamePrefs`) into the in-app shape so
 * downstream code can rely on every key being present and valid.
 *
 * Semantics:
 * - `undefined` / `null` / non-object input → `undefined` (no snapshot).
 *   Pre-Phase-1 games that never recorded a per-game snapshot stay snapshot-less.
 * - Object input → a fully populated {@link PerGamePreferences}, with:
 *   - legacy `showBoardButtonInGame: boolean` mapped to `boardVisibility` via
 *     {@link legacyToBoardVisibility} (the legacy key is dropped from the result);
 *   - existing valid `boardVisibility` preserved as-is;
 *   - missing or invalid fields filled from `defaults`.
 *
 * `defaults` lets the caller substitute the user's current global preferences
 * for missing fields (more user-friendly than hard-coded fallbacks). When
 * omitted, the conservative {@link DEFAULT_PER_GAME_PREFERENCES} are used —
 * sufficient on its own for the saved-game and URL parsing paths, both of
 * which run before any user-level preferences are available.
 */
export function normalisePerGamePreferences(
  raw: unknown,
  defaults: PerGamePreferences = DEFAULT_PER_GAME_PREFERENCES
): PerGamePreferences | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw !== 'object') return { ...defaults };

  const p = raw as Record<string, unknown>;

  let boardVisibility = defaults.boardVisibility;
  if (isBoardVisibility(p.boardVisibility)) {
    boardVisibility = p.boardVisibility;
  } else if (typeof p.showBoardButtonInGame === 'boolean') {
    boardVisibility = legacyToBoardVisibility(p.showBoardButtonInGame);
  }

  return {
    boardVisibility,
    highlightLastMove:
      typeof p.highlightLastMove === 'boolean' ? p.highlightLastMove : defaults.highlightLastMove,
    showOwnPieces: typeof p.showOwnPieces === 'boolean' ? p.showOwnPieces : defaults.showOwnPieces,
    showOpponentPieces:
      typeof p.showOpponentPieces === 'boolean'
        ? p.showOpponentPieces
        : defaults.showOpponentPieces,
    pieceShapeMode: isOneOf(p.pieceShapeMode, PIECE_SHAPE_MODES)
      ? p.pieceShapeMode
      : defaults.pieceShapeMode,
    pieceColors: isOneOf(p.pieceColors, PIECE_COLORS) ? p.pieceColors : defaults.pieceColors,
    peekMode: isOneOf(p.peekMode, PEEK_MODES) ? p.peekMode : defaults.peekMode,
    moveInputMode: isOneOf(p.moveInputMode, MOVE_INPUT_MODES)
      ? p.moveInputMode
      : defaults.moveInputMode,
  };
}
