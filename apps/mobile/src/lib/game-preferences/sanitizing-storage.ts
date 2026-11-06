import type { PersistentStorage } from "@blindfold-chess/features/common";
import {
  resolveStoredGamePreferences,
  type GamePreferences,
} from "@blindfold-chess/features/game-preferences";

/**
 * Wrap a `PersistentStorage` so that reads come back sanitised by the shared
 * game-preferences rules: unknown keys and invalid values are dropped, the
 * legacy `showBoardButtonInGame` boolean is migrated, absent keys are filled
 * from `defaults`, and an active move-input mode outside the enabled list is
 * repaired.
 *
 * `usePersistentSettings` merges whatever JSON it reads straight over its
 * defaults; doing the sanitising here, at the storage boundary, lets the
 * mobile store reuse that hook instead of re-implementing load / save. An
 * unparseable payload is returned untouched so the hook's own invalid-JSON
 * path keeps the defaults.
 */
export function createSanitizingPreferencesStorage(
  storage: PersistentStorage,
  defaults: GamePreferences,
): PersistentStorage {
  return {
    async get(key) {
      const raw = await storage.get(key);
      if (!raw) return raw;
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return raw;
      }
      return JSON.stringify(resolveStoredGamePreferences(parsed, defaults));
    },
    set(key, value) {
      return storage.set(key, value);
    },
  };
}
