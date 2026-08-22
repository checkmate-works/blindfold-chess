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
 * This module imports nothing, which is what lets any caller reach a tag.
 * `RANK_STATUS_CACHE_TAG` used to live in the rank seed data specifically so
 * the ads cookie writer could read it without pulling the server-only DB
 * module graph into client-component unit tests; that constraint is satisfied
 * a fortiori here. Keep it that way — a tag constant behind an import is a
 * tag constant someone will re-type as a literal.
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
 * - {@link ANNOUNCEMENTS_CACHE_TAG} — the public announcement queries. Their
 *   own revalidate is a full day, so the admin create / update / delete
 *   actions are what actually makes an announcement appear.
 * - {@link AD_CREATIVES_CACHE_TAG} — the ad creative pool. Invalidated by the
 *   admin ad CRUD so a paused creative stops being served immediately.
 * - The three entitlement tags below back the ad-free decision, and each is
 *   read behind a 60-second `unstable_cache`. That interval bounds how long a
 *   revoked benefit keeps hiding ads; the explicit invalidation is what makes
 *   it usually instant.
 *   - {@link GRANT_STATUS_CACHE_TAG} — `user_grants` lookups.
 *   - {@link SUBSCRIPTION_STATUS_CACHE_TAG} — Stripe subscription mirror.
 *   - {@link RANK_STATUS_CACHE_TAG} — dan-tier belt rank.
 * - {@link RANKS_CACHE_TAG} — the `ranks` master rows the dojo reads
 *   (`getAllRanks`, `getRankBySlug`). Nothing writes `ranks` at runtime —
 *   the table is code-seeded on deploy — so no action invalidates this tag
 *   today; the hourly revalidate on the readers is the only freshness bound.
 *   Declared so a future admin editor has a handle to pull.
 * - {@link OPENINGS_CACHE_TAG} — the `chess_openings` master
 *   (`getOpenings` and every lookup derived from it). Same situation as
 *   `ranks`: seeded at deploy, no runtime writer, hourly revalidate, no
 *   invalidator today.
 */

export const LEADERBOARD_CACHE_TAG = 'leaderboard' as const;
export const EXP_LEADERBOARD_CACHE_TAG = 'exp-leaderboard' as const;
export const DAILY_PUZZLE_CACHE_TAG = 'daily-puzzle' as const;
export const ARTICLES_CACHE_TAG = 'articles' as const;
export const ANNOUNCEMENTS_CACHE_TAG = 'announcements' as const;
export const AD_CREATIVES_CACHE_TAG = 'ad-creatives' as const;
export const GRANT_STATUS_CACHE_TAG = 'grant-status' as const;
export const SUBSCRIPTION_STATUS_CACHE_TAG = 'subscription-status' as const;
export const RANK_STATUS_CACHE_TAG = 'rank-status' as const;
export const RANKS_CACHE_TAG = 'ranks' as const;
export const OPENINGS_CACHE_TAG = 'openings' as const;
