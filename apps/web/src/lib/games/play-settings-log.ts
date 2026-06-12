import { isBoardVisibility } from './board-visibility';
import type { GamePlaySettings, PlaySettingsChangeEntry } from './saved-game-types';

/**
 * Per-position blindfold settings for a published game: the start-of-game
 * snapshot ({@link GamePlaySettings}) plus the timeline of mid-game edits
 * ({@link PlaySettingsChangeEntry}), so the replay can show what the player saw
 * at each move rather than only how the game began.
 *
 * Why this is separate from `@/lib/games/fold-preferences`: that module folds
 * the *full* per-game preferences (including non-display keys like
 * `moveInputMode`) for the live play surface and ignores `atMoveIndex` (it only
 * ever wants the present). Here we fold the *display subset* up to a specific
 * half-move, which is exactly what the position-aware shared-game indicator
 * needs and nothing the play surface does.
 */

const PIECE_SHAPE_MODES = ['normal', 'circles-all', 'circles-own', 'circles-opponent'] as const;
const PIECE_COLORS = ['normal', 'white-only', 'black-only'] as const;
const PAWN_HIDE_MODES = ['none', 'all', 'own', 'opponent'] as const;

function isPieceShapeMode(v: unknown): v is GamePlaySettings['pieceShapeMode'] {
  return PIECE_SHAPE_MODES.includes(v as (typeof PIECE_SHAPE_MODES)[number]);
}

function isPieceColors(v: unknown): v is GamePlaySettings['pieceColors'] {
  return PIECE_COLORS.includes(v as (typeof PIECE_COLORS)[number]);
}

function isPawnHideMode(v: unknown): v is GamePlaySettings['pawnHideMode'] {
  return PAWN_HIDE_MODES.includes(v as (typeof PAWN_HIDE_MODES)[number]);
}

/**
 * Validate the self-reported per-game change log into the display subset, or
 * null if absent / empty after filtering.
 *
 * Display-only metadata, so — like `operationLogs` — a malformed entry is
 * dropped rather than rejecting the publish. Only the keys
 * {@link GamePlaySettings} renders are kept (board visibility + which side was
 * shown + piece shape/color); `highlightLastMove` / `peekMode` /
 * `moveInputMode` edits are not display-relevant and are discarded. Each
 * entry's `atMoveIndex` must be an integer within `[0, moveCount]` (the number
 * of half-moves the game has); out-of-range anchors are dropped. Entries are
 * preserved in submitted order (the fold is order-sensitive).
 */
export function normalizePlaySettingsLog(
  raw: unknown,
  moveCount: number
): PlaySettingsChangeEntry[] | null {
  if (!Array.isArray(raw)) return null;

  const entries: PlaySettingsChangeEntry[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const e = item as Record<string, unknown>;
    const atMoveIndex = e.atMoveIndex;
    if (
      typeof atMoveIndex !== 'number' ||
      !Number.isInteger(atMoveIndex) ||
      atMoveIndex < 0 ||
      atMoveIndex > moveCount
    ) {
      continue;
    }

    switch (e.key) {
      case 'showOwnPieces':
      case 'showOpponentPieces':
        if (typeof e.to === 'boolean') entries.push({ atMoveIndex, key: e.key, to: e.to });
        break;
      case 'boardVisibility':
        if (isBoardVisibility(e.to)) entries.push({ atMoveIndex, key: e.key, to: e.to });
        break;
      case 'pieceShapeMode':
        if (isPieceShapeMode(e.to)) entries.push({ atMoveIndex, key: e.key, to: e.to });
        break;
      case 'pieceColors':
        if (isPieceColors(e.to)) entries.push({ atMoveIndex, key: e.key, to: e.to });
        break;
      case 'pawnHideMode':
        if (isPawnHideMode(e.to)) entries.push({ atMoveIndex, key: e.key, to: e.to });
        break;
      // Non-display keys (highlightLastMove / peekMode / moveInputMode) and any
      // unknown key fall through and are discarded.
    }
  }

  return entries.length > 0 ? entries : null;
}

/**
 * Effective blindfold settings at a given board position: the start-of-game
 * snapshot with every change-log entry whose `atMoveIndex <= halfMovesShown`
 * applied in order (later entries win per key). `halfMovesShown` is the number
 * of half-moves played at the displayed position (0 = the opening board).
 *
 * Pure: `initial` is not mutated and a missing / empty log returns a copy.
 */
export function playSettingsAtHalfMove(
  initial: GamePlaySettings,
  log: readonly PlaySettingsChangeEntry[] | null | undefined,
  halfMovesShown: number
): GamePlaySettings {
  const result: GamePlaySettings = { ...initial };
  if (!log) return result;

  for (const entry of log) {
    if (entry.atMoveIndex > halfMovesShown) continue;
    switch (entry.key) {
      case 'showOwnPieces':
      case 'showOpponentPieces':
        result[entry.key] = entry.to;
        break;
      case 'boardVisibility':
        result.boardVisibility = entry.to;
        break;
      case 'pieceShapeMode':
        result.pieceShapeMode = entry.to;
        break;
      case 'pieceColors':
        result.pieceColors = entry.to;
        break;
      case 'pawnHideMode':
        result.pawnHideMode = entry.to;
        break;
    }
  }
  return result;
}

/**
 * Whether a single settings state is worth surfacing — i.e. it is not a plain,
 * fully-sighted standard game (board always visible, both sides shown, normal
 * shape and color). Mirrors the render gate in the settings indicator.
 */
export function playSettingsAreNotable(s: GamePlaySettings): boolean {
  return (
    s.boardVisibility !== 'always' ||
    !s.showOwnPieces ||
    !s.showOpponentPieces ||
    s.pieceShapeMode !== 'normal' ||
    s.pieceColors !== 'normal' ||
    s.pawnHideMode !== 'none'
  );
}

/**
 * Whether a game ever used non-default blindfold settings — at the start or at
 * any point thereafter. Drives whether the position-aware indicator is shown at
 * all: a game that was fully sighted start to finish has nothing to surface,
 * while a game that started sighted and was later obscured (or vice versa) does.
 */
export function gameUsedNotablePlaySettings(
  initial: GamePlaySettings,
  log: readonly PlaySettingsChangeEntry[] | null | undefined
): boolean {
  if (playSettingsAreNotable(initial)) return true;
  // A non-empty log means at least one display key was changed mid-game; the
  // resulting state may differ from the plain default, so the game is notable.
  return !!log && log.length > 0;
}
