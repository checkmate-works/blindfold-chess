/**
 * PostgreSQL-based rate limiting — fixed-window counter.
 *
 * @description
 * Provides a simple, database-backed rate limiter for user actions. Each action
 * has a configured maximum number of attempts within a time window. Events are
 * recorded in the `rate_limit_events` table and counted per (userId, action)
 * pair within the window.
 *
 * @design PostgreSQL instead of Redis (ref: Issue #18)
 *
 * This project uses PostgreSQL (Supabase) with no Redis dependency. Adding Redis
 * solely for rate limiting would increase infrastructure complexity disproportionately
 * to the expected traffic level. PostgreSQL with a composite index on
 * (user_id, action, created_at) handles the COUNT + INSERT pattern efficiently.
 *
 * @design Fixed window, not sliding window
 *
 * The window is calculated as `NOW() - windowMs`. This is a fixed-window counter,
 * which is simpler and sufficient for the use cases in this application.
 */
import { and, count, eq, gt, sql } from 'drizzle-orm';
import 'server-only';

import { db, rateLimitEvents } from '../db';

export type RateLimitConfig = {
  action: string;
  maxAttempts: number;
  windowMs: number;
};

export const RATE_LIMITS = {
  createPost: { action: 'create_post', maxAttempts: 10, windowMs: 3_600_000 },
  /**
   * Per-user limit for posts that include a chess game attachment. Stricter
   * than `createPost` because the attachment path can trigger an outbound
   * Lichess fetch and writes additional rows. Apply IN ADDITION to the
   * standard `createPost` limit so the user's overall create-post budget
   * is not bypassed.
   */
  createPostWithAttachment: {
    action: 'create_post_with_attachment',
    maxAttempts: 5,
    windowMs: 3_600_000,
  },
  createReply: { action: 'create_reply', maxAttempts: 20, windowMs: 3_600_000 },
  toggleLike: { action: 'toggle_like', maxAttempts: 50, windowMs: 86_400_000 },
  toggleFollow: { action: 'toggle_follow', maxAttempts: 100, windowMs: 86_400_000 },
  deletePost: { action: 'delete_post', maxAttempts: 10, windowMs: 3_600_000 },
  editPost: { action: 'edit_post', maxAttempts: 30, windowMs: 3_600_000 },
  /**
   * Per-user limit for removing an attachment from one of the author's own
   * topic_posts (PGN / FEN / image / video / embed). 30 / hour matches
   * `editPost`: removing the wrong attachment is the kind of correction a
   * legitimate author may iterate on, so the budget is intentionally
   * looser than `deletePost`. Storage-touching kinds (image) still consume
   * the same budget — overwriting that limit per kind would let a sustained
   * abuser burn out the cap on a cheap kind (embed) and fall back on
   * image-removal as a side channel.
   */
  removePostAttachment: { action: 'remove_post_attachment', maxAttempts: 30, windowMs: 3_600_000 },
  setupUsername: { action: 'setup_username', maxAttempts: 5, windowMs: 600_000 },
  updateProfile: { action: 'update_profile', maxAttempts: 5, windowMs: 600_000 },
  uploadAvatar: { action: 'upload_avatar', maxAttempts: 5, windowMs: 600_000 },
  uploadArticleImage: { action: 'upload_article_image', maxAttempts: 20, windowMs: 600_000 },
  /**
   * Per-user limit for post image uploads. Same window as
   * `uploadArticleImage` (10 minutes) but lower max because post images
   * are user-generated content (vs admin-only articles) and the per-post
   * cap is 3 — a user creating a fresh post needs at most 3 uploads, so
   * 15 / 10 min covers ~5 fresh posts before the limit kicks in.
   */
  uploadPostImage: { action: 'upload_post_image', maxAttempts: 15, windowMs: 600_000 },
  /**
   * Per-user limit for attaching a FEN to a post. The 1:0..1 invariant
   * already caps successful inserts at one per post; this limit guards
   * against spam attempts that hit the validator. 10 / hour matches
   * `createPost` so a user who creates a post and immediately attaches a
   * FEN does not run into a tighter ceiling for the second action.
   */
  attachPostFen: { action: 'attach_post_fen', maxAttempts: 10, windowMs: 3_600_000 },
  /**
   * Per-user limit for attaching a video (YouTube) to a post. Mirrors
   * `attachPostFen`'s shape: the 1:0..1 invariant caps successful
   * inserts at one per post, so this limit guards against spam attempts
   * that hit the URL validator. 10 / hour aligns with `createPost`.
   */
  attachPostVideo: { action: 'attach_post_video', maxAttempts: 10, windowMs: 3_600_000 },
  changePassword: { action: 'change_password', maxAttempts: 5, windowMs: 3_600_000 },
  deleteAccount: { action: 'delete_account', maxAttempts: 3, windowMs: 3_600_000 },
  savePracticeResult: { action: 'save_practice_result', maxAttempts: 60, windowMs: 3_600_000 },
  /**
   * Opening post limit is keyed per topicKey — use `createOpeningPostAction(slug)` to
   * build the action string (e.g., 'create_opening_post:french-defense').
   */
  createOpeningPost: { action: 'create_opening_post', maxAttempts: 1, windowMs: 86_400_000 },
  createCheckoutSession: { action: 'create_checkout_session', maxAttempts: 5, windowMs: 600_000 },
  createPortalSession: { action: 'create_portal_session', maxAttempts: 5, windowMs: 600_000 },
  saveInterviewAnswer: { action: 'save_interview_answer', maxAttempts: 10, windowMs: 3_600_000 },
  deleteInterviewAnswer: {
    action: 'delete_interview_answer',
    maxAttempts: 10,
    windowMs: 3_600_000,
  },
  createPosition: { action: 'create_position', maxAttempts: 10, windowMs: 3_600_000 },
  deletePosition: { action: 'delete_position', maxAttempts: 10, windowMs: 3_600_000 },
  updatePosition: { action: 'update_position', maxAttempts: 20, windowMs: 3_600_000 },
  createPuzzle: { action: 'create_puzzle', maxAttempts: 10, windowMs: 3_600_000 },
  updatePuzzle: { action: 'update_puzzle', maxAttempts: 20, windowMs: 3_600_000 },
  deletePuzzle: { action: 'delete_puzzle', maxAttempts: 10, windowMs: 3_600_000 },
} as const;

/**
 * Build a per-opening rate limit config by appending the slug to the action name.
 * This allows 1 post per day per opening.
 */
export function createOpeningPostRateLimit(slug: string): RateLimitConfig {
  return {
    ...RATE_LIMITS.createOpeningPost,
    action: `${RATE_LIMITS.createOpeningPost.action}:${slug}`,
  };
}

async function countEventsInWindow(userId: string, config: RateLimitConfig): Promise<number> {
  const windowStart = sql`now() - ${config.windowMs / 1000.0}::double precision * interval '1 second'`;

  const [result] = await db
    .select({ count: count() })
    .from(rateLimitEvents)
    .where(
      and(
        eq(rateLimitEvents.userId, userId),
        eq(rateLimitEvents.action, config.action),
        gt(rateLimitEvents.createdAt, windowStart)
      )
    );

  return result.count;
}

/**
 * Read-only rate limit check — returns true if the user has reached the limit.
 * Does NOT insert an event. Use this for UI gating (e.g. hiding a button).
 */
export async function isRateLimited(userId: string, config: RateLimitConfig): Promise<boolean> {
  return (await countEventsInWindow(userId, config)) >= config.maxAttempts;
}

/**
 * Check whether a user has exceeded the rate limit for a given action.
 *
 * If under the limit, a new event is inserted and `{ success: true }` is returned.
 * If at or over the limit, no event is inserted and `{ error: 'rateLimited' }` is returned.
 */
export async function checkRateLimit(
  userId: string,
  config: RateLimitConfig
): Promise<{ success: true } | { error: 'rateLimited' }> {
  if ((await countEventsInWindow(userId, config)) >= config.maxAttempts) {
    return { error: 'rateLimited' };
  }

  await db.insert(rateLimitEvents).values({
    userId,
    action: config.action,
  });

  return { success: true };
}
