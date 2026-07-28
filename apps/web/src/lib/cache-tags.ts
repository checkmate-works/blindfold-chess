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
 * - {@link DAILY_PUZZLE_CACHE_TAG} — the day's puzzle pick (`getDailyPuzzle`).
 *   Invalidated by the admin feature/unfeature toggle (`setPuzzleFeatured`)
 *   and by the admin puzzle soft-delete (`deletePuzzle`) so pool changes and
 *   removals swap the featured card immediately instead of at the hourly
 *   revalidate.
 * - {@link ARTICLES_CACHE_TAG} — the public article list queries
 *   (`getLatestPublishedArticles`, `getPublishedArticleCount`). Invalidated by
 *   the admin article create / update / delete actions. Note this covers the
 *   LIST only: the article *detail* page is prerendered per (locale, slug), so
 *   those actions additionally call `revalidatePublicArticlePages()` — a tag
 *   cannot reach a Full Route Cache entry.
 */

export const LEADERBOARD_CACHE_TAG = 'leaderboard' as const;
export const EXP_LEADERBOARD_CACHE_TAG = 'exp-leaderboard' as const;
export const DAILY_PUZZLE_CACHE_TAG = 'daily-puzzle' as const;
export const ARTICLES_CACHE_TAG = 'articles' as const;
