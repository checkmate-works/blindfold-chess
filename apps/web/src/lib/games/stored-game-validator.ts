import { isValidSkillLevel } from '@blindfold-chess/features/ai-game';
import { PAWN_HIDE_MODES, PIECE_COLOR_MODES, PIECE_SHAPE_MODES } from '@blindfold-chess/types';

import { isEngineConfig } from '@/lib/engines';
import { isAiReplyDuration } from '@/lib/games/ai-reply-duration';
import { isBoardVisibility } from '@/lib/games/board-visibility';
import { isMoveOperationLog } from '@/lib/games/move-operation-log';
import { isOperationTotals } from '@/lib/games/operation-totals';
import type { PreferenceChangeLogEntry, StoredGame } from '@/lib/games/saved-game-types';
import { isUndoneMoveLog } from '@/lib/games/undone-logs';

/** Validates the `from`/`to` pair of one change-log entry for a given key. */
type EntryValueCheck = (from: unknown, to: unknown) => boolean;

const bothBooleans: EntryValueCheck = (from, to) =>
  typeof from === 'boolean' && typeof to === 'boolean';

const bothMembersOf =
  (values: readonly string[]): EntryValueCheck =>
  (from, to) =>
    values.includes(from as string) && values.includes(to as string);

/**
 * One check per `PreferenceChangeLogEntry` key.
 *
 * `satisfies Record<PreferenceChangeLogEntry['key'], …>` is the point of this
 * map: adding a key to the union without a check here is a compile error in
 * this file. It used to be a `switch` with `default: return false`, paired
 * with a prose note asking future authors to remember this file — and
 * forgetting was not a mild failure. An unrecognised key fails
 * `isValidPreferenceChangeEntry` → `isValidStoredGame` → the row is filtered
 * out of `loadAll`, so the player's entire saved game silently disappears
 * from localStorage on the next load, not just the one log entry.
 */
const ENTRY_VALUE_CHECKS = {
  highlightLastMove: bothBooleans,
  showPieceDestinations: bothBooleans,
  showOwnPieces: bothBooleans,
  showOpponentPieces: bothBooleans,
  pieceShapeMode: bothMembersOf(PIECE_SHAPE_MODES),
  pieceColors: bothMembersOf(PIECE_COLOR_MODES),
  pawnHideMode: bothMembersOf(PAWN_HIDE_MODES),
  boardVisibility: (from, to) => isBoardVisibility(from) && isBoardVisibility(to),
  moveInputMode: bothMembersOf(['text', 'select', 'button']),
  aiReplyDuration: (from, to) => isAiReplyDuration(from) && isAiReplyDuration(to),
} as const satisfies Record<PreferenceChangeLogEntry['key'], EntryValueCheck>;

/**
 * Keys that no longer exist in `PreferenceChangeLogEntry` but may still sit
 * in records written by older builds. They are accepted so those records
 * keep loading — rejecting one would drop the whole game (see above).
 *
 * `showBoardButtonInGame` is additionally rewritten into a `boardVisibility`
 * entry by `stored-game-migration`, so the in-app representation stays
 * uniform; `peekMode` entries are carried through as-is.
 */
const LEGACY_ENTRY_VALUE_CHECKS: Record<string, EntryValueCheck> = {
  showBoardButtonInGame: bothBooleans,
  peekMode: bothMembersOf(['modal', 'inline']),
};

/**
 * Shape checks for a single `PreferenceChangeLogEntry` as read off
 * disk. Lifted out of the per-game validator so the discriminated-union
 * check stays readable: a malformed entry must have a known `key` AND a
 * `from`/`to` pair of the correct shape for that key.
 */
export function isValidPreferenceChangeEntry(entry: unknown): boolean {
  if (typeof entry !== 'object' || entry === null) return false;
  const e = entry as Record<string, unknown>;
  if (typeof e.atMoveIndex !== 'number' || e.atMoveIndex < 0) return false;
  if (typeof e.key !== 'string') return false;

  const check: EntryValueCheck | undefined =
    (ENTRY_VALUE_CHECKS as Record<string, EntryValueCheck>)[e.key] ??
    LEGACY_ENTRY_VALUE_CHECKS[e.key];
  return check !== undefined && check(e.from, e.to);
}

/**
 * Type guard for a row in the on-disk games array. Accepts either the
 * legacy `skillLevel`-only shape or the new `engineConfig` shape — at
 * least one must be present and valid.
 *
 * Records older than the EngineConfig migration only carry
 * `skillLevel`; everything written after the migration carries
 * `engineConfig`. The migration helper folds both into the single
 * in-app `Game` representation.
 *
 * Why this is its own module: validating an on-disk record is a
 * different concern from storing one. Splitting it out also gives the
 * migration helper a typed input — the helper's invariants assume the
 * record has already passed this guard.
 */
export function isValidStoredGame(stored: unknown): stored is StoredGame {
  if (typeof stored !== 'object' || stored === null) {
    return false;
  }

  const g = stored as Record<string, unknown>;

  const hasLegacySkillLevel = typeof g.skillLevel === 'number' && isValidSkillLevel(g.skillLevel);
  const hasNewEngineConfig = isEngineConfig(g.engineConfig);

  return (
    typeof g.id === 'string' &&
    typeof g.date === 'string' &&
    Array.isArray(g.moves) &&
    g.moves.every((m) => typeof m === 'string') &&
    (g.playerColor === 'white' || g.playerColor === 'black') &&
    (hasLegacySkillLevel || hasNewEngineConfig) &&
    ['in_progress', 'win', 'loss', 'draw'].includes(g.status as string) &&
    (g.lastPlayed === undefined || typeof g.lastPlayed === 'string') &&
    (g.startingFen === undefined || typeof g.startingFen === 'string') &&
    (g.gamePreferences === undefined ||
      (typeof g.gamePreferences === 'object' && g.gamePreferences !== null)) &&
    (g.operationLogs === undefined ||
      (Array.isArray(g.operationLogs) && g.operationLogs.every(isMoveOperationLog))) &&
    (g.operationTotals === undefined || isOperationTotals(g.operationTotals)) &&
    (g.undoneLogs === undefined ||
      (Array.isArray(g.undoneLogs) && g.undoneLogs.every((entry) => isUndoneMoveLog(entry)))) &&
    (g.preferenceChangeLog === undefined ||
      (Array.isArray(g.preferenceChangeLog) &&
        g.preferenceChangeLog.every((entry) => isValidPreferenceChangeEntry(entry))))
  );
}
