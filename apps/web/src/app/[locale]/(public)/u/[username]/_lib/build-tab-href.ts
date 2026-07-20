/**
 * Builds the href for a top-level profile tab (topics/problems/games).
 * Topics and games stay query-param-driven on the main profile page;
 * problems is a separate route tree (`/problems/puzzles` by default —
 * see `problems/page.tsx` for the sub-type redirect), shared by the main
 * page and the `/problems/*` pages so the tab bar behaves identically
 * regardless of which page renders it.
 */
export function buildTabHref(username: string, targetTab: string): string {
  if (targetTab === 'topics') return `/u/${username}`;
  if (targetTab === 'games') return `/u/${username}?tab=games`;
  return `/u/${username}/problems/puzzles`;
}
