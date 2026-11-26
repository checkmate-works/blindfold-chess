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
 * The per-game keys of an untrusted preferences object (a route param, a
 * saved game) that hold valid values. Anything else is dropped, so the
 * result can be laid over the global preferences as it is.
 */
export function pickValidPerGamePreferences(
  raw: unknown,
): Partial<PerGamePreferences> {
  const valid = validateGamePreferences(raw);
  const picked: Partial<Record<keyof PerGamePreferences, unknown>> = {};
  for (const key of PER_GAME_PREFERENCE_KEYS) {
    if (valid[key] !== undefined) picked[key] = valid[key];
  }
  return picked as Partial<PerGamePreferences>;
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
  return pickValidPerGamePreferences(parsed);
}
