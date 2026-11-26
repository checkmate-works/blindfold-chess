import {
  type PerGamePreferences,
  PER_GAME_PREFERENCE_KEYS,
  validateGamePreferences,
} from "@blindfold-chess/features/game-preferences";

/**
 * The game's preference snapshot as the `gamePrefs` route param — the same
 * name and JSON shape as the web's `/games/play?gamePrefs=`.
 */
export function encodeGamePrefsParam(preferences: PerGamePreferences): string {
  return JSON.stringify(preferences);
}

/**
 * Read the `gamePrefs` param back. Only per-game keys with valid values
 * survive, so the result can be laid over the global preferences as it is;
 * a missing or unreadable param yields no overrides and the game plays under
 * the global ones.
 */
export function decodeGamePrefsParam(
  param: string | undefined,
): Partial<PerGamePreferences> {
  if (!param) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(param);
  } catch {
    return {};
  }
  const valid = validateGamePreferences(parsed);
  const picked: Partial<Record<keyof PerGamePreferences, unknown>> = {};
  for (const key of PER_GAME_PREFERENCE_KEYS) {
    if (valid[key] !== undefined) picked[key] = valid[key];
  }
  return picked as Partial<PerGamePreferences>;
}
