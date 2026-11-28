/**
 * Challenge menus whose `leaderboard_key` is a player-facing setting and
 * therefore a filter on My Records. Defined in
 * `@blindfold-chess/features/challenge-records` (shared with the mobile app)
 * and re-exported from this hook-free module so the Server Component results
 * page can consult it.
 */
export {
  ORIENTATION_FILTER_MENUS,
  PIECE_FILTER_MENUS,
  isKeyedMenu,
} from '@blindfold-chess/features/challenge-records';
