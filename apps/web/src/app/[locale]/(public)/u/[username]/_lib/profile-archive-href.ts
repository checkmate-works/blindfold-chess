/** The three paginated archives under `/u/[username]`. */
export type ProfileArchive = 'topics' | 'problems' | 'games';

/**
 * Locale-less href for one of a member's archives.
 *
 * All three are their own route tree: the main profile page is the timeline,
 * so an archive can no longer be a query param on it. Problems has no listing
 * of its own and points at its default sub-type.
 *
 * Every link into an archive goes through here — the tab row, the stats band
 * counts, the empty-timeline hand-off, and the `?tab=` back-compat redirects.
 * Those paths moved once already (`?tab=games` → `/games`); with the mapping
 * written out per call site, the next move silently breaks whichever copies
 * were missed.
 */
export function profileArchiveHref(username: string, archive: ProfileArchive): string {
  if (archive === 'problems') return `/u/${username}/problems/puzzles`;
  return `/u/${username}/${archive === 'topics' ? 'posts' : archive}`;
}
