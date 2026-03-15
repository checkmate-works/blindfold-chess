'use server';

import { revalidatePath } from 'next/cache';

import { and, eq, isNull } from 'drizzle-orm';

import { logActivityEvent } from '@/lib/activity-log';
import { isUserBanned } from '@/lib/ban';
import { db, profiles, userFollows } from '@/lib/db';
import { createNotification } from '@/lib/notification';
import { RATE_LIMITS, checkRateLimit } from '@/lib/rate-limit';
import { createClient } from '@/lib/supabase/server';

type ToggleFollowResult = { following: boolean } | { error: string };

export async function toggleFollow(
  targetUsername: string,
  locale: string
): Promise<ToggleFollowResult> {
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

  const rateLimitResult = await checkRateLimit(user.id, RATE_LIMITS.toggleFollow);
  if ('error' in rateLimitResult) {
    return { error: rateLimitResult.error };
  }

  // Look up the target user's profile by username
  const [targetProfile] = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(and(eq(profiles.username, targetUsername), isNull(profiles.deletedAt)))
    .limit(1);

  if (!targetProfile) {
    return { error: 'userNotFound' };
  }

  if (targetProfile.id === user.id) {
    return { error: 'cannotFollowSelf' };
  }

  // INSERT-first pattern: attempt to insert, catch unique violation to toggle.
  // This avoids the race condition of SELECT-then-INSERT.
  let following: boolean;
  try {
    await db.insert(userFollows).values({
      followerId: user.id,
      followingId: targetProfile.id,
    });
    following = true;
  } catch (err: unknown) {
    // drizzle-orm may wrap PostgresError in a generic Error with the original
    // as `cause`. Check both the error itself and its cause for the PG code.
    const pgCode =
      (err instanceof Error &&
        (('code' in err && (err as { code: string }).code) ||
          (err.cause instanceof Error &&
            'code' in err.cause &&
            (err.cause as { code: string }).code))) ||
      undefined;
    const isUniqueViolation = pgCode === '23505';
    if (!isUniqueViolation) {
      throw err;
    }
    // Already following — unfollow
    await db
      .delete(userFollows)
      .where(
        and(eq(userFollows.followerId, user.id), eq(userFollows.followingId, targetProfile.id))
      );
    following = false;
  }

  logActivityEvent({
    userId: user.id,
    action: following ? 'follow' : 'unfollow',
    targetType: 'user',
    targetId: targetProfile.id,
  });

  if (following) {
    createNotification({
      userId: targetProfile.id,
      actorId: user.id,
      type: 'follow',
      targetType: 'user',
      targetId: targetProfile.id,
    });
  }

  revalidatePath(`/${locale}/@/${targetUsername}`);
  revalidatePath(`/${locale}/mypage/following`);

  return { following };
}
