import { isBoardVisibility } from './board-visibility';
import type {
  GamePlaySettings,
  PlaySettingsChangeEntry,
  PreferenceChangeLogEntry,
} from './saved-game-types';

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
 * The per-piece display axes a board renderer understands, with the
 * whole-board `boardVisibility` axis already folded away.
 */
export type BlindfoldDisplayAxes = Pick<
  GamePlaySettings,
  'showOwnPieces' | 'showOpponentPieces' | 'pieceShapeMode' | 'pieceColors' | 'pawnHideMode'
>;

/**
 * Collapse `boardVisibility` — a whole-board axis — into the per-side
 * `showOwnPieces` / `showOpponentPieces` flags, which is all a renderer can
 * act on: `resolvePieceDisplay` has no notion of a hidden *board*, only of
 * hidden pieces.
 *
 * This is the one place that rule lives. Every "as played" surface — the
 * replay GIF, the interactive replay's reproduce-view, the feed and OG
 * thumbnails — has to agree on what "the player could not see this" means,
 * and it was previously copy-pasted into two of them, which is how a
 * peek-mode game came to look hidden on one surface and fully sighted on
 * another.
 *
 * Both `'never'` and `'peek'` count as hidden, matching live play's own
 * masking rule (`boardMasked` in `use-peek-state`) and `BoardVisibility`'s
 * own definition of `'peek'` — "the board is hidden by default; the player
 * invokes a peek action to view it". A reproduction shows a *position*, and
 * for all but the few seconds of an actual peek that position was masked.
 * Surfaces that also want to show the revealed board do it with an extra
 * frame rather than by weakening this rule: the GIF inserts a peek flash at
 * the moves the player actually looked.
 */
export function foldBoardVisibility(settings: GamePlaySettings): BlindfoldDisplayAxes {
  const boardHidden = settings.boardVisibility !== 'always';

  return {
    showOwnPieces: boardHidden ? false : settings.showOwnPieces,
    showOpponentPieces: boardHidden ? false : settings.showOpponentPieces,
    pieceShapeMode: settings.pieceShapeMode,
    pieceColors: settings.pieceColors,
    pawnHideMode: settings.pawnHideMode,
  };
}

/**
 * Reconstruct full `from → to` transitions from a start-of-game snapshot plus
 * the to-only change log. The persisted log records only each change's resulting
 * value (`to`); the `from` is the key's effective value immediately before that
 * change, recovered by folding the log in order. This lets the result page and
 * the shared replay render the identical "Label: from → to" change log from the
 * same (snapshot + to-only log) inputs — neither needs the original
 * `from`-bearing `preferenceChangeLog`, which only the live play surface holds.
 *
 * Entries are returned in log order as the matching {@link PreferenceChangeLogEntry}
 * display variants, so the shared `useChangeLogFormat` formatter consumes them
 * directly. A redundant write whose `to` equals the current effective value is
 * skipped (it changed nothing). Pure: `initial` is not mutated.
 */
export function resolvePlaySettingsChanges(
  initial: GamePlaySettings,
  log: readonly PlaySettingsChangeEntry[] | null | undefined
): PreferenceChangeLogEntry[] {
  if (!log || log.length === 0) return [];
  const state: GamePlaySettings = { ...initial };
  const out: PreferenceChangeLogEntry[] = [];
  for (const entry of log) {
    const from = state[entry.key];
    if (from === entry.to) continue;
    // `from` and `entry.to` share the key's value type by construction, so the
    // assembled object is a valid PreferenceChangeLogEntry for that key.
    out.push({
      atMoveIndex: entry.atMoveIndex,
      key: entry.key,
      from,
      to: entry.to,
    } as PreferenceChangeLogEntry);
    // Advance the running state. The switch keeps each key's value type aligned.
    switch (entry.key) {
      case 'showOwnPieces':
      case 'showOpponentPieces':
        state[entry.key] = entry.to;
        break;
      case 'boardVisibility':
        state.boardVisibility = entry.to;
        break;
      case 'pieceShapeMode':
        state.pieceShapeMode = entry.to;
        break;
      case 'pieceColors':
        state.pieceColors = entry.to;
        break;
      case 'pawnHideMode':
        state.pawnHideMode = entry.to;
        break;
    }
  }
  return out;
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
