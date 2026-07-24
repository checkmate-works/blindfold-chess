/**
 * Point system constants — categories, sources, amounts, and lifecycle timings.
 *
 * Code is the source of truth for the policy values referenced by the
 * `point_events` / `user_point_balances` tables. DB schema only stores facts
 * (every row carries its concrete `delta` and `category`); changing a value
 * here affects only NEW events.
 */

/**
 * Per-category buckets stored on `point_events.category` and
 * `user_point_balances.category`. The keyed bucket model lets purchased and
 * earned points evolve independently (different refund / redemption / expiry
 * rules) without schema changes. Every category is immediately spendable —
 * points are granted live, with no maturation hold.
 */
export const POINT_CATEGORIES = ['earned', 'purchased', 'promotional'] as const;
export type PointCategory = (typeof POINT_CATEGORIES)[number];

/**
 * `point_events.source` values. Distinct per UGC trigger so clawback
 * queries can target a single (source, source_id) pair. Lifecycle stage
 * (created / clawed back) is encoded in the idempotency_key prefix, not in
 * `source` — see `buildIdempotencyKey`.
 */
export const POINT_SOURCES = [
  'puzzle_created',
  'position_memory_created',
  'topic_post_created',
  'chunk_created',
  // Repertoire (Kata) and shared game rewards fire on *publish*, not create:
  // a `building` repertoire is a private draft, and a game's public row is
  // written at publish time. They still live in this array so they count
  // toward the shared daily cap and classify as `post_grant` in history.
  'repertoire_published',
  'game_published',
] as const;
export type PointSource = (typeof POINT_SOURCES)[number];

/**
 * Entity types that earn points. Puzzle / position-memory / topic-post /
 * chunk earn on creation; `repertoire` earns when a building course is
 * published (→ public), and `game` earns when a shared game is published
 * (its public row is inserted). Map 1:1 with a `PointSource`.
 */
export type PointPostEntityType =
  'puzzle' | 'position_memory' | 'topic_post' | 'chunk' | 'repertoire' | 'game';

export type PointPostEntity = {
  type: PointPostEntityType;
  id: string;
};

const ENTITY_TYPE_TO_SOURCE: Record<PointPostEntityType, PointSource> = {
  puzzle: 'puzzle_created',
  position_memory: 'position_memory_created',
  topic_post: 'topic_post_created',
  chunk: 'chunk_created',
  repertoire: 'repertoire_published',
  game: 'game_published',
};

/**
 * Reverse of `ENTITY_TYPE_TO_SOURCE` — derived rather than hand-maintained
 * so that adding a new entity type cannot accidentally produce a half-wired
 * map. `Object.fromEntries` of typed entries loses key information at the
 * type level, so we re-assert the shape with `as`; the runtime contents
 * are guaranteed correct because the input map is exhaustive over
 * `PointPostEntityType`.
 */
const SOURCE_TO_ENTITY_TYPE: Record<PointSource, PointPostEntityType> = Object.fromEntries(
  Object.entries(ENTITY_TYPE_TO_SOURCE).map(([entityType, source]) => [source, entityType])
) as Record<PointSource, PointPostEntityType>;

export function sourceForEntity(entityType: PointPostEntityType): PointSource {
  return ENTITY_TYPE_TO_SOURCE[entityType];
}

export function entityTypeForSource(source: PointSource): PointPostEntityType {
  return SOURCE_TO_ENTITY_TYPE[source];
}

/**
 * Lifecycle stage tag for `idempotency_key`. The DB-level UNIQUE constraint
 * on `point_events.idempotency_key` is the hard backstop against duplicate
 * inserts; these prefixes make the keys human-debuggable.
 */
export const POINT_LIFECYCLE_STAGES = ['post_grant', 'post_clawback'] as const;
export type PointLifecycleStage = (typeof POINT_LIFECYCLE_STAGES)[number];

export function buildIdempotencyKey(stage: PointLifecycleStage, entity: PointPostEntity): string {
  return `${stage}:${entity.type}:${entity.id}`;
}

/**
 * Points awarded per UGC contribution (create for problems/posts/chunks,
 * publish for repertoires/games). Redemption is 1 pt → 1 day of ad_free
 * (set in the redemption flow); the reward stacks across the user's whole
 * submission history.
 *
 * Lives in code, not the DB: every `point_events` row carries its concrete
 * `delta`, so lowering this only affects future grants — coins already
 * awarded at a prior rate (and their `/mypage/coins` history) are untouched.
 */
export const POST_CREATION_POINTS = 1;

/**
 * Per-day ceiling on points a single user can earn from UGC contribution
 * (every `POINT_SOURCES` trigger — problem / post / chunk creation plus
 * repertoire / game publish), shared across all of them.
 *
 * @design Why a daily cap
 *
 * UGC contribution is rate-limited per action, but the limits are generous
 * enough that a scripted account could still mint dozens of points an
 * hour across the contribution surfaces. Since every point converts
 * 1:1 into an ad-free day, an uncapped create-faucet directly erodes ad
 * revenue. The cap holds the worst case to a fixed daily figure no
 * matter how the per-action rate limits are tuned; a genuine
 * contributor making a handful of problems a day never reaches it.
 *
 * The cap is measured as the **net** sum of creation-source deltas since
 * 00:00 UTC (see `creationEarnedToday`), so a same-day delete+recreate
 * nets correctly and a moderator clawback frees headroom. Like-coin and
 * admin grants are deliberately NOT counted against it — they are not
 * part of the self-serve create-faucet.
 *
 * Lives in code, not the DB: every `point_events` row carries its
 * concrete `delta`, so changing this only affects future grants.
 */
export const DAILY_CREATION_POINT_CAP = 30;

/**
 * Resolve how many points one UGC creation grant should award, given how
 * much the user has already earned from creation today. Clamps the
 * standard `POST_CREATION_POINTS` to the remaining daily headroom:
 * returns a partial amount when the cap is nearly reached and `0` once
 * it is hit. Pure — the caller supplies `earnedToday`.
 */
export function cappedCreationGrantAmount(earnedToday: number): number {
  const headroom = Math.max(0, DAILY_CREATION_POINT_CAP - earnedToday);
  return Math.min(POST_CREATION_POINTS, headroom);
}

/**
 * `topic_posts.topicType` values that earn a point grant on creation.
 *
 * Scoped to the **standalone topic surfaces** (`square`, `opening`) only.
 * `position_memory` / `position_puzzle` posts are excluded because in
 * product language they are "comments on a problem" — the point grant for
 * those flows is earned by *creating the problem* via `createPosition` /
 * `createPuzzle`. `chunk` posts have always been excluded.
 *
 * Single source of truth for:
 *   1. `createPostBase` — gates `grantPointsForPost` on `topicType`.
 *   2. The `/faq` "Ways to earn points" surface.
 *
 * Add a topic type here together with its i18n label in every locale.
 */
export const POINT_ELIGIBLE_TOPIC_TYPES = ['square', 'opening'] as const;
export type PointEligibleTopicType = (typeof POINT_ELIGIBLE_TOPIC_TYPES)[number];

export function isPointEligibleTopicType(v: string): v is PointEligibleTopicType {
  return (POINT_ELIGIBLE_TOPIC_TYPES as readonly string[]).includes(v);
}

/**
 * Category drain order when spending confirmed points — the bucket on the
 * left is debited first.
 *
 * - `earned`       (UGC-derived): user-side; spend it first so the user
 *                  visually "uses what they earned" before touching gifts.
 * - `promotional`  (admin / campaign): spent next. The platform gave these,
 *                  so they are next-cheapest to "give away" on a spend.
 * - `purchased`    (real money): spent last. Money-backed points stay in
 *                  the wallet longest so refunds remain straightforward.
 *
 * Shared by every consumption path (`redeemPointsForAdFree`,
 * `consumeMaiaGamePoint`).
 */
export const SPENDABLE_CONSUME_ORDER: readonly PointCategory[] = [
  'earned',
  'promotional',
  'purchased',
] as const;

/**
 * Point cost to start one game against the Maia engine. Charged per game
 * at game-creation time (model B) for every viewer — there is no
 * subscription exemption.
 *
 * Lives in code, not the DB: every `point_events` row carries its concrete
 * `delta`, so changing this only affects future charges.
 */
export const MAIA_GAME_POINT_COST = 1;

/**
 * `point_events.source` value for a Maia per-game charge. Deliberately NOT
 * a member of `POINT_SOURCES` — that array is the UGC grant surface
 * (`entityTypeForSource` etc.). `maia_game` is a consumption
 * source, like `'redemption'`: `source_id` holds the client-generated game
 * UUID and the idempotency key is `maia_game:<userId>:<uuid>` (the `userId`
 * segment prevents one user replaying another user's client game id against
 * the globally-unique `idempotency_key`).
 */
export const MAIA_GAME_SOURCE = 'maia_game';

/**
 * `point_events.source` values for the non-UGC ledger flows — none are
 * members of `POINT_SOURCES` (the UGC creation surface). Named constants
 * so the writers and `classifyKind` in `get-history.ts` cannot drift.
 *
 * - `REDEMPTION_SOURCE`  — a point spend on an ad_free redemption.
 * - `ADMIN_GRANT_SOURCE` — a promotional grant issued from `/admin/coins`.
 * - `PURCHASE_SOURCE`    — a paid point top-up. No purchase flow ships
 *                          yet; the value is reserved so `get-history`
 *                          can already classify such rows.
 */
export const REDEMPTION_SOURCE = 'redemption';
export const ADMIN_GRANT_SOURCE = 'admin_grant';
export const PURCHASE_SOURCE = 'purchase';

/**
 * `point_events.source` value for a coin spend that unlocks a Kata
 * (repertoire) visibility tier (followers-only / private). Like
 * `MAIA_GAME_SOURCE`, a consumption source deliberately NOT in
 * `POINT_SOURCES` (the UGC creation grant surface). `source_id` holds the
 * repertoire id; the idempotency key is
 * `repertoire_visibility:<repertoireId>:<tierPrice>:<category>` so reaching a
 * tier already paid for (public → private → public → private) never
 * re-charges. See `chargeRepertoireVisibility` and the spend catalog.
 */
export const REPERTOIRE_VISIBILITY_SOURCE = 'repertoire_visibility';

/**
 * `point_events.source` value for a like-derived coin grant. Like
 * `MAIA_GAME_SOURCE`, deliberately NOT a member of `POINT_SOURCES` — that
 * array is the UGC *creation* grant surface (`entityTypeForSource` etc.),
 * whereas `like_grant` rows are minted by the daily like-coin batch
 * (`grantLikeCoins`).
 *
 * Both the direct grant (to the liked content's owner) and the fork-
 * propagation grant (to the fork parent's owner) carry this same `source`;
 * the fork rows are set apart by `metadata.via = 'fork'`.
 */
export const LIKE_GRANT_SOURCE = 'like_grant';

/**
 * Coins minted per qualifying like — 1 like = 1 coin. Lives in code, not
 * the DB: every `point_events` row carries its concrete `delta`, so
 * changing this only affects future grants.
 */
export const LIKE_COIN_AMOUNT = 1;

/**
 * `point_batch_watermarks.batch_type` key for the daily like-coin batch.
 */
export const LIKE_GRANT_BATCH_TYPE = 'like_grant';

/**
 * How far behind "now" the like-coin batch's scan upper bound trails.
 *
 * @design Why a trailing margin
 *
 * The batch bounds its `likes` scan with the app server's clock
 * (`scanStartedAt`), while `likes.created_at` is stamped by the DB's clock
 * at insert-transaction time. A like whose INSERT is in flight — committed
 * a moment after `scanStartedAt` was read, or simply invisible to this
 * run's snapshot — can carry a `created_at` at or before `scanStartedAt`
 * without this run ever seeing it. Once the watermark advances past that
 * timestamp, the like falls before the next run's lower bound and is
 * silently skipped forever; there is no error to signal it. Trailing the
 * upper bound by a margin comfortably larger than any plausible commit
 * latency or clock skew guarantees every run still has the previous
 * margin-window to pick up such a like before the watermark passes it.
 */
export const LIKE_GRANT_SCAN_SAFETY_MARGIN_MS = 5 * 60 * 1000;

/**
 * `likes.target_type` values eligible for like-coin grants. Scoped to UGC
 * only — `article` (operator-authored) likes are intentionally absent so
 * the operator account is never paid.
 */
export const LIKE_GRANT_TARGET_TYPES = ['position', 'topic_post'] as const;

/**
 * `idempotency_key` prefixes for the like-coin batch. The key is keyed on
 * the *pair* `(targetType, targetId, likerId)` rather than the `likes` row
 * id: `likes` rows are physically deleted on unlike and recreated on
 * relike (new id, new `created_at`), so a row-id key would re-pay on every
 * relike. The pair key grants exactly once per (liker, content).
 *
 * - `LIKE_GRANT_KEY_PREFIX` — direct grant to the liked content's owner.
 * - `LIKE_GRANT_FORK_KEY_PREFIX` — propagation grant to the fork parent's
 *   owner (only for `position` targets that are themselves forks).
 */
export const LIKE_GRANT_KEY_PREFIX = 'like_grant';
export const LIKE_GRANT_FORK_KEY_PREFIX = 'like_grant_fork';
