import { isValidSkillLevel } from '@blindfold-chess/features/ai-game';

import { isEngineConfig } from '@/lib/engines';
import { isAiReplyDuration } from '@/lib/games/ai-reply-duration';
import { isBoardVisibility } from '@/lib/games/board-visibility';
import { isOperationTotals } from '@/lib/games/operation-totals';
import type { StoredGame } from '@/lib/games/saved-game-types';

/**
 * Shape checks for a single `PreferenceChangeLogEntry` as read off
 * disk. Lifted out of the per-game validator so the discriminated-union
 * check stays readable: a malformed entry must have the right `key`
 * AND a `from`/`to` pair of the correct shape for that key.
 *
 * The `showBoardButtonInGame` branch is the only legacy key still
 * accepted at the boundary — `stored-game-migration` then rewrites it
 * into a `boardVisibility` entry so the in-app representation is
 * uniform. New keys should be added to BOTH this validator AND the
 * migration helper (when they need a shape change).
 */
export function isValidPreferenceChangeEntry(entry: unknown): boolean {
  if (typeof entry !== 'object' || entry === null) return false;
  const e = entry as Record<string, unknown>;
  if (typeof e.atMoveIndex !== 'number' || e.atMoveIndex < 0) return false;

  switch (e.key) {
    // Legacy boolean key — accepted at the validator boundary so the
    // record loads, then transformed to a 'boardVisibility' entry by
    // the migration helper.
    case 'showBoardButtonInGame':
      return typeof e.from === 'boolean' && typeof e.to === 'boolean';
    case 'highlightLastMove':
    case 'showPieceDestinations':
    case 'showOwnPieces':
    case 'showOpponentPieces':
      return typeof e.from === 'boolean' && typeof e.to === 'boolean';
    case 'pieceShapeMode': {
      const shapes = ['normal', 'circles-all', 'circles-own', 'circles-opponent'];
      return shapes.includes(e.from as string) && shapes.includes(e.to as string);
    }
    case 'pieceColors': {
      const colors = ['normal', 'white-only', 'black-only'];
      return colors.includes(e.from as string) && colors.includes(e.to as string);
    }
    case 'pawnHideMode': {
      const modes = ['none', 'all', 'own', 'opponent'];
      return modes.includes(e.from as string) && modes.includes(e.to as string);
    }
    case 'peekMode': {
      const modes = ['modal', 'inline'];
      return modes.includes(e.from as string) && modes.includes(e.to as string);
    }
    case 'boardVisibility': {
      return isBoardVisibility(e.from) && isBoardVisibility(e.to);
    }
    case 'moveInputMode': {
      const modes = ['text', 'select', 'button'];
      return modes.includes(e.from as string) && modes.includes(e.to as string);
    }
    case 'aiReplyDuration': {
      return isAiReplyDuration(e.from) && isAiReplyDuration(e.to);
    }
    default:
      return false;
  }
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
      (Array.isArray(g.operationLogs) &&
        g.operationLogs.every(
          (log) =>
            typeof log === 'object' &&
            log !== null &&
            ['text', 'text-autocomplete', 'select', 'button', 'board'].includes(
              (log as Record<string, unknown>).inputMethod as string
            ) &&
            typeof (log as Record<string, unknown>).peekCount === 'number' &&
            typeof (log as Record<string, unknown>).undoCount === 'number' &&
            (typeof (log as Record<string, unknown>).movePeekCount === 'number' ||
              (log as Record<string, unknown>).movePeekCount === undefined) &&
            (typeof (log as Record<string, unknown>).invalidCount === 'number' ||
              (log as Record<string, unknown>).invalidCount === undefined) &&
            ((log as Record<string, unknown>).invalidAttempts === undefined ||
              (Array.isArray((log as Record<string, unknown>).invalidAttempts) &&
                ((log as Record<string, unknown>).invalidAttempts as unknown[]).every(
                  (s) => typeof s === 'string'
                )))
        ))) &&
    (g.operationTotals === undefined || isOperationTotals(g.operationTotals)) &&
    (g.preferenceChangeLog === undefined ||
      (Array.isArray(g.preferenceChangeLog) &&
        g.preferenceChangeLog.every((entry) => isValidPreferenceChangeEntry(entry))))
  );
}
