import type { ChallengeMenuType } from '@/lib/db/practice-menu-types';

/**
 * Challenge menus whose `leaderboard_key` is a player-facing setting and
 * therefore a filter on My Records. Kept in a hook-free module so the
 * Server Component results page can consult it without importing React
 * hook code.
 */

/** Menus whose key is the board orientation (`white` / `black` / `random`). */
export const ORIENTATION_FILTER_MENUS = new Set<ChallengeMenuType>(['coordinate_quiz']);

/** Menus whose key is the practised piece (`king` … `knight` / `random`). */
export const PIECE_FILTER_MENUS = new Set<ChallengeMenuType>(['legal_moves']);

/** Whether records of `menu` are only meaningful when filtered by a key. */
export function isKeyedMenu(menu: ChallengeMenuType): boolean {
  return ORIENTATION_FILTER_MENUS.has(menu) || PIECE_FILTER_MENUS.has(menu);
}
