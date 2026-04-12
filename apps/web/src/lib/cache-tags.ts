/**
 * Shared cache tag constants for Next.js `unstable_cache` / `revalidateTag`.
 *
 * These tags identify server-side caches so that writers can invalidate the
 * matching readers. Because Next.js only accepts tags as plain strings, any
 * drift between a reader's `tags: [...]` and a writer's `revalidateTag(...)`
 * silently breaks cache invalidation — the type system cannot catch it.
 *
 * To prevent that, every cache tag string in this app MUST be defined here
 * and imported from `@/lib/cache-tags`. Do not inline tag literals at call
 * sites.
 *
 * ## Current tags
 *
 * - {@link LEADERBOARD_CACHE_TAG} — module-specific ranking caches
 *   (`getLeaderboard`, `getUserRanks`). Invalidated by `save-practice-result`
 *   after a challenge completion so the user sees fresh ranks immediately.
 * - {@link EXP_LEADERBOARD_CACHE_TAG} — global EXP ranking cache
 *   (`getExpLeaderboard`). Also invalidated by `save-practice-result` since
 *   every challenge completion grants EXP.
 */

export const LEADERBOARD_CACHE_TAG = 'leaderboard' as const;
export const EXP_LEADERBOARD_CACHE_TAG = 'exp-leaderboard' as const;
