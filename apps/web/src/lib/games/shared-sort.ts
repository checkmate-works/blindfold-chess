/**
 * Ordering modes the shared-games gallery offers.
 *
 * Each maps to a denormalized column on `games`, so ordering stays
 * index-friendly. Lives in `lib/` rather than beside the page because the
 * query that implements the ordering (`lib/db/games-read.ts`) needs the same
 * vocabulary as the control that offers it — that file used to carry its own
 * union under a comment promising to keep it "in sync with the page's sort
 * control", which is the promise this removes the need for.
 */
export const SHARED_GAMES_SORT_MODES = ['new', 'clean', 'strong'] as const;

export type SharedGamesSortMode = (typeof SHARED_GAMES_SORT_MODES)[number];

/** Validate an untrusted `?sort=` value, defaulting to 'new'. */
export function parseSharedGamesSort(raw: string | string[] | undefined): SharedGamesSortMode {
  return typeof raw === 'string' && (SHARED_GAMES_SORT_MODES as readonly string[]).includes(raw)
    ? (raw as SharedGamesSortMode)
    : 'new';
}
