import { createSearchParamsCache, parseAsInteger } from 'nuqs/server';

/**
 * Shared nuqs cache for admin list pages whose only query param is `page`.
 *
 * Many admin index pages (achievements, grants, chunks, positions/*) each
 * redefined an identical `{ page: parseAsInteger.withDefault(1) }` cache.
 * Pages that also filter (coins, users, subscriptions, activity-log, …)
 * keep their own cache with the extra params.
 */
export const adminPageSearchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
});
