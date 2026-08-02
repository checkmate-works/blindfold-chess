/**
 * Filter chips for the public profile timeline.
 *
 * @design Separate from the home feed's `FeedScope`
 * The home feed resolves a *scope* (`'home' | 'topics'`) server-side so a
 * client cannot pass an arbitrary entity-type list. The profile timeline needs
 * the same protection but a different, per-chip vocabulary, so it gets its own
 * whitelist rather than widening `FeedScope` — the two lists have no reason to
 * move together, and merging them would let a home-feed scope leak into the
 * profile query (or vice versa) the next time either grows.
 *
 * @design `challenge_rank_update` has no chip of its own
 * Those rows are reaped after 30 days (see `reap-old-rank-updates.ts`), so a
 * dedicated chip would routinely open onto an empty list that no archive page
 * can back. They still flow through the `all` timeline, where surrounding
 * entries keep them in context.
 */
const PROFILE_FEED_FILTER_ENTITY_TYPES = {
  /** Every entity type, including `challenge_rank_update`. */
  all: undefined,
  topics: ['topic_post'],
  /** Both puzzle and position-memory problems — one entity type covers them. */
  problems: ['position'],
  games: ['game'],
  chunks: ['chunk'],
} as const satisfies Record<string, readonly string[] | undefined>;

export type ProfileFeedFilter = keyof typeof PROFILE_FEED_FILTER_ENTITY_TYPES;

export const PROFILE_FEED_FILTERS = Object.keys(
  PROFILE_FEED_FILTER_ENTITY_TYPES
) as ProfileFeedFilter[];

export const DEFAULT_PROFILE_FEED_FILTER: ProfileFeedFilter = 'all';

/** Narrows an untrusted `?filter=` value, falling back to `'all'`. */
export function parseProfileFeedFilter(value: string | null | undefined): ProfileFeedFilter {
  return PROFILE_FEED_FILTERS.includes(value as ProfileFeedFilter)
    ? (value as ProfileFeedFilter)
    : DEFAULT_PROFILE_FEED_FILTER;
}

/** The `feed_items.entityType` whitelist for a filter; `undefined` = no filter. */
export function resolveProfileFeedEntityTypes(
  filter: ProfileFeedFilter
): readonly string[] | undefined {
  return PROFILE_FEED_FILTER_ENTITY_TYPES[filter];
}
