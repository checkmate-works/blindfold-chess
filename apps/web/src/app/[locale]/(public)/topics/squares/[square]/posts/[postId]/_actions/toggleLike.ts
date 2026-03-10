'use server';

import { revalidatePath } from 'next/cache';

import { and, count, eq } from 'drizzle-orm';

import { logActivityEvent } from '@/lib/activity-log';
import { isUserBanned } from '@/lib/ban';
import { db, topicPostLikes } from '@/lib/db';
import { RATE_LIMITS, checkRateLimit } from '@/lib/rate-limit';
import { createClient } from '@/lib/supabase/server';

import { isValidSquare } from '../../../../_lib/squares';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ToggleLikeResult = { liked: boolean; likeCount: number } | { error: string };

export async function toggleLike(
  postId: string,
  locale: string,
  square: string
): Promise<ToggleLikeResult> {
  if (!UUID_RE.test(postId)) {
    return { error: 'invalidPostId' };
  }

  if (!isValidSquare(square)) {
    return { error: 'invalidSquare' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'signInRequired' };
  }

  if (await isUserBanned(user.id)) {
    return { error: 'banned' };
  }

  const rateLimitResult = await checkRateLimit(user.id, RATE_LIMITS.toggleLike);
  if ('error' in rateLimitResult) {
    return { error: rateLimitResult.error };
  }

  // INSERT-first pattern: attempt to insert, catch unique violation to toggle.
  // This avoids the race condition of SELECT-then-INSERT.
  let liked: boolean;
  try {
    await db.insert(topicPostLikes).values({
      userId: user.id,
      postId,
    });
    liked = true;
  } catch (err: unknown) {
    // Drizzle wraps the original PostgresError in a "Failed query" error.
    // The unique violation code '23505' is on the cause, not the outer error.
    const cause = err instanceof Error && err.cause;
    const isUniqueViolation =
      cause instanceof Error && 'code' in cause && (cause as { code: string }).code === '23505';
    if (!isUniqueViolation) {
      throw err;
    }
    // Already liked — remove
    await db
      .delete(topicPostLikes)
      .where(and(eq(topicPostLikes.userId, user.id), eq(topicPostLikes.postId, postId)));
    liked = false;
  }

  logActivityEvent({
    userId: user.id,
    action: liked ? 'like' : 'unlike',
    targetType: 'topic_post',
    targetId: postId,
  });

  const [result] = await db
    .select({ count: count() })
    .from(topicPostLikes)
    .where(eq(topicPostLikes.postId, postId));

  revalidatePath(`/${locale}/topics/squares/${square}`);
  revalidatePath(`/${locale}/topics/squares/${square}/posts/${postId}`);

  return {
    liked,
    likeCount: result.count,
  };
}
