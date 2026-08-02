/**
 * Builds the href for a top-level profile tab (topics/problems/games).
 *
 * All three are their own route tree under `/u/[username]`: the main profile
 * page is the timeline, so an archive can no longer be a query param on it.
 * Problems has no listing of its own and points at its default sub-type.
 */
export function buildTabHref(username: string, targetTab: string): string {
  if (targetTab === 'topics') return `/u/${username}/posts`;
  if (targetTab === 'games') return `/u/${username}/games`;
  return `/u/${username}/problems/puzzles`;
}
