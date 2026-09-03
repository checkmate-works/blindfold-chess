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
 *   today, and the readers sit on the same seven-day revalidate as the rest
 *   of the static tree. A `db:seed` run against a live deployment therefore
 *   needs a redeploy behind it to surface. Declared so a future admin editor
 *   has a handle to pull.
 * - {@link OPENINGS_CACHE_TAG} — the `chess_openings` master
 *   (`getOpenings` and every lookup derived from it). Same situation as
 *   `ranks`: seeded at deploy, no runtime writer, seven-day revalidate, no
 *   invalidator today.
 * - {@link TOPIC_POST_COUNTS_CACHE_TAG} — the top-level post COUNTs that
 *   paginate the topic index pages (`getPostCountByTopicType`,
 *   `getPostCountByTopicKey`, `getPostCountByFirstMoveSquare`). Invalidated
 *   with `expire: 0` by post creation (`insertPost`) and soft-deletion
 *   (`deleteTopicPostCore`), so the author's next page load paginates
 *   against the right total. Replies never change these counts and do not
 *   invalidate.
 * - {@link REPERTOIRE_CATALOG_CACHE_TAG} — the public repertoire COUNTs
 *   behind `/repertoires` and the opening topic pages
 *   (`countPublicRepertoires`, `countPublicRepertoiresForOpening`).
 *   Invalidated with `expire: 0` by every repertoire mutation that can
 *   change which courses are public or which openings they hang off
 *   (`src/lib/repertoires/mutations.ts`).
 * - {@link profileCacheTag} — not a constant but a per-username tag factory,
 *   one tag per public profile row. See its own TSDoc for the writer list.
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
export const TOPIC_POST_COUNTS_CACHE_TAG = 'topic-post-counts' as const;
export const REPERTOIRE_CATALOG_CACHE_TAG = 'repertoire-catalog' as const;

/**
 * The glossary master data — terms, their translations, aliases and example
 * positions. Read by the eight `unstable_cache` wrappers in the glossary
 * queries and in `@/lib/glossary/term-positions`, all on a 7 day
 * `revalidate`.
 *
 * That interval is long because the terms are code, not content:
 * `lib/db/data/terms/*.ts` is the source and `db:seed` copies it into the
 * table, so a term only changes as part of a deploy, which drops the whole
 * ISR cache anyway. The one runtime writer, the admin annotation editor, does
 * not expire this tag: it is stamped on every glossary page's route-cache
 * entry (the index, 26 letter pages, the categories and every term, times
 * four locales), so one annotation save would re-render the lot. It expires
 * {@link glossaryPositionsTag} for the one term instead.
 *
 * The interval does constrain one operational sequence: run `db:seed` before
 * the deploy that ships the term change, or redeploy after it. Seeding a live
 * deployment leaves the prerendered pages serving the previous rows for up to
 * a week, where they used to catch up within the hour.
 */
export const GLOSSARY_CACHE_TAG = 'glossary' as const;

/**
 * The practice positions linked to one glossary term, as read by
 * `getPositionsForTerm` — one tag per term slug, carried alongside
 * {@link GLOSSARY_CACHE_TAG} on the same entry.
 *
 * Exists so that `updateTermPositionAnnotations` can drop exactly the pages
 * that render the edited annotations. `unstable_cache` stamps its tags on the
 * route-cache entry of every page that read it during prerender, so expiring
 * this tag re-renders `/[locale]/glossary/[slug]` for that one slug in each
 * locale on its next visit, where expiring the shared tag would re-render the
 * whole glossary.
 */
export const glossaryPositionsTag = (slug: string): `glossary-positions:${string}` =>
  `glossary-positions:${slug}`;

/**
 * The public profile row behind `/u/[username]`, one Data Cache entry (and one
 * tag) per username.
 *
 * Every writer of `profiles` must expire the tag for the row it touched, which
 * is why the tag is keyed by username rather than by user id: the reader is a
 * username lookup and cannot know the id before the query it is caching. Each
 * writer therefore returns the username from its own UPDATE (`.returning()`)
 * and calls `revalidateTag(profileCacheTag(username), { expire: 0 })`. The
 * writers, exhaustively: `setUsername` (the INSERT — it also clears the
 * negative entry a crawler may have cached for a not-yet-taken username),
 * `updateProfile`, `saveOnboardingProfile`, `setLeaderboardVisibility`, the
 * avatar upload route, the admin ban / unban actions, and account deletion's
 * `anonymiseProfile`.
 *
 * The retention purge that later hard-deletes the row is deliberately NOT on
 * that list: deletion already expired the tag and the reader filters
 * `deleted_at IS NULL`, so the entry is a cached `null` long before the purge
 * runs a month later — and re-registering the freed username expires it again
 * through `setUsername`.
 *
 * Not all of those touch a column the cached projection actually selects —
 * `banned_at` and `hidden_from_leaderboard` do not — but the projection is a
 * moving target and a `revalidateTag` costs nothing next to an UPDATE, so the
 * rule is "every writer expires it", with no per-column exceptions to keep
 * straight.
 */
export const profileCacheTag = (username: string): `profile:${string}` => `profile:${username}`;
