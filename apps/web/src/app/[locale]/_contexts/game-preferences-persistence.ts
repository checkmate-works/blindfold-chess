import { writeBoardVisibilityCookieClient } from '@/lib/games/board-visibility-cookie';
import { writeMoveInputCookieClient } from '@/lib/games/move-input-cookie';
import { readJson, writeJson } from '@/lib/persistent-settings/local-storage-adapter';

import type { GamePreferences } from './GamePreferencesContext';
import { validatePreferences } from './game-preferences-validation';

/**
 * Persistence plumbing for the game-preferences provider: the localStorage
 * load/validate/merge/save paths and the SSR cookie mirroring. Kept out of
 * the provider so the provider is left with state + the public API, and the
 * persistence rules are readable (and testable) in one place.
 *
 * Single-writer rule: the provider is the ONLY caller of the cookie-sync
 * helpers. Any other writer would cause drift with localStorage. If the
 * cookie is cleared externally (privacy extensions, incognito, etc.), SSR
 * falls back to the default hint until the user next changes a related
 * preference — an acceptable degradation to today's baseline.
 */

export const PREFERENCES_STORAGE_KEY = 'blindfold-chess-game-preferences';

/**
 * Read, validate, and merge the stored preferences over the defaults,
 * repairing a `moveInputMode` that is no longer among the enabled modes.
 * Returns null when nothing is stored or the read/parse fails.
 */
export function loadStoredPreferences(defaults: GamePreferences): GamePreferences | null {
  const stored = readJson<unknown>(PREFERENCES_STORAGE_KEY, null);
  if (stored === null) return null;
  try {
    const validated = validatePreferences(stored);
    const merged = { ...defaults, ...validated };
    // If current moveInputMode is not in enabledMoveInputModes, switch to
    // the first enabled mode.
    if (!merged.enabledMoveInputModes.includes(merged.moveInputMode)) {
      merged.moveInputMode = merged.enabledMoveInputModes[0];
    }
    return merged;
  } catch (error) {
    console.warn('Failed to load game preferences from localStorage:', error);
    return null;
  }
}

/** Persist the full preferences object (localStorage is the source of truth). */
export function persistPreferences(preferences: GamePreferences): void {
  writeJson(PREFERENCES_STORAGE_KEY, preferences);
}

/**
 * Validate a cross-tab `storage` event payload for our key. Returns the
 * validated partial, or null for other keys / malformed data.
 */
export function parsePreferencesStorageEvent(e: StorageEvent): Partial<GamePreferences> | null {
  if (e.key !== PREFERENCES_STORAGE_KEY || !e.newValue) return null;
  try {
    return validatePreferences(JSON.parse(e.newValue));
  } catch {
    return null; // Ignore malformed data
  }
}

/**
 * Mirror both SSR cookie hints (`bfc_move_input_pref` + board visibility)
 * from the given preferences. Used on initial load and on reset, where both
 * hints must match the effective state.
 */
export function syncPreferenceCookies(
  prefs: Pick<GamePreferences, 'moveInputMode' | 'enabledMoveInputModes' | 'boardVisibility'>
): void {
  writeMoveInputCookieClient({
    mode: prefs.moveInputMode,
    enabledModes: prefs.enabledMoveInputModes,
  });
  writeBoardVisibilityCookieClient(prefs.boardVisibility);
}

/**
 * Mirror only the cookie hints whose backing keys actually changed in this
 * update. MUST be called synchronously before the corresponding `setState`
 * (see the provider's `updatePreferences` comment for the navigation /
 * prefetch race this closes).
 */
export function syncChangedPreferenceCookies(
  prev: GamePreferences,
  updates: Partial<GamePreferences>,
  next: GamePreferences
): void {
  const modeKeysChanged =
    ('moveInputMode' in updates && updates.moveInputMode !== prev.moveInputMode) ||
    ('enabledMoveInputModes' in updates &&
      updates.enabledMoveInputModes !== prev.enabledMoveInputModes);
  if (modeKeysChanged) {
    writeMoveInputCookieClient({
      mode: next.moveInputMode,
      enabledModes: next.enabledMoveInputModes,
    });
  }
  if ('boardVisibility' in updates && updates.boardVisibility !== prev.boardVisibility) {
    writeBoardVisibilityCookieClient(next.boardVisibility);
  }
}
