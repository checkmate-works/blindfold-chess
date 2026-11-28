import type { ChallengeMenuType } from "../practice-registry/registry";
import type { ChallengeRecord } from "./records";

/**
 * Challenge menus whose `leaderboard_key` is a player-facing setting and
 * therefore a filter on My Records.
 */

/** Menus whose key is the board orientation (`white` / `black` / `random`). */
export const ORIENTATION_FILTER_MENUS = new Set<ChallengeMenuType>([
  "coordinate_quiz",
]);

/** Menus whose key is the practised piece (`king` … `knight` / `random`). */
export const PIECE_FILTER_MENUS = new Set<ChallengeMenuType>(["legal_moves"]);

/** Whether records of `menu` are only meaningful when filtered by a key. */
export function isKeyedMenu(menu: ChallengeMenuType): boolean {
  return ORIENTATION_FILTER_MENUS.has(menu) || PIECE_FILTER_MENUS.has(menu);
}

/**
 * The `leaderboardKey` of the most recent run of `menu` among `sessions`,
 * or `undefined` when there is none.
 *
 * A keyed menu opens on this key: the filter decides which runs the
 * dashboard shows at all, so it has to be one the player actually played in
 * the period. A fixed default (`white`, `random`) left a black-only or
 * knight-only week looking empty. The pick is by timestamp, so the order of
 * `sessions` is not load-bearing.
 */
export function latestLeaderboardKey(
  sessions: readonly ChallengeRecord[],
  menu: ChallengeMenuType,
): string | undefined {
  const latest = sessions
    .filter((s) => s.menuType === menu)
    .reduce<ChallengeRecord | undefined>(
      (best, s) => (!best || s.createdAt > best.createdAt ? s : best),
      undefined,
    );
  return latest?.leaderboardKey;
}
