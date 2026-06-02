/**
 * Sort modes for the shared-games gallery, shared between the server page
 * (query ordering) and the client sort control. Each maps to a denormalized
 * column on `games` so ordering stays index-friendly.
 */
export const SHARED_GAMES_SORT_MODES = ['new', 'clean', 'strong'] as const;

export type SharedGamesSortMode = (typeof SHARED_GAMES_SORT_MODES)[number];

/** Validate an untrusted `?sort=` value, defaulting to 'new'. */
export function parseSharedGamesSort(raw: string | string[] | undefined): SharedGamesSortMode {
  return typeof raw === 'string' && (SHARED_GAMES_SORT_MODES as readonly string[]).includes(raw)
    ? (raw as SharedGamesSortMode)
    : 'new';
}
