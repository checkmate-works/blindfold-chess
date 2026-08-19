/**
 * Ordering modes a paginated user-content list offers.
 *
 * One union rather than one per surface: the same `SortSelect` control, the
 * same `validateSort` normalization and the same `?sort=` parameter serve topic
 * threads, position lists and Kata lists, so a mode added for one of them is
 * already spelled in the URLs and the UI of the others.
 *
 * What each mode orders by is per-surface — a thread's `active` is its latest
 * reply, a position's is its latest comment — and stays with the query that
 * implements it.
 */
export const SORT_MODES = ['new', 'popular', 'active'] as const;

export type SortMode = (typeof SORT_MODES)[number];
