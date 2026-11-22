/**
 * The stored vocabulary of the retired coin ledger — the `category` and
 * `source` strings found on `point_events` rows.
 *
 * Nothing writes these any more (the coin economy was retired in 2026-11;
 * see `CLAUDE.md` in this directory). They stay declared because the rows
 * they stamped still exist and the admin ledger views classify and filter by
 * them. Stored data values: never rename a member.
 */

/**
 * Per-category buckets stored on `point_events.category` and
 * `user_point_balances.category`: coins earned from contributions, bought
 * with money (never shipped — no purchase flow existed), or handed out by
 * staff.
 */
export const POINT_CATEGORIES = ['earned', 'purchased', 'promotional'] as const;
export type PointCategory = (typeof POINT_CATEGORIES)[number];

/**
 * `point_events.source` values of the UGC creation / publish grants. Until
 * 2026-08 every create (problem, post, chunk) and publish (kata, game)
 * minted a coin under one of these; after that, likes were the only faucet
 * (`LIKE_GRANT_SOURCE`). A negative row with one of these sources is the
 * reversal written when the content was deleted.
 */
export const POINT_SOURCES = [
  'puzzle_created',
  'position_memory_created',
  'topic_post_created',
  'chunk_created',
  'repertoire_published',
  'game_published',
] as const;
export type PointSource = (typeof POINT_SOURCES)[number];

/** A like on the user's content, paid out by a daily batch (1 like = 1 coin). */
export const LIKE_GRANT_SOURCE = 'like_grant';
/** A promotional grant issued by staff from the admin screen. */
export const ADMIN_GRANT_SOURCE = 'admin_grant';
/** A paid top-up. Reserved; no purchase flow ever shipped. */
export const PURCHASE_SOURCE = 'purchase';

/** Coins spent on ad-free days (1 coin = 1 day). */
export const REDEMPTION_SOURCE = 'redemption';
/** One coin spent to start a Maia game below the level that unlocks it. */
export const MAIA_GAME_SOURCE = 'maia_game';
/** One coin spent on an AI review, and its return when the review failed. */
export const AI_REVIEW_SOURCE = 'ai_review';
export const AI_REVIEW_REFUND_SOURCE = 'ai_review_refund';
