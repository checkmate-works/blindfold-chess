import type { EngineConfig } from '@/lib/engines';
import { legacyToBoardVisibility } from '@/lib/games/board-visibility';
import { normalisePerGamePreferences } from '@/lib/games/per-game-preferences';
import type {
  Game,
  PreferenceChangeLogEntry,
  SkillLevel,
  StoredGame,
} from '@/lib/games/saved-game-types';

/**
 * Migrate one preference-change entry from the legacy on-disk shape to
 * the in-app shape. Currently only `showBoardButtonInGame` boolean
 * entries need transformation — the other keys round-trip unchanged.
 *
 * Pre-condition: `entry` has already passed
 * `isValidPreferenceChangeEntry` from `./stored-game-validator`, so
 * the unsafe casts below are sound at the type-check boundary.
 */
export function migrateChangeLogEntry(entry: Record<string, unknown>): PreferenceChangeLogEntry {
  if (entry.key === 'showBoardButtonInGame') {
    return {
      atMoveIndex: entry.atMoveIndex as number,
      key: 'boardVisibility',
      from: legacyToBoardVisibility(entry.from as boolean),
      to: legacyToBoardVisibility(entry.to as boolean),
    };
  }
  return entry as unknown as PreferenceChangeLogEntry;
}

/**
 * Promote a {@link StoredGame} (which may be in either legacy or new
 * format) into the strict in-app {@link Game}.
 *
 * Legacy records whose only difficulty hint is `skillLevel` are
 * assumed Stockfish — there was no other engine before the migration,
 * so the assumption is exact, not heuristic. The legacy `skillLevel`
 * field is dropped from the returned object so downstream code only
 * ever pattern-matches on `engineConfig`.
 *
 * Promote the on-disk preferences blob to a complete, type-safe
 * `PerGamePreferences`:
 *   - maps legacy `showBoardButtonInGame: boolean` → `boardVisibility`;
 *   - fills missing fields (`peekMode`, `moveInputMode`, …) with safe
 *     defaults — necessary so a mid-game settings edit on a
 *     pre-Phase-2 record can produce a well-formed
 *     `preferenceChangeLog` entry (an entry built from
 *     `from: undefined` would fail validation on the next read and
 *     silently drop the saved game).
 *
 * Records with no `gamePreferences` field at all stay `undefined` and
 * continue to fall back to global preferences in the consumer.
 *
 * @design Why this is its own module
 * Migration logic is pure: given a stored row, return the in-app row.
 * It has no storage I/O and no React. Splitting it out keeps the
 * `LocalStorageGameRepository` focused on the storage I/O concern and
 * makes the migration testable in isolation (a future "legacy → new"
 * change can be validated without standing up localStorage).
 */
export function normaliseStoredGame(stored: StoredGame): Game {
  const { skillLevel: legacySkillLevel, engineConfig: storedConfig, ...rest } = stored;
  const engineConfig: EngineConfig =
    storedConfig ??
    ({
      kind: 'stockfish',
      skillLevel: (legacySkillLevel ?? 5) as SkillLevel,
    } as const);

  const gamePreferences = normalisePerGamePreferences(rest.gamePreferences);
  const preferenceChangeLog = rest.preferenceChangeLog?.map((entry) =>
    migrateChangeLogEntry(entry as unknown as Record<string, unknown>)
  );

  return {
    ...rest,
    engineConfig,
    gamePreferences,
    preferenceChangeLog,
    // If lastPlayed doesn't exist, use date as fallback.
    lastPlayed: rest.lastPlayed || rest.date,
  };
}
