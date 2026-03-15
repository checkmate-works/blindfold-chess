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

import { db, rateLimitEvents } from './db';

export type RateLimitConfig = {
  action: string;
  maxAttempts: number;
  windowMs: number;
};

export const RATE_LIMITS = {
  createPost: { action: 'create_post', maxAttempts: 10, windowMs: 3_600_000 },
  createReply: { action: 'create_reply', maxAttempts: 20, windowMs: 3_600_000 },
  toggleLike: { action: 'toggle_like', maxAttempts: 50, windowMs: 86_400_000 },
  toggleFollow: { action: 'toggle_follow', maxAttempts: 100, windowMs: 86_400_000 },
  deletePost: { action: 'delete_post', maxAttempts: 10, windowMs: 3_600_000 },
  setupUsername: { action: 'setup_username', maxAttempts: 5, windowMs: 600_000 },
  updateProfile: { action: 'update_profile', maxAttempts: 5, windowMs: 600_000 },
  uploadAvatar: { action: 'upload_avatar', maxAttempts: 5, windowMs: 600_000 },
  deleteAccount: { action: 'delete_account', maxAttempts: 3, windowMs: 3_600_000 },
  savePracticeResult: { action: 'save_practice_result', maxAttempts: 60, windowMs: 3_600_000 },
} as const;

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

  if (result.count >= config.maxAttempts) {
    return { error: 'rateLimited' };
  }

  await db.insert(rateLimitEvents).values({
    userId,
    action: config.action,
  });

  return { success: true };
}
