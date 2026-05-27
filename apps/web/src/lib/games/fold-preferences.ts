import type { PerGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import type { PreferenceChangeLogEntry } from './saved-game-types';

/**
 * Apply a `preferenceChangeLog` on top of the initial per-game preferences
 * snapshot to obtain the current effective values.
 *
 * The fold is left-to-right: later entries override earlier ones for the same
 * key, so the result reflects the most recent value of every field as of the
 * end of the log. The function does not consult `atMoveIndex` because the
 * "current" view is anchored to the present; `atMoveIndex` only matters when
 * rendering the timeline.
 *
 * Pure and side-effect-free — `initial` is not mutated, and an empty log
 * returns a structural copy so callers can safely treat the result as
 * independent state.
 */
export function foldPreferences(
  initial: PerGamePreferences,
  log: readonly PreferenceChangeLogEntry[] | undefined
): PerGamePreferences {
  const result: PerGamePreferences = { ...initial };
  if (!log || log.length === 0) return result;

  for (const entry of log) {
    switch (entry.key) {
      case 'highlightLastMove':
      case 'showOwnPieces':
      case 'showOpponentPieces':
        result[entry.key] = entry.to;
        break;
      case 'pieceShapeMode':
        result.pieceShapeMode = entry.to;
        break;
      case 'pieceColors':
        result.pieceColors = entry.to;
        break;
      case 'peekMode':
        result.peekMode = entry.to;
        break;
      case 'boardVisibility':
        result.boardVisibility = entry.to;
        break;
      case 'moveInputMode':
        result.moveInputMode = entry.to;
        break;
    }
  }
  return result;
}
